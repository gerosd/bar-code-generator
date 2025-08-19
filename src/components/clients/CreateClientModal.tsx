'use client'

import { useCurrentClient } from '@/components/providers/ClientProvider' // Для вызова refreshClients
import { createClient } from '@/lib/actions/client-actions'
import { Alert, Button, Label, Modal, ModalBody, ModalHeader, Spinner, TextInput } from 'flowbite-react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState, type FormEvent } from 'react'
import { HiInformationCircle } from 'react-icons/hi'

interface CreateClientModalProps {
	open: boolean
	setOpenAction: (open: boolean) => void
	// currentUserId: string - Убираем, так как userId берется из сессии в server action
}

export function CreateClientModal({ open, setOpenAction }: CreateClientModalProps) {
	// Убираем currentUserId из пропсов
	const [clientName, setClientName] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const { refreshClients } = useCurrentClient()
	const router = useRouter()
	const { update } = useSession()

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setError(null)
		if (!clientName.trim()) {
			setError('Название клиента не может быть пустым.')
			return
		}
		setIsLoading(true)
		try {
			const result = await createClient(clientName.trim())
			if (result.success && result.clientId) {
				setOpenAction(false)
				setClientName('')
				// Обновляем токен с актуальным списком доступных клиентов, чтобы middleware не удалил cookie
				await update({ refreshAvailableClients: true } as any)
				await refreshClients() // Обновляем список клиентов в провайдере.
				// Подхватываем новый cookie и обновленный токен без полной перезагрузки
				router.refresh()
			} else {
				setError(result.error || 'Не удалось создать клиента.')
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Произошла неизвестная ошибка.')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Modal show={open} size='md' popup onClose={() => !isLoading && setOpenAction(false)}>
			<ModalHeader>Создание нового клиента</ModalHeader>
			<ModalBody>
				<form onSubmit={handleSubmit} className='space-y-6'>
					{error && (
						<Alert color='failure' icon={HiInformationCircle}>
							<span>
								<p>
									<span className='font-medium'>Ошибка!</span> {error}
								</p>
							</span>
						</Alert>
					)}
					<div>
						<div className='mb-2 block'>
							<Label htmlFor='clientName'>Название клиента</Label>
						</div>
						<TextInput
							id='clientName'
							placeholder='Мой новый бизнес'
							value={clientName}
							onChange={(event) => setClientName(event.target.value)}
							required
							disabled={isLoading}
						/>
					</div>

					<div className='w-full'>
						<Button type='submit' disabled={isLoading} className='w-full'>
							{isLoading && <Spinner aria-label='Загрузка' size='sm' className='mr-2' />}
							{isLoading ? 'Создание...' : 'Создать клиента'}
						</Button>
					</div>
				</form>
			</ModalBody>
		</Modal>
	)
}
