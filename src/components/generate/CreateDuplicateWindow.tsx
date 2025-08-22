'use client'

import React, {useState, useEffect, useRef, useCallback} from 'react';
import type { ProductDatabaseView } from '@/lib/types/product';
import { useCurrentClient } from '@/components/providers/ClientProvider';

export default function CreateDuplicateWindow() {
    const { currentClient } = useCurrentClient();
    const [scannedData, setScannedData] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [dataMatrixCount, setDataMatrixCount] = useState<number>(1);
    const [ean13Count, setEan13Count] = useState<number>(1);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const dupInfoRef = useRef<{ code: string; count: number } | null>(null);

    // Новые состояния для вкладок и выбора товара
    const [activeTab, setActiveTab] = useState<'scan' | 'product'>('scan');
    const [products, setProducts] = useState<ProductDatabaseView[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<ProductDatabaseView | null>(null);
    const [selectedSize, setSelectedSize] = useState<{
        chrtId: number;
        techSize: string;
        wbSize?: string;
        skus?: string[];
    } | null>(null);
    const [productsLoading, setProductsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [productInputData, setProductInputData] = useState<string>('');
    const productInputRef = useRef<HTMLInputElement>(null);

    // Состояние для отслеживания последовательных нажатий клавиш
    const keySequenceRef = useRef<string>('');
    const keyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Обработчик глобальных нажатий клавиш для определения сканера DataMatrix
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Если открыто модальное окно, не обрабатываем глобальные события
            if (confirmOpen) {
                return;
            }
            
            // Сбрасываем последовательность при нажатии других клавиш
            if (e.key !== '1' && e.key !== '0') {
                keySequenceRef.current = '';
                if (keyTimeoutRef.current) {
                    clearTimeout(keyTimeoutRef.current);
                    keyTimeoutRef.current = null;
                }
                return;
            }

            // Добавляем символ к последовательности
            keySequenceRef.current += e.key;

            // Очищаем предыдущий таймаут
            if (keyTimeoutRef.current) {
                clearTimeout(keyTimeoutRef.current);
            }

            // Устанавливаем таймаут для сброса последовательности
            keyTimeoutRef.current = setTimeout(() => {
                keySequenceRef.current = '';
            }, 1000); // 1 секунда на ввод последовательности

            // Проверяем, если последовательность равна '100110'
            if (keySequenceRef.current === '100110') {
                // Предотвращаем попадание символов последовательности в поля ввода
                e.preventDefault();
                e.stopPropagation();
                
                // Фокусируемся на соответствующем поле ввода в зависимости от активной вкладки
                if (activeTab === 'scan' && inputRef.current) {
                    inputRef.current.focus();
                } else if (activeTab === 'product' && productInputRef.current) {
                    productInputRef.current.focus();
                }
                
                // Сбрасываем последовательность
                keySequenceRef.current = '';
                if (keyTimeoutRef.current) {
                    clearTimeout(keyTimeoutRef.current);
                    keyTimeoutRef.current = null;
                }
            }
        };

        // Добавляем глобальные обработчики
        document.addEventListener('keydown', handleGlobalKeyDown);
        document.addEventListener('input', handleInput);

        return () => {
            document.removeEventListener('keydown', handleGlobalKeyDown);
            document.removeEventListener('input', handleInput);
            if (keyTimeoutRef.current) {
                clearTimeout(keyTimeoutRef.current);
            }
        };
    }, [activeTab, confirmOpen]);

    // Загрузка списка товаров
    useEffect(() => {
        if (activeTab === 'product' && products.length === 0) {
            loadProducts();
        }
    }, [activeTab, products.length]);

    // Автоматический фокус на модальном окне при открытии
    useEffect(() => {
        if (confirmOpen) {
            // Небольшая задержка для корректного рендеринга
            const timer = setTimeout(() => {
                const modalElement = document.querySelector('[data-modal="confirm"]');
                if (modalElement instanceof HTMLElement) {
                    modalElement.focus();
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [confirmOpen]);

    const loadProducts = async () => {
        setProductsLoading(true);
        try {
            const response = await fetch('/api/products');
            const result = await response.json();
            if (result.success && result.data) {
                setProducts(result.data);
            }
        } catch (error) {
            console.error('Ошибка загрузки товаров:', error);
        } finally {
            setProductsLoading(false);
        }
    };

    // Фильтрация товаров по поисковому запросу
    const filteredProducts = products.filter(product =>
        product.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.vendorCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (Array.isArray(product.sizes) && product.sizes.some(size =>
            Array.isArray(size.skus) && size.skus.some(sku =>
                sku?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        ))
    );

    // Требуется для замены русских букв на английские, т.к сканер эмулирует ввод с клавиатуры
    const layoutMap: Record<string, string> = {
        'й': 'q', 'ц': 'w', 'у': 'e', 'к': 'r', 'е': 't', 'н': 'y', 'г': 'u', 'ш': 'i', 'щ': 'o', 'з': 'p',
        'х': '[', 'ъ': ']', 'ф': 'a', 'ы': 's', 'в': 'd', 'а': 'f', 'п': 'g', 'р': 'h', 'о': 'j', 'л': 'k',
        'д': 'l', 'ж': ';', 'э': "'", 'я': 'z', 'ч': 'x', 'с': 'c', 'м': 'v', 'и': 'b', 'т': 'n', 'ь': 'm',
        'б': ',', 'ю': '.', 'Ё': '~', 'ё': '`',
        // Заглавные буквы
        'Й': 'Q', 'Ц': 'W', 'У': 'E', 'К': 'R', 'Е': 'T', 'Н': 'Y', 'Г': 'U', 'Ш': 'I', 'Щ': 'O', 'З': 'P',
        'Х': '{', 'Ъ': '}', 'Ф': 'A', 'Ы': 'S', 'В': 'D', 'А': 'F', 'П': 'G', 'Р': 'H', 'О': 'J', 'Л': 'K',
        'Д': 'L', 'Ж': ':', 'Э': '"', 'Я': 'Z', 'Ч': 'X', 'С': 'C', 'М': 'V', 'И': 'B', 'Т': 'N', 'Ь': 'M',
        'Б': '<', 'Ю': '>'
    }

	const directPrint = async (payload: any) => {
        try {
            // Добавляем выбранный шаблон из настроек клиента
            const printPayload = {
                ...payload,
                selectedTemplate: currentClient?.selectedPrintTemplate || 'template1'
            };

            const response = await fetch('/api/print', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(printPayload),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка печати');
            }
        } catch (err) {
            console.error(err instanceof Error ? err.message : 'Ошибка при печати');
        }
    };

    const convertLayout = useCallback((text: string) => {
        return text.split('').map(char => layoutMap[char] || char).join('');
    }, [layoutMap]);

    // Замена русских букв на английские с учетом регистра
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Если открыто модальное окно, не обрабатываем изменения
        if (confirmOpen) {
            return;
        }
        
        const rusText = e.target.value;
        const engText = convertLayout(rusText);
        setScannedData(engText);
    }

    // Замена русских букв для поля ввода товара
    const handleProductInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Если открыто модальное окно, не обрабатываем изменения
        if (confirmOpen) {
            return;
        }
        
        const rusText = e.target.value;
        const engText = convertLayout(rusText);
        setProductInputData(engText);
    }

    // Обработчик для перехвата входящих данных от сканера.
    // Автоматически фокусирует поле ввода и вставляет данные при получении строки, начинающейся с '10011'
    const handleInput = (e: Event) => {
        // Если открыто модальное окно, не обрабатываем события ввода
        if (confirmOpen) {
            return;
        }
        
        // Проверяем, что событие произошло в поле ввода
        const target = e.target as HTMLInputElement;
        if (target && (target.id === 'dataMatrixCopy' || target.id === 'productDataMatrixInput')) {
            const value = target.value;
            
            // Если значение начинается с '10011', значит это данные от сканера
            if (value.startsWith('10011')) {
                // Убираем префикс '10011' и устанавливаем значение
                let cleanValue = value.substring(5);
                
                // Дополнительная проверка: если в начале строки есть префикс '10011', убираем его
                if (cleanValue.startsWith('10011')) {
                    cleanValue = cleanValue.substring(5);
                }
                
                if (target.id === 'dataMatrixCopy') {
                    setScannedData(cleanValue);
                } else if (target.id === 'productDataMatrixInput') {
                    setProductInputData(cleanValue);
                }
                
                // Фокусируемся на поле ввода
                target.focus();
                // Выделяем весь текст для удобства замены
                target.select();
            }
        }
    };

    const handleEnterPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Если открыто модальное окно, не обрабатываем события Enter
        if (confirmOpen) {
            return;
        }
        
        if (e.key === 'Enter') {
            const dataMatrix = scannedData.trim().startsWith('10011') ? scannedData.trim().substring(5) : scannedData.trim();
            if (!dataMatrix || dataMatrix.length <= 12) { // От 13 минимум
                setScannedData('');
                return;
            }
            setLoading(true);
            try {
                // Проверка на повторный скан
                let shouldProceed = true;
                try {
                    const dupRes = await fetch(`/api/print?code=${encodeURIComponent(dataMatrix)}`);
                    const dupJson = await dupRes.json();
                    if (dupJson.success && dupJson.scannedBefore) {
                        dupInfoRef.current = { code: dataMatrix, count: dupJson.count };
                        setConfirmOpen(true);
                        // Ждем решения пользователя через модалку
                        shouldProceed = await new Promise<boolean>((resolve) => {
                            const handler = (e: CustomEvent) => {
                                window.removeEventListener('scan-confirm', handler as EventListener);
                                resolve(Boolean(e.detail));
                            };
                            window.addEventListener('scan-confirm', handler as EventListener);
                        });
                    }
                } catch (err) {
                    // если проверка не удалась, не блокируем печать
                    console.error(err instanceof Error ? err.message : 'Ошибка проверки дубликатов');
                }
                if (!shouldProceed) {
                    return;
                }
                // Получаем 13 цифр после первых трёх символов
                const barcodeCandidate = dataMatrix.slice(3, 16);
                const isEAN13 = /^\d{13}$/.test(barcodeCandidate);
                // Получаем данные о товаре по баркоду
                let productName = '';
                let productSize = '';
                let nmId = '';
                let vendorCode = '';
                if (isEAN13) {
                    try {
                        const res = await fetch(`/api/print?barcode=${encodeURIComponent(barcodeCandidate)}`);
                        const json = await res.json();
                        if (json.success && json.product && json.product.title) {
                            productName = json.product.title;
                            productSize = json.product.size || '';
                            nmId = json.product.nmId;
                            vendorCode = json.product.vendorCode || '';
                        }
                    } catch (err) {
                        console.error(err instanceof Error ? err.message : 'Неизвестная ошибка при обращении к API');
                    }
                }
				await directPrint({
					scannedData: dataMatrix,
					productName,
					productSize,
                    nmId,
                    vendorCode,
                    dataMatrixCount,
                    ean13Count
				});
            } finally {
                setLoading(false);
                setScannedData('');
            }
        }
    };

    // Обработка Enter для поля ввода товара
    const handleProductInputEnter = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Если открыто модальное окно, не обрабатываем события Enter
        if (confirmOpen) {
            return;
        }
        
        if (e.key === 'Enter' && selectedProduct) {
            const dataMatrix = productInputData.trim().startsWith('10011') ? productInputData.trim().substring(5) : productInputData.trim();
            if (!dataMatrix || dataMatrix.length <= 12 || !selectedSize) {
                setProductInputData('');
                return;
            }

            setLoading(true);
            try {
                const sizeBarcode = selectedSize.skus?.[0]; // Берем штрихкод из выбранного размера.
                // Печатаем DataMatrix код
                await directPrint({
                    scannedData: dataMatrix,
                    productName: selectedProduct.title || '',
                    productSize: selectedSize ? (selectedSize.wbSize || selectedSize.techSize) : '',
                    nmId: selectedProduct.nmID,
                    vendorCode: selectedProduct.vendorCode || '',
                    dataMatrixCount,
                    ean13Count,
                    diffEAN13: sizeBarcode
                });

                setProductInputData('');
            } catch (error) {
                console.error('Ошибка печати:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleConfirmAction = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter') {
            setConfirmOpen(false);
            window.dispatchEvent(new CustomEvent('scan-confirm', { detail: true }));
        }

        if (e.key === 'Escape') {
            setConfirmOpen(false);
            window.dispatchEvent(new CustomEvent('scan-confirm', { detail: false }));
        }
    }

	return (
		<div>
            {/* Вкладки */}
            <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => {
                            if (!confirmOpen) {
                                setActiveTab('scan');
                            }
                        }}
                        disabled={confirmOpen}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'scan'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        } ${confirmOpen ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        Сканирование
                    </button>
                    <button
                        onClick={() => {
                            if (!confirmOpen) {
                                setActiveTab('product');
                            }
                        }}
                        disabled={confirmOpen}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'product'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        } ${confirmOpen ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        Выбор товара
                    </button>
                </nav>
            </div>

            {/* Вкладка "Сканирование" */}
            {activeTab === 'scan' && (
                <div>
                    <label htmlFor="dataMatrixCopy" className="w-full block">
                        <span className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">
                            Введите DataMatrix код для печати (автоматический фокус при сканировании)
                        </span>
                        <input
                            className="w-full text-xl outline-2 rounded-lg outline-blue-600 px-2 py-1"
                            onKeyDown={handleEnterPress}
                            type='text'
                            id="dataMatrixCopy"
                            value={scannedData}
                            onChange={handleInputChange}
                            ref={inputRef}
                            autoComplete="off"
                            placeholder="Введите DataMatrix код..."
                        />
                    </label>
                </div>
            )}

            {/* Вкладка "Выбор товара" */}
            {activeTab === 'product' && (
                <div className="space-y-4">
                    {/* Поле ввода DataMatrix для печати */}
                    <div>
                        <label htmlFor="productDataMatrixInput" className="w-full block">
                            <span className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">
                                Введите DataMatrix код для печати (автоматический фокус при сканировании)
                            </span>
                            <input
                                className="w-full text-xl outline-2 rounded-lg outline-blue-600 px-2 py-1"
                                onKeyDown={handleProductInputEnter}
                                type='text'
                                id="productDataMatrixInput"
                                value={productInputData}
                                onChange={handleProductInputChange}
                                ref={productInputRef}
                                autoComplete="off"
                                placeholder="Введите DataMatrix код..."
                            />
                        </label>
                    </div>

                    {/* Поиск товаров */}
                    <div>
                        <label htmlFor="productSearch" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Поиск товара
                        </label>
                        <input
                            type="text"
                            id="productSearch"
                            placeholder="Введите название, артикул, бренд или штрихкод..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                            value={searchQuery}
                            onChange={(e) => {
                                // Если открыто модальное окно, не обрабатываем изменения
                                if (!confirmOpen) {
                                    setSearchQuery(e.target.value);
                                }
                            }}
                        />
                    </div>

                    {/* Список товаров */}
                    <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                        {productsLoading ? (
                            <div className="p-4 text-center text-gray-500">
                                <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                <p className="mt-2">Загрузка товаров...</p>
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                {searchQuery ? 'Товары не найдены' : 'Нет доступных товаров'}
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredProducts.slice(0, 100).map((product) => (
                                    <div
                                        key={product.nmID}
                                        className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                                            selectedProduct?.nmID === product.nmID ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                                        }`}
                                        onClick={() => {
                                            // Если открыто модальное окно, не обрабатываем клики
                                            if (!confirmOpen) {
                                                setSelectedProduct(product);
                                                setSelectedSize(null); // Сбрасываем выбранный размер при смене товара.
                                            }
                                        }}
                                    >
                                        <div className="flex items-start space-x-3">
                                            {product.photoTmUrl && (
                                                <img
                                                    src={product.photoTmUrl}
                                                    alt={product.title || ''}
                                                    className="w-12 h-12 object-cover rounded border border-gray-200 dark:border-gray-600"
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                    {product.title || 'Без названия'}
                                                </p>
                                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                                    {product.brand && (
                                                        <p>Бренд: {product.brand}</p>
                                                    )}
                                                    {product.vendorCode && (
                                                        <p>Артикул: {product.vendorCode}</p>
                                                    )}
                                                    <p>nmID: {product.nmID}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Информация о выбранном товаре */}
                    {selectedProduct && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                                Выбранный товар:
                            </h4>
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                {selectedProduct.title}
                            </p>

                            {/* Выбор размера */}
                            {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                                <div className="mt-3">
                                    <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                                        Выберите размер:
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                        {selectedProduct.sizes.map((size) => (
                                            <button
                                                key={size.chrtId}
                                                onClick={() => {
                                                    // Если открыто модальное окно, не обрабатываем клики
                                                    if (!confirmOpen) {
                                                        setSelectedSize(size);
                                                    }
                                                }}
                                                className={`p-2 text-xs rounded border transition-colors ${
                                                    selectedSize?.chrtId === size.chrtId
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                <div className="font-medium">
                                                    {size.wbSize || size.techSize}
                                                </div>
                                                {size.skus && size.skus.length > 0 && (
                                                    <div className="text-xs opacity-75">
                                                        Штрихкод: {size.skus[0]}
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    {selectedSize && (
                                        <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-800 rounded text-xs text-blue-800 dark:text-blue-200">
                                            <strong>Выбран размер:</strong> {selectedSize.wbSize || selectedSize.techSize}
                                            {selectedSize.skus && selectedSize.skus.length > 0 && (
                                                <div>Штрихкод: {selectedSize.skus[0]}</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Общие настройки количества */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="block">
                    <span className="text-base text-gray-700 dark:text-gray-300 mb-2 block">Количество DataMatrix</span>
                    <div className="flex items-center space-x-2">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    if (!confirmOpen) {
                                        setDataMatrixCount(prev => Math.max(1, prev + 10));
                                    }
                                }}
                                disabled={loading || confirmOpen}
                                className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                +10
                            </button>
                            <button
                                onClick={() => {
                                    if (!confirmOpen) {
                                        setDataMatrixCount(prev => Math.max(1, prev + 5));
                                    }
                                }}
                                disabled={loading || confirmOpen}
                                className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                +5
                            </button>
                            <button
                                onClick={() => {
                                    if (!confirmOpen) {
                                        setDataMatrixCount(prev => Math.max(1, prev + 1));
                                    }
                                }}
                                disabled={loading || confirmOpen}
                                className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                +1
                            </button>
                        </div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white min-w-[3rem] text-center">
                            {dataMatrixCount}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    if (!confirmOpen) {
                                        setDataMatrixCount(prev => Math.max(1, prev - 1));
                                    }
                                }}
                                disabled={loading || confirmOpen}
                                className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                -1
                            </button>
                            <button
                                onClick={() => {
                                    if (!confirmOpen) {
                                        setDataMatrixCount(prev => Math.max(1, prev - 5));
                                    }
                                }}
                                disabled={loading || confirmOpen}
                                className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                -5
                            </button>
                            <button
                                onClick={() => {
                                    if (!confirmOpen) {
                                        setDataMatrixCount(prev => Math.max(1, prev - 10));
                                    }
                                }}
                                disabled={loading || confirmOpen}
                                className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                -10
                            </button>
                        </div>
                    </div>
                </div>
                <div className="block">
                    <span className="text-base text-gray-700 dark:text-gray-300 mb-2 block">Количество штрихкодов (EAN‑13)</span>
                    <div className="flex items-center space-x-2">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    if (!confirmOpen) {
                                        setEan13Count(prev => Math.max(1, prev + 10));
                                    }
                                }}
                                disabled={loading || confirmOpen}
                                className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                +10
                            </button>
                            <button
                                onClick={() => {
                                    if (!confirmOpen) {
                                        setEan13Count(prev => Math.max(1, prev + 5));
                                    }
                                }}
                                disabled={loading || confirmOpen}
                                className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                +5
                            </button>
                            <button
                                onClick={() => {
                                    if (!confirmOpen) {
                                        setEan13Count(prev => Math.max(1, prev + 1));
                                    }
                                }}
                                disabled={loading || confirmOpen}
                                className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                +1
                            </button>
                        </div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white min-w-[3rem] text-center">
                            {ean13Count}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    if (!confirmOpen) {
                                        setEan13Count(prev => Math.max(1, prev - 1));
                                    }
                                }}
                                disabled={loading || confirmOpen}
                                className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                -1
                            </button>
                            <button
                                onClick={() => {
                                    if (!confirmOpen) {
                                        setEan13Count(prev => Math.max(1, prev - 5));
                                    }
                                }}
                                disabled={loading || confirmOpen}
                                className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                -5
                            </button>
                            <button
                                onClick={() => {
                                    if (!confirmOpen) {
                                        setEan13Count(prev => Math.max(1, prev - 10));
                                    }
                                }}
                                disabled={loading || confirmOpen}
                                className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                -10
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {loading && (
                <div className="mt-3 flex items-center text-sm text-gray-700 dark:text-gray-300" role="status" aria-live="polite">
                    <svg className="animate-spin mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
					Отправка на печать...
                </div>
            )}
            {confirmOpen && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onKeyDown={(e) => {
                        e.stopPropagation();
                        handleConfirmAction(e);
                    }}
                    tabIndex={-1}
                    data-modal="confirm"
                >
                    <div className="absolute inset-0 bg-black/50" onClick={() => { setConfirmOpen(false); window.dispatchEvent(new CustomEvent('scan-confirm', { detail: false })); }} />
                    <div className="relative z-10 w-full max-w-md rounded-lg bg-white dark:bg-gray-900 p-4 shadow-xl border border-gray-200 dark:border-gray-700">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Повторное сканирование</h3>
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">Этот код уже сканировался {dupInfoRef.current?.count ?? 1} раз(а). Напечатать еще?</p>
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                                onClick={() => { setConfirmOpen(false); window.dispatchEvent(new CustomEvent('scan-confirm', { detail: false })); }}
                            >
                                Отмена
                            </button>
                            <button
                                className="px-3 py-1.5 rounded-md bg-blue-600 text-white"
                                onClick={() => { setConfirmOpen(false); window.dispatchEvent(new CustomEvent('scan-confirm', { detail: true })); }}
                            >
                                Напечатать
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}