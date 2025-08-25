import type { Collection, Filter, WithId } from 'mongodb';
import { getCollection } from './client';
import { executeMongoOperation } from './utils';

const SCAN_HISTORY_COLLECTION_NAME = 'scanHistory';

export interface ScanHistoryDoc {
    code: string; // Полный DataMatrix
    scannedAt: Date; // Время последнего сканирования
    count: number; // Сколько раз был отсканирован
}

async function getScanHistoryCollection(): Promise<Collection<ScanHistoryDoc>> {
    return (await getCollection(SCAN_HISTORY_COLLECTION_NAME)) as unknown as Collection<ScanHistoryDoc>;
}

export async function findScanByCode(code: string): Promise<WithId<ScanHistoryDoc> | null> {
    const collection = await getScanHistoryCollection();
    return executeMongoOperation(
        () => collection.findOne({ code } as Filter<ScanHistoryDoc>),
        'поиске истории сканирования по коду'
    );
}

export async function recordScan(code: string): Promise<void> {
    const collection = await getScanHistoryCollection();
    await executeMongoOperation(
        () =>
            collection.updateOne(
                { code } as Filter<ScanHistoryDoc>,
                {
                    $setOnInsert: { code },
                    $set: { scannedAt: new Date() },
                    $inc: { count: 1 },
                },
                { upsert: true }
            ),
        'сохранении истории сканирования'
    );
}

export type { WithId };

import type { ModifyResult } from 'mongodb';

export async function bumpScanAndGet(code: string): Promise<WithId<ScanHistoryDoc>> {
    const collection = await getScanHistoryCollection();
    const result = (await executeMongoOperation(
        () =>
            collection.findOneAndUpdate(
                { code } as Filter<ScanHistoryDoc>,
                {
                    $setOnInsert: { code },
                    $set: { scannedAt: new Date() },
                    $inc: { count: 1 },
                },
                { upsert: true, returnDocument: 'after' }
            ),
        'обновлении и чтении истории сканирования'
    )) as unknown as ModifyResult<ScanHistoryDoc>;
    // result.value всегда должен быть, так как upsert: true
    // но добавим подстраховку
    if (!result || !result.value) {
        // В крайне редком случае повторим чтение
        const reRead = await collection.findOne({ code } as Filter<ScanHistoryDoc>);
        if (!reRead) {
            throw new Error('Не удалось сохранить историю сканирования');
        }
        return reRead as WithId<ScanHistoryDoc>;
    }
    return result.value as WithId<ScanHistoryDoc>;
}

export async function findRecentScans(limit = 50): Promise<WithId<ScanHistoryDoc>[]> {
    const collection = await getScanHistoryCollection();
    return executeMongoOperation(
        () => collection.find({} as Filter<ScanHistoryDoc>).sort({ scannedAt: -1 }).limit(limit).toArray(),
        'получении последних сканов'
    );
}

export async function findRecentScansWithPagination(limit = 50, offset = 0): Promise<WithId<ScanHistoryDoc>[]> {
    const collection = await getScanHistoryCollection();
    return executeMongoOperation(
        () => collection.find({} as Filter<ScanHistoryDoc>).sort({ scannedAt: -1 }).skip(offset).limit(limit).toArray(),
        'получении сканов с пагинацией'
    );
}

export async function getTotalScansCount(): Promise<number> {
    const collection = await getScanHistoryCollection();
    return executeMongoOperation(
        () => collection.countDocuments({} as Filter<ScanHistoryDoc>),
        'получении общего количества сканов'
    );
}

/**
 * Гарантирует, что TTL-индекс для scanHistory создан (автоудаление старых записей)
 */
export async function ensureScanHistoryTTLIndex() {
    await createScanHistoryTTLIndex();
}

/**
 * Создать индекс для автоматического удаления старых записей (TTL)
 */
export async function createScanHistoryTTLIndex(): Promise<void> {
    const collection = await getScanHistoryCollection();
    try {
        // Создаем TTL индекс - записи автоматически удаляются через 24 часа
        await collection.createIndex(
            { scannedAt: 1 },
            {
                expireAfterSeconds: 24 * 60 * 60, // 24 часа в секундах
                name: 'scan_history_ttl',
            }
        );
        console.log('TTL индекс для истории сканирования создан успешно');
    } catch (error) {
        // Индекс уже может существовать, игнорируем ошибку
        console.log('TTL индекс уже существует или произошла ошибка при создании:', error);
    }
}

