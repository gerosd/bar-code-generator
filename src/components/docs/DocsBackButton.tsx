'use client'
import { useRouter } from 'next/navigation';
import { FaBackward } from "react-icons/fa";

export default function DocsBackButton() {
    const router = useRouter();

    const handleButtonClick = () => {
        router.back();
    }

    return (
        <div className="fixed top-15 left-15">
            <FaBackward className="h-8 w-8 cursor-pointer" onClick={() => handleButtonClick()} title="Назад"/>
        </div>
    )
}