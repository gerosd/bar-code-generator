import {PageTitle} from '@/components/layout/PageTitle'
import ProfileForm from '@/components/profile/ProfileForm'
import {auth} from '@/lib/auth'
import {getUserById} from '@/lib/mongo/users'

const ProfilePage = async () => {
    const session = await auth()
    const userId = session?.user?.id || ''
    const dbUser = userId ? await getUserById(userId) : null

    const initialFullName = [dbUser?.first_name, dbUser?.last_name].filter(Boolean).join(' ') || session?.user?.name || ''
    const initialEmail = dbUser?.email || ''
    const canChangePassword = !!dbUser && dbUser.email && dbUser._id === dbUser.email
    const hasExistingPassword = !!dbUser?.password

    return (
        <div className='container mx-auto p-4'>
            <PageTitle title='Настройки профиля' description='Обновите имя и email для вашего аккаунта.'/>
            <div className='max-w-2xl mx-auto'>
                <div
                    className='rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm'>
                    <ProfileForm initialFullName={initialFullName} initialEmail={initialEmail} canChangePassword={!!canChangePassword} hasExistingPassword={hasExistingPassword}/>
                </div>
            </div>
        </div>
    )
}

export default ProfilePage

