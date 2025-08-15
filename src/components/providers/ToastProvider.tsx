'use client'

import { createContext, ReactNode, useCallback, useContext, useState } from 'react'

interface ToastMessage {
	id: number
	message: string
	type: 'success' | 'error' | 'warning' | 'info'
	duration?: number
}

interface ToastContextType {
	toasts: ToastMessage[]
	addToast: (message: string, type: ToastMessage['type'], duration?: number) => void
	removeToast: (id: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
	const context = useContext(ToastContext)
	if (!context) {
		throw new Error('Хук useToast должен использоваться внутри ToastProvider')
	}
	return context
}

interface ToastProviderProps {
	children: ReactNode
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
	const [toasts, setToasts] = useState<ToastMessage[]>([])

	const addToast = useCallback((message: string, type: ToastMessage['type'], duration: number = 5000) => {
		setToasts((prevToasts) => {
			const newToast: ToastMessage = {
				id: prevToasts.length > 0 ? prevToasts[prevToasts.length - 1].id + 1 : 0,
				message,
				type,
				duration,
			}
			return [...prevToasts, newToast]
		})
	}, [])

	const removeToast = useCallback((id: number) => {
		setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
	}, [])

	return <ToastContext.Provider value={{ toasts, addToast, removeToast }}>{children}</ToastContext.Provider>
}
