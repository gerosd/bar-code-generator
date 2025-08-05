//@ts-ignore - ошибка декларации в самой библиотеки, не влияет на работоспособность
import bwipjs from 'bwip-js';

export interface DataMatrixOptions {
    scale?: number;
    includetext?: boolean;
    backgroundcolor?: string;
    color?: string;
}

export async function generateDataMatrix(
    data: string,
    options: DataMatrixOptions = {}
): Promise<Buffer> {
    const defaultOptions: DataMatrixOptions = {
        scale: 3,
        includetext: true,
        backgroundcolor: 'ffffff',
        color: '000000',
        ...options
    };

    try {
        return await bwipjs.toBuffer({
            bcid: 'datamatrix',
            text: data,
            ...defaultOptions,
        });
    } catch (err) {
        throw new Error(`Ошибка генерации DataMatrix: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    }
}

// Типы для PDF генерации
export interface PDFGenerationRequest {
    scannedData: string;
    options?: DataMatrixOptions;
    title?: string;
}