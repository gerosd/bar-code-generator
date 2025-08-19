export interface DataMatrixOptions {
    scale?: number;
    includetext?: boolean;
    backgroundcolor?: string;
    color?: string;
}

export type PrintData = {
    scannedData: string;
    options?: DataMatrixOptions;
    title?: string;
    productName?: string; // Название товара
    productSize?: string; // Размер товара
    nmId?: string; // Артикул ВБ
    vendorCode?: string; // Артикул продавца
    dataMatrixCount?: number; // Количество этикеток DataMatrix для печати
    ean13Count?: number; // Количество этикеток EAN-13 для печати
}