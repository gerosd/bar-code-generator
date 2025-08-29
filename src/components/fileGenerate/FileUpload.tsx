import React, { useState } from "react";
import AmountControl from "@/components/shared/AmountControl";
import getProductData from "@/lib/api/getProductData";

interface FileUploadProps {
    file: File | null;
    setFile: (file: File | null) => void;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    onDataProcessed: (data: ProcessedData[]) => void;
}

interface ProcessedData {
    scannedData: string;
    productName?: string;
    productSize?: string;
    nmId?: string;
    vendorCode?: string;
    barcode?: string;
}

interface PrintItem {
    data: ProcessedData;
    dataMatrixCount: number;
    barcodeCount: number;
}

export default function FileUpload({ file, setFile, loading, setLoading, onDataProcessed }: FileUploadProps) {
    const [processedData, setProcessedData] = useState<ProcessedData[]>([]);
    const [printQueue, setPrintQueue] = useState<PrintItem[]>([]);
    const [currentRowIndex, setCurrentRowIndex] = useState(0);
    const [isPrinting, setIsPrinting] = useState(false);
    const [dataMatrixCount, setDataMatrixCount] = useState(1);
    const [barcodeAmount, setBarcodeAmount] = useState(1);
    const [processingStatus, setProcessingStatus] = useState<string>('');

    // Функция для извлечения штрихкода из строки
    const extractBarcode = (str: string): string => {
        // Ищем по шаблону 010 + цифры + буква/символ
        const match = str.match(/010(\d+)[a-zA-Z]/);
        if (match) {
            return match[1];
        }
        // Если ничего не подошло, возвращаем исходную строку
        return str;
    };

    // Функция для чтения и обработки CSV файла
    const processCSVFile = async (file: File): Promise<ProcessedData[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const text = e.target?.result as string;
                    const lines = text.split('\n').filter(line => line.trim());
                    
                    if (lines.length === 0) {
                        reject(new Error('Файл пуст или не содержит данных'));
                        return;
                    }
                    
                    // Пропускаем заголовок, если он есть
                    const dataLines = lines.slice(1);
                    
                    if (dataLines.length === 0) {
                        reject(new Error('Файл содержит только заголовок, данных нет'));
                        return;
                    }
                    
                    const processed: ProcessedData[] = [];
                    
                    for (let i = 0; i < dataLines.length; i++) {
                        const line = dataLines[i];
                        setProcessingStatus(`Обработка строки ${i + 1} из ${dataLines.length}...`);
                        
                        const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
                        
                        // Предполагаем, что первая колонка содержит DataMatrix код
                        const scannedData = columns[0] || '';
                        
                        if (!scannedData) {
                            console.warn(`Строка ${i + 1}: Пустая строка, пропускаем`);
                            continue;
                        }
                        
                        const barcode = extractBarcode(scannedData);

                        if (!barcode || barcode === scannedData) {
                            console.warn(`Строка ${i + 1}: Не удалось извлечь штрихкод из "${scannedData}"`);
                            // Добавляем элемент с базовыми данными
                            processed.push({
                                scannedData,
                                productName: 'Неизвестный товар',
                                productSize: 'Не указан',
                                nmId: 'Не указан',
                                vendorCode: 'Не указан',
                                barcode: scannedData,
                            });
                            continue;
                        }

                        try {
                            const productData = await getProductData(barcode);
                            
                            if (productData && productData.productName) {
                                processed.push({
                                    scannedData,
                                    productName: productData.productName,
                                    productSize: productData.productSize || 'Не указан',
                                    nmId: productData.nmId || 'Не указан',
                                    vendorCode: productData.vendorCode || 'Не указан',
                                    barcode,
                                });
                            } else {
                                console.warn(`Строка ${i + 1}: Не удалось получить данные для штрихкода ${barcode}`);
                                // Добавляем элемент с базовыми данными
                                processed.push({
                                    scannedData,
                                    productName: 'Товар не найден',
                                    productSize: 'Не указан',
                                    nmId: 'Не указан',
                                    vendorCode: 'Не указан',
                                    barcode,
                                });
                            }
                        } catch (error) {
                            console.error(`Ошибка при получении данных для штрихкода ${barcode}:`, error);
                            // Добавляем элемент с базовыми данными, если не удалось получить информацию о товаре
                            processed.push({
                                scannedData,
                                productName: 'Ошибка загрузки',
                                productSize: 'Не указан',
                                nmId: 'Не указан',
                                vendorCode: 'Не указан',
                                barcode,
                            });
                        }
                    }
                    
                    setProcessingStatus('');
                    resolve(processed);
                } catch (error) {
                    setProcessingStatus('');
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                setProcessingStatus('');
                reject(new Error('Ошибка чтения файла'));
            };
            reader.readAsText(file, 'UTF-8');
        });
    };

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!file) {
            alert('Пожалуйста, выберите файл');
            return;
        }
        
        if (file.type !== 'text/csv') {
            alert('Пожалуйста, выберите файл CSV');
            setFile(null);
            return;
        }

        try {
            setProcessingStatus('Начинаю обработку файла...');
            
            const data = await processCSVFile(file);
            setProcessedData(data);
            onDataProcessed(data);
            
            // Создаем очередь печати с настройками по умолчанию
            const queue = data.map(item => ({
                data: item,
                dataMatrixCount: dataMatrixCount,
                barcodeCount: barcodeAmount
            }));
            setPrintQueue(queue);
            setCurrentRowIndex(0);
            
        } catch (error) {
            console.error('Ошибка при обработке файла:', error);
            alert('Произошла ошибка при обработке файла');
        } finally {
            setLoading(false);
        }
    };

    // Функция для печати текущей строки
    const printCurrentRow = async (): Promise<boolean> => {
        if (currentRowIndex >= printQueue.length) return false;

        const currentItem = printQueue[currentRowIndex];
        if (!currentItem) return false;

        try {
            const printData = {
                scannedData: currentItem.data.scannedData,
                productName: currentItem.data.productName,
                productSize: currentItem.data.productSize,
                nmId: currentItem.data.nmId,
                vendorCode: currentItem.data.vendorCode,
                dataMatrixCount: dataMatrixCount,
                barcodeAmount: barcodeAmount,
                selectedTemplate: 'template1' as const
            };

            const response = await fetch('/api/print', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(printData),
            });

            if (!response.ok) {
                throw new Error('Ошибка печати');
            }

            return true;
        } catch (error) {
            console.error('Ошибка печати элемента:', error);
            return false;
        }
    };

    // Функция для перехода к следующей строке
    const goToNextRow = async () => {
        if (currentRowIndex >= printQueue.length - 1) {
            return;
        }

        // Печатаем текущую строку
        setIsPrinting(true);
        const success = await printCurrentRow();
        setIsPrinting(false);

        if (success) {
            // Переходим к следующей строке
            setCurrentRowIndex(prev => prev + 1);
        } else {
            alert(`Ошибка печати элемента ${currentRowIndex + 1}`);
        }
    };

    // Получаем текущий элемент для отображения
    const currentItem = printQueue[currentRowIndex];

    return (
        <div className="space-y-6">
            <form
                className="flex flex-col gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow"
                onSubmit={handleFormSubmit}
            >
                <label
                    htmlFor="fileInput"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
                >
                    Загрузите ваш CSV файл
                </label>
                <div className="flex items-center gap-3">
                    <input
                        type="file"
                        id="fileInput"
                        accept=".csv"
                        onChange={(e) => {
                            const selectedFile = e.target.files?.[0] || null;
                            setFile(selectedFile);
                            if (selectedFile) {
                                // Сбрасываем предыдущие данные при выборе нового файла
                                setProcessedData([]);
                                setPrintQueue([]);
                                setCurrentRowIndex(0);
                            }
                        }}
                        className="block cursor-pointer w-full text-sm text-gray-900 dark:text-gray-200 file:mr-4 file:py-2 file:px-4
                                   file:rounded-md file:border-0
                                   file:text-sm file:font-semibold
                                   file:bg-indigo-50 file:text-indigo-700
                                   hover:file:bg-indigo-100
                                   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {file && (
                        <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-xs">
                            {file.name}
                        </span>
                    )}
                </div>
                
                <button
                    type="submit"
                    disabled={!file || loading}
                    className={`mt-2 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm
                        text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                        transition-colors duration-150
                        ${(!file || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg"
                                 fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                        strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor"
                                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                            Обработка...
                        </>
                    ) : (
                        'Обработать файл'
                    )}
                </button>
                
                {/* Статус обработки */}
                {processingStatus && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                        <div className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                            <span className="text-sm text-yellow-800 dark:text-yellow-200">{processingStatus}</span>
                        </div>
                    </div>
                )}
            </form>

            {/* Отображение текущей строки для печати */}
            {currentItem && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            Строка {currentRowIndex + 1} из {printQueue.length}
                        </h3>
                    </div>
                    
                    <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Информация о товаре */}
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                                    Информация о товаре
                                </h4>
                                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                    <p><strong>DataMatrix:</strong> {currentItem.data.scannedData}</p>
                                    <p><strong>Товар:</strong> {currentItem.data.productName}</p>
                                    <p><strong>Размер:</strong> {currentItem.data.productSize || 'Не указан'}</p>
                                    <p><strong>Артикул ВБ:</strong> {currentItem.data.nmId || 'Не указан'}</p>
                                    <p><strong>Артикул продавца:</strong> {currentItem.data.vendorCode || 'Не указан'}</p>
                                    {currentItem.data.barcode && (
                                        <p><strong>Штрихкод:</strong> {currentItem.data.barcode}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Кнопка управления */}
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={goToNextRow}
                                disabled={isPrinting || currentRowIndex >= printQueue.length - 1}
                                className="px-4 py-2 cursor-pointer bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {currentRowIndex >= printQueue.length - 1 ? 'Завершено' : 'Напечатать и перейти к следующей строке'}
                            </button>
                        </div>
                        
                        {/* Прогресс */}
                        <div className="mt-4">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${((currentRowIndex + 1) / printQueue.length) * 100}%` }}
                                ></div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 text-center">
                                Обработано {currentRowIndex + 1} из {printQueue.length} строк
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Список всех строк для обзора */}
            {processedData.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            Все строки файла ({processedData.length} элементов)
                        </h3>
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto">
                        {printQueue.map((item, index) => (
                            <div 
                                key={index} 
                                className={`p-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 cursor-pointer transition-colors
                                    ${index === currentRowIndex 
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' 
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                onClick={() => setCurrentRowIndex(index)}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 dark:text-gray-100">
                                            {item.data.productName}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {item.data.scannedData}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-xs px-2 py-1 rounded-full ${
                                            index === currentRowIndex 
                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                : index < currentRowIndex
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                        }`}>
                                            {index === currentRowIndex ? 'Текущая' : index < currentRowIndex ? 'Готово' : 'Ожидает'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <AmountControl
                setBarcodeAmountAction={setBarcodeAmount}
                setDataMatrixCountAction={setDataMatrixCount}
                confirmOpen={false}
                loading={isPrinting}
                dataMatrixCount={dataMatrixCount}
                barcodeAmount={barcodeAmount}
            />
        </div>
    );
}