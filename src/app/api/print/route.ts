import {NextRequest, NextResponse} from 'next/server';
import {findProductByBarcode} from '@/lib/mongo/dynamicWBData';
import {findScanByCode, recordScan} from '@/lib/mongo/scanHistory';
import {getClientById} from '@/lib/mongo/clients';
import { getLabelTemplateById } from "@/lib/mongo/labelTemplates";
import net from 'net';
import {PrintData} from "@/lib/types/generation";
import type { LabelElement } from "@/lib/types/labelEditor";

const PRINTER_IP = '10.222.10.86';
const PRINTER_PORT = 9100;

// Функция для генерации ZPL кода из пользовательского шаблона
function generateZPLFromCustomTemplate(elements: LabelElement[], data: any): string {
    let zplCommands = '^XA\n^CI28\n'; // Начало этикетки и установка кодировки UTF-8

    for (const element of elements) {
        if (!element.visible) continue;

        const x = Math.round(element.position.x);
        const y = Math.round(element.position.y);

        switch (element.type) {
            case 'productName':
                zplCommands += `^CF0,${element.fontSize || 24}\n`;
                zplCommands += `^FO${x},${y}^FD${data.productName || ''}^FS\n`;
                break;

            case 'nmId':
                zplCommands += `^CF0,${element.fontSize || 20}\n`;
                zplCommands += `^FO${x},${y}^FDАртикул: ${data.nmId || ''}^FS\n`;
                break;

            case 'vendorCode':
                zplCommands += `^CF0,${element.fontSize || 20}\n`;
                zplCommands += `^FO${x},${y}^FDАртикул продавца:^FS\n`;
                zplCommands += `^FO${x},${y + 25}^FD${data.vendorCode || ''}^FS\n`;
                break;

            case 'productSize':
                zplCommands += `^CF0,${element.fontSize || 20}\n`;
                zplCommands += `^FO${x},${y}^FDРазмер: ${data.productSize || ''}^FS\n`;
                break;

            case 'dataMatrix':
                // Используем стандартный размер для DataMatrix
                const matrixSize = 5;
                const size = 200;
                zplCommands += `^FO${x},${y}^BXN,${matrixSize},${size}^FD${data.scannedData || ''}^FS\n`;
                break;
        }
    }

    zplCommands += '^XZ'; // Конец этикетки
    return zplCommands;
}

// Функция для получения ZPL кода по шаблону
function getZPLByTemplate(template: string, data: any): string {
    switch (template) {
        case 'template1':
            // Шаблон 1 - стандартный
            return `^XA
                ^CI28
                ^CF0,24
                ^FO10,10^FD${data.productName}^FS
                ^FO270,120^BXN,5,200^FD${data.scannedData}^FS
                ^FO10,70^FDАртикул: ${data.nmId}^FS
                ^FO10,130^FDАртикул продавца:^FS
                ^FO10,165^FD${data.vendorCode}^FS
                ^FO10,220^FDРазмер: ${data.productSize}^FS
                ^XZ`;
        case 'template2':
            // Шаблон 2 - компактный
            return `^XA
                ^CI28
                ^CF0,20
                ^FO10,10^FD${data.productName}^FS
                ^FO250,100^BXN,4,150^FD${data.scannedData}^FS
                ^FO10,60^FD${data.nmId} | ${data.vendorCode}^FS
                ^FO10,90^FDРазмер: ${data.productSize}^FS
                ^XZ`;
        case 'template3':
            // Шаблон 3 - расширенный
            return `^XA
                ^CI28
                ^CF0,28
                ^FO10,10^FD${data.productName}^FS
                ^FO280,130^BXN,6,220^FD${data.scannedData}^FS
                ^FO10,70^FDАртикул ВБ: ${data.nmId}^FS
                ^FO10,110^FDАртикул продавца: ${data.vendorCode}^FS
                ^FO10,150^FDРазмер: ${data.productSize}^FS
                ^FO10,190^FDДата: ${new Date().toLocaleDateString('ru-RU')}^FS
                ^XZ`;
        default:
            // По умолчанию используем template1
            return `^XA
                ^CI28
                ^CF0,24
                ^FO10,10^FD${data.productName}^FS
                ^FO270,120^BXN,5,200^FD${data.scannedData}^FS
                ^FO10,70^FDАртикул: ${data.nmId}^FS
                ^FO10,130^FDАртикул продавца:^FS
                ^FO10,165^FD${data.vendorCode}^FS
                ^FO10,220^FDРазмер: ${data.productSize}^FS
                ^XZ`;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: PrintData = await request.json();
        let {scannedData, selectedTemplate} = body;
        const {productName, productSize, nmId, vendorCode, dataMatrixCount, ean13Count, diffEAN13} = body;

        if (!scannedData) {
            return NextResponse.json(
                {success: false, error: 'Отсутствуют данные для генерации'},
                {status: 400}
            );
        }

        // Получаем текущий клиент из cookie для определения шаблона
        const cookieStore = await import('next/headers').then(m => m.cookies());
        const currentClientId = cookieStore.get('currentClientId')?.value;
        
        let templateToUse = selectedTemplate || 'template1'; // По умолчанию template1
        
        let customTemplate = null;
        
        if (currentClientId && !selectedTemplate) {
            // Если шаблон не указан, получаем из настроек клиента
            const client = await getClientById(currentClientId);
            if (client?.selectedPrintTemplate) {
                templateToUse = client.selectedPrintTemplate;
                
                // Если выбран пользовательский шаблон, загружаем его
                if (templateToUse === 'custom' && client.customLabelTemplateId) {
                    customTemplate = await getLabelTemplateById(client.customLabelTemplateId);
                    console.log('Loaded custom template:', customTemplate?.name);
                }
            }
        }
        
        console.log('Template to use:', templateToUse, 'Custom template:', !!customTemplate);

        const isScannedEAN13 = /^\d{13}$/.test(scannedData);

        // Записываем факт сканирования DataMatrix для истории
        // и используем для контроля повторного ввода на клиенте через отдельный API GET (см. Ниже)
        await recordScan(scannedData);

        // Формируем итоговую ZPL-команду: одна TCP-сессия на все задания
        let zplPayload = '';

        if (diffEAN13) {
            const count = Math.max(1, Number(ean13Count ?? 1));
            const single = `^XA
                ^FO55,20^BY4
                ^BEN,240,Y,N
                ^FD${diffEAN13}^FS
                ^XZ`;
            zplPayload += single.repeat(count);
        }

        if (isScannedEAN13 && !diffEAN13) {
            // Печать только EAN-13
            const count = Math.max(1, Number(ean13Count ?? 1));
            const single = `^XA
                ^FO55,20^BY4
                ^BEN,240,Y,N
                ^FD${scannedData.slice(0, -1)}^FS
                ^XZ`;
            zplPayload = single.repeat(count);
        } else {
            // Печать DataMatrix с выбранным шаблоном
            const dmCount = Math.max(1, Number(dataMatrixCount ?? 1));
            
            let dataMatrixSingle: string;
            
            if (templateToUse === 'custom' && customTemplate) {
                // Используем пользовательский шаблон
                dataMatrixSingle = generateZPLFromCustomTemplate(customTemplate.elements, {
                    productName,
                    scannedData,
                    nmId,
                    vendorCode,
                    productSize
                });
            } else {
                // Используем предустановленный шаблон
                dataMatrixSingle = getZPLByTemplate(templateToUse, {
                    productName,
                    scannedData,
                    nmId,
                    vendorCode,
                    productSize
                });
            }
            
            zplPayload += dataMatrixSingle.repeat(dmCount);

            // Проверка на EAN-13 в DataMatrix — при наличии добавляем вторую этикетку
            const barcodeCandidate = scannedData.slice(3, 16);
            if (/^\d{13}$/.test(barcodeCandidate) && !diffEAN13) {
                const eanCount = Math.max(0, Number(ean13Count ?? 0));
                const ean13ZPL = `^XA
                    ^FO55,20^BY4
                    ^BEN,240,Y,N
                    ^FD${barcodeCandidate.slice(0, -1)}^FS
                    ^XZ`;
                zplPayload += ean13ZPL.repeat(eanCount);
            }
        }

        // Одна TCP-сессия для отправки всех команд
        await new Promise<void>((resolve, reject) => {
            const client = new net.Socket();
            client.once('error', (err) => {
                client.destroy();
                reject(err);
            });
            client.connect(PRINTER_PORT, PRINTER_IP, () => {
                client.write(zplPayload, 'utf8', (err) => {
                    if (err) {
                        client.destroy();
                        return reject(err);
                    }
                    client.end();
                    resolve();
                });
            });
        });

        return NextResponse.json({success: true});

    } catch (error) {
        console.error('Ошибка печати:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера',
            },
            {status: 500}
        );
    }
}

export async function GET(request: NextRequest) {
    const {searchParams} = new URL(request.url);
    const barcode = searchParams.get('barcode');
    const code = searchParams.get('code');
    try {
        if (barcode) {
            const product = await findProductByBarcode(barcode);
            if (!product) {
                return NextResponse.json({success: false, error: 'Продукт не найден'}, {status: 404});
            }
            // Найти размер, соответствующий штрихкоду
            let productSize = '';
            let nmId = product.nmId;
            let vendorCode = product.vendorCode;
            const sizeObj = product.sizes?.find(size => size.skus?.includes(barcode));
            if (sizeObj) {
                productSize = sizeObj.wbSize || sizeObj.techSize || '';
            }
            return NextResponse.json({
                success: true,
                product: {
                    title: product.title,
                    size: productSize,
                    nmId: nmId,
                    vendorCode: vendorCode
                }
            });
        }

        if (code) {
            const existing = await findScanByCode(code);
            if (!existing) {
                return NextResponse.json({success: true, scannedBefore: false});
            }
            return NextResponse.json({success: true, scannedBefore: true, lastScannedAt: existing.scannedAt, count: existing.count});
        }

        return NextResponse.json({success: false, error: 'Требуются параметры `barcode` или `code`'}, {status: 400});
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
        }, {status: 500});
    }
}