import {NextRequestWithAuth, withAuth} from "next-auth/middleware";
import {NextResponse} from "next/server";

export default withAuth(
    async function middleware(req: NextRequestWithAuth) {
        const {pathname} = req.nextUrl;

        const response = NextResponse.next({
            request: {
                headers: new Headers(req.headers),
            },
        });

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
