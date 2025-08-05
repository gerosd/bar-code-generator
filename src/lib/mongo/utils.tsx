import { ObjectId } from 'mongodb'

/**
 * Утилита для выполнения операций MongoDB с централизованной обработкой ошибок.
 * @param operation Асинхронная функция, выполняющая операцию с MongoDB.
 * @param errorMessageContext Контекстное сообщение для логирования ошибки (например, "создании пользователя").
 * @returns Результат выполнения операции или значение по умолчанию в случае ошибки.
 */
export async function executeMongoOperation<T>(operation: () => Promise<T>, errorMessageContext: string): Promise<T> {
    try {
        return await operation();
    } catch (error: unknown) {
        // Логируем более подробную информацию об ошибке
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Ошибка при ${errorMessageContext}: ${message}`, error);
        throw error;
    }
}

/**
 * Преобразует документ MongoDB, заменяя поле _id (ObjectId или string) на id (string).
 * @param doc Документ с полем _id.
 * @returns Новый объект с полем id вместо _id.
 */
export function mapMongoId<T extends { _id?: ObjectId | string }>(doc: T): Omit<T, '_id'> & { id: string } {
    const { _id, ...rest } = doc
    const id = typeof _id === 'string' ? _id : _id?.toHexString() || ''
    return { ...rest, id }
}

/**
 * Преобразует массив документов MongoDB, заменяя в каждом поле _id на id.
 * @param docs Массив документов с полем _id.
 * @returns Новый массив объектов с полем id вместо _id.
 */
export function mapMongoIds<T extends { _id?: ObjectId | string }>(docs: T[]): (Omit<T, '_id'> & { id: string })[] {
    return docs.map(mapMongoId)
}

/**
 * Рекурсивно обходит объект или массив и преобразует все экземпляры ObjectId в их строковые представления.
 * Также переименовывает корневое поле `_id` в `id`.
 * @param data - Входные данные (объект или массив).
 * @returns Глубоко преобразованные данные.
 */
export function deepMapMongoId(data: unknown): unknown {
    if (Array.isArray(data)) {
        return data.map((item) => deepMapMongoId(item))
    }

    if (data instanceof ObjectId) {
        return data.toHexString()
    }

    // Даты нужно возвращать как есть, чтобы они корректно сериализовались в ISO-строки
    if (data instanceof Date) {
        return data
    }

    if (data !== null && typeof data === 'object') {
        const result: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(data)) {
            const newKey = key === '_id' ? 'id' : key
            result[newKey] = deepMapMongoId(value)
        }
        return result
    }

    return data
}
