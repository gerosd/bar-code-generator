"use client";

import {FC, useState} from "react";
import {FaGoogle} from "react-icons/fa";
import {signIn} from "next-auth/react";
import TGLoginButton from "./TGLoginButton";
import {EmailPasswordForm} from "@/components/auth/EmailPasswordForm";

interface SignInPageProps {
    botUsername: string;
}

const SignInPage: FC<SignInPageProps> = ({botUsername}) => {
    const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

    return (
        <div
            className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <div
                className="max-w-md w-full space-y-6 p-10 bg-white dark:bg-gray-800 rounded-xl shadow-xl transition-colors duration-200">
                <div className="flex flex-col items-center">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Добро пожаловать
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
                        Войдите или зарегистрируйтесь для доступа к панели управления
                    </p>

                    <div className="w-full space-y-4">
                        {/* Вход через Google и Telegram */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() =>
                                    signIn("google", {
                                        redirect: true,
                                        callbackUrl: "/dashboard",
                                    })
                                }
                                className="flex items-center cursor-pointer justify-center gap-2 py-2 px-4 bg-gray-800 border border-gray-300 rounded-md hover:bg-gray-900 transition-colors"
                            >
                                <FaGoogle className="w-5 h-5"/>
                                <span>Google</span>
                            </button>
                            <div className="flex items-center justify-center">
                                <TGLoginButton BOT_USERNAME={botUsername}/>
                            </div>
                        </div>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                  Или продолжить с email
                </span>
                            </div>
                        </div>

                        {/* Форма входа через email и пароль */}
                        <EmailPasswordForm mode={authMode}/>

                        {/* Переключение между входом и регистрацией */}
                        <div className="text-center text-sm">
                            <button
                                onClick={() =>
                                    setAuthMode(authMode === "signin" ? "signup" : "signin")
                                }
                                className="text-indigo-600 hover:text-indigo-500 cursor-pointer"
                            >
                                {authMode === "signin"
                                    ? "Нужен аккаунт? Зарегистрироваться"
                                    : "Уже есть аккаунт? Войти"}
                            </button>
                        </div>

                        {/* Ссылка на повторную отправку верификации */}
                        <div className="text-center text-sm">
                            <a
                                href="/auth/resend-verification"
                                className="text-gray-500 hover:text-gray-700 cursor-pointer"
                            >
                                Не получили email верификации?
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignInPage;
