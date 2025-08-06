import {NextResponse} from "next/server";
import bcryptjs from "bcryptjs";
import {getUserById, upsertUser} from "@/lib/mongo/users";
import {UserRole} from "@/lib/types/user";
import {generateVerificationToken, sendVerificationEmail} from "@/lib/email";

export async function POST(req: Request) {
    try {
        const {email, password} = await req.json();

        // Проверка на наличие email и пароля
        if (!email || !password) {
            return NextResponse.json(
                {error: "Email и пароль обязательны"},
                {status: 400}
            );
        }

        // Проверка на наличие пользователя в базе данных
        const existingUser = await getUserById(email);
        if (existingUser) {
            return NextResponse.json(
                {error: "Пользователь уже существует"},
                {status: 400}
            );
        }

        // Хеширование пароля
        const hashedPassword = await bcryptjs.hash(password, 15);

        // Создание пользователя
        const user = await upsertUser({
            _id: email,
            email,
            password: hashedPassword,
            first_name: "",
            roles: [UserRole.USER],
            authMethods: [
                {
                    provider: "credentials",
                    providerId: email,
                    email,
                    verified: false,
                },
            ],
        });

        if (!user) {
            return NextResponse.json(
                {error: "Не удалось создать пользователя"},
                {status: 500}
            );
        }

        // Генерация токена верификации и отправка email
        try {
            const verificationToken = generateVerificationToken(email);
            const emailSent = await sendVerificationEmail(email, verificationToken);

            if (!emailSent) {
                // Если email не отправлен, удаляем пользователя
                // В реальном приложении лучше не удалять, а просто логировать ошибку
                console.error("Не удалось отправить email верификации");
            }
        } catch (error) {
            console.error("Ошибка при отправке email верификации:", error);
        }

        return NextResponse.json({
            success: true,
            message: "Пользователь создан. Проверьте email для подтверждения адреса.",
        });
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            {error: "Внутренняя ошибка сервера"},
            {status: 500}
        );
    }
}
