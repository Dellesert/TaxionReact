# API Error Handling - Обработка ошибок API

Это руководство описывает новую систему обработки ошибок API в React Native приложении.

## Обзор

Бэкенд был обновлен и теперь возвращает структурированные ответы с кодами ошибок для всех эндпоинтов аутентификации. Приложение теперь правильно обрабатывает эти ответы и показывает пользователю понятные уведомления.

## Новый формат ответов от API

### Формат ошибки

```typescript
interface APIErrorResponse {
  error: string;                    // Человекочитаемое сообщение
  error_code: string;                // Машиночитаемый код ошибки
  request_id?: string;               // ID запроса для отладки
  details?: any;                     // Дополнительные детали
  fields?: FieldError[];             // Ошибки валидации полей
  metadata?: Record<string, any>;    // Дополнительные метаданные
}
```

### Формат успешного логина

```typescript
interface LoginResponse {
  message: string;
  user: User;
  auth_mode: 'jwt' | 'session';
  tokens?: {
    access_token: string;
    refresh_token: string;
  };
  session?: {
    session_id: string;
    expires_at: number;
  };
  must_change_password?: boolean;
  request_id: string;
}
```

### Формат ответа 2FA Send

```typescript
interface TwoFASendResponse {
  message: string;
  request_id: string;
  code_expires_in: number;      // 300 секунд (5 минут)
  can_resend_after: number;     // 60 секунд
}
```

## Коды ошибок

### Аутентификация
- `AUTH_INVALID_CREDENTIALS` - Неверный email или пароль
- `AUTH_ACCOUNT_DEACTIVATED` - Аккаунт деактивирован
- `AUTH_2FA_REQUIRED` - Требуется 2FA (перенаправить на экран 2FA)
- `AUTH_PASSKEY_ONLY` - Только passkey (показать опции passkey)
- `AUTH_SUPER_ADMIN_WEB_ONLY` - Супер админ только через веб
- `AUTH_PASSWORD_EXPIRED` - Пароль истёк

### 2FA
- `AUTH_2FA_NOT_ENABLED` - 2FA не включён
- `AUTH_2FA_INVALID_CODE` - Неверный код
- `AUTH_2FA_CODE_EXPIRED` - Код истёк
- `AUTH_2FA_SEND_FAILED` - Не удалось отправить код

### Passkey
- `AUTH_PASSKEY_INVALID` - Неверный passkey
- `AUTH_PASSKEY_REGISTRATION_FAILED` - Ошибка регистрации

### Валидация
- `VALIDATION_REQUIRED_FIELD` - Обязательное поле не заполнено
- `VALIDATION_INVALID_EMAIL` - Неверный формат email
- `VALIDATION_PASSWORD_TOO_SHORT` - Пароль слишком короткий
- `VALIDATION_PASSWORD_TOO_WEAK` - Пароль слишком слабый

### Общие
- `INTERNAL_SERVER_ERROR` - Ошибка сервера
- `USER_NOT_FOUND` - Пользователь не найден

## Использование системы уведомлений

### Базовое использование

```tsx
import { useNotification } from '@contexts/NotificationContext';

const MyComponent = () => {
  const notification = useNotification();

  // Показать успех
  notification.showSuccess('Операция выполнена успешно');

  // Показать ошибку
  notification.showError('Произошла ошибка');

  // Показать предупреждение
  notification.showWarning('Внимание!');

  // Показать информацию
  notification.showInfo('Информационное сообщение');

  // Показать ошибку API с автоматическим форматированием
  try {
    await someApiCall();
  } catch (error) {
    notification.showApiError(error as ApiError);
  }
};
```

### Обработка ошибок с error_code

```tsx
import { extractErrorCode, ErrorCode, formatApiError } from '@utils/errorUtils';

try {
  await login({ email, password });
} catch (error) {
  const errorCode = extractErrorCode(error);

  if (errorCode === ErrorCode.AUTH_2FA_REQUIRED) {
    // Перенаправить на экран 2FA
    navigation.navigate('TwoFactor', { email });
  } else if (errorCode === ErrorCode.AUTH_SUPER_ADMIN_WEB_ONLY) {
    // Показать специальное сообщение
    notification.showError('Супер-администратор может входить только через веб-панель');
  } else {
    // Показать общую ошибку
    notification.showApiError(error);
  }
}
```

### Утилиты для работы с ошибками

```tsx
import {
  extractErrorCode,
  extractRequestId,
  formatApiError,
  requires2FA,
  requiresPasskeyOnly,
  isSuperAdminWebOnly,
  ErrorCode
} from '@utils/errorUtils';

// Извлечь error_code
const errorCode = extractErrorCode(error);

// Извлечь request_id
const requestId = extractRequestId(error);

// Форматировать ошибку в человекочитаемое сообщение
const message = formatApiError(error);

// Проверить специальные случаи
if (requires2FA(error)) {
  // Нужен переход на 2FA
}

if (requiresPasskeyOnly(error)) {
  // Доступен только Passkey
}

if (isSuperAdminWebOnly(error)) {
  // Super admin заблокирован
}
```

## Компоненты системы

### 1. Типы (src/types/common.types.ts)
- `APIErrorResponse` - структура ошибки от бэкенда
- `FieldError` - ошибка валидации поля
- `ApiError` - расширенный тип ошибки (backward compatible)

### 2. Утилиты (src/utils/errorUtils.ts)
- `ErrorCode` enum - все коды ошибок
- `getErrorMessage()` - получить сообщение по коду
- `formatApiError()` - форматировать ошибку
- `extractErrorCode()` - извлечь код ошибки
- `extractRequestId()` - извлечь ID запроса
- Хелперы для проверки специальных случаев

### 3. Компонент Toast (src/components/ui/Toast.tsx)
- Визуальное отображение уведомления
- Поддержка типов: success, error, warning, info
- Автоматическое скрытие через 4-5 секунд
- Отображение request_id для отладки

### 4. Notification Provider (src/contexts/NotificationContext.tsx)
- Управление очередью уведомлений
- Ограничение до 3 одновременных уведомлений
- Методы showSuccess, showError, showWarning, showInfo, showApiError

### 5. Axios Interceptor (src/api/axios.config.ts)
- Автоматическое преобразование ошибок в ApiError
- Извлечение error_code и request_id
- Обработка 401 (session expired)

## Интеграция

Компонент NotificationProvider уже интегрирован в App.tsx и оборачивает всё приложение:

```tsx
<NotificationProvider>
  <AppNavigator />
</NotificationProvider>
```

## Примеры обновлённых экранов

### LoginScreen
- Использует notification вместо Alert
- Обрабатывает все error_code от бэкенда
- Правильно перенаправляет на 2FA
- Блокирует super_admin
- Показывает понятные сообщения для passkey-only аккаунтов

### TwoFactorScreen
- Обрабатывает invalid code и expired code
- Показывает уведомления через notification system
- Отображает request_id для отладки

## Преимущества новой системы

1. **Единообразие** - все ошибки обрабатываются одинаково
2. **Удобство** - понятные сообщения на русском языке
3. **Отладка** - request_id для трейсинга ошибок
4. **UX** - красивые in-app уведомления вместо Alert
5. **Расширяемость** - легко добавить новые error_code
6. **Типизация** - TypeScript обеспечивает безопасность типов
