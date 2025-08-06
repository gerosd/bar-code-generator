'use client'

import { useState, useCallback, useEffect, useRef } from 'react';

export default function CreateDuplicateWindow() {
    const [scannedData, setScannedData] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

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

    const generatePDF = useCallback(async (dataToGenerate?: string) => {
        const data = dataToGenerate || scannedData;

        if (!data.trim()) {
            console.error('Нет данных для генерации PDF');
            return;
        }

        try {
            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    scannedData: data,
                    title: 'DataMatrix code',
                    options: {
                        scale: 4,
                        includetext: true
                    }
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка генерации PDF');
            }

            // Получаем PDF как blob
            const pdfBlob = await response.blob();
            const pdfURL = URL.createObjectURL(pdfBlob);

            // Открываем PDF в новом окне или инициируем печать
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
    }, [scannedData]);

    const handleEnterPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            generatePDF();
            setScannedData('');
        }
    }

    return (
        <label htmlFor="dataMatrixCopy" className="w-100">
            <input
                className="w-full text-xl"
                onKeyDown={handleEnterPress}
                type='text'
                id="dataMatrixCopy"
                value={scannedData}
                onChange={(e) => setScannedData(e.target.value)}
                autoFocus
                ref={inputRef} />
        </label>
    )
}