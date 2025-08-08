import { PageTitle } from '@/components/layout/PageTitle';
import { ServerDashboardContent } from '@/components/dashboard/ServerDashboardContent'

export default function DashboardPage() {
    return (
        <div className='container mx-auto p4'>
            <PageTitle title="Панель управления" description="Обзор ваших товаров и возможностей"/>
            <ServerDashboardContent />
        </div>
    )
}