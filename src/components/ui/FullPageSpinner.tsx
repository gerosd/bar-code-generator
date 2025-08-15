import { Spinner } from 'flowbite-react'

export const FullPageSpinner = () => {
	return (
		<div className='flex items-center justify-center h-screen'>
			<Spinner aria-label='Загрузка...' size='xl' />
		</div>
	)
}
