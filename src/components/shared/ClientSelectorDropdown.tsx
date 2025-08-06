'use client'

import { switchClient } from '@/lib/actions/client-actions'
import type { ClientType } from '@/lib/types/client'
import { Dropdown, DropdownItem } from 'flowbite-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FaBuilding, FaChevronDown } from 'react-icons/fa'

interface ClientSelectorDropdownProps {
	clients: ClientType[]
	currentClient: ClientType | null
}

export const ClientSelectorDropdown = ({ clients, currentClient }: ClientSelectorDropdownProps) => {
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)

	const handleSwitchClient = async (clientId: string) => {
		if (isLoading || clientId === currentClient?.id) return

		setIsLoading(true)
		try {
			const result = await switchClient(clientId)
			if (result.success) {
				router.refresh()
			}
		} catch (error) {
			console.error('Ошибка переключения клиента:', error)
		} finally {
			setIsLoading(false)
		}
	}

	// Если только один клиент, показываем статичный блок
	if (clients.length === 1) {
		return (
			<div className='flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg'>
				<FaBuilding className='w-4 h-4 text-gray-600 dark:text-gray-300' />
				<span className='text-sm font-medium text-gray-900 dark:text-white'>
					{currentClient?.name || 'Клиент'}
				</span>
			</div>
		)
	}

	return (
		<Dropdown
			label=''
			dismissOnClick={true}
			renderTrigger={() => (
				<button
					type='button'
					className='flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50'
					disabled={isLoading}
				>
					<FaBuilding className='w-4 h-4 text-gray-600 dark:text-gray-300' />
					<span className='text-sm font-medium text-gray-900 dark:text-white'>
						{currentClient?.name || 'Выберите клиента'}
					</span>
					<FaChevronDown className='w-3 h-3 text-gray-500' />
				</button>
			)}
		>
			{clients.map((client) => (
				<DropdownItem
					key={client.id}
					onClick={() => handleSwitchClient(client.id)}
					className={currentClient?.id === client.id ? 'bg-blue-50 dark:bg-blue-900' : ''}
				>
					<div className='flex items-center space-x-2'>
						<FaBuilding className='w-4 h-4' />
						<span>{client.name}</span>
						{currentClient?.id === client.id && (
							<span className='text-xs text-blue-600 dark:text-blue-400'>(текущий)</span>
						)}
					</div>
				</DropdownItem>
			))}
		</Dropdown>
	)
}
