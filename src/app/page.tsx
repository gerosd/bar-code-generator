'use client'

import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';

interface PDFData {
    dataMatrixImage: string;
    scannedData: string;
    title?: string;
    timestamp: string;
}

export default function Home() {
    const [loading, setLoading] = useState(false);
    const [scannedData, setScannedData] = useState<string>('');

    const generatePDFWithJsPDF = useCallback((pdfData: PDFData) => {
        try {
            const doc = new jsPDF({
                orientation: "portrait",
                unit: 'mm',
                format: 'A4'
            });

            if (pdfData.title) {
                doc.setFontSize(16);
                doc.text(pdfData.title, 105, 30, { align: "center" });
            }

            doc.addImage(pdfData.dataMatrixImage, "PNG", 80, 50, 50, 50);
            doc.setFontSize(12);
            doc.text(`Данные: ${pdfData.scannedData}`, 105, 120, { align: 'center' });

            // Дата
            doc.setFontSize(10);
            doc.text(`Сгенерировано: ${pdfData.timestamp}`, 105, 140, { align: 'center' });

            // Сохранение
            doc.save(`datamatrix-${Date.now()}.pdf`);
        } catch (error) {
            throw new Error(`Ошибка создания PDF: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`);
        }
    }, [])

    const generatePDF = useCallback(async (dataToGenerate?: string) => {
        const data = dataToGenerate || scannedData;

        if (!data.trim()) {
            console.error('Нет данных для генерации PDF');
            return;
        }

        try {
            // Получаем DataMatrix изображение с сервера
            setLoading(true);
            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    scannedData: data,
                    title: 'DataMatrix код',
                    options: {
                        scale: 4,
                        includetext: false
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
        } finally {
            setLoading(false);
        }
    }, [scannedData, generatePDFWithJsPDF]);

    return (
        <>
            <input
                type="text"
                value={scannedData}
                onChange={(e) => setScannedData(e.target.value)}
            />
            <button
                onClick={() => generatePDF()}
                disabled={loading}
            >
                {loading ? 'Генерация...' : 'Скачать PDF'}
            </button>
        </>
    );
}