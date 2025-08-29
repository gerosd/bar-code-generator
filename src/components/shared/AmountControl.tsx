import React from "react";

interface AmountControlProps {
    setBarcodeAmountAction: (value: number) => void;
    setDataMatrixCountAction: (value: number) => void;
    confirmOpen: boolean;
    loading: boolean;
    dataMatrixCount: number;
    barcodeAmount: number;
}

export default function AmountControl({setDataMatrixCountAction, setBarcodeAmountAction, confirmOpen, loading, dataMatrixCount, barcodeAmount}: AmountControlProps) {
    return(
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="block">
                <span className="text-base text-gray-700 dark:text-gray-300 mb-2 block">Количество DataMatrix</span>
                <div className="flex items-center space-x-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (!confirmOpen) {
                                    setDataMatrixCountAction(Math.max(0, dataMatrixCount + 10));
                                }
                            }}
                            disabled={loading || confirmOpen}
                            className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            +10
                        </button>
                        <button
                            onClick={() => {
                                if (!confirmOpen) {
                                    setDataMatrixCountAction(Math.max(0, dataMatrixCount + 5));
                                }
                            }}
                            disabled={loading || confirmOpen}
                            className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            +5
                        </button>
                        <button
                            onClick={() => {
                                if (!confirmOpen) {
                                    setDataMatrixCountAction(Math.max(0, dataMatrixCount + 1));
                                }
                            }}
                            disabled={loading || confirmOpen}
                            className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            +1
                        </button>
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white min-w-[3rem] text-center">
                        {dataMatrixCount}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (!confirmOpen) {
                                    setDataMatrixCountAction(Math.max(0, dataMatrixCount - 1));
                                }
                            }}
                            disabled={loading || confirmOpen}
                            className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            -1
                        </button>
                        <button
                            onClick={() => {
                                if (!confirmOpen) {
                                    setDataMatrixCountAction(Math.max(0, dataMatrixCount - 5));
                                }
                            }}
                            disabled={loading || confirmOpen}
                            className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            -5
                        </button>
                        <button
                            onClick={() => {
                                if (!confirmOpen) {
                                    setDataMatrixCountAction(Math.max(0, dataMatrixCount - 10));
                                }
                            }}
                            disabled={loading || confirmOpen}
                            className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            -10
                        </button>
                    </div>
                </div>
            </div>
            <div className="block">
                <span className="text-base text-gray-700 dark:text-gray-300 mb-2 block">Количество штрихкодов (EAN‑13)</span>
                <div className="flex items-center space-x-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (!confirmOpen) {
                                    setBarcodeAmountAction(Math.max(0, barcodeAmount + 10));
                                }
                            }}
                            disabled={loading || confirmOpen}
                            className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            +10
                        </button>
                        <button
                            onClick={() => {
                                if (!confirmOpen) {
                                    setBarcodeAmountAction(Math.max(0, barcodeAmount + 5));
                                }
                            }}
                            disabled={loading || confirmOpen}
                            className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            +5
                        </button>
                        <button
                            onClick={() => {
                                if (!confirmOpen) {
                                    setBarcodeAmountAction(Math.max(0, barcodeAmount + 1));
                                }
                            }}
                            disabled={loading || confirmOpen}
                            className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            +1
                        </button>
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white min-w-[3rem] text-center">
                        {barcodeAmount}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (!confirmOpen) {
                                    setBarcodeAmountAction(Math.max(0, barcodeAmount - 1));
                                }
                            }}
                            disabled={loading || confirmOpen}
                            className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            -1
                        </button>
                        <button
                            onClick={() => {
                                if (!confirmOpen) {
                                    setBarcodeAmountAction(Math.max(0, barcodeAmount - 5));
                                }
                            }}
                            disabled={loading || confirmOpen}
                            className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            -5
                        </button>
                        <button
                            onClick={() => {
                                if (!confirmOpen) {
                                    setBarcodeAmountAction(Math.max(0, barcodeAmount - 10));
                                }
                            }}
                            disabled={loading || confirmOpen}
                            className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            -10
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}