/**
 * Account Manager Service
 *
 * Чистый сервис (без React/Zustand) для управления несколькими аккаунтами.
 * Работает только с secure storage.
 *
 * Ключевое решение: legacy-ключи `session_id` и `user_data` всегда
 * синхронизированы с активным аккаунтом через syncLegacyKeys().
 * Это позволяет axios interceptor и websocket.service работать без изменений.
 */

import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS, ACCOUNT_LIMITS } from '@shared/constants/app.constants';
import { SavedAccount } from '@/types/account.types';
import { User } from '@/types/user.types';

// ---- Saved Accounts List ----

export async function getSavedAccounts(): Promise<SavedAccount[]> {
  const raw = await secureStorage.getItemAsync(STORAGE_KEYS.ACCOUNTS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedAccount[];
  } catch {
    return [];
  }
}

async function persistAccounts(accounts: SavedAccount[]): Promise<void> {
  await secureStorage.setItemAsync(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
}

export async function getActiveAccountId(): Promise<number | null> {
  const raw = await secureStorage.getItemAsync(STORAGE_KEYS.ACTIVE_ACCOUNT_ID);
  return raw ? parseInt(raw, 10) : null;
}

export async function setActiveAccountId(userId: number): Promise<void> {
  await secureStorage.setItemAsync(STORAGE_KEYS.ACTIVE_ACCOUNT_ID, String(userId));
}

// ---- Per-Account Session ----

export async function getAccountSessionId(userId: number): Promise<string | null> {
  return secureStorage.getItemAsync(`${STORAGE_KEYS.SESSION_ID_PREFIX}${userId}`);
}

export async function setAccountSessionId(userId: number, sessionId: string): Promise<void> {
  await secureStorage.setItemAsync(`${STORAGE_KEYS.SESSION_ID_PREFIX}${userId}`, sessionId);
}

export async function deleteAccountSessionId(userId: number): Promise<void> {
  await secureStorage.deleteItemAsync(`${STORAGE_KEYS.SESSION_ID_PREFIX}${userId}`);
}

// ---- Per-Account User Data ----

export async function getAccountUserData(userId: number): Promise<User | null> {
  const raw = await secureStorage.getItemAsync(`${STORAGE_KEYS.USER_DATA_PREFIX}${userId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export async function setAccountUserData(userId: number, user: User): Promise<void> {
  await secureStorage.setItemAsync(
    `${STORAGE_KEYS.USER_DATA_PREFIX}${userId}`,
    JSON.stringify(user)
  );
}

export async function deleteAccountUserData(userId: number): Promise<void> {
  await secureStorage.deleteItemAsync(`${STORAGE_KEYS.USER_DATA_PREFIX}${userId}`);
}

// ---- Sync Legacy Keys ----
// Keeps `session_id` and `user_data` pointing to the active account
// so axios interceptor continues to work without changes.

export async function syncLegacyKeys(userId: number): Promise<void> {
  const sessionId = await getAccountSessionId(userId);
  const userData = await getAccountUserData(userId);

  if (sessionId) {
    await secureStorage.setItemAsync(STORAGE_KEYS.SESSION_ID, sessionId);
  } else {
    await secureStorage.deleteItemAsync(STORAGE_KEYS.SESSION_ID);
  }

  if (userData) {
    await secureStorage.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  } else {
    await secureStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);
  }
}

// ---- Save Account After Login ----

export async function saveAccountAfterLogin(user: User, sessionId: string): Promise<void> {
  const accounts = await getSavedAccounts();
  const existingIdx = accounts.findIndex(a => a.userId === user.id);

  const account: SavedAccount = {
    userId: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    avatarThumbnail: user.avatar_thumbnail,
    hasSession: true,
    lastActiveAt: Date.now(),
  };

  if (existingIdx >= 0) {
    accounts[existingIdx] = account;
  } else {
    if (accounts.length >= ACCOUNT_LIMITS.MAX_ACCOUNTS) {
      throw new Error(`Максимум ${ACCOUNT_LIMITS.MAX_ACCOUNTS} сохранённых аккаунтов`);
    }
    accounts.push(account);
  }

  await persistAccounts(accounts);
  await setAccountSessionId(user.id, sessionId);
  await setAccountUserData(user.id, user);
  await setActiveAccountId(user.id);
  await syncLegacyKeys(user.id);
}

// ---- Remove Account ----

export async function removeAccount(userId: number): Promise<void> {
  const accounts = await getSavedAccounts();
  const filtered = accounts.filter(a => a.userId !== userId);
  await persistAccounts(filtered);
  await deleteAccountSessionId(userId);
  await deleteAccountUserData(userId);
}

// ---- Mark Session Invalid ----

export async function markAccountSessionInvalid(userId: number): Promise<void> {
  await deleteAccountSessionId(userId);
  const accounts = await getSavedAccounts();
  const idx = accounts.findIndex(a => a.userId === userId);
  if (idx >= 0) {
    accounts[idx].hasSession = false;
    await persistAccounts(accounts);
  }
}

// ---- Update Account Metadata ----

export async function updateAccountMetadata(userId: number, user: User): Promise<void> {
  const accounts = await getSavedAccounts();
  const idx = accounts.findIndex(a => a.userId === userId);
  if (idx >= 0) {
    accounts[idx].name = user.name;
    accounts[idx].email = user.email;
    accounts[idx].avatar = user.avatar;
    accounts[idx].avatarThumbnail = user.avatar_thumbnail;
    await persistAccounts(accounts);
  }
}

// ---- Migration ----
// При первом запуске после обновления мигрирует single-account в multi-account.

export async function migrateToMultiAccount(): Promise<void> {
  const existingAccounts = await getSavedAccounts();
  if (existingAccounts.length > 0) {
    return; // Уже мигрировано
  }

  const sessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
  const userDataRaw = await secureStorage.getItemAsync(STORAGE_KEYS.USER_DATA);

  if (!sessionId || !userDataRaw) return;

  try {
    const user: User = JSON.parse(userDataRaw);
    await saveAccountAfterLogin(user, sessionId);
    console.log('[AccountManager] Migrated single account to multi-account scheme');
  } catch (e) {
    console.error('[AccountManager] Migration failed:', e);
  }
}
