'use server'

import { WildberriesAPI } from '@/lib/api/wildberries'
import {
	createSupplierForUser,
	deleteSupplier,
	getSupplierById,
	getSuppliersByUserId,
	getSupplierTotalProducts,
	updateSupplier,
	updateSupplierTotalProducts,
} from '@/lib/mongo/suppliers'
import { SupplierData, SupplierFormData, SupplierTokenInfo, ValidateApiKeyResult } from '@/lib/types/supplier'
import { endMeasure, logger, measureAsync, startMeasure } from '@/utils/logger'
import { revalidatePath } from 'next/cache'
import { getUserIdFromSession, maskToken, validateWildberriesApiKey } from './utils'
import { bulkUpsertWbSuppliers }  from '@/lib/mongo/wbSuppliers';

/**
 * Проверка валидности API-ключа
 * @param formData Данные формы
 * @returns Результат валидации
 */
export const validateApiKey = async (formData: SupplierFormData): Promise<ValidateApiKeyResult> => {
	await getUserIdFromSession() // Проверяем авторизацию
	return validateWildberriesApiKey(formData.key)
}

/**
 * Получение списка поставщиков пользователя
 * @returns Список поставщиков
 */
export const getSuppliers = async (): Promise<SupplierData[]> => {
	const metricId = startMeasure('getSuppliers')

	try {
		const userId = await measureAsync(() => getUserIdFromSession(), 'getUserIdFromSession:getSuppliers')

		const suppliers = await measureAsync(() => getSuppliersByUserId(userId), 'getSuppliersByUserId', {
			userId,
		})

		const result = []
		for (const supplier of suppliers) {
			result.push({
				id: supplier._id?.toString() || '',
				name: supplier.name,
				key: await maskToken(supplier.key),
				isValid: supplier.isValid,
				createdAt: supplier.createdAt,
				// @ts-expect-error - tokenInfo может не существовать в типе, но существует в реальных объектах
				info: supplier.tokenInfo,
				legacySupplierId: supplier.legacySupplierId,
				legacySupplierName: supplier.legacySupplierName,
			})
		}

		endMeasure(metricId, {
			suppliersCount: result.length,
			userId,
		})

		return result
	} catch (error) {
		endMeasure(metricId, {
			error: error instanceof Error ? error.message : String(error),
		})
		logger.error('Error in getSuppliers:', { metadata: { error } })
		return [] // Возвращаем пустой массив в случае любой другой ошибки
	}
}

/**
 * Создание нового ключа поставщика
 * @param formData Данные формы
 * @returns Созданный поставщик
 */
export const createSupplierKey = async (formData: SupplierFormData): Promise<SupplierData> => {
	const userId = await getUserIdFromSession() // ID пользователя для создания поставщика

	const { name, key } = formData
	const validationResult = await validateWildberriesApiKey(key)

	if (!validationResult.valid) {
		throw new Error('API-ключ не прошел валидацию')
	}

	// Получаем legacy ID и имя поставщика
	let legacySupplierId: number | undefined = undefined
	let legacySupplierName: string | undefined = undefined
	try {
		const wbApi = new WildberriesAPI(key)
		const legacyInfoResult = await wbApi.getSupplierLegacyInfo()
		if (legacyInfoResult.success && legacyInfoResult.data) {
			legacySupplierId = legacyInfoResult.data.oldId
			legacySupplierName = legacyInfoResult.data.supplierName
			logger.info(
				`[SupplierActions] Успешно получены legacy данные для нового ключа: id=${legacySupplierId}, name='${legacySupplierName}'`
			)
			// сразу upsert в wbSuppliers
			if (legacySupplierId && legacySupplierName) {
				await bulkUpsertWbSuppliers([{ legacySupplierId, name: legacySupplierName }])
			}
		} else {
			logger.warn(
				`[SupplierActions] Не удалось получить legacy данные для нового ключа: ${legacyInfoResult.error}`
			)
		}
	} catch (e) {
		logger.error('[SupplierActions] Ошибка при запросе legacy данных для нового ключа', { metadata: { error: e } })
	}

	const tokenInfo: SupplierTokenInfo = validationResult.supplierInfo || {
		hasContentAccess: false,
		isReadOnly: true,
		isSandbox: false,
		accessCategories: [],
	}

	const supplier = await createSupplierForUser({
		userId, // ID пользователя
		name,
		key,
		isValid: validationResult.valid,
		// @ts-expect-error - tokenInfo не в типе, но должно быть в базе данных
		tokenInfo,
		legacySupplierId, // Добавляем новое поле
		legacySupplierName, // Добавляем новое поле
	})

	if (!supplier) {
		throw new Error('Не удалось создать поставщика в базе данных.')
	}

	revalidatePath('/suppliers')

	return {
		id: supplier._id?.toString() || '',
		name: supplier.name,
		key: await maskToken(supplier.key),
		isValid: supplier.isValid,
		createdAt: supplier.createdAt,
		// @ts-expect-error - tokenInfo может не существовать в типе, но существует в реальных объектах
		info: supplier.tokenInfo,
		legacySupplierId: supplier.legacySupplierId, // Возвращаем новое поле
		legacySupplierName: supplier.legacySupplierName, // Возвращаем новое поле
	}
}

/**
 * Удаление ключа поставщика
 * @param id ID поставщика
 * @returns Результат удаления
 */
export const deleteSupplierKey = async (id: string): Promise<{ success: boolean }> => {
	const userId = await getUserIdFromSession()

	try {
		// Проверка, что поставщик принадлежит пользователю
		const supplier = await getSupplierById(id)

		if (!supplier || supplier.userId !== userId) {
			throw new Error('Поставщик не найден или у вас нет прав на его удаление')
		}

		const result = await deleteSupplier(id)
		revalidatePath('/suppliers')
		return { success: result }
	} catch (error) {
		logger.error('Ошибка при удалении поставщика:', { metadata: { error, supplierId: id, userId } })
		throw error
	}
}

/**
 * Обновление ключа поставщика
 * @param params Параметры обновления
 * @returns Обновленный поставщик
 */
export const updateSupplierKey = async ({ id, key }: { id: string; key: string }): Promise<SupplierData> => {
	const userId = await getUserIdFromSession()

	// Проверка, что поставщик принадлежит пользователю
	const supplier = await getSupplierById(id)

	if (!supplier || supplier.userId !== userId) {
		throw new Error('Поставщик не найден или у вас нет прав на его обновление')
	}

	// Валидация ключа
	const validationResult = await validateWildberriesApiKey(key)

	if (!validationResult.valid) {
		throw new Error('API-ключ не прошел валидацию')
	}

	// Получаем legacy ID и имя поставщика
	let legacySupplierId: number | undefined = undefined
	let legacySupplierName: string | undefined = undefined
	try {
		const wbApi = new WildberriesAPI(key)
		const legacyInfoResult = await wbApi.getSupplierLegacyInfo()
		if (legacyInfoResult.success && legacyInfoResult.data) {
			legacySupplierId = legacyInfoResult.data.oldId
			legacySupplierName = legacyInfoResult.data.supplierName
			logger.info(
				`[SupplierActions] Успешно получены legacy данные для обновляемого ключа: id=${legacySupplierId}, name='${legacySupplierName}'`
			)
		} else {
			logger.warn(
				`[SupplierActions] Не удалось получить legacy данные для обновляемого ключа: ${legacyInfoResult.error}`
			)
		}
	} catch (e) {
		logger.error('[SupplierActions] Ошибка при запросе legacy данных для обновляемого ключа', {
			metadata: { error: e },
		})
	}

	// Получение информации о токене
	const tokenInfo: SupplierTokenInfo = validationResult.supplierInfo || {
		hasContentAccess: false,
		isReadOnly: true,
		isSandbox: false,
		accessCategories: [],
	}

	// Обновление поставщика
	const updated = await updateSupplier(id, {
		key,
		isValid: validationResult.valid,
		// @ts-expect-error - tokenInfo не в типе, но должно быть в базе данных
		tokenInfo,
		legacySupplierId, // Добавляем новое поле
		legacySupplierName, // Добавляем новое поле
	})

	if (!updated) {
		throw new Error('Не удалось обновить поставщика')
	}

	// Получаем обновленного поставщика еще раз, чтобы вернуть актуальные данные
	const updatedSupplier = await getSupplierById(id)

	// Добавляем проверку на null перед доступом к свойствам
	if (!updatedSupplier) {
		throw new Error('Не удалось получить обновленного поставщика после обновления')
	}

	revalidatePath('/suppliers')

	return {
		id: updatedSupplier._id?.toString() || '',
		name: updatedSupplier.name,
		key: await maskToken(updatedSupplier.key),
		isValid: updatedSupplier.isValid,
		createdAt: updatedSupplier.createdAt,
		// @ts-expect-error - tokenInfo может не существовать в типе, но существует в реальных объектах
		info: updatedSupplier.tokenInfo,
		legacySupplierId: updatedSupplier.legacySupplierId, // Возвращаем новое поле
		legacySupplierName: updatedSupplier.legacySupplierName, // Возвращаем новое поле
	}
}

/**
 * Получение API-ключа поставщика (только для серверного использования внутри других actions).
 * Включает проверку принадлежности поставщика текущему пользователю.
 * @param supplierId ID поставщика
 * @returns API-ключ или null, если поставщик не найден или не принадлежит пользователю.
 */
export const getSupplierApiKeyAction = async (supplierId: string): Promise<string | null> => {
	const userId = await getUserIdFromSession()

	try {
		// Получаем поставщика
		const supplier = await getSupplierById(supplierId)

		// Проверяем, что поставщик существует и принадлежит пользователю
		if (!supplier || supplier.userId !== userId) {
			logger.warn(
				`getSupplierApiKeyAction: Supplier ${supplierId} not found or does not belong to user ${userId}.`
			)
			return null
		}

		// Возвращаем API-ключ
		return supplier.key
	} catch (error) {
		logger.error(`Ошибка при получении API-ключа для поставщика ${supplierId}:`, { metadata: { error, userId } })
		return null
	}
}

/**
 * Получение API-ключей для нескольких поставщиков.
 * Фильтрует только те поставщики, которые принадлежат текущему пользователю.
 * @param supplierIds Массив ID поставщиков
 * @returns Map с ключами в формате { [supplierId]: apiKey }
 */
export const getSupplierApiKeysAction = async (supplierIds: string[]): Promise<Map<string, string>> => {
	const metricId = startMeasure('getSupplierApiKeysAction')
	const result = new Map<string, string>()

	const userId = await measureAsync(() => getUserIdFromSession(), 'getUserIdFromSession:getSupplierApiKeysAction')

	if (!supplierIds || supplierIds.length === 0) {
		endMeasure(metricId, { result: 'empty', reason: 'no_supplier_ids' })
		return result
	}

	try {
		// Получаем всех поставщиков пользователя один раз
		const userSuppliers = await measureAsync(
			() => getSuppliersByUserId(userId),
			'getSuppliersByUserId:batch',
			{ userId }
		)

		const userSuppliersMap = new Map(
			userSuppliers
				.filter((s) => s._id) // Убираем поставщиков без _id
				.map((s) => [s._id!.toString(), s]) // Теперь s._id точно существует
		)

		for (const supplierId of supplierIds) {
			const supplier = userSuppliersMap.get(supplierId)
			if (supplier) {
				// Проверка isValid здесь не обязательна, т.к. ключ может быть нужен для валидации
				result.set(supplierId, supplier.key)
			} else {
				logger.warn(
					`getSupplierApiKeysAction: Supplier ${supplierId} not found for user ${userId} or doesn\'t belong to this user.`
				)
			}
		}
		endMeasure(metricId, {
			requestedCount: supplierIds.length,
			foundCount: result.size,
			userId,
		})
	} catch (error) {
		endMeasure(metricId, {
			error: error instanceof Error ? error.message : String(error),
			userId,
		})
		logger.error('Error in getSupplierApiKeysAction:', { metadata: { error, userId } })
		// В случае ошибки возвращаем то, что успели собрать, или пустую карту
	}
	return result
}

/**
 * Обновление количества товаров поставщика
 * @param supplierId ID поставщика
 * @param totalProducts Количество товаров
 * @returns Результат обновления
 */
export const updateSupplierTotalProductsAction = async (
	supplierId: string,
	totalProducts: number
): Promise<boolean> => {
	const userId = await getUserIdFromSession()

	try {
		// Сначала убедимся, что поставщик принадлежит этому пользователю
		const supplier = await getSupplierById(supplierId)
		if (!supplier || supplier.userId !== userId) {
			logger.warn(
				`updateSupplierTotalProductsAction: Supplier ${supplierId} not found or does not belong to user ${userId}.`
			)
			return false
		}

		return await updateSupplierTotalProducts(supplierId, totalProducts)
	} catch (error) {
		logger.error(
			`Error updating total products for supplier ${supplierId} for user ${userId}: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`,
			{ metadata: { error } }
		)
		return false
	}
}

/**
 * Получение количества товаров поставщика
 * @param supplierId ID поставщика
 * @returns Количество товаров или null
 */
export const getSupplierTotalProductsAction = async (supplierId: string): Promise<number | null> => {
	const userId = await getUserIdFromSession()

	try {
		// Сначала убедимся, что поставщик принадлежит этому пользователю
		const supplier = await getSupplierById(supplierId)
		if (!supplier || supplier.userId !== userId) {
			logger.warn(
				`getSupplierTotalProductsAction: Supplier ${supplierId} not found or does not belong to user ${userId}.`
			)
			return null
		}

		return await getSupplierTotalProducts(supplierId)
	} catch (error) {
		logger.error(
			`Error fetching total products for supplier ${supplierId} for user ${userId}: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`,
			{ metadata: { error } }
		)
		return null
	}
}

/**
 * Получение списка поставщиков пользователя для использования в фильтрах.
 * Возвращает только ID и имя.
 */
export const getSuppliersForFilter = async (): Promise<{ id: string; name: string }[]> => {
	try {
		const userId = await getUserIdFromSession()
		const suppliers = await getSuppliersByUserId(userId)
		return suppliers.map((s) => ({
			id: s.legacySupplierId?.toString() || '', // Используем legacySupplierId, так как он нужен для фильтрации товаров
			name: s.name,
		}))
	} catch (error) {
		logger.error('Error in getSuppliersForFilter:', { metadata: { error } })
		return []
	}
}
