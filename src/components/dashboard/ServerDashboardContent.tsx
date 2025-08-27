import Link from "next/link";
import {Card} from "flowbite-react";
import {FaEdit, FaQrcode} from "react-icons/fa";
import {GoProjectTemplate} from "react-icons/go";

export const ServerDashboardContent = () => {
    return (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            <Link href="/generate">
                <Card className='h-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'>
                    <div className="flex items-center">
                        <div className="mr-4 bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                            <FaQrcode className="h-6 w-6 text-blue-600 dark:text-blue-300"/>
                        </div>
                        <div>
                            <h5 className='text-xl font-bold tracking-tight text-gray-900 dark:text-white'>
                                Генерация DataMatrix
                            </h5>
                            <p className='font-normal text-gray-700 dark:text-gray-400'>
                                Сгенерируйте dataMatrix с данными о товаре
                            </p>
                        </div>
                    </div>
                </Card>
            </Link>
            <Link href="/templates">
                <Card className="h-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center">
                        <div className="mr-4 bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                            <GoProjectTemplate className="h-6 w-6 text-blue-600 dark:text-blue-300"/>
                        </div>
                        <div>
                            <h5 className='text-xl font-bold tracking-tight text-gray-900 dark:text-white'>
                                Шаблоны
                            </h5>
                            <p className='font-normal text-gray-700 dark:text-gray-400'>
                                Воспользуйтесь шаблонами для этикеток
                            </p>
                        </div>
                    </div>
                </Card>
            </Link>
            <Link href="/label-editor">
                <Card className="h-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center">
                        <div className="mr-4 bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                            <FaEdit className="h-6 w-6 text-blue-600 dark:text-blue-300"/>
                        </div>
                        <div>
                            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                                Редактор шаблонов
                            </h5>
                            <p className='font-normal text-gray-700 dark:text-gray-400'>
                                Создайте свой уникальный шаблон
                            </p>
                        </div>
                    </div>
                </Card>
            </Link>
        </div>
    )
}