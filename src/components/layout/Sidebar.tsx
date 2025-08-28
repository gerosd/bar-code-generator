'use client'

import {signOut} from 'next-auth/react'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {FaBoxOpen, FaHome, FaQrcode, FaSignOutAlt, FaStore, FaTimes, FaUser, FaBook, FaEdit} from 'react-icons/fa'
import {GoProjectTemplate} from "react-icons/go";
import React from "react";

interface SidebarProps {
    isInsideDrawer?: boolean
    closeDrawer?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({isInsideDrawer, closeDrawer}: SidebarProps) => {
    const pathname = usePathname();

    const isActive = (path: string) => {
        if (path === '/dashboard') {
            return pathname === path
        }
        return pathname.startsWith(path)
    }

    const handleLinkClick = () => {
        if (isInsideDrawer && closeDrawer) {
            closeDrawer()
        }
    }

    const sidebarBaseClasses = isInsideDrawer
        ? 'w-64 h-full bg-white dark:bg-gray-800 shadow-md flex flex-col'
        : 'w-64 h-screen bg-white dark:bg-gray-800 shadow-md fixed left-0 top-0 flex flex-col'

    return (
        <div className={sidebarBaseClasses}>
            <div className='flex items-center justify-between h-16 border-b border-gray-200 dark:border-gray-700 px-4'>
                <Link href="/" className='text-xl font-bold text-blue-600 cursor-pointer'>BarMatrix</Link>
                {isInsideDrawer && (
                    <button
                        onClick={closeDrawer}
                        className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        aria-label='Закрыть меню'
                    >
                        <FaTimes className='w-5 h-5'/>
                    </button>
                )}
            </div>

            <nav className='flex-grow mt-6 overflow-y-auto'>
                <ul className='space-y-2 px-4'>
                    <li>
                        <Link
                            href='/dashboard'
                            onClick={handleLinkClick}
                            className={`flex items-center p-3 text-base rounded-lg transition-colors ${
                                isActive('/dashboard')
                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                                    : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <FaHome className='w-5 h-5 mr-3'/>
                            <span>Дашборд</span>
                        </Link>
                    </li>

                    <li>
                        <Link
                            href='/suppliers'
                            onClick={handleLinkClick}
                            className={`flex items-center p-3 text-base rounded-lg transition-colors ${
                                isActive('/suppliers')
                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                                    : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <FaStore className='w-5 h-5 mr-3'/>
                            <span>Поставщики</span>
                        </Link>
                    </li>

                    <li>
                        <Link
                            href="/generate"
                            onClick={handleLinkClick}
                            className={`flex items-center p-3 text-base rounded-lg transition-colors ${
                                isActive('/generate')
                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                                    : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <FaQrcode className="w-5 h-5 mr-3"/>
                            <span>Генерация datamatrix</span>
                        </Link>
                    </li>

                    <li>
                        <Link
                            href='/profile'
                            onClick={handleLinkClick}
                            className={`flex items-center p-3 text-base rounded-lg transition-colors ${
                                isActive('/profile')
                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                                    : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <FaUser className='w-5 h-5 mr-3'/>
                            <span>Профиль</span>
                        </Link>
                    </li>

                    <li>
                        <Link
                            href='/docs'
                            onClick={handleLinkClick}
                            className={`flex items-center p-3 text-base rounded-lg transition-colors ${
                                isActive('/docs')
                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                                    : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <FaBook className='w-5 h-5 mr-3'/>
                            <span>Документация</span>
                        </Link>
                    </li>

                    <li>
                        <Link
                            href="/label-editor"
                            onClick={handleLinkClick}
                            className={`flex items-center p-3 text-base rounded-lg transition-colors ${
                                isActive('/label-editor')
                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                                    : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <FaEdit className='w-5 h-5 mr-3'/>
                            <span>Редактор этикеток</span>
                        </Link>
                    </li>

                    <li>
                        <Link
                            href="/templates"
                            onClick={handleLinkClick}
                            className={`flex items-center p-3 text-base rounded-lg transition-colors ${
                                isActive('/templates')
                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                                    : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <GoProjectTemplate className='w-5 h-5 mr-3'/>
                            <span>Готовые шаблоны</span>
                        </Link>
                    </li>
                    <li>
                        <Link
                            href='/product-database'
                            onClick={handleLinkClick}
                            className={`flex items-center p-3 text-base rounded-lg transition-colors ${
                                isActive('/product-database')
                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                                    : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <FaBoxOpen className='w-5 h-5 mr-3'/>
                            <span>База товаров</span>
                        </Link>
                    </li>
                    <li>
                        <Link
                            href='/wb-suppliers'
                            onClick={handleLinkClick}
                            className={`flex items-center p-3 text-base rounded-lg transition-colors ${
                                isActive('/wb-suppliers')
                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                                    : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <FaStore className='w-5 h-5 mr-3'/>
                            <span>Поставщики WB</span>
                        </Link>
                    </li>
                </ul>
            </nav>

            <div className='mt-auto px-4 pb-6'>
                <button
                    onClick={() => {
                        handleLinkClick()
                        signOut({callbackUrl: '/'})
                    }}
                    className='flex items-center w-full p-3 text-base text-gray-900 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                >
                    <FaSignOutAlt className='w-5 h-5 mr-3'/>
                    <span>Выйти</span>
                </button>
            </div>
        </div>
    )
}

export default Sidebar
