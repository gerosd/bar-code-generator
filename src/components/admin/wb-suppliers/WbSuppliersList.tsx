'use client'

import type { WbSupplierSafeData } from '@/lib/types/wbSupplier'
import { Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from 'flowbite-react'
import React from "react";

interface WbSuppliersListProps {
	suppliers: WbSupplierSafeData[]
}

export const WbSuppliersList: React.FC<WbSuppliersListProps> = ({ suppliers }) => {
	if (!suppliers || suppliers.length === 0) {
		return <p>Нет поставщиков для отображения.</p>
	}

	return (
		<div className='overflow-auto shadow-md sm:rounded-lg max-h-[calc(100vh-12rem)]'>
			<Table hoverable>
				<TableHead className='sticky top-0 z-10 bg-gray-50 dark:bg-gray-700'>
					<TableRow>
						<TableHeadCell>Legacy ID</TableHeadCell>
						<TableHeadCell>Имя поставщика</TableHeadCell>
						<TableHeadCell>Дата создания</TableHeadCell>
						<TableHeadCell>Дата обновления</TableHeadCell>
					</TableRow>
				</TableHead>
				<TableBody className='divide-y'>
					{suppliers.map((supplier) => (
						<TableRow key={supplier.id} className='bg-white dark:border-gray-700 dark:bg-gray-800'>
							<TableCell className='whitespace-nowrap font-medium text-gray-900 dark:text-white'>
								{supplier.legacySupplierId}
							</TableCell>
							<TableCell>{supplier.name}</TableCell>
							<TableCell>{new Date(supplier.createdAt).toLocaleString('ru-RU')}</TableCell>
							<TableCell>{new Date(supplier.updatedAt).toLocaleString('ru-RU')}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	)
}
