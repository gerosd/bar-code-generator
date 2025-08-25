'use client'

import React, { useState, useEffect } from 'react'
import { useCurrentClient } from '@/components/providers/ClientProvider'
import type { LabelTemplate } from '@/lib/types/labelEditor'
import { 
    createLabelTemplateAction,
    getClientLabelTemplatesAction,
    deleteLabelTemplateAction,
    setClientCustomTemplateAction
} from '@/lib/actions/labelTemplate-actions'

interface TemplateManagerProps {
    onTemplateSelectAction: (template: LabelTemplate) => void
}

export default function TemplateManager({ onTemplateSelectAction }: TemplateManagerProps) {
    const { currentClient } = useCurrentClient()
    const [templates, setTemplates] = useState<LabelTemplate[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [newTemplateName, setNewTemplateName] = useState('')
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        if (currentClient) {
            loadTemplates()
        }
    }, [currentClient])

    const loadTemplates = async () => {
        if (!currentClient) return

        setIsLoading(true)
        try {
            const result = await getClientLabelTemplatesAction(currentClient.id)
            if (result.success && result.data) {
                setTemplates(result.data)
            } else {
                setMessage({ type: 'error', text: result.error || 'Ошибка загрузки шаблонов' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Ошибка при загрузке шаблонов' })
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateTemplate = async () => {
        if (!currentClient || !newTemplateName.trim()) return

        setIsCreating(true)
        try {
            const result = await createLabelTemplateAction(currentClient.id, newTemplateName.trim())
            if (result.success && result.data) {
                setTemplates(prev => [result.data, ...prev])
                setNewTemplateName('')
                setShowCreateForm(false)
                setMessage({ type: 'success', text: 'Шаблон успешно создан' })
                onTemplateSelectAction(result.data)
            } else {
                setMessage({ type: 'error', text: result.error || 'Ошибка создания шаблона' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Ошибка при создании шаблона' })
        } finally {
            setIsCreating(false)
        }
    }

    const handleDeleteTemplate = async (templateId: string) => {
        if (!confirm('Вы уверены, что хотите удалить этот шаблон?')) return

        try {
            const result = await deleteLabelTemplateAction(templateId)
            if (result.success) {
                setTemplates(prev => prev.filter(t => t.id !== templateId))
                setMessage({ type: 'success', text: 'Шаблон удален' })
            } else {
                setMessage({ type: 'error', text: result.error || 'Ошибка удаления шаблона' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Ошибка при удалении шаблона' })
        }
    }

    const handleSetAsActive = async (template: LabelTemplate) => {
        if (!currentClient) return

        try {
            const result = await setClientCustomTemplateAction(currentClient.id, template.id)
            if (result.success) {
                setMessage({ type: 'success', text: 'Шаблон установлен как активный' })
                 // Обновляем данные клиента в контексте
                 window.location.reload()
            } else {
                setMessage({ type: 'error', text: result.error || 'Ошибка установки шаблона' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Ошибка при установке шаблона' })
        }
    }

    if (!currentClient) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-500">Клиент не выбран</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Сообщения */}
            {message && (
                <div className={`p-4 rounded-md ${
                    message.type === 'success' 
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                    {message.text}
                </div>
            )}

            {/* Заголовок и кнопка создания */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Шаблоны этикеток
                </h2>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    Создать новый
                </button>
            </div>

            {/* Форма создания шаблона */}
            {showCreateForm && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                        Создать новый шаблон
                    </h3>
                    <div className="flex items-center space-x-3">
                        <input
                            type="text"
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                            placeholder="Название шаблона"
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            disabled={isCreating}
                        />
                        <button
                            onClick={handleCreateTemplate}
                            disabled={isCreating || !newTemplateName.trim()}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-md"
                        >
                            {isCreating ? 'Создание...' : 'Создать'}
                        </button>
                        <button
                            onClick={() => {
                                setShowCreateForm(false)
                                setNewTemplateName('')
                            }}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md"
                        >
                            Отмена
                        </button>
                    </div>
                </div>
            )}

            {/* Список шаблонов */}
            {isLoading ? (
                <div className="text-center py-8">
                    <p className="text-gray-500">Загрузка шаблонов...</p>
                </div>
            ) : templates.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">У вас пока нет пользовательских шаблонов</p>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                        Создать первый шаблон
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map(template => (
                        <div
                            key={template.id}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                        {template.name}
                                    </h3>
                                    {template.description && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {template.description}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDeleteTemplate(template.id)}
                                    className="text-red-600 hover:text-red-700 p-1"
                                    title="Удалить шаблон"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                <p>Размер: {template.labelSize.widthMm}×{template.labelSize.heightMm} мм</p>
                                <p>Элементов: {template.elements.filter(e => e.visible).length}</p>
                                <p>Обновлен: {new Date(template.updatedAt).toLocaleDateString()}</p>
                            </div>

                            <div className="flex space-x-2">
                                <button
                                    onClick={() => onTemplateSelectAction(template)}
                                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md"
                                >
                                    Редактировать
                                </button>
                                <button
                                    onClick={() => handleSetAsActive(template)}
                                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md"
                                    title="Установить как активный шаблон"
                                >
                                    Активировать
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}