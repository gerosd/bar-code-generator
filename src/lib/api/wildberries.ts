import {
    DecodedToken,
    GetProductsListParams,
    GetProductsListResult,
    InitProductListParams,
    ProductPageResult,
    ValidateApiKeyResult,
} from '@/lib/types/supplier'
import { WildberriesAPIBase } from './wildberries/WildberriesAPIBase'
import {
	checkConnection as checkConnectionFunc,
	decodeToken as decodeTokenFunc,
	validateApiKey as validateApiKeyFunc,
} from './wildberries/authMethods'

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

    // Удалено: методы работы с ценами

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
