'use client'

import { useToast } from '@/components/providers/ToastProvider'
import { inviteUser, removeUser, updateUserRole } from '@/lib/actions/client-actions'
import { ClientMember, ClientMemberRole, ClientType } from '@/lib/types/client'
import {
	Alert,
	Button,
	Modal,
	ModalBody,
	ModalFooter,
	ModalHeader,
	Select,
	Spinner,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeadCell,
	TableRow,
	TextInput,
	Tooltip,
} from 'flowbite-react'
import { useEffect, useState, type FormEvent } from 'react'
import { FaExclamationTriangle, FaPlus, FaTrash } from 'react-icons/fa'

interface ClientUsersManagementModalProps {
	client: ClientType
	currentUserId: string
	show: boolean
	onCloseAction: () => void
	onClientDataUpdateAction: (updatedClient: ClientType) => void
}

export function ClientUsersManagementModal({
	client: initialClient,
	currentUserId,
	show,
	onCloseAction,
	onClientDataUpdateAction,
}: ClientUsersManagementModalProps) {
	const [clientData, setClientData] = useState<ClientType>(initialClient)
	const [members, setMembers] = useState<ClientMember[]>(initialClient.members)
	const [isLoadingGeneral, setIsLoadingGeneral] = useState(false)
	const [isInviting, setIsInviting] = useState(false)
	const [inviteUserId, setInviteUserId] = useState('')
	const [inviteRole, setInviteRole] = useState<ClientMemberRole>('member')
	const [error, setError] = useState<string | null>(null)

	const { addToast } = useToast()

	const currentUserMemberInClient = clientData.members.find((m) => m.userId === currentUserId)
	const isAdmin = currentUserMemberInClient?.role === 'admin'

	useEffect(() => {
		setClientData(initialClient)
		const sortedMembers = [...initialClient.members].sort((a, b) => {
			if (a.role === 'admin' && b.role !== 'admin') return -1
			if (a.role !== 'admin' && b.role === 'admin') return 1
			return new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime()
		})
		setMembers(sortedMembers)
		setError(null)
		if (show) {
			setInviteUserId('')
			setInviteRole('member')
		}
	}, [initialClient, show])

	const handleInviteUser = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (!inviteUserId.trim()) {
			setError('ID пользователя для приглашения не может быть пустым.')
			return
		}
		setError(null)
		setIsInviting(true)
		try {
			const result = await inviteUser(clientData.id, inviteUserId.trim(), inviteRole)
			if (result.success) {
				addToast('Пользователь успешно приглашен', 'success')
				setInviteUserId('')
				const newMember: ClientMember = { userId: inviteUserId.trim(), role: inviteRole, invitedAt: new Date() }
				const updatedMembers = [newMember, ...members].sort((a, b) => {
					if (a.role === 'admin' && b.role !== 'admin') return -1
					if (a.role !== 'admin' && b.role === 'admin') return 1
					return new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime()
				})
				setMembers(updatedMembers)
				const newClientData = { ...clientData, members: updatedMembers }
				setClientData(newClientData)
				onClientDataUpdateAction(newClientData)
			} else {
				setError(result.error || 'Не удалось пригласить пользователя')
				addToast(result.error || 'Не удалось пригласить пользователя', 'error')
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Произошла ошибка при приглашении'
			setError(message)
			addToast(message, 'error')
		} finally {
			setIsInviting(false)
		}
	}

	const handleRemoveUser = async (userIdToRemove: string) => {
		if (
			userIdToRemove === currentUserId &&
			clientData.members.filter((m) => m.role === 'admin').length === 1 &&
			currentUserMemberInClient?.role === 'admin'
		) {
			addToast('Нельзя удалить единственного администратора (себя).', 'warning')
			return
		}
		setIsLoadingGeneral(true)
		try {
			const result = await removeUser(clientData.id, userIdToRemove)
			if (result.success) {
				addToast('Пользователь удален из клиента', 'success')
				const updatedMembers = members.filter((m) => m.userId !== userIdToRemove)
				setMembers(updatedMembers)
				const newClientData = { ...clientData, members: updatedMembers }
				setClientData(newClientData)
				onClientDataUpdateAction(newClientData)
			} else {
				addToast(result.error || 'Не удалось удалить пользователя', 'error')
			}
		} catch (err) {
			addToast(err instanceof Error ? err.message : 'Ошибка при удалении', 'error')
		} finally {
			setIsLoadingGeneral(false)
		}
	}

	const handleChangeRole = async (userIdToChange: string, newRole: ClientMemberRole) => {
		if (
			userIdToChange === currentUserId &&
			currentUserMemberInClient?.role === 'admin' &&
			newRole !== 'admin' &&
			clientData.members.filter((m) => m.role === 'admin').length === 1
		) {
			addToast('Нельзя понизить роль единственного администратора (себя).', 'warning')
			return
		}
		setIsLoadingGeneral(true)
		try {
			const result = await updateUserRole(clientData.id, userIdToChange, newRole)
			if (result.success) {
				addToast('Роль пользователя обновлена', 'success')
				const updatedMembers = members
					.map((m) => (m.userId === userIdToChange ? { ...m, role: newRole } : m))
					.sort((a, b) => {
						if (a.role === 'admin' && b.role !== 'admin') return -1
						if (a.role !== 'admin' && b.role === 'admin') return 1
						return new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime()
					})
				setMembers(updatedMembers)
				const newClientData = { ...clientData, members: updatedMembers }
				setClientData(newClientData)
				onClientDataUpdateAction(newClientData)
			} else {
				addToast(result.error || 'Не удалось обновить роль', 'error')
			}
		} catch (err) {
			addToast(err instanceof Error ? err.message : 'Ошибка при обновлении роли', 'error')
		} finally {
			setIsLoadingGeneral(false)
		}
	}

	const canManageUser = (member: ClientMember): boolean => {
		if (!isAdmin) return false
		if (member.userId === currentUserId) return false
		return !(member.role === 'admin' && clientData.members.filter((m) => m.role === 'admin').length === 1);
	}

	return (
		<Modal show={show} onClose={onCloseAction} size='3xl' popup>
			<ModalHeader>Управление участниками: {clientData.name}</ModalHeader>
			<ModalBody>
				<div className='space-y-6'>
					{isAdmin && (
						<form
							onSubmit={handleInviteUser}
							className='space-y-4 p-4 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 shadow-sm'
						>
							<h4 className='text-lg font-semibold text-gray-900 dark:text-white'>
								Пригласить пользователя
							</h4>
							{error && (
								<Alert color='failure' icon={FaExclamationTriangle} onDismiss={() => setError(null)}>
									<span className='font-medium'>Ошибка приглашения:</span> {error}
								</Alert>
							)}
							<div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-end'>
								<div>
									<label
										htmlFor='inviteUserIdModal'
										className='block mb-1 text-sm font-medium text-gray-900 dark:text-white'
									>
										Telegram ID пользователя
									</label>
									<TextInput
										id='inviteUserIdModal'
										value={inviteUserId}
										onChange={(e) => setInviteUserId(e.target.value)}
										placeholder='Telegram ID'
										required
										disabled={isInviting}
									/>
								</div>
								<div>
									<label
										htmlFor='inviteRoleModal'
										className='block mb-1 text-sm font-medium text-gray-900 dark:text-white'
									>
										Роль
									</label>
									<Select
										id='inviteRoleModal'
										value={inviteRole}
										onChange={(e) => setInviteRole(e.target.value as ClientMemberRole)}
										disabled={isInviting}
										required
									>
										<option value='member'>Участник</option>
										<option value='admin'>Администратор</option>
									</Select>
								</div>
								<Button
									type='submit'
									color='blue'
									disabled={isInviting || !inviteUserId.trim()}
									className='w-full md:w-auto'
								>
									{isInviting && <Spinner size='sm' className='mr-2' />}
									<FaPlus className='mr-2 h-4 w-4' />
									Пригласить
								</Button>
							</div>
						</form>
					)}

					<div>
						<h4 className='text-lg font-semibold text-gray-900 dark:text-white mb-3'>
							Список участников ({members.length})
						</h4>
						{members.length === 0 ? (
							<p className='text-gray-500 dark:text-gray-400 py-4 text-center'>
								В этом клиенте пока нет участников.
							</p>
						) : (
							<div className='overflow-x-auto border dark:border-gray-600 rounded-lg shadow-sm'>
								<Table hoverable className='min-w-full text-sm'>
									<TableHead className='bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-700 dark:text-gray-400'>
										<TableRow>
											<TableHeadCell>Пользователь</TableHeadCell>
											<TableHeadCell>Роль</TableHeadCell>
											{/* <TableHeadCell className="hidden sm:table-cell">Дата приглашения</TableHeadCell> */}
											{isAdmin && (
												<TableHeadCell>
													<span className='sr-only'>Действия</span>
												</TableHeadCell>
											)}
										</TableRow>
									</TableHead>
									<TableBody className='divide-y dark:divide-gray-700'>
										{members.map((member) => (
											<TableRow
												key={member.userId}
												className='bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-600'
											>
												<TableCell className='py-3 px-4 whitespace-nowrap font-medium text-gray-900 dark:text-white'>
													{member.userId}
													{member.userId === currentUserId && (
														<span className='ml-2 text-xs text-blue-600 dark:text-blue-400 font-normal'>
															(Это Вы)
														</span>
													)}
												</TableCell>
												<TableCell className='py-3 px-4'>
													{isAdmin && canManageUser(member) ? (
														<Select
															value={member.role}
															onChange={(e) =>
																handleChangeRole(
																	member.userId,
																	e.target.value as ClientMemberRole
																)
															}
															disabled={isLoadingGeneral}
															className='min-w-[120px] text-xs rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-cyan-500 focus:ring-cyan-500'
														>
															<option value='member'>Участник</option>
															<option value='admin'>Администратор</option>
														</Select>
													) : member.role === 'admin' ? (
														'Администратор'
													) : (
														'Участник'
													)}
												</TableCell>
												{/* 
												<TableCell className="py-3 px-4 hidden sm:table-cell">
													{formatDate(member.invitedAt)}
												</TableCell> 
												*/}
												{isAdmin && (
													<TableCell className='py-3 px-4 text-right'>
														{canManageUser(member) ? (
															<Button
																color='failure'
																size='xs'
																onClick={() => handleRemoveUser(member.userId)}
																disabled={isLoadingGeneral}
																className='p-1.5'
															>
																<FaTrash className='h-4 w-4' />
															</Button>
														) : (
															<Tooltip
																content={
																	member.userId === currentUserId
																		? 'Вы не можете удалить себя'
																		: member.role === 'admin' &&
																		  clientData.members.filter(
																				(m) => m.role === 'admin'
																		  ).length === 1
																		? 'Нельзя удалить единственного администратора'
																		: 'Нет прав'
																}
																placement='top'
															>
																<Button
																	color='failure'
																	size='xs'
																	disabled
																	className='p-1.5 opacity-50'
																>
																	<FaTrash className='h-4 w-4' />
																</Button>
															</Tooltip>
														)}
													</TableCell>
												)}
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</div>
				</div>
			</ModalBody>
			<ModalFooter className='flex justify-end pt-4 border-t dark:border-gray-600'>
				<Button color='alternative' onClick={onCloseAction} disabled={isLoadingGeneral || isInviting}>
					Закрыть
				</Button>
			</ModalFooter>
		</Modal>
	)
}
