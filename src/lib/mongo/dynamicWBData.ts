import type {Collection, Filter} from 'mongodb'
import type {DynamicWBDataDocument} from '../types/dynamicWBData'
import {ProductDatabaseView} from '../types/product'
import {getCollection} from './client'
import {executeMongoOperation} from './utils'

const DYNAMIC_WB_DATA_COLLECTION_NAME = 'dynamicWBData'
let dynamicWBDataCollection: Collection<DynamicWBDataDocument> | null = null

/**
 * Получение коллекции dynamicWBData.
 * При первом вызове инициализирует коллекцию и создает необходимые индексы.
 */
export const getDynamicWBDataCollection = async (): Promise<Collection<DynamicWBDataDocument>> => {
	if (!dynamicWBDataCollection) {
		const collection = await getCollection(DYNAMIC_WB_DATA_COLLECTION_NAME)
		dynamicWBDataCollection = collection as unknown as Collection<DynamicWBDataDocument>

		// Напрямую создаем индексы. MongoDB `createIndex` создаст коллекцию, если она не существует,
		// и не будет пересоздавать индекс, если он уже существует с теми же опциями.
		await dynamicWBDataCollection.createIndex({ nmId: 1 }, { unique: true, name: 'nmId_1' })
		await dynamicWBDataCollection.createIndex({ lastUpdatedAt: -1 }, { name: 'lastUpdatedAt_-1' })
		// Индекс для потенциальной логики курсора: сначала последние обновленные карточки, затем по nmId для стабильности
		await dynamicWBDataCollection.createIndex({ cardUpdatedAt: -1, nmId: 1 }, { name: 'cardUpdatedAt_-1_nmId_1' })
		await dynamicWBDataCollection.createIndex(
			{ supplierId: 1 },
			{ name: 'supplierId_1', sparse: true } // sparse: true, т.к. supplierId может отсутствовать
		)
	}
	return dynamicWBDataCollection
}

/**
 * Находит документ товара по его nmId.
 * @param nmId Артикул WB.
 * @returns Документ товара или null, если не найден.
 */
export const findProductByNmId = async (nmId: number): Promise<DynamicWBDataDocument | null> => {
	return executeMongoOperation(async () => {
		const collection = await getDynamicWBDataCollection()
		return collection.findOne({ nmId })
	}, `поиске товара по nmId: ${nmId}`)
}

/**
 * Находит последний обработанный товар для указанного поставщика (supplierId),
 * чтобы использовать его данные (cardUpdatedAt, nmId) в качестве курсора для Этапа 1 воркера.
 * @param supplierId Идентификатор поставщика.
 * @returns Объект с cardUpdatedAt и nmId последнего товара или null, если ничего не найдено.
 */
export const findLastProductCardCursor = async (
	supplierId: number
): Promise<{ nmId: number; cardUpdatedAt: Date } | null> => {
	const collection = await getDynamicWBDataCollection()
	const result = await collection
		.find({ supplierId })
		.sort({ cardUpdatedAt: -1 })
		.project<{ nmId: number; cardUpdatedAt: Date }>({ nmId: 1, cardUpdatedAt: 1 })
		.limit(1)
		.toArray()

	return result.length > 0 ? result[0] : null
}

/**
 * Находит все товары для указанного поставщика (supplierId) и возвращает их nmId и размеры.
 * @param supplierId Идентификатор поставщика.
 * @returns Массив объектов, содержащих nmId и массив размеров каждого товара.
 */
export const findAllProductsBySupplierId = async (
	supplierId: number
): Promise<{ nmId: number; sizes: DynamicWBDataDocument['sizes'] }[]> => {
	return executeMongoOperation(async () => {
		const collection = await getDynamicWBDataCollection()
		return await collection
			.find({supplierId})
			.project<{ nmId: number; sizes: DynamicWBDataDocument['sizes'] }>({nmId: 1, sizes: 1})
			.toArray()
	}, `поиске всех товаров для поставщика ${supplierId}`)
}

/**
 * Подсчитывает общее количество документов товаров для указанного поставщика.
 * @param supplierId Идентификатор поставщика.
 * @returns {Promise<number>} Количество товаров.
 */
export const countProductsBySupplierId = async (supplierId: number): Promise<number> => {
	return executeMongoOperation(async () => {
		const collection = await getDynamicWBDataCollection()
		return collection.countDocuments({ supplierId })
	}, `подсчете товаров для поставщика ${supplierId}`)
}

/**
 * Выполняет массовую операцию вставки/обновления (upsert) для множества товаров.
 * @param products Массив объектов, где каждый объект содержит nmId и данные для обновления.
 * @returns {Promise<void>}
 */
export const bulkUpsertProducts = async (
	products: { nmId: number; data: Partial<Omit<DynamicWBDataDocument, 'nmId' | '_id'>> }[]
): Promise<void> => {
	if (products.length === 0) {
		return
	}

	await executeMongoOperation(async () => {
		const collection = await getDynamicWBDataCollection()
		const bulkOps = products.map(({ nmId, data }) => {
			const { createdAt, ...updateData } = data
			return {
				updateOne: {
					filter: { nmId },
					update: {
						$set: { ...updateData, lastUpdatedAt: new Date() },
						$setOnInsert: { nmId, createdAt: new Date() },
					},
					upsert: true,
				},
			}
		})

		await collection.bulkWrite(bulkOps)
	}, `массовом обновлении/вставке (bulk upsert) ${products.length} товаров`)
}

/**
 * Находит все документы товаров по списку их nmId.
 * @param nmIds Массив артикулов WB.
 * @returns Массив найденных документов товаров.
 */
export const findProductsByNmIds = async (nmIds: number[]): Promise<DynamicWBDataDocument[]> => {
	if (nmIds.length === 0) {
		return []
	}
	return executeMongoOperation(async () => {
		const collection = await getDynamicWBDataCollection()
		return collection.find({ nmId: { $in: nmIds } }).toArray()
	}, `поиске ${nmIds.length} товаров по списку nmId`)
}

/**
 * Находит товары, у которых отсутствует информация об изображениях или артикул поставщика.
 * @param limit Максимальное количество документов для возврата.
 * @returns Массив документов товаров для обогащения данными.
 */
export const findProductsForEnrichment = async (limit = 200): Promise<DynamicWBDataDocument[]> => {
	return executeMongoOperation(async () => {
		const collection = await getDynamicWBDataCollection()
		// Ищем документы, где 'photos' равно null ИЛИ 'vendorCode' равно null или пустой строке.
		const filter = {
			$or: [{ photos: null }, { vendorCode: { $in: [null, ''] } }],
		}
		return collection
			.find(filter as unknown as Filter<DynamicWBDataDocument>)
			.limit(limit)
			.toArray()
	}, `поиске товаров для обогащения`)
}

/**
 * Находит документ товара по баркоду (sku).
 * @param barcode Баркод товара (sku).
 * @returns Документ товара или null, если не найден.
 */
export const findProductByBarcode = async (barcode: string): Promise<DynamicWBDataDocument | null> => {
    return executeMongoOperation(async () => {
        const collection = await getDynamicWBDataCollection();
        return collection.findOne({ 'sizes.skus': barcode });
    }, `поиске товара по баркоду: ${barcode}`);
};

/**
 * Удаляет все документы из коллекции товаров.
 * @returns {Promise<number>} Количество удаленных документов.
 */
export const deleteAllProducts = async (): Promise<number> => {
	return executeMongoOperation(async () => {
		const collection = await getDynamicWBDataCollection()
		const result = await collection.deleteMany({})
		return result.deletedCount
	}, `удалении всех товаров`)
}

/**
 * Получает все продукты из коллекции и трансформирует их для отображения в админ-панели.
 * @returns {Promise<ProductDatabaseView[]>} - Массив продуктов в формате для админки.
 */
export const getAllProductsAdminView = async (): Promise<ProductDatabaseView[]> => {
	const collection = await getDynamicWBDataCollection()
	const documents = await collection.find({}).sort({ cardUpdatedAt: -1 }).toArray()

	// Трансформация документов в ProductDatabaseView
	return documents.map((doc: DynamicWBDataDocument) => {
		// Логика для цены и СПП: берем из первого размера, если есть
		const firstSizeWithPrice = doc.sizes?.find((s) => s.sitePrice !== undefined)
		const sitePrice = firstSizeWithPrice?.sitePrice
		const spp = firstSizeWithPrice?.siteSpp
		const supplierPrice = firstSizeWithPrice?.supplierPrice

		return {
			nmID: doc.nmId,
			brand: doc.brand,
			title: doc.title,
			vendorCode: doc.vendorCode,
			sitePrice,
			totalQuantity: doc.siteTotalQuantity,
			supplierWBId: doc.supplierId,
			spp,
			supplierPrice,
			supplierDiscount: doc.supplierDiscount,
			photoTmUrl: doc.photos?.thumbnail,
			photoC516x688Url: doc.photos?.medium,
			cardUpdatedAt: doc.cardUpdatedAt,
		}
	})
}
