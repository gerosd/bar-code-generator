import { getClientById } from "@/lib/mongo/clients";
import { notFound } from "next/navigation";
import { ClientsManageForm } from "@/components/admin/clients/manage/ClientsManageForm";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ObjectId } from "mongodb";

interface Props {
    id: string;
}

export default async function ServerClientsManageContent({ id }: Props) {
    // Валидация ObjectId формата
    if (!ObjectId.isValid(id)) {
        notFound();
    }

    let client;

    try {
        client = await getClientById(id);
        if (!client) {
            notFound();
        }
    } catch (error) {
        console.error("Ошибка при получении клиента:", error);
        throw error;
    }

    return (
        <ErrorBoundary>
            <div className="container mx-auto">
                <ClientsManageForm client={client} />
            </div>
        </ErrorBoundary>
    );
}
