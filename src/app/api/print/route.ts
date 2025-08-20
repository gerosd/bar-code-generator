import {NextRequest, NextResponse} from 'next/server';
import {findProductByBarcode} from '@/lib/mongo/dynamicWBData';
import {findScanByCode, recordScan} from '@/lib/mongo/scanHistory';
import net from 'net';
import {PrintData} from "@/lib/types/generation";

const PRINTER_IP = '10.222.10.86';
const PRINTER_PORT = 9100;

export async function POST(request: NextRequest) {
    try {
        const body: PrintData = await request.json();
        const {scannedData, productName, productSize, nmId, vendorCode, dataMatrixCount, ean13Count, diffEAN13} = body;

        if (!scannedData) {
            return NextResponse.json(
                {success: false, error: 'Отсутствуют данные для генерации'},
                {status: 400}
            );
        }

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
            // Печать DataMatrix
            const dmCount = Math.max(1, Number(dataMatrixCount ?? 1));
            const dataMatrixSingle = `^XA
                ^CI28
                ^CF0,24
                ^FO10,10^FD${productName}^FS
                ^FO270,120^BXN,5,200^FD${scannedData}^FS
                ^FO10,70^FDАртикул: ${nmId}^FS
                ^FO10,130^FDАртикул продавца:^FS
                ^FO10,165^FD${vendorCode}^FS
                ^FO10,220^FDРазмер: ${productSize}^FS
                ^XZ`;
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
            return NextResponse.json({success: true, product: {title: product.title, size: productSize, nmId: nmId, vendorCode: vendorCode}});
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