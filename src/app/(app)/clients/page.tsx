import { ClientList } from '@/components/clients/ClientList'
import { PageTitle } from '@/components/layout/PageTitle'
import { listClientsForUser } from '@/lib/actions/client-actions'
import { auth } from '@/lib/auth'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
	title: 'Управление клиентами',
	description: 'Управление вашими клиентами и их настройками',
}

// Принудительно динамический рендеринг
export const dynamic = 'force-dynamic'

export default async function ManageClientsPage() {
	const session = await auth()
	if (!session?.user?.id) {
		// Пользователь не авторизован, перенаправляем на страницу входа
		redirect('/auth/signin?callbackUrl=/clients')
	}

	const clientsResult = await listClientsForUser()

	// Не отображаем ClientList если есть ошибка при получении списка клиентов
	if (!clientsResult.success) {
		return (
			<div className='p-4 md:p-6'>
				<PageTitle title='Управление клиентами' description='Управление вашими клиентами и их настройками' />
				<p className='text-red-500'>Не удалось загрузить список клиентов: {clientsResult.error}</p>
			</div>
		)
	}

	return (
		<div className='p-4 md:p-6'>
			<PageTitle title='Управление клиентами' description='Управление вашими клиентами и их настройками' />
			<ClientList initialClients={clientsResult.clients} currentUserId={session.user.id} />
		</div>
	)
}
