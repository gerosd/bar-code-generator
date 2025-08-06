import {NextResponse} from "next/server";
import {verifyToken, sendVerificationSuccessEmail} from "@/lib/email";
import {getUserById, upsertUser} from "@/lib/mongo/users";
import {logger} from "@/utils/logger";

async function checkToken(token: string | null) {
    if (!token) {
        return NextResponse.json(
            {error: "Токен верификации обязателен"},
            {status: 400}
        );
    }

    // Верификация токена
    const decoded = verifyToken(token);
    if (!decoded || decoded.type !== "email-verification") {
        return NextResponse.json(
            {error: "Недействительный или истекший токен"},
            {status: 400}
        );
    }

    const {email} = decoded;

    // Поиск пользователя
    const user = await getUserById(email);
    if (!user) {
        return NextResponse.json(
            {error: "Пользователь не найден"},
            {status: 404}
        );
    }

    // Проверка, не верифицирован ли уже email
    const credentialsAuthMethod = user.authMethods.find(
        (method) => method.provider === "credentials" && method.email === email
    );

    if (credentialsAuthMethod?.verified) {
        return NextResponse.json(
            {error: "Email уже подтвержден"},
            {status: 400}
        );
    }

    // Обновление статуса верификации
    const updatedAuthMethods = user.authMethods.map((method) => {
        if (method.provider === "credentials" && method.email === email) {
            return {...method, verified: true};
        }
        return method;
    });

    await upsertUser({
        ...user,
        authMethods: updatedAuthMethods,
    });

    // Отправка email об успешной верификации
    try {
        await sendVerificationSuccessEmail(email);
    } catch (error) {
        logger.error("Ошибка отправки email об успешной верификации:", {
            metadata: {error},
        });
    }

    return email;
}

export async function POST(req: Request) {
    try {
        const {token} = await req.json();

        const email = checkToken(token);

        logger.info(`Email ${email} успешно верифицирован`);

        return NextResponse.json({
            success: true,
            message: "Email успешно подтвержден",
        });
    } catch (error) {
        logger.error("Ошибка верификации email:", {metadata: {error}});
        return NextResponse.json(
            {error: "Внутренняя ошибка сервера"},
            {status: 500}
        );
    }
}

// GET endpoint для верификации через ссылку в email
export async function GET(req: Request) {
    try {
        const {searchParams} = new URL(req.url);
        const token = searchParams.get("token");

        const email = checkToken(token);

        logger.info(`Email ${email} успешно верифицирован через GET запрос`);

        return NextResponse.json({
            success: true,
            message: "Email успешно подтвержден",
        });
    } catch (error) {
        logger.error("Ошибка верификации email через GET:", {
            metadata: {error},
        });
        return NextResponse.json(
            {error: "Внутренняя ошибка сервера"},
            {status: 500}
        );
    }
}
