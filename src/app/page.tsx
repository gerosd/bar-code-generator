'use client'

import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import robotoBase64 from '@/lib/utils/robotoBase64';

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
            window.open(pdfURL, '_blank');

            setTimeout(() => URL.revokeObjectURL(pdfURL), 1000);
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