'use client'

import { createSupplierKey, validateApiKey } from '@/lib/actions/supplier-actions'
import { SupplierData } from '@/lib/types/supplier'
import { Button, Card, Label, Spinner, TextInput } from 'flowbite-react'
import React, { useState } from 'react'
import { HiCheckCircle, HiExclamationCircle, HiInformationCircle } from 'react-icons/hi'

interface SupplierFormProps {
	onSupplierAddedAction: (supplier: SupplierData) => void
}

interface ValidationStatus {
	isValid: boolean
	message: string
	debug?: unknown
}

export const SupplierForm = ({ onSupplierAddedAction }: SupplierFormProps) => {
	const [name, setName] = useState('')
	const [key, setKey] = useState('')
	const [isValidating, setIsValidating] = useState(false)
	const [isCreating, setIsCreating] = useState(false)
	const [validationStatus, setValidationStatus] = useState<ValidationStatus | null>(null)
	const [showDebugInfo, setShowDebugInfo] = useState(false)

	const handleValidateAndCreate = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!name || !key) return

		try {
			setIsValidating(true)
			setValidationStatus(null)

			// Валидация токена
			const validationResult = await validateApiKey({
				name,
				key,
			})

			if (validationResult.valid) {
				setValidationStatus({
					isValid: true,
					message: 'API-ключ успешно проверен',
					debug: validationResult.debugInfo,
				})

				// Создание поставщика
				setIsCreating(true)
				const newSupplier = await createSupplierKey({
					name,
					key,
				})

				// Обновляем локальное состояние
				onSupplierAddedAction(newSupplier)

				// Сбрасываем форму после небольшой задержки
				setTimeout(() => {
					setName('')
					setKey('')
					setValidationStatus({
						isValid: true,
						message: 'Поставщик успешно добавлен и появится в списке',
					})
				}, 500)
			} else {
				setValidationStatus({
					isValid: false,
					message: validationResult.message || 'Ошибка проверки API-ключа',
					debug: validationResult.debugInfo,
				})
			}
		} catch (error) {
			console.error('Ошибка при создании поставщика:', error)
			setValidationStatus({
				isValid: false,
				message: 'Произошла ошибка при обработке запроса',
			})
		} finally {
			setIsValidating(false)
			setIsCreating(false)
		}
	}

	return (
		<Card className='max-w-xl'>
			<h2 className='text-xl font-bold mb-4'>Добавить нового поставщика</h2>
			<form onSubmit={handleValidateAndCreate} className='space-y-4'>
				<div>
					<div className='mb-2 block'>
						<Label htmlFor='name'>Название поставщика</Label>
					</div>
					<TextInput
						id='name'
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder='Например: Основной кабинет WB'
						required
					/>
				</div>
				<div>
					<div className='mb-2 block'>
						<Label htmlFor='key'>API-ключ Wildberries</Label>
					</div>
					<TextInput
						id='key'
						type='password'
						value={key}
						onChange={(e) => setKey(e.target.value)}
						placeholder='eyJhbGci...'
						required
					/>
					<p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
						Ключ должен иметь доступ к категориям &quot;Контент&quot; и &quot;Цены и скидки&quot;
					</p>
				</div>

				<Button type='submit' disabled={isValidating || isCreating}>
					{isValidating || isCreating ? (
						<>
							<Spinner size='sm' className='mr-2' />
							{isValidating ? 'Проверка ключа...' : 'Создание поставщика...'}
						</>
					) : (
						'Добавить поставщика'
					)}
				</Button>

				{validationStatus && (
					<div
						className={`mt-4 p-4 rounded-lg ${
							validationStatus.isValid
								? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-300'
								: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-300'
						}`}
					>
						<div className='flex'>
							{validationStatus.isValid ? (
								<HiCheckCircle className='h-5 w-5 mr-2 text-green-600 dark:text-green-400' />
							) : (
								<HiExclamationCircle className='h-5 w-5 mr-2 text-red-600 dark:text-red-400' />
							)}
							<span className='font-medium'>{validationStatus.message}</span>
						</div>

						{validationStatus.debug !== undefined && (
							<div className='mt-2'>
								<button
									type='button'
									onClick={() => setShowDebugInfo(!showDebugInfo)}
									className='text-sm text-gray-700 dark:text-gray-300 flex items-center'
								>
									<HiInformationCircle className='h-4 w-4 mr-1' />
									{showDebugInfo ? 'Скрыть' : 'Показать'} отладочную информацию
								</button>

								{showDebugInfo && (
									<div className='mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg'>
										<h4 className='font-medium mb-2'>Отладочная информация</h4>
										<pre className='whitespace-pre-wrap text-xs overflow-auto max-h-60'>
											{JSON.stringify(validationStatus.debug, null, 2) as string}
										</pre>
									</div>
								)}
							</div>
						)}
					</div>
				)}
			</form>
		</Card>
	)
}
