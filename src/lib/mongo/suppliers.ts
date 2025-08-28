import { Collection, ObjectId } from 'mongodb'
import { MongoDocument } from '../types/mongodb'
import { SupplierType } from '../types/supplier'
import { getCollection } from './client'
import { executeMongoOperation } from './utils'

// Интерфейс для MongoDB-документа поставщика
export interface Supplier extends MongoDocument<SupplierType> {
	_id?: ObjectId
}

let suppliersCollection: Collection<Supplier> | null = null

/**
 * Получение коллекции поставщиков
 */
export const getSuppliersCollection = async (): Promise<Collection<Supplier>> => {
	if (!suppliersCollection) {
		const collection = await getCollection('suppliers')
		suppliersCollection = collection as unknown as Collection<Supplier>

		// Удаляем старые индексы по userId
		// await suppliersCollection.createIndex({ userId: 1 }, { name: 'idx_userId' })
		// await suppliersCollection.createIndex({ userId: 1, name: 1 }, { unique: true, name: 'uidx_userId_name' })

		// Убедимся, что индексы по userId существуют и создаются корректно
		const indexExists = await suppliersCollection.indexExists('idx_userId')
		if (!indexExists) {
			await suppliersCollection.createIndex({ userId: 1 }, { name: 'idx_userId' })
		}
		const uniqueIndexExists = await suppliersCollection.indexExists('uidx_userId_name')
		if (!uniqueIndexExists) {
			await suppliersCollection.createIndex(
				{ userId: 1, name: 1 },
				{ unique: true, name: 'uidx_userId_name' }
			)
		}
	}

	return suppliersCollection
}

/**
 * Получение поставщика по ID
 */
export const getSupplierById = async (id: string): Promise<Supplier | null> => {
	return executeMongoOperation(async () => {
		const collection = await getSuppliersCollection()
		return collection.findOne({ _id: new ObjectId(id) })
	}, `получении поставщика по ID: ${id}`)
}

/**
 * Получение API-ключа поставщика по его ID
 * @param supplierId ID поставщика
 * @returns API-ключ или null, если поставщик не найден
 */
export const getSupplierApiKey = async (supplierId: string): Promise<string | null> => {
	return executeMongoOperation(async () => {
		const supplier = await getSupplierById(supplierId)
		if (!supplier) return null
		return supplier.key
	}, `получении API-ключа для поставщика: ${supplierId}`)
}

/**
 * Обновление поставщика
 */
export const updateSupplier = async (
	id: string,
	data: Partial<Omit<Supplier, '_id' | 'createdAt' | 'userId'>>
): Promise<boolean> => {
	return executeMongoOperation(async () => {
		const collection = await getSuppliersCollection()
		const updateData = { ...data, updatedAt: new Date() }
		const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateData })
		return result.modifiedCount > 0
	}, `обновлении поставщика: ${id}`)
}

/**
 * Удаление поставщика
 */
export const deleteSupplier = async (id: string): Promise<boolean> => {
	return executeMongoOperation(async () => {
		const collection = await getSuppliersCollection()
		const result = await collection.deleteOne({ _id: new ObjectId(id) })
		return result.deletedCount > 0
	}, `удалении поставщика: ${id}`)
}

/**
 * Обновление количества товаров поставщика
 * @param supplierId ID поставщика
 * @param totalProducts Количество товаров
 * @returns Успешность операции
 */
export const updateSupplierTotalProducts = async (supplierId: string, totalProducts: number): Promise<boolean> => {
	return executeMongoOperation(async () => {
		const collection = await getSuppliersCollection()
		const result = await collection.updateOne(
			{ _id: new ObjectId(supplierId) },
			{ $set: { totalProducts, updatedAt: new Date() } }
		)
		return result.modifiedCount > 0
	}, `обновлении количества товаров поставщика: ${supplierId} (${totalProducts})`)
}

/**
 * Получение количества товаров поставщика
 * @param supplierId ID поставщика
 * @returns Количество товаров или null, если поставщик не найден
 */
export const getSupplierTotalProducts = async (supplierId: string): Promise<number | null> => {
	return executeMongoOperation(async () => {
		const supplier = await getSupplierById(supplierId)
		if (!supplier) return null
		return supplier.totalProducts || null
	}, `получении количества товаров для поставщика: ${supplierId}`)
}

/**
 * Получение поставщиков пользователя
 */
export const getSuppliersByUserId = async (userId: string): Promise<Supplier[]> => {
	return executeMongoOperation(async () => {
		const collection = await getSuppliersCollection()
		return collection.find({ userId }).toArray()
	}, `получении поставщиков для пользователя: ${userId}`)
}

/**
 * Подсчитывает количество поставщиков для указанного пользователя.
 * @param userId ID пользователя.
 * @returns Promise<number> Количество поставщиков.
 */
export const countSuppliersByUserId = async (userId: string): Promise<number> => {
	return executeMongoOperation(async () => {
		const collection = await getSuppliersCollection()
		return collection.countDocuments({ userId })
	}, `подсчете поставщиков для пользователя: ${userId}`)
}

/**
 * Получение поставщика по ID и userId (проверка доступа)
 */
export const getSupplierByIdAndUserId = async (supplierId: string, userId: string): Promise<Supplier | null> => {
	return executeMongoOperation(async () => {
		const collection = await getSuppliersCollection()
		return collection.findOne({ _id: new ObjectId(supplierId), userId })
	}, `получении поставщика ${supplierId} для пользователя ${userId}`)
}

/**
 * Создание нового поставщика для пользователя
 */
export const createSupplierForUser = async (supplierData: Partial<SupplierType> & {
	userId: string
	name: string
	key: string
	isValid: boolean
}): Promise<Supplier | null> => {
	return executeMongoOperation(async () => {
		const collection = await getSuppliersCollection()
		// Сохраняем все дополнительные поля, если они есть
		const supplierToInsert: Omit<Supplier, '_id'> = {
			...supplierData,
			addedAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		const result = await collection.insertOne(supplierToInsert as Supplier)
		if (!result.insertedId) {
			throw new Error('Не удалось вставить поставщика, отсутствует insertedId.')
		}
		const insertedDocument = await collection.findOne({ _id: result.insertedId })
		if (!insertedDocument) {
			throw new Error('Не удалось найти поставщика после вставки.')
		}
		return insertedDocument
	}, 'создании нового поставщика для пользователя')
}

/**
 * Получает всех активных и валидных поставщиков из базы данных.
 * Используется воркером для получения списка поставщиков, чьи товары нужно кэшировать.
 * @returns Promise<Array<{ id: string, key: string, userId?: string, legacySupplierId?: number }>> Массив активных поставщиков.
 */
export const getAllActiveValidSuppliers = async (): Promise<
	Array<{ id: string; key: string; userId?: string; legacySupplierId?: number }>
> => {
	return executeMongoOperation(async () => {
		const collection = await getSuppliersCollection()
		const activeSuppliers = await collection
			.find({ isValid: true })
					.project<{ _id: ObjectId; key: string; userId?: string; legacySupplierId?: number }>({
			_id: 1,
			key: 1,
			userId: 1,
				legacySupplierId: 1, // Добавлено legacySupplierId
			})
			.toArray()

			return activeSuppliers.map((supplier) => ({
		id: supplier._id.toHexString(),
		key: supplier.key,
		userId: supplier.userId,
			legacySupplierId: supplier.legacySupplierId, // Добавлено legacySupplierId
		}))
	}, 'получении всех активных валидных поставщиков')
}

/**
 * Находит поставщика по его legacyId и ID пользователя.
 * @param legacySupplierId - "Старый" ID поставщика (число).
 * @param userId - ID пользователя.
 * @returns {Promise<SupplierType | null>} Найденный поставщик или null.
 */
export const getSupplierByLegacyIdAndUserId = async (
	legacySupplierId: number,
	userId: string
): Promise<SupplierType | null> => {
	const collection = await getSuppliersCollection()
	return executeMongoOperation(
		() => collection.findOne({ legacySupplierId, userId }),
		`поиске поставщика по legacyId ${legacySupplierId} и userId ${userId}`
	)
}
