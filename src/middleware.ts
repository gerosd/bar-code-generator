import type {ClientType} from "@/lib/types/client";
import {NextRequestWithAuth, withAuth} from "next-auth/middleware";
import {NextResponse} from "next/server";

export default withAuth(
    async function middleware(req: NextRequestWithAuth) {
        const {token} = req.nextauth;
        const {pathname} = req.nextUrl;

        const response = NextResponse.next({
            request: {
                headers: new Headers(req.headers),
            },
        });

        // Логика с currentClientId в токене удалена.
        // Теперь currentClientId живет только в cookie.
        // Мы можем проверить, валиден ли cookie.currentClientId относительно token.availableClients.
        const clientIdFromCookie = req.cookies.get("currentClientId")?.value;
        const availableClientsInToken = token?.availableClients as
            | Pick<ClientType, "id" | "name">[]
            | undefined;

        if (
            clientIdFromCookie &&
            Array.isArray(availableClientsInToken) &&
            availableClientsInToken.length > 0
        ) {
            const isValidCookie = availableClientsInToken.some(
                (client) => client.id === clientIdFromCookie
            );
            if (!isValidCookie) {
                response.cookies.delete("currentClientId");
                console.log(
                    "Middleware: Удален cookie currentClientId, так как он невалиден (не найден в token.availableClients).",
                    {metadata: {invalidCookieId: clientIdFromCookie}}
                );
            }
        } else if (
            clientIdFromCookie &&
            (!Array.isArray(availableClientsInToken) ||
                availableClientsInToken.length === 0)
        ) {
            // Если cookie есть, но в токене нет списка доступных клиентов (странная ситуация, но возможная)
            // Можно тоже удалить cookie для консистентности, предполагая, что токен - источник правды о доступности.
            response.cookies.delete("currentClientId");
            console.log(
                "Middleware: Удален cookie currentClientId, так как в токене нет availableClients для его проверки.",
                {metadata: {clientIdFromCookie}}
            );
        }

        if (pathname === "/") {
            return response;
        }

        return response;
    },
    {
        callbacks: {
            authorized: ({token, req}) => {
                if (req.nextUrl.pathname === "/") {
                    return true;
                }
                const isAuthenticated = !!token?.userId;
                if (!isAuthenticated) {
                    console.log(
                        "Middleware: Пользователь не авторизован (отсутствует userId в токене), редирект на signin. Path:",
                        req.nextUrl.pathname
                    );
                }
                return isAuthenticated;
            },
        },
        pages: {
            signIn: "/auth/signin",
        },
    }
);

// Расшифровка regex в matcher:
// /((?!api|_next/static|_next/image|favicon.ico|auth/signin|auth/error|auth/verify|auth/resend-verification).*)
// - (?!...) - негативный lookahead (исключает следующие пути)
// - api - исключает все API роуты
// - _next/static - исключает статические файлы Next.js
// - _next/image - исключает оптимизированные изображения Next.js
// - favicon.ico - исключает иконку сайта
// - auth/signin - исключает страницу входа
// - auth/error - исключает страницу ошибок
// - auth/verify - исключает страницу верификации email
// - auth/resend-verification - исключает страницу повторной отправки верификации
// - docs - исключает документацию
// - .* - захватывает все остальные пути
export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|auth/signin|auth/error|auth/verify|auth/resend-verification|docs).*)",
    ],
};
