'use client'

import { PageTitle } from '@/components/layout/PageTitle';
import CreateFromFile from "@/components/fileGenerate/CreateFromFile";
import React, {useState} from "react";
import ScanHistory from "@/components/generate/ScanHistory";

export default function FileGeneratePage() {
    const [dataMatrixCount, setDataMatrixCount] = useState<number>(1);
    const [barcodeAmount, setBarcodeAmount] = useState<number>(1);
    return(
        <div className="container mx-auto p4">
            <PageTitle title="Генерация из файла" description="Сгенерируйте DataMatrix и штрихкоды из вашего файла" />
            <div className="max-w-4xl mx-auto">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                    <CreateFromFile
                        dataMatrixCount={dataMatrixCount}
                        barcodeAmount={barcodeAmount}
                        setDataMatrixCountAction={setDataMatrixCount}
                        setBarcodeAmountAction={setBarcodeAmount}
                    />
                    <div className="mt-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white">История напечатанного</h2>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Последние напечатанные коды</p>
                        <ScanHistory
                            dataMatrixCount={dataMatrixCount}
                            barcodeAmount={barcodeAmount}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}