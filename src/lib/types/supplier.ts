import { ObjectId } from 'mongodb'

// Типы для поставщиков без зависимостей от MongoDB

export interface SupplierType {
	id?: string
	// userId: string // TODO: будет удалено после миграции -- УДАЛЕНО
	clientId: string // Новое поле - ID клиента, теперь обязательное
	name: string
	key: string
	isValid: boolean
	createdAt: Date
	updatedAt: Date
	totalProducts?: number // Общее количество товаров поставщика
	addedAt: string | Date // Дата добавления
	lastChecked?: string | Date // Дата последней проверки ключа
	legacySupplierId?: number // Старый ID поставщика на WB, полученный из карточки товара
	legacySupplierName?: string // Название поставщика на WB, полученное из карточки товара
}

export type SupplierFormData = {
	name: string
	key: string
}

export type SupplierData = {
	id: string
	name: string
	key: string // Маскированный ключ
	isValid: boolean
	createdAt: Date | string
	info?: SupplierTokenInfo // Информация о токене (права доступа и т.д.)
	legacySupplierId?: number // Старый ID поставщика на WB
	legacySupplierName?: string // Название поставщика на WB
}

export type ApiDebugInfo = {
	url: string
	method: string
	headers: Record<string, string>
	payload?: unknown // Тело запроса, если есть
	responseData?: unknown // Тело ответа
	responseStatus?: number // HTTP статус ответа
	timing?: {
		start: number
		end: number
		duration: number
	}
	error?: string // Сообщение об ошибке, если запрос не удался
	summary?: string // Добавлено для краткой сводки по операции
}

export type SupplierTokenInfo = {
	hasContentAccess: boolean
	isReadOnly: boolean
	isSandbox: boolean
	accessCategories: string[]
	sid?: string
	expiresAt?: Date // дата истечения срока действия токена
}

export type ValidateApiKeyResult = {
	valid: boolean
	message: string
	error?: Record<string, unknown>
	supplierInfo?: SupplierTokenInfo
	debugInfo: ApiDebugInfo[]
}

// Типы для декодирования токена Wildberries
export interface WildberriesTokenInfo {
	id: string // Уникальный идентификатор токена
	sid: string // Уникальный идентификатор продавца на Wildberries
	s: number // Поле bitmask со свойствами токена
	exp: number // Время истечения токена в формате Unix timestamp
	t: boolean // Тестовый режим (sandbox)
	ent?: number
	iid?: number
	oid?: number
	uid?: number
}

export interface DecodedToken {
	isValid: boolean
	hasContentAccess: boolean
	isReadOnly: boolean
	isSandbox: boolean
	accessCategories: string[]
	error?: string
	decoded?: WildberriesTokenInfo
	expiresAt?: Date
}

export interface WBProductDimension {
	length: number
	width: number
	height: number
	// Добавим опциональные поля из примера, если они могут быть
	weightBrutto?: number
	isValid?: boolean
}

// Обновляем интерфейс для объекта фотографии
export interface WBProductPhoto {
	big: string
	c246x328: string
	c516x688: string
	hq: string
	square: string
	tm: string
}

export interface WBProductCard {
	nmID: number // Артикул WB
	imtID?: number // Артикул фото WB (из примера)
	nmUUID?: string // UUID товара (из примера)
	subjectID?: number // ID категории (из примера)
	subjectName?: string // Название категории (из примера)
	object: string // Категория товара (оставляем, т.к. использовалось, но subjectName может быть точнее)
	brand: string // Бренд
	vendorCode: string // Артикул продавца
	title: string // Наименование
	description?: string
	needKiz?: boolean // (из примера)
	photos?: WBProductPhoto[] // Используем новый интерфейс WBProductPhoto
	video?: string
	dimensions?: WBProductDimension // Включая опциональные поля
	characteristics?: Array<{ id: number; name: string; value: string | string[] | number }> // value может быть и числом
	sizes: Array<{
		chrtID?: number // (из примера)
		techSize: string // Размер поставщика (например, S, M, L, 42, 176/88A)
		wbSize: string // Размер WB (часто совпадает с techSize)
		skus: string[] // Список баркодов, соответствующих этому размеру
		// могут быть и другие поля, такие как остатки (stocks), но они приходят из другого эндпоинта
	}>
	tags?: Array<{ id: number; name: string; color?: string }> // (из примера)
	createdAt?: string // (из примера)
	updatedAt: string // Дата последнего обновления карточки (важно для пагинации)
	// ... и другие поля карточки товара, которые могут быть полезны
}

export interface WBProductListCursor {
	updatedAt?: string
	nmID?: number
	limit: number
}

export interface WBProductListFilter {
	textSearch?: string
	withPhoto: -1 | 0 | 1 // -1 все, 0 без фото, 1 с фото
	subjectID?: number[]
	brandNames?: string[]
	tagIDs?: number[]
}

export interface WBProductListSettings {
	cursor: WBProductListCursor
	filter: WBProductListFilter
	sort?: {
		ascending: boolean
	}
}

export interface WBProductListPayload {
	settings: WBProductListSettings
}

export interface WBProductListResponseData {
	cards: WBProductCard[]
	cursor: {
		updatedAt: string
		nmID: number
		total: number // Общее количество найденных карточек по фильтру
	}
	error?: boolean
	errorText?: string
	additionalErrors?: null | string | Array<unknown> // Поле может меняться
}

export interface GetProductsListResult {
	success: boolean
	data?: WBProductCard[]
	error?: string
	nextCursorUpdatedAt?: string // Курсор для следующей страницы
	nextCursorNmID?: number // Курсор для следующей страницы
	totalAvailable?: number // Общее количество товаров по фильтру от WB
}

// Новый тип для параметров getProductsList
export interface GetProductsListParams {
	textSearch?: string
	limit?: number
	cursorUpdatedAt?: string
	cursorNmID?: number
	sort?: {
		ascending: boolean
	}
}

// Типы для нового подхода с внутренним состоянием пагинации
export interface InitProductListParams {
	textSearch?: string
	pageSize?: number
}

export interface ProductPageResult {
	success: boolean
	data?: WBProductCard[]
	error?: string
	totalAvailable?: number // Общее количество товаров по фильтру от WB
	hasNextPage: boolean // Есть ли еще страницы для загрузки
	nextCursorUpdatedAt?: string // Курсор для следующего запроса, если hasNextPage = true
	nextCursorNmID?: number // Курсор для следующего запроса, если hasNextPage = true
}

// Старый тип GetProductsListResult оставляем на случай, если он где-то используется,
// но новый API будет использовать ProductPageResult.
// Можно будет его удалить позже, если он больше не нужен.
export interface GetProductsListResult {
	success: boolean
	data?: WBProductCard[]
	error?: string
	nextCursorUpdatedAt?: string // Курсор для следующей страницы
	nextCursorNmID?: number // Курсор для следующей страницы
	totalAvailable?: number // Общее количество товаров по фильтру от WB
}

// Удалены все типы, связанные с ценами/репрайсером

// Для информации о загрузке задачи (из /api/v2/buffer/tasks или /api/v2/history/tasks)
// ... existing code ...
