# Сборка Android APK

## Требования

- macOS / Linux / Windows
- Node.js 18+
- Java JDK 17+ (рекомендуется использовать JBR из Android Studio)
- Android SDK с NDK 27.1.12297006
- Установленные зависимости проекта (`npm install`)

## Текущая конфигурация

| Параметр | Значение |
|----------|----------|
| Package name | `com.dellesert.tachyonmessenger` |
| Version | 1.0.1 |
| Version code | 18 |
| Min SDK | 24 |
| Target SDK | 36 |

## Окружения сборки

Проект поддерживает два окружения:

| Окружение | Название приложения | Bundle ID | Иконка |
|-----------|---------------------|-----------|--------|
| Development (по умолчанию) | Тахион Dev | com.dellesert.tachyon-messenger.dev | icon-dev.png |
| Production | Тахион | com.dellesert.tachyonmessenger | icon.png |

Окружение определяется переменной `APP_ENV`. Если не задана — используется Development.

---

## Быстрая сборка Release APK (Windows)

**Важно:** На Windows из-за ограничения длины путей (260 символов) сборка должна выполняться из короткого пути.

### Пошаговая инструкция

```powershell
# 1. Скопировать проект в короткий путь (один раз)
xcopy /E /I /Y D:\Documents\GitHub\TaxionReact C:\TaxR

# 2. Перейти в короткий путь
cd C:\TaxR

# 3. Production prebuild (cross-env для Windows)
npx cross-env APP_ENV=production npx expo prebuild --platform android --clean

# 4. Создать local.properties с путём к SDK
echo sdk.dir=C:\\Users\\user\\AppData\\Local\\Android\\Sdk > android\local.properties

# 5. Скопировать google-services.json
copy google-services.json android\app\google-services.json

# 6. Исправить AndroidManifest.xml (вручную или скриптом)
# Добавить tools:replace="android:resource" к Firebase notification color

# 7. Добавить release signing в build.gradle (если не добавлено)

# 8. Собрать APK
cd android && .\gradlew assembleRelease

# 9. APK готов
# C:\TaxR\android\app\build\outputs\apk\release\app-release.apk
```

---

## Конфигурация gradle.properties (Windows)

В файле `android/gradle.properties` должна быть указана Java из Android Studio:

```properties
# Путь к JBR из Android Studio (Windows)
org.gradle.java.home=C:\\Program Files\\Android\\Android Studio\\jbr
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m
```

**Важно:** Используйте двойные обратные слэши `\\` в путях на Windows.

---

## Конфигурация local.properties

Файл `android/local.properties` должен содержать путь к Android SDK:

**Windows:**
```properties
sdk.dir=C:\\Users\\user\\AppData\\Local\\Android\\Sdk
```

**macOS:**
```properties
sdk.dir=/Users/username/Library/Android/sdk
```

---

## Release Keystore (Подпись APK)

### Текущий release keystore

Файл: `android/app/release.keystore`

| Параметр | Значение |
|----------|----------|
| Alias | `tachyon-release` |
| Store Password | `TachyonRelease2024!` |
| Key Password | `TachyonRelease2024!` |

### Конфигурация в build.gradle

В `android/app/build.gradle` должен быть настроен signingConfigs:

```groovy
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
    release {
        storeFile file('release.keystore')
        storePassword 'TachyonRelease2024!'
        keyAlias 'tachyon-release'
        keyPassword 'TachyonRelease2024!'
    }
}
buildTypes {
    debug {
        signingConfig signingConfigs.debug
    }
    release {
        signingConfig signingConfigs.release
        // ... остальные настройки
    }
}
```

### Получить SHA-1 для Firebase (release keystore)

```bash
keytool -list -v -keystore android/app/release.keystore -alias tachyon-release -storepass TachyonRelease2024!
```

**Важно:** Добавить SHA-1 от release keystore в Firebase Console для работы push-уведомлений и Passkey в production.

### Создать новый release keystore (если нужен)

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias tachyon-release -keyalg RSA -keysize 2048 -validity 10000
```

---

## Passkey (WebAuthn) для Android

Для работы Passkey на Android необходимо:

### 1. Добавить SHA-256 fingerprint в Firebase/Google Cloud

Получить SHA-256:
```bash
# Debug keystore
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android | grep SHA256

# Release keystore
keytool -list -v -keystore android/app/release.keystore -alias tachyon-release -storepass TachyonRelease2024! | grep SHA256
```

### 2. Настроить Digital Asset Links

На сервере должен быть доступен файл `/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls", "delegate_permission/common.get_login_creds"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.dellesert.tachyonmessenger",
    "sha256_cert_fingerprints": [
      "SHA256_FINGERPRINT_DEBUG",
      "SHA256_FINGERPRINT_RELEASE"
    ]
  }
}]
```

### 3. Проверить связь

```bash
# Проверить Digital Asset Links
adb shell am start -a android.intent.action.VIEW -d "https://yourdomain.com/.well-known/assetlinks.json"
```

---

## Сборка Dev Client APK (для разработки)

```bash
# 1. Подготовка нативного кода
npx expo prebuild --platform android --clean

# 2. Создать local.properties
echo "sdk.dir=C:\\Users\\user\\AppData\\Local\\Android\\Sdk" > android/local.properties

# 3. Скопировать google-services.json
copy google-services.json android/app/google-services.json

# 4. Сборка debug APK
cd android && ./gradlew assembleDebug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Важно: после expo prebuild --clean

После каждого запуска `expo prebuild --clean` необходимо:

### 1. Создать local.properties

**Windows:**
```
echo sdk.dir=C:\\Users\\user\\AppData\\Local\\Android\\Sdk > android\local.properties
```

### 2. Скопировать google-services.json

```bash
copy google-services.json android\app\google-services.json
```

### 3. Исправить AndroidManifest.xml

В файле `android/app/src/main/AndroidManifest.xml` найти строку:
```xml
<meta-data android:name="com.google.firebase.messaging.default_notification_color" android:resource="@color/notification_icon_color"/>
```

И заменить на:
```xml
<meta-data android:name="com.google.firebase.messaging.default_notification_color" android:resource="@color/notification_icon_color" tools:replace="android:resource"/>
```

### 4. Добавить release signing в build.gradle

Добавить секцию `release` в `signingConfigs` и изменить `buildTypes.release.signingConfig` на `signingConfigs.release` (см. раздел Release Keystore выше).

---

## Возможные проблемы и решения

### 1. Filename longer than 260 characters (Windows)

**Ошибка:**
```
ninja: error: Stat(...): Filename longer than 260 characters
```

**Причина:** Windows имеет ограничение на длину пути 260 символов. Длинные пути в node_modules превышают лимит.

**Решение:**
1. Скопировать проект в короткий путь:
```powershell
xcopy /E /I /Y D:\Documents\GitHub\TaxionReact C:\TaxR
cd C:\TaxR
```

2. Очистить кэш и собрать заново:
```bash
cd android
rm -rf .gradle build app/build app/.cxx
./gradlew assembleRelease
```

3. После сборки скопировать APK обратно:
```powershell
copy C:\TaxR\android\app\build\outputs\apk\release\app-release.apk D:\Documents\GitHub\TaxionReact\android\app\build\outputs\apk\release\
```

### 2. Error resolving plugin 'com.facebook.react.settings'

**Ошибка:**
```
Error resolving plugin [id: 'com.facebook.react.settings']
> 25.0.1
```

**Причина:** Проблема с путём к Java или кэшем gradle.

**Решение:**
1. Убедиться, что в `gradle.properties` указан правильный путь к Java:
```properties
org.gradle.java.home=C:\\Program Files\\Android\\Android Studio\\jbr
```

2. Остановить daemon и очистить кэш:
```bash
cd android
./gradlew --stop
rm -rf .gradle
./gradlew assembleRelease
```

### 3. SDK location not found

**Ошибка:**
```
SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable
```

**Решение:**
Создать `android/local.properties` с правильным путём к SDK:

```properties
# Windows
sdk.dir=C:\\Users\\user\\AppData\\Local\\Android\\Sdk

# macOS
sdk.dir=/Users/username/Library/Android/sdk
```

### 4. APP_ENV не применяется на Windows

**Ошибка:**
Сборка показывает "DEVELOPMENT" вместо "PRODUCTION"

**Причина:** На Windows команда `APP_ENV=production` не работает напрямую.

**Решение:**
Использовать `cross-env`:
```bash
npx cross-env APP_ENV=production npx expo prebuild --platform android --clean
```

### 5. Manifest merger failed (notification_color)

**Ошибка:**
```
Attribute meta-data#com.google.firebase.messaging.default_notification_color@resource is also present at [:react-native-firebase_messaging]
```

**Решение:**
В `android/app/src/main/AndroidManifest.xml` добавить `tools:replace="android:resource"`:
```xml
<meta-data
    android:name="com.google.firebase.messaging.default_notification_color"
    android:resource="@color/notification_icon_color"
    tools:replace="android:resource"/>
```

### 6. Release APK подписан debug keystore

**Симптом:** APK собирается, но Passkey и некоторые функции не работают.

**Причина:** В `build.gradle` release использует `signingConfigs.debug`.

**Решение:**
1. Убедиться, что `release.keystore` находится в `android/app/`
2. Добавить release signing config в `build.gradle`
3. Изменить `buildTypes.release.signingConfig` на `signingConfigs.release`

---

## Push-уведомления (FCM)

### Добавить SHA-1 в Firebase

1. Получить SHA-1:
```bash
# Debug
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android

# Release
keytool -list -v -keystore android/app/release.keystore -alias tachyon-release -storepass TachyonRelease2024!
```

2. Firebase Console → Project Settings → Your Android app → Add fingerprint

3. Скачать обновлённый `google-services.json`

4. Скопировать в проект:
```bash
copy google-services.json android\app\google-services.json
```

---

## История версий

| Версия | Code | Дата | Изменения |
|--------|------|------|-----------|
| 1.0.1 | 18 | 2025-02-12 | Release keystore, исправлены проблемы сборки Windows |
| 1.0.1 | 17 | - | iOS build |
| 1.0.1 | 16 | - | Предыдущая сборка |
| 1.0.1 | 2 | 2025-01-10 | Исправлен package name для FCM, добавлен SHA-1 |
