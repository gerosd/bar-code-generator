import { Metadata } from 'next'
import { FaQrcode, FaUsers, FaStore, FaCog, FaDownload, FaUserCog } from 'react-icons/fa'

export const metadata: Metadata = {
    title: 'Документация | BarMatrix',
    description: 'Подробная документация по использованию системы генерации штрих-кодов BarMatrix'
}

const DocsPage = () => {
    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    📚 Документация BarMatrix
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                    Полное руководство по использованию системы генерации штрих-кодов DataMatrix
                </p>
            </div>

            <div className="grid gap-8">
                {/* Основные функции */}
                <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <FaQrcode className="mr-3 text-blue-600" />
                        Основные функции
                    </h2>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200">
                                Генерация штрих-кодов
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Создание DataMatrix штрих-кодов для товаров с возможностью настройки размера, 
                                формата и содержимого. Поддерживается пакетная генерация и экспорт в PDF.
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                                <li>Создание одиночных штрих-кодов</li>
                                <li>Пакетная генерация из файлов</li>
                                <li>Настройка параметров печати</li>
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200">
                                Управление клиентами
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Система управления клиентами с разграничением доступа и настройкой 
                                индивидуальных параметров для каждого клиента.
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                                <li>Создание и редактирование клиентов</li>
                                <li>Управление пользователями клиента</li>
                                <li>Настройка прав доступа</li>
                                <li>Мониторинг активности</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Генерация штрих-кодов */}
                <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <FaQrcode className="mr-3 text-blue-600" />
                        Генерация DataMatrix штрих-кодов
                    </h2>
                    
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
                                Пошаговое руководство
                            </h3>
                            <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
                                <li>Перейдите в раздел "Генерация datamatrix"</li>
                                <li>Укажите количество печатаемых DataMatrix и Штрих-кодов</li>
                                <li>Отсканируйте нужный DataMatrix или Штрих-код</li>
                                <li>Получите распечатанные копии</li>
                            </ol>
                        </div>

                        <div>
                            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
                                История сканирования
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Все созданные штрих-коды сохраняются в истории с возможностью повторного 
                                использования и анализа статистики.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Управление клиентами */}
                <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <FaUsers className="mr-3 text-blue-600" />
                        Управление клиентами
                    </h2>
                    
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
                                Создание нового клиента
                            </h3>
                            <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
                                <li>Перейдите в раздел "Управление клиентами"</li>
                                <li>Нажмите "Добавить клиента"</li>
                                <li>Заполните обязательные поля</li>
                                <li>Настройте параметры доступа</li>
                                <li>Сохраните клиента</li>
                            </ol>
                        </div>

                        <div>
                            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
                                Управление пользователями клиента
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-3">
                                Каждый клиент может иметь несколько пользователей с разными уровнями доступа:
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                                <li><strong>Администратор клиента:</strong> полный доступ к настройкам</li>
                                <li><strong>Пользователь:</strong> создание штрих-кодов и просмотр истории</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Поставщики */}
                <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <FaStore className="mr-3 text-blue-600" />
                        Управление поставщиками
                    </h2>
                    
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
                                Добавление поставщика
                            </h3>
                            <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
                                <li>Перейдите в раздел "Поставщики"</li>
                                <li>Нажмите "Добавить поставщика"</li>
                                <li>Настройте API ключи для интеграции</li>
                                <li>Сохраните настройки</li>
                            </ol>
                        </div>

                        <div>
                            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
                                Интеграция с Wildberries
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-3">
                                Система поддерживает интеграцию с API Wildberries:
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                                <li>Автоматическое получение данных о товарах</li>
                                <li>Синхронизация остатков</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Администрирование */}
                <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <FaCog className="mr-3 text-blue-600" />
                        Администрирование системы
                    </h2>
                    
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
                                Управление всеми клиентами
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-3">
                                Администраторы имеют доступ к управлению всеми клиентами системы:
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                                <li>Просмотр статистики по клиентам</li>
                                <li>Управление правами доступа</li>
                                <li>Мониторинг использования ресурсов</li>
                                <li>Техническая поддержка</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
                                Поставщики Wildberries
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Управление интеграциями с поставщиками Wildberries:
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                                <li>Настройка API подключений</li>
                                <li>Мониторинг состояния интеграций</li>
                                <li>Управление квотами и лимитами</li>
                                <li>Логирование ошибок и отладка</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Безопасность */}
                <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <FaUserCog className="mr-3 text-blue-600" />
                        Безопасность и права доступа
                    </h2>
                    
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
                                Роли пользователей
                            </h3>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Администратор</h4>
                                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                        <li>• Полный доступ ко всем функциям</li>
                                        <li>• Управление клиентами</li>
                                        <li>• Настройка системы</li>
                                        <li>• Просмотр логов</li>
                                    </ul>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Администратор клиента</h4>
                                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                        <li>• Управление пользователями клиента</li>
                                        <li>• Настройка параметров</li>
                                        <li>• Просмотр статистики</li>
                                        <li>• Генерация штрих-кодов</li>
                                    </ul>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Пользователь</h4>
                                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                        <li>• Создание штрих-кодов</li>
                                        <li>• Просмотр истории</li>
                                        <li>• Работа с поставщиками</li>
                                        <li>• Ограниченные настройки</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
                                Аутентификация
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-3">
                                Система использует современные методы аутентификации:
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                                <li>NextAuth.js для управления сессиями</li>
                                <li>Поддержка OAuth провайдеров</li>
                                <li>Двухфакторная аутентификация</li>
                                <li>Безопасное хранение паролей</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Поддержка */}
                <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <FaDownload className="mr-3 text-blue-600" />
                        Поддержка и обновления
                    </h2>
                    
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
                                Техническая поддержка
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-3">
                                Если у вас возникли вопросы или проблемы:
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                                <li>Обратитесь к администратору системы</li>
                                <li>Проверьте раздел "История сканирования" для диагностики</li>
                                <li>Обратитесь в службу поддержки</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
                                Обновления системы
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Система регулярно обновляется для улучшения функциональности и безопасности. 
                                Все обновления проходят тестирование и внедряются с минимальными перерывами в работе.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}

export default DocsPage 