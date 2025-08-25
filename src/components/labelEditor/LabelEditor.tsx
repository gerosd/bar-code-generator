'use client'

import React, { useState, useCallback, useRef } from 'react'
import DraggableElement from './DraggableElement'
import ElementPropertiesPanel from './ElementPropertiesPanel'
import LabelSizeSettings from './LabelSizeSettings'
import type { LabelTemplate, LabelElement, LabelSize } from '@/lib/types/labelEditor'

interface LabelEditorProps {
    template: LabelTemplate
    onSaveAction: (template: LabelTemplate) => Promise<void>
    sampleData?: Record<string, string>
}

export default function LabelEditor({ template, onSaveAction, sampleData }: LabelEditorProps) {
    const [currentTemplate, setCurrentTemplate] = useState<LabelTemplate>(template)
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [canvasScale, setCanvasScale] = useState(1)
    const [showSizeSettings, setShowSizeSettings] = useState(false)
    const canvasRef = useRef<HTMLDivElement>(null)

    const selectedElement = selectedElementId 
        ? currentTemplate.elements.find(el => el.id === selectedElementId) || null
        : null

    const handleElementPositionChange = useCallback((elementId: string, position: { x: number; y: number }) => {
        setCurrentTemplate(prev => ({
            ...prev,
            elements: prev.elements.map(element =>
                element.id === elementId
                    ? { ...element, position: { ...element.position, ...position } }
                    : element
            )
        }))
    }, [])

    const handleElementUpdate = useCallback((elementId: string, updates: Partial<LabelElement>) => {
        setCurrentTemplate(prev => ({
            ...prev,
            elements: prev.elements.map(element =>
                element.id === elementId
                    ? { ...element, ...updates }
                    : element
            )
        }))
    }, [])

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (e.target === canvasRef.current) {
            setSelectedElementId(null)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await onSaveAction(currentTemplate)
        } catch (error) {
            console.error('Ошибка при сохранении шаблона:', error)
        } finally {
            setIsSaving(false)
        }
    }

    const handleZoomChange = (newScale: number) => {
        setCanvasScale(newScale)
    }

    const handleSizeChange = (newSize: LabelSize) => {
        setCurrentTemplate(prev => ({
            ...prev,
            labelSize: newSize
        }))
    }

    const handleResetElement = (elementId: string) => {
        const element = currentTemplate.elements.find(el => el.id === elementId)
        if (!element) return

        // Сбрасываем позицию к значениям по умолчанию
        const defaultPositions: Record<string, { x: number; y: number }> = {
            productName: { x: 10, y: 10 },
            nmId: { x: 10, y: 70 },
            vendorCode: { x: 10, y: 130 },
            productSize: { x: 10, y: 220 },
            dataMatrix: { x: 270, y: 120 }
        }

        const defaultPosition = defaultPositions[element.type] || { x: 10, y: 10 }
        
        handleElementUpdate(elementId, {
            position: { ...element.position, ...defaultPosition }
        })
    }

    return (
        <div className="flex h-full bg-gray-50 dark:bg-gray-900">
            {/* Основная область редактора */}
            <div className="flex-1 flex flex-col">
                {/* Панель инструментов */}
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                                {currentTemplate.name}
                            </h2>
                            {currentTemplate.description && (
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {currentTemplate.description}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center space-x-4">
                            {/* Масштаб */}
                            <div className="flex items-center space-x-2">
                                <label className="text-sm text-gray-700 dark:text-gray-300">
                                    Масштаб:
                                </label>
                                <select
                                    value={canvasScale}
                                    onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                                    className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                >
                                    <option value={0.5}>50%</option>
                                    <option value={0.75}>75%</option>
                                    <option value={1}>100%</option>
                                    <option value={1.25}>125%</option>
                                    <option value={1.5}>150%</option>
                                    <option value={2}>200%</option>
                                </select>
                            </div>

                            {/* Кнопка настройки размеров */}
                            <button
                                onClick={() => setShowSizeSettings(true)}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                            >
                                Размеры этикетки
                            </button>

                            {/* Кнопка сохранения */}
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                {isSaving ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Область канваса */}
                <div className="flex-1 p-8 overflow-auto">
                    <div className="flex justify-center">
                        <div 
                            className="relative bg-white border-2 border-gray-300 dark:border-gray-600 shadow-lg"
                            style={{
                                width: currentTemplate.labelSize.width * canvasScale,
                                height: currentTemplate.labelSize.height * canvasScale,
                                minWidth: currentTemplate.labelSize.width * canvasScale,
                                minHeight: currentTemplate.labelSize.height * canvasScale
                            }}
                        >
                            {/* Размеры этикетки */}
                            <div className="absolute -top-6 left-0 text-xs text-gray-500 dark:text-gray-400">
                                {currentTemplate.labelSize.widthMm} × {currentTemplate.labelSize.heightMm} мм 
                                ({currentTemplate.labelSize.width} × {currentTemplate.labelSize.height} точек)
                            </div>

                            {/* Канвас для перетаскивания */}
                            <div
                                ref={canvasRef}
                                className="relative w-full h-full cursor-default"
                                onClick={handleCanvasClick}
                            >
                                {/* Сетка */}
                                <div 
                                    className="absolute inset-0 opacity-10"
                                    style={{
                                        backgroundImage: `
                                            linear-gradient(to right, #000 1px, transparent 1px),
                                            linear-gradient(to bottom, #000 1px, transparent 1px)
                                        `,
                                        backgroundSize: `${20 * canvasScale}px ${20 * canvasScale}px`
                                    }}
                                />

                                {/* Перетаскиваемые элементы */}
                                {currentTemplate.elements.map(element => (
                                    <DraggableElement
                                        key={element.id}
                                        element={element}
                                        onPositionChangeAction={handleElementPositionChange}
                                        onSelectAction={setSelectedElementId}
                                        isSelected={selectedElementId === element.id}
                                        canvasScale={canvasScale}
                                        sampleData={sampleData}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Список элементов */}
                <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Элементы этикетки
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {currentTemplate.elements.map(element => (
                            <div
                                key={element.id}
                                className={`flex items-center justify-between p-2 text-xs border rounded-md cursor-pointer ${
                                    selectedElementId === element.id
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                } ${
                                    !element.visible ? 'opacity-50' : ''
                                }`}
                                onClick={() => setSelectedElementId(element.id)}
                            >
                                <span className="text-gray-900 dark:text-gray-100 truncate">
                                    {element.type === 'productName' && 'Название'}
                                    {element.type === 'productSize' && 'Размер'}
                                    {element.type === 'nmId' && 'Артикул WB'}
                                    {element.type === 'vendorCode' && 'Артикул продавца'}
                                    {element.type === 'dataMatrix' && 'DataMatrix'}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleResetElement(element.id)
                                    }}
                                    className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    title="Сбросить позицию"
                                >
                                    ↺
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Панель свойств */}
            <ElementPropertiesPanel
                selectedElement={selectedElement}
                onElementUpdateAction={handleElementUpdate}
            />

            {/* Настройки размеров этикетки */}
            <LabelSizeSettings
                labelSize={currentTemplate.labelSize}
                onSizeChangeAction={handleSizeChange}
                isOpen={showSizeSettings}
                onCloseAction={() => setShowSizeSettings(false)}
            />
        </div>
    )
}