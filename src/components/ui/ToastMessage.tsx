'use client'

import { useToast } from '@/components/providers/ToastProvider'
import { Toast, ToastToggle } from 'flowbite-react'
import { useEffect, useState } from 'react'
import { HiCheckCircle, HiExclamationCircle, HiInformationCircle, HiXCircle } from 'react-icons/hi'

interface ToastMessageProps {
	id: number
	message: string
	type: 'success' | 'error' | 'warning' | 'info'
	duration?: number
}

const ICONS = {
	success: HiCheckCircle,
	error: HiXCircle,
	warning: HiExclamationCircle,
	info: HiInformationCircle,
}

const TOAST_COLORS = {
	success: 'bg-green-100 text-green-500 dark:bg-green-800 dark:text-green-200',
	error: 'bg-red-100 text-red-500 dark:bg-red-800 dark:text-red-200',
	warning: 'bg-yellow-100 text-yellow-500 dark:bg-yellow-800 dark:text-yellow-200',
	info: 'bg-blue-100 text-blue-500 dark:bg-blue-800 dark:text-blue-200',
}

export const ToastMessage = ({ id, message, type, duration = 5000 }: ToastMessageProps) => {
	const { removeToast } = useToast()
	const [isVisible, setIsVisible] = useState(true)

	useEffect(() => {
		const timer = setTimeout(() => {
			setIsVisible(false)
			setTimeout(() => removeToast(id), 300)
		}, duration)

		return () => {
			clearTimeout(timer)
		}
	}, [id, duration, removeToast])

	const handleDismiss = () => {
		setIsVisible(false)
		setTimeout(() => removeToast(id), 300)
	}

	if (!isVisible) {
		return null
	}

	const IconComponent = ICONS[type]
	const toastColor = TOAST_COLORS[type]

	return (
		<Toast
			className={`transition-all duration-300 ease-in-out ${
				isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'
			}`}
		>
			<div className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toastColor}`}>
				<IconComponent className='h-5 w-5' />
			</div>
			<div className='ml-3 text-sm font-normal'>{message}</div>
			<ToastToggle onDismiss={handleDismiss} />
		</Toast>
	)
}
