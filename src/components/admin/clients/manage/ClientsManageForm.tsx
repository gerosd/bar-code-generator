"use client";

import { ClientType } from "@/lib/types/client";
import { useState } from "react";

interface Props {
    client: ClientType;
}

export function ClientsManageForm({ client }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold">Детали клиента</h2>
            {error && (
                <div className="p-4 rounded-lg bg-red-50 text-red-700">{error}</div>
            )}
            <div className="bg-gray-700 shadow rounded-lg p-6">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="clientName" className="block text-lg font-medium text-gray-50">
                            Название клиента
                        </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-base border-gray-300 rounded-md p-2 bg-gray-800"
                                defaultValue={client.name}
                                disabled={isLoading}
                                id="clientName"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="createdAt" className="block text-lg font-medium text-gray-50">
                            Дата создания
                        </label>
                        <div className="mt-1">
                            <input
                                id="createdAt"
                                type="text"
                                className="shadow-sm block w-full sm:text-base border-gray-300 rounded-md bg-gray-800 p-2"
                                value={new Date(client.createdAt).toLocaleString()}
                                disabled
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
