import fs from 'fs'
import moment from 'moment'
import path from 'path'
import winston from 'winston'

const LOGSTASH_HOST = process.env.LOGSTASH_HOST || 'localhost'
const LOGSTASH_PORT = parseInt(process.env.LOGSTASH_PORT || '5044', 10)
const APP_NAME = process.env.APP_NAME || 'barCodeGenerator'

// Типы для настроек логгера
interface LoggerConfig {
	categories: Record<string, boolean>
	debugFunctions: Record<string, boolean>
	logLevel: string
}

// Загружаем настройки из JSON файла
let loggerConfig: LoggerConfig
try {
	const configPath = path.join(process.cwd(), 'logger.config.json')
	const configFile = fs.readFileSync(configPath, 'utf8')
	loggerConfig = JSON.parse(configFile)
} catch (error) {
	// Дефолтные настройки если файл не найден
	loggerConfig = {
		categories: {
			PERFORMANCE: true,
			CACHE: true,
			DEBUG: true,
			API: true,
			AUTH: true,
			DATABASE: true,
			WORKER: true,
		},
		debugFunctions: {},
		logLevel: 'info',
	}
	console.warn('Не удалось загрузить logger.config.json, используются дефолтные настройки:', error)
}

// Типы для категорий логов
export type LogCategory = 'PERFORMANCE' | 'CACHE' | 'DEBUG' | 'API' | 'AUTH' | 'DATABASE' | 'WORKER'

// Интерфейс для расширенного логирования
export interface ExtendedLogOptions {
	category?: LogCategory
	functionName?: string
	metadata?: Record<string, unknown>
}

const logFormat = winston.format.combine(winston.format.timestamp(), winston.format.json())

export const udpLogger = winston.createLogger({
	level: loggerConfig.logLevel,
	format: logFormat,
	defaultMeta: {
		appName: APP_NAME,
	},
	transports: [
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.printf(({ timestamp, level, message, category, functionName, appName, ...rest }) => {
					const formattedTime = moment(timestamp as string).format('YYYY-MM-DD HH:mm:ss.SSS')
					let logMessage = `[${formattedTime}] ${level}`

					if (category) {
						logMessage += ` [${category}]`
					}

					if (functionName) {
						logMessage += ` [${functionName}]`
					}

					logMessage += `: ${message}`

					// Добавляем остальные данные из объекта лога (исключая appName и metadata)
					// appName исключаем из консольного вывода, но оно остается в логах для передачи по сети
					if (Object.keys(rest).length > 0) {
						// Попытаемся отфильтровать Symbol поля и appName
						const printableRest = Object.entries(rest).reduce((acc, [key, value]) => {
							if (key !== 'appName') {
								// Winston может добавлять Symbol-ключи, также исключаем appName
								acc[key] = value
							}
							return acc
						}, {} as Record<string, unknown>)
						if (Object.keys(printableRest).length > 0) {
							logMessage += ` ${JSON.stringify(printableRest)}`
						}
					}

					return logMessage
				})
			),
		}),
		/* new LogstashTransport.LogstashTransport({
			host: LOGSTASH_HOST,
			port: LOGSTASH_PORT,
			appName: APP_NAME,
		}), */
	],
})

// Функция проверки, нужно ли логировать сообщение
const shouldLog = (category?: LogCategory, functionName?: string): boolean => {
	// Если категория указана, проверяем её настройки
	if (category && !loggerConfig.categories[category]) {
		return false
	}

	// Если это DEBUG категория с функцией, проверяем настройки функции
	return !(category === 'DEBUG' && functionName && !loggerConfig.debugFunctions[functionName]);


}

// Расширенные методы логирования
const createLogMethod = (level: 'info' | 'warn' | 'error' | 'debug') => {
	return (message: string, options?: ExtendedLogOptions) => {
		if (!shouldLog(options?.category, options?.functionName)) {
			return
		}

		const logData = {
			message,
			category: options?.category,
			functionName: options?.functionName,
			...(options?.metadata || {}),
		}

		udpLogger[level](logData)
	}
}

// Создаем новый объект logger с расширенными методами
export const logger = {
	info: createLogMethod('info'),
	warn: createLogMethod('warn'),
	error: createLogMethod('error'),
	debug: createLogMethod('debug'),

	// Специальные методы для категорий
	performance: (message: string, metadata?: Record<string, unknown>) => {
		logger.info(message, { category: 'PERFORMANCE', metadata })
	},

	cache: (message: string, metadata?: Record<string, unknown>) => {
		logger.info(message, { category: 'CACHE', metadata })
	},

	api: (message: string, metadata?: Record<string, unknown>) => {
		logger.info(message, { category: 'API', metadata })
	},

	auth: (message: string, metadata?: Record<string, unknown>) => {
		logger.info(message, { category: 'AUTH', metadata })
	},

	database: (message: string, metadata?: Record<string, unknown>) => {
		logger.info(message, { category: 'DATABASE', metadata })
	},

	worker: (message: string, metadata?: Record<string, unknown>) => {
		logger.info(message, { category: 'WORKER', metadata })
	},

	// Метод для DEBUG с функцией
	debugFunction: (functionName: string, message: string, metadata?: Record<string, unknown>) => {
		logger.debug(message, { category: 'DEBUG', functionName, metadata })
	},
}

// Добавляем структуру для хранения метрик
interface PerformanceMetric {
	operation: string
	startTime: number
	endTime?: number
	duration?: number
	metadata?: Record<string, unknown>
}

const metrics: PerformanceMetric[] = []

/**
 * Начинает измерение времени выполнения операции
 * @param operation Название операции
 * @param metadata Дополнительные метаданные
 * @returns ID метрики для последующего завершения
 */
export const startMeasure = (operation: string, metadata?: Record<string, unknown>): number => {
	const metric: PerformanceMetric = {
		operation,
		startTime: performance.now(),
		metadata,
	}
	metrics.push(metric)
	return metrics.length - 1
}

/**
 * Завершает измерение времени операции и логирует результат
 * @param metricId ID метрики, полученный из startMeasure
 * @param additionalInfo Дополнительная информация для логирования
 */
export const endMeasure = (metricId: number, additionalInfo?: Record<string, unknown>): number => {
	if (metricId < 0 || metricId >= metrics.length) {
		logger.error('Неверный ID метрики', { metadata: { metricId } })
		return -1
	}

	const metric = metrics[metricId]
	metric.endTime = performance.now()
	metric.duration = metric.endTime - metric.startTime

	// Объединяем исходные метаданные с дополнительной информацией
	const logMetadata = {
		...metric.metadata,
		...additionalInfo,
		duration: metric.duration,
	}

	// Логируем результат через performance категорию
	logger.performance(`${metric.operation}: ${metric.duration.toFixed(2)}ms`, logMetadata)

	return metric.duration
}

/**
 * Оборачивает асинхронную функцию для измерения времени её выполнения
 * @param fn Функция для измерения
 * @param operationName Название операции
 * @param metadata Дополнительные метаданные
 * @returns Результат выполнения функции
 */
export const measureAsync = async <T>(
	fn: () => Promise<T>,
	operationName: string,
	metadata?: Record<string, unknown>
): Promise<T> => {
	const metricId = startMeasure(operationName, metadata)
	try {
		const result = await fn()
		// Если результат - объект, добавляем базовую информацию о нем в лог
		const resultInfo = result && typeof result === 'object' ? { resultType: result.constructor.name } : undefined
		endMeasure(metricId, resultInfo)
		return result
	} catch (error) {
		endMeasure(metricId, { error: error instanceof Error ? error.message : String(error) })
		throw error
	}
}

// Функция для перезагрузки настроек логгера
export const reloadLoggerConfig = (): void => {
	try {
		const configPath = path.join(process.cwd(), 'logger.config.json')
		const configFile = fs.readFileSync(configPath, 'utf8')
		loggerConfig = JSON.parse(configFile)
		logger.info('Настройки логгера перезагружены', { category: 'DEBUG' })
	} catch (error) {
		logger.error('Ошибка при перезагрузке настроек логгера', { metadata: { error } })
	}
}

// Функция для вывода информации о настройках логгера
export const showLoggerConfig = (): void => {
	console.log(`Настройки логгера: host=${LOGSTASH_HOST}, port=${LOGSTASH_PORT}, appName=${APP_NAME}`)
	console.log(
		'Загруженные категории логов:',
		Object.keys(loggerConfig.categories).filter((cat) => loggerConfig.categories[cat])
	)
	console.log(
		'Включенные DEBUG функции:',
		Object.keys(loggerConfig.debugFunctions).filter((fn) => loggerConfig.debugFunctions[fn])
	)
}

// Выводим информацию о настройках только если установлена переменная окружения
if (process.env.LOGGER_SHOW_CONFIG === 'true') {
	showLoggerConfig()
}

// Технический метод для получения текущего уровня логирования
export function getLogLevel(): string {
	return loggerConfig.logLevel
}
