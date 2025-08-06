import { PageTitle } from '@/components/layout/PageTitle'
import { ClientSuppliers } from '@/components/suppliers/ClientSuppliers'
import { getSuppliers } from '@/lib/actions/supplier-actions'

export const dynamic = 'force-dynamic'

const SuppliersPage = async () => {
	const suppliers = await getSuppliers()

	return (
		<div className='container mx-auto p-4'>
			<PageTitle title='Поставщики' description='Управление вашими поставщиками и их API-ключами.' />
			<ClientSuppliers initialSuppliers={suppliers} />
		</div>
	)
}

export default SuppliersPage
