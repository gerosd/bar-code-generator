'use client'
import { LoginButton } from '@telegram-auth/react'
import { Spinner } from 'flowbite-react'
import { signIn, SignInAuthorizationParams } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { FC, useState } from 'react'

interface TGLoginButtonProps {
	BOT_USERNAME: string
}

interface TelegramAuthData {
    id: number
    first_name: string
    last_name?: string
    username?: string
    photo_url?: string
    auth_date: number
    hash: string
}

const TGLoginButton: FC<TGLoginButtonProps> = ({ BOT_USERNAME }) => {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

	const handleAuth = async (data: TelegramAuthData) => {
		try {
			setIsLoading(true)
			const result = await signIn(
				'telegram-login',
				{
					callbackUrl: '/dashboard',
					redirect: true,
				},
				data as unknown as SignInAuthorizationParams
			)

			if (result?.error) {
				router.push(`/auth/error?error=${result.error}`)
			} else if (result?.ok) {
				router.push('/dashboard')
			}
		} catch (error) {
			console.error('Ошибка авторизации:', error)
			router.push('/auth/error?error=Unknown')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className='relative hover:opacity-90 transition-opacity duration-200'>
			{isLoading && (
				<div className='absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50 rounded-lg'>
					<Spinner size='lg' />
				</div>
			)}
			<LoginButton botUsername={BOT_USERNAME} buttonSize='medium' lang='ru' onAuthCallback={handleAuth} />
		</div>
	)
}

export default TGLoginButton