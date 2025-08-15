'use server'

import { authOptions } from '@/lib/auth'
import { getAllClientsAdmin } from '@/lib/mongo/clients'
import { deleteAllProducts, getAllProductsAdminView } from '@/lib/mongo/dynamicWBData'
import { countSuppliersByClientId } from '@/lib/mongo/suppliers'
import { mapMongoIds } from '@/lib/mongo/utils'
import { getAllWbSuppliers } from '@/lib/mongo/wbSuppliers'
import { ClientType } from '@/lib/types/client'
import type { ProductDatabaseView } from '@/lib/types/product'
import { UserRole } from '@/lib/types/user'
import type { WbSupplierSafeData } from '@/lib/types/wbSupplier'
import { logger } from '@/utils/logger'
import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'

/**
 * Получает список всех товаров (для админки).
 * Требует прав администратора.
 * @returns Promise<{ success: boolean; data?: ProductDatabaseView[]; error?: string }>
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
 * Тип данных для клиента в админке.
 */
export interface AdminClientView extends ClientType {
	supplierCount: number
	userCount: number
}

/**
 * Получает список всех клиентов с количеством их поставщиков (для админки).
 * Требует прав администратора.
 * @returns Promise<{ success: boolean; data?: AdminClientView[]; error?: string }>
 */
export const getAllClientsForAdminAction = async (): Promise<{
	success: boolean
	data?: AdminClientView[]
	error?: string
}> => {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user?.roles?.includes(UserRole.ADMIN)) {
			logger.warn('[AdminActions] Попытка доступа к getAllClientsForAdminAction без прав администратора', {
				metadata: { userId: session?.user?.id },
			})
			return { success: false, error: 'Доступ запрещен. Требуются права администратора.' }
		}

		const clients = await getAllClientsAdmin()
		if (!clients || clients.length === 0) {
			return { success: true, data: [] }
		}

		const clientsWithSupplierCount: AdminClientView[] = []
		for (const client of clients) {
			const supplierCount = await countSuppliersByClientId(client.id)
			const userCount = client.members.length
			clientsWithSupplierCount.push({
				...client,
				supplierCount,
				userCount,
			})
		}

		// Сортируем по имени клиента для консистентности
		clientsWithSupplierCount.sort((a, b) => a.name.localeCompare(b.name))

		return { success: true, data: clientsWithSupplierCount }
	} catch (error) {
		logger.error('[AdminActions] Ошибка при получении списка клиентов для админки', {
			metadata: { error },
		})
		return { success: false, error: 'Не удалось получить список клиентов' }
	}
}

/**
 * Очищает весь список товаров (для админки).
 * Требует прав администратора.
 * @returns Promise<{ success: boolean; message?: string; deletedCount?: number; error?: string }>
 */
export const deleteAllProductsAction = async (): Promise<{
	success: boolean
	message?: string
	deletedCount?: number
	error?: string
}> => {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user?.roles?.includes(UserRole.ADMIN)) {
			logger.warn('[AdminActions] Попытка удаления всех товаров без прав администратора', {
				metadata: { userId: session?.user?.id },
			})
			return { success: false, error: 'Доступ запрещен. Требуются права администратора.' }
		}

		logger.info(`[AdminActions] Администратор ${session.user.email} инициировал удаление всех товаров из БД.`)

		const deletedCount = await deleteAllProducts()

		logger.info(`[AdminActions] Успешно удалено ${deletedCount} товаров из коллекции.`)
		revalidatePath('/admin/product-database')
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
		const session = await getServerSession(authOptions)
		if (!session?.user?.roles?.includes(UserRole.ADMIN)) {
			logger.warn('[AdminActions] Попытка доступа к getAllWbSuppliersAction без прав администратора', {
				metadata: { userId: session?.user?.id },
			})
			return { success: false, error: 'Доступ запрещен. Требуются права администратора.' }
		}

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
