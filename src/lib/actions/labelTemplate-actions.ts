'use server'

import { 
    createLabelTemplate, 
    getLabelTemplateById, 
    getLabelTemplatesByClient, 
    updateLabelTemplate, 
    deleteLabelTemplate,
    createDefaultElements 
} from '@/lib/mongo/labelTemplates'
import { getDefaultLabelSize } from '@/lib/utils/labelSizeUtils'
import { updateClient } from '@/lib/mongo/clients'
import type { 
    CreateLabelTemplateData, 
    UpdateLabelTemplateData, 
    LabelTemplate 
} from '@/lib/types/labelEditor'

export interface ActionResult {
    success: boolean
    message?: string
    error?: string
    data?: any
}

/**
 * Создать новый шаблон этикетки
 */
export async function createLabelTemplateAction(
    clientId: string,
    name: string,
    description?: string
): Promise<ActionResult> {
    try {
        const templateData: CreateLabelTemplateData = {
            clientId,
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
 * Получить шаблон этикетки по ID
 */
export async function getLabelTemplateAction(templateId: string): Promise<ActionResult> {
    try {
        const template = await getLabelTemplateById(templateId)

        if (!template) {
            return {
                success: false,
                error: 'Шаблон этикетки не найден'
            }
        }

        return {
            success: true,
            data: template
        }
    } catch (error) {
        console.error('Ошибка при получении шаблона этикетки:', error)
        return {
            success: false,
            error: 'Не удалось получить шаблон этикетки'
        }
    }
}

/**
 * Получить все шаблоны клиента
 */
export async function getClientLabelTemplatesAction(clientId: string): Promise<ActionResult> {
    try {
        const templates = await getLabelTemplatesByClient(clientId)

        return {
            success: true,
            data: templates
        }
    } catch (error) {
        console.error('Ошибка при получении шаблонов клиента:', error)
        return {
            success: false,
            error: 'Не удалось получить шаблоны клиента'
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

/**
 * Установить пользовательский шаблон как активный для клиента
 */
export async function setClientCustomTemplateAction(
    clientId: string,
    templateId: string
): Promise<ActionResult> {
    try {
        // Проверяем, что шаблон существует и принадлежит клиенту
        const template = await getLabelTemplateById(templateId)
        
        if (!template) {
            return {
                success: false,
                error: 'Шаблон этикетки не найден'
            }
        }

        if (template.clientId !== clientId) {
            return {
                success: false,
                error: 'Шаблон не принадлежит данному клиенту'
            }
        }

        // Обновляем клиента
        const result = await updateClient(clientId, {
            selectedPrintTemplate: 'custom',
            customLabelTemplateId: templateId
        })

        if (!result) {
            return {
                success: false,
                error: 'Не удалось обновить настройки клиента'
            }
        }

        return {
            success: true,
            message: 'Пользовательский шаблон установлен как активный'
        }
    } catch (error) {
        console.error('Ошибка при установке пользовательского шаблона:', error)
        return {
            success: false,
            error: 'Не удалось установить пользовательский шаблон'
        }
    }
}