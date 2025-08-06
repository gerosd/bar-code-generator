import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import {logger} from "@/utils/logger";

// Конфигурация транспорта для отправки email
const createTransporter = () => {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || "587");
    const secure = process.env.SMTP_SECURE === "true" || port === 465;

    // Специальная конфигурация для Яндекс почты
    if (host.includes("yandex") || host.includes("ya.ru")) {
        return nodemailer.createTransport({
            host: "smtp.yandex.ru",
            port: 465,
            secure: true, // Яндекс требует SSL
            auth: {
                user: process.env.SMTP_USER, // email@yandex.ru
                pass: process.env.SMTP_PASS, // пароль приложения
            },
            // Настройки TLS для Яндекса
            tls: {
                rejectUnauthorized: false,
            },
            // Таймауты для стабильности
            connectionTimeout: 60000,
            greetingTimeout: 30000,
            socketTimeout: 60000,
            debug: true,
            logger: true,
        });
    }

    // Специальная конфигурация для UnisenderGo
    if (host.includes("unisender") || host.includes("unisendergo")) {
        return nodemailer.createTransport({
            host: host,
            port: port,
            secure: secure,
            auth: {
                // Для UnisenderGo используем полный email адрес вместо ID
                user: process.env.SMTP_FROM || process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            // Дополнительные настройки для UnisenderGo
            tls: {
                rejectUnauthorized: false,
                // Добавляем дополнительные настройки TLS
                ciphers: "SSLv3",
            },
            // Увеличиваем таймауты для стабильности
            connectionTimeout: 60000,
            greetingTimeout: 30000,
            socketTimeout: 60000,
            // Важно для UnisenderGo - отключаем STARTTLS если используем обычный порт
            requireTLS: false,
            // Добавляем debug режим для диагностики
            debug: true,
            logger: true,
        });
    }

    // Стандартная конфигурация для других провайдеров
    return nodemailer.createTransport({
        host: host,
        port: port,
        secure: secure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

// Генерация токена верификации
export const generateVerificationToken = (email: string): string => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET не настроен");
    }

    return jwt.sign(
        {email, type: "email-verification"},
        process.env.JWT_SECRET,
        {expiresIn: "24h"}
    );
};

// Верификация токена
export const verifyToken = (
    token: string
): { email: string; type: string } | null => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET не настроен");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
            email: string;
            type: string;
        };
        return decoded;
    } catch (error) {
        logger.error("Ошибка верификации токена:", {metadata: {error}});
        return null;
    }
};

// Отправка email с токеном верификации
export const sendVerificationEmail = async (
    email: string,
    token: string
): Promise<boolean> => {
    try {
        const transporter = createTransporter();

        // Проверка соединения с SMTP сервером
        try {
            await transporter.verify();
            logger.info("SMTP соединение успешно установлено");
        } catch (verifyError) {
            logger.error("Ошибка проверки SMTP соединения:", {
                metadata: {error: verifyError},
            });
            return false;
        }

        const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify?token=${token}`;

        // Для UnisenderGo важно использовать правильный формат отправителя
        const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "";
        const fromName = "SuperBot Repricer";

        const mailOptions = {
            // Используем правильный формат From для UnisenderGo
            from: `"${fromName}" <${fromEmail}>`,
            to: email,
            subject: "Подтверждение email адреса",
            // Добавляем дополнительные заголовки для лучшей доставляемости
            headers: {
                "Reply-To": fromEmail,
                "Return-Path": fromEmail,
                "X-Mailer": "SuperBot Repricer",
            } as { [key: string]: string },
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Подтверждение email адреса</h2>
          <p>Здравствуйте!</p>
          <p>Для завершения регистрации в приложении SuperBot Repricer, пожалуйста, подтвердите ваш email адрес.</p>
          <p>Нажмите на кнопку ниже для подтверждения:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Подтвердить email
            </a>
          </div>
          <p>Или скопируйте эту ссылку в браузер:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>Ссылка действительна в течение 24 часов.</p>
          <p>Если вы не регистрировались в нашем приложении, просто проигнорируйте это письмо.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Это автоматическое письмо, не отвечайте на него.
          </p>
        </div>
      `,
        };

        const result = await transporter.sendMail(mailOptions);
        logger.info(`Email верификации отправлен на ${email}`, {
            metadata: {
                messageId: result.messageId || "unknown",
                response: result.response || "no response",
            },
        });
        return true;
    } catch (error) {
        logger.error("Ошибка отправки email верификации:", {metadata: {error}});
        return false;
    }
};

// Отправка email с уведомлением об успешной верификации
export const sendVerificationSuccessEmail = async (
    email: string
): Promise<boolean> => {
    try {
        const transporter = createTransporter();

        // Проверка соединения с SMTP сервером
        try {
            await transporter.verify();
            logger.info(
                "SMTP соединение успешно установлено для отправки уведомления"
            );
        } catch (verifyError) {
            logger.error("Ошибка проверки SMTP соединения для уведомления:", {
                metadata: {error: verifyError},
            });
            return false;
        }

        const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "";
        const fromName = "SuperBot Repricer";

        const mailOptions = {
            from: `"${fromName}" <${fromEmail}>`,
            to: email,
            subject: "Email успешно подтвержден",
            headers: {
                "Reply-To": fromEmail,
                "Return-Path": fromEmail,
                "X-Mailer": "SuperBot Repricer",
            } as { [key: string]: string },
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Email успешно подтвержден!</h2>
          <p>Здравствуйте!</p>
          <p>Ваш email адрес был успешно подтвержден в приложении SuperBot Repricer.</p>
          <p>Теперь вы можете использовать все функции приложения.</p>
          <p>Спасибо за регистрацию!</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Это автоматическое письмо, не отвечайте на него.
          </p>
        </div>
      `,
        };

        const result = await transporter.sendMail(mailOptions);
        logger.info(`Email об успешной верификации отправлен на ${email}`, {
            metadata: {
                messageId: result.messageId || "unknown",
                response: result.response || "no response",
            },
        });
        return true;
    } catch (error) {
        logger.error("Ошибка отправки email об успешной верификации:", {
            metadata: {error},
        });
        return false;
    }
};
