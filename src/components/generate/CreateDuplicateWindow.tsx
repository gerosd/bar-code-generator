'use client'

import React, {useState, useEffect, useRef, useCallback} from 'react';

export default function CreateDuplicateWindow() {
    const [scannedData, setScannedData] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [dataMatrixCount, setDataMatrixCount] = useState<number>(1);
    const [ean13Count, setEan13Count] = useState<number>(1);
    const dataMatrixCountRef = useRef<HTMLInputElement>(null);
    const ean13CountRef = useRef<HTMLInputElement>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const dupInfoRef = useRef<{ code: string; count: number } | null>(null);

    useEffect(() => {
        const handleBlur = () => {
            const active = document.activeElement as HTMLElement | null;
            const isEditingCounts = active === dataMatrixCountRef.current || active === ean13CountRef.current;
            if (!isEditingCounts && inputRef.current) {
                inputRef.current.focus();
            }
        };
        const input = inputRef.current;
        if (input) {
            input.addEventListener('blur', handleBlur);
            input.focus();
        }
        return () => {
            if (input) {
                input.removeEventListener('blur', handleBlur);
            }
        }
    }, []);

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
            const response = await fetch('/api/print', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
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
        const rusText = e.target.value;
        const engText = convertLayout(rusText);
        setScannedData(engText);
    }

	const handleEnterPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const dataMatrix = scannedData.trim();
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

	return (
		<div>
            <label htmlFor="dataMatrixCopy" className="w-full block">
                <input
                    className="w-full text-xl outline-2 rounded-lg outline-blue-600 px-2 py-1"
                    onKeyDown={handleEnterPress}
                    type='text'
                    id="dataMatrixCopy"
                    value={scannedData}
                    onChange={handleInputChange}
                    autoFocus
                    ref={inputRef}
                    autoComplete="off"
                />
            </label>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Количество DataMatrix</span>
                    <input
                        type="number"
                        min={1}
                        className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1"
                        value={dataMatrixCount}
                        onChange={(e) => setDataMatrixCount(Math.max(0, Number(e.target.value) || 0))}
                        ref={dataMatrixCountRef}
                        disabled={loading}
                    />
                </label>
                <label className="block">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Количество штрихкодов (EAN‑13)</span>
                    <input
                        type="number"
                        min={1}
                        className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1"
                        value={ean13Count}
                        onChange={(e) => setEan13Count(Math.max(0, Number(e.target.value) || 0))}
                        ref={ean13CountRef}
                        disabled={loading}
                    />
                </label>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center">
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