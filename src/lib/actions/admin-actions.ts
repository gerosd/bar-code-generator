'use server'

import { deleteAllProducts, getAllProductsAdminView } from '@/lib/mongo/dynamicWBData'
import { mapMongoIds } from '@/lib/mongo/utils'
import { getAllWbSuppliers } from '@/lib/mongo/wbSuppliers'
import type { ProductDatabaseView } from '@/lib/types/product'
import type { WbSupplierSafeData } from '@/lib/types/wbSupplier'
import { logger } from '@/utils/logger'
import { revalidatePath } from 'next/cache'

/**
 * Получает список всех товаров
 * @returns Promise<{success: boolean; data?: ProductDatabaseView[]; error?: string}>
 */
export const getAllProductsAction = async (): Promise<{
    success: boolean
    data?: ProductDatabaseView[]
    error?: string
}> => {
    try {
        const products = await getAllProductsAdminView()
        products.sort((a, b) => a.nmID - b.nmID)
        return { success: true, data: products }
    } catch (error) {
        let errorMessage = 'Не удалось получить список товаров'
        const errorDetails: Record<string, unknown> = {}

        if (error instanceof Error) {
            errorMessage = error.message
            errorDetails.name = error.name
            errorDetails.stack = error.stack
        } else if (typeof error === 'string') {
            errorMessage = error
        } else if (typeof error === 'object' && error !== null) {
            errorDetails.obj = JSON.stringify(error)
        }

        logger.error('[AdminActions] Ошибка при получении списка товаров', {
            metadata: {
                originalError: error,
                message: errorMessage,
                details: errorDetails,
            },
        })
        return { success: false, error: 'Не удалось получить список товаров' }
    }
}

/**
 * Очищает весь список товаров
 * @returns Promise<{ success: boolean; message?: string; deletedCount?: number; error?: string }>
 */
export const deleteAllProductsAction = async (): Promise<{
    success: boolean
    message?: string
    deletedCount?: number
    error?: string
}> => {
    try {
        const deletedCount = await deleteAllProducts()

        logger.info(`[AdminActions] Успешно удалено ${deletedCount} товаров из коллекции.`)
        revalidatePath('/product-database')
        return {
            success: true,
            message: `База товаров успешно очищена. Удалено документов: ${deletedCount}.`,
            deletedCount,
        }
    } catch (error) {
        logger.error('[AdminActions] Критическая ошибка при удалении всех товаров', {
            metadata: { error: error instanceof Error ? error.message : String(error) },
        })
        return { success: false, error: 'Произошла критическая ошибка при попытке удалить все товары.' }
    }
}

export const getAllWbSuppliersAction = async (): Promise<{
    success: boolean
    data?: WbSupplierSafeData[]
    error?: string
}> => {
    try {
        const suppliers = await getAllWbSuppliers()
        const safeSuppliers = mapMongoIds(suppliers)
        return { success: true, data: safeSuppliers }
    } catch (error) {
        logger.error('[AdminActions] Ошибка при получении списка поставщиков WB', {
            metadata: { error: error instanceof Error ? error.message : String(error) },
        })
        return { success: false, error: 'Не удалось получить список поставщиков WB' }
    }
}