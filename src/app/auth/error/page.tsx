import { AuthErrorDisplay } from '@/components/auth/AuthErrorDisplay'
import { Suspense } from 'react'

// Принудительно указываем Next.js рендерить эту страницу динамически,
// так как она зависит от searchParams, которые доступны только во время запроса.
export const dynamic = 'force-dynamic'

// Эта страница остается серверным компонентом
const AuthErrorPage = () => {
	return (
		<div className='flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900'>
			{/* Оборачиваем клиентский компонент, использующий useSearchParams, в Suspense */}
			<Suspense fallback={<div className='text-center text-gray-500'>Загрузка ошибки...</div>}>
				<AuthErrorDisplay />
			</Suspense>
		</div>
	)
}

export default AuthErrorPage
