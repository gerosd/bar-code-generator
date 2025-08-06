import type { Collection } from 'mongodb'
import type { WbSupplierDocument } from '../types/wbSupplier'
import { getCollection } from './client'
import { executeMongoOperation } from './utils'

const WB_SUPPLIERS_COLLECTION_NAME = 'wbSuppliers'
let wbSuppliersCollection: Collection<WbSupplierDocument> | null = null

/**
 * Получение коллекции wbSuppliers.
 * При первом вызове инициализирует коллекцию и создает необходимые индексы.
 */
export const getWbSuppliersCollection = async (): Promise<Collection<WbSupplierDocument>> => {
	if (!wbSuppliersCollection) {
		const collection = await getCollection(WB_SUPPLIERS_COLLECTION_NAME)
		wbSuppliersCollection = collection as unknown as Collection<WbSupplierDocument>

		await wbSuppliersCollection.createIndex({ legacySupplierId: 1 }, { unique: true, name: 'legacySupplierId_1' })
	}
	return wbSuppliersCollection
}

/**
 * Выполняет массовую операцию вставки/обновления (upsert) для множества поставщиков WB.
 * @param suppliers Массив объектов, где каждый объект содержит legacySupplierId и имя.
 * @returns {Promise<void>}
 */
export const bulkUpsertWbSuppliers = async (suppliers: { legacySupplierId: number; name: string }[]): Promise<void> => {
	if (suppliers.length === 0) {
		return
	}

	await executeMongoOperation(async () => {
		const collection = await getWbSuppliersCollection()
		const bulkOps = suppliers.map(({ legacySupplierId, name }) => {
			return {
				updateOne: {
					filter: { legacySupplierId },
					update: {
						$set: { name, updatedAt: new Date() },
						$setOnInsert: { createdAt: new Date() },
					},
					upsert: true,
				},
			}
		})

		await collection.bulkWrite(bulkOps)
	}, `массовом обновлении/вставке ${suppliers.length} поставщиков WB`)
}

/**
 * Получает все документы поставщиков WB из коллекции, отсортированные по имени.
 * @returns {Promise<WbSupplierDocument[]>} - Массив документов поставщиков.
 */
export const getAllWbSuppliers = async (): Promise<WbSupplierDocument[]> => {
	return executeMongoOperation(async () => {
		const collection = await getWbSuppliersCollection()
		return collection.find({}).sort({ name: 1 }).toArray()
	}, 'получении всех поставщиков WB')
}
