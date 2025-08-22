import { PageTitle } from "@/components/layout/PageTitle";
import ServerTemplates from "@/components/templates/ServerTemplates";

export default function TemplatesPage() {
    return (
        <div className="container mx-auto p-4">
            <PageTitle title="Выбор и создание шаблонов" description="Создайте свой уникальный шаблон для вашего проекта, либо воспользуйтесь готовыми шаблонами"/>
            <ServerTemplates />
        </div>
    )
}