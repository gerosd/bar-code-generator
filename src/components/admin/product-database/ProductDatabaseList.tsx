'use client'

import { deleteAllProductsAction } from '@/lib/actions/admin-actions'
import type { ProductDatabaseView } from '@/lib/types/product'
import { Alert, Button, Spinner, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from 'flowbite-react'
import { useRouter } from 'next/navigation' // Для router.refresh()
import { useEffect, useState } from 'react'
import { HiInformationCircle } from 'react-icons/hi'

interface ProductDatabaseListProps {
	products: ProductDatabaseView[]
}

// Примерные размеры для расчета позиционирования, можно настроить

const CURSOR_OFFSET = 15 // Отступ от курсора
const ANIMATION_DURATION = 200 // мс, должно совпадать с CSS transition duration

export const ProductDatabaseList: React.FC<ProductDatabaseListProps> = ({ products: initialProducts }) => {
	const [products, setProducts] = useState<ProductDatabaseView[]>(initialProducts)
	const [enlargedImage, setEnlargedImage] = useState<string | null>(null)
	const [enlargedImagePosition, setEnlargedImagePosition] = useState<{ top: number; left: number } | null>(null)
	const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
	const [isEnlargedVisible, setIsEnlargedVisible] = useState(false)

	const [isProcessing, setIsProcessing] = useState(false)
	const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'failure'; message: string } | null>(null)

	const router = useRouter()

	// Обновляем локальное состояние, если изменился пропс
	useEffect(() => {
		setProducts(initialProducts)
	}, [initialProducts])

	useEffect(() => {
		const updateViewportSize = () => {
			setViewportSize({ width: window.innerWidth, height: window.innerHeight })
		}
		window.addEventListener('resize', updateViewportSize)
		updateViewportSize() // Первоначальная установка
		return () => window.removeEventListener('resize', updateViewportSize)
	}, [])

	const handleDeleteAll = async () => {
		setIsProcessing(true)
		setActionMessage(null)
		try {
			const result = await deleteAllProductsAction()
			if (result.success) {
				setActionMessage({ type: 'success', message: result.message || 'Все товары успешно удалены!' })
				router.refresh()
			} else {
				setActionMessage({ type: 'failure', message: result.error || 'Не удалось удалить товары.' })
			}
		} catch (error) {
			setActionMessage({ type: 'failure', message: 'Произошла ошибка при удалении товаров.' })
			console.error('[ProductDatabaseList] Ошибка при вызове deleteAllProductsAction', error)
		}
		setIsProcessing(false)
	}

	if (!products || products.length === 0) {
		return <p>Нет товаров для отображения.</p>
	}

	const handleMouseEnter = (imageUrl: string | undefined, event: React.MouseEvent<HTMLDivElement>) => {
		if (imageUrl && viewportSize.width > 0 && viewportSize.height > 0) {
			setEnlargedImage(imageUrl)

			const popupMaxHeight = viewportSize.height * 0.65
			const popupMaxWidth = viewportSize.width * 0.65

			let top = event.clientY + CURSOR_OFFSET
			let left = event.clientX + CURSOR_OFFSET

			if (left + popupMaxWidth > viewportSize.width) {
				left = event.clientX - popupMaxWidth - CURSOR_OFFSET
			}
			if (top + popupMaxHeight > viewportSize.height) {
				top = event.clientY - popupMaxHeight - CURSOR_OFFSET
			}
			if (left < 0) left = CURSOR_OFFSET
			if (top < 0) top = CURSOR_OFFSET
			if (left + popupMaxWidth > viewportSize.width) {
				left = viewportSize.width - popupMaxWidth - CURSOR_OFFSET
				if (left < 0) left = 0
			}
			if (top + popupMaxHeight > viewportSize.height) {
				top = viewportSize.height - popupMaxHeight - CURSOR_OFFSET
				if (top < 0) top = 0
			}
			setEnlargedImagePosition({ top, left })

			// Небольшая задержка перед установкой видимости для запуска CSS transition
			setTimeout(() => {
				setIsEnlargedVisible(true)
			}, 0) // Можно поэкспериментировать с 10-20мс, если 0 не сработает стабильно
		}
	}

	const handleMouseLeave = () => {
		setIsEnlargedVisible(false) // Запускаем анимацию исчезновения
		setTimeout(() => {
			// Убираем из DOM после анимации
			setEnlargedImage(null)
			setEnlargedImagePosition(null)
		}, ANIMATION_DURATION)
	}

	return (
		<>
			<div className='mb-4 flex items-center justify-between'>
				<Button color='failure' onClick={handleDeleteAll} disabled={isProcessing} size='sm'>
					{isProcessing ? (
						<>
							<Spinner size='sm' />
							<span className='pl-3'>Удаление...</span>
						</>
					) : (
						'Удалить все товары из базы'
					)}
				</Button>
			</div>

			{actionMessage && (
				<Alert
					color={actionMessage.type === 'success' ? 'success' : 'failure'}
					icon={HiInformationCircle}
					className='mb-4'
					onDismiss={() => setActionMessage(null)}
				>
					{actionMessage.message}
				</Alert>
			)}

			{products.length === 0 && !isProcessing && !actionMessage && (
				<Alert color='info' icon={HiInformationCircle} className='my-4'>
					База товаров пуста (или только что была очищена).
				</Alert>
			)}

			{products.length > 0 && (
				<div className='overflow-auto shadow-md sm:rounded-lg max-h-[calc(100vh-16rem)]'>
					<Table hoverable>
						<TableHead className='sticky top-0 z-10 bg-gray-50 dark:bg-gray-700'>
							<TableRow>
								<TableHeadCell>Фото</TableHeadCell>
								<TableHeadCell>nmID (WB)</TableHeadCell>
								<TableHeadCell>Артикул поставщика</TableHeadCell>
								<TableHeadCell>Товар</TableHeadCell>
								<TableHeadCell>Общий остаток (шт)</TableHeadCell>
								<TableHeadCell>ID поставщика WB</TableHeadCell>
								<TableHeadCell>Дата обновления</TableHeadCell>
							</TableRow>
						</TableHead>
						<TableBody className='divide-y'>
							{products.map((product) => {
								return (
									<TableRow
										key={product.nmID}
										className='bg-white dark:border-gray-700 dark:bg-gray-800'
									>
										<TableCell>
											<div
												onMouseEnter={(e) =>
													handleMouseEnter(product.photoC516x688Url || product.photoTmUrl, e)
												}
												onMouseLeave={handleMouseLeave}
												className='relative h-10 w-10'
											>
												{product.photoTmUrl ? (
													<img
														src={product.photoTmUrl}
														alt={product.title || 'фото товара'}
														className='h-full w-full object-contain'
													/>
												) : (
													<div className='flex h-full w-full items-center justify-center bg-gray-200 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400'>
														Нет фото
													</div>
												)}
											</div>
										</TableCell>
										<TableCell className='whitespace-nowrap font-medium text-gray-900 dark:text-white'>
											{product.nmID}
										</TableCell>
										<TableCell>{product.vendorCode || 'N/A'}</TableCell>
										<TableCell>
											{product.brand && (
												<div className='text-xs text-gray-500 dark:text-gray-400'>
													{product.brand}
												</div>
											)}
											<div>{product.title || 'N/A'}</div>
										</TableCell>
										<TableCell>{product.totalQuantity?.toLocaleString('ru-RU') || 'N/A'}</TableCell>
										<TableCell>{product.supplierWBId || 'N/A'}</TableCell>
										<TableCell>
											{product.cardUpdatedAt
												? new Date(product.cardUpdatedAt).toLocaleString('ru-RU', {
														year: '2-digit',
														month: '2-digit',
														day: '2-digit',
														hour: '2-digit',
														minute: '2-digit',
												  })
												: 'N/A'}
										</TableCell>
									</TableRow>
								)
							})}
						</TableBody>
					</Table>
				</div>
			)}
			{enlargedImage && enlargedImagePosition && (
				<div
					className={`fixed z-50 rounded border border-gray-300 bg-white p-1 shadow-xl transition-all ease-out duration-${ANIMATION_DURATION} ${
						isEnlargedVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
					}`}
					style={{
						top: `${enlargedImagePosition.top}px`,
						left: `${enlargedImagePosition.left}px`,
						pointerEvents: isEnlargedVisible ? 'auto' : 'none', // Позволяем взаимодействовать, если видимо
					}}
				>
					<img
						src={enlargedImage}
						alt='Фото товара (увеличено)'
						className='object-contain'
						style={{ maxHeight: '65vh', maxWidth: '65vw' }} // Уменьшенный размер
					/>
				</div>
			)}
		</>
	)
}
