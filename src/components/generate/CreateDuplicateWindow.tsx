'use client'

import {useState, useEffect, useRef, useCallback} from 'react';

export default function CreateDuplicateWindow() {
    const [scannedData, setScannedData] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleBlur = () => {
            if (inputRef.current) {
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

    const printPDF = async (payload: any) => {
        try {
            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка генерации PDF');
            }
            const pdfBlob = await response.blob();
            const pdfURL = URL.createObjectURL(pdfBlob);
            const iframe = document.createElement('iframe');
            iframe.src = pdfURL;
            iframe.style.display = 'none';
            iframe.onload = () => {
                setTimeout(() => {
                    iframe.contentWindow?.print();
                    setTimeout(() => URL.revokeObjectURL(pdfURL), 1000);
                }, 500);
            };
            document.body.appendChild(iframe);
        } catch (err) {
            console.error(err instanceof Error ? err.message : 'Ошибка при генерации PDF');
        }
    };

    const convertLayout = useCallback((text: string) => {
        return text.split('').map(char => layoutMap[char] || char).join('');
    }, []);

    // Замена русских букв на английские с учетом регистра
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rusText = e.target.value;
        const engText = convertLayout(rusText);
        setScannedData(engText);
    }

    const handleEnterPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const dataMatrix = scannedData.trim();
            if (!dataMatrix || dataMatrix.length <= 16) { // 3 + 13 минимум
                setScannedData('');
                return;
            }
            setLoading(true);
            try {
                // Получаем 13 цифр после первых трёх символов
                const barcodeCandidate = dataMatrix.slice(3, 16);
                const isEAN13 = /^\d{13}$/.test(barcodeCandidate);
                // Получаем данные о товаре по баркоду
                let productName = '';
                let productSize = '';
                if (isEAN13) {
                    try {
                        const res = await fetch(`/api/generate-pdf?barcode=${encodeURIComponent(barcodeCandidate)}`);
                        const json = await res.json();
                        if (json.success && json.product && json.product.title) {
                            productName = json.product.title;
                            productSize = json.product.size || '';
                        }
                    } catch (err) {
                        console.error(err instanceof Error ? err.message : 'Неизвестная ошибка при обращении к API');
                        //productName и productSize останутся пустыми
                    }
                }
                // Печать комбинированного PDF (две страницы: DM и EAN-13 при наличии)
                await printPDF({
                    scannedData: dataMatrix,
                    productName,
                    productSize,
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
                    disabled={loading}
                />
            </label>
            {loading && (
                <div className="mt-3 flex items-center text-sm text-gray-700 dark:text-gray-300" role="status" aria-live="polite">
                    <svg className="animate-spin mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    Генерация PDF...
                </div>
            )}
        </div>
    );
}