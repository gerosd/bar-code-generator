/*
  Воркер: синхронизация базовой информации о товарах из WB в MongoDB (dynamicWBData).
  Цена и всё, что с ней связано, полностью исключены.
*/

import {WildberriesAPI} from '@/lib/api/wildberries'
import {getAllActiveValidSuppliers, updateSupplier, updateSupplierTotalProducts} from '@/lib/mongo/suppliers'
import {bulkUpsertProducts} from '@/lib/mongo/dynamicWBData'
import type {WBProductCard} from '@/lib/types/supplier'
import {logger} from '@/utils/logger'

interface WorkerSupplierInfo {
    id: string
    key: string
    apiClient: WildberriesAPI
    legacySupplierId: number
}

function mapCardToUpsert(card: WBProductCard, legacySupplierId: number) {
    const firstPhoto = Array.isArray(card.photos) && card.photos.length > 0 ? card.photos[0] : undefined
    const photos = firstPhoto
        ? {
            thumbnail: firstPhoto.tm || firstPhoto.square || firstPhoto.hq || firstPhoto.big,
            medium: firstPhoto.c516x688 || firstPhoto.hq || firstPhoto.big || firstPhoto.square,
        }
        : undefined

    const sizes = (card.sizes || []).map((s) => ({
        chrtId: Number(s.chrtID || 0),
        techSize: s.techSize,
        wbSize: s.wbSize,
        skus: s.skus,
    }))

    return {
        nmId: card.nmID,
        data: {
            title: card.title,
            brand: card.brand,
            vendorCode: card.vendorCode,
            supplierId: legacySupplierId,
            cardUpdatedAt: card.updatedAt ? new Date(card.updatedAt) : undefined,
            photos,
            sizes,
        },
    }
}

async function fetchAndStoreSupplierCards(supplier: WorkerSupplierInfo) {
    const pageSize = 100
    const first = await supplier.apiClient.initProductListFetcher({pageSize})
    if (!first.success) return

    if (typeof first.totalAvailable === 'number') {
        await updateSupplierTotalProducts(supplier.id, first.totalAvailable)
    }

    if (first.data && first.data.length > 0) {
        await bulkUpsertProducts(first.data.map((c) => mapCardToUpsert(c, supplier.legacySupplierId)))
    }

    while (first.hasNextPage) {
        const next = await supplier.apiClient.fetchNextProductPage()
        if (!next.success) break
        if (next.data && next.data.length > 0) {
            await bulkUpsertProducts(next.data.map((c) => mapCardToUpsert(c, supplier.legacySupplierId)))
        }
        if (!next.hasNextPage) break
    }
}

export async function runProductAggregationWorker() {
    logger.info('Worker: запуск синхронизации карточек')
    const activeSuppliers = await getAllActiveValidSuppliers()

    for (const s of activeSuppliers) {
        try {
            let legacyId = s.legacySupplierId
            const api = new WildberriesAPI(s.key)

            // Если нет legacySupplierId, попробуем получить из API и сохранить
            if (!legacyId) {
                const legacy = await api.getSupplierLegacyInfo()
                if (legacy.success && legacy.data?.oldId) {
                    legacyId = legacy.data.oldId
                    await updateSupplier(s.id, {
                        legacySupplierId: legacyId,
                        legacySupplierName: legacy.data.supplierName
                    })
                } else {
                    logger.warn('Worker: нет legacySupplierId, пропуск поставщика', {metadata: {supplierId: s.id}})
                    continue
                }
            }

            const info: WorkerSupplierInfo = {id: s.id, key: s.key, apiClient: api, legacySupplierId: legacyId}
            await fetchAndStoreSupplierCards(info)
        } catch (e) {
            logger.error('Worker: ошибка обработки поставщика', {
                metadata: {supplierId: s.id, error: e instanceof Error ? e.message : String(e)},
            })
        }
    }
    logger.info('Worker: синхронизация завершена')
}

if (require.main === module) {
    runProductAggregationWorker().then(() => process.exit(0)).catch(() => process.exit(1))
}

