import type { PriceHistoryEntry } from '@/lib/types/priceHistory'
import { getDb } from './client'
import { executeMongoOperation } from './utils'

const PRICE_HISTORY_COLLECTION = 'priceHistory'

/**
 * Получает доступ к коллекции priceHistory.
 * Создает индекс по nmId и createdAt для быстрых запросов.
 * @returns {Promise<Collection<PriceHistoryEntry>>} Объект коллекции.
 */
export async function getPriceHistoryCollection() {
	const db = await getDb()
	const collection = db.collection<PriceHistoryEntry>(PRICE_HISTORY_COLLECTION)

	// Индекс для быстрого поиска последней записи для конкретного товара
	await collection.createIndex({ nmId: 1, createdAt: -1 })

	return collection
}

/**
 * Создает новую запись в истории цен.
 * @param {PriceHistoryEntry} entry - Объект записи истории цен.
 * @returns {Promise<void>}
 */
export async function createPriceHistoryEntry(entry: Omit<PriceHistoryEntry, 'createdAt'>): Promise<void> {
	await executeMongoOperation(async () => {
		const collection = await getPriceHistoryCollection()
		const newEntry: PriceHistoryEntry = {
			...entry,
			createdAt: new Date(),
		}
		await collection.insertOne(newEntry)
	}, 'создании записи в истории цен')
}

/**
 * Находит последнюю по времени запись в истории цен для указанного nmId.
 * @param {number} nmId - Артикул товара (nmID).
 * @returns {Promise<PriceHistoryEntry | null>} Последняя запись или null, если история отсутствует.
 */
export async function findLastPriceHistoryByNmId(nmId: number): Promise<PriceHistoryEntry | null> {
	return executeMongoOperation(async () => {
		const collection = await getPriceHistoryCollection()
		// Сортируем по createdAt в обратном порядке и берем первую запись
		const result = await collection.findOne({ nmId }, { sort: { createdAt: -1 } })
		return result
	}, `поиске последней записи в истории цен для nmId ${nmId}`)
}

/**
 * Находит всю историю цен для указанного nmId, отсортированную от новой к старой.
 * @param {number} nmId - Артикул товара (nmID).
 * @returns {Promise<PriceHistoryEntry[]>} Массив записей истории цен.
 */
export async function findAllPriceHistoryByNmId(nmId: number): Promise<PriceHistoryEntry[]> {
	return executeMongoOperation(async () => {
		const collection = await getPriceHistoryCollection()
		const result = await collection.find({ nmId }).sort({ createdAt: -1 }).toArray()
		return result
	}, `поиске истории цен для nmId ${nmId}`)
}
