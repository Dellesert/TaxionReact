# Quick Start - API Error Handling

## Что было сделано

### 1. Новые типы (src/types/common.types.ts)
```typescript
export interface APIErrorResponse {
  error: string;
  error_code: string;
  request_id?: string;
  details?: any;
  fields?: FieldError[];
  metadata?: Record<string, any>;
}

export interface FieldError {
  field: string;
  code: string;
  message: string;
}
```

### 2. Утилиты для обработки ошибок (src/utils/errorUtils.ts)
- `ErrorCode` enum с всеми кодами ошибок
- Функции для извлечения error_code и request_id
- Маппинг error_code на русские сообщения
- Хелперы для проверки специальных случаев

### 3. Toast компонент (src/components/ui/Toast.tsx)
- Красивые in-app уведомления
- Типы: success, error, warning, info
- Автоматическое скрытие
- Отображение request_id

### 4. Notification Provider (src/contexts/NotificationContext.tsx)
- Управление очередью уведомлений
- API: showSuccess, showError, showWarning, showInfo, showApiError

### 5. Обновлённые экраны
- **LoginScreen** - полная обработка всех error_code
- **TwoFactorScreen** - обработка invalid/expired кодов

### 6. Обновлённый axios interceptor
- Автоматическое извлечение error_code и request_id
- Преобразование в ApiError

## Как использовать

### В любом компоненте:

```tsx
import { useNotification } from '@contexts/NotificationContext';

const MyScreen = () => {
  const notification = useNotification();

  try {
    await someApiCall();
    notification.showSuccess('Успешно!');
  } catch (error) {
    notification.showApiError(error);
  }
};
```

### Обработка специальных случаев:

```tsx
import { extractErrorCode, ErrorCode } from '@utils/errorUtils';

try {
  await login({ email, password });
} catch (error) {
  const errorCode = extractErrorCode(error);

  if (errorCode === ErrorCode.AUTH_2FA_REQUIRED) {
    // Перенаправить на 2FA
    navigation.navigate('TwoFactor', { email });
  } else {
    notification.showApiError(error);
  }
}
```

## Коды ошибок

### Аутентификация
- `AUTH_INVALID_CREDENTIALS` - Неверный email или пароль
- `AUTH_ACCOUNT_DEACTIVATED` - Аккаунт деактивирован
- `AUTH_2FA_REQUIRED` - Требуется 2FA
- `AUTH_PASSKEY_ONLY` - Только passkey
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
- `VALIDATION_REQUIRED_FIELD` - Обязательное поле
- `VALIDATION_INVALID_EMAIL` - Неверный email
- `VALIDATION_PASSWORD_TOO_SHORT` - Пароль короткий
- `VALIDATION_PASSWORD_TOO_WEAK` - Пароль слабый

### Общие
- `INTERNAL_SERVER_ERROR` - Ошибка сервера
- `USER_NOT_FOUND` - Пользователь не найден

## Интеграция завершена

NotificationProvider уже добавлен в App.tsx:

```tsx
<NotificationProvider>
  <AppNavigator />
</NotificationProvider>
```

## Следующие шаги

1. Протестировать все сценарии входа
2. Добавить обработку error_code в другие экраны (Register, ForgotPassword и т.д.)
3. Добавить логирование ошибок с request_id

## Полезные ссылки

- Полная документация: [API_ERROR_HANDLING.md](./API_ERROR_HANDLING.md)
- Toast компонент: [src/components/ui/Toast.tsx](../src/components/ui/Toast.tsx)
- Error utilities: [src/utils/errorUtils.ts](../src/utils/errorUtils.ts)
- Notification context: [src/contexts/NotificationContext.tsx](../src/contexts/NotificationContext.tsx)
