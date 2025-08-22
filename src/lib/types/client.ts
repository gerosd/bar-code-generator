import type { ObjectId } from 'mongodb'

/**
 * Доступные шаблоны для печати
 */
export type PrintTemplate = 'template1' | 'template2' | 'template3'

/**
 * Роли пользователя внутри клиента
 */
export type ClientMemberRole = 'admin' | 'member'

/**
 * Член клиента (embedded в документе клиента)
 */
export interface ClientMember {
	userId: string
	role: ClientMemberRole
	invitedAt: Date
}

/**
 * Документ клиента в MongoDB
 */
export interface ClientDocument {
	_id: ObjectId
	name: string
	members: ClientMember[]
	selectedPrintTemplate?: PrintTemplate
	createdAt: Date
	updatedAt: Date
}

/**
 * Тип клиента для использования в приложении
 */
export interface ClientType {
	id: string
	name: string
	members: ClientMember[]
	selectedPrintTemplate?: PrintTemplate
	createdAt: Date
	updatedAt: Date
}

/**
 * Данные для создания клиента
 */
export interface CreateClientData {
	name: string
}

/**
 * Данные для приглашения пользователя
 */
export interface InviteUserData {
	clientId: string
	userId: string
	role: ClientMemberRole
}
