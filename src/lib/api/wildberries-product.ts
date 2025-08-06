import { logger } from '@/utils/logger'

// Новый интерфейс для детализации размеров с сайта
export interface WBSiteSizeDetail {
	chrtID: number
	techSize: string
	sitePrice: number // Финальная цена для покупателя на сайте (product / 100) - именно ее надо использовать!!! (не total)
	sitePriceProduct?: number // Цена товара без скидок на сайте (product / 100) - не используется
	sitePriceBasic?: number // Базовая цена до скидки на сайте (basic / 100) - не используется
	stocks: Array<{ wh: number; qty: number }>
}

// Измененный интерфейс для данных о продукте с сайта
export interface WBProductSiteData {
	id: number // nmID
	name: string
	brand: string
	supplierId: number
	totalQuantity?: number // Общее количество остатков по всем размерам
	brandId?: number
	rating?: number
	feedbacks?: number
	supplier?: string
	sizes: WBSiteSizeDetail[] // Массив с детализацией по размерам
}

interface WBProductFromAPI {
	id: number
	name: string
	brand: string
	supplierId: number
	brandId?: number
	subjectId?: number
	subjectParentId?: number
	rating?: number
	feedbacks?: number
	colors?: Array<{
		name: string
		id: number
	}>
	sizes?: Array<{
		name: string // Технический размер (например, "42/44")
		origName: string // Размер поставщика (например, "S")
		optionId?: number // <--- chrtID !!!
		stocks?: Array<{
			wh: number
			qty: number
			time1: number
			time2: number
		}>
		price?: {
			product: number // Цена товара без скидок (в копейках)
			basic: number // Базовая цена до скидки (в копейках)
			total: number // Фактическая цена со всеми скидками (в копейках)
		}
		time1?: number
		time2?: number
	}>
	supplier?: string
	supplierRating?: number
}

interface WBResponse {
	data: {
		products: WBProductFromAPI[]
	}
}

export class WildberriesProductService {
	private static readonly BASE_URL = 'https://card.wb.ru/cards/v2/detail'
	private static readonly MAX_URL_LENGTH = 4096 //8192

	/**
	 * Получает информацию об одном товаре по его артикулу
	 * @param article артикул товара
	 * @returns информация о товаре или null, если товар не найден
	 */
	static async getProductInfo(article: number): Promise<WBProductSiteData | null> {
		try {
			const products = await this.getProductsInfo([article])
			return products.length > 0 ? products[0] : null
		} catch (error) {
			logger.api(`Ошибка при получении информации о товаре ${article}`, { metadata: { error, article } })
			return null
		}
	}

	/**
	 * Получает информацию о нескольких товарах по их артикулам
	 * @param articles массив артикулов товаров
	 * @returns массив с информацией о товарах
	 */
	static async getProductsInfo(articles: number[]): Promise<WBProductSiteData[]> {
		const BASE_URL_PREFIX = `${this.BASE_URL}?appType=1&curr=rub&dest=-1257786&spp=0&nm=`
		const BASE_URL_PREFIX_LENGTH = BASE_URL_PREFIX.length

		try {
			if (articles.length === 0) {
				return []
			}

			// 1. Формируем список чанков
			const chunks: number[][] = []
			let currentChunk: number[] = []
			let currentChunkArticlesStringLength = 0

			for (const article of articles) {
				const articleString = String(article)
				const articleStringLength = articleString.length

				const potentialSeparatorLength = currentChunk.length
				const potentialTotalLength =
					BASE_URL_PREFIX_LENGTH +
					currentChunkArticlesStringLength +
					articleStringLength +
					potentialSeparatorLength

				if (currentChunk.length > 0 && potentialTotalLength > this.MAX_URL_LENGTH) {
					// Завершаем текущий чанк и добавляем его в список
					chunks.push(currentChunk)
					// Начинаем новый чанк с текущим артикулом
					currentChunk = [article]
					currentChunkArticlesStringLength = articleStringLength
				} else {
					// Добавляем артикул в текущий чанк
					currentChunk.push(article)
					currentChunkArticlesStringLength += articleStringLength
				}
			}

			// Добавляем последний оставшийся чанк
			if (currentChunk.length > 0) {
				chunks.push(currentChunk)
			}

			logger.debugFunction('getProductsInfo', `Создано ${chunks.length} чанков для ${articles.length} артикулов`)

			// 2. Создаем и запускаем промисы для каждого чанка параллельно
			const fetchPromises = chunks.map((chunk, index) => {
				logger.debugFunction(
					'getProductsInfo',
					`Начинаем загрузку чанка ${index + 1}/${chunks.length} (${chunk.length} артикулов)`
				)
				return this.fetchProducts(chunk).catch((error) => {
					// Ловим ошибку на уровне fetchProducts и возвращаем объект с ошибкой,
					// чтобы Promise.allSettled мог ее обработать как 'rejected'
					logger.api(`Error fetching chunk ${index + 1}`, { metadata: { error, chunk: chunk.join(', ') } })
					// Возвращаем null или пустой массив, чтобы Promise.allSettled не упал, но покажем ошибку
					return Promise.reject(new Error(`Failed to fetch chunk ${index + 1}`)) // Передаем ошибку дальше
				})
			})

			const results = await Promise.allSettled(fetchPromises)

			// 3. Собираем результаты
			const allFetchedProducts: WBProductSiteData[] = []
			results.forEach((result, index) => {
				if (result.status === 'fulfilled') {
					logger.debugFunction(
						'getProductsInfo',
						`Chunk ${index + 1} fetched successfully (${result.value.length} products)`
					)
					allFetchedProducts.push(...result.value)
				} else {
					// Ошибки уже залогированы в .catch() промиса
					logger.api(`Chunk ${index + 1} failed`, { metadata: { reason: result.reason } })
				}
			})

			logger.debugFunction('getProductsInfo', `Total products fetched: ${allFetchedProducts.length}`)
			return allFetchedProducts
		} catch (error) {
			logger.api('Общая ошибка при получении информации о товарах', { metadata: { error } })
			return [] // Возвращаем пустой массив при глобальной ошибке
		}
	}

	/**
	 * Преобразует структуру размеров из API в наш формат
	 * @param productFromApi Данные о товаре из API
	 * @returns Массив размеров в нашем формате
	 */
	private static transformApiSizes(apiSizes: WBProductFromAPI['sizes']): WBSiteSizeDetail[] {
		if (!apiSizes || !Array.isArray(apiSizes)) {
			return []
		}
		const siteSizeDetails: WBSiteSizeDetail[] = []
		for (const apiSize of apiSizes) {
			if (apiSize.optionId === undefined || apiSize.optionId === null) {
				// logger.warn('[WBProductService] Размер без optionId (chrtID) пропущен.', { metadata: { apiSize } })
				continue // Пропускаем размер без chrtID
			}
			const siteStocks: Array<{ wh: number; qty: number }> =
				apiSize.stocks?.map((s) => ({ wh: s.wh, qty: s.qty })) || []

			siteSizeDetails.push({
				chrtID: apiSize.optionId,
				techSize: apiSize.name || apiSize.origName || 'N/A', // Берем name, если нет, то origName
				sitePrice: apiSize.price?.product !== undefined ? apiSize.price.product / 100 : 0, // Цена для покупателя после применения СПП, именно ее надо использовать!!!
				sitePriceProduct: apiSize.price?.product !== undefined ? apiSize.price.product / 100 : undefined,
				sitePriceBasic: apiSize.price?.basic !== undefined ? apiSize.price.basic / 100 : undefined,
				stocks: siteStocks,
			})
		}
		return siteSizeDetails
	}

	/**
	 * Выполняет запрос к API Wildberries для получения информации о товарах
	 * @param articles массив артикулов товаров
	 * @returns массив с информацией о товарах
	 */
	private static async fetchProducts(articles: number[]): Promise<WBProductSiteData[]> {
		const articlesString = articles.join(';')
		const url = new URL(this.BASE_URL)

		// Добавляем параметры запроса
		url.searchParams.append('appType', '1')
		url.searchParams.append('curr', 'rub')
		url.searchParams.append('dest', '-1257786')
		url.searchParams.append('spp', '0')
		url.searchParams.append('nm', articlesString)

		const response = await fetch(url.toString())

		if (!response.ok) {
			throw new Error(`Ошибка запроса: ${response.status} ${response.statusText}`)
		}

		const data: WBResponse = await response.json()

		if (!data.data || !data.data.products) {
			return []
		}

		return data.data.products.map((productFromApi) => {
			const transformedSizes = this.transformApiSizes(productFromApi.sizes)
			let totalProductQuantity = 0
			if (transformedSizes.length > 0) {
				totalProductQuantity = transformedSizes.reduce((sum, size) => {
					return sum + size.stocks.reduce((stockSum, stockItem) => stockSum + (stockItem.qty || 0), 0)
				}, 0)
			}

			const product: WBProductSiteData = {
				id: productFromApi.id,
				name: productFromApi.name || '',
				brand: productFromApi.brand || '',
				supplierId: productFromApi.supplierId,
				totalQuantity: totalProductQuantity,
				brandId: productFromApi.brandId,
				rating: productFromApi.rating,
				feedbacks: productFromApi.feedbacks,
				supplier: productFromApi.supplier,
				sizes: transformedSizes,
			}
			return product
		})
	}
}
