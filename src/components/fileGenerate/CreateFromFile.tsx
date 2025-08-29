import React, {useState} from "react";
import FileUpload from "./FileUpload";

interface ProcessedData {
    scannedData: string;
    productName?: string;
    productSize?: string;
    nmId?: string;
    vendorCode?: string;
    barcode?: string;
}

interface CreateFromFileProps {
    dataMatrixCount: number;
    barcodeAmount: number;
    setDataMatrixCountAction: (value: number) => void;
    setBarcodeAmountAction: (value: number) => void;
}

export default function CreateFromFile({
                                           dataMatrixCount,
                                           barcodeAmount,
                                           setBarcodeAmountAction,
                                           setDataMatrixCountAction
                                       }: CreateFromFileProps) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [processedData, setProcessedData] = useState<ProcessedData[]>([]);

    const handleDataProcessed = (data: ProcessedData[]) => {
        setProcessedData(data);
        // Если есть данные, можно автоматически установить значения по умолчанию
        if (data.length > 0) {
            setDataMatrixCountAction(1);
            setBarcodeAmountAction(1);
        }
    };

    return (
        <div>
            <FileUpload 
                file={file} 
                setFile={setFile} 
                loading={loading} 
                setLoading={setLoading}
                onDataProcessed={handleDataProcessed}
            />

            {/* Информация о загруженном файле */}
            {processedData.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                        Файл успешно обработан
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        Загружено {processedData.length} элементов. Используйте элементы выше для настройки количества печати и запуска процесса построчной печати.
                    </p>
                    <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                        <p>• Используйте AmountControl для настройки количества печати для каждой строки</p>
                        <p>• Нажмите "Печать текущей строки" для печати без перехода</p>
                        <p>• Нажмите "Далее" для печати и перехода к следующей строке</p>
                    </div>
                </div>
            )}
        </div>
    )
}