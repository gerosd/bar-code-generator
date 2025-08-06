'use server'

import { authOptions } from '@/lib/auth'
import {
	addMemberToClient,
	createClient as createClientDb,
	getClientById,
	getClientsByUserId,
	removeMemberFromClient,
	updateClientNameMongo,
	updateMemberRole,
} from '@/lib/mongo/clients'
import type { ClientMemberRole } from '@/lib/types/client'
import { logger } from '@/utils/logger'
import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { getCurrentClientId } from './utils'

/**
 * Создает нового клиента
 * @param name Название клиента
 * @returns ID созданного клиента
 */
export const createClient = async (name: string) => {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user?.id) {
			throw new Error('Пользователь не авторизован')
		}

		const client = await createClientDb(name, session.user.id)

		logger.info('Создан новый клиент', { metadata: { clientId: client.id, name, userId: session.user.id } })

		// Устанавливаем новый клиент как текущий
		const cookieStore = await cookies()
		cookieStore.set('currentClientId', client.id, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/',
		})

		revalidatePath('/')
		return { success: true, clientId: client.id }
	} catch (error) {
		logger.error('Ошибка при создании клиента', { metadata: { error } })
		return { success: false, error: error instanceof Error ? error.message : 'Неизвестная ошибка' }
	}
}

/**
 * Приглашает пользователя в клиента
 * @param clientId ID клиента
 * @param userId ID пользователя
 * @param role Роль пользователя
 * @returns Результат операции
 */
export const inviteUser = async (clientId: string, userId: string, role: ClientMemberRole = 'member') => {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user?.id) {
			throw new Error('Пользователь не авторизован')
		}

		// Проверяем, что текущий пользователь - админ клиента
		const client = await getClientById(clientId)
		if (!client) {
			throw new Error('Клиент не найден')
		}

		const currentUserMember = client.members.find((m) => m.userId === session.user.id)
		if (!currentUserMember || currentUserMember.role !== 'admin') {
			throw new Error('Недостаточно прав для приглашения пользователей')
		}

		await addMemberToClient(clientId, userId, role)

		logger.info('Пользователь приглашен в клиент', {
			metadata: { clientId, invitedUserId: userId, role, invitedBy: session.user.id },
		})

		revalidatePath('/')
		return { success: true }
	} catch (error) {
		logger.error('Ошибка при приглашении пользователя', { metadata: { error } })
		return { success: false, error: error instanceof Error ? error.message : 'Неизвестная ошибка' }
	}
}

/**
 * Удаляет пользователя из клиента
 * @param clientId ID клиента
 * @param userId ID пользователя для удаления
 * @returns Результат операции
 */
export const removeUser = async (clientId: string, userId: string) => {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user?.id) {
			throw new Error('Пользователь не авторизован')
		}

		// Проверяем, что текущий пользователь - админ клиента
		const client = await getClientById(clientId)
		if (!client) {
			throw new Error('Клиент не найден')
		}

		const currentUserMember = client.members.find((m) => m.userId === session.user.id)
		if (!currentUserMember || currentUserMember.role !== 'admin') {
			throw new Error('Недостаточно прав для удаления пользователей')
		}

		// Нельзя удалить последнего админа
		const admins = client.members.filter((m) => m.role === 'admin')
		const userToRemove = client.members.find((m) => m.userId === userId)
		if (admins.length === 1 && userToRemove?.role === 'admin') {
			throw new Error('Нельзя удалить последнего администратора')
		}

		await removeMemberFromClient(clientId, userId)

		logger.info('Пользователь удален из клиента', {
			metadata: { clientId, removedUserId: userId, removedBy: session.user.id },
		})

		revalidatePath('/')
		return { success: true }
	} catch (error) {
		logger.error('Ошибка при удалении пользователя', { metadata: { error } })
		return { success: false, error: error instanceof Error ? error.message : 'Неизвестная ошибка' }
	}
}

/**
 * Получает список клиентов для текущего пользователя
 * @returns Список клиентов
 */
export const listClientsForUser = async () => {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user?.id) {
			logger.warn('listClientsForUser: Пользователь не авторизован')
			return { success: false, clients: [], error: 'Пользователь не авторизован' }
		}

		const clients = await getClientsByUserId(session.user.id)
		return { success: true, clients }
	} catch (error) {
		logger.error('Ошибка при получении списка клиентов', { metadata: { error } })
		return { success: false, clients: [], error: error instanceof Error ? error.message : 'Неизвестная ошибка' }
	}
}

/**
 * Переключает текущего клиента
 * @param clientId ID клиента
 * @returns Результат операции
 */
export const switchClient = async (clientId: string) => {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user?.id) {
			logger.warn('switchClient: Пользователь не авторизован')
			return { success: false, error: 'Пользователь не авторизован' }
		}

		// Проверяем, что пользователь имеет доступ к клиенту
		const userClients = await getClientsByUserId(session.user.id)
		const hasAccess = userClients.some((c) => c.id === clientId)

		if (!hasAccess) {
			logger.warn('switchClient: Попытка переключиться на недоступного клиента', {
				metadata: { userId: session.user.id, targetClientId: clientId },
			})
			return { success: false, error: 'У вас нет доступа к этому клиенту' }
		}

		const cookieStore = await cookies()
		cookieStore.set('currentClientId', clientId, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/',
		})

		logger.info('Пользователь переключил клиента (cookie установлен)', {
			metadata: { userId: session.user.id, newClientId: clientId },
		})

		revalidatePath('/')
		return { success: true }
	} catch (error) {
		logger.error('Ошибка при переключении клиента', { metadata: { error } })
		return { success: false, error: error instanceof Error ? error.message : 'Неизвестная ошибка' }
	}
}

/**
 * Обновляет роль пользователя в клиенте
 * @param clientId ID клиента
 * @param userId ID пользователя
 * @param newRole Новая роль
 * @returns Результат операции
 */
export const updateUserRole = async (clientId: string, userId: string, newRole: ClientMemberRole) => {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user?.id) {
			throw new Error('Пользователь не авторизован')
		}

		// Проверяем, что текущий пользователь - админ клиента
		const client = await getClientById(clientId)
		if (!client) {
			throw new Error('Клиент не найден')
		}

		const currentUserMember = client.members.find((m) => m.userId === session.user.id)
		if (!currentUserMember || currentUserMember.role !== 'admin') {
			throw new Error('Недостаточно прав для изменения ролей')
		}

		// Нельзя понизить последнего админа
		const admins = client.members.filter((m) => m.role === 'admin')
		const userToUpdate = client.members.find((m) => m.userId === userId)
		if (admins.length === 1 && userToUpdate?.role === 'admin' && newRole !== 'admin') {
			throw new Error('Нельзя понизить последнего администратора')
		}

		await updateMemberRole(clientId, userId, newRole)

		logger.info('Роль пользователя обновлена', {
			metadata: { clientId, userId, newRole, updatedBy: session.user.id },
		})

		revalidatePath('/')
		return { success: true }
	} catch (error) {
		logger.error('Ошибка при обновлении роли', { metadata: { error } })
		return { success: false, error: error instanceof Error ? error.message : 'Неизвестная ошибка' }
	}
}

/**
 * Обновляет имя клиента.
 * Только администратор клиента может выполнить это действие.
 * @param clientId ID клиента
 * @param newName Новое имя клиента
 * @returns Результат операции
 */
export const updateClientName = async (clientId: string, newName: string) => {
	if (!newName || newName.trim().length < 3) {
		return { success: false, error: 'Имя клиента должно содержать минимум 3 символа.' }
	}
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user?.id) {
			return { success: false, error: 'Пользователь не авторизован' }
		}

		// Проверка, что пользователь является администратором данного клиента
		const client = await getClientById(clientId)
		if (!client) {
			return { success: false, error: 'Клиент не найден' }
		}

		const member = client.members.find((m) => m.userId === session.user.id)
		if (!member || member.role !== 'admin') {
			return { success: false, error: 'Только администратор может изменять имя клиента' }
		}

		const updateSuccess = await updateClientNameMongo(clientId, newName.trim())

		if (updateSuccess) {
			logger.info('Server action: Имя клиента обновлено', {
				metadata: { clientId, newName, userId: session.user.id },
			})
			revalidatePath('/')
			return { success: true, message: 'Имя клиента успешно обновлено.' }
		} else {
			return {
				success: false,
				error: 'Не удалось обновить имя клиента (возможно, имя не изменилось или клиент не найден).',
			}
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка при обновлении имени клиента'
		logger.error('Server action: Ошибка обновления имени клиента', {
			metadata: { clientId, newName, error: errorMessage },
		})
		return { success: false, error: errorMessage }
	}
}

/**
 * Получает текущий клиент для пользователя
 * @returns Текущий клиент или null
 */
export const getCurrentClient = async () => {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user?.id) {
			logger.warn('getCurrentClient: Пользователь не авторизован')
			return { success: false, client: null, error: 'Пользователь не авторизован' }
		}

		const clientId = await getCurrentClientId()
		if (!clientId) {
			logger.warn('getCurrentClient: ID текущего клиента не найден в cookie или сессии')
			// Попробуем найти первого доступного клиента для пользователя
			const userClients = await getClientsByUserId(session.user.id)
			if (userClients.length > 0) {
				const firstClient = userClients[0]
				// Устанавливаем этого клиента как текущего в cookie
				const cookieStore = await cookies()
				cookieStore.set('currentClientId', firstClient.id, {
					httpOnly: true,
					secure: process.env.NODE_ENV === 'production',
					sameSite: 'lax',
					path: '/',
				})
				logger.info(
					'getCurrentClient: Установлен первый доступный клиент как текущий, так как ID не был найден',
					{ metadata: { userId: session.user.id, newClientId: firstClient.id } }
				)
				// Возвращаем первого клиента
				const clientDetails = await getClientById(firstClient.id) // Получаем полные данные клиента
				if (!clientDetails) {
					logger.error('getCurrentClient: Не удалось получить данные первого доступного клиента', {
						metadata: { clientId: firstClient.id },
					})
					return { success: false, client: null, error: 'Не удалось загрузить данные клиента' }
				}
				return { success: true, client: clientDetails }
			} else {
				logger.warn('getCurrentClient: У пользователя нет доступных клиентов', {
					metadata: { userId: session.user.id },
				})
				return { success: false, client: null, error: 'Нет доступных клиентов' }
			}
		}

		const client = await getClientById(clientId)
		if (client && client.members.some((m) => m.userId === session.user.id)) {
			return { success: true, client }
		}
		return null
	} catch (error) {
		logger.error('Ошибка в getCurrentClient', { metadata: { error } })
		return { success: false, client: null, error: error instanceof Error ? error.message : 'Неизвестная ошибка' }
	}
}

/**
 * Получает данные для селектора клиентов: список доступных клиентов и текущего выбранного.
 * Также определяет, нужно ли установить cookie для currentClientId (например, при первом входе).
 */
export const getClientSelectorData = async () => {
	// logger.info('getClientSelectorData V2: Начало выполнения')
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user?.id) {
			// logger.warn('getClientSelectorData V2: Сессия или ID пользователя отсутствуют')
			return { success: false, availableClients: [], selectedClient: null, error: 'Сессия не найдена' }
		}

		// logger.info('getClientSelectorData V2: Пользователь аутентифицирован', {
		// 	metadata: { userId: session.user.id },
		// })

		const availableClients = await getClientsByUserId(session.user.id)
		// logger.info('getClientSelectorData V2: Клиенты пользователя получены', {
		// 	metadata: { count: availableClients.length },
		// })

		if (availableClients.length === 0) {
			// logger.warn('getClientSelectorData V2: У пользователя нет доступных клиентов.')
			return { success: true, availableClients: [], selectedClient: null }
		}

		const cookieStore = await cookies()
		let clientIdFromCookie = cookieStore.get('currentClientId')?.value
		// logger.info('getClientSelectorData V2: Cookie currentClientId получен', { metadata: { clientIdFromCookie } })

		let selectedClient = null
		let shouldSetCookie = false
		let clientIdToSetInCookie: string | null = null

		if (clientIdFromCookie) {
			selectedClient = availableClients.find((c) => c.id === clientIdFromCookie) ?? null
			if (selectedClient) {
				// logger.info('getClientSelectorData V2: Клиент найден по cookie', {
				// 	metadata: { clientId: selectedClient.id },
				// })
			} else {
				// logger.warn(
				// 	'getClientSelectorData V2: ID клиента из cookie невалиден (не найден среди доступных). Выбираем первого.',
				// 	{ metadata: { invalidCookieId: clientIdFromCookie } }
				// )
				clientIdFromCookie = undefined
			}
		}

		if (!selectedClient && availableClients.length > 0) {
			selectedClient = availableClients[0]
			clientIdToSetInCookie = selectedClient.id
			shouldSetCookie = true
			// logger.info(
			// 	'getClientSelectorData V2: Клиент по умолчанию (первый) выбран. Cookie будет рекомендован к установке.',
			// 	{ metadata: { selectedClientId: selectedClient.id } }
			// )
		}

		// logger.info('getClientSelectorData V2: Данные для селектора успешно подготовлены', {
		// 	metadata: {
		// 		numAvailableClients: availableClients.length,
		// 		selectedClientId: selectedClient?.id,
		// 		shouldSetCookie,
		// 		clientIdToSetInCookie,
		// 	},
		// })

		return {
			success: true,
			availableClients,
			selectedClient,
			clientIdToSetInCookie: shouldSetCookie ? clientIdToSetInCookie : null,
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
		// logger.error('getClientSelectorData V2: Ошибка при получении данных', {
		// 	metadata: { error: errorMessage, detail: error },
		// })
		return { success: false, availableClients: [], selectedClient: null, error: errorMessage }
	}
}

/**
 * Проверяет, является ли текущий пользователь администратором текущего клиента.
 * @returns Promise<boolean>
 */
export const isCurrentUserClientAdminAction = async (): Promise<boolean> => {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user?.id) {
			// logger.debug('[isCurrentUserClientAdminAction] Пользователь не авторизован')
			return false
		}

		const clientId = await getCurrentClientId()
		if (!clientId) {
			// logger.debug('[isCurrentUserClientAdminAction] Не удалось определить ID текущего клиента.')
			return false
		}

		const client = await getClientById(clientId)
		if (!client) {
			// logger.debug('[isCurrentUserClientAdminAction] Клиент не найден по ID:', { metadata: { clientId } })
			return false
		}

		const member = client.members.find((m) => m.userId === session.user.id)
		if (!member || member.role !== 'admin') {
			// logger.debug('[isCurrentUserClientAdminAction] Пользователь не является администратором клиента.', {
			// 	metadata: { userId: session.user.id, clientId, userRole: member?.role },
			// })
			return false
		}

		// logger.debug('[isCurrentUserClientAdminAction] Пользователь является администратором клиента.', {
		// 	metadata: { userId: session.user.id, clientId },
		// })
		return true
	} catch (error) {
		logger.error('[isCurrentUserClientAdminAction] Ошибка при проверке прав администратора клиента', {
			metadata: { error },
		})
		return false
	}
}
