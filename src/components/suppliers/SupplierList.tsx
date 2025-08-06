'use client'

import { deleteSupplierKey } from '@/lib/actions/supplier-actions'
import { SupplierData } from '@/lib/types/supplier'
import { Badge, Button, Card } from 'flowbite-react'
import { useEffect, useState } from 'react'
import { HiKey, HiTrash } from 'react-icons/hi'
import { UpdateTokenModal } from './UpdateTokenModal'

interface SupplierListProps {
	initialSuppliers: SupplierData[]
	onSupplierDeletedAction: (id: string) => void
}

export function SupplierList({ initialSuppliers, onSupplierDeletedAction }: SupplierListProps) {
	const [isLoading, setIsLoading] = useState(false)
	const [deletingId, setDeletingId] = useState<string | null>(null)
	const [suppliers, setSuppliers] = useState<SupplierData[]>(initialSuppliers)
	const [showUpdateModal, setShowUpdateModal] = useState(false)
	const [selectedSupplier, setSelectedSupplier] = useState<SupplierData | null>(null)

	// Обновляем локальное состояние при изменении props
	useEffect(() => {
		setSuppliers(initialSuppliers)
	}, [initialSuppliers])

	// Удаление ключа поставщика
	const handleDeleteSupplierKey = async (id: string) => {
		try {
			setIsLoading(true)
			setDeletingId(id)
			await deleteSupplierKey(id)
			onSupplierDeletedAction(id)
			setSuppliers((prev) => prev.filter((supplier) => supplier.id !== id))
		} catch (error) {
			console.error('Ошибка при удалении ключа поставщика:', error)
		} finally {
			setIsLoading(false)
			setDeletingId(null)
		}
	}

	// Открытие модального окна для обновления токена
	const handleOpenUpdateModal = (supplier: SupplierData) => {
		setSelectedSupplier(supplier)
		setShowUpdateModal(true)
	}

	// Обработка успешного обновления токена
	const handleTokenUpdated = (updatedSupplier: SupplierData) => {
		setSuppliers((prev) =>
			prev.map((supplier) => (supplier.id === updatedSupplier.id ? updatedSupplier : supplier))
		)
		setShowUpdateModal(false)
		setSelectedSupplier(null)
	}

	return (
		<Card className='bg-gray-800 border-gray-700 shadow-lg h-full'>
			<h2 className='text-xl font-bold mb-4 text-white'>Добавленные API-ключи</h2>

			{isLoading && !deletingId ? (
				<div className='flex justify-center py-8'>
					<div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent'></div>
				</div>
			) : suppliers.length === 0 ? (
				<div className='text-center text-gray-400 py-8 bg-gray-900 rounded-md border border-gray-700'>
					У вас еще нет добавленных API-ключей
				</div>
			) : (
				<div className='space-y-4'>
					{suppliers.map((supplier) => (
						<div
							key={supplier.id}
							className='p-4 border border-gray-700 rounded-md bg-gray-900 flex flex-col gap-2'
						>
							<div className='flex justify-between items-center'>
								<div className='font-semibold text-white'>{supplier.name}</div>
								<div className='flex gap-2'>
									<Button
										color='blue'
										size='xs'
										onClick={() => handleOpenUpdateModal(supplier)}
										className='flex items-center'
									>
										<HiKey className='mr-1' /> Обновить токен
									</Button>
									<Button
										color='failure'
										size='xs'
										onClick={() => handleDeleteSupplierKey(supplier.id)}
										disabled={deletingId === supplier.id}
										className={deletingId === supplier.id ? 'opacity-50' : ''}
									>
										{deletingId === supplier.id ? (
											<div className='h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent'></div>
										) : (
											<>
												<HiTrash className='mr-1' /> Удалить
											</>
										)}
									</Button>
								</div>
							</div>

							<div className='text-sm text-gray-400'>
								<div className='bg-gray-800 border border-gray-700 rounded-md px-3 py-2 mb-2'>
									<code className='text-blue-300'>{supplier.key}</code>
								</div>

								{/* Отображение Legacy ID и Имени Поставщика (WB) */}
								{(supplier.legacySupplierId || supplier.legacySupplierName) && (
									<div className='bg-gray-800 border border-gray-700 rounded-md px-3 py-2 mb-2 text-xs'>
										{supplier.legacySupplierId && (
											<p>
												<span className='font-semibold text-gray-300'>
													ID поставщика (WB):{' '}
												</span>
												{supplier.legacySupplierId}
											</p>
										)}
										{supplier.legacySupplierName && (
											<p className={supplier.legacySupplierId ? 'mt-1' : ''}>
												<span className='font-semibold text-gray-300'>
													Имя поставщика (WB):{' '}
												</span>
												{supplier.legacySupplierName}
											</p>
										)}
									</div>
								)}

								<div className='flex flex-wrap gap-2 mb-2'>
									{supplier.info?.accessCategories?.map((category: string, index: number) => (
										<Badge key={index} color='info' className='font-normal'>
											{category}
										</Badge>
									))}
									{supplier.info?.isReadOnly && (
										<Badge color='warning' className='font-normal'>
											Только чтение
										</Badge>
									)}
									{supplier.info?.isSandbox && (
										<Badge color='dark' className='font-normal'>
											Тестовый режим
										</Badge>
									)}
								</div>

								<div className='flex justify-between text-xs'>
									<span>Добавлен: {new Date(supplier.createdAt).toLocaleDateString('ru-RU')}</span>
									{supplier.info?.expiresAt && (
										<span>
											Действует до:{' '}
											{new Date(supplier.info.expiresAt).toLocaleDateString('ru-RU')}
										</span>
									)}
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{selectedSupplier && (
				<UpdateTokenModal
					show={showUpdateModal}
					onCloseAction={() => setShowUpdateModal(false)}
					supplier={selectedSupplier}
					onTokenUpdatedAction={handleTokenUpdated}
				/>
			)}
		</Card>
	)
}
