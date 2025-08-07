'use client'

import { getClientSelectorData, switchClient } from '@/lib/actions/client-actions'
import type { ClientType } from '@/lib/types/client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

interface ClientContextType {
    availableClients: ClientType[]
    currentClient: ClientType | null
    isLoading: boolean
    switchToClient: (clientId: string) => Promise<void>
    refreshClients: () => Promise<void>
}

const ClientContext = createContext<ClientContextType | undefined>(undefined)

interface ClientProviderProps {
    children: ReactNode
}

export const ClientProvider = ({ children }: ClientProviderProps) => {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [availableClients, setAvailableClients] = useState<ClientType[]>([])
    const [currentClient, setCurrentClient] = useState<ClientType | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const loadClientData = useCallback(async () => {
        if (status !== 'authenticated' || !session?.user?.id) {
            setAvailableClients([])
            setCurrentClient(null)
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        try {
            const result = await getClientSelectorData()
            if (result.success) {
                setAvailableClients(result.availableClients || [])
                setCurrentClient(result.selectedClient || null)

                // Если getClientSelectorData определил, что нужно установить cookie (например, первый вход)
                if (result.clientIdToSetInCookie) {
                    console.info(
                        `ClientProvider: Рекомендована установка cookie currentClientId=${result.clientIdToSetInCookie}`
                    )
                    await switchClient(result.clientIdToSetInCookie)
                    // После установки cookie, данные о selectedClient могут быть уже актуальны из result,
                    // но можно и перезапросить router.refresh() на всякий случай, если серверная логика зависит от cookie.
                    // router.refresh(); // Пока не будем, чтобы избежать лишних перезагрузок при первой загрузке.
                    // setCurrentClient должен был уже установиться из result.selectedClient, который должен быть клиентом по умолчанию
                }
            } else {
                console.error('ClientProvider: Ошибка загрузки данных клиентов:', result.error)
                setAvailableClients([])
                setCurrentClient(null)
            }
        } catch (error) {
            console.error('ClientProvider: Исключение при загрузке данных клиентов:', error)
            setAvailableClients([])
            setCurrentClient(null)
        } finally {
            setIsLoading(false)
        }
    }, [status, session])

    const switchToClientHandler = async (clientId: string) => {
        // Проверяем, действительно ли клиент изменился, чтобы избежать лишних действий
        if (currentClient?.id === clientId) {
            console.info('ClientProvider: Попытка переключиться на уже активного клиента.')
            return
        }
        try {
            const result = await switchClient(clientId)
            if (result.success) {
                const newSelectedClient = availableClients.find((c) => c.id === clientId)
                setCurrentClient(newSelectedClient || null)
                console.info(
                    `ClientProvider: Клиент переключен на ${clientId}, cookie обновлен. Обновление страницы...`
                )
                router.refresh()
            } else {
                console.error('ClientProvider: Ошибка при переключении клиента (server action):', result.error)
            }
        } catch (error) {
            console.error('ClientProvider: Исключение при переключении клиента:', error)
        }
    }

    useEffect(() => {
        loadClientData()
    }, [loadClientData])

    const value: ClientContextType = {
        availableClients,
        currentClient,
        isLoading,
        switchToClient: switchToClientHandler,
        refreshClients: loadClientData,
    }

    return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
}

export const useCurrentClient = () => {
    const context = useContext(ClientContext)
    if (context === undefined) {
        throw new Error('useCurrentClient должен использоваться внутри ClientProvider')
    }
    return context
}
