'use client'

import React, { useState } from 'react'
import type { LabelSize } from '@/lib/types/labelEditor'
import { PRESET_LABEL_SIZES, updateLabelSizeFromMm, updateLabelSizeFromDots, updateLabelSizeDpi, isValidLabelSize } from '@/lib/utils/labelSizeUtils'

interface LabelSizeSettingsProps {
    labelSize: LabelSize
    onSizeChangeAction: (newSize: LabelSize) => void
    isOpen: boolean
    onCloseAction: () => void
}

export default function LabelSizeSettings({
    labelSize,
    onSizeChangeAction,
    isOpen,
    onCloseAction
}: LabelSizeSettingsProps) {
    const [tempSize, setTempSize] = useState<LabelSize>(labelSize)
    const [unit, setUnit] = useState<'mm' | 'dots'>('mm')

    React.useEffect(() => {
        setTempSize(labelSize)
    }, [labelSize, isOpen])

    const handlePresetSelect = (preset: { widthMm: number; heightMm: number }) => {
        const newSize = updateLabelSizeFromMm(tempSize, preset.widthMm, preset.heightMm)
        setTempSize(newSize)
    }

    const handleSizeChange = (field: 'width' | 'height', value: number) => {
        if (unit === 'mm') {
            const newSize = updateLabelSizeFromMm(
                tempSize,
                field === 'width' ? value : tempSize.widthMm,
                field === 'height' ? value : tempSize.heightMm
            )
            setTempSize(newSize)
        } else {
            const newSize = updateLabelSizeFromDots(
                tempSize,
                field === 'width' ? value : tempSize.width,
                field === 'height' ? value : tempSize.height
            )
            setTempSize(newSize)
        }
    }

    const handleDpiChange = (newDpi: number) => {
        const newSize = updateLabelSizeDpi(tempSize, newDpi)
        setTempSize(newSize)
    }

    const handleApply = () => {
        if (isValidLabelSize(tempSize)) {
            onSizeChangeAction(tempSize)
            onCloseAction()
        }
    }

    const handleCancel = () => {
        setTempSize(labelSize)
        onCloseAction()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-2xl mx-4">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Настройка размеров этикетки
                    </h3>
                    <button
                        onClick={handleCancel}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-4 space-y-6">
                    {/* Предустановленные размеры */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Предустановленные размеры
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {PRESET_LABEL_SIZES.map((preset, index) => (
                                <button
                                    key={index}
                                    onClick={() => handlePresetSelect(preset)}
                                    className={`p-2 text-sm border rounded-md text-left transition-colors ${
                                        tempSize.widthMm === preset.widthMm && tempSize.heightMm === preset.heightMm
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                                    }`}
                                >
                                    <div className="font-medium text-gray-900 dark:text-white">
                                        {preset.name}
                                    </div>
                                    <div className="text-gray-500 dark:text-gray-400">
                                        {preset.widthMm}×{preset.heightMm} мм
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Единицы измерения */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Единицы измерения
                        </label>
                        <div className="flex space-x-4">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    value="mm"
                                    checked={unit === 'mm'}
                                    onChange={(e) => setUnit(e.target.value as 'mm')}
                                    className="mr-2"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Миллиметры (мм)</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    value="dots"
                                    checked={unit === 'dots'}
                                    onChange={(e) => setUnit(e.target.value as 'dots')}
                                    className="mr-2"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Точки (dots)</span>
                            </label>
                        </div>
                    </div>

                    {/* Размеры */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Размеры этикетки
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    Ширина ({unit})
                                </label>
                                <input
                                    type="number"
                                    value={unit === 'mm' ? tempSize.widthMm : tempSize.width}
                                    onChange={(e) => handleSizeChange('width', parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    min="1"
                                    step={unit === 'mm' ? '0.1' : '1'}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    Высота ({unit})
                                </label>
                                <input
                                    type="number"
                                    value={unit === 'mm' ? tempSize.heightMm : tempSize.height}
                                    onChange={(e) => handleSizeChange('height', parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    min="1"
                                    step={unit === 'mm' ? '0.1' : '1'}
                                />
                            </div>
                        </div>
                    </div>

                    {/* DPI */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Разрешение принтера (DPI)
                        </label>
                        <select
                            value={tempSize.dpi}
                            onChange={(e) => handleDpiChange(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                            <option value={203}>203 DPI (Стандартный)</option>
                            <option value={300}>300 DPI (Высокое качество)</option>
                            <option value={600}>600 DPI (Максимальное качество)</option>
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Большинство принтеров Zebra используют 203 DPI
                        </p>
                    </div>

                    {/* Информация о конвертации */}
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Информация о размерах
                        </h4>
                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            <div>Размер в мм: {tempSize.widthMm} × {tempSize.heightMm}</div>
                            <div>Размер в точках: {tempSize.width} × {tempSize.height}</div>
                            <div>Разрешение: {tempSize.dpi} DPI</div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={handleCancel}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={!isValidLabelSize(tempSize)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md"
                    >
                        Применить
                    </button>
                </div>
            </div>
        </div>
    )
}