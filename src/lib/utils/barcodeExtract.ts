export function extractBarcode(str: string): string {
    // Если строка состоит только из цифр, считаем её штрихкодом
    if (/^\d+$/.test(str)) {
        return str;
    }
    // Ищем по шаблону 010 + цифры + буква/символ
    const match = str.match(/010(\d+)[a-zA-Z]/);
    if (match) {
        return match[1];
    }
    // Если строка начинается с 010, но не содержит букв/символов, извлекаем цифры после 010
    const match2 = str.match(/010(\d+)/);
    if (match2) {
        return match2[1];
    }
    // Если ничего не подошло, возвращаем исходную строку (может быть это уже штрихкод)
    return str;
}

function isEAN13(barcode: string): boolean {
    // Проверка на цифры
    if (!/^\d{13}$/.test(barcode)) {
        return false;
    }
    // Вычисление контрольного числа EAN-13
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(barcode[i], 10);
        if (isNaN(digit)) return false;
        sum += (i % 2 === 0) ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(barcode[12], 10);
}

function generateZPLEAN13(barcode: string): string {
    const dimensions = getLabelDimensions(); // Используем стандартные размеры для штрихкода
    const zplContent = `^CI28
        ^FO55,20^BY4
        ^BEN,240,Y,N
        ^FD${barcode.slice(0, -1)}^FS`;
    
    return generateZPLWithLabelSize(zplContent, dimensions);
}

function generateZPLCODE128(barcode: string): string {
    const dimensions = getLabelDimensions(); // Используем стандартные размеры для штрихкода
    const zplContent = `^CI28
        ^FO25,20^BY2,,260
        ^BCN,260,Y,N
        ^FD${barcode}^FS`;
    
    return generateZPLWithLabelSize(zplContent, dimensions);
}

export function generateZPLBarcode(scannedData: string): string {
    console.log("Входные данные для генерации штрихкода: ", scannedData);
    const barcode = extractBarcode(scannedData);
    console.log("Извлеченный штрихкод: ", barcode);
    
    if (!barcode) {
        console.log("Предупреждение: штрихкод не был извлечен из данных:", scannedData);
        return '';
    }
    
    const barcodeType = isEAN13(barcode) ? 'EAN13' : 'CODE128';
    console.log("Тип штрихкода: ", barcodeType);
    
    if (barcodeType === 'EAN13') {
        const zpl = generateZPLEAN13(barcode);
        console.log("Сгенерированный ZPL для EAN13: ", zpl);
        return zpl;
    } else if (barcodeType === 'CODE128') {
        const zpl = generateZPLCODE128(barcode);
        console.log("Сгенерированный ZPL для CODE128: ", zpl);
        return zpl;
    }
    return '';
}

// Функция для получения размеров этикетки из пользовательских настроек или стандартных размеров
export function getLabelDimensions(labelSize?: { width: number; height: number }): { width: number; height: number } {
    if (labelSize) {
        return {
            width: labelSize.width,
            height: labelSize.height
        };
    }
    
    // Возвращаем стандартные размеры, если не заданы пользовательские
    return getStandardLabelDimensions();
}

// Функция для генерации ZPL с учетом размеров этикетки
export function generateZPLWithLabelSize(zplContent: string, dimensions: { width: number; height: number }): string {
    return `^XA
^PW${dimensions.width}
^LL${dimensions.height}
${zplContent}
^XZ`;
}

// Функция для получения стандартных размеров этикетки
export function getStandardLabelDimensions(): { width: number; height: number } {
    return { width: 463, height: 320 }; // Стандартные размеры
}