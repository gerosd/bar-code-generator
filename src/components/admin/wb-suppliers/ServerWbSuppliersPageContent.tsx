import { getAllWbSuppliersAction } from '@/lib/actions/admin-actions'
import { Spinner } from 'flowbite-react'
import { Suspense } from 'react'
import { WbSuppliersList } from './WbSuppliersList'

export const ServerWbSuppliersPageContent = async () => {
	const result = await getAllWbSuppliersAction()

	if (!result.success || !Array.isArray(result.data)) {
		return (
			<div className='my-4 p-4 border border-red-300 rounded-lg bg-red-50 text-red-700'>
				<h3 className='font-medium'>Ошибка!</h3>
				<p>
					{result.error || 'Не удалось загрузить список поставщиков WB. Данные некорректны или отсутствуют.'}
				</p>
			</div>
		)
	}

	if (result.data.length === 0) {
		return (
			<div className='my-4 p-4 border border-blue-300 rounded-lg bg-blue-50 text-blue-700'>
				<h3 className='font-medium'>Информация:</h3>
				<p>Справочник поставщиков WB пуст. Система еще не обнаружила ни одного поставщика.</p>
			</div>
		)
	}

	return (
		<Suspense fallback={<Spinner aria-label='Загрузка списка поставщиков...' size='xl' />}>
			<WbSuppliersList suppliers={result.data} />
		</Suspense>
	)
}
