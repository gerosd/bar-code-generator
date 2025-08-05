'use client'
import { useState, useCallback, useEffect, useRef } from 'react';
import {PDFData} from "@/lib/types/PDFData";
import jsPDF from "jspdf";
import robotoBase64 from "@/lib/utils/robotoBase64";

export default function CreateDouble() {
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

    const generatePDFWithJsPDF = useCallback((pdfData: PDFData) => {
        try {
            const doc = new jsPDF({
                orientation: "landscape",
                unit: 'mm',
                format: [58, 40]
            });

            doc.addFileToVFS('Roboto.ttf', robotoBase64);
            doc.addFont('Roboto.ttf', 'Roboto', 'normal');
            doc.setFont('Roboto', 'normal');

            if (pdfData.title) {
                doc.setFontSize(16);
                doc.text(pdfData.title, 105, 30, { align: "center" });
            }

            doc.addImage(pdfData.dataMatrixImage, "PNG", 2, 2, 25, 25);
            doc.setFontSize(12);
            doc.text(`Данные: ${pdfData.scannedData}`, 105, 120, { align: 'center' });

            const pdfBlob = doc.output('blob');
            const pdfURL = URL.createObjectURL(pdfBlob);
            //window.open(pdfURL, '_blank');
            const iframe = document.createElement("iframe");
            iframe.src = pdfURL;
            iframe.style.display = "none";
            iframe.onload = () => {
                setTimeout(() => {
                    iframe.contentWindow?.print();
                    setTimeout(() => URL.revokeObjectURL(pdfURL), 1000);
                }, 500)
            };
            document.body.appendChild(iframe);
        } catch (error) {
            throw new Error(`Ошибка создания PDF: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`);
        }
    }, []);

    const generatePDF = useCallback(async (dataToGenerate?: string) => {
        const data = dataToGenerate || scannedData;

        if (!data.trim()) {
            console.error('Нет данных для генерации PDF');
            return;
        }

        try {
            // Получаем DataMatrix изображение с сервера
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
                throw new Error(errorData.error || 'Ошибка генерации DataMatrix');
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Ошибка получения данных');
            }

            generatePDFWithJsPDF(result.data);

        } catch (err) {
            console.error(err instanceof Error ? err.message : 'Ошибка при генерации PDF');
        }
    }, [scannedData, generatePDFWithJsPDF]);

    const handleEnterPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            generatePDF();
            setScannedData('');
        }
    }

    return (
        <div>
            <h1>Создание дубликата без привязки к товару</h1>
            <div>
                <input onKeyDown={handleEnterPress} type='text' value={scannedData} onChange={(e) => setScannedData(e.target.value)} autoFocus ref={inputRef} />
            </div>
        </div>
    )
}