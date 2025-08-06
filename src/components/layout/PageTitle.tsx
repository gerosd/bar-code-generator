interface PageTitleProps {
    title: string
    description?: string
}

export const PageTitle: React.FC<PageTitleProps> = ({ title, description }: PageTitleProps) => {
    return (
        <div className='mb-6'>
            <h1 className='text-2xl font-semibold text-gray-900 dark:text-white'>{title}</h1>
            {description && <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>{description}</p>}
        </div>
    )
}
