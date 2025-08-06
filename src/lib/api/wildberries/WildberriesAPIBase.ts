import { ApiDebugInfo } from '@/lib/types/supplier'
import { logger } from '@/utils/logger'
import { ApiRateLimiter } from './ApiRateLimiter'

export class WildberriesAPIBase {
	public token: string
	public debugInfo: ApiDebugInfo[] = [] // Сделаем public, чтобы методы из других файлов имели доступ

	// Состояние для пагинации списка товаров
	public productListTextSearch?: string
	public productListPageSize: number = 50 // Размер страницы по умолчанию
	public productListNextCursorUpdatedAt?: string
	public productListNextCursorNmID?: number
	public productListTotalAvailable?: number
	public productListFetchedCount: number = 0

	constructor(token: string) {
		this.token = token
	}

	/**
	 * Универсальный метод для выполнения запросов к API Wildberries
	 * с сохранением отладочной информации
	 */
	public async fetchWithDebug<T>(
		url: string,
		options: RequestInit = {},
		parseResponse: (response: Response) => Promise<T> = async (res) => {
			try {
				const isJson = res.headers.get('content-type')?.includes('application/json')
				if (isJson) {
					return (await res.json()) as T
				}
				return (await res.text()) as unknown as T
			} catch (error) {
				return '' as unknown as T
			}
		}
	): Promise<{
		success: boolean
		data?: T
		error?: string
		response?: Response
	}> {
		// Добавляем токен авторизации, если он не указан в заголовках
		if (!options.headers) {
			options.headers = {
				Authorization: this.token,
			}
		}

		// Записываем информацию о запросе
		const startTime = performance.now()
		const urlObj = new URL(url)
		const method = options.method || 'GET'
		const endpoint = urlObj.pathname

		// >>> Начало: Интеграция ApiRateLimiter
		const apiCategory = ApiRateLimiter.determineApiCategory(url)
		// Логируем перед ожиданием, чтобы видеть, что система пытается сделать запрос
		logger.debug(
			`[WB API Base] Attempting request ${method} ${endpoint}. Category: ${apiCategory}. Token: ${this.token.substring(
				0,
				8
			)}... Waiting for rate limit slot...`
		)
		await ApiRateLimiter.waitForSlot(this.token, apiCategory)
		logger.debug(
			`[WB API Base] Rate limit slot acquired for ${method} ${endpoint}. Token: ${this.token.substring(
				0,
				8
			)}... Proceeding with request.`
		)
		// <<< Конец: Интеграция ApiRateLimiter

		const debugEntry: ApiDebugInfo = {
			url,
			method,
			headers: options.headers as Record<string, string>,
			timing: {
				start: startTime,
				end: 0,
				duration: 0,
			},
		}

		this.debugInfo.push(debugEntry)

		// Логируем начало запроса
		logger.performance(`WB API Request started: ${method} ${endpoint}`, {
			method,
			endpoint,
			host: urlObj.host,
			queryParams: urlObj.search ? urlObj.search : undefined,
		})

		try {
			// Выполняем запрос
			const response = await fetch(url, options)

			// Записываем информацию о завершении запроса
			const endTime = performance.now()
			const duration = endTime - startTime

			if (debugEntry.timing) {
				debugEntry.timing.end = endTime
				debugEntry.timing.duration = duration
			}
			debugEntry.responseStatus = response.status

			// Логируем результат запроса
			logger.performance(`WB API Request completed: ${method} ${endpoint}`, {
				method,
				endpoint,
				status: response.status,
				duration: `${duration.toFixed(2)}ms`,
				success: response.ok,
			})

			if (!response.ok) {
				// Пытаемся получить данные об ошибке
				let errorData: unknown
				try {
					errorData = await response.clone().json()
				} catch (e) {
					errorData = await response.clone().text()
				}

				debugEntry.responseData = errorData

				// Логируем ошибку
				logger.performance(`WB API Request failed: ${method} ${endpoint}`, {
					method,
					endpoint,
					status: response.status,
					duration: `${duration.toFixed(2)}ms`,
					error: errorData,
				})

				return {
					success: false,
					error: `Ошибка при выполнении запроса. Статус: ${response.status}`,
					data: errorData as T,
					response,
				}
			}

			// Парсим ответ успешного запроса
			const parseStartTime = performance.now()
			const data = await parseResponse(response.clone())
			const parseEndTime = performance.now()

			debugEntry.responseData = data

			// Логируем информацию о парсинге ответа
			logger.performance(`WB API Response parsed: ${method} ${endpoint}`, {
				method,
				endpoint,
				parseTime: `${(parseEndTime - parseStartTime).toFixed(2)}ms`,
				totalTime: `${(parseEndTime - startTime).toFixed(2)}ms`,
				dataType: data ? typeof data : 'null',
				dataSize: data
					? Array.isArray(data)
						? data.length
						: typeof data === 'object'
						? Object.keys(data).length
						: 'n/a'
					: 0,
			})

			return {
				success: true,
				data,
				response,
			}
		} catch (error) {
			// Записываем информацию об ошибке
			const endTime = performance.now()
			const duration = endTime - startTime

			debugEntry.error = error instanceof Error ? error.message : 'Неизвестная ошибка'
			if (debugEntry.timing) {
				debugEntry.timing.end = endTime
				debugEntry.timing.duration = duration
			}

			// Логируем ошибку запроса
			logger.performance(`WB API Request error: ${method} ${endpoint}`, {
				method,
				endpoint,
				duration: `${duration.toFixed(2)}ms`,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: { message: String(error) },
			})

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Неизвестная ошибка',
			}
		}
	}

	/**
	 * Получить информацию о дебаге
	 */
	public getDebugInfo(): ApiDebugInfo[] {
		return this.debugInfo
	}
}
