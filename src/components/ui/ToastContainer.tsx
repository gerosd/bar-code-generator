'use client'

import { useToast } from '@/components/providers/ToastProvider'
import { ToastMessage } from './ToastMessage'

export const ToastContainer = () => {
	const { toasts } = useToast()

	return (
		<div className='fixed bottom-5 right-5 z-50 flex flex-col space-y-2'>
			{toasts.map((toast) => (
				<ToastMessage
					key={toast.id}
					id={toast.id}
					message={toast.message}
					type={toast.type}
					duration={toast.duration}
				/>
			))}
		</div>
	)
}
