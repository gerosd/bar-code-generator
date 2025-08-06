import { logger } from '@/utils/logger' // Убедимся, что логгер импортирован

const RATE_LIMIT_CONFIG = {
	prices: { limit: 10, periodSeconds: 6 },
	// Можно добавить другие категории, если у них свои лимиты
	default: { limit: 10, periodSeconds: 6 }, // По умолчанию, как для цен
}

export type ApiCategory = keyof typeof RATE_LIMIT_CONFIG

export class ApiRateLimiter {
	private static requestTimestamps: Map<string, number[]> = new Map()
	private static cleanupInterval: Timer | null = null
	private static readonly MAX_TIMESTAMP_AGE_MS = 60 * 1000 // Храним метки не дольше минуты

	private static initializeCleanup() {
		if (!this.cleanupInterval) {
			this.cleanupInterval = setInterval(() => {
				const now = Date.now()
				this.requestTimestamps.forEach((timestamps, key) => {
					const freshTimestamps = timestamps.filter((ts) => now - ts < this.MAX_TIMESTAMP_AGE_MS)
					if (freshTimestamps.length > 0) {
						this.requestTimestamps.set(key, freshTimestamps)
					} else {
						this.requestTimestamps.delete(key)
					}
				})
				if (this.requestTimestamps.size === 0 && this.cleanupInterval) {
					clearInterval(this.cleanupInterval)
					this.cleanupInterval = null
				}
			}, this.MAX_TIMESTAMP_AGE_MS)
		}
	}

	public static determineApiCategory(url: string): ApiCategory {
		if (url.includes('discounts-prices-api.wildberries.ru')) {
			return 'prices'
		}
		// Добавить другие правила для других категорий API, если необходимо
		return 'default'
	}

	public static async waitForSlot(apiKey: string, category: ApiCategory): Promise<void> {
		this.initializeCleanup()
		const config = RATE_LIMIT_CONFIG[category] || RATE_LIMIT_CONFIG.default
		const key = `${apiKey.substring(0, 8)}..._${category}` // Сокращаем ключ API в логах для безопасности и читаемости

		while (true) {
			const now = Date.now()
			const timestamps = (this.requestTimestamps.get(key) || []).filter(
				(ts) => now - ts < config.periodSeconds * 1000
			)

			if (timestamps.length < config.limit) {
				timestamps.push(now)
				this.requestTimestamps.set(key, timestamps)
				logger.debug(
					`[ApiRateLimiter] ✅ Слот получен для ключа: ${key}. Запросов в периоде: ${timestamps.length}/${config.limit}`,
					{
						metadata: {
							apiKeyIdentifier: key,
							category,
							currentInPeriod: timestamps.length,
							limit: config.limit,
							functionName: 'ApiRateLimiter.waitForSlot',
						},
					}
				)
				return
			}

			const oldestRequestInPeriod = timestamps[0]
			const timeToWait = oldestRequestInPeriod + config.periodSeconds * 1000 - now

			logger.debug(
				`[ApiRateLimiter] ⏳ Ожидание слота для ключа: ${key}. Запросов: ${timestamps.length}/${
					config.limit
				}. Ожидание: ${timeToWait > 0 ? timeToWait : 0}ms`,
				{
					metadata: {
						apiKeyIdentifier: key,
						category,
						currentInPeriod: timestamps.length,
						limit: config.limit,
						timeToWait: timeToWait > 0 ? timeToWait : 0,
						functionName: 'ApiRateLimiter.waitForSlot',
					},
				}
			)

			if (timeToWait > 0) {
				await new Promise((resolve) => setTimeout(resolve, timeToWait + 50)) // +50ms на всякий случай
			}
			// Повторяем цикл, чтобы перепроверить условие, т.к. состояние могло измениться
		}
	}
}
