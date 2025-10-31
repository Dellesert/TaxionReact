# Session Mode - File Uploads Fix

## Проблема

При переходе в чат возникала ошибка:
```
ERROR ❌ [SecureStorage] Failed to retrieve undefined:
[Error: Invalid key provided to SecureStore. Keys must not be empty...]
```

**Причина:** После миграции на session-based authentication, некоторые компоненты все еще пытались использовать `STORAGE_KEYS.ACCESS_TOKEN`, который был удален из констант.

## Решение

Заменили все использования `ACCESS_TOKEN` на `SESSION_ID` и обновили заголовки с `Authorization: Bearer` на `X-Session-ID`.

## Измененные файлы

### API файлы

1. **[src/api/fileApi.ts](src/api/fileApi.ts)**
   - ✅ `uploadFile()` - использует SESSION_ID и X-Session-ID header
   - ✅ `getFileById()` - использует SESSION_ID и X-Session-ID header
   - ✅ `deleteFile()` - использует SESSION_ID и X-Session-ID header
   - Изменения:
     ```typescript
     // Было:
     const token = await secureStorage.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
     headers: { 'Authorization': `Bearer ${token}` }

     // Стало:
     const sessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
     headers: { 'X-Session-ID': sessionId }
     ```

2. **[src/api/task.api.ts](src/api/task.api.ts)**
   - ✅ `uploadAttachment()` - использует SESSION_ID и X-Session-ID header
   - Аналогичные изменения как в fileApi.ts

### Компоненты чата

3. **[src/components/chat/ImageViewer.tsx](src/components/chat/ImageViewer.tsx)**
   - ✅ Переименовал `token` → `sessionId`
   - ✅ Использует SESSION_ID из storage
   - ✅ Передает X-Session-ID в Image headers

4. **[src/components/chat/MessageAttachments.tsx](src/components/chat/MessageAttachments.tsx)**
   - ✅ Переименовал `token` → `sessionId`
   - ✅ Заменил все Authorization headers на X-Session-ID
   - ✅ Обновил для всех типов вложений (изображения, файлы, документы)

5. **[src/components/chat/MessageItem_temp.tsx](src/components/chat/MessageItem_temp.tsx)**
   - ✅ Переименовал `token` → `sessionId`
   - ✅ Обновил все fetch запросы для загрузки изображений

### Экраны

6. **[src/screens/task/TaskDetailScreen.tsx](src/screens/task/TaskDetailScreen.tsx)**
   - ✅ Переименовал `token` → `sessionId`
   - ✅ Обновил загрузку вложений задач

## Типы изменений

### 1. Storage Key
```typescript
// Было:
STORAGE_KEYS.ACCESS_TOKEN

// Стало:
STORAGE_KEYS.SESSION_ID
```

### 2. HTTP Headers (fetch/XMLHttpRequest)
```typescript
// Было:
headers: {
  'Authorization': `Bearer ${token}`
}

// Стало:
headers: {
  'X-Session-ID': sessionId
}
```

### 3. Image Headers (expo-image)
```typescript
// Было:
<Image
  source={{
    uri: imageUrl,
    headers: token ? {
      'Authorization': `Bearer ${token}`
    } : undefined
  }}
/>

// Стало:
<Image
  source={{
    uri: imageUrl,
    headers: sessionId ? {
      'X-Session-ID': sessionId
    } : undefined
  }}
/>
```

### 4. Переменные
```typescript
// Было:
const [token, setToken] = useState<string | null>(null);
const loadToken = async () => {
  const authToken = await secureStorage.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
  setToken(authToken);
};

// Стало:
const [sessionId, setSessionId] = useState<string | null>(null);
const loadSessionId = async () => {
  const authSessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
  setSessionId(authSessionId);
};
```

## Дополнительные исправления

### MessageAttachments.tsx - несоответствие переменных

**Проблема:**
```typescript
const [sessionId, setToken] = React.useState<string | null>(null);
// ...
setSessionId(authToken); // authToken не определен!
```

**Исправление:**
```typescript
const [sessionId, setSessionId] = React.useState<string | null>(null);
// ...
setSessionId(authSessionId); // Правильно!
```

Строки 40 и 46 в MessageAttachments.tsx содержали ошибки:
- `setToken` должен быть `setSessionId`
- `authToken` должен быть `authSessionId`

Это вызывало ошибку: `Property 'token' doesn't exist`

## Проверка

Убедитесь что:
- ✅ Нет упоминаний `ACCESS_TOKEN` в коде
- ✅ Нет несоответствий `setToken`/`authToken`
- ✅ Все файловые операции используют SESSION_ID
- ✅ Загрузка изображений в чатах работает
- ✅ Загрузка вложений в задачах работает
- ✅ Просмотр изображений в полноэкранном режиме работает
- ✅ Скачивание файлов работает

## Команда для проверки

```bash
# Проверить что ACCESS_TOKEN больше нет
grep -r "ACCESS_TOKEN" src/ --include="*.ts" --include="*.tsx"

# Проверить что SESSION_ID используется везде
grep -r "SESSION_ID" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"
```

## Результат

✅ Ошибка `Failed to retrieve undefined` исправлена
✅ Все файловые операции работают с session authentication
✅ Изображения и вложения загружаются корректно
✅ Совместимость с session-based authentication полная

---

**Дата исправления:** 2025-10-30
**Затронуто файлов:** 6
**Строк изменено:** ~50
