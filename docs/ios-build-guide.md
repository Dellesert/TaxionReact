# iOS Build Guide

## Окружения

Проект поддерживает два окружения:

| Окружение | Bundle ID | Название | GoogleService-Info |
|-----------|-----------|----------|-------------------|
| Development | `com.dellesert.tachyon-messenger.dev` | Тахион Dev | GoogleService-Info-Dev.plist |
| Production | `com.dellesert.tachyon-messenger` | Тахион | GoogleService-Info.plist |

## Предварительные требования

- Xcode 16+
- CocoaPods
- Node.js 18+
- Установленные зависимости: `npm install`

## Dev Client (Development)

### 1. Prebuild

```bash
# Очистить и пересоздать iOS проект для dev
APP_ENV=development npx expo prebuild --clean --platform ios
```

### 2. Установить pods

```bash
cd ios && LANG=en_US.UTF-8 pod install && cd ..
```

### 3. Добавить push notifications в AppDelegate.swift

После prebuild нужно добавить код для push notifications в `ios/Dev/AppDelegate.swift`:

```swift
import FirebaseMessaging
import UserNotifications
```

И в `didFinishLaunchingWithOptions` после `FirebaseApp.configure()`:

```swift
// Register for remote notifications
UNUserNotificationCenter.current().delegate = self
Messaging.messaging().delegate = self
application.registerForRemoteNotifications()
```

Также добавить методы делегатов (см. полный пример в существующем AppDelegate.swift).

### 4. Собрать архив

```bash
xcodebuild -workspace ios/Dev.xcworkspace \
  -scheme Dev \
  -configuration Debug \
  -sdk iphoneos \
  -archivePath ios/build/Dev.xcarchive \
  archive \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM=QNVQ55232N \
  -allowProvisioningUpdates
```

### 5. Экспортировать IPA

Создать `ios/build/ExportOptions.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>development</string>
    <key>teamID</key>
    <string>QNVQ55232N</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>compileBitcode</key>
    <false/>
</dict>
</plist>
```

Экспорт:

```bash
xcodebuild -exportArchive \
  -archivePath ios/build/Dev.xcarchive \
  -exportPath ios/build/ipa-dev \
  -exportOptionsPlist ios/build/ExportOptions.plist
```

### 6. Установить на устройство

```bash
# Посмотреть доступные устройства
xcrun devicectl list devices

# Установить (заменить DEVICE_ID на реальный)
xcrun devicectl device install app --device DEVICE_ID ios/build/ipa-dev/Dev.ipa
```

---

## Release (Production)

### 1. Prebuild

```bash
# Очистить и пересоздать iOS проект для production
APP_ENV=production npx expo prebuild --clean --platform ios
```

### 2. Установить pods

```bash
cd ios && LANG=en_US.UTF-8 pod install && cd ..
```

### 3. Добавить push notifications в AppDelegate.swift

Аналогично dev сборке, добавить код для push в `ios/Tahion/AppDelegate.swift`.

### 4. Собрать архив (Release)

```bash
xcodebuild -workspace ios/Tahion.xcworkspace \
  -scheme Tahion \
  -configuration Release \
  -sdk iphoneos \
  -archivePath ios/build/Tahion.xcarchive \
  archive \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM=QNVQ55232N \
  -allowProvisioningUpdates
```

### 5. Экспортировать для App Store / TestFlight

Создать `ios/build/ExportOptions-AppStore.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store-connect</string>
    <key>teamID</key>
    <string>QNVQ55232N</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>
```

Экспорт:

```bash
xcodebuild -exportArchive \
  -archivePath ios/build/Tahion.xcarchive \
  -exportPath ios/build/ipa-release \
  -exportOptionsPlist ios/build/ExportOptions-AppStore.plist
```

### 6. Загрузить в App Store Connect

```bash
xcrun altool --upload-app \
  -f ios/build/ipa-release/Tahion.ipa \
  -t ios \
  -u YOUR_APPLE_ID \
  -p YOUR_APP_SPECIFIC_PASSWORD
```

Или через Transporter.app.

---

## Быстрые команды

### Dev Client (одной командой)

```bash
# Полная сборка dev client
rm -rf ios && \
APP_ENV=development npx expo prebuild --platform ios && \
cd ios && LANG=en_US.UTF-8 pod install && cd .. && \
xcodebuild -workspace ios/Dev.xcworkspace -scheme Dev -configuration Debug -sdk iphoneos \
  -archivePath ios/build/Dev.xcarchive archive \
  CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=QNVQ55232N -allowProvisioningUpdates && \
xcodebuild -exportArchive -archivePath ios/build/Dev.xcarchive \
  -exportPath ios/build/ipa-dev -exportOptionsPlist ios/build/ExportOptions.plist
```

### Release (одной командой)

```bash
# Полная сборка release
rm -rf ios && \
APP_ENV=production npx expo prebuild --platform ios && \
cd ios && LANG=en_US.UTF-8 pod install && cd .. && \
xcodebuild -workspace ios/Tahion.xcworkspace -scheme Tahion -configuration Release -sdk iphoneos \
  -archivePath ios/build/Tahion.xcarchive archive \
  CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=QNVQ55232N -allowProvisioningUpdates && \
xcodebuild -exportArchive -archivePath ios/build/Tahion.xcarchive \
  -exportPath ios/build/ipa-release -exportOptionsPlist ios/build/ExportOptions-AppStore.plist
```

---

## Troubleshooting

### CocoaPods UTF-8 ошибка

```bash
# Использовать LANG=en_US.UTF-8
cd ios && LANG=en_US.UTF-8 pod install
```

### Provisioning profile не найден

Добавить флаг `-allowProvisioningUpdates` к команде xcodebuild.

### Push notifications не работают

1. Проверить что APNs ключ (.p8) загружен в Firebase Console для соответствующего Bundle ID
2. Проверить что AppDelegate.swift содержит код для регистрации push notifications
3. Устанавливать через Xcode/devicectl, не через SideStore (переподписывает приложение)

### Очистка кэша сборки

```bash
# Очистить DerivedData
rm -rf ~/Library/Developer/Xcode/DerivedData

# Очистить pods
cd ios && rm -rf Pods Podfile.lock && pod install
```

---

## Структура файлов

```
TaxionReact/
├── GoogleService-Info.plist      # Production Firebase config
├── GoogleService-Info-Dev.plist  # Development Firebase config
├── plugins/
│   ├── withDevEnvironment.js     # Плагин для переключения окружений
│   └── withPodfileModifications.js
├── ios/
│   ├── Dev/                      # Dev проект (после prebuild с APP_ENV=development)
│   ├── Tahion/                   # Production проект (после prebuild с APP_ENV=production)
│   └── build/
│       ├── Dev.xcarchive
│       ├── Tahion.xcarchive
│       ├── ipa-dev/
│       └── ipa-release/
```
