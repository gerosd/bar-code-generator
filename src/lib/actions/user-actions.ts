'use server'

import {getUserIdFromSession} from '@/lib/actions/utils'
import {findUserByAnyEmail, getUserById, upsertUser} from '@/lib/mongo/users'
import bcryptjs from 'bcryptjs'

export interface UpdateUserProfileInput {
    fullName?: string
    email?: string
}

export interface UpdateUserProfileResult {
    success: boolean
    error?: string
}

const splitFullName = (fullName?: string): { firstName?: string; lastName?: string } => {
    if (!fullName) return {}
    const normalized = fullName.trim().replace(/\s+/g, ' ')
    if (!normalized) return {}
    const [firstName, ...rest] = normalized.split(' ')
    const lastName = rest.join(' ').trim() || undefined
    return {firstName, lastName}
}

const isValidEmail = (email?: string): boolean => {
    if (!email) return true
    // Простая валидация email
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export const updateUserProfileAction = async (
    input: UpdateUserProfileInput
): Promise<UpdateUserProfileResult> => {
    try {
        const userId = await getUserIdFromSession()
        const existing = await getUserById(userId)
        if (!existing) {
            return {success: false, error: 'Пользователь не найден'}
        }

        if (input.email && !isValidEmail(input.email)) {
            return {success: false, error: 'Некорректный email'}
        }

        // Проверка уникальности email
        if (input.email && input.email !== existing.email) {
            const conflictUser = await findUserByAnyEmail(input.email)
            if (conflictUser && conflictUser._id !== existing._id) {
                return {success: false, error: 'Этот email уже используется другим аккаунтом'}
            }
        }

        const {firstName, lastName} = splitFullName(input.fullName)

        const updated = await upsertUser({
            _id: userId,
            first_name: firstName ?? existing.first_name,
            last_name: lastName ?? existing.last_name,
            // Храним email в профиле; не создаём отдельный credentials-аккаунт здесь
            email: input.email ?? existing.email,
        })

        if (!updated) {
            return {success: false, error: 'Не удалось обновить профиль'}
        }

        return {success: true}
    } catch (error) {
        return {success: false, error: 'Внутренняя ошибка при обновлении профиля'}
    }
}

export interface UpdateUserPasswordInput {
    currentPassword?: string
    newPassword: string
}

export const updateUserPasswordAction = async (
    input: UpdateUserPasswordInput
): Promise<UpdateUserProfileResult> => {
    try {
        const userId = await getUserIdFromSession()
        const existing = await getUserById(userId)
        if (!existing) {
            return {success: false, error: 'Пользователь не найден'}
        }

        const newPass = (input.newPassword || '').trim()
        if (newPass.length < 8) {
            return {success: false, error: 'Пароль должен содержать не менее 8 символов'}
        }

        // Менять/устанавливать пароль разрешаем только аккаунтам, чьим идентификатором является email (credentials/google)
        const accountUsesEmailAsId = !!existing.email && existing._id === existing.email
        if (!accountUsesEmailAsId) {
            return {success: false, error: 'Смена пароля недоступна для аккаунтов без email-идентификатора'}
        }

        if (existing.password) {
            // Требуем текущий пароль
            const current = (input.currentPassword || '').trim()
            if (!current) {
                return {success: false, error: 'Укажите текущий пароль'}
            }
            const valid = await bcryptjs.compare(current, existing.password)
            if (!valid) {
                return {success: false, error: 'Неверный текущий пароль'}
            }
        }

        const hashed = await bcryptjs.hash(newPass, 15)

        // Обновляем пароль; при необходимости добавим credentials метод для google-профилей
        const hasCredentialsMethod = Array.isArray(existing.authMethods)
            ? existing.authMethods.some((m) => m.provider === 'credentials' && m.email === existing.email)
            : false

        const updatedAuthMethods = Array.isArray(existing.authMethods) ? [...existing.authMethods] : []
        if (!hasCredentialsMethod) {
            // Если есть Google-провайдер с тем же email — считаем email верифицированным
            const hasGoogle = updatedAuthMethods.some((m) => m.provider === 'google')
            updatedAuthMethods.push({
                provider: 'credentials',
                providerId: existing.email!,
                email: existing.email!,
                verified: hasGoogle
            })
        }

        const updated = await upsertUser({_id: userId, password: hashed, authMethods: updatedAuthMethods})
        if (!updated) {
            return {success: false, error: 'Не удалось обновить пароль'}
        }
        return {success: true}
    } catch (error) {
        return {success: false, error: 'Внутренняя ошибка при смене пароля'}
    }
}

