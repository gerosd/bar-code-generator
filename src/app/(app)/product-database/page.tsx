import { ServerProductDatabasePageContent } from '@/components/product-database/ServerProductDatabasePageContent'
import { PageTitle } from '@/components/layout/PageTitle'
import { type Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
	title: 'База товаров',
	description: 'Просмотр всех товаров, агрегированных системой из различных источников.',
}

const ProductDatabasePage = async () => {
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
