// Тип для отображения товаров в админ-панели
export interface ProductDatabaseView {
    nmID: number
    brand?: string
    title?: string
    vendorCode?: string
    sitePrice?: number
    totalQuantity?: number
    supplierWBId?: number
    spp?: number
    supplierPrice?: number // Цена поставщика (из первого размера)
    supplierDiscount?: number // Скидка поставщика (общая на товар)
    photoTmUrl?: string
    photoC516x688Url?: string
    cardUpdatedAt?: Date
}

import type { DynamicWBDataDocument } from './dynamicWBData'

/**
 * Представляет данные о продукте, где MongoDB `_id` было заменено на `id` строкового типа.
 * Этот тип предназначен для безопасной передачи данных на клиентскую сторону.
 */
export type ProductDataWithId = Omit<DynamicWBDataDocument, '_id'> & { id: string }
