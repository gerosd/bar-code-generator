"use client";

import {useEffect, useState} from "react";
import {useSearchParams, useRouter} from "next/navigation";
import {CheckCircle, XCircle, Mail, AlertCircle} from "lucide-react";

export default function EmailVerificationPage() {
    const [status, setStatus] = useState<"loading" | "success" | "error">(
        "loading"
    );
    const [message, setMessage] = useState("");
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const verifyEmail = async () => {
            const token = searchParams.get("token");

            if (!token) {
                setStatus("error");
                setMessage("Токен верификации отсутствует");
                return;
            }

            try {
                // Используем GET запрос для верификации через ссылку
                const response = await fetch(
                    `/api/auth/verify?token=${encodeURIComponent(token)}`,
                    {
                        method: "GET",
                    }
                );

                const data = await response.json();

                if (response.ok) {
                    setStatus("success");
                    setMessage(data.message || "Email успешно подтвержден");
                } else {
                    setStatus("error");
                    setMessage(data.error || "Ошибка верификации");
                }
            } catch (error) {
                setStatus("error");
                setMessage("Произошла ошибка при верификации");
                console.error("Ошибка верификации:", error);
            }
        };

        verifyEmail();
    }, [searchParams]);

    const handleResendEmail = async () => {
        // Здесь можно добавить логику для повторной отправки email
        // Пока что просто перенаправляем на страницу входа
        router.push("/auth/signin");
    };

    const handleGoToSignIn = () => {
        router.push("/auth/signin");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
                        <Mail className="h-6 w-6 text-blue-600"/>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Подтверждение Email
                    </h2>
                </div>

                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    {status === "loading" && (
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-sm text-gray-600">
                                Проверяем токен верификации...
                            </p>
                        </div>
                    )}

                    {status === "success" && (
                        <div className="text-center">
                            <div
                                className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                                <CheckCircle className="h-6 w-6 text-green-600"/>
                            </div>
                            <h3 className="mt-4 text-lg font-medium text-gray-900">
                                Email подтвержден!
                            </h3>
                            <p className="mt-2 text-sm text-gray-600">{message}</p>
                            <div className="mt-6">
                                <button
                                    onClick={handleGoToSignIn}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Войти в аккаунт
                                </button>
                            </div>
                        </div>
                    )}

                    {status === "error" && (
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                <XCircle className="h-6 w-6 text-red-600"/>
                            </div>
                            <h3 className="mt-4 text-lg font-medium text-gray-900">
                                Ошибка верификации
                            </h3>
                            <p className="mt-2 text-sm text-gray-600">{message}</p>
                            <div className="mt-6 space-y-3">
                                <button
                                    onClick={handleResendEmail}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Отправить email повторно
                                </button>
                                <button
                                    onClick={handleGoToSignIn}
                                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Вернуться к входу
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="text-center">
                    <div className="flex items-center justify-center text-sm text-gray-600">
                        <AlertCircle className="h-4 w-4 mr-1"/>
                        <span>Если у вас возникли проблемы, обратитесь в поддержку</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
