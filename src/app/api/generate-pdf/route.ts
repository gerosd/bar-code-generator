import { NextRequest, NextResponse } from 'next/server';
import { generateDataMatrix, generateEAN13Barcode, type PDFGenerationRequest } from '@/utils/dataMatrix';
import robotoBase64 from '@/utils/robotoBase64';
import jsPDF from 'jspdf';
import { findProductByBarcode } from '@/lib/mongo/dynamicWBData';

export async function POST(request: NextRequest) {
    try {
        const body: PDFGenerationRequest = await request.json();
        const { scannedData, options, productName, productSize } = body;

        if (!scannedData) {
            return NextResponse.json(
                { success: false, error: 'Отсутствуют данные для генерации' },
                { status: 400 }
            );
        }

        // Определяем, нужно ли генерировать EAN-13 или DataMatrix
        let imageBuffer: Buffer;
        let isEAN13 = false;
        if (/^\d{13}$/.test(scannedData)) {
            // Если 13 цифр — генерируем EAN-13
            imageBuffer = await generateEAN13Barcode(scannedData, options);
            isEAN13 = true;
        } else {
            // Иначе DataMatrix
            imageBuffer = await generateDataMatrix(scannedData, options);
        }
        const imageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;

        // Генерируем PDF на сервере
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [58, 40],
        });
        doc.addFileToVFS('Roboto.ttf', robotoBase64);
        doc.addFont('Roboto.ttf', 'Roboto', 'normal');
        doc.setFont('Roboto', 'normal');

        if (isEAN13) {
            // Для EAN-13: штрихкод почти на весь стикер, с небольшими отступами
            doc.addImage(imageBase64, 'PNG', 2, 2, 54, 36); // 2мм отступы
        } else {
            // Для DataMatrix оставляем как было
            doc.addImage(imageBase64, 'PNG', 2, 2, 16, 16);
        }
        // Добавим название и размер товара
        if (productName && !isEAN13) {
            doc.setFontSize(10);
            doc.text(productName, 20, 8, { maxWidth: 36 });
        }

        if (productSize && !isEAN13) {
            doc.setFontSize(9);
            doc.text(`Размер: ${productSize}`, 20, 14, { maxWidth: 36 });
        }

        const pdfBuffer = doc.output('arraybuffer');
        const pdfUint8 = new Uint8Array(pdfBuffer);

        return new NextResponse(Buffer.from(pdfUint8), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="barcode.pdf ${Date.now()}"`,
            },
        });
    } catch (error) {
        console.error('Ошибка генерации PDF:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера',
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get('barcode');
    if (!barcode) {
        return NextResponse.json({ success: false, error: 'barcode is required' }, { status: 400 });
    }
    try {
        const product = await findProductByBarcode(barcode);
        if (!product) {
            return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
        }
        // Найти размер, соответствующий штрихкоду
        let productSize = '';
        const sizeObj = product.sizes?.find(size => size.skus?.includes(barcode));
        if (sizeObj) {
            productSize = sizeObj.wbSize || sizeObj.techSize || '';
        }
        return NextResponse.json({ success: true, product: { title: product.title, size: productSize } });
    } catch (error) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
    }
}