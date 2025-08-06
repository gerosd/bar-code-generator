import { DecodedToken, SupplierTokenInfo, ValidateApiKeyResult, WildberriesTokenInfo } from '@/lib/types/supplier'
import * as jwt from 'jsonwebtoken'
import { WildberriesAPIBase } from './WildberriesAPIBase'

/**
 * Декодирует JWT токен Wildberries
 * Информация про поля токена и права доступа взята из официальной документации WB
 * https://dev.wildberries.ru/openapi/api-information (Token decode)
 */
export function decodeToken(_this: WildberriesAPIBase): DecodedToken {
	try {
		const decoded = jwt.decode(_this.token) as WildberriesTokenInfo | null

		if (!decoded || typeof decoded !== 'object') {
			return {
				isValid: false,
				hasContentAccess: false,
				hasPriceAccess: false,
				isReadOnly: false,
				isSandbox: false,
				accessCategories: [],
				error: 'Некорректный формат токена',
			}
		}

		const bitmask = decoded.s || 0
		const accessCategories: string[] = []

		const hasContentAccess = Boolean((bitmask >> 1) & 1)
		if (hasContentAccess) accessCategories.push('Контент')

		const hasAnalyticsAccess = Boolean((bitmask >> 2) & 1)
		if (hasAnalyticsAccess) accessCategories.push('Аналитика')

		const hasPriceAccess = Boolean((bitmask >> 3) & 1)
		if (hasPriceAccess) accessCategories.push('Цены и скидки')

		const hasMarketplaceAccess = Boolean((bitmask >> 4) & 1)
		if (hasMarketplaceAccess) accessCategories.push('Маркетплейс')

		const hasStatisticsAccess = Boolean((bitmask >> 5) & 1)
		if (hasStatisticsAccess) accessCategories.push('Статистика')

		const hasPromotionAccess = Boolean((bitmask >> 6) & 1)
		if (hasPromotionAccess) accessCategories.push('Продвижение')

		const hasReviewsAccess = Boolean((bitmask >> 7) & 1)
		if (hasReviewsAccess) accessCategories.push('Вопросы и отзывы')

		const hasBuyersChatAccess = Boolean((bitmask >> 9) & 1)
		if (hasBuyersChatAccess) accessCategories.push('Чат с покупателями')

		const hasSuppliesAccess = Boolean((bitmask >> 10) & 1)
		if (hasSuppliesAccess) accessCategories.push('Поставки')

		const hasBuyersReturnsAccess = Boolean((bitmask >> 11) & 1)
		if (hasBuyersReturnsAccess) accessCategories.push('Возвраты')

		const hasDocumentsAccess = Boolean((bitmask >> 12) & 1)
		if (hasDocumentsAccess) accessCategories.push('Документы')

		const isReadOnly = Boolean((bitmask >> 30) & 1)
		const isSandbox = Boolean(decoded.t)
		const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : undefined

		return {
			isValid: true,
			hasContentAccess,
			hasPriceAccess,
			isReadOnly,
			isSandbox,
			accessCategories,
			decoded,
			expiresAt,
		}
	} catch (error) {
		return {
			isValid: false,
			hasContentAccess: false,
			hasPriceAccess: false,
			isReadOnly: false,
			isSandbox: false,
			accessCategories: [],
			error: error instanceof Error ? error.message : 'Ошибка при декодировании токена',
		}
	}
}

/**
 * Проверка соединения с API
 */
export async function checkConnection(_this: WildberriesAPIBase): Promise<{
	isConnected: boolean
	error?: string
	responseData?: unknown
}> {
	const pingUrl = 'https://content-api.wildberries.ru/ping'

	try {
		const result = await _this.fetchWithDebug<{ TS: string; Status: string }>(pingUrl, {
			method: 'GET',
			headers: {
				Authorization: _this.token,
			},
		})

		if (!result.success) {
			return {
				isConnected: false,
				error: result.error,
				responseData: result.data,
			}
		}

		return {
			isConnected: true,
			responseData: result.data,
		}
	} catch (error) {
		return {
			isConnected: false,
			error: error instanceof Error ? error.message : 'Неизвестная ошибка',
		}
	}
}

/**
 * Валидация API-ключа
 */
export async function validateApiKey(_this: WildberriesAPIBase): Promise<ValidateApiKeyResult> {
	_this.debugInfo = [] // Сбрасываем debugInfo в начале валидации

	try {
		const decodedToken = decodeToken(_this)

		_this.debugInfo.push({
			url: 'token_decode',
			method: 'DECODE',
			headers: {},
			responseData: {
				...decodedToken,
				decoded: decodedToken.decoded
					? {
							id: decodedToken.decoded.id,
							s: decodedToken.decoded.s,
							sid: decodedToken.decoded.sid,
							exp: decodedToken.decoded.exp,
							t: decodedToken.decoded.t,
					  }
					: undefined,
			},
		})

		if (!decodedToken.isValid) {
			return {
				valid: false,
				message: `Невозможно декодировать токен: ${decodedToken.error}`,
				debugInfo: _this.debugInfo,
			}
		}

		if (!decodedToken.hasContentAccess) {
			return {
				valid: false,
				message: 'API-ключ не имеет доступа к категории "Контент"',
				debugInfo: _this.debugInfo,
			}
		}

		if (!decodedToken.hasPriceAccess) {
			return {
				valid: false,
				message: 'API-ключ не имеет доступа к категории "Цены и скидки"',
				debugInfo: _this.debugInfo,
			}
		}

		if (decodedToken.isReadOnly) {
			return {
				valid: false,
				message: 'API-ключ имеет только права на чтения, необходим ключ с правами на запись',
				debugInfo: _this.debugInfo,
			}
		}

		const connectionResult = await checkConnection(_this)

		if (!connectionResult.isConnected) {
			return {
				valid: false,
				message: connectionResult.error || 'Не удалось подключиться к API Wildberries',
				debugInfo: _this.debugInfo,
			}
		}

		const sid =
			decodedToken.decoded && typeof decodedToken.decoded.sid === 'string' ? decodedToken.decoded.sid : undefined

		const supplierInfo: SupplierTokenInfo = {
			hasContentAccess: decodedToken.hasContentAccess,
			hasPriceAccess: decodedToken.hasPriceAccess,
			isReadOnly: decodedToken.isReadOnly,
			isSandbox: decodedToken.isSandbox,
			accessCategories: decodedToken.accessCategories,
			sid: sid,
			expiresAt: decodedToken.expiresAt,
		}

		const validationSummary = 'API-ключ действителен и имеет необходимые права доступа.'
		_this.debugInfo.push({
			url: 'validateApiKeySummary',
			method: 'INTERNAL_SUMMARY',
			headers: {},
			summary: validationSummary,
			responseData: { supplierInfo },
		})

		return {
			valid: true,
			message: validationSummary,
			supplierInfo,
			debugInfo: _this.debugInfo,
		}
	} catch (error) {
		console.error('Ошибка при валидации API-ключа:', error)
		const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка при валидации API-ключа'
		_this.debugInfo.push({
			url: 'general_error_validateApiKey',
			method: 'ERROR',
			headers: {},
			error: error instanceof Error ? error.message : 'Неизвестная ошибка',
			summary: `Ошибка валидации API-ключа: ${errorMessage}`,
		})

		return {
			valid: false,
			message: errorMessage,
			debugInfo: _this.debugInfo,
		}
	}
}
