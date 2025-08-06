'use client'

import { updateSupplierKey, validateApiKey } from '@/lib/actions/supplier-actions'
import { SupplierData, SupplierFormData, ValidateApiKeyResult } from '@/lib/types/supplier'
import { Alert, Button, Label, Modal, TextInput } from 'flowbite-react'
import { useState } from 'react'
import { HiInformationCircle } from 'react-icons/hi'

interface UpdateTokenModalProps {
	show: boolean
	onCloseAction: () => void
	supplier: SupplierData
	onTokenUpdatedAction: (updatedSupplier: SupplierData) => void
}

interface DebugInfo {
	status: 'validating' | 'success' | 'error' | 'saving' | 'completed'
	message: string
	data?: ValidateApiKeyResult
	savedData?: SupplierData
	error?: string
}

export function UpdateTokenModal({ show, onCloseAction, supplier, onTokenUpdatedAction }: UpdateTokenModalProps) {
	const [newToken, setNewToken] = useState('')
	const [isProcessing, setIsProcessing] = useState(false)
	const [validationError, setValidationError] = useState<string | null>(null)
	const [validationSuccess, setValidationSuccess] = useState<string | null>(null)
	const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
	const [showDebug, setShowDebug] = useState(false)

	const handleUpdateToken = async () => {
		if (!newToken.trim()) {
			setValidationError('Пожалуйста, введите новый API-ключ')
			return
		}

		setIsProcessing(true)
		setValidationError(null)
		setValidationSuccess(null)
		setDebugInfo(null)

		try {
			// Подготовка данных
			const formData: SupplierFormData = {
				name: supplier.name,
				key: newToken,
			}

			// Валидация ключа
			setDebugInfo({ status: 'validating', message: 'Отправка запроса на валидацию API-ключа...' })
			const validationResult = await validateApiKey(formData)
			setDebugInfo({
				status: validationResult.valid ? 'success' : 'error',
				message: validationResult.message,
				data: validationResult,
			})

			if (!validationResult.valid) {
				throw new Error(validationResult.message)
			}

			setValidationSuccess('Новый API-ключ успешно прошел валидацию!')

			// Обновление ключа
			setDebugInfo({ status: 'saving', message: 'Обновление API-ключа в базе данных...' })
			const updatedSupplier = await updateSupplierKey({
				id: supplier.id,
				key: newToken,
			})

			setDebugInfo(
				(prev: DebugInfo | null) =>
					({
						...(prev || {}),
						status: 'completed',
						message: 'API-ключ успешно обновлен',
						savedData: updatedSupplier,
					} as DebugInfo)
			)

			onTokenUpdatedAction(updatedSupplier)
			onCloseAction()
			setNewToken('')
		} catch (error) {
			console.error('Ошибка:', error)
			setValidationError(error instanceof Error ? error.message : 'Неизвестная ошибка')
			setDebugInfo(
				(prev: DebugInfo | null) =>
					({
						...(prev || {}),
						status: 'error',
						error: error instanceof Error ? error.message : 'Неизвестная ошибка',
					} as DebugInfo)
			)
		} finally {
			setIsProcessing(false)
		}
	}

	const toggleDebug = () => {
		setShowDebug((prev) => !prev)
	}

	return (
		<Modal show={show} onClose={onCloseAction} size='2xl' position='center'>
			<div className='p-6 bg-gray-800 text-white rounded-lg'>
				<h3 className='text-xl font-medium mb-3 border-b border-gray-700 pb-3'>
					Обновление API-ключа для {supplier.name}
				</h3>

				<div className='space-y-5 mt-5'>
					<div>
						<div className='mb-3 block'>
							<Label htmlFor='newToken' className='text-gray-200 text-base'>
								Новый API-ключ Wildberries
							</Label>
						</div>
						<TextInput
							id='newToken'
							type='password'
							placeholder='Введите новый API-ключ'
							value={newToken}
							onChange={(e) => setNewToken(e.target.value)}
							required
							className='bg-gray-700 border-gray-600 text-white'
						/>
						<p className='mt-2 text-sm text-gray-400'>
							API-ключ должен иметь права на категории &quot;Контент&quot; и &quot;Цены и скидки&quot;.
						</p>
					</div>

					{validationError && (
						<Alert color='failure' icon={HiInformationCircle} className='rounded-xl'>
							<span className='font-medium'>Ошибка!</span> {validationError}
						</Alert>
					)}

					{validationSuccess && (
						<Alert color='success' icon={HiInformationCircle} className='rounded-xl'>
							<span className='font-medium'>Успех!</span> {validationSuccess}
						</Alert>
					)}

					<Button onClick={toggleDebug} color='gray' size='sm' className='rounded-lg mt-2'>
						{showDebug ? 'Скрыть отладочную информацию' : 'Показать отладочную информацию'}
					</Button>

					{showDebug && debugInfo && (
						<div className='p-5 bg-gray-900 rounded-xl border border-gray-700 text-sm text-gray-300 overflow-auto max-h-96 shadow-inner'>
							<h3 className='text-white font-semibold mb-3'>Отладочная информация:</h3>
							<div className='mb-3 flex items-center'>
								<span className='font-medium w-24'>Статус: </span>
								<span
									className={`px-2 py-1 rounded-lg ${
										debugInfo.status === 'error'
											? 'text-red-400 bg-red-900/20'
											: debugInfo.status === 'success'
											? 'text-green-400 bg-green-900/20'
											: debugInfo.status === 'completed'
											? 'text-green-400 bg-green-900/20'
											: 'text-yellow-400 bg-yellow-900/20'
									}`}
								>
									{debugInfo.status}
								</span>
							</div>
							<div className='mb-3'>
								<span className='font-medium'>Сообщение: </span>
								{debugInfo.message}
							</div>

							{debugInfo.data?.supplierInfo && (
								<div className='mb-4 bg-gray-950 p-4 rounded-xl'>
									<h4 className='text-white font-semibold mb-3 border-b border-gray-800 pb-2'>
										Информация о токене:
									</h4>
									{debugInfo.data.supplierInfo.accessCategories && (
										<div className='mb-3'>
											<span className='font-medium'>Доступные категории: </span>
											<div className='flex flex-wrap gap-2 mt-2'>
												{debugInfo.data.supplierInfo.accessCategories.map((category) => (
													<span
														key={category}
														className='bg-blue-900 text-blue-300 rounded-md px-3 py-1 text-xs'
													>
														{category}
													</span>
												))}
											</div>
										</div>
									)}
									<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
										<div className='p-3 bg-gray-900 rounded-lg'>
											<span className='font-medium block mb-1'>Доступ к Контенту: </span>
											<span
												className={`px-2 py-1 rounded-lg inline-block ${
													debugInfo.data.supplierInfo.hasContentAccess
														? 'text-green-400 bg-green-900/20'
														: 'text-red-400 bg-red-900/20'
												}`}
											>
												{debugInfo.data.supplierInfo.hasContentAccess ? 'Да' : 'Нет'}
											</span>
										</div>
										<div className='p-3 bg-gray-900 rounded-lg'>
											<span className='font-medium block mb-1'>Доступ к Ценам и скидкам: </span>
											<span
												className={`px-2 py-1 rounded-lg inline-block ${
													debugInfo.data.supplierInfo.hasPriceAccess
														? 'text-green-400 bg-green-900/20'
														: 'text-red-400 bg-red-900/20'
												}`}
											>
												{debugInfo.data.supplierInfo.hasPriceAccess ? 'Да' : 'Нет'}
											</span>
										</div>
										<div className='p-3 bg-gray-900 rounded-lg'>
											<span className='font-medium block mb-1'>Только для чтения: </span>
											<span
												className={`px-2 py-1 rounded-lg inline-block ${
													debugInfo.data.supplierInfo.isReadOnly
														? 'text-red-400 bg-red-900/20'
														: 'text-green-400 bg-green-900/20'
												}`}
											>
												{debugInfo.data.supplierInfo.isReadOnly ? 'Да' : 'Нет'}
											</span>
										</div>
										<div className='p-3 bg-gray-900 rounded-lg'>
											<span className='font-medium block mb-1'>Тестовый режим (Sandbox): </span>
											<span
												className={`px-2 py-1 rounded-lg inline-block ${
													debugInfo.data.supplierInfo.isSandbox
														? 'text-yellow-400 bg-yellow-900/20'
														: 'text-green-400 bg-green-900/20'
												}`}
											>
												{debugInfo.data.supplierInfo.isSandbox ? 'Да' : 'Нет'}
											</span>
										</div>
									</div>
									{debugInfo.data.supplierInfo.expiresAt && (
										<div className='mt-3 p-3 bg-gray-900 rounded-lg'>
											<span className='font-medium block mb-1'>Срок действия: </span>
											<span className='text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded-lg inline-block'>
												{new Date(debugInfo.data.supplierInfo.expiresAt).toLocaleDateString(
													'ru-RU'
												)}
											</span>
										</div>
									)}
								</div>
							)}

							<pre className='mt-3 bg-gray-950 p-4 rounded-xl text-xs overflow-x-auto'>
								{JSON.stringify(debugInfo, null, 2)}
							</pre>
						</div>
					)}
				</div>

				<div className='flex justify-end gap-3 w-full mt-6 pt-4 border-t border-gray-700'>
					<Button
						onClick={handleUpdateToken}
						disabled={isProcessing}
						color='blue'
						className={`px-5 ${isProcessing ? 'opacity-75' : ''}`}
					>
						{isProcessing ? (
							<>
								<div className='mr-3 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent'></div>
								Обработка...
							</>
						) : (
							'Обновить токен'
						)}
					</Button>
					<Button color='gray' onClick={onCloseAction} className='px-5'>
						Отмена
					</Button>
				</div>
			</div>
		</Modal>
	)
}
