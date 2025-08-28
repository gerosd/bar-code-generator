'use server'

import { 
    createLabelTemplate,
    getLabelTemplatesByUser, 
    updateLabelTemplate, 
    deleteLabelTemplate,
    createDefaultElements 
} from '@/lib/mongo/labelTemplates'
import { getDefaultLabelSize } from '@/lib/utils/labelSizeUtils'
import { getUserIdFromSession } from './utils'
import type { 
    CreateLabelTemplateData, 
    UpdateLabelTemplateData
} from '@/lib/types/labelEditor'

export interface ActionResult {
    success: boolean
    message?: string
    error?: string
    data?: unknown
}

/**
 * Создать новый шаблон этикетки
 */
export async function createLabelTemplateAction(
    name: string,
    description?: string
): Promise<ActionResult> {
    try {
        const userId = await getUserIdFromSession()
        
        const templateData: CreateLabelTemplateData = {
            userId,
            name,
            description,
            elements: createDefaultElements(),
            labelSize: getDefaultLabelSize() // Размер по умолчанию 58×40 мм
        }

        const template = await createLabelTemplate(templateData)

        return {
            success: true,
            message: 'Шаблон этикетки успешно создан',
            data: template
        }
    } catch (error) {
        console.error('Ошибка при создании шаблона этикетки:', error)
        return {
            success: false,
            error: 'Не удалось создать шаблон этикетки'
        }
    }
}

/**
 * Получить все шаблоны пользователя
 */
export async function getUserLabelTemplatesAction(): Promise<ActionResult> {
    try {
        const userId = await getUserIdFromSession()
        const templates = await getLabelTemplatesByUser(userId)

        return {
            success: true,
            data: templates
        }
    } catch (error) {
        console.error('Ошибка при получении шаблонов пользователя:', error)
        return {
            success: false,
            error: 'Не удалось получить шаблоны пользователя'
        }
    }
}

/**
 * Обновить шаблон этикетки
 */
export async function updateLabelTemplateAction(
    templateId: string,
    data: UpdateLabelTemplateData
): Promise<ActionResult> {
    try {
        const template = await updateLabelTemplate(templateId, data)

        if (!template) {
            return {
                success: false,
                error: 'Шаблон этикетки не найден'
            }
        }

        return {
            success: true,
            message: 'Шаблон этикетки успешно обновлен',
            data: template
        }
    } catch (error) {
        console.error('Ошибка при обновлении шаблона этикетки:', error)
        return {
            success: false,
            error: 'Не удалось обновить шаблон этикетки'
        }
    }
}

/**
 * Удалить шаблон этикетки
 */
export async function deleteLabelTemplateAction(templateId: string): Promise<ActionResult> {
    try {
        const success = await deleteLabelTemplate(templateId)

        if (!success) {
            return {
                success: false,
                error: 'Шаблон этикетки не найден'
            }
        }

        return {
            success: true,
            message: 'Шаблон этикетки успешно удален'
        }
    } catch (error) {
        console.error('Ошибка при удалении шаблона этикетки:', error)
        return {
            success: false,
            error: 'Не удалось удалить шаблон этикетки'
        }
    }
}
