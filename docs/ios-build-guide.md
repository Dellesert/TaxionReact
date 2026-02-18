# iOS Build Guide

## ⚠️ Чеклист перед сборкой

**После `expo prebuild` всё генерируется автоматически через config plugins:**
- [x] Push notifications (импорты, делегаты, extensions) — `withPushNotificationDelegates.js`
- [x] Associated Domains / Passkey — `associatedDomains` в `app.json`
- [x] Firebase — `@react-native-firebase/app` + `@react-native-firebase/messaging`
- [x] Podfile модификации — `withPodfileModifications.js`
- [x] Share Extension (таргет + entitlements + App Groups) — `expo-share-intent`
- [x] Share Extension кастомный UI (чат-пикер) — `withCustomShareViewController.js`
- [x] Share Extension синхронизация данных — Expo Module `share-data` (pod `ShareData`)
- [x] ExportOptions plist файлы — `withExportOptions.js`

**Версия и номер сборки:**
- [x] Версия и buildNumber берутся из `version.json` → `app.config.js` → `expo prebuild`
- [x] После prebuild скрипт `sync-ios-version.js` синхронизирует `Info.plist` с `version.json`
- [x] `bump-version.js` автоматически обновляет `Info.plist` при изменении версии

**Ручные шаги:**
- [ ] Перед релизом: `node scripts/bump-version.js --ios` (увеличит buildNumber в `version.json` и `Info.plist`)
- [ ] Для Production: убедиться, что Associated Domains и App Groups включены в Apple Developer Console
- [ ] Проверить наличие файла `apple-app-site-association` на сервере

---

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

## Config Plugins (автоматизация)

Все нативные настройки iOS управляются через config plugins в `app.json`:

| Плагин | Что делает |
|--------|-----------|
| `withDevEnvironment.js` | Переключает Bundle ID, иконку, GoogleService-Info для dev/prod |
| `withPodfileModifications.js` | Добавляет `use_modular_headers!` для Firebase |
| `withPushNotificationDelegates.js` | Добавляет push notification код в AppDelegate (импорты, делегаты, extensions) |
| `withExportOptions.js` | Генерирует `ExportOptions.plist` и `ExportOptions-AppStore.plist` в `ios/build/` |
| `@react-native-firebase/app` | Добавляет `FirebaseApp.configure()` |
| `@react-native-firebase/messaging` | Настройка Firebase Messaging |
| `expo-notifications` | Добавляет `aps-environment` в entitlements |
| `expo-share-intent` | Создаёт Share Extension таргет, entitlements, Info.plist, storyboard |
| `withShareExtensionConfig.js` | Устанавливает DEVELOPMENT_TEAM и buildNumber для Share Extension |
| `withCustomShareViewController.js` | Заменяет ShareViewController на кастомный с нативным чат-пикером |

**Скрипты версионирования:**

| Скрипт | Что делает |
|--------|-----------|
| `scripts/sync-ios-version.js` | Синхронизирует `version` и `buildNumber` из `version.json` в `ios/*/Info.plist` |
| `scripts/bump-version.js` | Увеличивает версию/buildNumber в `version.json` и автоматически вызывает `sync-ios-version.js` |

**Expo Module `modules/share-data/`** — синхронизирует список чатов, сессию и API URL из React Native в App Group UserDefaults. Share Extension читает эти данные для отображения чатов и отправки сообщений напрямую. App group идентификатор читается динамически из `Info.plist` (`AppGroupIdentifier`), что обеспечивает корректную работу в dev и production окружениях.

**`associatedDomains`** в `app.json` → автоматически добавляет `com.apple.developer.associated-domains` в entitlements (для Passkey).

---

## Dev Client (Development)

### 1. Prebuild

```bash
# Очистить и пересоздать iOS проект для dev
APP_ENV=development npx expo prebuild --clean --platform ios
```

### 2. Синхронизировать версию

```bash
node scripts/sync-ios-version.js
```

### 3. Установить pods

```bash
cd ios && LANG=en_US.UTF-8 pod install && cd ..
```

### 4. Проверить (опционально)

После prebuild убедитесь, что автоматически сгенерировано:

**`ios/Dev/AppDelegate.swift`** должен содержать:
- `import FirebaseMessaging` и `import UserNotifications`
- `UNUserNotificationCenter.current().delegate = self`
- `Messaging.messaging().delegate = self`
- `application.registerForRemoteNotifications()`
- Extensions `UNUserNotificationCenterDelegate` и `MessagingDelegate`

**`ios/Dev/Dev.entitlements`** должен содержать:
```xml
<key>aps-environment</key>
<string>development</string>
<key>com.apple.developer.associated-domains</key>
<array>
  <string>webcredentials:taxion.fusioninsight.cloud</string>
</array>
```

**Для passkey также необходимо настроить файл на сервере:**
- URL: `https://taxion.fusioninsight.cloud/.well-known/apple-app-site-association`
- Содержимое:
```json
{
  "webcredentials": {
    "apps": [ "QNVQ55232N.com.dellesert.tachyon-messenger.dev" ]
  }
}
```

### 5. Собрать архив

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

### 6. Экспортировать IPA

`ios/build/ExportOptions.plist` генерируется автоматически плагином `withExportOptions.js`.

```bash
xcodebuild -exportArchive \
  -archivePath ios/build/Dev.xcarchive \
  -exportPath ios/build/ipa-dev \
  -exportOptionsPlist ios/build/ExportOptions.plist
```

### 7. Установить на устройство

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

### 2. Синхронизировать версию

```bash
node scripts/sync-ios-version.js
```

### 3. Установить pods

```bash
cd ios && LANG=en_US.UTF-8 pod install && cd ..
```

### 4. Проверить (опционально)

После prebuild убедитесь, что автоматически сгенерировано:

**`ios/Tahion/AppDelegate.swift`** должен содержать:
- `import FirebaseMessaging` и `import UserNotifications`
- `UNUserNotificationCenter.current().delegate = self`
- `Messaging.messaging().delegate = self`
- `application.registerForRemoteNotifications()`
- Extensions `UNUserNotificationCenterDelegate` и `MessagingDelegate`

**`ios/Tahion/Tahion.entitlements`** должен содержать:
```xml
<key>aps-environment</key>
<string>production</string>
<key>com.apple.developer.associated-domains</key>
<array>
  <string>webcredentials:taxion.fusioninsight.cloud</string>
</array>
```

#### Проверить Associated Domains в Apple Developer Console

**Перед первой сборкой убедитесь:**

1. Откройте [Apple Developer Console](https://developer.apple.com/account)
2. Перейдите в **Certificates, Identifiers & Profiles** → **Identifiers**
3. Найдите `com.dellesert.tachyon-messenger`
4. Убедитесь, что включена capability **Associated Domains**
5. Сохраните изменения
6. Перейдите в **Profiles** и пересоздайте профиль для App Store

**Для passkey также необходимо настроить файл на сервере:**
- URL: `https://taxion.fusioninsight.cloud/.well-known/apple-app-site-association`
- Содержимое:
```json
{
  "webcredentials": {
    "apps": [ "QNVQ55232N.com.dellesert.tachyon-messenger" ]
  }
}
```
- Файл должен отдаваться с заголовком `Content-Type: application/json`

### 5. Собрать архив (Release)

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

### 6. Экспортировать для App Store / TestFlight

`ios/build/ExportOptions-AppStore.plist` генерируется автоматически плагином `withExportOptions.js`.

```bash
xcodebuild -exportArchive \
  -archivePath ios/build/Tahion.xcarchive \
  -exportPath ios/build/ipa-release \
  -exportOptionsPlist ios/build/ExportOptions-AppStore.plist
```

### 7. Загрузить в App Store Connect
Пользователь сам загружает через Transporter.app


```bash
xcrun altool --upload-app \
  -f ios/build/ipa-release/Tahion.ipa \
  -t ios \
  -u YOUR_APPLE_ID \
  -p YOUR_APP_SPECIFIC_PASSWORD
```
---

## Быстрые команды

### Dev Client (одной командой)

```bash
# Полная сборка dev client
rm -rf ios && \
APP_ENV=development npx expo prebuild --platform ios && \
node scripts/sync-ios-version.js && \
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
node scripts/sync-ios-version.js && \
cd ios && LANG=en_US.UTF-8 pod install && cd .. && \
xcodebuild -workspace ios/Tahion.xcworkspace -scheme Tahion -configuration Release -sdk iphoneos \
  -archivePath ios/build/Tahion.xcarchive archive \
  CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=QNVQ55232N -allowProvisioningUpdates && \
xcodebuild -exportArchive -archivePath ios/build/Tahion.xcarchive \
  -exportPath ios/build/ipa-release -exportOptionsPlist ios/build/ExportOptions-AppStore.plist -allowProvisioningUpdates
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
2. Проверить что AppDelegate.swift содержит код для регистрации push notifications (должен генерироваться автоматически через `withPushNotificationDelegates.js`)
3. Устанавливать через Xcode/devicectl, не через SideStore (переподписывает приложение)

### Share Extension не появляется в меню "Поделиться"

1. Проверить что `expo-share-intent` плагин есть в `app.json`
2. Убедиться что prebuild выполнен с `--clean` флагом
3. Проверить что в Xcode проекте есть таргет ShareExtension

### Share Extension показывает "Войдите в приложение" или пустой список чатов

**Самая частая причина — App Groups не настроен в Apple Developer Portal:**

1. Открыть [Apple Developer Console](https://developer.apple.com/account) → **Certificates, Identifiers & Profiles** → **Identifiers**
2. Найти `com.dellesert.tachyon-messenger` → включить **App Groups** → добавить группу `group.com.dellesert.tachyon-messenger`
3. Найти `com.dellesert.tachyon-messenger.share-extension` → аналогично включить **App Groups** → добавить ту же группу
4. Пересобрать с `CODE_SIGN_STYLE=Automatic -allowProvisioningUpdates` (Xcode автоматически обновит provisioning profiles)

**Диагностика через логи (Xcode Console или Console.app):**
- При запуске основного приложения в логах должно появиться: `[ShareData] syncAuth OK`
- При открытии Share Extension: `[ShareExt] loadSyncedData` и `[ShareExt] Read from UserDefaults`
- Если видно `[ShareData] ERROR: AppGroupIdentifier not found` — ключ отсутствует в Info.plist, нужен `expo prebuild --clean`
- Если `sessionId=nil` в логах Share Extension — данные не синхронизированы, откройте основное приложение

**Другие проверки:**

1. Проверить что pod `ShareData` есть в `ios/Podfile.lock` — если нет, нативный модуль не подключён и синхронизация данных не работает
2. Убедиться что `share-data` есть в `package.json` dependencies (`"share-data": "file:./modules/share-data"`)
3. Убедиться что пользователь залогинен в основном приложении (данные синхронизируются при логине)
4. Открыть основное приложение и дождаться загрузки списка чатов (синхронизация происходит после `loadChats`)
5. Если сессия истекла — Share Extension покажет ошибку "Сессия истекла", нужно перелогиниться в приложении

### Share Extension: фото/файлы не отображаются после отправки (404)

Файлы, загруженные через Share Extension, должны быть публичными (`is_public: true`), иначе приложение попытается загрузить их по `/files/public/` URL и получит 404.

**Проверка:** в `templates/ShareViewController.swift` функция `buildMultipartBody` должна содержать поле `is_public`:
```swift
// is_public field — chat attachments must be public so all members can access them
handle.write("--\(boundary)\r\n".data(using: .utf8)!)
handle.write(
  "Content-Disposition: form-data; name=\"is_public\"\r\n\r\n".data(using: .utf8)!)
handle.write("true\r\n".data(using: .utf8)!)
```

### Очистка кэша сборки

```bash
# Очистить DerivedData
rm -rf ~/Library/Developer/Xcode/DerivedData

# Очистить pods
cd ios && rm -rf Pods Podfile.lock && pod install
```

---

## Настройка Passkey (Associated Domains)

### Требования для работы Passkey

Для работы passkey необходимо настроить файл `apple-app-site-association` на вашем сервере.

#### 1. Создать файл на сервере

**URL:** `https://taxion.fusioninsight.cloud/.well-known/apple-app-site-association`

**Содержимое для Production:**
```json
{
  "webcredentials": {
    "apps": [ "QNVQ55232N.com.dellesert.tachyon-messenger" ]
  }
}
```

**Содержимое для Development:**
```json
{
  "webcredentials": {
    "apps": [
      "QNVQ55232N.com.dellesert.tachyon-messenger",
      "QNVQ55232N.com.dellesert.tachyon-messenger.dev"
    ]
  }
}
```

#### 2. Настроить сервер

Файл должен:
- Быть доступен по HTTPS
- Отдаваться с заголовком `Content-Type: application/json`
- Быть без расширения `.json` (только `apple-app-site-association`)
- Находиться в директории `.well-known/`

#### 3. Проверить файл

Откройте в браузере:
```
https://taxion.fusioninsight.cloud/.well-known/apple-app-site-association
```

Должен отобразиться JSON с вашими app IDs.

#### 4. Проверить в Apple CDN (опционально)

Apple кэширует файл на своих серверах. Проверить можно здесь:
```
https://app-site-association.cdn-apple.com/a/v1/taxion.fusioninsight.cloud
```

**Примечание:** Apple обновляет кэш автоматически, но это может занять до 24 часов.

---

## Структура файлов

```
TaxionReact/
├── version.json                  # Единый источник версии для всех платформ
├── GoogleService-Info.plist      # Production Firebase config
├── GoogleService-Info-Dev.plist  # Development Firebase config
├── scripts/
│   ├── sync-ios-version.js       # Синхронизация version.json → Info.plist
│   └── bump-version.js           # Увеличение версии/buildNumber
├── plugins/
│   ├── withDevEnvironment.js     # Переключение окружений (Bundle ID, иконка, GoogleService)
│   ├── withPodfileModifications.js  # Firebase modular headers
│   ├── withPushNotificationDelegates.js  # Push notifications + FCM delegates
│   ├── withExportOptions.js      # Генерация ExportOptions plist файлов
│   ├── withShareExtensionDisplayName.js  # Кириллическое имя Share Extension
│   ├── withShareExtensionConfig.js  # DEVELOPMENT_TEAM для Share Extension
│   └── withCustomShareViewController.js  # Кастомный ShareViewController с чат-пикером
├── modules/
│   └── share-data/               # Expo Module для синхронизации данных в App Group
│       ├── package.json           # Обязателен для Expo autolinking
│       ├── expo-module.config.json
│       ├── index.ts
│       ├── src/ShareDataModule.ts  # TypeScript обёртка
│       └── ios/
│           ├── ShareData.podspec   # Обязателен для CocoaPods
│           └── ShareDataModule.swift  # Нативный модуль (запись в UserDefaults)
├── templates/
│   └── ShareViewController.swift  # Шаблон кастомного Share Extension (чат-пикер + API клиент)
├── ios/
│   ├── Dev/                      # Dev проект (после prebuild с APP_ENV=development)
│   │   ├── AppDelegate.swift     # ✅ Автоматически настраивается через plugins
│   │   └── Dev.entitlements      # ✅ Associated Domains из app.json
│   ├── Tahion/                   # Production проект (после prebuild с APP_ENV=production)
│   │   ├── AppDelegate.swift     # ✅ Автоматически настраивается через plugins
│   │   └── Tahion.entitlements   # ✅ Associated Domains из app.json
│   ├── ShareExtension/            # Share Extension (после prebuild)
│   │   ├── ShareViewController.swift  # ✅ Кастомный чат-пикер (из templates/)
│   │   ├── ShareExtension-Info.plist  # ✅ Генерируется expo-share-intent
│   │   └── ShareExtension.entitlements  # ✅ App Group entitlement
│   └── build/
│       ├── ExportOptions.plist          # ✅ Генерируется автоматически
│       ├── ExportOptions-AppStore.plist # ✅ Генерируется автоматически
│       ├── Dev.xcarchive
│       ├── Tahion.xcarchive
│       ├── ipa-dev/
│       └── ipa-release/
```
