import { ObjectId } from 'mongodb'
import { DynamicWBDataDocument } from '../types/dynamicWBData'

// Базовые перечисления (enum)

/**
 * Базовый операционный режим правила репрайсера.
 * - KEEP_PRICE: Поддержание указанной базовой цены.
 * - COMPETITOR: Ориентация на цену конкурента.
 */
export enum RepricerRuleBaseOperatingMode {
	KEEP_PRICE = 'KEEP_PRICE',
	COMPETITOR = 'COMPETITOR',
}

/**
 * Поведение корректировки цены для опции "Режим расписания".
 * - APPLY_IN_RANGE: Корректировка применяется ВНУТРИ указанного временного диапазона.
 * - APPLY_OUTSIDE_RANGE: Корректировка применяется ВНЕ указанного временного диапазона.
 */
export enum ScheduleOptionAdjustmentBehavior {
	APPLY_IN_RANGE = 'APPLY_IN_RANGE',
	APPLY_OUTSIDE_RANGE = 'APPLY_OUTSIDE_RANGE',
}

/**
 * Оператор сравнения для условия в опции "Реакция на остатки".
 * - GREATER_OR_EQUAL: Больше или равно (>=).
 * - LESS_OR_EQUAL: Меньше или равно (<=).
 */
export enum StockReactionConditionOperator {
	GREATER_OR_EQUAL = 'GREATER_OR_EQUAL',
	LESS_OR_EQUAL = 'LESS_OR_EQUAL',
}

/**
 * Статус задачи на исполнение для репрайсера.
 * - PENDING: Ожидает выполнения.
 * - PROCESSING: В процессе выполнения.
 * - SUCCESS: Успешно выполнена.
 * - ERROR: Ошибка при выполнении.
 * - CANCELLED: Отменена.
 */
export enum ExecutionTaskStatus {
	PENDING = 'PENDING',
	PROCESSING = 'PROCESSING',
	SUCCESS = 'SUCCESS',
	ERROR = 'ERROR',
	CANCELLED = 'CANCELLED',
}

/**
 * Возможные "источники" или "причины" расчета цены.
 * Используется в state-driven логике для определения, изменилась ли стратегия.
 */
export enum PriceCalculationSource {
	BASE_PRICE = 'BASE_PRICE',
	COMPETITOR = 'COMPETITOR',
	SCHEDULE = 'SCHEDULE',
	STOCK_REACTION = 'STOCK_REACTION',
}

/**
 * Представляет собой объект состояния цены, который хранится в правиле.
 */
export interface RepricerPriceState {
	/**
	 * Последняя целевая цена, которую система приказала установить.
	 */
	targetPrice: number
	/**
	 * Источник (флаг), объясняющий, почему была установлена эта цена.
	 */
	calculationSource: PriceCalculationSource
	/**
	 * Время последнего обновления состояния.
	 */
	updatedAt: Date
}

// Интерфейсы для настроек режимов и опций

/**
 * Настройки для режима "Поддержание цены".
 * В данный момент не содержит специфичных полей.
 */
export interface KeepPriceModeSettings {
	// Пока пусто
}

/**
 * Настройки для режима "Ориентир на конкурента".
 */
export interface CompetitorModeSettings {
	/** Артикул (nmID) товара конкурента. */
	competitorNmId: number
	/** Желаемая разница в рублях от цены конкурента (+/-). */
	priceDifference: number
}

/**
 * Настройки для опции "Режим расписания".
 */
export interface ScheduleOption {
	/** Включена ли опция. */
	isEnabled: boolean
	/** Время начала интервала (например, "18:00"). */
	timeFrom: string
	/** Время окончания интервала (например, "09:00"). */
	timeTo: string
	/** Отклонение от расчетной цены в рублях (+/-). */
	priceAdjustment: number
	/** Поведение корректировки цены. */
	adjustmentBehavior: ScheduleOptionAdjustmentBehavior
}

/**
 * Условие для опции "Реакция на остатки".
 */
export interface StockReactionCondition {
	/** Оператор сравнения остатков. */
	operator: StockReactionConditionOperator
	/** Пороговое значение остатков. */
	threshold: number
	/** Отклонение от текущей расчетной цены в рублях (+/-). */
	priceAdjustment: number
}

/**
 * Настройки для опции "Реакция на остатки".
 */
export interface StockReactionOption {
	/** Включена ли опция. */
	isEnabled: boolean
	/** Массив условий для реакции на остатки. */
	conditions: StockReactionCondition[]
}

/**
 * Настройки для опции "AI-регулирование цены при изменении СПП".
 */
export interface AiSppAdjustmentOption {
	/** Включена ли опция. */
	isEnabled: boolean
	/**
	 * Время реакции в минутах (от 0 до 60, или предопределенные значения до 12 часов).
	 * Если 0, реакция мгновенная.
	 */
	reactionTimeMinutes: number
	/**
	 * Шкала агрессивности (от 0.0 до 1.0).
	 * Определяет, насколько быстро система будет возвращать цену к FinalEffectivePrice
	 * после временного снижения, вызванного повышением СПП.
	 */
	aggressivenessScale: number
}

/**
 * Элемент группового правила репрайсера.
 * Содержит индивидуальные настройки для одного товара в группе.
 */
export interface RepricerRuleItem {
	/** Артикул (nmID), к которому применяются индивидуальные настройки. */
	nmId: number
	/** Минимальная цена продажи. */
	minPrice: number
	/** Базовая (или максимальная) цена продажи. */
	basePrice: number
	/**
	 * Динамические данные с Wildberries для этого конкретного товара.
	 * Присоединяется воркером в рантайме.
	 */
	dynamicWBData?: DynamicWBDataDocument
	/**
	 * Динамические данные конкурента с Wildberries для этого товара.
	 * Присоединяется воркером в рантайме, если режим "Конкурент".
	 */
	competitorDynamicWBData?: DynamicWBDataDocument
}

// Основные интерфейсы

/**
 * Правило репрайсера.
 * Основная конфигурационная единица, создаваемая пользователем.
 */
export interface RepricerRule {
	/** Уникальный идентификатор правила в MongoDB. */
	_id: ObjectId | string
	/** Название правила (для удобства пользователя). */
	name: string
	/** Тип правила: одиночное или групповое. По умолчанию 'SINGLE'. */
	ruleType?: 'SINGLE' | 'GROUP'
	/** Артикул (nmID), к которому применяется правило. ОБЯЗАТЕЛЬНО для ruleType: 'SINGLE'. */
	nmId?: number
	/** ID поставщика, к которому относится товар. */
	supplierId: string
	/** Минимальная цена продажи. ОБЯЗАТЕЛЬНО для ruleType: 'SINGLE'. */
	minPrice?: number
	/** Базовая (или максимальная) цена продажи. ОБЯЗАТЕЛЬНО для ruleType: 'SINGLE'. */
	basePrice?: number
	/** Массив товаров для группового правила. ОБЯЗАТЕЛЬНО для ruleType: 'GROUP'. */
	items?: RepricerRuleItem[]
	/** Статус правила (активно/неактивно). */
	isActive: boolean
	/** Основной режим работы правила. */
	baseOperatingMode: RepricerRuleBaseOperatingMode
	/** Настройки для режима "Поддержание цены" (если выбран). */
	keepPriceSettings?: KeepPriceModeSettings
	/** Настройки для режима "Ориентир на конкурента" (если выбран). */
	competitorModeSettings?: CompetitorModeSettings
	/** Опциональные настройки режима расписания. */
	scheduleOption?: ScheduleOption
	/** Опциональные настройки режима реакции на остатки. */
	stockReactionOption?: StockReactionOption
	/** Опциональные настройки AI-регулирования цены при изменении СПП. */
	aiSppAdjustmentOption?: AiSppAdjustmentOption
	/** Дата и время создания правила. */
	createdAt?: Date
	/** Дата и время последнего обновления правила. */
	updatedAt?: Date
	/** ID клиента (организации), к которому относится правило. */
	clientId: string
	/** ID пользователя, создавшего/изменившего правило. */
	userId: string
	/**
	 * Динамические данные с Wildberries.
	 * Это поле не хранится в основной коллекции RepricerRule,
	 * а присоединяется при запросе. Используется для одиночных правил.
	 */
	dynamicWBData?: DynamicWBDataDocument

	/**
	 * Динамические данные конкурента с Wildberries.
	 * Присоединяется при запросе, если режим "Конкурент". Используется для одиночных правил.
	 */
	competitorDynamicWBData?: DynamicWBDataDocument

	/**
	 * Состояние цены, которое хранится в правиле.
	 */
	priceState?: RepricerPriceState
}

/**
 * Задача для Воркера-Исполнителя.
 * Конкретная инструкция по изменению цены одного товара.
 */
export interface ExecutionTask {
	/** Уникальный идентификатор задачи в MongoDB. */
	_id?: ObjectId
	/** Уникальный идентификатор задачи (преобразованный из _id для фронтенда). */
	id?: string
	/** ID связанного RepricerRule. */
	repricerRuleId: ObjectId | string
	/** ID поставщика, которому принадлежит товар. */
	supplierId: string
	/** Артикул товара (nmID). */
	nmId: number
	/** Планируемое время выполнения задачи. */
	executionTime: Date
	/**
	 * Флаг, указывающий, является ли это задание финальным в серии коррекций
	 * (особенно актуально для AI-режима).
	 */
	isFinal: boolean
	/** Целевая цена для покупателя, которую это задание должно установить. */
	targetEffectivePrice: number
	/**
	 * Значение СПП, актуальное на момент расчета apiPriceToSet и apiDiscountToSet
	 * для этого задания.
	 */
	currentSppSnapshot: number
	/** Цена, которую нужно фактически отправить в API Wildberries. */
	apiPriceToSet: number
	/** Скидка, которую нужно фактически отправить в API Wildberries. */
	apiDiscountToSet: number
	/** Статус выполнения задачи. */
	status: ExecutionTaskStatus
	/** Дата и время создания задачи. */
	createdAt: Date
	/** Дата и время последнего обновления задачи. */
	updatedAt: Date
	/** ID клиента (организации), для отчетности и изоляции данных. */
	clientId: string
}

/**
 * Тип лога: решение о создании/изменении задачи или результат ее выполнения.
 */
export enum RepricerLogType {
	DECISION = 'DECISION',
	EXECUTION = 'EXECUTION',
}

/**
 * Триггер, который инициировал создание лога типа DECISION.
 */
export enum RepricerLogTrigger {
	STRATEGY_CHANGE = 'STRATEGY_CHANGE', // Плановая смена стратегии (изменилась цена конкурента, сработало расписание и т.д.)
	MARKET_FLUCTUATION_AI = 'MARKET_FLUCTUATION_AI', // Сработала AI-корректировка из-за падения цены на сайте
	MARKET_FLUCTUATION_CORRECTION = 'MARKET_FLUCTUATION_CORRECTION', // Обычная коррекция из-за расхождения цены на сайте
	TASK_UPDATE = 'TASK_UPDATE', // Существующая задача была обновлена новой целью
	TASK_CANCEL = 'TASK_CANCEL', // Задачи были отменены из-за смены стратегии или стоп-крана
	INITIAL_TASK = 'INITIAL_TASK', // Самая первая задача для правила
	EXTERNAL_INTERFERENCE = 'EXTERNAL_INTERFERENCE', // Обнаружено внешнее изменение цены/скидки через API
}

/**
 * Базовый интерфейс для всех типов логов.
 */
interface RepricerLogBase {
	_id: ObjectId
	id?: string
	createdAt: Date
	clientId: string
	repricerRuleId: ObjectId | string
	nmId: number
	logType: RepricerLogType
	message: string
	// ID связанной задачи (опционально, т.к. некоторые решения не привязаны к одной задаче)
	taskId?: ObjectId | string
}

/**
 * Лог о принятии решения (создание/обновление задачи).
 */
export interface RepricerDecisionLog extends RepricerLogBase {
	logType: RepricerLogType.DECISION
	trigger: RepricerLogTrigger
	snapshot: {
		currentSitePrice?: number
		currentSpp?: number
		competitorPrice?: number
		stock?: number
		previousPriceState?: RepricerPriceState
	}
	decision: {
		newTargetEffectivePrice?: number // Опционально для отмены
		calculationSource?: PriceCalculationSource // Опционально для отмены
	}
	action: {
		type: 'CREATE_TASK' | 'UPDATE_TASK' | 'CANCEL_TASKS'
		// ID задачи, только для CREATE/UPDATE
		taskId?: ObjectId | string
		// Параметры, только для CREATE/UPDATE
		taskParameters?: {
			executionTime: Date
			isFinal: boolean
			targetEffectivePrice: number
			apiPriceToSet: number
			apiDiscountToSet: number
		}
		// Количество отмененных задач, только для CANCEL_TASKS
		cancelledCount?: number
	}
}

/**
 * Лог о результате выполнения задачи.
 */
export interface RepricerExecutionLog extends RepricerLogBase {
	logType: RepricerLogType.EXECUTION
	executionResult: {
		status: 'SUCCESS' | 'ERROR'
		// Детали ответа API или текст ошибки
		details: string
	}
	taskSnapshot: {
		// Параметры задачи на момент выполнения
		targetEffectivePrice: number
		apiPriceToSet: number
		apiDiscountToSet: number
	}
}

export type RepricerLog = RepricerDecisionLog | RepricerExecutionLog

export type RepricerRuleDB = Omit<RepricerRule, '_id'> & {
	// ... existing code ...
}
