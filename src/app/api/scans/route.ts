import { NextRequest, NextResponse } from 'next/server'
import { findRecentScansWithPagination, getTotalScansCount } from '@/lib/mongo/scanHistory'

export async function GET(request: NextRequest) {
    const url = new URL(request.url)
    const limitParam = url.searchParams.get('limit')
    const offsetParam = url.searchParams.get('offset')
    const limit = Math.min(200, Math.max(1, Number(limitParam ?? 50) || 50))
    const offset = Math.max(0, Number(offsetParam ?? 0) || 0)
    
    try {
        const [items, totalCount] = await Promise.all([
            findRecentScansWithPagination(limit, offset),
            getTotalScansCount()
        ])
        
        // Безопасно обрабатываем каждый элемент
        const safeItems = items.map(i => {
            // Проверяем, что все поля существуют и имеют правильные типы
            const safeItem = {
                code: String(i.code || ''),
                scannedAt: i.scannedAt.toISOString(),
                count: Number(i.count || 0)
            }
            
            // Убираем любые undefined или null значения
            Object.keys(safeItem).forEach(key => {
                if (safeItem[key as keyof typeof safeItem] === undefined || safeItem[key as keyof typeof safeItem] === null) {
                    delete safeItem[key as keyof typeof safeItem]
                }
            })
            
            return safeItem
        })
        
        return NextResponse.json({ 
            success: true, 
            items: safeItems,
            totalCount,
            hasMore: offset + limit < totalCount,
            currentOffset: offset,
            currentLimit: limit
        })
    } catch (error) {
        console.error('Error in scans API:', error)
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера' 
        }, { status: 500 })
    }
}

