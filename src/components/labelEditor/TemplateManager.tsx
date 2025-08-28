'use client'

import React, { useState, useEffect } from 'react'
import type { LabelTemplate } from '@/lib/types/labelEditor'
import { 
    createLabelTemplateAction,
    getUserLabelTemplatesAction,
    deleteLabelTemplateAction
} from '@/lib/actions/labelTemplate-actions'

interface TemplateManagerProps {
    onTemplateSelectAction: (template: LabelTemplate) => void
}

export default function TemplateManager({ onTemplateSelectAction }: TemplateManagerProps) {
    const [templates, setTemplates] = useState<LabelTemplate[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [newTemplateName, setNewTemplateName] = useState('')
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        loadTemplates()
    }, [])

    const loadTemplates = async () => {
        try {
            setIsLoading(true)
            const result = await getUserLabelTemplatesAction()
            
            if (result.success && result.data) {
                setTemplates(result.data)
            } else {
                setMessage({ type: 'error', text: result.error || 'Ошибка загрузки шаблонов' })
            }
        } catch (error) {
            console.error('Ошибка загрузки шаблонов:', error)
            setMessage({ type: 'error', text: 'Произошла ошибка при загрузке шаблонов' })
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateTemplate = async () => {
        if (!newTemplateName.trim()) return

        try {
            setIsCreating(true)
            const result = await createLabelTemplateAction(newTemplateName.trim())
            
            if (result.success) {
                setMessage({ type: 'success', text: 'Шаблон успешно создан' })
                setNewTemplateName('')
                setShowCreateForm(false)
                await loadTemplates()
            } else {
                setMessage({ type: 'error', text: result.error || 'Ошибка создания шаблона' })
            }
        } catch (error) {
            console.error('Ошибка создания шаблона:', error)
            setMessage({ type: 'error', text: 'Произошла ошибка при создании шаблона' })
        } finally {
            setIsCreating(false)
        }
    }

    const handleDeleteTemplate = async (templateId: string) => {
        if (!confirm('Вы уверены, что хотите удалить этот шаблон?')) return

        try {
            const result = await deleteLabelTemplateAction(templateId)
            
            if (result.success) {
                setMessage({ type: 'success', text: 'Шаблон успешно удален' })
                await loadTemplates()
            } else {
                setMessage({ type: 'error', text: result.error || 'Ошибка удаления шаблона' })
            }
        } catch (error) {
            console.error('Ошибка удаления шаблона:', error)
            setMessage({ type: 'error', text: 'Произошла ошибка при удалении шаблона' })
        }
    }

    const handleSelectTemplate = async (template: LabelTemplate) => {
        try {
            onTemplateSelectAction(template)
            setMessage({ type: 'success', text: `Шаблон "${template.name}" выбран` })
        } catch (error) {
            console.error('Ошибка выбора шаблона:', error)
            setMessage({ type: 'error', text: 'Произошла ошибка при выборе шаблона' })
        }
    }

    // Автоматически скрываем сообщения через 3 секунды
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                setMessage(null)
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [message])

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Мои шаблоны
                </h3>
                <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    Создать шаблон
                </button>
            </div>

            {message && (
                <div className={`mb-4 p-3 rounded-lg ${
                    message.type === 'success' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                    {message.text}
                </div>
            )}

            {showCreateForm && (
                <div className="mb-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                            placeholder="Название шаблона"
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            onKeyPress={(e) => e.key === 'Enter' && handleCreateTemplate()}
                        />
                        <button
                            onClick={handleCreateTemplate}
                            disabled={isCreating || !newTemplateName.trim()}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 
                                     text-white rounded-lg transition-colors"
                        >
                            {isCreating ? 'Создание...' : 'Создать'}
                        </button>
                        <button
                            onClick={() => {
                                setShowCreateForm(false)
                                setNewTemplateName('')
                            }}
                            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        >
                            Отмена
                        </button>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-8">
                    <div className="text-gray-500 dark:text-gray-400">Загрузка шаблонов...</div>
                </div>
            ) : templates.length === 0 ? (
                <div className="text-center py-8">
                    <div className="text-gray-500 dark:text-gray-400">У вас пока нет шаблонов</div>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                        Создайте первый шаблон, чтобы начать работу
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {templates.map((template) => (
                        <div
                            key={template.id}
                            className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 
                                     hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                        {template.name}
                                    </h4>
                                    {template.description && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {template.description}
                                        </p>
                                    )}
                                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                        Создан: {new Date(template.createdAt).toLocaleDateString('ru-RU')}
                                    </div>
                                    <div className="text-xs text-gray-400 dark:text-gray-500">
                                        Размер: {template.labelSize.widthMm}×{template.labelSize.heightMm} мм
                                    </div>
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <button
                                        onClick={() => handleSelectTemplate(template)}
                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white 
                                                 text-sm rounded transition-colors"
                                    >
                                        Выбрать
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTemplate(template.id)}
                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white 
                                                 text-sm rounded transition-colors"
                                    >
                                        Удалить
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}