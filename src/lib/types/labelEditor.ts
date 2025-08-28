import type { ObjectId } from 'mongodb'

/**
 * Типы элементов этикетки
 */
export type LabelElementType = 'productName' | 'productSize' | 'nmId' | 'vendorCode' | 'dataMatrix'

/**
 * Координаты элемента на этикетке
 */
export interface ElementPosition {
    x: number
    y: number
    width?: number
    height?: number
}

/**
 * Конфигурация элемента этикетки
 */
export interface LabelElement {
    id: string
    type: LabelElementType
    position: ElementPosition
    fontSize?: number
    fontWeight?: 'normal' | 'bold'
    visible: boolean
}

/**
 * Размеры этикетки
 */
export interface LabelSize {
    width: number // в точках
    height: number // в точках
    widthMm: number // в миллиметрах
    heightMm: number // в миллиметрах
    dpi: number // разрешение для конвертации
}

/**
 * Конфигурация шаблона этикетки
 */
export interface LabelTemplate {
    id: string
    userId: string
    name: string
    description?: string
    elements: LabelElement[]
    labelSize: LabelSize
    createdAt: Date
    updatedAt: Date
}

/**
 * Документ шаблона этикетки в MongoDB
 */
export interface LabelTemplateDocument {
    _id: ObjectId
    userId: string
    name: string
    description?: string
    elements: LabelElement[]
    labelSize: LabelSize
    createdAt: Date
    updatedAt: Date
}

/**
 * Данные для создания нового шаблона
 */
export interface CreateLabelTemplateData {
    userId: string
    name: string
    description?: string
    elements: LabelElement[]
    labelSize: LabelSize
}

/**
 * Данные для обновления шаблона
 */
export interface UpdateLabelTemplateData {
    name?: string
    description?: string
    elements?: LabelElement[]
    labelSize?: LabelSize
}