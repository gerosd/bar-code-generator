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

