// Типы для пользователей без зависимостей от MongoDB

export interface PrinterSettings {
    printerIP: string;
    printerPort: number;
    printerName?: string;
}

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
    authMethods: AuthMethod[];
    printerSettings?: PrinterSettings;
    createdAt: Date;
    updatedAt: Date;
}
