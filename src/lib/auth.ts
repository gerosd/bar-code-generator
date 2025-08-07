import {logger} from "@/utils/logger";
import {AuthDataValidator, objectToAuthDataMap} from "@telegram-auth/server";
import {
    GetServerSidePropsContext,
    NextApiRequest,
    NextApiResponse,
} from "next";
import {getServerSession, NextAuthOptions} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcryptjs from "bcryptjs";
import {
    createClient as createClientDb,
    getClientsByUserId,
} from "./mongo/clients";
import {getUserById, upsertUser} from "./mongo/users";
import type {ClientType} from "./types/client";
import {AuthMethod, UserRole} from "./types/user";

// Функция проверки роли пользователя
export const hasRole = async (
    userId: string,
    role: UserRole
): Promise<boolean> => {
    const user = await getUserById(userId);
    if (!user) return false;
    return user.roles?.includes(role) || false;
};

export const auth = (
    ...args:
        | [GetServerSidePropsContext["req"], GetServerSidePropsContext["res"]]
        | [NextApiRequest, NextApiResponse]
        | []
) => {
    return getServerSession(...args, authOptions);
};

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name: string;
            image: string;
            email: string;
            roles: UserRole[];
            isAdmin: boolean;
            availableClients: Pick<ClientType, "id" | "name">[];
        };
    }

    interface JWT {
        userId?: string;
        roles?: UserRole[];
        isAdmin?: boolean;
        availableClients?: Pick<ClientType, "id" | "name">[];
        sub?: string;
        name?: string | null;
        email?: string | null;
        picture?: string | null;
    }
}

export const authOptions: NextAuthOptions = {
    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: "jwt",
    },
    providers: [
        CredentialsProvider({
            id: "telegram-login",
            name: "Telegram Login",
            credentials: {},

            async authorize(credentials, req) {
                try {
                    if (!process.env.BOT_TOKEN) {
                        throw new Error("BOT_TOKEN is not set");
                    }
                    const validator = new AuthDataValidator({
                        botToken: process.env.BOT_TOKEN,
                    });

                    const data = objectToAuthDataMap(req.query || {});
                    console.log("data", data);
                    const telegramUser = await validator.validate(data);

                    if (telegramUser.id && telegramUser.first_name) {
                        const returned = {
                            id: telegramUser.id.toString(),
                            email: telegramUser.id.toString(),
                            name: [
                                telegramUser.first_name,
                                telegramUser.last_name || "",
                            ].join(" "),
                            image: telegramUser.photo_url,
                        };

                        const dbUser = await upsertUser({
                            _id: telegramUser.id.toString(),
                            first_name: telegramUser.first_name,
                            image: telegramUser.photo_url,
                            last_name: telegramUser.last_name,
                            username: telegramUser.username,
                            authMethods: [
                                {
                                    provider: "telegram",
                                    providerId: telegramUser.id.toString(),
                                },
                            ],
                        });

                        if (!dbUser) {
                            logger.auth("NextAuth: Не удалось сохранить пользователя в БД", {
                                metadata: {telegramId: telegramUser.id.toString()},
                            });
                            throw new Error("Не удалось обработать данные пользователя");
                        }

                        return returned;
                    }
                    logger.auth("NextAuth: Невалидные данные от Telegram", {
                        metadata: {data: req.query},
                    });
                    return null;
                } catch (error) {
                    logger.auth("NextAuth: Ошибка в процессе authorize", {
                        metadata: {error, queryString: req.query},
                    });
                    if (error instanceof Error) {
                        throw error;
                    }
                    throw new Error("Ошибка авторизации Telegram");
                }
            },
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            profile(profile) {
                const userId = profile.email;
                return {
                    id: userId,
                    email: profile.email,
                    name: profile.name,
                    image: profile.picture,
                    first_name: profile.given_name,
                    last_name: profile.family_name,
                };
            },
        }),
        CredentialsProvider({
            id: "credentials",
            name: "Email & Password",
            credentials: {
                email: {label: "Email", type: "email"},
                password: {label: "Password", type: "password"},
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Пожалуйста, введите ваш email и пароль");
                }

                const userIdToFind = credentials.email;
                const user = await getUserById(userIdToFind);
                if (user && !user.password) {
                    throw new Error("Вход разрешен только через Google");
                }

                if (!user || !user.password) {
                    throw new Error("Пользователь с таким email не найден");
                }

                const isPasswordValid = await bcryptjs.compare(
                    credentials.password,
                    user.password
                );
                if (!isPasswordValid) {
                    throw new Error("Неверный пароль");
                }

                // Проверка верификации email для credentials провайдера
                const credentialsAuthMethod = user.authMethods?.find(
                    (method) =>
                        method.provider === "credentials" &&
                        method.email === credentials.email
                );

                if (credentialsAuthMethod && !credentialsAuthMethod.verified) {
                    throw new Error(
                        "Пожалуйста, подтвердите ваш email адрес. Проверьте почту и перейдите по ссылке для подтверждения."
                    );
                }

                const credentialsUserId = credentials.email;
                return {
                    id: credentialsUserId,
                    email: user.email || credentials.email,
                    name: [user.first_name, user.last_name].join(" "),
                    image: user.image,
                };
            },
        }),
    ],

    callbacks: {
        async jwt({
                      token,
                      user,
                      trigger,
                      session: sessionUpdateData,
                      account,
                      profile,
                  }) {
            // logger.info('JWT Callback: Start', {
            // 	metadata: {
            // 		trigger,
            // 		hasUser: !!user,
            // 		hasAccount: !!account,
            // 		hasProfile: !!profile,
            // 		initialTokenAvailableClientsCount: Array.isArray(token.availableClients)
            // 			? token.availableClients.length
            // 			: 0,
            // 		sessionUpdateData,
            // 	},
            // })

            const isLoginEvent = !!user;

            if (isLoginEvent && user?.id) {
                token.userId = user.id;
                token.sub = user.id;
                token.email = user.email;
                token.name = user.name;
                token.picture = user.image;

                // Обработка разных провайдеров авторизации
                const authMethod = {
                    provider: account?.provider as "telegram" | "google" | "credentials",
                    providerId: user.id,
                    email: user.email,
                    verified:
                        account?.provider === "google" || account?.provider === "telegram", // Google и Telegram аккаунты предварительно верифицированы
                };

                const dbUser = await getUserById(user.id);
                if (dbUser) {
                    token.roles = dbUser.roles || [UserRole.USER];
                    token.isAdmin = dbUser.roles?.includes(UserRole.ADMIN) || false;

                    // Обновление методов авторизации
                    const existingAuthMethod = dbUser.authMethods?.find(
                        (method: AuthMethod) =>
                            method.provider === authMethod.provider &&
                            method.providerId === authMethod.providerId
                    );
                    if (!existingAuthMethod) {
                        const firstName = user.name?.split(" ")[0] || "";
                        await upsertUser({
                            ...dbUser,
                            _id: user.id,
                            image: user.image ?? dbUser.image,
                            username:
                                authMethod.provider !== "telegram"
                                    ? firstName
                                    : dbUser.username,
                            authMethods: [
                                ...(dbUser.authMethods || []),
                                {
                                    ...authMethod,
                                    email: authMethod.email ?? undefined, // гарантируем, что нет null
                                } as AuthMethod,
                            ],
                        });
                    }
                } else {
                    // Создание нового пользователя
                    const firstName = user.name?.split(" ")[0] || "";
                    await upsertUser({
                        _id: user.id,
                        first_name: firstName,
                        last_name: user.name?.split(" ").slice(1).join(" ") || "",
                        username:
                            authMethod.provider !== "telegram" ? firstName : undefined,
                        email: user.email ?? undefined,
                        image: user.image ?? undefined,
                        roles: [UserRole.USER],
                        authMethods: [
                            {
                                ...authMethod,
                                email: authMethod.email ?? undefined, // гарантируем, что нет null
                            } as AuthMethod,
                        ],
                    });
                    token.roles = [UserRole.USER];
                    token.isAdmin = false;
                }

                let clients = await getClientsByUserId(user.id);
                if (clients.length === 0) {
                    const clientName = user.name ? `${user.name} shop` : "Мой магазин";
                    const newClient = await createClientDb(clientName, user.id);
                    if (newClient) {
                        clients = [newClient];
                    }
                }
                token.availableClients = clients.map((c) => ({
                    id: c.id,
                    name: c.name,
                }));
                // logger.info('JWT Callback (login): availableClients установлен', {
                // 	metadata: { count: Array.isArray(token.availableClients) ? token.availableClients.length : 0 },
                // })
            }

            // logger.info('JWT Callback: End', {
            // 	metadata: {
            // 		finalTokenAvailableClientsCount: Array.isArray(token.availableClients)
            // 			? token.availableClients.length
            // 			: 0,
            // 	},
            // })
            return token;
        },

        async session({session, token}) {
            session.user.id = typeof token.userId === "string" ? token.userId : "";
            session.user.email =
                typeof token.email === "string"
                    ? token.email
                    : typeof token.sub === "string"
                        ? token.sub
                        : "";
            session.user.name = typeof token.name === "string" ? token.name : "";
            session.user.image =
                typeof token.picture === "string" ? token.picture : "";
            session.user.roles = Array.isArray(token.roles)
                ? token.roles
                : [UserRole.USER];
            session.user.isAdmin =
                typeof token.isAdmin === "boolean" ? token.isAdmin : false;
            session.user.availableClients = Array.isArray(token.availableClients)
                ? token.availableClients
                : [];

            return session;
        },

        async redirect({url, baseUrl}) {
            if (url.startsWith(baseUrl)) return url;
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            return baseUrl;
        },
    },

    pages: {
        signIn: "/auth/signin",
        error: "/auth/error",
        signOut: "/",
    },
};
