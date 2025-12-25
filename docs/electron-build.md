# Electron Build Guide

## Quick Start

### Development
```bash
npm run electron:dev
```
Запускает Expo dev server и Electron одновременно.

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

## Что делает сборка

1. `npm run generate:icons` — генерирует иконки
2. `npm run build:web` — собирает web bundle (Expo)
3. `node scripts/fix-electron-paths.js` — подготавливает пути
4. `electron-builder` — упаковывает приложение

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

### Иконки не отображаются
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
