'use client'

import React, { useState } from 'react';
import CreateDuplicateWindow from "@/components/generate/CreateDuplicateWindow";
import ScanHistory from "@/components/generate/ScanHistory";
import { PageTitle } from "@/components/layout/PageTitle";

export default function GeneratePage() {
    const [dataMatrixCount, setDataMatrixCount] = useState<number>(1);
    const [barcodeAmount, setBarcodeAmount] = useState<number>(1);
    return (
        <div className="container mx-auto p-4">
            <PageTitle
                title="Генерация этикеток"
                description="Два режима работы: автоматическое сканирование DataMatrix с загрузкой данных из БД или ручной выбор товара с последующим сканированием DataMatrix для печати с корректными данными."
            />

            <div className="max-w-4xl mx-auto">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                    <div className="mb-3">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Генерация этикеток</h2>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Выберите режим работы: автоматическое сканирование или ручной выбор товара с последующим сканированием. Символы <span className="text-gray-300 text-base">100110</span> в начале строки - служебные и не учитываются при печати
                        </p>
                    </div>
                    <CreateDuplicateWindow 
                        dataMatrixCount={dataMatrixCount}
                        setDataMatrixCountAction={setDataMatrixCount}
                        barcodeAmount={barcodeAmount}
                        setBarcodeAmountAction={setBarcodeAmount}
                    />
                </div>
                <div className="mt-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">История сканирования</h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Последние отсканированные коды</p>
                    <ScanHistory 
                        dataMatrixCount={dataMatrixCount}
                        barcodeAmount={barcodeAmount}
                    />
                </div>
            </div>
        </div>
    );
}