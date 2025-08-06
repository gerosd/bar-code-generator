/// <reference types="node" />

import { WildberriesAPI } from '@/lib/api/wildberries'
import { WildberriesProductService } from '@/lib/api/wildberries-product'
import {
	bulkUpsertProducts,
	countProductsBySupplierId,
	findAllProductsBySupplierId,
	findLastProductCardCursor,
	findProductsByNmIds,
	findProductsForEnrichment,
} from '@/lib/mongo/dynamicWBData'
import { bulkAddArticlesToMonitoring, getAllMonitoredNmIds } from '@/lib/mongo/monitoring'
import { createPriceHistoryEntry } from '@/lib/mongo/priceHistory'
import { getAllActiveValidSuppliers, updateSupplier } from '@/lib/mongo/suppliers'
import { bulkUpsertWbSuppliers } from '@/lib/mongo/wbSuppliers'
import type { DynamicWBDataDocument } from '@/lib/types/dynamicWBData'
import type { PriceHistoryTrigger } from '@/lib/types/priceHistory'
import type { GetProductsListParams, WBPrice, WBProductCard } from '@/lib/types/supplier'
import { logger } from '@/utils/logger'

// --- Константы ---
const WORKER_INTERVAL_MS = 60 * 1000 // Каждую минуту (можно настроить)
const MAX_API_LOOPS_PER_SUPPLIER = 1000 // Защита от бесконечного цикла при вызовах API пагинации
const IMAGE_BASKET_RANGE = 20 // Диапазон для перебора basket'ов при поиске изображений

// --- Типы ---

// Тип для объекта поставщика, передаваемого в функции этапов
interface WorkerSupplierInfo {
	id: string // Оригинальный ID поставщика из нашей БД (для логов и обновления)
	key: string // API ключ
	apiClient: WildberriesAPI // Экземпляр API клиента
	legacySupplierId: number // Обязательный legacySupplierId (будет supplierId в MongoDB)
	representativeIdForLogs: string // ID одного из поставщиков группы для логирования
}

// Тип для данных курсора WB API
interface WBApiCursor {
	updatedAt?: string
	nmID?: number
}

// --- Хелперы для Этапа 4 ---

// Типы для поиска изображений
interface ImageUrlResult {
	url: string
	status: number
}

interface FoundImages {
	thumbnail?: string
	medium?: string
}

// Тип для card.json
interface WbCard {
	vendor_code: string
}

/**
 * Генерирует возможные URL для изображений товара.
 * @param article - Артикул товара (nmID).
 * @returns Массив возможных URL.
 */
function generatePossibleImageUrls(article: number): string[] {
	const vol = Math.floor(article / 100000)
	const part = Math.floor(article / 1000)
	const urls: string[] = []

	for (let basket = 1; basket <= IMAGE_BASKET_RANGE; basket++) {
		const basketStr = basket.toString().padStart(2, '0')
		const baseUrl = `https://basket-${basketStr}.wbbasket.ru/vol${vol}/part${part}/${article}/images`
		urls.push(`${baseUrl}/tm/1.webp`) // Thumbnail
		urls.push(`${baseUrl}/c516x688/1.webp`) // Medium
	}

	return urls
}

/**
 * Генерирует возможные URL-адреса для card.json на основе nmId.
 */
function generateJsonUrls(nmId: number): string[] {
	const vol = Math.floor(nmId / 100000)
	const part = Math.floor(nmId / 1000)
	const urls: string[] = []

	for (let basket = 1; basket <= IMAGE_BASKET_RANGE; basket++) {
		const basketStr = basket.toString().padStart(2, '0')
		urls.push(`https://basket-${basketStr}.wbbasket.ru/vol${vol}/part${part}/${nmId}/info/ru/card.json`)
	}

	return urls
}

/**
 * Проверяет доступность URL изображений.
 */
async function checkUrl(url: string): Promise<ImageUrlResult> {
	try {
		const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) })
		return { url, status: response.status }
	} catch (error) {
		return { url, status: 0 }
	}
}

/**
 * Запрашивает URL и возвращает разобранный JSON в случае успеха.
 */
async function fetchJson(url: string): Promise<WbCard> {
	const response = await fetch(url, { signal: AbortSignal.timeout(3000) })
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url} with status ${response.status}`)
	}
	return response.json() as Promise<WbCard>
}

/**
 * Находит рабочие URL-адреса изображений для одного артикула.
 */
async function findProductImagesForArticle(nmId: number): Promise<FoundImages> {
	const possibleUrls = generatePossibleImageUrls(nmId)
	const results = await Promise.all(possibleUrls.map((url) => checkUrl(url)))

	const tmResult = results.find((result) => result.status === 200 && result.url.includes('/tm/'))
	const c516x688Result = results.find((result) => result.status === 200 && result.url.includes('/c516x688/'))

	const found: FoundImages = {}
	if (tmResult) {
		found.thumbnail = tmResult.url
	}
	if (c516x688Result) {
		found.medium = c516x688Result.url
	}
	return found
}

/**
 * Находит артикул поставщика для товара.
 */
async function findProductVendorCode(nmId: number): Promise<string | null> {
	const urls = generateJsonUrls(nmId)
	const promises = urls.map(fetchJson)
	try {
		const productData = await Promise.any(promises)
		return productData.vendor_code || null
	} catch (error) {
		// Ошибка ожидаема, если ни один URL не сработал
		return null
	}
}

/**
 * Этап 1: Загрузка и кэширование карточек товаров от поставщиков в MongoDB.
 * Инкрементально загружает карточки, используя курсоры (updatedAt, nmID) из MongoDB.
 * Обновляет или создает DynamicWBDataDocument в MongoDB.
 * Добавляет все nmID в "список мониторинга" (пока через заглушку).
 */
const fetchAndCacheProductCards = async (workerSupplier: WorkerSupplierInfo): Promise<void> => {
	const { legacySupplierId, apiClient, representativeIdForLogs } = workerSupplier
	logger.info(
		`[Этап 1] Начало обработки карточек для supplierId: ${legacySupplierId} (представитель: ${representativeIdForLogs})`
	)

	let loopCount = 0
	const currentWbApiCursor: WBApiCursor = {}

	try {
		// 1. Получение курсора для инкрементальной загрузки.
		// Мы берем самую новую карточку из БД, чтобы запросить у WB все, что новее нее.
		const dbCursor = await findLastProductCardCursor(legacySupplierId)
		if (dbCursor && dbCursor.cardUpdatedAt) {
			const nextUpdateDate = new Date(dbCursor.cardUpdatedAt.getTime() + 1)
			currentWbApiCursor.updatedAt = nextUpdateDate.toISOString()
			currentWbApiCursor.nmID = dbCursor.nmId
			logger.info(
				`[Этап 1] Курсор для supplierId ${legacySupplierId} установлен. Запрос начнется с ${currentWbApiCursor.updatedAt} (nmID: ${currentWbApiCursor.nmID})`
			)
		} else {
			logger.info(
				`[Этап 1] Курсор для supplierId ${legacySupplierId} не найден. Будет полная загрузка (от самой старой карточки).`
			)
		}

		let processedNmIDsInSession = 0
		let shouldContinueFetching = true

		// 2. Цикл загрузки карточек с WB API
		while (shouldContinueFetching) {
			loopCount++
			if (loopCount > MAX_API_LOOPS_PER_SUPPLIER) {
				logger.warn(
					`[Этап 1] Превышен лимит итераций API (${MAX_API_LOOPS_PER_SUPPLIER}) для supplierId ${legacySupplierId}. Прерывание.`
				)
				break
			}

			// Запрашиваем карточки, которые новее нашего курсора.
			const params: GetProductsListParams = {
				limit: 100, // Стандартный лимит для API
				cursorUpdatedAt: currentWbApiCursor.updatedAt,
				cursorNmID: currentWbApiCursor.nmID,
				sort: { ascending: true }, // Загружаем от старых к новым, начиная с курсора
			}

			logger.info(`[Этап 1] Запрос списка карточек для supplierId ${legacySupplierId}`, {
				metadata: { params: JSON.stringify(params) },
			})
			const productListResult = await apiClient.getProductsList(params)

			if (!productListResult.success || !productListResult.data) {
				logger.error(
					`[Этап 1] Ошибка при получении списка карточек для supplierId ${legacySupplierId}. Ошибка: ${
						productListResult.error || 'Нет данных'
					}`,
					{ metadata: { legacySupplierId, params, error: productListResult.error } }
				)
				break // Прерываем при ошибке API
			}

			const productCards: WBProductCard[] = productListResult.data
			if (productCards.length === 0) {
				logger.info(
					`[Этап 1] Для supplierId ${legacySupplierId} больше нет новых карточек для загрузки (API вернул пустой список).`
				)
				shouldContinueFetching = false // Карточек больше нет, выходим из цикла
				continue
			}

			const nmIDsToMonitorBatch: number[] = []
			const productsToUpsert: {
				nmId: number
				data: Partial<Omit<DynamicWBDataDocument, '_id' | 'nmId'>>
			}[] = []

			// 3. Формируем пачку для массового обновления
			for (const card of productCards) {
				if (!card.nmID) {
					logger.debug('[Этап 1] Карточка без nmID получена, пропуск.', {
						metadata: { card, legacySupplierId },
					})
					continue
				}
				nmIDsToMonitorBatch.push(card.nmID)

				// Поскольку для массового обновления нам не нужно получать существующий документ,
				// мы сразу готовим данные. Но это означает, что при обновлении мы можем потерять
				// данные, которых нет в `card`. Мы должны получать полный список полей.
				// Важно: Эта логика предполагает, что `getProductsList` возвращает все нужные поля.
				// Если это не так, нужно будет пересмотреть подход.
				// Пока что для оптимизации мы убираем `findProductByNmId` из цикла.
				const dataToUpsert: Partial<Omit<DynamicWBDataDocument, '_id' | 'nmId'>> = {
					supplierId: legacySupplierId,
					brand: card.brand,
					vendorCode: card.vendorCode,
					title: card.title,
					dimensions: card.dimensions,
					photos:
						card.photos && card.photos.length > 0
							? {
									thumbnail: card.photos[0].tm,
									medium: card.photos[0].c516x688,
							  }
							: undefined,
					cardDataFetchedAt: new Date(),
					cardUpdatedAt: card.updatedAt ? new Date(card.updatedAt) : undefined,
					// Поля `priceDataFetchedAt` и `supplierDiscount` и т.д не трогаем, они обновляются на других этапах
				}

				// Обработка размеров
				if (card.sizes && Array.isArray(card.sizes)) {
					dataToUpsert.sizes = card.sizes
						.filter(
							(apiSize): apiSize is WBProductCard['sizes'][number] & { chrtID: number } =>
								typeof apiSize.chrtID === 'number'
						)
						.map((apiSize) => ({
							chrtId: apiSize.chrtID,
							techSize: apiSize.techSize || '',
							wbSize: apiSize.wbSize,
							skus: apiSize.skus,
							// Цены здесь не обновляем, это задача Этапа 2
						}))
				}
				productsToUpsert.push({ nmId: card.nmID, data: dataToUpsert })
			}

			// 4. Выполняем массовую операцию
			if (productsToUpsert.length > 0) {
				try {
					await bulkUpsertProducts(productsToUpsert)
					processedNmIDsInSession += productsToUpsert.length
					logger.info(
						`[Этап 1] Успешно обработана пачка из ${productsToUpsert.length} карточек для supplierId ${legacySupplierId}.`
					)
					// Добавляем обработанные nmID в "мониторинг"
					await bulkAddArticlesToMonitoring(nmIDsToMonitorBatch)
				} catch (dbError) {
					logger.error(`[Этап 1] Ошибка при массовом сохранении данных для supplierId ${legacySupplierId}.`, {
						metadata: {
							supplierId: legacySupplierId,
							error: dbError instanceof Error ? dbError.message : String(dbError),
							stack: dbError instanceof Error ? dbError.stack : undefined,
						},
					})
				}
			}

			// Обновляем курсор для следующей итерации, используя данные из последнего ответа API.
			// Это необходимо, т.к API WB может вернуть не все карточки за один запрос (`limit` до 100).
			// Следующий запрос с `ascending: true` подхватит с того места, где мы остановились.
			if (productListResult.nextCursorUpdatedAt && productListResult.nextCursorNmID) {
				currentWbApiCursor.updatedAt = productListResult.nextCursorUpdatedAt
				currentWbApiCursor.nmID = productListResult.nextCursorNmID
			} else {
				// Если курсор не пришел, значит, это была последняя страница.
				shouldContinueFetching = false
			}
		}

		logger.info(
			`[Этап 1] Завершение обработки карточек для supplierId: ${legacySupplierId}. Обработано/обновлено карточек в сессии: ${processedNmIDsInSession}.`
		)
	} catch (error: unknown) {
		logger.error(`[Этап 1] Критическая ошибка на этапе обработки карточек для supplierId ${legacySupplierId}.`, {
			metadata: {
				legacySupplierId,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
		})
	}
}

/**
 * Этап 2: Загрузка и кэширование цен поставщика для всех его товаров.
 * Загружает все цены через API и обновляет документы в MongoDB.
 * @param workerSupplier Информация о поставщике.
 * @param totalProducts Общее количество товаров у поставщика (опционально).
 */
const fetchAndCacheSupplierPrices = async (
	workerSupplier: WorkerSupplierInfo,
	totalProducts?: number
): Promise<void> => {
	const { legacySupplierId, apiClient, representativeIdForLogs } = workerSupplier
	logger.info(
		`[Этап 2] Начало обработки цен для supplierId: ${legacySupplierId} (представитель: ${representativeIdForLogs}). Известно товаров: ${
			totalProducts ?? 'неизвестно'
		}.`
	)

	try {
		// 1. Получаем все цены от поставщика через API
		const pricesResult = await apiClient.getAllPrices({
			supplierId: String(legacySupplierId),
			//			totalProducts,
		})

		if (!pricesResult.success || !pricesResult.data) {
			logger.error(
				`[Этап 2] Ошибка при получении цен для supplierId ${legacySupplierId}. Ошибка: ${
					pricesResult.error || 'Нет данных'
				}`,
				{ metadata: { legacySupplierId, error: pricesResult.error } }
			)
			return // Прерываем, если не удалось получить цены
		}

		const pricesFromApi = pricesResult.data
		if (pricesFromApi.length === 0) {
			logger.info(`[Этап 2] API не вернул данных о ценах для supplierId ${legacySupplierId}.`)
			return
		}

		// 2. Создаем карту для быстрого доступа к ценам по nmId
		const pricesMap = new Map<number, WBPrice>(pricesFromApi.map((p) => [p.nmID, p]))
		logger.info(
			`[Этап 2] Получено ${pricesMap.size} уникальных nmID с ценами от API для supplierId ${legacySupplierId}.`
		)

		// 3. Получаем все товары этого поставщика из нашей БД, чтобы обновить их
		const productsFromDb = await findAllProductsBySupplierId(legacySupplierId)
		if (productsFromDb.length === 0) {
			logger.warn(
				`[Этап 2] В базе данных не найдено товаров для supplierId ${legacySupplierId}, хотя API вернул цены. Возможно, Этап 1 еще не отработал для этого поставщика.`
			)
			return
		}
		logger.info(
			`[Этап 2] Найдено ${productsFromDb.length} товаров в БД для обновления цен (supplierId: ${legacySupplierId}).`
		)

		const productsToUpdate: {
			nmId: number
			data: Partial<Omit<DynamicWBDataDocument, '_id' | 'nmId'>>
		}[] = []

		// 4. Готовим данные для массового обновления
		for (const dbProduct of productsFromDb) {
			const apiPriceInfo = pricesMap.get(dbProduct.nmId)
			if (!apiPriceInfo) {
				continue // Если для товара из БД нет цены от API, пропускаем его
			}

			// Создаем карту цен по размерам из API для текущего товара
			const apiSizesMap = new Map(apiPriceInfo.sizes.map((s) => [s.sizeID, s]))

			// Обновляем существующие размеры в документе
			const updatedSizes = dbProduct.sizes?.map((dbSize) => {
				const apiSizePrice = apiSizesMap.get(dbSize.chrtId)
				if (apiSizePrice) {
					return {
						...dbSize,
						supplierPrice: apiSizePrice.price,
						supplierDiscountedPrice: apiSizePrice.discountedPrice,
					}
				}
				return dbSize // Возвращаем без изменений, если цены для размера нет
			})

			const dataToUpsert: Partial<Omit<DynamicWBDataDocument, '_id' | 'nmId'>> = {
				supplierDiscount: apiPriceInfo.discount,
				priceDataFetchedAt: new Date(),
				sizes: updatedSizes,
			}
			productsToUpdate.push({ nmId: dbProduct.nmId, data: dataToUpsert })
		}

		// 5. Выполняем массовую операцию
		if (productsToUpdate.length > 0) {
			try {
				await bulkUpsertProducts(productsToUpdate)
				logger.info(
					`[Этап 2] Завершено массовое обновление цен для ${productsToUpdate.length} товаров (supplierId: ${legacySupplierId}).`
				)
			} catch (dbError) {
				logger.error(`[Этап 2] Ошибка при массовом обновлении цен для supplierId ${legacySupplierId}.`, {
					metadata: {
						supplierId: legacySupplierId,
						error: dbError instanceof Error ? dbError.message : String(dbError),
						stack: dbError instanceof Error ? dbError.stack : undefined,
					},
				})
			}
		} else {
			logger.info(
				`[Этап 2] Не было найдено совпадений между товарами в БД и ценами из API для supplierId ${legacySupplierId}.`
			)
		}
	} catch (error: unknown) {
		logger.error(`[Этап 2] Критическая ошибка на этапе обработки цен для supplierId ${legacySupplierId}.`, {
			metadata: {
				legacySupplierId,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
		})
	}
}

/**
 * Этап 3: Загрузка и кэширование данных с сайта Wildberries.
 * Получает nmID из списка мониторинга, запрашивает для них данные через WildberriesProductService
 * и обновляет DynamicWBDataDocument в MongoDB, включая расчет СПП.
 */
const fetchAndCacheSiteData = async (): Promise<void> => {
	logger.info('[Этап 3] Начало обработки данных с сайта WB.')

	try {
		// 1. Получаем все nmID из нашей коллекции мониторинга
		const monitoredNmIds = await getAllMonitoredNmIds()
		if (monitoredNmIds.length === 0) {
			logger.info('[Этап 3] Нет артикулов в списке мониторинга для обновления с сайта.')
			return
		}
		logger.info(`[Этап 3] Получено ${monitoredNmIds.length} nmID из списка мониторинга.`)

		// 2. Получаем по этим nmID все данные с сайта WB
		const siteProductsData = await WildberriesProductService.getProductsInfo(monitoredNmIds)
		if (siteProductsData.length === 0) {
			logger.warn('[Этап 3] WildberriesProductService не вернул данных для отслеживаемых nmID.')
			return
		}
		logger.info(`[Этап 3] С сайта WB получены данные для ${siteProductsData.length} товаров.`)

		// 3a. Собираем и обновляем справочник поставщиков WB
		const suppliersToUpsert = new Map<number, { legacySupplierId: number; name: string }>()
		for (const siteProduct of siteProductsData) {
			if (siteProduct.supplierId && siteProduct.supplier && !suppliersToUpsert.has(siteProduct.supplierId)) {
				suppliersToUpsert.set(siteProduct.supplierId, {
					legacySupplierId: siteProduct.supplierId,
					name: siteProduct.supplier, // Используем supplier как имя поставщика
				})
			}
		}

		if (suppliersToUpsert.size > 0) {
			try {
				await bulkUpsertWbSuppliers(Array.from(suppliersToUpsert.values()))
				logger.info(
					`[Этап 3] Успешно обновлен справочник поставщиков WB. Обработано ${suppliersToUpsert.size} поставщиков.`
				)
			} catch (dbError) {
				logger.error(`[Этап 3] Ошибка при обновлении справочника поставщиков WB.`, {
					metadata: {
						error: dbError instanceof Error ? dbError.message : String(dbError),
						stack: dbError instanceof Error ? dbError.stack : undefined,
					},
				})
			}
		}

		// 3b. Получаем одним запросом все соответствующие товары из нашей БД
		// Это нужно для доступа к ценам поставщика для расчета СПП
		const nmIdsFromSite = siteProductsData.map((p) => p.id)
		const dbProducts = await findProductsByNmIds(nmIdsFromSite)
		const dbProductsMap = new Map(dbProducts.map((p) => [p.nmId, p]))
		logger.info(`[Этап 3] Из MongoDB загружено ${dbProductsMap.size} релевантных документов.`)

		const productsToUpdate: {
			nmId: number
			data: Partial<Omit<DynamicWBDataDocument, 'nmId' | '_id'>>
		}[] = []

		// 4. Готовим массовое обновление
		for (const siteProduct of siteProductsData) {
			const dbProduct = dbProductsMap.get(siteProduct.id)

			// Данные с сайта WB содержат supplierId, который является legacySupplierId.
			// Мы можем его использовать как для создания, так и для обновления.
			if (!siteProduct.supplierId) {
				logger.warn(
					`[Этап 3] У товара nmId ${siteProduct.id} из данных с сайта отсутствует supplierId. Пропуск.`,
					{ metadata: { siteProductId: siteProduct.id } }
				)
				continue
			}

			// Карта существующих размеров из нашей БД
			const dbSizesMap = new Map(dbProduct?.sizes?.map((s) => [s.chrtId, s]))

			let calculatedSppForFirstSize = 0

			// Обновляем размеры данными с сайта и считаем СПП
			const updatedSizes = siteProduct.sizes.map((siteSize, index) => {
				const dbSize = dbSizesMap.get(siteSize.chrtID)
				// У нас цена до скидки (apiPrice) и сама скидка (apiDiscount) хранятся в разных местах.
				// Цена до скидки - supplierPrice в размере.
				// Скидка - supplierDiscount на весь товар.
				const apiPrice = dbSize?.supplierPrice
				const apiDiscount = dbProduct?.supplierDiscount
				let supplierDiscountedPrice: number | undefined

				if (apiPrice !== undefined && apiDiscount !== undefined) {
					supplierDiscountedPrice = Math.round(apiPrice * (1 - apiDiscount / 100))
				}

				let calculatedSpp = dbSize?.siteSpp ?? 0 // Сохраняем старое значение по умолчанию

				if (siteSize.sitePrice && supplierDiscountedPrice && supplierDiscountedPrice > 0) {
					calculatedSpp = Math.round((1 - siteSize.sitePrice / supplierDiscountedPrice) * 100)
					if (calculatedSpp < 0) calculatedSpp = 0
					if (calculatedSpp > 100) calculatedSpp = 100
				}

				if (index === 0) {
					calculatedSppForFirstSize = calculatedSpp
				}

				return {
					// Если dbSize есть, сохраняем его данные. Если нет - это новая запись, и этих полей не будет.
					...(dbSize || {}),
					chrtId: siteSize.chrtID,
					techSize: siteSize.techSize,
					sitePrice: siteSize.sitePrice,
					siteStocks: siteSize.stocks.map((s) => ({
						warehouseId: s.wh,
						quantity: s.qty,
					})),
					siteSpp: calculatedSpp,
					// Важно: мы не перезаписываем supplierPrice и supplierDiscountedPrice, они приходят с Этапа 2
					supplierPrice: dbSize?.supplierPrice,
					supplierDiscountedPrice,
				}
			})

			// Находим первый размер в данных с сайта, чтобы извлечь из него цену
			const firstSizeData = siteProduct.sizes && siteProduct.sizes[0]
			const firstDbSize = dbProduct?.sizes && dbProduct.sizes[0]

			const dataToUpsert: Partial<Omit<DynamicWBDataDocument, 'nmId' | '_id'>> = {
				// Используем supplierId из данных с сайта - это надежный источник.
				supplierId: siteProduct.supplierId,
				siteTotalQuantity: siteProduct.totalQuantity,
				siteDataFetchedAt: new Date(),
				lastUpdatedAt: new Date(), // Обновляем основную метку времени
				// Обновляем title/brand из данных с сайта, т.к они могут быть точнее
				title: siteProduct.name,
				brand: siteProduct.brand,
				// Добавляем денормализованные поля для сортировки
				firstSizeSitePrice: firstSizeData?.sitePrice,
				firstSizeSpp: calculatedSppForFirstSize,
				sizes: updatedSizes,

				// Явно переносим существующие поля, если они есть, чтобы не потерять их при upsert
				...(dbProduct?.vendorCode && { vendorCode: dbProduct.vendorCode }),
				...(dbProduct?.dimensions && { dimensions: dbProduct.dimensions }),
				...(dbProduct?.photos && { photos: dbProduct.photos }),
				...(dbProduct?.cardDataFetchedAt && { cardDataFetchedAt: dbProduct.cardDataFetchedAt }),
				...(dbProduct?.cardUpdatedAt && { cardUpdatedAt: dbProduct.cardUpdatedAt }),
				...(dbProduct?.priceDataFetchedAt && { priceDataFetchedAt: dbProduct.priceDataFetchedAt }),
				...(dbProduct?.supplierDiscount && { supplierDiscount: dbProduct.supplierDiscount }),
			}

			// --- ЛОГИКА СРАВНЕНИЯ И ЗАПИСИ ИСТОРИИ ЦЕН ---
			const newApiPrice = firstDbSize?.supplierPrice
			const newApiDiscount = dbProduct?.supplierDiscount
			const newSitePrice = firstSizeData?.sitePrice

			// Проверяем, что все необходимые данные для сравнения существуют
			if (newApiPrice !== undefined && newApiDiscount !== undefined && newSitePrice !== undefined) {
				let historyTrigger: PriceHistoryTrigger | undefined

				// Если было какое-либо изменение (наше или внешнее), делаем запись в историю.
				if (historyTrigger) {

					await createPriceHistoryEntry({
						nmId: siteProduct.id,
						apiPrice: newApiPrice,
						apiDiscount: newApiDiscount,
						sitePrice: newSitePrice,
						spp: calculatedSppForFirstSize,
						trigger: historyTrigger,
					})
				}
			}
			// --- КОНЕЦ ЛОГИКИ СРАВНЕНИЯ ---

			productsToUpdate.push({ nmId: siteProduct.id, data: dataToUpsert })
		}

		// 5. Выполняем массовую операцию
		if (productsToUpdate.length > 0) {
			try {
				await bulkUpsertProducts(productsToUpdate)
				logger.info(
					`[Этап 3] Завершено массовое обновление данных с сайта для ${productsToUpdate.length} товаров.`
				)
			} catch (dbError) {
				logger.error(`[Этап 3] Ошибка при массовом обновлении данных с сайта.`, {
					metadata: {
						error: dbError instanceof Error ? dbError.message : String(dbError),
						stack: dbError instanceof Error ? dbError.stack : undefined,
					},
				})
			}
		} else {
			logger.info(`[Этап 3] Нет товаров для обновления данных с сайта.`)
		}
	} catch (error: unknown) {
		logger.error(`[Этап 3] Критическая ошибка на этапе обработки данных с сайта WB.`, {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
		})
	}
}

/**
 * Этап 4: Обогащение данных о товарах.
 * Находит товары без изображений или артикула поставщика и пытается найти для них эти данные.
 */
const enrichProductData = async (): Promise<void> => {
	logger.info('[Этап 4] Начало этапа обогащения данных товаров.')

	try {
		// 1. Находим товары, у которых отсутствует необходимая информация.
		const productsToEnrich = await findProductsForEnrichment(200)

		if (productsToEnrich.length === 0) {
			logger.info('[Этап 4] Нет товаров для обогащения данных.')
			return
		}

		logger.info(
			`[Этап 4] Найдено ${productsToEnrich.length} товаров для обогащения. Запуск параллельного поиска...`
		)

		// 2. Параллельно обогащаем данные для всех найденных товаров.
		const enrichmentPromises = productsToEnrich.map(async (product) => {
			const { nmId, photos, vendorCode } = product

			// Параллельно запускаем поиск изображений и/или vendorCode, если они отсутствуют
			const imagesPromise = !photos ? findProductImagesForArticle(nmId) : Promise.resolve(undefined)
			const vendorCodePromise = !vendorCode ? findProductVendorCode(nmId) : Promise.resolve(undefined)

			const [images, foundVendorCode] = await Promise.all([imagesPromise, vendorCodePromise])

			const dataToUpdate: Partial<Omit<DynamicWBDataDocument, '_id' | 'nmId'>> = {}
			let hasUpdate = false

			// Проверяем, найдены ли оба URL изображения
			if (images && images.thumbnail && images.medium) {
				dataToUpdate.photos = { thumbnail: images.thumbnail, medium: images.medium }
				hasUpdate = true
			}

			// Проверяем, найден ли артикул поставщика
			if (foundVendorCode) {
				dataToUpdate.vendorCode = foundVendorCode
				hasUpdate = true
			}

			// Если найдено хотя бы что-то, возвращаем объект для обновления
			if (hasUpdate) {
				dataToUpdate.lastUpdatedAt = new Date()
				return { nmId, data: dataToUpdate }
			}

			return null
		})

		const results = await Promise.allSettled(enrichmentPromises)

		const productsToUpdate: {
			nmId: number
			data: Partial<Omit<DynamicWBDataDocument, '_id' | 'nmId'>>
		}[] = []

		// 3. Обрабатываем результаты и готовим данные для массового обновления.
		for (const result of results) {
			if (result.status === 'fulfilled' && result.value) {
				productsToUpdate.push(result.value)
			} else if (result.status === 'rejected') {
				logger.warn(`[Этап 4] Ошибка при обогащении данных.`, {
					metadata: { reason: result.reason },
				})
			}
		}

		// 4. Выполняем массовое обновление в БД.
		if (productsToUpdate.length > 0) {
			try {
				await bulkUpsertProducts(productsToUpdate)
				logger.info(`[Этап 4] Успешно обогащены данные для ${productsToUpdate.length} товаров.`)
			} catch (dbError) {
				logger.error('[Этап 4] Ошибка при массовом обновлении обогащенных данных.', {
					metadata: {
						error: dbError instanceof Error ? dbError.message : String(dbError),
						stack: dbError instanceof Error ? dbError.stack : undefined,
					},
				})
			}
		} else {
			logger.info('[Этап 4] Не удалось найти новые данные для обновления товаров.')
		}
	} catch (error: unknown) {
		logger.error(`[Этап 4] Критическая ошибка на этапе обогащения данных.`, {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
		})
	}
}

// --- Основная логика воркера ---
let isWorkerTaskRunning = false

/**
 * Основная функция запуска воркера.
 * Будет дополнена Этапами 2 и 3.
 */
const runProductDataAggregatorWorker = async (): Promise<void> => {
	if (isWorkerTaskRunning) {
		logger.info('[Этап 1] Предыдущая задача агрегации все еще выполняется, пропуск.')
		return
	}

	isWorkerTaskRunning = true
	logger.info('[Этап 1] Запуск итерации агрегации данных о продуктах.')

	try {
		const activeSuppliers = await getAllActiveValidSuppliers()

		if (!activeSuppliers || activeSuppliers.length === 0) {
			logger.info('[Этап 1] Нет активных поставщиков для обработки.')
		} else {
			logger.info(`[Этап 1] Найдено ${activeSuppliers.length} активных поставщиков для обработки.`)

			const groupedSuppliers = new Map<
				number,
				{
					key: string
					apiClient: WildberriesAPI
					representativeId: string
				}
			>()

			for (const supplier of activeSuppliers) {
				let currentLegacySupplierId = supplier.legacySupplierId

				if (!currentLegacySupplierId && supplier.key) {
					logger.info(
						`[Этап 1] У поставщика ${supplier.id} отсутствует legacySupplierId. Попытка получить...`
					)
					try {
						const tempApiClient = new WildberriesAPI(supplier.key)
						const legacyInfoResult = await tempApiClient.getSupplierLegacyInfo()
						if (legacyInfoResult.success && legacyInfoResult.data?.oldId) {
							currentLegacySupplierId = legacyInfoResult.data.oldId
							logger.info(
								`[Этап 1] Успешно получен legacySupplierId: ${currentLegacySupplierId} для поставщика ${supplier.id}. Сохранение в БД...`
							)
							await updateSupplier(supplier.id, {
								legacySupplierId: currentLegacySupplierId,
								legacySupplierName: legacyInfoResult.data.supplierName,
							})
							supplier.legacySupplierId = currentLegacySupplierId
						} else {
							logger.warn(
								`[Этап 1] Не удалось получить legacySupplierId для поставщика ${supplier.id}. Ошибка: ${legacyInfoResult.error}`
							)
						}
					} catch (fetchError: unknown) {
						logger.error(
							`[Этап 1] Исключение при получении legacySupplierId для поставщика ${supplier.id}: ${
								fetchError instanceof Error ? fetchError.message : String(fetchError)
							}`
						)
					}
				}

				if (currentLegacySupplierId) {
					if (!groupedSuppliers.has(currentLegacySupplierId)) {
						groupedSuppliers.set(currentLegacySupplierId, {
							key: supplier.key,
							apiClient: new WildberriesAPI(supplier.key),
							representativeId: supplier.id,
						})
					}
				} else {
					logger.warn(
						`[Этап 1] Поставщик ${supplier.id} будет пропущен (Этап 1), так как не удалось определить legacySupplierId.`
					)
				}
			}

			logger.info(
				`[Этап 1] Поставщики сгруппированы. Уникальных групп (legacySupplierId): ${groupedSuppliers.size}`
			)

			if (groupedSuppliers.size > 0) {
				// --- ЭТАП 1: Загрузка карточек ---
				logger.info('[Этап 1] --- Начало ЭТАПА 1: Загрузка карточек товаров ---')
				const cardFetchingPromises: Promise<void>[] = []
				for (const [legacyId, groupData] of groupedSuppliers.entries()) {
					const workerSupplierInfo: WorkerSupplierInfo = {
						id: groupData.representativeId,
						key: groupData.key,
						apiClient: groupData.apiClient,
						legacySupplierId: legacyId,
						representativeIdForLogs: groupData.representativeId,
					}
					cardFetchingPromises.push(fetchAndCacheProductCards(workerSupplierInfo))
				}
				await Promise.allSettled(cardFetchingPromises)
				logger.info('[Этап 1] --- Завершение ЭТАПА 1: Все задачи по карточкам товаров обработаны. ---')

				// --- ЭТАП 2: Загрузка цен ---
				logger.info('[Этап 2] --- Начало ЭТАПА 2: Загрузка цен поставщиков ---')
				const priceFetchingPromises: Promise<void>[] = []
				for (const [legacyId, groupData] of groupedSuppliers.entries()) {
					const workerSupplierInfo: WorkerSupplierInfo = {
						id: groupData.representativeId,
						key: groupData.key,
						apiClient: groupData.apiClient,
						legacySupplierId: legacyId,
						representativeIdForLogs: groupData.representativeId,
					}

					// Получаем количество товаров из нашей БД для этого поставщика
					const totalProducts = await countProductsBySupplierId(legacyId)

					priceFetchingPromises.push(fetchAndCacheSupplierPrices(workerSupplierInfo, totalProducts))
				}
				await Promise.allSettled(priceFetchingPromises)
				logger.info('[Этап 2] --- Завершение ЭТАПА 2: Все задачи по ценам поставщиков обработаны. ---')

				// --- ЭТАП 3: Загрузка данных с сайта ---
				logger.info('[Этап 3] --- Начало ЭТАПА 3: Загрузка и обработка данных с сайта WB ---')
				await fetchAndCacheSiteData()
				logger.info('[Этап 3] --- Завершение ЭТАПА 3: Все задачи по данным с сайта обработаны. ---')

				// --- ЭТАП 4: Обогащение данных ---
				logger.info('[Этап 4] --- Начало ЭТАПА 4: Обогащение данных товаров ---')
				await enrichProductData()
				logger.info('[Этап 4] --- Завершение ЭТАПА 4: Все задачи по обогащению данных обработаны. ---')
			} else {
				logger.info('[Этап 1] Нет сгруппированных поставщиков для обработки.')
			}
			// TODO: Добавить вызовы Этапа 3
			logger.info('[Этап 1] Итерация агрегации (Этапы 1, 2, 3 и 4) завершена.')
		}
	} catch (error: unknown) {
		logger.error('[Этап 1] Непредвиденная ошибка в процессе выполнения задачи агрегации.', {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
		})
	} finally {
		isWorkerTaskRunning = false
		logger.info('[Этап 1] Задача агрегации завершена, мьютекс освобожден.')
	}
}

// --- Инициализация и запуск воркера ---

logger.info('[Этап 1] Инициализация воркера агрегации данных о продуктах...')

// Функция для однократной инициализации (если потребуется в будущем)
const initializeWorker = async () => {
	logger.info('[Этап 1] Запуск инициализации воркера...')
	// Ранее здесь была ensureProductIndexExists() для Redis.
	// Для MongoDB индексы создаются при первом вызове getDynamicWBDataCollection().
	// Дополнительная инициализация пока не требуется.
	logger.info('[Этап 1] Инициализация воркера завершена.')
}

const runNowArg: boolean = process.argv.includes('--run-now')

// Немедленный вызов инициализации и затем основного воркера
;(async () => {
	await initializeWorker()

	// Безусловный первый запуск воркера сразу после инициализации
	logger.info('[Этап 1] Первый (безусловный) запуск задачи агрегации после инициализации...')
	await runProductDataAggregatorWorker() // Используем await, чтобы дождаться завершения первого запуска
	logger.info('[Этап 1] Первый (безусловный) запуск задачи агрегации завершен.')

	// Если был передан флаг --run-now, то одного запуска достаточно, не устанавливаем интервал.
	// Это полезно для ручного запуска или CI.
	if (runNowArg) {
		logger.info(
			'[Этап 1] Флаг --run-now обнаружен. Воркер выполнил задачу один раз и завершит работу (без установки интервала).'
		)
		// В идеале, если это скрипт, который должен завершиться, здесь может быть process.exit(0)
		// Но так как это может быть часть большего процесса, просто не будем ставить setInterval
		return // Выходим, чтобы не устанавливать setInterval
	}

	// Установка интервала для последующих периодических запусков
	setInterval(runProductDataAggregatorWorker, WORKER_INTERVAL_MS)
	logger.info(
		`[Этап 1] Воркер агрегации данных настроен на запуск каждые ${
			WORKER_INTERVAL_MS / 1000 / 60
		} минут (после первого немедленного запуска).`
	)
})().catch((err) => {
	logger.error('[Этап 1] Критическая ошибка при асинхронной инициализации воркера:', {
		metadata: {
			error: err instanceof Error ? err.message : String(err),
			stack: err instanceof Error ? err.stack : undefined,
		},
	})
	process.exit(1)
})

process.on('SIGINT', () => {
	logger.info('[Этап 1] Получен SIGINT. Завершение работы...')
	process.exit(0)
})

process.on('SIGTERM', () => {
	logger.info('[Этап 1] Получен SIGTERM. Завершение работы...')
	process.exit(0)
})
