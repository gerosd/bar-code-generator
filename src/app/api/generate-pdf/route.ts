import { NextRequest, NextResponse } from 'next/server';
import { generateDataMatrix, type PDFGenerationRequest } from '@/lib/utils/dataMatrix';

export async function POST(request: NextRequest) {
    try {
        const body: PDFGenerationRequest = await request.json();
        const { scannedData, options, title } = body;

        if (!scannedData) {
            return NextResponse.json(
                { success: false, error: 'Отсутствуют данные для генерации' },
                { status: 400 }
            );
        }

        // Генерируем DataMatrix
        const dataMatrixBuffer = await generateDataMatrix(scannedData, options);
        const dataMatrixBase64 = `data:image/png;base64,${dataMatrixBuffer.toString('base64')}`;

        // Возвращаем данные для генерации PDF на клиенте
        return NextResponse.json({
            success: true,
            data: {
                dataMatrixImage: dataMatrixBase64,
                scannedData,
                title,
                timestamp: new Date().toLocaleString('ru-RU')
            }
        });

    } catch (error) {
        console.error('Ошибка генерации DataMatrix:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Альтернативный API для генерации DataMatrix работает',
        timestamp: new Date().toISOString()
    });
}