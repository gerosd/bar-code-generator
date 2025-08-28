'use client'

import { useState, useEffect } from 'react'
import { getUserLabelTemplatesAction } from '@/lib/actions/labelTemplate-actions'
import type { PrintTemplate } from '@/lib/types/generation'
import preview1 from '@/public/label_1.webp';
import preview2 from '@/public/label_1.webp';
import preview3 from '@/public/label_1.webp';
import {StaticImageData} from "next/image";
import Image from 'next/image'

interface TemplateOption {
    id: PrintTemplate;
    name: string;
    description: string;
    preview: string;
    image: StaticImageData;
}

const getCustomTemplatePreview = async (): Promise<string | undefined> => {
    try {
        const response = await fetch('/api/preview', {
            method: 'POST',
            body: JSON.stringify({
                template: 'custom',
                dpi: '203'
            })
        });
        if (!response.ok) {
            console.error('Ошибка при получении предпросмотра пользовательского шаблона');
            return undefined;
        }
        const result = await response.json();
        return result.imageData;
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

const TEMPLATE_OPTIONS: TemplateOption[] = [
    {
        id: 'template1',
        name: 'Стандартный шаблон',
        description: 'Классический макет с полной информацией о товаре',
        preview: 'Стандартное расположение элементов с размером шрифта 24',
        image: preview1
    },
    {
        id: 'template2',
        name: 'Компактный шаблон',
        description: 'Уменьшенный макет для экономии места',
        preview: 'Компактное расположение с размером шрифта 20',
        image: preview2
    },
    {
        id: 'template3',
        name: 'Расширенный шаблон',
        description: 'Расширенный макет с дополнительной информацией',
        preview: 'Расширенная информация с датой печати, размер шрифта 28',
        image: preview3
    }
]

export default function ServerTemplates() {
    const [selectedTemplate, setSelectedTemplate] = useState<PrintTemplate>('template1')
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [hasCustomTemplates, setHasCustomTemplates] = useState(false)
    const [customTemplateImage, setCustomTemplateImage] = useState<string | undefined>(undefined)
    const [customTemplateError, setCustomTemplateError] = useState<string | null>(null)

    useEffect(() => {
        const checkCustomTemplates = async () => {
            try {
                const result = await getUserLabelTemplatesAction()
                if (result.success && result.data && Array.isArray(result.data)) {
                    setHasCustomTemplates(result.data.length > 0)
                    // Если есть пользовательские шаблоны, получаем предпросмотр
                    if (result.data.length > 0) {
                        setCustomTemplateError(null)
                        const preview = await getCustomTemplatePreview()
                        if (preview) {
                            setCustomTemplateImage(preview)
                        } else {
                            setCustomTemplateError('Не удалось загрузить предпросмотр')
                        }
                    }
                }
            } catch (error) {
                console.error('Ошибка проверки пользовательских шаблонов:', error)
                setCustomTemplateError('Ошибка при проверке шаблонов')
            }
        }

        checkCustomTemplates()
    }, [])

    const handleTemplateChange = (template: PrintTemplate) => {
        // Для пользовательского шаблона проверяем, создан ли он
        if (template === 'custom' && !hasCustomTemplates) {
            setMessage({ 
                type: 'error', 
                text: 'Сначала создайте пользовательский шаблон в Редакторе этикеток' 
            })
            return
        }

        setSelectedTemplate(template)
        setMessage({ type: 'success', text: 'Шаблон выбран. Он будет использоваться при печати.' })
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Выбор шаблона для печати</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Выберите один из доступных шаблонов для печати этикеток. 
                    Выбранный шаблон будет использоваться при печати.
                </p>

                {message && (
                    <div className={`mb-4 p-3 rounded-md border ${
                        message.type === 'success' 
                            ? 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700' 
                            : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700'
                    }`}>
                        {message.text}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {TEMPLATE_OPTIONS.map((template) => (
                        <div
                            key={template.id}
                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                selectedTemplate === template.id
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                            }`}
                            onClick={() => handleTemplateChange(template.id)}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">{template.name}</h3>
                                {selectedTemplate === template.id && (
                                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{template.description}</p>
                            
                            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs text-gray-700 dark:text-gray-200 font-mono">
                                {template.preview}
                            </div>

                            <div className="mt-2 flex items-center justify-center h-44">
                                <Image src={template.image} alt={template.name} className="w-auto h-full border-2 border-blue-600 rounded-lg" />
                            </div>
                        </div>
                    ))}

                    {/* Пользовательский шаблон */}
                    {hasCustomTemplates && (
                        <div
                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                selectedTemplate === 'custom'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                            }`}
                            onClick={() => handleTemplateChange('custom')}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">Пользовательский шаблон</h3>
                                {selectedTemplate === 'custom' && (
                                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                                Используйте свой собственный шаблон, созданный в редакторе
                            </p>
                            
                            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs text-gray-700 dark:text-gray-200 font-mono">
                                Настройте расположение и размеры элементов по своему желанию
                            </div>

                            <div className="mt-2 flex items-center justify-center h-44">
                                {customTemplateImage ? (
                                    <img 
                                        src={customTemplateImage} 
                                        alt="Пользовательский шаблон" 
                                        className="w-auto h-full border-2 border-blue-600 rounded-lg" 
                                    />
                                ) : customTemplateError ? (
                                    <div className="flex flex-col items-center justify-center h-full text-red-500">
                                        <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <span className="text-sm text-center">{customTemplateError}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-500">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                                        <span className="ml-2">Загрузка...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Текущий выбранный шаблон</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        <strong>Шаблон:</strong> {
                            selectedTemplate === 'custom' 
                                ? 'Пользовательский шаблон' 
                                : TEMPLATE_OPTIONS.find(t => t.id === selectedTemplate)?.name
                        }<br />
                        <strong>Статус:</strong> Готов к использованию
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Информация о шаблонах</h2>
                <div className="space-y-4">
                    <div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Как это работает</h3>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-disc list-inside">
                            <li>Выбранный шаблон используется при печати этикеток</li>
                            <li>При печати система будет использовать выбранный шаблон</li>
                            <li>Вы можете создать свой собственный шаблон в редакторе этикеток</li>
                            <li><strong>Важно:</strong> Выбранный шаблон применяется при печати из раздела &quot;Генерация этикеток&quot;</li>
                        </ul>
                    </div>
                    
                    <div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">ZPL коды шаблонов</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            ZPL коды для каждого шаблона уже настроены в системе.
                        </p>
                        <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-200 font-mono">
                            <strong>Шаблон 1 (Стандартный):</strong> Классический макет с размером шрифта 24<br/>
                            <strong>Шаблон 2 (Компактный):</strong> Уменьшенный макет с размером шрифта 20<br/>
                            <strong>Шаблон 3 (Расширенный):</strong> Расширенная информация с датой печати, размер шрифта 28
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}