# Применение Session Authentication

## ✅ Backend готов!

Backend уже настроен и работает в session mode. Теперь нужно применить изменения на фронтенде.

## Шаги по применению изменений

### 1. Обновите axios.config.ts

Файл уже обновлен! Проверьте что изменения применены:
- ✅ Убрана логика refresh token
- ✅ Добавлен header `X-Session-ID`
- ✅ Упрощен response interceptor

### 2. Обновите app.constants.ts

Файл уже обновлен! Проверьте:
- ✅ `SESSION_ID` вместо `ACCESS_TOKEN`/`REFRESH_TOKEN`
- ✅ `SESSION_CONFIG` вместо `TOKEN_CONFIG`

### 3. Замените authStore.ts

\`\`\`bash
cd /Users/dellesert/Documents/GitHub/TaxionReact
cp src/store/authStore.ts src/store/authStore.ts.backup
cp src/store/authStore.session.ts src/store/authStore.ts
\`\`\`

Или вручную скопируйте содержимое из `authStore.session.ts` в `authStore.ts`

### 4. Обновите user.types.ts

Добавьте новые типы:

\`\`\`typescript
// src/types/user.types.ts

// Добавить в конец файла:
export interface SessionInfo {
  session_id: string;
  expires_at: number;
}

export type AuthMode = 'jwt' | 'session';

// Обновить LoginResponse (найдите и замените):
export interface LoginResponse {
  message: string;
  user: User;
  tokens?: TokenPair; // Опционально для JWT mode
  session?: SessionInfo; // Опционально для Session mode
  auth_mode: AuthMode;
  must_change_password?: boolean;
  request_id?: string;
}
\`\`\`

### 5. Удалите tokenRefresh.service.ts (опционально)

Файл больше не нужен в session mode:

\`\`\`bash
rm src/services/tokenRefresh.service.ts
# Или просто не используйте его
\`\`\`

### 6. Проверьте что изменения работают

1. Запустите приложение
2. Попробуйте войти
3. Проверьте в логах:
   ```
   📝 Login response received:
     authMode: "session"
     hasSession: true
   💾 Saving session ID to storage...
   ✅ Session data saved successfully!
   ```

## Основные изменения

### До (JWT mode):
```typescript
// Сохранение токенов
await secureStorage.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, response.tokens.access_token);
await secureStorage.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, response.tokens.refresh_token);

// Authorization header
config.headers.Authorization = `Bearer ${token}`;

// Token refresh logic
const newToken = await refreshAccessToken();
```

### После (Session mode):
```typescript
// Сохранение session ID
await secureStorage.setItemAsync(STORAGE_KEYS.SESSION_ID, response.session.session_id);

// Session ID header
config.headers['X-Session-ID'] = sessionId;

// Нет token refresh logic!
```

## Проверка работы

### 1. Login
```bash
# В логах должно быть:
🔐 Request interceptor:
  hasSessionId: false

📝 Login response received:
  authMode: "session"
  hasSession: true
  sessionIdPreview: "abc123..."

💾 Saving session ID to storage...
✅ Session data saved successfully!
```

### 2. Authenticated Request
```bash
# В логах должно быть:
🔐 Request interceptor:
  hasSessionId: true
  sessionIdPreview: "abc123..."

# И header должен содержать:
X-Session-ID: abc123...
```

### 3. Logout
```bash
# В логах должно быть:
🔌 Disconnecting WebSocket...
✅ Session invalidated on server
✅ Logged out successfully
```

## Troubleshooting

### Проблема: Login не возвращает session

**Проверьте:**
1. Backend запущен с `AUTH_MODE=session`
2. Backend логи показывают "Authentication initialized in session mode"

\`\`\`bash
docker-compose logs user-service | grep -i "auth"
\`\`\`

### Проблема: 401 Unauthorized на каждом запросе

**Проверьте:**
1. Session ID сохраняется в storage
2. Session ID отправляется в header `X-Session-ID`
3. Backend получает header (проверьте логи)

### Проблема: TypeScript ошибки

**Если возникают ошибки типов:**
1. Обновите `user.types.ts` (см. шаг 4)
2. Перезапустите TypeScript server в IDE
3. Очистите cache: `rm -rf node_modules/.cache`

## Готово!

После применения всех изменений:
- ✅ Login работает с session mode
- ✅ Authenticated requests отправляют X-Session-ID
- ✅ Logout инвалидирует сессию на сервере
- ✅ 401 errors очищают session storage
- ✅ Нет автоматического token refresh (не нужен!)

## Следующие шаги

Можно добавить дополнительные фичи:

1. **Session expiration warning**
   - Показывать уведомление за 5 минут до истечения

2. **Active sessions list**
   - API endpoint для просмотра активных сессий пользователя
   - Возможность удалить конкретную сессию

3. **Session info in profile**
   - Показывать информацию о текущей сессии
   - Expire time, IP, User-Agent

Нужна помощь с реализацией этих фич?
