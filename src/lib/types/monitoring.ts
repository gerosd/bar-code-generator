/**
 * Определяет структуру документа в коллекции `monitoring`.
 * Используется для хранения списка nmId, подлежащих мониторингу.
 */
export interface MonitoringDocument {
	/**
	 * Артикул Wildberries (nmId), используется как первичный ключ.
	 */
	_id: number
}
