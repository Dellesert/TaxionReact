# Quick Dev Build - iOS

## После установки нового npm модуля

### Для модулей БЕЗ нативного кода (чистый JS)
Просто перезапуск Metro — достаточно.

### Для модулей С нативным кодом (MMKV, NetInfo, и т.д.)

**Основная команда (в 90% случаев достаточно):**
```bash
export LANG=en_US.UTF-8 && npx expo run:ios --device "iPhone" --port 8093
```

Expo автоматически:
- Запустит `pod install` если нужно
- Пересоберёт приложение
- Установит на устройство

---

## Полный clean rebuild (если что-то сломалось)

```bash
# 1. Регенерация нативного кода
npx expo prebuild --platform ios --clean

# 2. Сборка и установка
export LANG=en_US.UTF-8 && npx expo run:ios --device "iPhone" --port 8093
```

---

## Только pod install вручную

```bash
cd ios && LANG=en_US.UTF-8 pod install
```

После этого всё равно нужен `expo run:ios` для сборки.

---

## Важно

`LANG=en_US.UTF-8` — обязательно! Исправляет баг CocoaPods с кодировкой UTF-8.

Без этого флага будет ошибка:
```
Unicode Normalization not appropriate for ASCII-8BIT
```

---

## Устройства

- iPhone 14 Pro: `--device "iPhone"`
- Симулятор: убрать `--device` флаг

## Порты

Если порт 8081 занят (Docker), используй другой:
- `--port 8090`
- `--port 8093`

---

## Сборка Dev Client IPA (для установки на другие устройства)

### Через EAS Build (рекомендуется)

```bash
# Development build для iOS
npx eas-cli build --profile development --platform ios
```

После сборки:
- IPA будет доступен в Expo dashboard
- Можно установить через QR код или прямую ссылку

### Локальная сборка IPA

```bash
# 1. Prebuild
npx expo prebuild --platform ios --clean

# 2. Открыть в Xcode
open ios/Tahion.xcworkspace

# 3. В Xcode:
#    - Product → Archive
#    - Window → Organizer → Distribute App
#    - Выбрать "Development" для dev client
#    - Export IPA
```

### Через командную строку (xcodebuild)

```bash
# 1. Архивация
xcodebuild -workspace ios/Tahion.xcworkspace \
  -scheme Tahion \
  -configuration Debug \
  -archivePath build/Tahion.xcarchive \
  archive

# 2. Экспорт IPA
xcodebuild -exportArchive \
  -archivePath build/Tahion.xcarchive \
  -exportPath build/ipa \
  -exportOptionsPlist ios/exportOptions.plist
```

### Установка IPA на устройство

```bash
# Через Apple Configurator или ios-deploy
ios-deploy --bundle build/ipa/Tahion.ipa

# Или через Xcode:
# Window → Devices and Simulators → перетащить IPA
```

---

## EAS Build профили

В `eas.json`:
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```
