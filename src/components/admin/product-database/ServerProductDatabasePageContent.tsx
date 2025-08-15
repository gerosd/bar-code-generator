import { getAllProductsAction } from '@/lib/actions/admin-actions'
import { Spinner } from 'flowbite-react'
import { Suspense } from 'react'
// import { HiInformationCircle } from 'react-icons/hi' // Не используется после удаления UiAlert
// import { UiAlert } from '@/components/ui/UiAlert' // UiAlert удаляется
import { ProductDatabaseList } from './ProductDatabaseList'

export const ServerProductDatabasePageContent = async () => {
	const result = await getAllProductsAction()

	if (!result.success || !Array.isArray(result.data)) {
		return (
			// <UiAlert color='failure' icon={HiInformationCircle} className='my-4' title='Ошибка!'>
			// 	{result.error || 'Не удалось загрузить список ID кэшированных артикулов. Данные некорректны или отсутствуют.'}
			// </UiAlert>
			<div className='my-4 p-4 border border-red-300 rounded-lg bg-red-50 text-red-700'>
				<h3 className='font-medium'>Ошибка!</h3>
				<p>{result.error || 'Не удалось загрузить список товаров. Данные некорректны или отсутствуют.'}</p>
			</div>
		)
	}

	if (result.data.length === 0) {
		return (
			// <UiAlert color='info' icon={HiInformationCircle} className='my-4' title='Информация:'>
			// 	Кэш артикулов пуст. Ни один артикул еще не был кэширован.
			// </UiAlert>
			<div className='my-4 p-4 border border-blue-300 rounded-lg bg-blue-50 text-blue-700'>
				<h3 className='font-medium'>Информация:</h3>
				<p>База товаров пуста. Система еще не агрегировала данные ни по одному товару.</p>
				{/* Можно добавить инструкцию, как их добавить (через мониторинг или дождаться работы воркера) */}
			</div>
		)
	}

	return (
		<Suspense fallback={<Spinner aria-label='Загрузка списка товаров...' size='xl' />}>
			<ProductDatabaseList products={result.data} />
		</Suspense>
	)
}
