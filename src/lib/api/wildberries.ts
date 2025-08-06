import {
	DecodedToken,
	GetProductsListParams,
	GetProductsListResult,
	InitProductListParams,
	ProductPageResult,
	ValidateApiKeyResult,
	WBPrice,
	WBSetPriceResponse,
	WBUploadPriceItem,
	WBUploadPricesResponse,
} from '@/lib/types/supplier'
import { WildberriesAPIBase } from './wildberries/WildberriesAPIBase'
import {
	checkConnection as checkConnectionFunc,
	decodeToken as decodeTokenFunc,
	validateApiKey as validateApiKeyFunc,
} from './wildberries/authMethods'
import {
	getAllPrices as getAllPricesFunc,
	getPriceByNmId as getPriceByNmIdFunc,
	setPrices as setPricesFunc,
	uploadPricesTask as uploadPricesTaskFunc,
} from './wildberries/priceMethods'
import {
	fetchNextProductPage as fetchNextProductPageFunc,
	getProductsList as getProductsListFunc,
	initProductListFetcher as initProductListFetcherFunc,
} from './wildberries/productMethods'
import { getSupplierLegacyInfo as getSupplierLegacyInfoFunc, SupplierLegacyInfo } from './wildberries/supplierMethods'

export class WildberriesAPI extends WildberriesAPIBase {
	constructor(token: string) {
		super(token)
	}

	// Auth Methods
	public decodeToken(): DecodedToken {
		return decodeTokenFunc(this)
	}

	public async checkConnection(): Promise<{
		isConnected: boolean
		error?: string
		responseData?: unknown
	}> {
		return checkConnectionFunc(this)
	}

	public async validateApiKey(): Promise<ValidateApiKeyResult> {
		return validateApiKeyFunc(this)
	}

	// Product Methods
	public async getProductsList(params: GetProductsListParams = {}): Promise<GetProductsListResult> {
		return getProductsListFunc(this, params)
	}

	public async initProductListFetcher(params: InitProductListParams = {}): Promise<ProductPageResult> {
		return initProductListFetcherFunc(this, params)
	}

	public async fetchNextProductPage(): Promise<ProductPageResult> {
		return fetchNextProductPageFunc(this)
	}

	// Price Methods
	public async getPriceByNmId(nmId: number): Promise<{
		success: boolean
		data?: WBPrice
		error?: string
	}> {
		return getPriceByNmIdFunc(this, nmId)
	}

	public async getAllPrices(options?: {
		supplierId?: string
		totalProducts?: number
		updateTotalProductsCallback?: (supplierId: string, totalProducts: number) => Promise<void>
	}): Promise<{
		success: boolean
		data?: WBPrice[]
		error?: string
	}> {
		return getAllPricesFunc(this, options)
	}

	public async setPrices(prices: WBPrice[]): Promise<{
		success: boolean
		error?: string
		results?: WBSetPriceResponse[]
	}> {
		return setPricesFunc(this, prices)
	}

	/**
	 * @param updates - Массив объектов с данными для обновления цен.
	 * @returns {Promise<WBUploadPricesResponse>} Результат выполнения задачи.
	 */
	public async uploadPricesTask(updates: WBUploadPriceItem[]): Promise<WBUploadPricesResponse> {
		return uploadPricesTaskFunc(this, updates)
	}

	// Supplier Methods
	public async getSupplierLegacyInfo(): Promise<{
		success: boolean
		data?: SupplierLegacyInfo
		error?: string
	}> {
		return getSupplierLegacyInfoFunc(this)
	}

	// getDebugInfo() is inherited from WildberriesAPIBase
}

export type { WBPrice }
