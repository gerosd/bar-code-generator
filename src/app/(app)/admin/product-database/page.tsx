import { ServerProductDatabasePageContent } from '@/components/admin/product-database/ServerProductDatabasePageContent'
import { PageTitle } from '@/components/layout/PageTitle'
import { auth } from '@/lib/auth'
import { UserRole } from '@/lib/types/user'
import { type Metadata } from 'next'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
	title: 'База товаров',
	description: 'Просмотр всех товаров, агрегированных системой из различных источников.',
}

const ProductDatabasePage = async () => {
	const session = await auth()
	const isAdmin = session?.user?.roles?.includes(UserRole.ADMIN) || false

	if (!isAdmin) {
		redirect('/dashboard')
	}

	return (
		<>
			<PageTitle
				title='База товаров'
				description='Просмотр всех товаров, агрегированных системой из различных источников.'
			/>
			<ServerProductDatabasePageContent />
		</>
	)
}

export default ProductDatabasePage
