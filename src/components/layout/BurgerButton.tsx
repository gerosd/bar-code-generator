'use client'

import { FaBars } from 'react-icons/fa';

const BurgerButton = () => {
	const toggleMobileMenu = () => {
		document.dispatchEvent(new CustomEvent('toggleMobileMenu'));
	}

	return (
		<button
			onClick={toggleMobileMenu}
			className='p-2 text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden dark:text-gray-400 dark:hover:text-gray-200'
			aria-label='Открыть меню'
		>
			<FaBars className='h-6 w-6' />
		</button>
	)
}

export default BurgerButton;
