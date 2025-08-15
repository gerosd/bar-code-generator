//@ts-expect-error - ошибка декларации в самой библиотеки, не влияет на работоспособность
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

export async function generateEAN13Barcode(
    data: string,
    options: DataMatrixOptions = {}
): Promise<Buffer> {
    // Увеличиваем scale и убираем текст под штрихкодом
    const defaultOptions: DataMatrixOptions = {
        scale: 6, // увеличим масштаб для максимального размера
        includetext: true, // убираем надписи
        backgroundcolor: 'ffffff',
        color: '000000',
        ...options,
    };
    try {
        return await bwipjs.toBuffer({
            bcid: 'ean13',
            text: data,
            ...defaultOptions,
        });
    } catch (err) {
        throw new Error(`Ошибка генерации EAN-13: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    }
}

// Типы для PDF генерации
export interface PDFGenerationRequest {
    scannedData: string;
    options?: DataMatrixOptions;
    title?: string;
    productName?: string; // Название товара
    productSize?: string; // Размер товара
}