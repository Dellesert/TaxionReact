# Electron Build Guide

## Quick Start

### Development (с hot reload)
```bash
npm run electron:dev
```
Запускает Expo dev server и Electron одновременно. Изменения в коде применяются автоматически.

### Production Build (Windows)

**Unpacked (для тестирования):**
```bash
npm run electron:pack:win
```
Результат: `dist-electron/win-unpacked/Tachyon Messenger.exe`

**Installer (NSIS):**
```bash
npm run electron:build:win
```
Результат: `dist-electron/Tachyon Messenger-Setup-1.0.0.exe`

### Другие платформы
```bash
npm run electron:build:mac    # macOS
npm run electron:build:linux  # Linux
```

## Workflow: Изменение кода

### При разработке (Development)
Используй `npm run electron:dev` — изменения применяются автоматически (hot reload).

### После изменения React Native кода (Production)
Если изменил код и хочешь обновить production сборку:

```bash
# Полная пересборка (включает build:web)
npm run electron:pack:win     # unpacked для тестирования
# или
npm run electron:build:win    # installer
```

**Важно:** команды `electron:pack:win` и `electron:build:win` автоматически выполняют `build:web`, поэтому отдельно запускать не нужно.

### Только пересборка web bundle
Если нужно только обновить web bundle без упаковки Electron:
```bash
npm run build:web
```
Результат: папка `dist/` с обновлённым bundle.

## Что делает сборка

Команда `electron:prebuild` (запускается автоматически):

1. `npm run generate:icons` — генерирует иконки (ico, png)
2. `npm run build:web` — собирает web bundle (Expo export)
3. `node scripts/fix-electron-paths.js` — подготавливает пути для app:// протокола
4. `cd electron && npm install` — устанавливает зависимости electron

Затем `electron-builder` упаковывает всё в приложение.

## Ключевые настройки

### Custom Protocol (`app://`)
Production использует `app://local/` протокол для загрузки локальных файлов. Это решает проблемы с:
- Относительными путями к ассетам
- CORS ограничениями `file://` протокола

### CORS и Proxy
В `main.js` настроено:
- `webSecurity: false` — отключает CORS проверки
- `session.setProxy({ mode: 'direct' })` — прямое соединение без системного прокси
- Удаление `Origin` header из API запросов

### Включение шрифтов
В `package.json` секция `build.files`:
```json
{
  "from": "dist",
  "to": "dist",
  "filter": ["**/*"]
}
```
Это включает все файлы из `dist/`, включая шрифты в `dist/assets/node_modules/`.

## Troubleshooting

### Иконка приложения не отображается (Windows)

**Требования для сборки с иконкой:**
1. Включить Developer Mode: `Settings → System → For developers → Developer Mode: ON`
2. В `package.json` должно быть `"signAndEditExecutable": true`

**Если иконка в свойствах файла правильная, но в проводнике стандартная:**
Это кэш иконок Windows. Очистить можно так (CMD от администратора):
```cmd
ie4uinit.exe -show
```
Или более агрессивно:
```cmd
taskkill /f /im explorer.exe
del /a /q "%localappdata%\IconCache.db"
del /a /f /s /q "%localappdata%\Microsoft\Windows\Explorer\iconcache*"
start explorer.exe
```
Или просто перезагрузить компьютер.

### Шрифты (иконки в UI) не отображаются
Проверьте что шрифты включены в asar:
```bash
npx asar list dist-electron/win-unpacked/resources/app.asar | grep ".ttf"
```

### API не работает (CORS/Proxy)
Убедитесь что в `main.js`:
- `webSecurity: false` в `webPreferences`
- `session.defaultSession.setProxy({ mode: 'direct' })`

### DevTools в production
Временно для отладки в `main.js` есть `mainWindow.webContents.openDevTools()`. Удалите для релиза.

## Структура файлов

```
dist-electron/
├── win-unpacked/           # Unpacked build
│   ├── Tachyon Messenger.exe
│   └── resources/
│       └── app.asar        # Упакованное приложение
└── Tachyon Messenger-Setup-1.0.0.exe  # Installer
```
