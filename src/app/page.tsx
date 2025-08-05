'use client'

import {Button, Card} from 'flowbite-react';
import {
    QrCode,
    FileText,
    Download,
    CheckCircle,
    Settings
} from 'lucide-react';

export default function Home() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Navigation */}
            <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-2">
                            <div
                                className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                                <QrCode className="w-5 h-5 text-white"/>
                            </div>
                            <span className="text-xl font-bold text-gray-900">ЧестныйЗнак</span>
                        </div>
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#" className="text-gray-900 hover:text-blue-600 font-medium">Главная</a>
                            <a href="#" className="text-gray-600 hover:text-blue-600">О сервисе</a>
                            <a href="#" className="text-gray-600 hover:text-blue-600">Документация</a>
                            <a href="#" className="text-gray-600 hover:text-blue-600">Поддержка</a>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Button color="blue" size="sm">
                                Войти
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                            Дублирование
                            <span
                                className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600"> {' '}Честного Знака
                            </span>
                        </h1>
                        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                            Профессиональное решение для создания дубликатов маркировки товаров.
                            Полное соответствие требованиям системы маркировки и прослеживаемости товаров.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button size="lg" color="blue">
                                <QrCode className="w-5 h-5 mr-2"/>
                                Создать дубликат
                            </Button>
                            <Button size="lg" color="gray" outline>
                                <FileText className="w-5 h-5 mr-2"/>
                                Документация
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-4 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            Возможности сервиса
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Все необходимые инструменты для эффективной работы с системой маркировки
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <Card className="hover:shadow-lg transition-shadow">
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                                    <QrCode className="w-6 h-6 text-blue-600"/>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-100">Генерация кодов</h3>
                            </div>
                            <p className="text-gray-200">
                                Создание уникальных кодов маркировки в соответствии с требованиями Честного Знака
                            </p>
                        </Card>

                        <Card className="hover:shadow-lg transition-shadow">
                            <div className="flex items-center mb-4">
                                <div
                                    className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                                    <Download className="w-6 h-6 text-purple-600"/>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-100">Экспорт в PDF</h3>
                            </div>
                            <p className="text-gray-200">
                                Создание профессиональных документов с маркировкой для печати
                            </p>
                        </Card>

                        <Card className="hover:shadow-lg transition-shadow">
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                                    <Settings className="w-6 h-6 text-red-600"/>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-100">API интеграция</h3>
                            </div>
                            <p className="text-gray-200">
                                Возможность интеграции с вашими системами через REST API
                            </p>
                        </Card>

                        <Card className="hover:shadow-lg transition-shadow">
                            <div className="flex items-center mb-4">
                                <div
                                    className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
                                    <CheckCircle className="w-6 h-6 text-indigo-600"/>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-100">Соответствие стандартам</h3>
                            </div>
                            <p className="text-gray-200">
                                Полное соответствие требованиям системы маркировки и прослеживаемости
                            </p>
                        </Card>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-indigo-600">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl font-bold text-white mb-6">
                        Готовы начать работу?
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button size="lg" color="white" className="border border-gray-300 rounded-lg cursor-pointer">
                            <QrCode className="w-5 h-5 mr-2"/>
                            Попробовать бесплатно
                        </Button>
                        <Button size="lg" color="white" className="border border-gray-300 rounded-lg cursor-pointer">
                            Связаться с нами
                        </Button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white">
                <div className="max-w-7xl mx-auto px-4 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <div className="flex items-center space-x-2 mb-4">
                                <div
                                    className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                                    <QrCode className="w-5 h-5 text-white"/>
                                </div>
                                <span className="text-xl font-bold">ЧестныйЗнак</span>
                            </div>
                            <p className="text-gray-400">
                                Профессиональное решение для дублирования маркировки товаров
                            </p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Продукт</h3>
                            <ul className="space-y-2">
                                <li><a href="#" className="text-gray-400 hover:text-white">Функции</a></li>
                                <li><a href="#" className="text-gray-400 hover:text-white">API</a></li>
                                <li><a href="#" className="text-gray-400 hover:text-white">Документация</a></li>
                                <li><a href="#" className="text-gray-400 hover:text-white">Интеграции</a></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Поддержка</h3>
                            <ul className="space-y-2">
                                <li><a href="#" className="text-gray-400 hover:text-white">Центр поддержки</a></li>
                                <li><a href="#" className="text-gray-400 hover:text-white">Контакты</a></li>
                                <li><a href="#" className="text-gray-400 hover:text-white">Статус сервиса</a></li>
                                <li><a href="#" className="text-gray-400 hover:text-white">FAQ</a></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Компания</h3>
                            <ul className="space-y-2">
                                <li><a href="#" className="text-gray-400 hover:text-white">О нас</a></li>
                                <li><a href="#" className="text-gray-400 hover:text-white">Блог</a></li>
                                <li><a href="#" className="text-gray-400 hover:text-white">Карьера</a></li>
                                <li><a href="#" className="text-gray-400 hover:text-white">Партнеры</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}