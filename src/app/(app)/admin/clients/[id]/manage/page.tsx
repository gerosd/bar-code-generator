import ServerClientsManageContent from "@/components/admin/clients/manage/ServerClientsManageContent";
import { PageTitle } from "@/components/layout/PageTitle";
import { FullPageSpinner } from "@/components/ui/FullPageSpinner";
import { Suspense } from "react";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { UserRole } from "@/lib/types/user";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ObjectId } from "mongodb";

interface Props {
    params: { id: string }
}

export default async function AdminClientManagePage({ params }: Props) {
    const [session, { id }] = await Promise.all([
        getServerSession(authOptions),
        params,
    ]);

    if (!ObjectId.isValid(id)) {
        notFound();
    }

    if (!session?.user?.id || !session.user.roles?.includes(UserRole.ADMIN)) {
        redirect("/dashboard");
    }

    return (
        <div className="container px-4">
            <ErrorBoundary>
                <PageTitle title="Управление клиентом" description="Управление клиентом" />
                <Suspense fallback={<FullPageSpinner />}>
                    <ServerClientsManageContent id={id} />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
