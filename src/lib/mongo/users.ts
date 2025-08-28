import {Collection, Filter} from 'mongodb'
import {MongoDocument} from '../types/mongodb'
import {UserType} from '../types/user'
import {getCollection} from './client'
import {executeMongoOperation} from './utils'

// Определяем тип User для MongoDB
export interface User extends MongoDocument<UserType> {
    _id: string
}

// Имя коллекции пользователей
const USERS_COLLECTION = 'users'

/**
 * Получить типизированную коллекцию пользователей
 */
const getUsersCollection = async (): Promise<Collection<User>> => {
    const collection = await getCollection(USERS_COLLECTION)
    return collection as unknown as Collection<User>
}

/**
 * Получить пользователя по ID
 * @param id ID пользователя (из Telegram)
 * @returns Объект пользователя или null, если пользователь не найден
 */
export const getUserById = async (id: string): Promise<User | null> => {
    try {
        return await executeMongoOperation(async () => {
            const collection = await getUsersCollection()
            return collection.findOne({_id: id})
        }, `получении пользователя по ID: ${id}`)
    } catch (error) {
        return null
    }
}

/**
 * Найти пользователя по email среди разных полей (id/email/authMethods.email)
 */
export const findUserByAnyEmail = async (email: string): Promise<User | null> => {
    try {
        return await executeMongoOperation(async () => {
            const collection = await getUsersCollection()
            return collection.findOne({
                $or: [
                    { _id: email },
                    { email },
                    { authMethods: { $elemMatch: { provider: 'credentials', email } } },
                ],
            } as unknown as Filter<User>)
        }, `поиске пользователя по email: ${email}`)
    } catch (error) {
        return null
    }
}

/**
 * Создать или обновить пользователя
 * @param userData Данные пользователя
 * @returns Результат операции
 */
export const upsertUser = async (userData: Partial<User> & { _id: string }): Promise<User | null> => {
    try {
        return await executeMongoOperation(async () => {
            const collection = await getUsersCollection()
            const now = new Date()

            const userUpdateData: Partial<User> = {
                ...userData,
                updatedAt: now,
            }

            const existingUser = await collection.findOne({_id: userData._id})
            if (!existingUser) {
                userUpdateData.createdAt = now
            }

            const result = await collection.updateOne({_id: userData._id}, {$set: userUpdateData}, {upsert: true})

            if (result.upsertedId || result.matchedCount > 0 || result.modifiedCount > 0) {
                const updatedUser = await collection.findOne({_id: userData._id})
                if (!updatedUser) {
                    throw new Error('Не удалось получить пользователя после операции upsert.')
                }
                return updatedUser
            }
            throw new Error('Операция upsert не привела к изменениям или созданию пользователя.')
        }, `создании/обновлении пользователя: ${userData._id}`)
    } catch (error) {
        console.error('Ошибка при создании/обновлении пользователя:', error)
        return null
    }
}