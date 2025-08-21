'use client'

import {useState, useTransition} from 'react'
import {updateUserProfileAction} from '@/lib/actions/user-actions'
import {useSession} from 'next-auth/react'

interface ProfileFormProps {
    initialFullName: string
    initialEmail: string
    canChangePassword: boolean
    hasExistingPassword: boolean
}

const ProfileForm: React.FC<ProfileFormProps> = ({initialFullName, initialEmail, canChangePassword, hasExistingPassword}: ProfileFormProps) => {
    const {update} = useSession()
    const [fullName, setFullName] = useState(initialFullName)
    const [email, setEmail] = useState(initialEmail)
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const [isPendingPwd, startTransitionPwd] = useTransition()
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [pwdStatus, setPwdStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [pwdError, setPwdError] = useState<string | null>(null)

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setStatus('idle')
        setError(null)

        startTransition(async () => {
            const result = await updateUserProfileAction({fullName, email})
            if (result.success) {
                // Обновляем сессию, чтобы новое имя/почта отразились в UI
                try {
                    await update({name: fullName, email})
                } catch {
                }
                setStatus('success')
            } else {
                setError(result.error || 'Не удалось сохранить изменения')
                setStatus('error')
            }
        })
    }

    const handlePasswordChange = (): void => {
        setPwdStatus('idle')
        setPwdError(null)
        if (newPassword !== confirmPassword) {
            setPwdStatus('error');
            setPwdError('Пароли не совпадают');
            return;
        }
        startTransitionPwd(async () => {
            const {updateUserPasswordAction} = await import('@/lib/actions/user-actions')
            const result = await updateUserPasswordAction({currentPassword, newPassword})
            if (result.success) {
                setPwdStatus('success')
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
            } else {
                setPwdError(result.error || 'Не удалось обновить пароль')
                setPwdStatus('error')
            }
        })
    }

    return (
        <form onSubmit={onSubmit} className='space-y-8'>
            <div>
                <label htmlFor='fullName' className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                    Имя
                </label>
                <input
                    id='fullName'
                    type='text'
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className='mt-1 py-2 px-3 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500'
                    placeholder='Ваше имя и фамилия'
                />
            </div>

            <div>
                <label htmlFor='email' className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                    Email
                </label>
                <input
                    id='email'
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className='mt-1 py-2 px-3 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500'
                    placeholder='name@example.com'
                />
                <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>Email используется для уведомлений и входа
                    по паролю при необходимости.</p>
            </div>

            {status === 'success' && (
                <div
                    className='rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300'>
                    Изменения сохранены
                </div>
            )}
            {status === 'error' && error && (
                <div className='rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300'>
                    {error}
                </div>
            )}

            <div className='flex items-center gap-3'>
                <button
                    type='submit'
                    disabled={isPending}
                    className='inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer'
                >
                    {isPending ? 'Сохранение...' : 'Сохранить'}
                </button>
            </div>

            {canChangePassword && (
                <div className='pt-6 border-t border-gray-200 dark:border-gray-700'>
                    <h3 className='text-md font-medium text-gray-900 dark:text-gray-100 mb-4'>Смена пароля</h3>
                    <div className='space-y-5'>
                        {hasExistingPassword && (
                            <div>
                                <label htmlFor='currentPassword' className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                                    Текущий пароль
                                </label>
                                <input
                                    id='currentPassword'
                                    type='password'
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className='mt-1 py-2 px-3 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500'
                                />
                            </div>
                        )}
                        <div>
                            <label htmlFor='newPassword' className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                                Новый пароль
                            </label>
                            <input
                                id='newPassword'
                                type='password'
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className='mt-1 py-2 px-3 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500'
                            />
                        </div>
                        <div>
                            <label htmlFor='confirmPassword' className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                                Подтверждение пароля
                            </label>
                            <input
                                id='confirmPassword'
                                type='password'
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className='mt-1 py-2 px-3 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500'
                            />
                        </div>

                        {pwdStatus === 'success' && (
                            <div className='rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300'>
                                Пароль обновлён
                            </div>
                        )}
                        {pwdStatus === 'error' && pwdError && (
                            <div className='rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300'>
                                {pwdError}
                            </div>
                        )}

                        <div>
                            <button
                                type='button'
                                disabled={isPendingPwd}
                                onClick={() => handlePasswordChange}
                                className='inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer'
                            >
                                {isPendingPwd ? 'Обновление...' : 'Обновить пароль'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    )
}

export default ProfileForm

