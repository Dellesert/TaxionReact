/**
 * Multi-Account Types
 * Типы для поддержки нескольких аккаунтов
 */

/**
 * Сохранённый аккаунт в локальном хранилище.
 * session_id хранится отдельно в secure storage с ключом `session_id_{userId}`.
 */
export interface SavedAccount {
  userId: number;
  email: string;
  name: string;
  avatar?: string;
  avatarThumbnail?: string;
  /** Есть ли сохранённая сессия (доступен quick switch) */
  hasSession: boolean;
  /** Timestamp последней активности */
  lastActiveAt: number;
}

/** Тип переключения аккаунта */
export type SwitchMode = 'quick' | 'secure';
