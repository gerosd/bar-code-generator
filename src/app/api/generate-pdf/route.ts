import { NextRequest, NextResponse } from 'next/server';
import { generateDataMatrix, type PDFGenerationRequest } from '@/utils/dataMatrix';
import robotoBase64 from '@/utils/robotoBase64';
import jsPDF from 'jspdf';

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

        // Генерируем DataMatrix
        const dataMatrixBuffer = await generateDataMatrix(scannedData, options);
        const dataMatrixBase64 = `data:image/png;base64,${dataMatrixBuffer.toString('base64')}`;

        // Генерируем PDF на сервере
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [58, 40],
        });
        doc.addFileToVFS('Roboto.ttf', robotoBase64);
        doc.addFont('Roboto.ttf', 'Roboto', 'normal');
        doc.setFont('Roboto', 'normal');

        doc.addImage(dataMatrixBase64, 'PNG', 2, 2, 16, 16);
        // Добавим название и размер товара
        if (productName) {
            doc.setFontSize(10);
            doc.text(productName, 20, 8, { maxWidth: 36 });
        }

        if (productSize) {
            doc.setFontSize(9);
            doc.text(`Размер: ${productSize}`, 20, 14, { maxWidth: 36 });
        }

        doc.setFontSize(9);
        doc.text(`Данные: ${scannedData}`, 2, 35);

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