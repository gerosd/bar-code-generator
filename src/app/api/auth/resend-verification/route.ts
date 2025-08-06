import {NextResponse} from "next/server";
import {generateVerificationToken, sendVerificationEmail} from "@/lib/email";
import {getUserById} from "@/lib/mongo/users";
import {logger} from "@/utils/logger";

export async function POST(req: Request) {
    try {
        const {email} = await req.json();

        if (!email) {
            return NextResponse.json({error: "Email обязателен"}, {status: 400});
        }

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

        // Генерация нового токена верификации и отправка email
        try {
            const verificationToken = generateVerificationToken(email);
            const emailSent = await sendVerificationEmail(email, verificationToken);

            if (!emailSent) {
                return NextResponse.json(
                    {error: "Не удалось отправить email верификации"},
                    {status: 500}
                );
            }

            logger.info(`Email верификации повторно отправлен на ${email}`);

            return NextResponse.json({
                success: true,
                message: "Email верификации отправлен повторно",
            });
        } catch (error) {
            logger.error("Ошибка при повторной отправке email верификации:", {
                metadata: {error},
            });
            return NextResponse.json(
                {error: "Ошибка отправки email"},
                {status: 500}
            );
        }
    } catch (error) {
        logger.error("Ошибка повторной отправки верификации:", {
            metadata: {error},
        });
        return NextResponse.json(
            {error: "Внутренняя ошибка сервера"},
            {status: 500}
        );
    }
}
