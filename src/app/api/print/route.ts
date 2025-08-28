import {NextRequest, NextResponse} from 'next/server';
import {findProductByBarcode} from '@/lib/mongo/dynamicWBData';
import {findScanByCode, recordScan} from '@/lib/mongo/scanHistory';
import net from 'net';
import {PrintData} from "@/lib/types/generation";
import type { LabelElement, LabelTemplate } from "@/lib/types/labelEditor";
import { generateZPLBarcode, getLabelDimensions, generateZPLWithLabelSize } from '@/lib/utils/barcodeExtract';
import { getUserById } from '@/lib/mongo/users';
import { getUserIdFromSession } from '@/lib/actions/utils';
import { getLabelTemplatesByUser } from '@/lib/mongo/labelTemplates';


// Функция для генерации ZPL кода из пользовательского шаблона
function generateZPLFromCustomTemplate(elements: LabelElement[], data: PrintData): string {
    let zplCommands = '^CI28\n'; // ^XA будет добавлен в generateZPLWithLabelSize

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

    // Убираем ^XZ, так как он будет добавлен в generateZPLWithLabelSize
    return zplCommands;
}

// Функция для получения ZPL кода по шаблону
function getZPLByTemplate(template: string, data: PrintData): string {
    let zplContent: string;
    
    switch (template) {
        case 'template1':
            // Шаблон 1 - стандартный
            zplContent = `^CI28
                ^CF0,24
                ^FO10,10^FD${data.productName}^FS
                ^FO270,120^BXN,5,200^FD${data.scannedData}^FS
                ^FO10,70^FDАртикул: ${data.nmId}^FS
                ^FO10,130^FDАртикул продавца:^FS
                ^FO10,165^FD${data.vendorCode}^FS
                ^FO10,220^FDРазмер: ${data.productSize}^FS`;
            break;
        case 'template2':
            // Шаблон 2 - компактный
            zplContent = `^CI28
                ^CF0,20
                ^FO10,10^FD${data.productName}^FS
                ^FO250,100^BXN,4,150^FD${data.scannedData}^FS
                ^FO10,60^FD${data.nmId} | ${data.vendorCode}^FS
                ^FO10,90^FDРазмер: ${data.productSize}^FS`;
            break;
        case 'template3':
            // Шаблон 3 - расширенный
            zplContent = `^CI28
                ^CF0,28
                ^FO10,10^FD${data.productName}^FS
                ^FO280,130^BXN,6,220^FD${data.scannedData}^FS
                ^FO10,70^FDАртикул ВБ: ${data.nmId}^FS
                ^FO10,110^FDАртикул продавца: ${data.vendorCode}^FS
                ^FO10,150^FDРазмер: ${data.productSize}^FS
                ^FO10,190^FDДата: ${new Date().toLocaleDateString('ru-RU')}^FS`;
            break;
        default:
            // По умолчанию используем template1
            zplContent = `^CI28
                ^CF0,24
                ^FO10,10^FD${data.productName}^FS
                ^FO270,120^BXN,5,200^FD${data.scannedData}^FS
                ^FO10,70^FDАртикул: ${data.nmId}^FS
                ^FO10,130^FDАртикул продавца:^FS
                ^FO10,165^FD${data.vendorCode}^FS
                ^FO10,220^FDРазмер: ${data.productSize}^FS`;
            break;
    }
    
    return zplContent;
}

export async function POST(request: NextRequest) {
    try {
        const body: PrintData = await request.json();
        const {scannedData, selectedTemplate} = body;
        const {productName, productSize, nmId, vendorCode, dataMatrixCount, barcodeAmount, diffEAN13} = body;
        const userId = await getUserIdFromSession();
        const user = await getUserById(userId);
        const printerSettings = user?.printerSettings;
        if (!printerSettings) {
            return NextResponse.json(
                {success: false, error: 'Настройки принтера не найдены. Пожалуйста, обновите настройки профиля.'},
                {status: 400}
            );
        }
        if (!scannedData) {
            return NextResponse.json(
                {success: false, error: 'Отсутствуют данные для генерации'},
                {status: 400}
            );
        }

        
        const templateToUse = selectedTemplate || 'template1'; // По умолчанию template1
        
        // Получаем пользовательский шаблон, если он выбран
        let customTemplate: LabelTemplate | null = null;
        if (templateToUse === 'custom') {
            try {
                const userTemplates = await getLabelTemplatesByUser(userId);
                customTemplate = userTemplates.length > 0 ? userTemplates[0] : null;
            } catch (error) {
                console.error('Ошибка получения пользовательского шаблона:', error);
            }
        }
        
        const barcode = generateZPLBarcode(scannedData);

        // Записываем факт сканирования DataMatrix для истории
        // и используем для контроля повторного ввода на клиенте через отдельный API GET (см. Ниже)
        await recordScan(scannedData);

        // Формируем итоговую ZPL-команду: одна TCP-сессия на все задания
        let zplPayload = '';

        if (diffEAN13) {
            const count = Math.max(1, Number(barcodeAmount ?? 1));
            zplPayload += barcode.repeat(count);
        } else if (barcode && !productName && !nmId && !vendorCode) {
            // Печать только штрихкода (когда нет дополнительных данных о продукте)
            const count = Math.max(1, Number(barcodeAmount ?? 1));
            zplPayload = barcode.repeat(count);
        } else if (barcode) {
            // Печать DataMatrix с выбранным шаблоном + штрихкод
            console.log("Режим печати: DataMatrix + штрихкод");
            const dmCount = Math.max(0, Number(dataMatrixCount ?? 0));
            
            let dataMatrixSingle: string;
            
            if (templateToUse === 'custom' && customTemplate) {
                // Используем пользовательский шаблон с заданными размерами этикетки
                const templateDimensions = getLabelDimensions(customTemplate.labelSize);
                
                console.log("Используем размеры этикетки из шаблона:", templateDimensions);
                
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
            
            // Используем размеры этикетки из пользовательского шаблона или стандартные
            const dimensions = templateToUse === 'custom' && customTemplate 
                ? getLabelDimensions(customTemplate.labelSize)
                : getLabelDimensions();
            
            console.log("Используемые размеры этикетки:", dimensions);
            
            // Обертываем в размеры этикетки
            dataMatrixSingle = generateZPLWithLabelSize(dataMatrixSingle, dimensions);
            
            zplPayload += dataMatrixSingle.repeat(dmCount);

            // Добавляем штрихкод после DataMatrix
            const count = Math.max(0, Number(barcodeAmount ?? 0));
            zplPayload += barcode.repeat(count);
        } else {
            // Если штрихкод не извлечен, печатаем только DataMatrix
            console.log("Режим печати: только DataMatrix (штрихкод не извлечен)");
            const dmCount = Math.max(0, Number(dataMatrixCount ?? 0));
            
            let dataMatrixSingle: string;
            
            if (templateToUse === 'custom' && customTemplate) {
                // Используем пользовательский шаблон с заданными размерами этикетки
                const templateDimensions = getLabelDimensions(customTemplate.labelSize);
                
                console.log("Используем размеры этикетки из шаблона:", templateDimensions);
                
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
            
            // Используем размеры этикетки из пользовательского шаблона или стандартные
            const dimensions = templateToUse === 'custom' && customTemplate 
                ? getLabelDimensions(customTemplate.labelSize)
                : getLabelDimensions();
            
            console.log("Используемые размеры этикетки (только DataMatrix):", dimensions);
            
            // Обертываем в размеры этикетки
            dataMatrixSingle = generateZPLWithLabelSize(dataMatrixSingle, dimensions);
            
            zplPayload += dataMatrixSingle.repeat(dmCount);
        }

        console.log("Финальный ZPL payload для печати:", zplPayload);
        console.log("Длина ZPL payload:", zplPayload.length);

        // Одна TCP-сессия для отправки всех команд
        await new Promise<void>((resolve, reject) => {
            const client = new net.Socket();
            client.once('error', (err) => {
                client.destroy();
                reject(err);
            });
            client.connect(printerSettings.printerPort, printerSettings.printerIP, () => {
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
            const nmId = product.nmId;
            const vendorCode = product.vendorCode;
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