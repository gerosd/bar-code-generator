import { getClientSelectorData } from '@/lib/actions/client-actions'
import { ClientSelectorDropdown } from './ClientSelectorDropdown'

export const ServerClientSelector = async () => {
	const result = await getClientSelectorData()

	if (!result.success || !result.availableClients || result.availableClients.length === 0) {
		const errorMessage = result.error || 'Нет доступных клиентов'
		return (
			<div className='flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg'>
				<span className='text-sm text-gray-500'>{errorMessage}</span>
			</div>
		)
	}

	return <ClientSelectorDropdown clients={result.availableClients} currentClient={result.selectedClient} />
}
