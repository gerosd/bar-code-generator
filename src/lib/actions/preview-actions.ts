import type { LabelTemplate } from '@/lib/types/labelEditor'
import { formatLabelSizeForLabelary } from '@/lib/utils/labelSizeUtils'

export async function getPreviewByZPL(zpl: string, dpi: string, labelWidthMm?: number, labelHeightMm?: number) {
    if (!zpl || !dpi) {
        return {
            success: false,
            error: "Нет данных для запроса"
        }
    }

    let dpmm: string;

    switch (dpi) {
        case '203':
            dpmm = "8";
            break;
        case '300':
            dpmm = "12";
            break;
        case '600':
            dpmm = "24";
            break;
        default:
            dpmm = "8";
            break;
    }

    // Используем переданные размеры или значения по умолчанию (58x40 мм)
    const labelSize = formatLabelSizeForLabelary(
        labelWidthMm || 58,
        labelHeightMm || 40
    );

    try {
        const response = await fetch(`http://api.labelary.com/v1/printers/${dpmm}dpmm/labels/${labelSize}/0/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "image/png"
            },
            body: JSON.stringify(zpl),
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        
        return {
            success: true,
            imageData: `data:image/png;base64,${base64}`,
            contentType: response.headers.get('content-type') || 'image/png'
        };
    } catch (error) {
        console.error("Ошибка при обращении к API для предпросмотра изображения", error);
        return {
            success: false,
            error: "Не удалось получить предпросмотр"
        }
    }
}

/**
 * Генерирует ZPL код из шаблона этикетки
 */
export function generateZPLFromTemplate(template: LabelTemplate): string {
    let zpl = '^XA';

    if (!template.labelSize) {
        throw new Error('Размеры этикетки не определены в шаблоне');
    }

    zpl += `^PW${Math.round(template.labelSize.width)}`;
    zpl += `^LL${Math.round(template.labelSize.height)}`;
    zpl += '^CI28';
    
    // Проверяем наличие элементов
    if (!template.elements || template.elements.length === 0) {
        console.warn('Шаблон не содержит элементов');
    }
    
    // Добавляем элементы
    template.elements?.forEach(element => {
        if (!element.visible) return;
        
        const x = Math.round(element.position.x);
        const y = Math.round(element.position.y);
        
        switch (element.type) {
            case 'productName':
                const productName = 'Название товара';
                zpl += `^FO${x},${y}^A0N,${element.fontSize || 20},${element.fontSize || 20}`;
                zpl += `^FD${productName}^FS`;
                break;
                
            case 'productSize':
                const productSize = 'Размер: 42';
                zpl += `^FO${x},${y}^A0N,${element.fontSize || 16},${element.fontSize || 16}`;
                zpl += `^FD${productSize}^FS`;
                break;
                
            case 'nmId':
                const nmId = '123456';
                zpl += `^FO${x},${y}^A0N,${element.fontSize || 16},${element.fontSize || 16}`;
                zpl += `^FDАртикул: ${nmId}^FS`;
                break;
                
            case 'vendorCode':
                const vendorCode = 'ART-001';
                zpl += `^FO${x},${y}^A0N,${element.fontSize || 16},${element.fontSize || 16}`;
                zpl += `^FDАртикул продавца: ^FS`;
                zpl += `^FO${x},${y+35}^A0N,${element.fontSize || 16},${element.fontSize || 16}`;
                zpl += `^FD${vendorCode}^FS`;
                break;
                
            case 'dataMatrix':
                const dataMatrixContent = 'thisIsDataMatrixExampleForBarMatrix. Next - random data: askuhjshfsdfjlsngkjlfwefggfdgd';
                zpl += `^FO${x},${y}^BXN,${element.position.height || 5},200`;
                zpl += `^FD${dataMatrixContent}^FS`;
                break;
        }
    });
    
    zpl += '^XZ';
    
    return zpl;
}