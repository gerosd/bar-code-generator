import { PageTitle } from "@/components/layout/PageTitle";
import ServerLabelEditor from "@/components/labelEditor/ServerLabelEditor";

export default function LabelEditorPage() {
    return (
        <div className="container mx-auto p-4">
            <PageTitle 
                title="Редактор этикеток" 
                description="Создавайте и настраивайте собственные шаблоны этикеток с помощью удобного drag-and-drop редактора. Размещайте элементы именно там, где они должны быть." 
            />
            <ServerLabelEditor />
        </div>
    )
}