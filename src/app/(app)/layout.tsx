import ClientSidebarWrapper from '@/components/layout/ClientSidebarWrapper'
import ServerHeader from '@/components/layout/ServerHeader'
import { isCurrentUserClientAdminAction } from '@/lib/actions/client-actions'
import { auth } from '@/lib/auth'
import { UserRole } from '@/lib/types/user'
import { ReactNode } from 'react'

interface DashboardLayoutProps {
    children: ReactNode;
}

const AppGroupLayout = async ({ children }: DashboardLayoutProps) => {
    const session = await auth();
    const isAdmin = session?.user?.roles?.includes(UserRole.ADMIN) || false;
    const isClientAdmin = await isCurrentUserClientAdminAction();

    return (
        <div className='flex min-h-screen bg-gray-50 dark:bg-gray-900'>
            {/* ClientSidebarWrapper будет решать, показывать Sidebar или Drawer с Sidebar */}
            <ClientSidebarWrapper isAdmin={isAdmin} isClientAdmin={isClientAdmin}/>

            {/* Убираем отступ ml-64 на маленьких экранах (до md), добавляем его на md и выше */}
            <div className='flex-1 md:ml-64 min-w-0'>
                {/* ServerHeader должен будет получить пропс для открытия мобильного меню */}
                <ServerHeader />

                <main className='pt-24 pb-4 px-4'>{children}</main>
            </div>
        </div>
    )
}

export default AppGroupLayout;