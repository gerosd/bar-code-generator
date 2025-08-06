'use client'

import { Alert, Card } from 'flowbite-react'
import { useSearchParams } from 'next/navigation'
import { HiInformationCircle } from 'react-icons/hi'

// Словарь ошибок
const errorMessages: Record<string, string> = {
	Configuration: 'Ошибка конфигурации сервера.',
	AccessDenied: 'Доступ запрещен.',
	Verification: 'Токен верификации истек или недействителен.',
	Default: 'Произошла ошибка аутентификации.',
	CredentialsSignin: 'Неверные учетные данные',
	// Добавьте другие специфичные ошибки NextAuth по мере необходимости
}

export const AuthErrorDisplay = () => {
	const searchParams = useSearchParams()
	const error = searchParams.get('error')

	const errorMessage = error && errorMessages[error] ? errorMessages[error] : errorMessages.Default

	return (
		<Card className='max-w-sm mx-auto'>
			<div className='flex justify-center p-4 border-b border-gray-200 dark:border-gray-700'>
				<h1 className='text-xl font-bold text-red-600 dark:text-red-500'>Ошибка входа</h1>
			</div>
			<div className='p-6'>
				<Alert color='failure' icon={HiInformationCircle}>
					<span>
						<span className='font-medium'>Внимание!</span> {errorMessage}
					</span>
				</Alert>
				{/* Можно добавить кнопку "Вернуться на главную" или "Попробовать снова" */}
			</div>
		</Card>
	)
}
