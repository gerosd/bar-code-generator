import { logger } from '@/utils/logger'
import type { WildberriesAPIBase } from './WildberriesAPIBase'

// Тип для части ответа от card.wb.ru
interface WBLegacyCardDetailProduct {
	supplierId: number
	supplier?: string // Название поставщика может отсутствовать
}

// Тип для корневого объекта ответа от card.wb.ru
interface WBLegacyCardDetailResponse {
	data?: {
		products?: WBLegacyCardDetailProduct[]
	}
}

// Типы для ответа от /api/v2/list/goods/filter (минимальные)
interface WBListGoodsItemMinimal {
	nmID: number
}

interface WBListGoodsFilterMinimalResponse {
	data?: {
		listGoods: WBListGoodsItemMinimal[]
	}
	error?: boolean
	errorText?: string
}

// Тип для результата нового метода
export interface SupplierLegacyInfo {
	oldId: number
	supplierName: string
}

export async function getSupplierLegacyInfo(api: WildberriesAPIBase): Promise<{
	success: boolean
	data?: SupplierLegacyInfo
	error?: string
}> {
	const apiKeyShort = api.token.substring(0, 8) // Получаем короткий ключ для логов
	try {
		// 1. Получаем любой nmId поставщика, используя /api/v2/list/goods/filter?limit=1
		const listGoodsUrl = 'https://discounts-prices-api.wildberries.ru/api/v2/list/goods/filter?limit=1'
		let nmId: number

		try {
			const listGoodsResponse = await api.fetchWithDebug<WBListGoodsFilterMinimalResponse>(listGoodsUrl, {
				method: 'GET',
				headers: {
					Authorization: api.token, // Используем полный токен
					'Content-Type': 'application/json',
				},
			})

			if (!listGoodsResponse.success || !listGoodsResponse.data || listGoodsResponse.data.error) {
				const errorMsg = `Ошибка при запросе списка товаров: ${
					listGoodsResponse.data?.errorText || listGoodsResponse.error || 'Неизвестная ошибка'
				}`
				logger.api(`[API:${apiKeyShort}] ${errorMsg}`, { metadata: { response: listGoodsResponse.data } })
				return { success: false, error: errorMsg }
			}

			if (
				!listGoodsResponse.data.data?.listGoods ||
				listGoodsResponse.data.data.listGoods.length === 0 ||
				typeof listGoodsResponse.data.data.listGoods[0]?.nmID !== 'number'
			) {
				const errorMsg = 'Не удалось получить nmId из списка товаров поставщика.'
				logger.api(`[API:${apiKeyShort}] ${errorMsg}`, {
					metadata: { responseData: listGoodsResponse.data },
				})
				return { success: false, error: errorMsg }
			}
			nmId = listGoodsResponse.data.data.listGoods[0].nmID
			logger.api(`[API:${apiKeyShort}] Получен nmId: ${nmId} для запроса информации о поставщике.`)
		} catch (e: unknown) {
			const errorMsg = 'Исключение при запросе nmId поставщика.'
			logger.api(`[API:${apiKeyShort}] ${errorMsg}`, { metadata: { error: e } })
			return { success: false, error: errorMsg }
		}

		// 2. Делаем запрос к card.wb.ru
		// Для этого эндпоинта не нужен токен авторизации, это публичный URL
		const cardUrl = new URL('https://card.wb.ru/cards/v2/detail')
		cardUrl.searchParams.append('appType', '1')
		cardUrl.searchParams.append('curr', 'rub')
		cardUrl.searchParams.append('dest', '-1257786')
		cardUrl.searchParams.append('spp', '0')
		cardUrl.searchParams.append('nm', String(nmId))

		// Используем глобальный fetch, так как fetchWithDebug добавит Authorization, который здесь не нужен
		const cardApiResponse = await fetch(cardUrl.toString())
		let cardResponseData: WBLegacyCardDetailResponse | null = null

		if (!cardApiResponse.ok) {
			const errorMsg = `Ошибка при запросе к card.wb.ru (status: ${cardApiResponse.status})`
			logger.api(`[API:${apiKeyShort}] ${errorMsg}`, {
				metadata: {
					url: cardUrl.toString(),
					status: cardApiResponse.status,
				},
			})
			return { success: false, error: errorMsg }
		}

		try {
			cardResponseData = (await cardApiResponse.json()) as WBLegacyCardDetailResponse
		} catch (jsonError) {
			const errorMsg = 'Ошибка парсинга JSON ответа от card.wb.ru'
			logger.api(`[API:${apiKeyShort}] ${errorMsg}`, {
				metadata: { url: cardUrl.toString(), error: jsonError },
			})
			return { success: false, error: errorMsg }
		}

		if (
			!cardResponseData?.data?.products ||
			cardResponseData.data.products.length === 0 ||
			!cardResponseData.data.products[0]
		) {
			const errorMsg = 'Ответ от card.wb.ru не содержит информации о товарах.'
			logger.api(`[API:${apiKeyShort}] ${errorMsg}`, { metadata: { cardResponseData } })
			return { success: false, error: errorMsg }
		}

		const productDetail = cardResponseData.data.products[0]

		const oldId = productDetail.supplierId
		const supplierName = productDetail.supplier || 'Имя не указано'

		logger.api(
			`[API:${apiKeyShort}] Успешно получена информация о поставщике: oldId=${oldId}, name=${supplierName}`
		)

		return {
			success: true,
			data: { oldId, supplierName },
		}
	} catch (error: unknown) {
		const errorMsg = 'Внутренняя ошибка при получении legacy информации о поставщике.'
		let errorDetails = {}
		if (error instanceof Error) {
			errorDetails = { name: error.name, message: error.message, stack: error.stack }
		}
		logger.api(`[API:${apiKeyShort}] ${errorMsg}`, { metadata: { error: errorDetails } })
		return { success: false, error: errorMsg }
	}
}
