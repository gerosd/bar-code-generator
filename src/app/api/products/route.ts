import { NextRequest, NextResponse } from 'next/server'
import { getAllProductsAdminView } from '@/lib/mongo/dynamicWBData'

export async function GET(request: NextRequest) {
    try {
        const products = await getAllProductsAdminView()
        
        // Фильтруем только товары с названием и сортируем по названию
        const filteredProducts = products
            .filter(product => product.title && product.title.trim() !== '')
            .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
            .slice(0, 1000) // Ограничиваем количество для производительности
        
        return NextResponse.json({ 
            success: true, 
            data: filteredProducts 
        })
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
        }, { status: 500 })
    }
} 