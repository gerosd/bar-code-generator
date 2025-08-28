'use client'

import React, { useState } from 'react'
import TemplateManager from './TemplateManager'
import LabelEditor from './LabelEditor'
import type { LabelTemplate } from '@/lib/types/labelEditor'
import { updateLabelTemplateAction } from '@/lib/actions/labelTemplate-actions'

export default function ServerLabelEditor() {
    const [currentTemplate, setCurrentTemplate] = useState<LabelTemplate | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleTemplateSelect = (template: LabelTemplate) => {
        setCurrentTemplate(template)
        setMessage(null)
    }

    const handleSaveTemplate = async (template: LabelTemplate) => {
        try {
            const result = await updateLabelTemplateAction(template.id, {
                name: template.name,
                description: template.description,
                elements: template.elements,
                labelSize: template.labelSize
            })

            if (result.success) {
                setMessage({ type: 'success', text: 'Шаблон успешно сохранен' })
                setCurrentTemplate(result.data as LabelTemplate || template)
            } else {
                setMessage({ type: 'error', text: result.error || 'Ошибка сохранения шаблона' })
            }
        } catch (error) {
            console.error('Ошибка при сохранении шаблона:', error)
            setMessage({ type: 'error', text: 'Ошибка при сохранении шаблона' })
        }
    }

    const handleBackToList = () => {
        setCurrentTemplate(null)
        setMessage(null)
    }

    return (
        <div className="h-[calc(100vh-8rem)]">
            {message && (
                <div className={`mb-4 p-4 rounded-md ${
                    message.type === 'success' 
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                    {message.text}
                </div>
            )}

            {currentTemplate ? (
                <div className="h-full flex flex-col">
                    {/* Навигация */}
                    <div className="mb-4">
                        <button
                            onClick={handleBackToList}
                            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                        >
                            ← Назад к списку шаблонов
                        </button>
                    </div>

                    {/* Редактор */}
                    <div className="flex-1">
                        <LabelEditor
                            template={currentTemplate}
                            onSaveAction={handleSaveTemplate}
                        />
                    </div>
                </div>
            ) : (
                <TemplateManager
                    onTemplateSelectAction={handleTemplateSelect}
                />
            )}
        </div>
    )
}