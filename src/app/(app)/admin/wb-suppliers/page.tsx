import { ServerWbSuppliersPageContent } from '@/components/admin/wb-suppliers/ServerWbSuppliersPageContent'
import { PageTitle } from '@/components/layout/PageTitle'
import { auth } from '@/lib/auth'
import { UserRole } from '@/lib/types/user'
import { type Metadata } from 'next'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
	title: 'Поставщики Wildberries',
	description: 'Справочник всех поставщиков, чьи товары были обнаружены системой на Wildberries.',
}

const WbSuppliersPage = async () => {
	const session = await auth()
	const isAdmin = session?.user?.roles?.includes(UserRole.ADMIN) || false

	if (!isAdmin) {
		redirect('/dashboard')
	}

	return (
		<>
			<PageTitle
				title='Поставщики Wildberries'
				description='Справочник всех поставщиков, чьи товары были обнаружены системой на Wildberries.'
			/>
			<ServerWbSuppliersPageContent />
		</>
	)
}

export default WbSuppliersPage
