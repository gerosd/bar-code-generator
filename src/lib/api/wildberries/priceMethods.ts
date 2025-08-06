import {
	WBBatchUploadResult,
	WBPrice,
	WBPriceResponse,
	WBSetPriceRequest,
	WBSetPriceResponse,
	WBUploadPricesRequest,
	WBUploadPricesResponse,
} from '@/lib/types/supplier'
import { logger } from '@/utils/logger'
import { WildberriesAPIBase } from './WildberriesAPIBase'

let isLoggingEnabledChecked = false
let isLoggingEnabled = false

/**
 * Получение цен по артикулу WB
 */
export async function getPriceByNmId(
	_this: WildberriesAPIBase,
	nmId: number
): Promise<{
	success: boolean
	data?: WBPrice
	error?: string
}> {
	const url = 'https://discounts-prices-api.wildberries.ru/api/v2/list/goods/filter'
	const params = new URLSearchParams({
		filterNmID: nmId.toString(),
		limit: '1',
	})

	const result = await _this.fetchWithDebug<WBPriceResponse>(`${url}?${params.toString()}`, {
		method: 'GET',
		headers: {
			Authorization: _this.token,
		},
	})

	if (!result.success || !result.data) {
		return {
			success: false,
			error: result.error || 'Не удалось получить цену',
		}
	}

	if (result.data.error) {
		return {
			success: false,
			error: result.data.errorText,
		}
	}

	if (_this.debugInfo.length > 0) {
		const lastDebugEntry = _this.debugInfo[_this.debugInfo.length - 1]
		if (result.success && result.data?.data?.listGoods?.[0]) {
			const priceData = result.data.data.listGoods[0]
			const firstSizePrice = priceData.sizes?.[0]?.price !== undefined ? priceData.sizes[0].price : 'N/A'
			lastDebugEntry.summary = `Цена для nmId ${nmId}: ${firstSizePrice}, скидка ${
				priceData.discount
			}%. Кол-во размеров: ${priceData.sizes?.length || 0}.`
		} else {
			lastDebugEntry.summary = `Ошибка получения цены для nmId ${nmId}: ${
				result.error || result.data?.errorText || 'Неизвестная ошибка'
			}`
		}
	}

	return {
		success: true,
		data: result.data.data.listGoods[0],
	}
}

/**
 * Получение всех цен поставщика
 */
export async function getAllPrices(
	_this: WildberriesAPIBase,
	options?: {
		supplierId?: string
		totalProducts?: number
		updateTotalProductsCallback?: (supplierId: string, totalProducts: number) => Promise<void>
	}
): Promise<{
	success: boolean
	data?: WBPrice[]
	error?: string
}> {
	const url = 'https://discounts-prices-api.wildberries.ru/api/v2/list/goods/filter'
	const allPrices: WBPrice[] = []
	const limitPerRequest = 1000
	const maxParallelRequests = 5
	const startTimeOp = performance.now()

	_this.debugInfo.push({
		url: 'getAllPrices:start',
		method: 'INTERNAL_SUMMARY',
		headers: {},
		summary: `Начало загрузки цен с параллельным выполнением. Известное количество товаров: ${
			options?.totalProducts ? options.totalProducts : 'неизвестно'
		}`,
		timing: { start: startTimeOp, end: 0, duration: 0 },
	})

	const fetchBatch = async (
		offset: number,
		batchSize: number,
		batchIndex: number
	): Promise<{
		prices: WBPrice[]
		success: boolean
	}> => {
		const maxRetries = 3
		let retryCount = 0
		while (retryCount <= maxRetries) {
			try {
				const batchStartTime = performance.now()
				const params = new URLSearchParams({
					limit: batchSize.toString(),
					offset: offset.toString(),
				})
				logger.performance(
					`getAllPrices: Загрузка порции (offset: ${offset}, limit: ${batchSize})${
						retryCount > 0 ? ` - попытка ${retryCount + 1}` : ''
					}`
				)
				const result = await _this.fetchWithDebug<WBPriceResponse>(`${url}?${params.toString()}`, {
					method: 'GET',
					headers: {
						Authorization: _this.token,
					},
				})
				const batchEndTime = performance.now()
				const batchDuration = batchEndTime - batchStartTime
				_this.debugInfo.push({
					url: `getAllPrices:batch${batchIndex + 1}${retryCount > 0 ? `:retry${retryCount}` : ''}`,
					method: 'INTERNAL_SUMMARY',
					headers: {},
					summary: `Порция #${batchIndex + 1} загружена за ${batchDuration.toFixed(
						2
					)}ms. Offset: ${offset}, limit: ${batchSize}.`,
					timing: { start: batchStartTime, end: batchEndTime, duration: batchDuration },
				})
				if (result.response && result.response.status === 429) {
					const retryAfter = result.response.headers.get('Retry-After') || '6'
					const waitTime = parseInt(retryAfter, 10) * 1000
					logger.performance(
						`getAllPrices: Получена ошибка 429 для порции с offset ${offset}. Повторный запрос через ${
							waitTime / 1000
						} секунд.`,
						{
							metadata: {
								retryCount,
								retryAfter,
								offset,
							},
						}
					)
					await new Promise((resolve) => setTimeout(resolve, waitTime))
					retryCount++
					continue
				}
				if (!result.success || !result.data) {
					const errorText = result.error || 'Не удалось получить порцию цен'
					logger.error(`getAllPrices: Ошибка при получении порции: ${errorText}`, {
						metadata: { offset, limit: batchSize, retryCount },
					})
					return { prices: [], success: false }
				}
				if (result.data.error) {
					logger.performance(`getAllPrices: API вернул ошибку для порции с offset ${offset}`, {
						metadata: {
							error: result.data.errorText,
							offset,
						},
					})
					return { prices: [], success: false }
				}
				const prices = result.data?.data?.listGoods || []
				logger.performance(`getAllPrices: Получено ${prices.length} товаров для offset ${offset}`)
				return { prices, success: true }
			} catch (error) {
				logger.error(
					`getAllPrices: Исключение при получении порции: ${
						error instanceof Error ? error.message : String(error)
					}`,
					{
						metadata: { offset, limit: batchSize, retryCount, error },
					}
				)
				retryCount++
				if (retryCount > maxRetries) {
					return { prices: [], success: false }
				}
				await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount))
			}
		}
		return { prices: [], success: false }
	}

	let hasErrors = false

	// Определяем, как будем формировать батчи, и выполняем запросы
	if (options?.totalProducts && options.totalProducts > 0) {
		// СЦЕНАРИЙ 1: Количество товаров известно -> ПАРАЛЛЕЛЬНОЕ ВЫПОЛНЕНИЕ
		const { totalProducts } = options
		logger.performance(
			`getAllPrices: Режим с известным количеством товаров: ${totalProducts}. Запускается параллельная загрузка.`
		)

		// Стараемся сделать 5 запросов, но не более 1000 товаров в каждом
		let batchSize = Math.ceil(totalProducts / maxParallelRequests)
		if (batchSize > limitPerRequest) {
			batchSize = limitPerRequest
		}

		const numRequests = Math.ceil(totalProducts / batchSize)
		const batchOffsets: { offset: number; batchSize: number }[] = []
		for (let i = 0; i < numRequests; i++) {
			batchOffsets.push({ offset: i * batchSize, batchSize })
		}

		logger.performance(
			`getAllPrices: Сформировано ${numRequests} запросов размером ${batchSize} для параллельной загрузки.`
		)

		const batchPromises = batchOffsets.map((batch, index) => fetchBatch(batch.offset, batch.batchSize, index))
		const batchResults = await Promise.all(batchPromises)

		for (const batchResult of batchResults) {
			if (batchResult.success) {
				allPrices.push(...batchResult.prices)
			} else {
				hasErrors = true
			}
		}

		if (hasErrors) {
			logger.warn('getAllPrices: Во время параллельной загрузки в некоторых запросах произошли ошибки.')
		}
	} else {
		// СЦЕНАРИЙ 2: Количество товаров неизвестно -> ПОСЛЕДОВАТЕЛЬНОЕ ВЫПОЛНЕНИЕ
		logger.performance(
			`getAllPrices: Режим с неизвестным количеством товаров. Запускается последовательная загрузка порциями по ${limitPerRequest}.`
		)

		let offset = 0
		let hasMore = true
		let batchIndex = 0

		while (hasMore) {
			const batchResult = await fetchBatch(offset, limitPerRequest, batchIndex)

			if (batchResult.success && batchResult.prices) {
				allPrices.push(...batchResult.prices)
				if (batchResult.prices.length < limitPerRequest) {
					hasMore = false // Это была последняя страница
				}
			} else {
				// Ошибка при загрузке этой порции, прекращаем
				hasMore = false
				hasErrors = true
				logger.error(
					`getAllPrices: Ошибка при последовательной загрузке порции с offset ${offset}. Прерывание.`
				)
			}
			offset += limitPerRequest
			batchIndex++
		}
	}

	const totalItemsLoaded = allPrices.length
	logger.performance(
		`getAllPrices: Загрузка завершена. Получено ${totalItemsLoaded} товаров. Были ошибки: ${hasErrors}.`
	)

	// Коллбэк для обновления общего количества товаров в БД (если нужно)
	if (options?.updateTotalProductsCallback && options.supplierId && !hasErrors) {
		const shouldUpdate = !options.totalProducts || totalItemsLoaded > options.totalProducts
		if (shouldUpdate) {
			options.updateTotalProductsCallback(options.supplierId, totalItemsLoaded).catch((error) => {
				logger.performance(`getAllPrices: Ошибка при обновлении количества товаров`, {
					metadata: {
						supplierId: options.supplierId,
						totalItemsLoaded,
						error: error instanceof Error ? error.message : String(error),
					},
				})
			})
			logger.performance(`getAllPrices: Запущено обновление количества товаров в базе: ${totalItemsLoaded}`)
		} else {
			logger.performance(
				`getAllPrices: Обновление количества товаров не требуется: ${totalItemsLoaded} <= ${
					options.totalProducts ?? 'unknown'
				}`
			)
		}
	} else if (hasErrors) {
		logger.performance(`getAllPrices: Обновление количества товаров пропущено из-за ошибок при загрузке`)
	}

	const endTimeOp = performance.now()
	const totalDuration = endTimeOp - startTimeOp
	_this.debugInfo.push({
		url: 'getAllPricesSummary',
		method: 'INTERNAL_SUMMARY',
		headers: {},
		summary: `Загрузка цен завершена. Всего получено ${
			allPrices.length
		} записей о ценах. Были ошибки: ${hasErrors}. Время выполнения: ${totalDuration.toFixed(2)}ms.`,
		timing: { start: startTimeOp, end: endTimeOp, duration: totalDuration },
	})

	if (hasErrors) {
		return {
			success: false,
			data: allPrices,
			error: 'Произошли ошибки во время загрузки цен. Данные могут быть неполными.',
		}
	}

	return {
		success: true,
		data: allPrices,
	}
}

/**
 * Установка цен
 */
export async function setPrices(
	_this: WildberriesAPIBase,
	prices: WBPrice[]
): Promise<{
	success: boolean
	error?: string
	results?: WBSetPriceResponse[]
}> {
	const startTimeOp = Date.now()
	const url = 'https://discounts-prices-api.wildberries.ru/api/v2/upload/task'
	const batchSize = 1000
	const results: WBSetPriceResponse[] = []

	for (let i = 0; i < prices.length; i += batchSize) {
		const batch = prices.slice(i, i + batchSize)
		const payload: WBSetPriceRequest = {
			data: batch,
		}
		const result = await _this.fetchWithDebug<WBSetPriceResponse>(url, {
			method: 'POST',
			headers: {
				Authorization: _this.token,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		})

		if (_this.debugInfo.length > 0) {
			const lastDebugEntry = _this.debugInfo[_this.debugInfo.length - 1]
			const batchNumber = i / batchSize + 1
			const totalBatches = Math.ceil(prices.length / batchSize)
			if (result.success && result.data?.data?.id) {
				lastDebugEntry.summary = `Установка цен (батч ${batchNumber}/${totalBatches}): обработано ${batch.length} цен. ID задачи WB: ${result.data.data.id}.`
			} else {
				lastDebugEntry.summary = `Установка цен (батч ${batchNumber}/${totalBatches}): ошибка - ${
					result.error ||
					result.data?.errorText ||
					(result.data?.error ? JSON.stringify(result.data.data) : 'Неизвестная ошибка.')
				}`
			}
		}

		if (!result.success || !result.data) {
			return {
				success: false,
				error: result.error || 'Не удалось установить цены',
				results: results.length > 0 ? results : undefined,
			}
		}
		results.push(result.data)
		if (i + batchSize < prices.length) {
			await new Promise((resolve) => setTimeout(resolve, 600))
		}
	}

	_this.debugInfo.push({
		url: 'setPricesSummary',
		method: 'INTERNAL_SUMMARY',
		headers: {},
		summary: `Всего отправлено ${prices.length} цен в ${results.length} батчах.`,
		timing: { start: startTimeOp, end: Date.now(), duration: Date.now() - startTimeOp },
	})

	return {
		success: true,
		results,
	}
}

/**
 * Загрузка задачи на установку цен и скидок
 */
export async function uploadPricesTask(
	_this: WildberriesAPIBase,
	updates: { nmID: number; price: number; discount: number }[]
): Promise<WBUploadPricesResponse> {
	if (!isLoggingEnabledChecked) {
		isLoggingEnabled = process.env.WB_PRICE_LOGGING_ENABLED === 'true'
		if (!isLoggingEnabled) {
			logger.warn(
				'[WbApiLogger] Логирование запросов к API цен WB отключено. Для включения установите WB_PRICE_LOGGING_ENABLED=true'
			)
		}
		isLoggingEnabledChecked = true
	}

	const result = await internalUploadPricesTask(_this, updates)


	return { ...result}
}

/**
 * Внутренняя реализация загрузки цен, без логики логирования.
 * @param api - Экземпляр WildberriesAPIBase.
 * @param updates - Массив обновлений цен.
 * @returns {Promise<WBUploadPricesResponse>} Результат загрузки.
 */
async function internalUploadPricesTask(
	api: WildberriesAPIBase,
	updates: { nmID: number; price: number; discount: number }[]
): Promise<WBUploadPricesResponse> {
	const totalUpdates = updates.length
	if (totalUpdates === 0) {
		return { success: true, batchResults: [] }
	}

	const MAX_ITEMS_PER_TASK = 1000
	const DELAY_BETWEEN_BATCHES_MS = 1000 // Задержка между отправкой батчей

	const batches: Array<Array<{ nmID: number; price: number; discount: number }>> = []
	for (let i = 0; i < updates.length; i += MAX_ITEMS_PER_TASK) {
		batches.push(updates.slice(i, i + MAX_ITEMS_PER_TASK))
	}

	const batchResults: WBBatchUploadResult[] = []
	let overallSuccess = true // Изначально считаем, что все успешно
	let firstSuccessfulTaskId: number | undefined = undefined
	let firstOverallError: string | undefined = undefined
	let firstOverallErrorDetails: Record<string, unknown> | string | null = null

	const processBatch = async (
		batch: Array<{ nmID: number; price: number; discount: number }>,
		batchIndex: number
	): Promise<WBBatchUploadResult> => {
		const maxRetries = 3 // Локальная константа для максимального количества попыток
		let retries = 0

		while (retries <= maxRetries) {
			const attempt = retries + 1
			const requestStartTime = performance.now()
			try {
				const requestBody: WBUploadPricesRequest = { data: batch }
				const response = await api.fetchWithDebug<WBSetPriceResponse>(
					'https://discounts-prices-api.wildberries.ru/api/v2/upload/task',
					{
						method: 'POST',
						headers: {
							Authorization: api.token,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(requestBody),
					}
				)

				const batchEndTime = performance.now()
				const batchDuration = batchEndTime - requestStartTime

				if (!response.success || !response.data || response.data.error) {
					const errorText =
						response.data?.errorText || response.error || 'Неизвестная ошибка при загрузке задачи (батч)'
					const errorCode = response.response?.status ? String(response.response.status) : undefined
					let errorDetailsContent: Record<string, unknown> | string | null = null

					if (response.data) {
						// Если response.data вообще существует.
						// Деструктурируем известные поля из response.data
						const {
							data: successDataField,
							error: errorFlag,
							errorText: textErrorMessage,
							...otherDetailsFromData
						} = response.data

						// Если есть какие-то другие поля в response.data, считаем их деталями ошибки
						if (Object.keys(otherDetailsFromData).length > 0) {
							errorDetailsContent = otherDetailsFromData as Record<string, unknown>
						} else if (
							successDataField &&
							typeof successDataField === 'object'
						) {
							// Если otherDetails пусты, но поле 'data' внутри response.data (т.е. successDataField)
							// не является структурой успеха (id, alreadyExists), то оно может быть деталью ошибки.
							const potentialErrorDetails = successDataField as Record<string, unknown>
							if (
								!(
									'id' in potentialErrorDetails &&
									'alreadyExists' in potentialErrorDetails &&
									Object.keys(potentialErrorDetails).length === 2
								)
							) {
								errorDetailsContent = potentialErrorDetails
							}
						}
					}

					api.debugInfo.push({
						url: `uploadPricesTask:batch${batchIndex + 1}:error`,
						method: 'POST',
						headers: { Authorization: 'скрыто', 'Content-Type': 'application/json' },
						payload: requestBody,
						responseData: response.data,
						responseStatus: response.response?.status,
						error: errorText,
						summary: `Ошибка загрузки батча #${attempt}. Товаров: ${
							batch.length
						}. Ошибка: ${errorText}. Код: ${errorCode || 'N/A'}`,
						timing: { start: requestStartTime, end: batchEndTime, duration: batchDuration },
					})
					return {
						success: false,
						error: 'Исчерпаны все попытки загрузки батча',
						itemCount: batch.length,
						errorCode,
						errorDetails: errorDetailsContent,
					}
				}

				// Успешный ответ (response.success === true и response.data не null и response.data.error === false)
				// response.data здесь не должно быть null и response.data.error должно быть false
				const taskId = response.data?.data?.id // response.data.data может быть null, если API так ответит
				api.debugInfo.push({
					url: `uploadPricesTask:batch${batchIndex + 1}:success`,
					method: 'POST',
					headers: { Authorization: 'скрыто', 'Content-Type': 'application/json' },
					payload: requestBody,
					responseData: response.data,
					responseStatus: response.response?.status,
					summary: `Батч #${attempt} успешно загружен. Товаров: ${batch.length}. TaskID: ${taskId}`,
					timing: { start: requestStartTime, end: batchEndTime, duration: batchDuration },
				})
				return { success: true, taskId, itemCount: batch.length }
			} catch (error) {
				const batchEndTime = performance.now()
				const batchDuration = batchEndTime - requestStartTime
				const errorMessage = error instanceof Error ? error.message : String(error)
				api.debugInfo.push({
					url: `uploadPricesTask:batch${batchIndex + 1}:exception`,
					method: 'POST',
					headers: { Authorization: 'скрыто', 'Content-Type': 'application/json' },
					payload: batch,
					error: errorMessage,
					summary: `Критическая ошибка (исключение) при загрузке батча #${attempt}. Товаров: ${batch.length}. Ошибка: ${errorMessage}`,
					timing: { start: requestStartTime, end: batchEndTime, duration: batchDuration },
				})
				retries++
				if (retries > maxRetries) {
					return {
						success: false,
						error: `Критическая ошибка при обработке батча: ${errorMessage}`,
						errorDetails: { exception: errorMessage },
						itemCount: batch.length,
					}
				}
				await new Promise((resolve) => setTimeout(resolve, 1000 * (retries + 1))) // Задержка перед следующей попыткой
			}
		}
		return { success: false, error: 'Неизвестная ошибка при загрузке задачи', itemCount: 0 }
	}

	const results = []
	for (let i = 0; i < batches.length; i++) {
		if (i > 0) {
			await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS))
		}
		results.push(processBatch(batches[i], i))
	}

	const settledBatchResults = await Promise.all(results)

	for (const result of settledBatchResults) {
		batchResults.push(result)
		if (!result.success) {
			overallSuccess = false
			if (!firstOverallError) {
				firstOverallError = result.error
				// Для общей ошибки errorDetails берем из первого неуспешного батча
				firstOverallErrorDetails = result.errorDetails ?? null
			}
		} else if (result.taskId && firstSuccessfulTaskId === undefined) {
			firstSuccessfulTaskId = result.taskId
		}
	}

	// Финальное решение по общему успеху:
	// Если хотя бы один батч был успешным, считаем операцию частично успешной (для получения taskId)
	// Но если ВСЕ батчи провалились, то общий success будет false.
	const finalOverallSuccess = batchResults.some((br) => br.success)

	const endTimeOp = performance.now()
	api.debugInfo.push({
		url: 'uploadPricesTask:end',
		method: 'INTERNAL_SUMMARY',
		headers: {},
		summary: `Завершение загрузки цен через задачи. Общий успех: ${finalOverallSuccess}. TaskID первого успешного батча: ${firstSuccessfulTaskId}. Батчей всего: ${
			batches.length
		}. Ошибок в батчах: ${batchResults.filter((br) => !br.success).length}`,
		responseData: { overallSuccess: finalOverallSuccess, firstSuccessfulTaskId, batchResults },
		timing: {
			start: endTimeOp - batches.length * DELAY_BETWEEN_BATCHES_MS,
			end: endTimeOp,
			duration: endTimeOp - (endTimeOp - batches.length * DELAY_BETWEEN_BATCHES_MS),
		},
	})

	if (!finalOverallSuccess && !firstOverallError) {
		// Если по какой-то причине не удалось определить ошибку из батчей, но общий успех false
		firstOverallError = 'Не удалось загрузить ни один батч с ценами.'
		firstOverallErrorDetails = { note: 'No batch succeeded and no specific batch error was captured as primary.' }
	}

	return {
		success: finalOverallSuccess,
		taskId: firstSuccessfulTaskId, // ID первого успешно созданного батча
		error: finalOverallSuccess ? undefined : firstOverallError,
		errorDetails: finalOverallSuccess ? null : firstOverallErrorDetails ?? null,
		batchResults,
	}
}
