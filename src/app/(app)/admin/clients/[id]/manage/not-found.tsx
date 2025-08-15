import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-[400px] flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4"> Клиент не найден </h2>
                <p className="text-gray-600 mb-6"> Клиент с указанным идентификатором не существует или был удален </p>
                <Link
                    href="/admin/clients"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Вернуться к списку клиентов
                </Link>
            </div>
        </div>
    );
}
