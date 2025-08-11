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

        // Подготовка изображений для двухстраничного PDF (если возможно)
        const isScannedEAN13 = /^\d{13}$/.test(scannedData);

        // Генерация PDF на сервере: формат этикетки 58x40 мм, ландшафт
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [58, 40],
        });
        doc.addFileToVFS('Roboto.ttf', robotoBase64);
        doc.addFont('Roboto.ttf', 'Roboto', 'normal');
        doc.setFont('Roboto', 'normal');

        if (isScannedEAN13) {
            // Сканировали штрихкод — печатаем только страницу EAN-13
            const eanImageBuffer = await generateEAN13Barcode(scannedData, options);
            const eanImageBase64 = `data:image/png;base64,${eanImageBuffer.toString('base64')}`;
            doc.addImage(eanImageBase64, 'PNG', 2, 2, 54, 36);
        } else {
            // Сканировали DataMatrix — печатаем 1-я страница: DataMatrix
            const dmImageBuffer = await generateDataMatrix(scannedData, options);
            const dmImageBase64 = `data:image/png;base64,${dmImageBuffer.toString('base64')}`;

            // Страница 1: DataMatrix + текст
            doc.addImage(dmImageBase64, 'PNG', 36, 18, 20, 20);
            if (productName) {
                doc.setFontSize(10);
                doc.text(productName, 2, 8, { maxWidth: 36 });
            }
            if (productSize) {
                doc.setFontSize(9);
                doc.text(`Размер: ${productSize}`.trim(), 2, 26, { maxWidth: 36 });
            }

            // Попытаться извлечь EAN-13 из DataMatrix: 13 символов после первых 3
            const barcodeCandidate = scannedData.slice(3, 16);
            if (/^\d{13}$/.test(barcodeCandidate)) {
                const eanImageBuffer = await generateEAN13Barcode(barcodeCandidate, options);
                const eanImageBase64 = `data:image/png;base64,${eanImageBuffer.toString('base64')}`;
                // Страница 2: EAN-13
                doc.addPage([58, 40], 'landscape');
                doc.addImage(eanImageBase64, 'PNG', 2, 2, 54, 36);
            }
        }

        const pdfBuffer = doc.output('arraybuffer');
        const pdfUint8 = new Uint8Array(pdfBuffer);

        return new NextResponse(Buffer.from(pdfUint8), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="labels.pdf"`,
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