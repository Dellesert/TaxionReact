/**
 * Passkey Utilities
 * Кросс-платформенная утилита для работы с Passkey/WebAuthn
 */

import { Platform } from 'react-native';
import { Passkey } from 'react-native-passkey';

/**
 * Helper functions для конвертации между base64 и ArrayBuffer
 */

// Конвертация base64url в ArrayBuffer
function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  // Добавляем паддинг если нужно
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

  const binaryString = atob(paddedBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Конвертация ArrayBuffer в base64url
function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Конвертация ArrayBuffer в стандартный base64 (для отправки на сервер)
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Проверка поддержки Passkey на текущей платформе
 */
export async function isPasskeySupported(): Promise<boolean> {
  if (Platform.OS === 'web') {
    // Проверяем поддержку WebAuthn API в браузере
    return !!(
      window.PublicKeyCredential &&
      navigator.credentials &&
      navigator.credentials.create &&
      navigator.credentials.get
    );
  } else {
    // На мобильных используем react-native-passkey
    try {
      // Проверяем что библиотека доступна
      if (!Passkey || typeof Passkey.isSupported !== 'function') {
        console.warn('react-native-passkey not properly configured');
        return false;
      }
      return Passkey.isSupported();
    } catch (error) {
      console.error('Error checking passkey support:', error);
      return false;
    }
  }
}

/**
 * Регистрация нового Passkey
 * @param challenge - Challenge от сервера (base64url строка)
 * @param options - Опции создания credential от сервера
 */
export async function registerPasskey(challenge: string, options: any): Promise<any> {
  if (Platform.OS === 'web') {
    // Веб: используем нативный WebAuthn API

    // Подготавливаем параметры для создания credential
    const publicKeyOptions: PublicKeyCredentialCreationOptions = {
      challenge: base64urlToArrayBuffer(challenge),
      rp: {
        name: options.publicKey.rp.name,
        id: options.publicKey.rp.id,
      },
      user: {
        id: base64urlToArrayBuffer(options.publicKey.user.id),
        name: options.publicKey.user.name,
        displayName: options.publicKey.user.displayName,
      },
      pubKeyCredParams: options.publicKey.pubKeyCredParams,
      timeout: options.publicKey.timeout || 60000,
      attestation: options.publicKey.attestation || 'none',
      authenticatorSelection: options.publicKey.authenticatorSelection || {
        authenticatorAttachment: 'platform',
        requireResidentKey: true,
        residentKey: 'required',
        userVerification: 'required',
      },
    };

    // Создаем credential
    const credential = await navigator.credentials.create({
      publicKey: publicKeyOptions,
    }) as PublicKeyCredential;

    if (!credential) {
      throw new Error('Failed to create credential');
    }

    // Форматируем ответ для отправки на сервер (используем стандартный base64)
    const response = credential.response as AuthenticatorAttestationResponse;

    return {
      id: credential.id,
      rawId: arrayBufferToBase64(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: arrayBufferToBase64(response.clientDataJSON),
        attestationObject: arrayBufferToBase64(response.attestationObject),
      },
    };
  } else {
    // Мобильные платформы: используем react-native-passkey
    // Библиотека ожидает PublicKeyCredentialCreationOptions напрямую
    const result = await Passkey.create(options.publicKey);
    return result;
  }
}

/**
 * Аутентификация с помощью Passkey
 * @param challenge - Challenge от сервера (base64url строка)
 * @param options - Опции аутентификации от сервера
 */
export async function authenticateWithPasskey(challenge: string, options: any): Promise<any> {
  if (Platform.OS === 'web') {
    // Веб: используем нативный WebAuthn API

    // Подготавливаем параметры для получения credential
    const publicKeyOptions: PublicKeyCredentialRequestOptions = {
      challenge: base64urlToArrayBuffer(challenge),
      timeout: options.publicKey.timeout || 60000,
      rpId: options.publicKey.rpId,
      userVerification: options.publicKey.userVerification || 'required',
    };

    // Если есть allowCredentials, конвертируем их
    if (options.publicKey.allowCredentials && options.publicKey.allowCredentials.length > 0) {
      publicKeyOptions.allowCredentials = options.publicKey.allowCredentials.map((cred: any) => ({
        id: base64urlToArrayBuffer(cred.id),
        type: cred.type,
        transports: cred.transports,
      }));
    }

    // Получаем credential
    const credential = await navigator.credentials.get({
      publicKey: publicKeyOptions,
    }) as PublicKeyCredential;

    if (!credential) {
      throw new Error('Failed to get credential');
    }

    // Форматируем ответ для отправки на сервер (используем стандартный base64)
    const response = credential.response as AuthenticatorAssertionResponse;

    return {
      id: credential.id,
      rawId: arrayBufferToBase64(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: arrayBufferToBase64(response.clientDataJSON),
        authenticatorData: arrayBufferToBase64(response.authenticatorData),
        signature: arrayBufferToBase64(response.signature),
        userHandle: response.userHandle ? arrayBufferToBase64(response.userHandle) : null,
      },
    };
  } else {
    // Мобильные платформы: используем react-native-passkey
    // Библиотека ожидает PublicKeyCredentialRequestOptions напрямую
    const result = await Passkey.get(options.publicKey);
    return result;
  }
}

/**
 * Проверка доступности Passkey для конкретного пользователя
 * (условная проверка, для веба - проверяем наличие сохраненных credentials)
 */
export async function checkPasskeyAvailability(): Promise<boolean> {
  if (Platform.OS === 'web') {
    // На вебе всегда возвращаем true если API поддерживается
    // Реальная проверка произойдет при попытке аутентификации
    return await isPasskeySupported();
  } else {
    // На мобильных используем react-native-passkey
    return await isPasskeySupported();
  }
}

/**
 * Получение информации о платформе для отладки
 */
export function getPlatformInfo(): string {
  if (Platform.OS === 'web') {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome (Web)';
    if (ua.includes('Safari')) return 'Safari (Web)';
    if (ua.includes('Firefox')) return 'Firefox (Web)';
    if (ua.includes('Edge')) return 'Edge (Web)';
    return 'Web Browser';
  }
  return Platform.OS === 'ios' ? 'iOS' : 'Android';
}

/**
 * Обработка ошибок Passkey
 */
export function formatPasskeyError(error: any): string {
  if (Platform.OS === 'web') {
    // Специфичные ошибки WebAuthn
    if (error.name === 'NotAllowedError') {
      return 'Операция отменена пользователем или время ожидания истекло';
    }
    if (error.name === 'InvalidStateError') {
      return 'Этот Passkey уже зарегистрирован';
    }
    if (error.name === 'NotSupportedError') {
      return 'Passkey не поддерживается в этом браузере';
    }
    if (error.name === 'SecurityError') {
      return 'Ошибка безопасности. Убедитесь, что сайт использует HTTPS';
    }
    if (error.name === 'AbortError') {
      return 'Операция была прервана';
    }
  }

  return error.message || 'Неизвестная ошибка Passkey';
}
