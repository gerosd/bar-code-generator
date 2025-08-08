"use client";

import {useState} from "react";
import {Mail, CheckCircle, AlertCircle} from "lucide-react";

export function ResendVerificationForm() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<"success" | "error" | "">("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage("");
        setMessageType("");

        try {
            const response = await fetch("/api/auth/resend-verification", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({email}),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message || "Email верификации отправлен повторно");
                setMessageType("success");
                setEmail("");
            } else {
                setMessage(data.error || "Ошибка отправки email");
                setMessageType("error");
            }
        } catch (error) {
            setMessage("Произошла ошибка при отправке email");
            setMessageType("error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md w-full space-y-6">
            <div className="text-center">
                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
                    <Mail className="h-6 w-6 text-blue-600"/>
                </div>
                <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                    Повторная отправка верификации
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                    Введите ваш email для повторной отправки ссылки верификации
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {message && (
                    <div
                        className={`p-3 rounded-md text-sm ${
                            messageType === "success"
                                ? "bg-green-50 text-green-800 border border-green-200"
                                : "bg-red-50 text-red-800 border border-red-200"
                        }`}
                    >
                        <div className="flex items-center">
                            {messageType === "success" ? (
                                <CheckCircle className="h-4 w-4 mr-2"/>
                            ) : (
                                <AlertCircle className="h-4 w-4 mr-2"/>
                            )}
                            {message}
                        </div>
                    </div>
                )}

                <div>
                    <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700"
                    >
                        Email адрес
                    </label>
                    <input
                        type="email"
                        id="email"
                        placeholder="example@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="mt-1 text-gray-900 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <span className="flex items-center">
              <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
              >
                <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                ></circle>
                <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Отправка...
            </span>
                    ) : (
                        "Отправить email повторно"
                    )}
                </button>
            </form>

            <div className="text-center">
                <a
                    href="/auth/signin"
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                    Вернуться к входу
                </a>
            </div>
        </div>
    );
}
