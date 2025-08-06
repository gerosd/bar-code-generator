import type { Collection } from 'mongodb'
import type { MonitoringDocument } from '../types/monitoring'
import { getCollection } from './client'
import { executeMongoOperation } from './utils'

const MONITORING_COLLECTION_NAME = 'monitoring'
let monitoringCollection: Collection<MonitoringDocument> | null = null

/**
 * Получение коллекции `monitoring`.
 * При первом вызове инициализирует коллекцию. Индекс по `_id` создается автоматически.
 */
export const getMonitoringCollection = async (): Promise<Collection<MonitoringDocument>> => {
	if (!monitoringCollection) {
		const collection = await getCollection(MONITORING_COLLECTION_NAME)
		monitoringCollection = collection as unknown as Collection<MonitoringDocument>
	}
	return monitoringCollection
}

/**
 * Выполняет массовую операцию добавления артикулов (nmId) в мониторинг.
 * Если артикул уже существует, он будет проигнорирован.
 * @param nmIds Массив артикулов (nmId) для добавления в мониторинг.
 * @returns {Promise<void>}
 */
export const bulkAddArticlesToMonitoring = async (nmIds: number[]): Promise<void> => {
	if (nmIds.length === 0) {
		return
	}

	await executeMongoOperation(async () => {
		const collection = await getMonitoringCollection()

		const bulkOps = nmIds.map((nmId) => ({
			updateOne: {
				filter: { _id: nmId },
				update: { $setOnInsert: { _id: nmId } },
				upsert: true,
			},
		}))

		await collection.bulkWrite(bulkOps)
	}, `массовом добавлении ${nmIds.length} артикулов в мониторинг`)
}

/**
 * Получает все nmId из коллекции мониторинга.
 * @returns {Promise<number[]>} Массив всех nmId, находящихся в мониторинге.
 */
export const getAllMonitoredNmIds = async (): Promise<number[]> => {
	return executeMongoOperation(async () => {
		const collection = await getMonitoringCollection()
		const documents = await collection.find({}, { projection: { _id: 1 } }).toArray()
		return documents.map((doc) => doc._id)
	}, 'получении всех nmId из мониторинга')
}
