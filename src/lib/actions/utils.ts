'use server'

import { WildberriesAPI } from '@/lib/api/wildberries'
import { authOptions } from '@/lib/auth'
import { logger } from '@/utils/logger'
import { getServerSession } from 'next-auth'
import { cookies } from 'next/headers'

/**
 * Получает ID пользователя из сессии или выбрасывает ошибку, если сессия недоступна
 * @returns ID пользователя
 */
export const getUserIdFromSession = async (): Promise<string> => {
	const session = await getServerSession(authOptions)
	if (!session?.user?.id) {
		throw new Error('Пользователь не авторизован или ID пользователя отсутствует в сессии.')
	}
	return session.user.id
}

// Функция getCurrentClientId удалена - теперь используем напрямую getUserIdFromSession

/**
 * Получает ID текущего авторизованного пользователя из сессии.
 * @returns ID пользователя или undefined, если пользователь не авторизован.
 */
export const getCurrentUserId = async (): Promise<string | undefined> => {
	const session = await getServerSession(authOptions)
	return session?.user?.id
}

/**
 * Проверяет, авторизован ли пользователь, и возвращает его ID или null
 * @returns ID пользователя или null
 */
export const getUserIdOrNull = async (): Promise<string | null> => {
	const session = await getServerSession(authOptions)
	return session?.user?.id || null
}

/**
 * Маскирует API-ключ для безопасного отображения
 * @param token API-ключ
 * @returns Замаскированный API-ключ
 */
// Внутренняя функция-помощник (не экспортируется напрямую)
const _maskToken = (token: string): string => {
	if (!token) return ''
	if (token.length <= 10) return `${token.slice(0, 4)}***`

	return `${token.slice(0, 5)}***${token.slice(-5)}`
}

/**
 * Маскирует API-ключ для безопасного отображения (серверное действие)
 * @param token API-ключ
 * @returns Замаскированный API-ключ
 */
export const maskToken = async (token: string): Promise<string> => {
	return _maskToken(token)
}

/**
 * Получает информацию о товарах Wildberries по nmIds
 * @param nmIds Массив nmIds
 * @returns Результат запроса с данными о ценах и остатках
 */
// Удалено: логика получения цен/остатков с WB

/**
 * Проверяет валидность API-ключа Wildberries
 * @param key API-ключ
 * @returns Результат валидации
 */
export const validateWildberriesApiKey = async (key: string) => {
	const api = new WildberriesAPI(key)

	try {
		const validationResult = await api.validateApiKey()

		return {
			valid: validationResult.valid,
			message: validationResult.valid ? 'API-ключ валиден' : 'API-ключ не прошел валидацию',
			supplierInfo: validationResult.supplierInfo,
			debugInfo: api.getDebugInfo(),
		}
	} catch (error) {
		console.error('Ошибка при валидации ключа:', error)
		return {
			valid: false,
			message: error instanceof Error ? error.message : 'Произошла неизвестная ошибка',
			error: error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) },
			debugInfo: api.getDebugInfo(),
		}
	}
}