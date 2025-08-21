'use client'

import React, { useEffect, useState } from 'react'

type Item = {
    code: string
    scannedAt: string
    count: number
}

export default function ScanHistory() {
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [printingCode, setPrintingCode] = useState<string | null>(null)
    const [hasMore, setHasMore] = useState(false)
    const [currentOffset, setCurrentOffset] = useState(0)
    const [totalCount, setTotalCount] = useState(0)

    const load = async (reset = false) => {
        if (reset) {
            setLoading(true)
            setCurrentOffset(0)
        } else {
            setLoadingMore(true)
        }
        
        try {
            const offset = reset ? 0 : currentOffset
            const res = await fetch(`/api/scans?limit=50&offset=${offset}`)
            const json = await res.json()
            if (json.success && Array.isArray(json.items)) {
                if (reset) {
                    setItems(json.items)
                } else {
                    setItems(prev => [...prev, ...json.items])
                }
                setHasMore(json.hasMore)
                setCurrentOffset(json.currentOffset + json.currentLimit)
                setTotalCount(json.totalCount)
            }
        } catch (e) {
            // ignore
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            load(false)
        }
    }

    useEffect(() => {
        load(true);
        const id = setInterval(() => load(true), 10000)
        return () => clearInterval(id)
    }, [])

    if (loading && items.length === 0) {
        return <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">Загрузка…</div>
    }

    if (items.length === 0) {
        return <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">Пока нет записей</div>
    }

    return (
        <div className="mt-3">
            <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                Показано {items.length} из {totalCount} записей
            </div>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((it, idx) => (
                    <li key={idx} className="py-2">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(it.scannedAt).toLocaleString()}</div>
                                <div className="text-sm font-mono break-all text-gray-900 dark:text-gray-100">{it.code}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Сканирован: {it.count} раз(а)</div>
                            </div>
                            <div className="shrink-0">
                                <button
                                    className="px-3 py-1.5 rounded-md bg-blue-600 text-white disabled:opacity-50"
                                    disabled={printingCode === it.code}
                                    onClick={async () => {
                                        setPrintingCode(it.code)
                                        try {
                                            const dataMatrix = it.code
                                            // Пытаемся получить данные по EAN-13 из матрицы, если возможно
                                            const barcodeCandidate = dataMatrix.slice(3, 16)
                                            const isEAN13 = /^\d{13}$/.test(barcodeCandidate)
                                            let productName = ''
                                            let productSize = ''
                                            let nmId = ''
                                            let vendorCode = ''
                                            if (isEAN13) {
                                                try {
                                                    const res = await fetch(`/api/print?barcode=${encodeURIComponent(barcodeCandidate)}`)
                                                    const json = await res.json()
                                                    if (json.success && json.product && json.product.title) {
                                                        productName = json.product.title
                                                        productSize = json.product.size || ''
                                                        nmId = json.product.nmId
                                                        vendorCode = json.product.vendorCode || ''
                                                    }
                                                } catch {
                                                    // ignore fetch errors, печать возможна и без данных
                                                }
                                            }
                                            await fetch('/api/print', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    scannedData: dataMatrix,
                                                    productName,
                                                    productSize,
                                                    nmId,
                                                    vendorCode,
                                                    dataMatrixCount: 1,
                                                    ean13Count: 1,
                                                }),
                                            })
                                        } finally {
                                            setPrintingCode(null)
                                        }
                                    }}
                                >
                                    {printingCode === it.code ? 'Печать…' : 'Напечатать еще'}
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
            
            {hasMore && (
                <div className="mt-4 text-center">
                    <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loadingMore ? 'Загрузка…' : 'Загрузить еще'}
                    </button>
                </div>
            )}
        </div>
    )
}

