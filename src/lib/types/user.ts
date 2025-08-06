// Типы для пользователей без зависимостей от MongoDB

// Определяем доступные роли
export enum UserRole {
    USER = 'user',
    ADMIN = 'admin',
    SUPPORT = 'support',
}

// Тип для режима регулировки цены
export type PriceAdjustmentMode = 'price' | 'discount'

// Тип для методов аутентификации
export interface AuthMethod {
    provider: 'telegram' | 'google' | 'credentials'
    providerId: string; // telegram ID, google email, or email for credentials
    email?: string;
    verified?: boolean;
}

// Тип пользователя для клиентской части
export interface UserType {
    id: string;
    first_name: string;
    last_name?: string;
    username?: string;
    email?: string;
    password?: string; // Хэшированный пароль для credentials provider
    image?: string;
    roles: UserRole[];
    authMethods: AuthMethod[];
    settings?: {
        priceAdjustmentMode?: PriceAdjustmentMode;
        priceTolerance?: number; // Толерантность цены в рублях (по умолчанию 0)
    };
    availableClients?: string[]; // ID клиентов, в которых состоит пользователь
    currentClientId?: string; // ID текущего выбранного клиента
    createdAt: Date;
    updatedAt: Date;
}

// Типы для управления пользователями
export interface UserFilter {
    role?: UserRole
    sortBy?: keyof UserType
    sortOrder?: 'asc' | 'desc'
    limit?: number
    skip?: number
}
