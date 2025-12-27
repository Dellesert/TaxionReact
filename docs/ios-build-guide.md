# iOS Build Guide

## ⚠️ Чеклист перед сборкой

**Обязательно выполнить после каждого `expo prebuild`:**

- [ ] Добавить импорты в AppDelegate.swift (`FirebaseMessaging`, `UserNotifications`)
- [ ] Добавить регистрацию push notifications в `didFinishLaunchingWithOptions`
- [ ] Добавить методы делегатов для push notifications
- [ ] Добавить extension-ы `UNUserNotificationCenterDelegate` и `MessagingDelegate`
- [ ] Проверить `*.entitlements` файл (должен содержать `aps-environment` и `com.apple.developer.associated-domains`)
- [ ] Для Production: убедиться, что Associated Domains включен в Apple Developer Console
- [ ] Проверить наличие файла `apple-app-site-association` на сервере

**См. подробные инструкции в разделах 3 и "Настройка Passkey"**

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

### 3. Добавить push notifications и passkey в AppDelegate.swift

⚠️ **ВАЖНО:** После каждого prebuild необходимо вручную добавлять этот код!

#### 3.1. Добавить импорты в `ios/Dev/AppDelegate.swift`:

```swift
import FirebaseMessaging
import UserNotifications
```

#### 3.2. Добавить регистрацию в `didFinishLaunchingWithOptions` после `FirebaseApp.configure()`:

```swift
// Register for remote notifications
UNUserNotificationCenter.current().delegate = self
Messaging.messaging().delegate = self
application.registerForRemoteNotifications()
```

#### 3.3. Добавить методы для push notifications после основного класса:

```swift
// MARK: - Push Notifications

public override func application(
  _ application: UIApplication,
  didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
) {
  Messaging.messaging().apnsToken = deviceToken
}

public override func application(
  _ application: UIApplication,
  didFailToRegisterForRemoteNotificationsWithError error: Error
) {
  print("Failed to register for remote notifications: \(error.localizedDescription)")
}
```

#### 3.4. Добавить extension-ы в конец файла перед `ReactNativeDelegate`:

```swift
// MARK: - UNUserNotificationCenterDelegate

extension AppDelegate: UNUserNotificationCenterDelegate {
  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([[.banner, .sound, .badge]])
  }

  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    completionHandler()
  }
}

// MARK: - MessagingDelegate

extension AppDelegate: MessagingDelegate {
  public func messaging(
    _ messaging: Messaging,
    didReceiveRegistrationToken fcmToken: String?
  ) {
    if let fcmToken = fcmToken {
      print("FCM Token: \(fcmToken)")
    }
  }
}
```

#### 3.5. Проверить entitlements файл `ios/Dev/Dev.entitlements`:

Убедитесь, что файл содержит:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>aps-environment</key>
    <string>development</string>
    <key>com.apple.developer.associated-domains</key>
    <array>
      <string>webcredentials:taxion.fusioninsight.cloud</string>
    </array>
  </dict>
</plist>
```

**Важно:** Для passkey также необходимо настроить файл на сервере:
- URL: `https://taxion.fusioninsight.cloud/.well-known/apple-app-site-association`
- Содержимое:
```json
{
  "webcredentials": {
    "apps": [ "QNVQ55232N.com.dellesert.tachyon-messenger.dev" ]
  }
}
```

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

### 3. Добавить push notifications и passkey в AppDelegate.swift

⚠️ **ВАЖНО:** После каждого prebuild необходимо вручную добавлять этот код!

#### 3.1. Добавить импорты в `ios/Tahion/AppDelegate.swift`:

```swift
import FirebaseMessaging
import UserNotifications
```

#### 3.2. Добавить регистрацию в `didFinishLaunchingWithOptions` после `FirebaseApp.configure()`:

```swift
// Register for remote notifications
UNUserNotificationCenter.current().delegate = self
Messaging.messaging().delegate = self
application.registerForRemoteNotifications()
```

#### 3.3. Добавить методы для push notifications после основного класса:

```swift
// MARK: - Push Notifications

public override func application(
  _ application: UIApplication,
  didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
) {
  Messaging.messaging().apnsToken = deviceToken
}

public override func application(
  _ application: UIApplication,
  didFailToRegisterForRemoteNotificationsWithError error: Error
) {
  print("Failed to register for remote notifications: \(error.localizedDescription)")
}
```

#### 3.4. Добавить extension-ы в конец файла перед `ReactNativeDelegate`:

```swift
// MARK: - UNUserNotificationCenterDelegate

extension AppDelegate: UNUserNotificationCenterDelegate {
  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([[.banner, .sound, .badge]])
  }

  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    completionHandler()
  }
}

// MARK: - MessagingDelegate

extension AppDelegate: MessagingDelegate {
  public func messaging(
    _ messaging: Messaging,
    didReceiveRegistrationToken fcmToken: String?
  ) {
    if let fcmToken = fcmToken {
      print("FCM Token: \(fcmToken)")
    }
  }
}
```

#### 3.5. Проверить entitlements файл `ios/Tahion/Tahion.entitlements`:

Убедитесь, что файл содержит:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>aps-environment</key>
    <string>production</string>
    <key>com.apple.developer.associated-domains</key>
    <array>
      <string>webcredentials:taxion.fusioninsight.cloud</string>
    </array>
  </dict>
</plist>
```

#### 3.6. Проверить Associated Domains в Apple Developer Console

**Перед сборкой убедитесь:**

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

⚠️ **ВАЖНО:** Эти команды НЕ включают настройку push notifications и passkey!
После выполнения команды обязательно выполните шаги из раздела 3 (добавление кода в AppDelegate.swift и проверка entitlements).

### Dev Client (одной командой)

```bash
# Полная сборка dev client (БЕЗ push notifications и passkey)
rm -rf ios && \
APP_ENV=development npx expo prebuild --platform ios && \
cd ios && LANG=en_US.UTF-8 pod install && cd .. && \
xcodebuild -workspace ios/Dev.xcworkspace -scheme Dev -configuration Debug -sdk iphoneos \
  -archivePath ios/build/Dev.xcarchive archive \
  CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=QNVQ55232N -allowProvisioningUpdates && \
xcodebuild -exportArchive -archivePath ios/build/Dev.xcarchive \
  -exportPath ios/build/ipa-dev -exportOptionsPlist ios/build/ExportOptions.plist
```

**После выполнения команды:**
1. Откройте `ios/Dev/AppDelegate.swift`
2. Добавьте код push notifications и passkey (см. раздел 3)
3. Проверьте `ios/Dev/Dev.entitlements`
4. Пересоберите архив командой xcodebuild

### Release (одной командой)

```bash
# Полная сборка release (БЕЗ push notifications и passkey)
rm -rf ios && \
APP_ENV=production npx expo prebuild --platform ios && \
cd ios && LANG=en_US.UTF-8 pod install && cd .. && \
xcodebuild -workspace ios/Tahion.xcworkspace -scheme Tahion -configuration Release -sdk iphoneos \
  -archivePath ios/build/Tahion.xcarchive archive \
  CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=QNVQ55232N -allowProvisioningUpdates && \
xcodebuild -exportArchive -archivePath ios/build/Tahion.xcarchive \
  -exportPath ios/build/ipa-release -exportOptionsPlist ios/build/ExportOptions-AppStore.plist -allowProvisioningUpdates
```

**После выполнения команды:**
1. Откройте `ios/Tahion/AppDelegate.swift`
2. Добавьте код push notifications и passkey (см. раздел 3)
3. Проверьте `ios/Tahion/Tahion.entitlements`
4. Убедитесь, что Associated Domains включен в Apple Developer Console
5. Пересоберите архив и экспорт:
```bash
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
├── GoogleService-Info.plist      # Production Firebase config
├── GoogleService-Info-Dev.plist  # Development Firebase config
├── plugins/
│   ├── withDevEnvironment.js     # Плагин для переключения окружений
│   └── withPodfileModifications.js
├── ios/
│   ├── Dev/                      # Dev проект (после prebuild с APP_ENV=development)
│   │   ├── AppDelegate.swift     # ⚠️ Требует ручного добавления push/passkey кода
│   │   └── Dev.entitlements      # ⚠️ Проверить Associated Domains
│   ├── Tahion/                   # Production проект (после prebuild с APP_ENV=production)
│   │   ├── AppDelegate.swift     # ⚠️ Требует ручного добавления push/passkey кода
│   │   └── Tahion.entitlements   # ⚠️ Проверить Associated Domains
│   └── build/
│       ├── Dev.xcarchive
│       ├── Tahion.xcarchive
│       ├── ipa-dev/
│       └── ipa-release/
```
