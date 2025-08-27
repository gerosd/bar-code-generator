'use client'

import { useToast } from '@/components/providers/ToastProvider' // Для уведомлений
import { updateClientName } from '@/lib/actions/client-actions'
import type { ClientType } from '@/lib/types/client'
import { Button, Card, List, ListItem, TextInput, Tooltip } from 'flowbite-react'
import React, { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { FaCheck, FaEdit, FaInfoCircle, FaPlus, FaTimes, FaUsers } from 'react-icons/fa'
import { ClientUsersManagementModal } from './ClientUsersManagementModal' // Предполагаем этот новый компонент
import { CreateClientModal } from './CreateClientModal' // Импортируем модальное окно

interface ClientListProps {
	initialClients: ClientType[]
	currentUserId: string // Добавляем ID текущего пользователя
}

export function ClientList({ initialClients, currentUserId }: ClientListProps) {
	const [clients, setClients] = useState<ClientType[]>(initialClients)
	const [editingClientId, setEditingClientId] = useState<string | null>(null)
	const [editingName, setEditingName] = useState<string>('')
	const [originalName, setOriginalName] = useState<string>('')
	const [isCreateModalOpen, setCreateModalOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [isUserManagementModalOpen, setUserManagementModalOpen] = useState(false)
	const [selectedClientForUserManagement, setSelectedClientForUserManagement] = useState<ClientType | null>(null)

	const inputRef = useRef<HTMLInputElement>(null)
	const { addToast } = useToast()

	useEffect(() => {
		setClients(initialClients)
	}, [initialClients])

	useEffect(() => {
		if (editingClientId && inputRef.current) {
			inputRef.current.focus()
			// Выделяем текст в инпуте для удобства редактирования
			inputRef.current.select()
		}
	}, [editingClientId])

	const handleDoubleClick = (client: ClientType) => {
		setEditingClientId(client.id)
		setEditingName(client.name)
		setOriginalName(client.name)
	}

	const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setEditingName(e.target.value)
	}

	const saveName = async (clientId: string) => {
		if (editingName.trim() === originalName.trim()) {
			setEditingClientId(null)
			return
		}
		if (editingName.trim().length < 3) {
			addToast('Имя клиента должно содержать минимум 3 символа.', 'error')
			// Можно вернуть фокус на инпут или оставить как есть
			// inputRef.current?.focus();
			return
		}

		setIsLoading(true)
		try {
			const result = await updateClientName(clientId, editingName.trim())
			if (result.success) {
				setClients(clients.map((c) => (c.id === clientId ? { ...c, name: editingName.trim() } : c)))
				addToast(result.message || 'Имя клиента обновлено', 'success')
			} else {
				addToast(result.error || 'Не удалось обновить имя клиента', 'error')
				setEditingName(originalName) // Возвращаем старое имя в инпут
			}
		} catch (error) {
			addToast('Ошибка при обновлении имени клиента', 'error')
			setEditingName(originalName)
		} finally {
			setEditingClientId(null)
			setIsLoading(false)
		}
	}

	const handleInputBlur = (e: FocusEvent<HTMLInputElement>) => {
		// Проверяем, не был ли клик по кнопке отмены/сохранения, чтобы blur не сработал раньше
		// e.relatedTarget - это элемент, который получит фокус после blur
		// Если это кнопка внутри текущего редактируемого элемента, то не сохраняем по blur
		const currentItemElement = e.currentTarget.closest('.editing-item-class') // Добавим этот класс к ListItem в режиме редактирования
		if (currentItemElement && currentItemElement.contains(e.relatedTarget as Node)) {
			return
		}
		if (editingClientId) {
			saveName(editingClientId)
		}
	}

	const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			if (editingClientId) saveName(editingClientId)
		}
		if (e.key === 'Escape') {
			setEditingClientId(null)
			setEditingName(originalName) // Восстанавливаем оригинальное имя
		}
	}

	const cancelEdit = () => {
		setEditingClientId(null)
		setEditingName(originalName)
	}

	const openUserManagementModal = (client: ClientType) => {
		setSelectedClientForUserManagement(client)
		setUserManagementModalOpen(true)
	}

	const handleClientDataUpdateFromModal = (updatedClient: ClientType) => {
		setClients((prevClients) => prevClients.map((c) => (c.id === updatedClient.id ? updatedClient : c)))
		// Обновляем и selectedClientForUserManagement, если он был этим клиентом,
		// чтобы модалка имела самые свежие данные, если останется открытой (хотя обычно она закроется)
		if (selectedClientForUserManagement && selectedClientForUserManagement.id === updatedClient.id) {
			setSelectedClientForUserManagement(updatedClient)
		}
	}

	return (
		<Card className='shadow-md'>
			<div className='flex justify-between items-center mb-6'>
				<h1 className='text-2xl font-semibold text-gray-900 dark:text-white'>Управление клиентами</h1>
				<Button color='blue' onClick={() => setCreateModalOpen(true)} disabled={isLoading}>
					<FaPlus className='mr-2 h-5 w-5' />
					Добавить клиента
				</Button>
			</div>

			{clients.length === 0 ? (
				<div className='text-center py-10 text-gray-500 dark:text-gray-400'>
					<FaInfoCircle className='mx-auto h-12 w-12 mb-4 text-gray-400 dark:text-gray-500' />
					<p className='text-xl font-medium mb-2'>У вас пока нет клиентов.</p>
					<p className='text-sm'>Нажмите &ldquo;Добавить клиента&rdquo;, чтобы создать первого.</p>
				</div>
			) : (
				<List unstyled className='divide-y divide-gray-200 dark:divide-gray-700'>
					{clients.map((client) => (
						<ListItem
							key={client.id}
							className={`editing-item-class flex items-center justify-between px-4 py-3 ${
								editingClientId === client.id
									? 'bg-gray-100 dark:bg-gray-700 rounded-lg'
									: 'hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg'
							} transition-colors duration-150`}
						>
							<div
								className='flex items-center space-x-4 flex-grow min-w-0'
								onDoubleClick={() =>
									!isLoading && editingClientId !== client.id && handleDoubleClick(client)
								}
							>
								<div className='min-w-0 flex-1'>
									{editingClientId === client.id ? (
										<div className='flex items-center w-full'>
											<TextInput
												ref={inputRef}
												type='text'
												value={editingName}
												onChange={handleNameChange}
												onBlur={handleInputBlur}
												onKeyDown={handleInputKeyDown}
												disabled={isLoading}
												className='text-sm font-medium text-gray-900 dark:text-white truncate flex-grow py-2.5'
											/>
											<div className='flex items-center ml-3'>
												<Tooltip content='Сохранить (Enter)'>
													<Button
														size='sm'
														color='success'
														onClick={() => saveName(client.id)}
														className='p-2'
														disabled={isLoading}
													>
														<FaCheck className='h-4 w-4' />
													</Button>
												</Tooltip>
												<Tooltip content='Отменить (Esc)'>
													<Button
														size='sm'
														color='failure'
														onClick={cancelEdit}
														className='ml-2 p-2'
														disabled={isLoading}
													>
														<FaTimes className='h-4 w-4' />
													</Button>
												</Tooltip>
											</div>
										</div>
									) : (
										<Tooltip content='Двойной клик для редактирования имени'>
											<p className='text-sm font-medium text-gray-900 dark:text-white truncate cursor-pointer py-2.5'>
												{client.name}
											</p>
										</Tooltip>
									)}
									<p className='text-xs text-gray-500 dark:text-gray-400 truncate'>
										ID: {client.id} | Участников: {client.members.length}
									</p>
								</div>
							</div>
							<div className='ml-auto flex items-center flex-shrink-0 pl-3 space-x-2'>
								{editingClientId !== client.id && (
									<Tooltip content='Редактировать имя'>
										<FaEdit
											className='text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer h-5 w-5'
											onClick={() => !isLoading && handleDoubleClick(client)}
										/>
									</Tooltip>
								)}
								<Tooltip content='Управлять участниками'>
									<Button
										size='sm'
										color='gray'
										onClick={() => openUserManagementModal(client)}
										className='p-2'
										disabled={isLoading || editingClientId === client.id}
									>
										<FaUsers className='h-4 w-4' />
									</Button>
								</Tooltip>
							</div>
						</ListItem>
					))}
				</List>
			)}
			<CreateClientModal open={isCreateModalOpen} setOpenAction={setCreateModalOpen} />
			{selectedClientForUserManagement && (
				<ClientUsersManagementModal
					client={selectedClientForUserManagement}
					currentUserId={currentUserId}
					show={isUserManagementModalOpen}
					onCloseAction={() => {
						setUserManagementModalOpen(false)
						setSelectedClientForUserManagement(null)
						// router.refresh() // Рассмотреть, если нужно полное обновление страницы после закрытия модалки
					}}
					onClientDataUpdateAction={handleClientDataUpdateFromModal}
				/>
			)}
		</Card>
	)
}
