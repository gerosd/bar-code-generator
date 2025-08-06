import {Collection, Filter} from 'mongodb'
import {MongoDocument} from '../types/mongodb'
import {UserFilter, UserRole, UserType} from '../types/user'
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
                userUpdateData.roles = [UserRole.USER]
                userUpdateData.settings = {priceAdjustmentMode: 'price', priceTolerance: 0}
            } else {
                if (userData.settings) {
                    userUpdateData.settings = {...existingUser.settings, ...userData.settings}
                }
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

/**
 * Получить список всех пользователей
 * @param options Опции для фильтрации и сортировки
 * @returns Массив пользователей
 */
export const getAllUsers = async (options: UserFilter = {}): Promise<User[]> => {
    try {
        return await executeMongoOperation(async () => {
            const collection = await getUsersCollection()
            const filter: Filter<User> = {}
            if (options.role) {
                filter.roles = {$in: [options.role]} as unknown as User['roles']
            }

            const sort: Record<string, 1 | -1> = {}
            if (options.sortBy) {
                sort[options.sortBy] = options.sortOrder === 'desc' ? -1 : 1
            } else {
                sort.createdAt = -1
            }

            return collection
                .find(filter)
                .sort(sort)
                .skip(options.skip || 0)
                .limit(options.limit || 100)
                .toArray()
        }, 'получении списка всех пользователей')
    } catch (error) {
        return []
    }
}

/**
 * Проверить, имеет ли пользователь указанную роль
 * @param userId ID пользователя
 * @param role Роль для проверки
 * @returns true, если пользователь имеет указанную роль
 */
export const hasRole = async (userId: string, role: UserRole): Promise<boolean> => {
    const user = await getUserById(userId)
    if (!user) return false
    return user.roles.includes(role)
}

/**
 * Добавить роль пользователю
 * @param userId ID пользователя
 * @param role Роль для добавления
 * @returns Обновленный объект пользователя
 */
export const addRole = async (userId: string, role: UserRole): Promise<User | null> => {
    try {
        return await executeMongoOperation(async () => {
            const collection = await getUsersCollection()
            const user = await collection.findOne({_id: userId})

            if (!user) {
                throw new Error(`Пользователь с ID ${userId} не найден для добавления роли.`)
            }

            if (user.roles.includes(role)) {
                return user
            }

            const updateResult = await collection.updateOne(
                {_id: userId},
                {$push: {roles: role}, $set: {updatedAt: new Date()}}
            )

            if (updateResult.modifiedCount === 0) {
                console.warn(`Роль ${role} не была добавлена пользователю ${userId} или документ не был изменен.`)
            }

            const updatedUser = await collection.findOne({_id: userId})
            if (!updatedUser) {
                throw new Error(`Не удалось получить пользователя ${userId} после попытки добавить роль.`)
            }
            return updatedUser
        }, `добавлении роли ${role} пользователю: ${userId}`)
    } catch (error) {
        return null
    }
}

/**
 * Удалить роль у пользователя
 * @param userId ID пользователя
 * @param role Роль для удаления
 * @returns Обновленный объект пользователя
 */
export const removeRole = async (userId: string, role: UserRole): Promise<User | null> => {
    try {
        return await executeMongoOperation(async () => {
            const collection = await getUsersCollection()
            const user = await collection.findOne({_id: userId})

            if (!user) {
                throw new Error(`Пользователь с ID ${userId} не найден для удаления роли.`)
            }

            if (!user.roles.includes(role)) {
                return user
            }

            await collection.updateOne({_id: userId}, {$pull: {roles: role}, $set: {updatedAt: new Date()}})

            const updatedUser = await collection.findOne({_id: userId})
            if (!updatedUser) {
                throw new Error(`Не удалось получить пользователя ${userId} после попытки удалить роль.`)
            }
            return updatedUser
        }, `удалении роли ${role} у пользователя: ${userId}`)
    } catch (error) {
        return null
    }
}

/**
 * Установить роли пользователя
 * @param userId ID пользователя
 * @param roles Массив ролей
 * @returns Обновленный объект пользователя
 */
export const setRoles = async (userId: string, roles: UserRole[]): Promise<User | null> => {
    try {
        return await executeMongoOperation(async () => {
            const collection = await getUsersCollection()
            await collection.updateOne({_id: userId}, {$set: {roles, updatedAt: new Date()}})
            const updatedUser = await collection.findOne({_id: userId})
            if (!updatedUser) {
                throw new Error(`Не удалось получить пользователя ${userId} после установки ролей.`)
            }
            return updatedUser
        }, `установке ролей для пользователя: ${userId}`)
    } catch (error) {
        return null
    }
}
