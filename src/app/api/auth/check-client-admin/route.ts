import { isCurrentUserClientAdminAction } from '@/lib/actions/client-actions'
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
	// Дополнительно можно проверить аутентификацию прямо здесь, если это необходимо
	// хотя isCurrentUserClientAdminAction уже это делает внутри
	const session = await auth()
	if (!session?.user?.id) {
		return NextResponse.json({ isClientAdmin: false, error: 'Not authenticated' }, { status: 401 })
	}

	try {
		const isClientAdmin = await isCurrentUserClientAdminAction()
		return NextResponse.json({ isClientAdmin })
	} catch (error) {
		console.error('[API check-client-admin] Error:', error)
		return NextResponse.json({ isClientAdmin: false, error: 'Internal server error' }, { status: 500 })
	}
}
