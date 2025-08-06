import { ObjectId } from 'mongodb'
import { ChangeTriggerType } from './dynamicWBData'

export type PriceHistoryTrigger = ChangeTriggerType | 'REPRICER_EXECUTION' | 'INITIAL_RECORD'

export interface PriceHistoryEntry {
	_id?: ObjectId
	nmId: number
	createdAt: Date
	apiPrice: number
	apiDiscount: number
	sitePrice: number
	spp: number
	trigger?: PriceHistoryTrigger
}
