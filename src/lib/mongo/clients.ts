import type { ClientDocument, ClientMember, ClientMemberRole, ClientType } from '@/lib/types/client'
import { logger } from '@/utils/logger'
import { ObjectId } from 'mongodb'
import { getDb } from './client'
import { executeMongoOperation } from './utils'

const COLLECTION_NAME = 'clients'

/**
 * Получить коллекцию клиентов
 */
async function getClientsCollection() {
	const db = await getDb()
	return db.collection<ClientDocument>(COLLECTION_NAME)
}

/**
 * Создать индексы для коллекции клиентов
 */
export async function createClientIndexes() {
	try {
		const collection = await getClientsCollection()

		// Индекс по userId в members для быстрого поиска клиентов пользователя
		await collection.createIndex({ 'members.userId': 1 })

		// Индекс по имени клиента
		await collection.createIndex({ name: 1 })

		logger.database('Индексы для коллекции clients созданы')
	} catch (error) {
		logger.error('Ошибка создания индексов для clients:', { metadata: { error } })
		throw error
	}
}

/**
 * Преобразовать документ клиента в тип для приложения
 */
function documentToClient(doc: ClientDocument): ClientType {
	return {
		id: doc._id.toString(),
		name: doc.name,
		members: doc.members,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	}
}

/**
 * Создание нового клиента
 * @param name Имя клиента
 * @param adminUserId ID пользователя, который станет первым администратором
 * @returns Созданный клиент
 */
export async function createClient(name: string, adminUserId: string): Promise<ClientType> {
	return executeMongoOperation(async () => {
		const clientsCollection = await getClientsCollection()

		// Проверка на существующего клиента с таким же именем (опционально, если имя должно быть уникальным глобально)
		// const existingClientByName = await clientsCollection.findOne({ name })
		// if (existingClientByName) {
		// throw new Error(`Клиент с именем "${name}" уже существует.`)
		// }

		const newClient: Omit<ClientDocument, '_id'> = {
			name,
			members: [
				{
					userId: adminUserId,
					role: 'admin',
					invitedAt: new Date(),
				},
			],
			createdAt: new Date(),
			updatedAt: new Date(),
		}

		const result = await clientsCollection.insertOne(newClient as ClientDocument)
		if (!result.insertedId) {
			logger.error('Ошибка создания клиента:', { metadata: { error: 'Клиент не был вставлен в базу данных' } })
			throw new Error('Клиент не был вставлен в базу данных')
		}

		const insertedClient = await clientsCollection.findOne({ _id: result.insertedId })
		if (!insertedClient) {
			logger.error('Ошибка получения вставленного клиента:', {
				metadata: { error: 'Клиент не найден в базе данных после вставки' },
			})
			throw new Error('Клиент не найден в базе данных после вставки')
		}

		logger.database('Создан новый клиент', { metadata: { clientId: result.insertedId, name } })
		return documentToClient(insertedClient)
	}, `создании нового клиента с именем ${name} и администратором ${adminUserId}`)
}

/**
 * Получить клиента по ID
 */
export async function getClientById(clientId: string): Promise<ClientType | null> {
	try {
		const collection = await getClientsCollection()
		const doc = await collection.findOne({ _id: new ObjectId(clientId) })

		return doc ? documentToClient(doc) : null
	} catch (error) {
		logger.error('Ошибка получения клиента:', { metadata: { error } })
		throw error
	}
}

/**
 * Получить список клиентов пользователя
 */
export async function getClientsByUserId(userId: string): Promise<ClientType[]> {
	try {
		const collection = await getClientsCollection()
		const docs = await collection.find({ 'members.userId': userId }).toArray()

		return docs.map(documentToClient)
	} catch (error) {
		logger.error('Ошибка получения клиентов пользователя:', { metadata: { error } })
		throw error
	}
}

/**
 * Добавить пользователя в клиент
 */
export async function addMemberToClient(
	clientId: string,
	userId: string,
	role: ClientMemberRole = 'member'
): Promise<boolean> {
	try {
		const collection = await getClientsCollection()

		// Проверяем, что пользователь еще не является членом клиента
		const existingClient = await collection.findOne({
			_id: new ObjectId(clientId),
			'members.userId': userId,
		})

		if (existingClient) {
			logger.warn('Пользователь уже является членом клиента', { metadata: { clientId, userId } })
			return false
		}

		const result = await collection.updateOne(
			{ _id: new ObjectId(clientId) },
			{
				$push: {
					members: {
						userId,
						role,
						invitedAt: new Date(),
					} as ClientMember,
				},
				$set: { updatedAt: new Date() },
			}
		)

		if (result.modifiedCount > 0) {
			logger.database('Пользователь добавлен в клиент', { metadata: { clientId, userId, role } })
			return true
		}

		return false
	} catch (error) {
		logger.error('Ошибка добавления пользователя в клиент:', { metadata: { error } })
		throw error
	}
}

/**
 * Удалить пользователя из клиента
 */
export async function removeMemberFromClient(clientId: string, userId: string): Promise<boolean> {
	try {
		const collection = await getClientsCollection()

		// Проверяем, что это не последний админ
		const client = await collection.findOne({ _id: new ObjectId(clientId) })
		if (!client) return false

		const admins = client.members.filter((m: ClientMember) => m.role === 'admin')
		const isLastAdmin = admins.length === 1 && admins[0].userId === userId

		if (isLastAdmin) {
			logger.warn('Нельзя удалить последнего администратора клиента', { metadata: { clientId, userId } })
			return false
		}

		const result = await collection.updateOne(
			{ _id: new ObjectId(clientId) },
			{
				$pull: { members: { userId } },
				$set: { updatedAt: new Date() },
			}
		)

		if (result.modifiedCount > 0) {
			logger.database('Пользователь удален из клиента', { metadata: { clientId, userId } })
			return true
		}

		return false
	} catch (error) {
		logger.error('Ошибка удаления пользователя из клиента:', { metadata: { error } })
		throw error
	}
}

/**
 * Обновить роль пользователя в клиенте
 */
export async function updateMemberRole(clientId: string, userId: string, newRole: ClientMemberRole): Promise<boolean> {
	try {
		const collection = await getClientsCollection()

		// Если меняем роль с admin на member, проверяем что это не последний админ
		if (newRole === 'member') {
			const client = await collection.findOne({ _id: new ObjectId(clientId) })
			if (!client) return false

			const admins = client.members.filter((m: ClientMember) => m.role === 'admin')
			const isLastAdmin = admins.length === 1 && admins[0].userId === userId

			if (isLastAdmin) {
				logger.warn('Нельзя понизить роль последнего администратора', { metadata: { clientId, userId } })
				return false
			}
		}

		const result = await collection.updateOne(
			{
				_id: new ObjectId(clientId),
				'members.userId': userId,
			},
			{
				$set: {
					'members.$.role': newRole,
					updatedAt: new Date(),
				},
			}
		)

		if (result.modifiedCount > 0) {
			logger.database('Роль пользователя обновлена', { metadata: { clientId, userId, newRole } })
			return true
		}

		return false
	} catch (error) {
		logger.error('Ошибка обновления роли пользователя:', { metadata: { error } })
		throw error
	}
}

/**
 * Обновить имя клиента
 * @param clientId ID клиента
 * @param newName Новое имя клиента
 * @returns true, если имя было обновлено, иначе false
 */
export async function updateClientNameMongo(clientId: string, newName: string): Promise<boolean> {
	try {
		const collection = await getClientsCollection()
		const result = await collection.updateOne(
			{ _id: new ObjectId(clientId) },
			{
				$set: {
					name: newName,
					updatedAt: new Date(),
				},
			}
		)

		if (result.modifiedCount > 0) {
			logger.database('Имя клиента обновлено', { metadata: { clientId, newName } })
			return true
		}
		// Если modifiedCount === 0, это может означать, что клиент не найден или имя уже такое же.
		// Для простоты считаем это не успешным обновлением, если ничего не изменилось.
		logger.warn('Имя клиента не было обновлено (клиент не найден или имя не изменилось)', {
			metadata: { clientId, newName },
		})
		return false
	} catch (error) {
		logger.error('Ошибка обновления имени клиента:', { metadata: { clientId, newName, error } })
		throw error // Пробрасываем ошибку, чтобы server action мог ее поймать
	}
}

/**
 * Получить роль пользователя в клиенте
 */
export async function getMemberRole(clientId: string, userId: string): Promise<ClientMemberRole | null> {
	try {
		const collection = await getClientsCollection()
		const client = await collection.findOne({
			_id: new ObjectId(clientId),
			'members.userId': userId,
		})

		if (!client) return null

		const member = client.members.find((m: ClientMember) => m.userId === userId)
		return member ? member.role : null
	} catch (error) {
		logger.error('Ошибка получения роли пользователя:', { metadata: { error } })
		throw error
	}
}

/**
 * Получить всех клиентов (для админки).
 * @returns Promise<ClientType[]> Массив всех клиентов.
 */
export async function getAllClientsAdmin(): Promise<ClientType[]> {
	try {
		const collection = await getClientsCollection()
		const docs = await collection.find({}).toArray()
		return docs.map(documentToClient)
	} catch (error) {
		logger.error('Ошибка получения всех клиентов для админки:', { metadata: { error } })
		throw error
	}
}
