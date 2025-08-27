import type { LabelSize } from '@/lib/types/labelEditor'

/**
 * Стандартное разрешение для этикеток (203 DPI для большинства принтеров Zebra)
 */
export const DEFAULT_DPI = 203

/**
 * Предустановленные размеры этикеток в мм
 */
export const PRESET_LABEL_SIZES: { name: string; widthMm: number; heightMm: number }[] = [
    { name: '30×20 мм (Компактная)', widthMm: 30, heightMm: 20 },
    { name: '58×40 мм (Стандартная)', widthMm: 58, heightMm: 40 },
    { name: '70×40 мм (Увеличенная)', widthMm: 70, heightMm: 40 },
    { name: '100×60 мм (Почтовая)', widthMm: 100, heightMm: 60 },
]

/**
 * Конвертировать миллиметры в точки
 */
export function mmToDots(mm: number, dpi: number = DEFAULT_DPI): number {
    return Math.round((mm * dpi) / 25.4)
}

/**
 * Конвертировать точки в миллиметры
 */
export function dotsToMm(pixels: number, dpi: number = DEFAULT_DPI): number {
    return Math.round((pixels * 25.4) / dpi * 10) / 10 // округляем до 1 десятой
}

/**
 * Конвертировать миллиметры в дюймы
 */
export function mmToInches(mm: number): number {
    return Math.round((mm / 25.4) * 1000) / 1000 // округляем до 3 знаков после запятой
}

/**
 * Форматировать размеры этикетки в дюймах для Labelary API
 * Возвращает строку в формате "ширина x высота" в дюймах
 */
export function formatLabelSizeForLabelary(widthMm: number, heightMm: number): string {
    const widthInches = mmToInches(widthMm)
    const heightInches = mmToInches(heightMm)
    return `${widthInches}x${heightInches}`
}

/**
 * Создать объект LabelSize из размеров в мм
 */
export function createLabelSizeFromMm(widthMm: number, heightMm: number, dpi: number = DEFAULT_DPI): LabelSize {
    return {
        width: mmToDots(widthMm, dpi),
        height: mmToDots(heightMm, dpi),
        widthMm,
        heightMm,
        dpi
    }
}

/**
 * Обновить LabelSize при изменении размеров в мм
 */
export function updateLabelSizeFromMm(labelSize: LabelSize, widthMm: number, heightMm: number): LabelSize {
    return {
        ...labelSize,
        width: mmToDots(widthMm, labelSize.dpi),
        height: mmToDots(heightMm, labelSize.dpi),
        widthMm,
        heightMm
    }
}

/**
 * Обновить LabelSize при изменении размеров в точках
 */
export function updateLabelSizeFromDots(labelSize: LabelSize, width: number, height: number): LabelSize {
    return {
        ...labelSize,
        width,
        height,
        widthMm: dotsToMm(width, labelSize.dpi),
        heightMm: dotsToMm(height, labelSize.dpi)
    }
}

/**
 * Обновить DPI и пересчитать точки
 */
export function updateLabelSizeDpi(labelSize: LabelSize, newDpi: number): LabelSize {
    return {
        ...labelSize,
        width: mmToDots(labelSize.widthMm, newDpi),
        height: mmToDots(labelSize.heightMm, newDpi),
        dpi: newDpi
    }
}

/**
 * Проверить, является ли размер этикетки валидным
 */
export function isValidLabelSize(labelSize: Partial<LabelSize>): boolean {
    return !!(
        labelSize.width && labelSize.width > 0 &&
        labelSize.height && labelSize.height > 0 &&
        labelSize.widthMm && labelSize.widthMm > 0 &&
        labelSize.heightMm && labelSize.heightMm > 0 &&
        labelSize.dpi && labelSize.dpi > 0
    )
}

/**
 * Получить размер этикетки по умолчанию (58×40 мм)
 */
export function getDefaultLabelSize(): LabelSize {
    return createLabelSizeFromMm(58, 40)
}