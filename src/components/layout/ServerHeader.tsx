import { auth } from '@/lib/auth';
import { FaUserCircle } from 'react-icons/fa';
import BurgerButton from './BurgerButton';
import Link from 'next/link';

const ServerHeader = async () => {
    const session = await auth();

    return (
        <header className='fixed top-0 left-0 right-0 z-30 bg-white dark:bg-gray-800 shadow-md h-16 md:left-64'>
            <div className='container mx-auto px-4 h-full flex items-center justify-between'>
                <div className='flex items-center'>
                    {/* Кнопка бургер-меню, видна только на мобильных (до md) */}
                    <BurgerButton />
                    <h1 className='text-lg md:text-xl font-semibold text-gray-800 dark:text-white ml-2 md:ml-0'>
                        BarMatrix
                    </h1>
                </div>

                <div className='flex items-center space-x-2 md:space-x-4'>
                    {session?.user && (
                        <Link href='/profile' className='text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white flex items-center'>
                            <span className='hidden sm:inline mr-2 text-sm'>
                                {session.user.name || session.user.email}
                            </span>
                            {session.user.image ? (
                                <img
                                    src={session.user.image}
                                    alt={session.user.name || 'User Avatar'}
                                    className='h-8 w-8 rounded-full'
                                />
                            ) : (
                                <FaUserCircle className='h-8 w-8 text-gray-400' />
                            )}
                        </Link>
                    )}
                </div>
            </div>
        </header>
    )
}

export default ServerHeader;
