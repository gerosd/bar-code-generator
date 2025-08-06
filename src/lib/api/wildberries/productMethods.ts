import {
	GetProductsListParams,
	GetProductsListResult,
	InitProductListParams,
	ProductPageResult,
	WBProductCard,
	WBProductListPayload,
	WBProductListResponseData,
} from '@/lib/types/supplier'
import { WildberriesAPIBase } from './WildberriesAPIBase'

/**
 * Внутренний метод для фактического запроса страницы товаров к API WB.
 */
export async function _fetchProductPageLogic(
	_this: WildberriesAPIBase,
	params: GetProductsListParams = {}
): Promise<GetProductsListResult> {
	const { textSearch, limit = 10, cursorUpdatedAt, cursorNmID, sort } = params
	const productsListUrl = 'https://content-api.wildberries.ru/content/v2/get/cards/list'
	const maxLimitPerRequest = 100
	let collectedCards: WBProductCard[] = []
	let hasMore = true
	let requestCount = 0

	const internalCursor = {
		updatedAt: cursorUpdatedAt,
		nmID: cursorNmID,
	}

	let lastResponseCursor: WBProductListResponseData['cursor'] | undefined

	while (collectedCards.length < limit && hasMore) {
		const currentBatchLimit = Math.min(limit - collectedCards.length, maxLimitPerRequest)
		if (currentBatchLimit <= 0) break

		const payload: WBProductListPayload = {
			settings: {
				sort: {
					ascending: sort?.ascending === true,
				},
				cursor: {
					limit: currentBatchLimit,
				},
				filter: {
					textSearch: textSearch || undefined,
					withPhoto: -1,
				},
			},
		}

		if (internalCursor.updatedAt && internalCursor.nmID) {
			payload.settings.cursor.updatedAt = internalCursor.updatedAt
			payload.settings.cursor.nmID = internalCursor.nmID
		}

		const result = await _this.fetchWithDebug<WBProductListResponseData>(
			productsListUrl,
			{
				method: 'POST',
				headers: {
					Authorization: _this.token,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			},
			async (res) => res.json()
		)

		requestCount += 1

		if (!result.success || !result.data) {
			if (_this.debugInfo.length > 0) {
				const lastDebugEntry = _this.debugInfo[_this.debugInfo.length - 1]
				lastDebugEntry.summary = `Ошибка получения списка товаров: ${result.error || 'Неизвестная ошибка API'}`
			}
			return {
				success: false,
				error: result.error || 'Не удалось получить список товаров',
				data: collectedCards.length > 0 ? collectedCards : undefined,
			}
		}

		lastResponseCursor = result.data.cursor
		const { cards, cursor: responseCursorFromWB } = result.data

		if (_this.debugInfo.length > 0) {
			const lastDebugEntry = _this.debugInfo[_this.debugInfo.length - 1]
			const receivedCount = cards?.length || 0
			const totalAvailableText = responseCursorFromWB?.total !== undefined ? responseCursorFromWB.total : 'N/A'
			const nextCursorText = responseCursorFromWB?.updatedAt && responseCursorFromWB?.nmID ? 'есть' : 'нет'
			lastDebugEntry.summary = `Получено товаров: ${receivedCount}. Курсор на след. страницу: ${nextCursorText}. Всего доступно по фильтру WB: ${totalAvailableText}.`
		}

		if (cards && cards.length > 0) {
			collectedCards = collectedCards.concat(cards)
			internalCursor.updatedAt = responseCursorFromWB.updatedAt
			internalCursor.nmID = responseCursorFromWB.nmID
		} else {
			hasMore = false
		}

		if (cards.length < currentBatchLimit) {
			hasMore = false
		}

		if (requestCount > limit / maxLimitPerRequest + 5) {
			console.warn('getProductsList: Превышено ожидаемое количество запросов, возможно зацикливание.')
			hasMore = false
			break
		}
	}

	if (collectedCards.length > 0 && lastResponseCursor) {
		return {
			success: true,
			data: collectedCards.slice(0, limit),
			nextCursorUpdatedAt: lastResponseCursor.updatedAt,
			nextCursorNmID: lastResponseCursor.nmID,
			totalAvailable: lastResponseCursor.total,
		}
	} else if (collectedCards.length === 0 && lastResponseCursor) {
		return {
			success: true,
			data: [],
			nextCursorUpdatedAt: lastResponseCursor.updatedAt,
			nextCursorNmID: lastResponseCursor.nmID,
			totalAvailable: lastResponseCursor.total,
		}
	} else {
		return {
			success: true,
			data: [],
			totalAvailable: 0,
		}
	}
}

/**
 * Получение списка карточек товаров продавца с возможностью поиска и пагинации.
 */
export async function getProductsList(
	_this: WildberriesAPIBase,
	params: GetProductsListParams = {}
): Promise<GetProductsListResult> {
	// Эта функция теперь просто вызывает _fetchProductPageLogic,
	// так как основная логика пагинации уже внутри _fetchProductPageLogic
	// для поддержки getProductsList, который может запрашивать больше, чем maxLimitPerRequest
	return _fetchProductPageLogic(_this, params)
}

/**
 * Инициализирует загрузчик списка товаров и загружает первую страницу.
 */
export async function initProductListFetcher(
	_this: WildberriesAPIBase,
	params: InitProductListParams = {}
): Promise<ProductPageResult> {
	_this.productListTextSearch = params.textSearch
	_this.productListPageSize = params.pageSize || 50
	_this.productListNextCursorUpdatedAt = undefined
	_this.productListNextCursorNmID = undefined
	_this.productListTotalAvailable = undefined
	_this.productListFetchedCount = 0

	const result = await _fetchProductPageLogic(_this, {
		textSearch: _this.productListTextSearch,
		limit: _this.productListPageSize,
	})

	if (result.success && result.data) {
		_this.productListNextCursorUpdatedAt = result.nextCursorUpdatedAt
		_this.productListNextCursorNmID = result.nextCursorNmID
		_this.productListTotalAvailable = result.totalAvailable
		_this.productListFetchedCount = result.data.length

		const hasNextPage = !!(
			result.data.length === _this.productListPageSize &&
			_this.productListNextCursorUpdatedAt &&
			_this.productListNextCursorNmID
		)

		return {
			success: true,
			data: result.data,
			totalAvailable: _this.productListTotalAvailable,
			hasNextPage,
		}
	} else {
		return {
			success: result.success,
			data: [],
			error: result.error,
			totalAvailable: 0,
			hasNextPage: false,
		}
	}
}

/**
 * Загружает следующую страницу списка товаров, используя сохраненное состояние.
 */
export async function fetchNextProductPage(_this: WildberriesAPIBase): Promise<ProductPageResult> {
	if (!_this.productListNextCursorUpdatedAt || !_this.productListNextCursorNmID) {
		return {
			success: true,
			data: [],
			totalAvailable: _this.productListTotalAvailable,
			hasNextPage: false,
		}
	}

	if (
		_this.productListTotalAvailable !== undefined &&
		_this.productListFetchedCount >= _this.productListTotalAvailable
	) {
		// console.log('fetchNextProductPage: totalAvailable достигнут, но курсоры были. Считаем, что страниц нет.');
	}

	const result = await _fetchProductPageLogic(_this, {
		textSearch: _this.productListTextSearch,
		limit: _this.productListPageSize,
		cursorUpdatedAt: _this.productListNextCursorUpdatedAt,
		cursorNmID: _this.productListNextCursorNmID,
	})

	if (result.success && result.data) {
		_this.productListNextCursorUpdatedAt = result.nextCursorUpdatedAt
		_this.productListNextCursorNmID = result.nextCursorNmID
		_this.productListTotalAvailable = result.totalAvailable
		_this.productListFetchedCount += result.data.length

		const hasNextPage = !!(
			result.data.length === _this.productListPageSize &&
			_this.productListNextCursorUpdatedAt &&
			_this.productListNextCursorNmID
		)

		return {
			success: true,
			data: result.data,
			totalAvailable: _this.productListTotalAvailable,
			hasNextPage,
		}
	} else {
		return {
			success: result.success,
			data: [],
			error: result.error,
			totalAvailable: _this.productListTotalAvailable,
			hasNextPage: false,
		}
	}
}
