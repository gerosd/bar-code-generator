import { getAllClientsForAdminAction } from '@/lib/actions/admin-actions'
import { Alert } from 'flowbite-react'
import { AllClientsList } from './AllClientsList' // Этот компонент будет создан следующим

export const ServerAllClientsPageContent = async () => {
	const result = await getAllClientsForAdminAction()

	if (!result.success || !Array.isArray(result.data)) {
		return (
			<Alert color='failure' className='my-4'>
				<h3 className='font-medium'>Ошибка!</h3>
				<p>{result.error || 'Не удалось загрузить список клиентов. Данные некорректны или отсутствуют.'}</p>
			</Alert>
		)
	}

	if (result.data.length === 0) {
		return (
			<Alert color='info' className='my-4'>
				<p>Клиенты в системе еще не зарегистрированы.</p>
			</Alert>
		)
	}

	return <AllClientsList clients={result.data} />
}
