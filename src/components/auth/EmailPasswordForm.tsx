import React, {useState} from "react";
import {signIn} from "next-auth/react";
import {useRouter} from "next/navigation";
import {Mail} from "lucide-react";

interface EmailPasswordFormProps {
    mode: "signin" | "signup";
}

export function EmailPasswordForm({mode}: EmailPasswordFormProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showVerificationMessage, setShowVerificationMessage] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            if (mode === "signup") {
                // Регистрация нового пользователя
                const res = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({email, password}),
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Ошибка регистрации");
                }

                // Показываем сообщение о необходимости верификации
                setShowVerificationMessage(true);
                setEmail("");
                setPassword("");
                return;
            }

            // Вход
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError(result.error);
            } else {
                router.push("/dashboard");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                    {error}
                </div>
            )}

            {showVerificationMessage && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-md">
                    <div className="flex items-start">
                        <Mail className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0"/>
                        <div>
                            <h3 className="text-sm font-medium text-blue-800">
                                Проверьте ваш email
                            </h3>
                            <p className="mt-1 text-sm text-blue-700">
                                Мы отправили ссылку для подтверждения на ваш email адрес.
                                Пожалуйста, проверьте почту и перейдите по ссылке для завершения
                                регистрации.
                            </p>
                            <div className="mt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowVerificationMessage(false)}
                                    className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                                >
                                    Вернуться к регистрации
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div>
                <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                >
                    Эл. почта
                </label>
                <input
                    type="email"
                    id="email"
                    placeholder="example@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
            </div>
            <div>
                <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                >
                    Пароль
                </label>
                <input
                    type="password"
                    id="password"
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
            </div>
            <button
                type="submit"
                className="w-full flex justify-center cursor-pointer py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
            Проверка...
          </span>
                ) : mode === "signin" ? (
                    "Войти"
                ) : (
                    "Зарегистрироваться"
                )}
            </button>
        </form>
    );
}
