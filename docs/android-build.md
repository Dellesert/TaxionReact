# Android Build Guide

## Чеклист перед сборкой

**После `expo prebuild` всё генерируется автоматически через config plugins:**
- [x] `local.properties` с путём к Android SDK — `withAndroidLocalProperties.js`
- [x] `google-services.json` копируется в `android/app/` — `withDevEnvironment.js`
- [x] `release.keystore` копируется в `android/app/` — `withAndroidKeystore.js`
- [x] AndroidManifest.xml с `tools:replace` для Firebase — `withAndroidManifestFix.js`
- [x] Release signing config в `build.gradle` — `withAndroidSigningConfig.js`
- [x] Passkey intent filters — `withAndroidPasskey.js`
- [x] Dev/Prod environment switching (package name, icon) — `withDevEnvironment.js`
- [x] Version и versionCode берутся из `version.json` — `app.config.js`

**Ручные шаги:**
- [ ] Обновить версию/сборку в `version.json` (см. раздел "Управление версиями")
- [ ] Убедиться, что SHA-256 fingerprint добавлен в Firebase Console
- [ ] Проверить наличие файла `assetlinks.json` на сервере (для Passkey)

---

## Управление версиями

Версии управляются централизованно через `version.json`:

```json
{
  "version": "1.0.1",
  "ios": {
    "buildNumber": "27"
  },
  "android": {
    "versionCode": 18
  }
}
```

### Скрипт bump-version

```bash
# Увеличить build number для обеих платформ
node scripts/bump-version.js

# Только Android versionCode
node scripts/bump-version.js --android

# Только iOS buildNumber
node scripts/bump-version.js --ios

# Установить конкретную версию
node scripts/bump-version.js --version 1.1.0

# Увеличить семантическую версию
node scripts/bump-version.js --patch   # 1.0.1 -> 1.0.2
node scripts/bump-version.js --minor   # 1.0.1 -> 1.1.0
node scripts/bump-version.js --major   # 1.0.1 -> 2.0.0

# Комбинированно: новая версия + новые сборки
node scripts/bump-version.js --minor --android --ios
```

### Как работает версионирование

1. **version.json** — единый источник правды для версий
2. **app.config.js** — читает version.json и передаёт в Expo
3. **expo-application** — приложение получает версию из нативного бинарника
4. **Экран "О приложении"** — показывает актуальную версию из нативного приложения

> **Важно:** После изменения `version.json` нужно запустить `expo prebuild` чтобы обновить нативные проекты.

---

## Требования

- Windows / macOS / Linux
- Node.js 18+
- Java JDK 17+ (рекомендуется JBR из Android Studio)
- Android SDK с NDK 27.1.12297006
- Установленные зависимости проекта (`npm install`)

## Текущая конфигурация

| Параметр | Значение | Источник |
|----------|----------|----------|
| Package name (prod) | `com.dellesert.tachyonmessenger` | `app.config.js` |
| Package name (dev) | `com.dellesert.tachyonmessenger.dev` | `withDevEnvironment.js` |
| Version | см. `version.json` | `version.json` |
| Version code | см. `version.json` | `version.json` |
| Min SDK | 24 | `app.config.js` |
| Target SDK | 36 | `app.config.js` |

## Окружения сборки

Проект поддерживает два окружения:

| Окружение | Название | Package | Иконка |
|-----------|----------|---------|--------|
| Development (по умолчанию) | Тахион Dev | `com.dellesert.tachyonmessenger.dev` | icon-dev.png |
| Production | Тахион | `com.dellesert.tachyonmessenger` | icon.png |

Окружение определяется переменной `APP_ENV`. Если не задана — используется Development.

---

## Config Plugins (автоматизация)

Все нативные настройки Android управляются через config plugins в `app.config.js`:

| Плагин | Что делает |
|--------|-----------|
| `withDevEnvironment.js` | Переключает package name, иконку, google-services.json для dev/prod |
| `withAndroidLocalProperties.js` | Генерирует `local.properties` с путём к SDK |
| `withAndroidKeystore.js` | Копирует `release.keystore` в `android/app/` |
| `withAndroidManifestFix.js` | Добавляет `tools:replace` для Firebase notification color |
| `withAndroidSigningConfig.js` | Добавляет release signing config в `build.gradle` |
| `withAndroidPasskey.js` | Добавляет intent filters для Digital Asset Links |
| `@react-native-firebase/app` | Настройка Firebase |
| `@react-native-firebase/messaging` | Настройка Firebase Messaging |
| `expo-notifications` | Настройка push-уведомлений |
| `expo-share-intent` | Share Intent для Android |

---

## Dev Client (Development)

### 1. Prebuild

```bash
# Очистить и пересоздать Android проект для dev
npx cross-env APP_ENV=development npx expo prebuild --clean --platform android
```

### 2. Собрать Debug APK

```bash
cd android && ./gradlew assembleDebug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`

### 3. Установить на устройство

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Release (Production)

### 1. Prebuild

```bash
# Windows (требуется cross-env)
npx cross-env APP_ENV=production npx expo prebuild --clean --platform android

# macOS / Linux
APP_ENV=production npx expo prebuild --clean --platform android
```

### 2. Собрать Release APK

```bash
cd android && ./gradlew assembleRelease
```

APK: `android/app/build/outputs/apk/release/app-release.apk`

### 3. Собрать AAB для Play Store

```bash
cd android && ./gradlew bundleRelease
```

AAB: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Быстрые команды

### Dev Client (одной командой) — Windows

```powershell
npx cross-env APP_ENV=development npx expo prebuild --clean --platform android && cd android && .\gradlew assembleDebug && cd ..
```

### Release APK (одной командой) — Windows

```powershell
npx cross-env APP_ENV=production npx expo prebuild --clean --platform android && cd android && .\gradlew assembleRelease && cd ..
```

### Release APK (одной командой) — macOS/Linux

```bash
APP_ENV=production npx expo prebuild --clean --platform android && \
cd android && ./gradlew assembleRelease && cd ..
```

---

## Release Keystore

### Расположение файлов

| Файл | Путь | Описание |
|------|------|----------|
| `release.keystore` | `./release.keystore` (корень проекта) | Основной keystore, копируется в android/app/ при prebuild |
| `release.keystore` | `android/app/release.keystore` | Копия, создаётся автоматически |

### Параметры keystore

| Параметр | Значение |
|----------|----------|
| Alias | `tachyon-release` |
| Store Password | `TachyonRelease2024!` |
| Key Password | `TachyonRelease2024!` |

### Переменные окружения для CI/CD

Для безопасного использования в CI/CD установите переменные окружения:

```bash
ANDROID_KEYSTORE_BASE64=<base64-encoded keystore>
ANDROID_KEYSTORE_PASSWORD=TachyonRelease2024!
ANDROID_KEY_ALIAS=tachyon-release
ANDROID_KEY_PASSWORD=TachyonRelease2024!
```

Закодировать keystore в base64:
```bash
base64 -i release.keystore -o keystore.base64
# или на Windows:
certutil -encode release.keystore keystore.base64
```

### Получить SHA-1 / SHA-256 для Firebase

```bash
# Debug keystore
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android

# Release keystore
keytool -list -v -keystore release.keystore -alias tachyon-release -storepass TachyonRelease2024!
```

**Важно:** Добавить SHA-1 и SHA-256 от release keystore в Firebase Console для работы push-уведомлений и Passkey в production.

### Создать новый release keystore (если нужен)

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias tachyon-release -keyalg RSA -keysize 2048 -validity 10000
```

---

## Passkey (WebAuthn) для Android

Для работы Passkey на Android необходимо:

### 1. Добавить SHA-256 fingerprint в Firebase/Google Cloud

```bash
keytool -list -v -keystore release.keystore -alias tachyon-release -storepass TachyonRelease2024! | grep SHA256
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

### 3. Проверить файл

```bash
curl https://taxion.fusioninsight.cloud/.well-known/assetlinks.json
```

---

## Push-уведомления (FCM)

### Добавить SHA-1 в Firebase

1. Получить SHA-1 (см. раздел Keystore)
2. Firebase Console → Project Settings → Your Android app → Add fingerprint
3. Скачать обновлённый `google-services.json`
4. Заменить файл в корне проекта

---

## Возможные проблемы и решения

### 1. Filename longer than 260 characters (Windows)

**Ошибка:**
```
ninja: error: Stat(...): Filename longer than 260 characters
```

**Причина:** Windows имеет ограничение на длину пути 260 символов. CMake/Ninja/NDK не поддерживают длинные пути даже если включён `LongPathsEnabled` в реестре.

**Решение: Скопировать проект в короткий путь (единственный надёжный способ)**

> ⚠️ **Важно:** Настройки реестра `LongPathsEnabled` и Group Policy **НЕ помогают** — CMake/Ninja/NDK имеют внутренние ограничения на длину пути.

```powershell
# Копировать весь проект в C:\T (включая .env файлы!)
xcopy /E /I /Y /H D:\Documents\GitHub\TaxionReact C:\T

# Собрать из короткого пути
cd C:\T\android
.\gradlew clean
.\gradlew assembleRelease

# APK создан в: C:\T\android\app\build\outputs\apk\release\app-release.apk

# Скопировать APK обратно
copy C:\T\android\app\build\outputs\apk\release\app-release.apk D:\Documents\GitHub\TaxionReact\
```

> ⚠️ **Важно:** Флаг `/H` копирует скрытые файлы (`.env`). Без него env переменные не попадут в сборку!

**Быстрая пересборка (без копирования node_modules заново):**
```powershell
# Если проект уже в C:\T, просто обновите изменённые файлы:
robocopy D:\Documents\GitHub\TaxionReact\src C:\T\src /E /XO
cd C:\T\android && .\gradlew assembleRelease
```

### 2. SDK location not found

**Ошибка:**
```
SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable
```

**Решение:**
Установить переменную окружения ANDROID_HOME:
```powershell
# Windows (PowerShell)
$env:ANDROID_HOME = "C:\Users\user\AppData\Local\Android\Sdk"

# Windows (CMD)
set ANDROID_HOME=C:\Users\user\AppData\Local\Android\Sdk
```

Или плагин `withAndroidLocalProperties.js` автоматически определит путь, если SDK установлен в стандартное расположение.

### 3. APP_ENV не применяется на Windows

**Решение:**
Использовать `cross-env`:
```bash
npx cross-env APP_ENV=production npx expo prebuild --platform android --clean
```

### 4. release.keystore не найден

**Ошибка:**
```
⚠️ [Android] release.keystore not found
```

**Решение:**
Поместить `release.keystore` в корень проекта. Плагин `withAndroidKeystore.js` автоматически скопирует его в `android/app/`.

### 5. Manifest merger failed (notification_color)

Эта проблема решается автоматически плагином `withAndroidManifestFix.js`.

Если всё ещё возникает ошибка, проверьте что плагин добавлен в `app.config.js`.

### 6. Java version mismatch

**Ошибка:**
```
Unsupported class file major version
```

**Решение:**
Установить правильную версию Java в `android/gradle.properties`:
```properties
org.gradle.java.home=C:\\Program Files\\Android\\Android Studio\\jbr
```

---

## Очистка кэша сборки

```bash
cd android
./gradlew clean
rm -rf .gradle build app/build app/.cxx
```

---

## Структура файлов

```
TaxionReact/
├── version.json                  # ✅ Версии приложения (iOS buildNumber, Android versionCode)
├── app.config.js                 # ✅ Динамическая конфигурация Expo (читает version.json)
├── google-services.json          # Firebase config (копируется в android/app/)
├── release.keystore              # Release keystore (копируется в android/app/)
├── scripts/
│   └── bump-version.js           # Скрипт для обновления версий
├── plugins/
│   ├── withDevEnvironment.js     # Переключение окружений (package, icon, google-services)
│   ├── withAndroidLocalProperties.js  # Генерация local.properties
│   ├── withAndroidKeystore.js    # Копирование release.keystore
│   ├── withAndroidManifestFix.js # Исправление AndroidManifest.xml
│   ├── withAndroidSigningConfig.js   # Настройка release signing
│   └── withAndroidPasskey.js     # Intent filters для Passkey
├── android/
│   ├── local.properties          # ✅ Генерируется автоматически
│   ├── gradle.properties         # Настройки Gradle
│   └── app/
│       ├── release.keystore      # ✅ Копируется автоматически
│       ├── google-services.json  # ✅ Копируется автоматически
│       ├── build.gradle          # ✅ Signing config добавляется автоматически
│       └── src/main/
│           └── AndroidManifest.xml  # ✅ tools:replace добавляется автоматически
```

---

## История версий

| Версия | Code | Дата | Изменения |
|--------|------|------|-----------|
| 1.0.1 | 18 | 2025-02-17 | Автоматизация сборки через config plugins |
| 1.0.1 | 17 | 2025-02-12 | Release keystore, исправлены проблемы сборки Windows |
| 1.0.1 | 16 | - | Предыдущая сборка |
