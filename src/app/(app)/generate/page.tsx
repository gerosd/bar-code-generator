import CreateDuplicateWindow from "@/components/generate/CreateDuplicateWindow";
import { PageTitle } from "@/components/layout/PageTitle";

export default function GeneratePage() {
    return (
        <div className="container mx-auto p-4">
            <PageTitle
                title="Генерация этикеток"
                description="Сканируйте DataMatrix — автоматически распечатается этикетка. Если найден EAN‑13, он тоже будет распечатан."
            />

            <div className="max-w-3xl mx-auto">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                    <div className="mb-3">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Сканирование</h2>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Наведите сканер на код и подтвердите ввод. Фокус в поле поддерживается автоматически.
                        </p>
                    </div>
                    <CreateDuplicateWindow />
                </div>
            </div>
        </div>
    );
}