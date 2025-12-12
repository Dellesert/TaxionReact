# Tachyon Messenger - Electron Desktop App

Десктопная версия мессенджера на базе Electron с поддержкой офлайн кеширования медиа.

## Возможности

- ✅ **Нативное десктопное приложение** для Windows, macOS, Linux
- ✅ **Офлайн кеширование медиа** - изображения и документы доступны без интернета
- ✅ **Безопасное хранилище** - токены и пароли зашифрованы через OS (Keychain/DPAPI/libsecret)
- ✅ **LRU eviction** - автоматическая очистка старых файлов при превышении лимита кеша (5GB)
- 🚧 **System Tray** - работа в фоне с иконкой в трее (в разработке)
- 🚧 **Нативные уведомления** - всплывающие уведомления OS (в разработке)
- 🚧 **Auto-update** - автоматические обновления приложения (в разработке)

## Установка зависимостей

```bash
npm install
```

Electron зависимости уже установлены:
- `electron` - основной фреймворк
- `electron-builder` - сборка приложения
- `electron-store` - хранилище метаданных
- `concurrently` - запуск нескольких процессов
- `wait-on` - ожидание готовности сервера

## Запуск в режиме разработки

### Вариант 1: Автоматический запуск (рекомендуется)

```bash
npm run electron:dev
```

Эта команда:
1. Запустит Expo dev server на порту 8093
2. Дождется его готовности
3. Запустит Electron окно, которое подключится к dev серверу

### Вариант 2: Ручной запуск

Terminal 1 - запустить Expo:
```bash
npm start
```

Terminal 2 - запустить Electron:
```bash
npm run electron
```

## Структура проекта

```
electron/
├── main.js              # Main process (Node.js)
├── preload.js           # Preload script (безопасный мост)
├── FileCache.js         # Файловый кеш для медиа
└── resources/           # Ресурсы для сборки (иконки и т.д.)

src/
├── shared/
│   ├── utils/
│   │   ├── platform.ts               # Определение платформы
│   │   ├── secureStorage.ts          # Универсальное хранилище (с поддержкой Electron)
│   │   └── secureStorage.electron.ts # Electron-specific secure storage
│   └── hooks/
│       └── useCachedMedia.ts         # React hook для кеширования медиа
```

## Использование в коде

### Кеширование изображений

```tsx
import { useCachedImage } from '@shared/hooks/useCachedMedia';

function ChatImage({ url }: { url: string }) {
  const { localPath, loading, error } = useCachedImage(url);

  if (loading) return <ActivityIndicator />;
  if (error) return <Text>Ошибка загрузки</Text>;

  return <Image source={{ uri: localPath }} style={{ width: 200, height: 200 }} />;
}
```

### Кеширование файлов

```tsx
import { useCachedFile } from '@shared/hooks/useCachedMedia';

function DocumentViewer({ url }: { url: string }) {
  const { localPath, loading, error, reload } = useCachedFile(url);

  if (loading) return <Text>Загрузка...</Text>;
  if (error) return <Button onPress={reload}>Повторить</Button>;

  // localPath теперь указывает на локальный файл
  // Можно открыть через FileViewer или другой компонент
}
```

### Secure Storage (автоматически работает в Electron)

```tsx
import { setItemAsync, getItemAsync } from '@shared/utils/secureStorage';

// Сохранить токен (будет зашифрован через OS Keychain/DPAPI)
await setItemAsync('SESSION_ID', 'my-secret-token');

// Получить токен
const token = await getItemAsync('SESSION_ID');
```

## Кеширование медиа

### Как это работает

1. **Первая загрузка**: Файл скачивается с сервера и сохраняется в локальный кеш
2. **Повторное использование**: Файл берется из кеша мгновенно
3. **LRU eviction**: При превышении лимита (5GB) старые файлы автоматически удаляются

### Где хранятся файлы

- **Windows**: `C:\Users\<user>\AppData\Roaming\Tachyon Messenger\media-cache\`
- **macOS**: `~/Library/Application Support/Tachyon Messenger/media-cache/`
- **Linux**: `~/.config/Tachyon Messenger/media-cache/`

### Метаданные

Кеш хранит метаданные в `cache-metadata.json`:
- URL файла
- Имя файла (SHA256 hash от URL)
- Размер
- MIME type
- Время создания и последнего доступа (для LRU)

### Управление кешем (будет добавлено в UI)

```tsx
const electron = getElectronAPI();

// Получить статистику кеша
const stats = await electron.cache.stats();
console.log(stats);
// {
//   totalSize: 1234567890,
//   totalSizeFormatted: "1.23 GB",
//   fileCount: 1523,
//   maxSize: 5368709120,
//   maxSizeFormatted: "5 GB",
//   usagePercent: 23.5,
//   cacheDir: "C:\\Users\\...\\media-cache"
// }

// Очистить весь кеш
await electron.cache.clear();
```

## Безопасное хранилище

### Как это работает

**Electron использует OS-native encryption:**
- **Windows**: DPAPI (Data Protection API)
- **macOS**: Keychain
- **Linux**: libsecret (Gnome Keyring) или kwallet (KDE)

Токены и пароли шифруются автоматически через `safeStorage` API.

### Что хранится в secure storage

- `SESSION_ID` - ID сессии пользователя
- `USER_DATA` - данные пользователя
- Другие чувствительные данные

## Сборка приложения

### Windows

```bash
npm run electron:build:win
```

Создаст:
- NSIS installer (`Tachyon Messenger Setup.exe`)
- Portable version (`Tachyon Messenger.exe`)

### macOS

```bash
npm run electron:build:mac
```

Создаст:
- DMG installer
- ZIP archive

### Linux

```bash
npm run electron:build:linux
```

Создаст:
- AppImage (универсальный)
- DEB package (Debian/Ubuntu)

### Все платформы

```bash
npm run electron:build
```

## Конфигурация

### electron-builder

Конфигурация в `package.json` секция `"build"`:

```json
{
  "build": {
    "appId": "com.dellesert.tachyon-messenger",
    "productName": "Tachyon Messenger",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "electron/**/*",
      "dist/**/*",
      "node_modules/**/*"
    ],
    "win": {
      "target": ["nsis", "portable"],
      "icon": "assets/icon.png"
    },
    "mac": {
      "category": "public.app-category.social-networking"
    }
  }
}
```

### Переменные окружения

Создайте `.env` файл:

```bash
# API endpoints
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
EXPO_PUBLIC_WS_URL=ws://localhost:8080

# Expo dev server (для Electron)
EXPO_DEV_SERVER_URL=http://localhost:8093
```

## Отладка

### DevTools

В режиме разработки DevTools открываются автоматически. Чтобы отключить:

```javascript
// electron/main.js
// Закомментируйте эту строку:
// mainWindow.webContents.openDevTools();
```

### Логи

Все логи выводятся в консоль с префиксами:
- `[Electron]` - основной процесс
- `[FileCache]` - файловый кеш
- `[IPC]` - IPC handlers
- `[SecureStorage]` - безопасное хранилище
- `[useCachedMedia]` - React hook

## Известные проблемы

### 1. Expo modules не работают в Electron

Некоторые Expo модули (Camera, Location, etc.) не будут работать в Electron, так как они требуют нативный код iOS/Android.

**Решение**: Используйте Electron-совместимые библиотеки или отключите эти фичи в Electron.

### 2. React Native Web ограничения

Не все React Native компоненты работают на веб. Убедитесь что используете веб-совместимые компоненты.

### 3. CORS ошибки

Если API сервер блокирует CORS, в Electron можно отключить веб-безопасность (только для dev):

```javascript
// electron/main.js
webPreferences: {
  webSecurity: false, // ТОЛЬКО ДЛЯ РАЗРАБОТКИ!
}
```

## Производительность

### Оптимизация кеша

По умолчанию лимит кеша 5GB. Чтобы изменить:

```javascript
// electron/main.js
fileCache = new FileCache({
  maxSize: 10 * 1024 * 1024 * 1024 // 10GB
});
```

### Ленивая загрузка

Используйте `loading` state из hook для показа placeholder:

```tsx
const { localPath, loading } = useCachedImage(url);

return (
  <>
    {loading && <Skeleton width={200} height={200} />}
    {!loading && <Image source={{ uri: localPath }} />}
  </>
);
```

## Следующие шаги

### В разработке

1. **System Tray** - иконка в трее с меню
2. **Нативные уведомления** - desktop notifications
3. **Auto-update** - автообновления через electron-updater
4. **Deep linking** - `tachyon://` protocol
5. **Горячие клавиши** - глобальные shortcuts
6. **UI настроек кеша** - в Settings экране

### Планируется

1. **Thumbnails** - генерация превью для изображений
2. **Progressive loading** - сначала thumbnail, потом full image
3. **Background sync** - синхронизация в фоне
4. **Offline mode** - полноценная работа offline

## Полезные ссылки

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder](https://www.electron.build/)
- [electron-store](https://github.com/sindresorhus/electron-store)
- [React Native Web](https://necolas.github.io/react-native-web/)

## Лицензия

См. основной README проекта.
