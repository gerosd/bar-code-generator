import { NextRequest, NextResponse } from 'next/server'
import { findRecentScans } from '@/lib/mongo/scanHistory'

export async function GET(request: NextRequest) {
    const url = new URL(request.url)
    const limitParam = url.searchParams.get('limit')
    const limit = Math.min(200, Math.max(1, Number(limitParam ?? 50) || 50))
    try {
        const items = await findRecentScans(limit)
        return NextResponse.json({ success: true, items: items.map(i => ({ code: i.code, scannedAt: i.scannedAt, count: i.count })) })
    } catch (error) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}

