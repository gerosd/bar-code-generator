'use client'

import type { AdminClientView } from '@/lib/actions/admin-actions'
import { Button, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from 'flowbite-react'
import Link from 'next/link' // Для будущих кнопок действий

interface AllClientsListProps {
	clients: AdminClientView[]
}

export const AllClientsList: React.FC<AllClientsListProps> = ({ clients }) => {
	if (!clients || clients.length === 0) {
		// Эта проверка уже есть в ServerAllClientsPageContent, но дублирование не повредит
		return <p>Нет клиентов для отображения.</p>
	}

	return (
		<div className='overflow-x-auto'>
			<Table hoverable>
				<TableHead>
					<TableRow>
						<TableHeadCell>ID Клиента</TableHeadCell>
						<TableHeadCell>Название клиента</TableHeadCell>
						<TableHeadCell>Кол-во поставщиков</TableHeadCell>
						<TableHeadCell>Кол-во пользователей</TableHeadCell>
						<TableHeadCell>Действия</TableHeadCell>
					</TableRow>
				</TableHead>
				<TableBody className='divide-y'>
					{clients.map((client) => (
						<TableRow key={client.id} className='bg-white dark:border-gray-700 dark:bg-gray-800'>
							<TableCell className='whitespace-nowrap font-medium text-gray-900 dark:text-white'>
								{client.id}
							</TableCell>
							<TableCell>{client.name}</TableCell>
							<TableCell>{client.supplierCount}</TableCell>
							<TableCell>{client.userCount}</TableCell>
							<TableCell>
								{/* Заглушка для действий - можно будет добавить кнопки/ссылки */}
								<Link href={`/admin/clients/${client.id}/manage`}>
									<Button size='xs' color='blue'>
										Управление
									</Button>
								</Link>
								{/* Можно добавить другие кнопки, например, "Просмотреть детали" */}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	)
}
