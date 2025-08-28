import { Button, Card } from 'flowbite-react';
import { QrCode, FileText, CheckCircle, User, Book, Edit, BookOpen, Store, LucideBookTemplate } from 'lucide-react';
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function Home() {
    const session = await auth();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900">
            {/* Navigation */}
            <nav className="dark:bg-gray-900 backdrop-blur-sm border-b border-black">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-2">
                            <div
                                className="w-8 h-8 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-lg flex items-center justify-center">
                                <QrCode className="w-5 h-5 text-white"/>
                            </div>
                            <span className="text-xl font-bold text-gray-200">BarMatrix</span>
                        </div>
                        <div className="hidden md:flex items-center space-x-8">
                            <Link href="/" className="text-gray-200 hover:text-blue-300">Главная</Link>
                            <Link href="/docs" className="text-gray-200 hover:text-blue-300">Документация</Link>
                        </div>
                        <div className="flex items-center space-x-4">
                            {!session?.user?.name ? (
                                <Link href="/auth/signin"
                                    className="text-white bg-blue-600 py-2 px-5 rounded-4xl hover:bg-blue-800 duration-75 transition">
                                    Войти
                                </Link>
                            ) : (
                                <Link href="/dashboard" className="text-white bg-blue-600 py-2 px-5 rounded-4xl hover:bg-blue-800 duration-75 transition">
                                    Панель управления
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h1 className="text-5xl md:text-6xl font-bold text-gray-200 mb-6">
                            Система управления
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600"> {' '}маркировкой товаров
                            </span>
                        </h1>
                        <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto">
                            Профессиональная платформа для генерации кодов, управления клиентами, 
                            поставщиками и создания этикеток в соответствии с требованиями системы маркировки.
                        </p>
                        {!session?.user?.name && (
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link href="/auth/signin">
                                    <Button size="lg" color="blue" className='cursor-pointer'>
                                        <QrCode className="w-5 h-5 mr-2"/>
                                        Начать работу
                                    </Button>
                                </Link>
                                <Link href="/docs">
                                    <Button size="lg" color="gray" className='cursor-pointer' outline>
                                        <FileText className="w-5 h-5 mr-2"/>
                                        Документация
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Main Features Section */}
            <section className="py-20 px-4 bg-gray-900">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-100 mb-4">
                            Основные возможности
                        </h2>
                        <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                            Все необходимые инструменты для эффективной работы с системой маркировки
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Генерация кодов */}
                        <Card className="hover:shadow-lg transition-shadow bg-white dark:bg-gray-800">
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                                    <QrCode className="w-6 h-6 text-blue-600"/>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Генерация кодов</h3>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                Создание уникальных кодов маркировки в соответствии с требованиями системы
                            </p>
                            {session?.user?.name && (
                                <Link href="/generate">
                                    <Button color="blue" className="w-full">
                                        Перейти к генерации
                                    </Button>
                                </Link>
                            )}
                        </Card>

                        {/* Редактор этикеток */}
                        <Card className="hover:shadow-lg transition-shadow bg-white dark:bg-gray-800">
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                                    <Edit className="w-6 h-6 text-green-600"/>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Редактор этикеток</h3>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                Создание и редактирование дизайна этикеток с настраиваемыми параметрами
                            </p>
                            {session?.user?.name && (
                                <Link href="/label-editor">
                                    <Button color="green" className="w-full">
                                        Открыть редактор
                                    </Button>
                                </Link>
                            )}
                        </Card>

                        {/* Поставщики */}
                        <Card className="hover:shadow-lg transition-shadow bg-white dark:bg-gray-800">
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                                    <Store className="w-6 h-6 text-orange-600"/>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Поставщики</h3>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                Интеграция с поставщиками и управление товарными данными
                            </p>
                            {session?.user?.name && (
                                <Link href="/suppliers">
                                    <Button color="orange" className="w-full">
                                        Управлять поставщиками
                                    </Button>
                                </Link>
                            )}
                        </Card>

                        {/* Шаблоны */}
                        <Card className="hover:shadow-lg transition-shadow bg-white dark:bg-gray-800">
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
                                    <LucideBookTemplate className="w-6 h-6 text-indigo-600"/>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Готовые шаблоны</h3>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                Библиотека готовых шаблонов этикеток для быстрого старта
                            </p>
                            {session?.user?.name && (
                                <Link href="/templates">
                                    <Button color="indigo" className="w-full">
                                        Просмотреть шаблоны
                                    </Button>
                                </Link>
                            )}
                        </Card>

                        {/* Профиль */}
                        <Card className="hover:shadow-lg transition-shadow bg-white dark:bg-gray-800">
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mr-4">
                                    <User className="w-6 h-6 text-pink-600"/>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Профиль</h3>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                Управление личными данными и настройками аккаунта
                            </p>
                            {session?.user?.name && (
                                <Link href="/profile">
                                    <Button color="pink" className="w-full">
                                        Открыть профиль
                                    </Button>
                                </Link>
                            )}
                        </Card>
                    </div>
                </div>
            </section>

            {/* Admin Features Section */}
            {session?.user?.name && (
                <section className="py-20 px-4 bg-gray-800">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl font-bold text-gray-100 mb-4">
                                Административные функции
                            </h2>
                            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                                Расширенные возможности для администраторов системы
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {/* База товаров */}
                            <Card className="hover:shadow-lg transition-shadow bg-white dark:bg-gray-700">
                                <div className="flex items-center mb-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                                        <BookOpen className="w-6 h-6 text-blue-600"/>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">База товаров</h3>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 mb-4">
                                    Централизованное управление товарной базой и каталогом
                                </p>
                                <Link href="/product-database" className="mt-auto">
                                    <Button color="blue" className="w-full">
                                        Управлять базой
                                    </Button>
                                </Link>
                            </Card>

                            {/* Поставщики WB */}
                            <Card className="hover:shadow-lg transition-shadow bg-white dark:bg-gray-700">
                                <div className="flex items-center mb-4">
                                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                                        <Store className="w-6 h-6 text-orange-600"/>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Поставщики WB</h3>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 mb-4">
                                    Интеграция с поставщиками Wildberries и управление данными
                                </p>
                                <Link href="/wb-suppliers" className="mt-auto">
                                    <Button color="orange" className="w-full">
                                        Управлять WB поставщиками
                                    </Button>
                                </Link>
                            </Card>
                        </div>
                    </div>
                </section>
            )}

            {/* Quick Access Section */}
            {session?.user?.name && (
                <section className="py-20 px-4 bg-gradient-to-r from-blue-900 to-indigo-900">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-4xl font-bold text-white mb-6">
                            Быстрый доступ
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Link href="/dashboard">
                                <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-white dark:bg-gray-800">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle className="w-8 h-8 text-blue-600"/>
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Дашборд</h3>
                                        <p className="text-gray-600 dark:text-gray-400">Обзор системы и статистика</p>
                                    </div>
                                </Card>
                            </Link>
                            <Link href="/docs">
                                <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-white dark:bg-gray-800">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Book className="w-8 h-8 text-indigo-600"/>
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Документация</h3>
                                        <p className="text-gray-600 dark:text-gray-400">Руководства и инструкции</p>
                                    </div>
                                </Card>
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* Footer */}
            <footer className="bg-gray-900 text-white">
                <div className="max-w-7xl mx-auto px-4 py-12 flex align-center">
                    <div>
                        <div className="flex items-center space-x-2 mb-4">
                            <div
                                className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                                <QrCode className="w-5 h-5 text-white"/>
                            </div>
                            <span className="text-xl font-bold">BarMatrix</span>
                        </div>
                        <p className="text-gray-400">
                            Профессиональная платформа для управления маркировкой товаров
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}