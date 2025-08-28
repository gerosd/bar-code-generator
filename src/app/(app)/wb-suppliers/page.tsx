import { ServerWbSuppliersPageContent } from '@/components/wb-suppliers/ServerWbSuppliersPageContent'
import { PageTitle } from '@/components/layout/PageTitle'
import { type Metadata } from 'next'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
	title: 'Поставщики Wildberries',
	description: 'Справочник всех поставщиков, чьи товары были обнаружены системой на Wildberries.',
}

const WbSuppliersPage = async () => {
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
