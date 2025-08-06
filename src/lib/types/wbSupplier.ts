import type { ObjectId } from 'mongodb'

/**
 * Описывает документ поставщика с Wildberries, как он хранится в нашей базе данных.
 */
export interface WbSupplierDocument {
	_id: ObjectId
	/**
	 * Числовой ID поставщика из системы Wildberries.
	 * Это основной идентификатор для связи.
	 */
	legacySupplierId: number
	/**
	 * Название поставщика, полученное с сайта Wildberries.
	 */
	name: string
	/**
	 * Новое поле для будущего текстового идентификатора.
	 * Пока не используется.
	 */
	newSupplierId?: string
	/**
	 * Дата создания записи.
	 */
	createdAt: Date
	/**
	 * Дата последнего обновления записи.
	 */
	updatedAt: Date
}

/**
 * Безопасный для передачи на клиент тип документа поставщика WB.
 * Поле `_id` заменено на `id: string`.
 */
export type WbSupplierSafeData = Omit<WbSupplierDocument, '_id'> & { id: string }
