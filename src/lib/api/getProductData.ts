/**
 * Функция для подгрузки данных о товаре
 * @param barcode
 * @returns Название, размер, артикул WB и артикул продавца
 */
export default async function getProductData(barcode: string) {
    if (barcode) {
        try {
            const res = await fetch(`/api/print?barcode=${encodeURIComponent(barcode)}`);
            const json = await res.json();
            if (json.success && json.product && json.product.title) {
                return {
                    productName: json.product.title,
                    productSize: json.product.size || '',
                    nmId: json.product.nmId,
                    vendorCode: json.product.vendorCode || '',
                }
            }
        } catch (err) {
            console.error(err instanceof Error ? err.message : 'Неизвестная ошибка при обращении к API');
        }
    }
}