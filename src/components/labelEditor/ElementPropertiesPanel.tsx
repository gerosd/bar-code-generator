'use client'

import React from 'react'
import type { LabelElement, LabelElementType } from '@/lib/types/labelEditor'

interface ElementPropertiesPanelProps {
    selectedElement: LabelElement | null
    onElementUpdateAction: (elementId: string, updates: Partial<LabelElement>) => void
}

const getElementDisplayName = (type: LabelElementType): string => {
    switch (type) {
        case 'productName': return 'Название товара'
        case 'productSize': return 'Размер'
        case 'nmId': return 'Артикул WB'
        case 'vendorCode': return 'Артикул продавца'
        case 'dataMatrix': return 'DataMatrix'
        default: return type
    }
}

export default function ElementPropertiesPanel({
    selectedElement,
    onElementUpdateAction
}: ElementPropertiesPanelProps) {
    if (!selectedElement) {
        return (
            <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Свойства элемента
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                    Выберите элемент для редактирования его свойств
                </p>
            </div>
        )
    }

    const handlePositionChange = (key: 'x' | 'y', value: number) => {
        onElementUpdateAction(selectedElement.id, {
            position: {
                ...selectedElement.position,
                [key]: value
            }
        })
    }

    const handleFontSizeChange = (fontSize: number) => {
        onElementUpdateAction(selectedElement.id, { fontSize })
    }

    const handleVisibilityChange = (visible: boolean) => {
        onElementUpdateAction(selectedElement.id, { visible })
    }

    return (
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Свойства элемента
            </h3>
            
            <div className="space-y-4">
                {/* Тип элемента */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Тип элемента
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-gray-100">
                        {getElementDisplayName(selectedElement.type)}
                    </div>
                </div>

                {/* Видимость */}
                <div>
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={selectedElement.visible}
                            onChange={(e) => handleVisibilityChange(e.target.checked)}
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Видимый
                        </span>
                    </label>
                </div>

                {/* Позиция */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Позиция
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">X</label>
                            <input
                                type="number"
                                value={Math.round(selectedElement.position.x)}
                                onChange={(e) => handlePositionChange('x', parseInt(e.target.value) || 0)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Y</label>
                            <input
                                type="number"
                                value={Math.round(selectedElement.position.y)}
                                onChange={(e) => handlePositionChange('y', parseInt(e.target.value) || 0)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                min="0"
                            />
                        </div>
                    </div>
                </div>

                {/* Настройки шрифта (только для текстовых элементов) */}
                {selectedElement.type !== 'dataMatrix' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Размер шрифта
                            </label>
                            <input
                                type="number"
                                value={selectedElement.fontSize || 16}
                                onChange={(e) => handleFontSizeChange(parseInt(e.target.value) || 16)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                min="8"
                                max="72"
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}