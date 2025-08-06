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

		// Убедимся, что индексы по clientId существуют и создаются корректно
		const indexExists = await suppliersCollection.indexExists('idx_clientId')
		if (!indexExists) {
			await suppliersCollection.createIndex({ clientId: 1 }, { name: 'idx_clientId' })
		}
		const uniqueIndexExists = await suppliersCollection.indexExists('uidx_clientId_name')
		if (!uniqueIndexExists) {
			await suppliersCollection.createIndex(
				{ clientId: 1, name: 1 },
				{ unique: true, name: 'uidx_clientId_name' }
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
	data: Partial<Omit<Supplier, '_id' | 'createdAt' | 'clientId'>>
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
 * Получение поставщиков клиента
 */
export const getSuppliersByClientId = async (clientId: string): Promise<Supplier[]> => {
	return executeMongoOperation(async () => {
		const collection = await getSuppliersCollection()
		return collection.find({ clientId }).toArray()
	}, `получении поставщиков для клиента: ${clientId}`)
}

/**
 * Подсчитывает количество поставщиков для указанного клиента.
 * @param clientId ID клиента.
 * @returns Promise<number> Количество поставщиков.
 */
export const countSuppliersByClientId = async (clientId: string): Promise<number> => {
	return executeMongoOperation(async () => {
		const collection = await getSuppliersCollection()
		return collection.countDocuments({ clientId })
	}, `подсчете поставщиков для клиента: ${clientId}`)
}

/**
 * Получение поставщика по ID и clientId (проверка доступа)
 */
export const getSupplierByIdAndClientId = async (supplierId: string, clientId: string): Promise<Supplier | null> => {
	return executeMongoOperation(async () => {
		const collection = await getSuppliersCollection()
		return collection.findOne({ _id: new ObjectId(supplierId), clientId })
	}, `получении поставщика ${supplierId} для клиента ${clientId}`)
}

/**
 * Создание нового поставщика для клиента
 */
export const createSupplierForClient = async (supplierData: {
	clientId: string
	name: string
	key: string
	isValid: boolean
	// userId: string; // Удаляем отсюда, если было
}): Promise<Supplier | null> => {
	return executeMongoOperation(async () => {
		const collection = await getSuppliersCollection()
		// Убедимся, что userId не добавляется в supplierToInsert
		const supplierToInsert: Omit<Supplier, '_id'> = {
			clientId: supplierData.clientId,
			name: supplierData.name,
			key: supplierData.key,
			isValid: supplierData.isValid,
			// totalProducts: 0, // Можно инициализировать, если нужно
			// status: 'active', // Можно инициализировать, если нужно
			addedAt: new Date(), // Добавляем недостающее поле addedAt
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		const result = await collection.insertOne(supplierToInsert as Supplier) // Убедимся, что тип Supplier не ожидает userId
		if (!result.insertedId) {
			throw new Error('Не удалось вставить поставщика, отсутствует insertedId.')
		}
		const insertedDocument = await collection.findOne({ _id: result.insertedId })
		if (!insertedDocument) {
			throw new Error('Не удалось найти поставщика после вставки.')
		}
		return insertedDocument
	}, 'создании нового поставщика для клиента')
}

/**
 * Получает всех активных и валидных поставщиков из базы данных.
 * Используется воркером для получения списка поставщиков, чьи товары нужно кэшировать.
 * @returns Promise<Array<{ id: string, key: string, clientId?: string, legacySupplierId?: number }>> Массив активных поставщиков.
 */
export const getAllActiveValidSuppliers = async (): Promise<
	Array<{ id: string; key: string; clientId?: string; legacySupplierId?: number }>
> => {
	return executeMongoOperation(async () => {
		const collection = await getSuppliersCollection()
		const activeSuppliers = await collection
			.find({ isValid: true })
			.project<{ _id: ObjectId; key: string; clientId?: string; legacySupplierId?: number }>({
				_id: 1,
				key: 1,
				clientId: 1,
				legacySupplierId: 1, // Добавлено legacySupplierId
			})
			.toArray()

		return activeSuppliers.map((supplier) => ({
			id: supplier._id.toHexString(),
			key: supplier.key,
			clientId: supplier.clientId,
			legacySupplierId: supplier.legacySupplierId, // Добавлено legacySupplierId
		}))
	}, 'получении всех активных валидных поставщиков')
}

/**
 * Находит поставщика по его legacyId и ID клиента.
 * @param legacySupplierId - "Старый" ID поставщика (число).
 * @param clientId - ID клиента.
 * @returns {Promise<SupplierType | null>} Найденный поставщик или null.
 */
export const getSupplierByLegacyIdAndClientId = async (
	legacySupplierId: number,
	clientId: string
): Promise<SupplierType | null> => {
	const collection = await getSuppliersCollection()
	return executeMongoOperation(
		() => collection.findOne({ legacySupplierId, clientId }),
		`поиске поставщика по legacyId ${legacySupplierId} и clientId ${clientId}`
	)
}
