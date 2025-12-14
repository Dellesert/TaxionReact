# Electron Desktop - Быстрый старт

## Что было сделано ✅

Базовая интеграция Electron с вашим React Native приложением:

### Установлено:
- ✅ Electron + electron-builder + electron-store
- ✅ FileCache сервис (кеширование медиа с LRU eviction, 5GB лимит)
- ✅ Secure Storage (OS-native шифрование через safeStorage API)
- ✅ IPC handlers для всех сервисов
- ✅ React hooks (`useCachedImage`, `useCachedFile`)

### Структура:
```
electron/
├── main.js          # Главный процесс
├── preload.js       # Безопасный мост
└── FileCache.js     # Кеш сервис

src/shared/
├── utils/
│   ├── platform.ts               # Определение Electron
│   ├── secureStorage.electron.ts # Безопасное хранилище
│   └── secureStorage.ts          # Обновлен для Electron
└── hooks/
    └── useCachedMedia.ts         # Hook для кеширования
```

## Запуск (2 способа)

### Способ 1: Автоматический (рекомендуется)

```bash
npm run electron:dev
```

Запустит:
1. Expo dev server (порт 8093)
2. Electron окно (после готовности Expo)

### Способ 2: Вручную (для отладки)

**Terminal 1:**
```bash
npm start
```

**Terminal 2 (когда увидите "Metro waiting on exp://..."):**
```bash
npm run electron
```

## Проблемы и решения

### 1. Белый экран в Electron

**Причина**: Expo dev server не запустился или не на порту 8093

**Решение**:
1. Откройте `http://localhost:8093` в браузере
2. Должны увидеть текст "Waiting for..." или ваше приложение
3. Если ничего нет - проверьте что Terminal 1 показывает `Metro waiting...`
4. Перезапустите Electron: Ctrl+C в Terminal 2, затем `npm run electron`

### 2. Ошибка `__dirname is not defined`

**Причина**: Metro пытается загрузить electron файлы

**Решение**: Уже исправлено в `metro.config.js` - `electron/` директория блокируется

**Если всё ещё появляется**:
```bash
# Очистите кеш
rm -rf .expo node_modules/.cache
npm start -- --clear
```

### 3. `Store is not a constructor`

**Причина**: Неправильная версия electron-store

**Решение**: Уже исправлено - установлена версия 8.1.0 (CommonJS)

### 4. Белый экран - Metro пытается загрузить electron/main.js

**Причина**: В `package.json` поле `"main"` указывало на `electron/main.js`, и Metro использовал его как entry point для веб-бандла

**Решение**: Уже исправлено
1. В корневом `package.json` изменено `"main": "node_modules/expo/AppEntry.js"` (для Expo)
2. В electron script явно указан entry point: `electron ./electron/main.js`
3. Теперь Expo использует AppEntry.js для Metro bundler, а Electron запускается с правильным main файлом

### 5. Electron не может подключиться (ERR_CONNECTION_REFUSED)

**Причина**: Expo dev server слушал только на IPv6 (`[::1]`), а Electron пытался подключиться к IPv4 (`127.0.0.1`)

**Решение**: Уже исправлено
1. В `package.json` добавлен флаг `--host localhost` к команде start
2. Теперь Expo слушает на обоих интерфейсах (IPv4 и IPv6)

## Текущий статус

### ✅ Работает:
- Electron запускается
- Main process инициализируется
- FileCache создается
- IPC handlers регистрируются
- DevTools открываются

### 🔧 Нужно проверить:
- Загрузка React приложения из Expo
- Platform detection (`isElectron()`)
- Работу secure storage
- Работу file cache

## Следующие шаги

### 1. Проверить загрузку приложения

В Electron DevTools Console (откройте автоматически или F12):

```javascript
// Проверить что Electron API доступен
window.electron
// Должен вернуть: {platform: "win32", isElectron: true, ipc: {...}, cache: {...}, secureStorage: {...}}

// Проверить platform detection
require('./src/shared/utils/platform').isElectron()
// Должен вернуть: true
```

### 2. Протестировать кеш

```javascript
// Получить статистику кеша
const stats = await window.electron.cache.stats();
console.log(stats);
```

### 3. Использовать в компонентах

Замените обычные изображения на кешированные:

```tsx
// Было:
<Image source={{ uri: imageUrl }} />

// Стало:
import { useCachedImage } from '@shared/hooks/useCachedMedia';

function MyComponent({ imageUrl }) {
  const { localPath, loading, error } = useCachedImage(imageUrl);

  if (loading) return <ActivityIndicator />;
  if (error) return <Text>Error</Text>;

  return <Image source={{ uri: localPath }} />;
}
```

## Отладка

### Логи Main Process

Смотрите в Terminal где запустили Electron:
- `[Electron]` - основной процесс
- `[FileCache]` - файловый кеш
- `[IPC]` - IPC обработчики
- `[SecureStorage]` - безопасное хранилище

### Логи Renderer Process

Откройте DevTools (F12) в Electron окне:
- `[useCachedMedia]` - React hook логи
- Обычные console.log из приложения

### Если нужна помощь

1. Откройте DevTools (F12)
2. Перейдите на вкладку Console
3. Скопируйте все ошибки (если есть)
4. Проверьте Network tab - загружаются ли файлы

## Полезные команды

```bash
# Очистить кеш и перезапустить
npm start -- --clear

# Только Electron (если Expo уже запущен)
npm run electron

# Остановить все процессы
# Ctrl+C в обоих терминалах

# Убить зависшие Electron процессы (Windows)
taskkill /F /IM electron.exe

# Проверить что на порту 8093 ничего не запущено
netstat -ano | findstr :8093
```

## Дополнительная документация

См. [ELECTRON_README.md](./ELECTRON_README.md) для:
- Детальное описание архитектуры
- Информация о сборке production builds
- Настройки кеша и лимитов
- Примеры использования всех API

## Сборка production

```bash
# Windows installer
npm run electron:build:win

# Результат в dist-electron/
```

---

**Создано**: 2024-12-12
**Статус**: Базовая интеграция завершена ✅
**TODO**: Проверить загрузку React приложения, добавить System Tray, нативные уведомления
