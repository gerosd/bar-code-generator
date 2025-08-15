import { ServerAllClientsPageContent } from '@/components/admin/all-clients/ServerAllClientsPageContent'
import { PageTitle } from '@/components/layout/PageTitle'
import { FullPageSpinner } from '@/components/ui/FullPageSpinner'
import { authOptions } from '@/lib/auth'
import { UserRole } from '@/lib/types/user'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

export default async function AdminAllClientsPage() {
	const session = await getServerSession(authOptions)

	if (!session?.user?.id || !session.user.roles?.includes(UserRole.ADMIN)) {
		// Если пользователь не админ или не аутентифицирован, перенаправляем
		// Можно перенаправить на страницу логина или на главную с сообщением об ошибке
		redirect('/dashboard') // Или на /auth/error?error=AccessDenied
	}

	return (
		<>
			<PageTitle title='Все клиенты' description='Список всех клиентов системы и количество их поставщиков.' />
			<Suspense fallback={<FullPageSpinner />}>
				<ServerAllClientsPageContent />
			</Suspense>
		</>
	)
}
