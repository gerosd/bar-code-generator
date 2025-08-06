'use client'

import { SupplierData } from '@/lib/types/supplier'
import { Button } from 'flowbite-react'
import { useEffect, useState } from 'react'
import { SupplierForm } from './SupplierForm'
import { SupplierList } from './SupplierList'

interface ClientSuppliersProps {
	initialSuppliers: SupplierData[]
}

export const ClientSuppliers = ({ initialSuppliers }: ClientSuppliersProps) => {
	const [suppliers, setSuppliers] = useState<SupplierData[]>(initialSuppliers)
	const [showNewSupplierForm, setShowNewSupplierForm] = useState(false)

	// Обновление локального состояния при получении новых данных от сервера
	useEffect(() => {
		setSuppliers(initialSuppliers)
	}, [initialSuppliers])

	const handleSupplierAdded = (newSupplier: SupplierData) => {
		setSuppliers((prev) => [newSupplier, ...prev])
		setShowNewSupplierForm(false)
	}

	const handleSupplierDeleted = (id: string) => {
		setSuppliers((prev) => prev.filter((supplier) => supplier.id !== id))
	}

	return (
		<div>
			<div className='mb-6 flex items-center justify-between'>
				<div></div>
				<div className='flex gap-3'>
					<Button onClick={() => setShowNewSupplierForm(!showNewSupplierForm)} color='blue'>
						{showNewSupplierForm ? 'Скрыть форму' : 'Добавить поставщика'}
					</Button>
				</div>
			</div>

			{showNewSupplierForm && (
				<div className='mb-8'>
					<SupplierForm onSupplierAddedAction={handleSupplierAdded} />
				</div>
			)}

			<SupplierList initialSuppliers={suppliers} onSupplierDeletedAction={handleSupplierDeleted} />
		</div>
	)
}
