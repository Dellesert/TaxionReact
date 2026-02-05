# Сборка Android APK

## Требования

- macOS / Linux / Windows
- Node.js 18+
- Java JDK 17+
- Android SDK с NDK 27.1.12297006
- Установленные зависимости проекта (`npm install`)

## Текущая конфигурация

| Параметр | Значение |
|----------|----------|
| Package name | `com.dellesert.tachyonmessenger` |
| Version | 1.0.1 |
| Version code | 16 |
| Min SDK | 24 |
| Target SDK | 36 |

## Окружения сборки

Проект поддерживает два окружения:

| Окружение | Название приложения | Bundle ID | Иконка |
|-----------|---------------------|-----------|--------|
| Development (по умолчанию) | Тахион Dev | com.dellesert.tachyon-messenger.dev | icon-dev.png |
| Production | Тахион | com.dellesert.tachyonmessenger | icon.png |

Окружение определяется переменной `APP_ENV`. Если не задана — используется Development.

## Сборка Dev Client APK (для разработки)

Dev Client — это специальная сборка приложения с встроенным Expo dev tools, которая позволяет:
- Подключаться к локальному Expo dev server
- Использовать hot reload и fast refresh
- Отлаживать приложение на физическом устройстве

### Локальная сборка Dev Client

```bash
# 1. Подготовка нативного кода
npx expo prebuild --platform android --clean

# 2. Создать local.properties
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties

# 3. Скопировать google-services.json
cp google-services.json android/app/google-services.json

# 4. Сборка debug APK
cd android && ./gradlew assembleDebug
```

APK будет находиться в:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Использование Dev Client

1. Установить APK на устройство:
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

2. Запустить Expo dev server:
   ```bash
   npm start
   ```

3. Открыть приложение "Тахион Dev" на устройстве — оно автоматически подключится к dev server в локальной сети

### Быстрая команда для полной dev сборки

```bash
npx expo prebuild --platform android --clean && \
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties && \
cp google-services.json android/app/google-services.json && \
cd android && ./gradlew assembleDebug
```

---

## Сборка Release APK

### Production сборка (для публикации)

```bash
# 1. Подготовка нативного кода (если изменились настройки или после npm install)
APP_ENV=production npx expo prebuild --platform android --clean

# 2. Создать local.properties (если отсутствует)
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties

# 3. Скопировать google-services.json
cp google-services.json android/app/google-services.json

# 4. Исправить конфликт манифеста Firebase (см. ниже)

# 5. Сборка APK
cd android && APP_ENV=production ./gradlew assembleRelease
```

### Development Release сборка (для тестирования без dev server)

```bash
cd android && ./gradlew assembleRelease
```

APK будет находиться в:
```
android/app/build/outputs/apk/release/app-release.apk
```

## Важно: после expo prebuild

После каждого запуска `expo prebuild --clean` необходимо:

1. **Создать local.properties** (если отсутствует):
```bash
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
```

2. **Скопировать google-services.json**:
```bash
cp google-services.json android/app/google-services.json
```

3. **Исправить AndroidManifest.xml** — добавить `tools:replace="android:resource"` в meta-data для Firebase notification color:

В файле `android/app/src/main/AndroidManifest.xml` найти строку:
```xml
<meta-data android:name="com.google.firebase.messaging.default_notification_color" android:resource="@color/notification_icon_color"/>
```

И заменить на:
```xml
<meta-data android:name="com.google.firebase.messaging.default_notification_color" android:resource="@color/notification_icon_color" tools:replace="android:resource"/>
```

## Push-уведомления (FCM)

Для работы push-уведомлений на Android необходимо:

1. **Добавить SHA-1 fingerprint в Firebase Console**

   Получить SHA-1 текущего keystore:
   ```bash
   keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android
   ```

   Текущий SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

2. **Добавить fingerprint в Firebase Console**:
   - Открыть [Firebase Console](https://console.firebase.google.com)
   - Project Settings → General → Your Android app (`com.dellesert.tachyonmessenger`)
   - Add fingerprint → вставить SHA-1

3. **Скачать обновлённый google-services.json** и поместить в корень проекта

4. **Скопировать в android/app/**:
   ```bash
   cp google-services.json android/app/google-services.json
   ```

## Возможные проблемы и решения

### 1. Ошибка Java Home (Windows путь на macOS)

**Ошибка:**
```
Value 'C:/Program Files/Android/Android Studio/jbr' given for org.gradle.java.home is invalid
```

**Решение:**
Удалите или закомментируйте строку `org.gradle.java.home` в `android/gradle.properties`

### 2. NDK source.properties отсутствует

**Ошибка:**
```
NDK at .../ndk/27.1.12297006 did not have a source.properties file
```

**Решение:**
Переустановите NDK:
```bash
# Удалите поврежденный NDK
rm -rf ~/Library/Android/sdk/ndk/27.1.12297006

# Скачайте и установите заново
# macOS:
curl -O https://dl.google.com/android/repository/android-ndk-r27c-darwin.zip
unzip android-ndk-r27c-darwin.zip
mv android-ndk-r27c ~/Library/Android/sdk/ndk/27.1.12297006
```

### 3. Manifest merger failed (notification_color конфликт)

**Ошибка:**
```
Attribute meta-data#com.google.firebase.messaging.default_notification_color@resource value=(@color/notification_icon_color) is also present at [:react-native-firebase_messaging]
```

**Решение:**
В `android/app/src/main/AndroidManifest.xml` добавьте `tools:replace="android:resource"`:
```xml
<meta-data
    android:name="com.google.firebase.messaging.default_notification_color"
    android:resource="@color/notification_icon_color"
    tools:replace="android:resource"/>
```

### 4. SDK location not found

**Ошибка:**
```
SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable
```

**Решение:**
```bash
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
```

### 5. Package name mismatch (push не работают)

**Симптом:** Push-уведомления работают на iOS, но не на Android.

**Причина:** Package name в `build.gradle` не совпадает с зарегистрированным в Firebase.

**Решение:**
1. Убедиться, что в `android/app/build.gradle`:
   ```groovy
   namespace 'com.dellesert.tachyonmessenger'
   defaultConfig {
       applicationId 'com.dellesert.tachyonmessenger'
   }
   ```

2. В `google-services.json` должен быть client с `package_name`: `com.dellesert.tachyonmessenger`

3. SHA-1 fingerprint должен быть добавлен в Firebase Console

## Подпись APK

Текущая конфигурация использует debug keystore для release сборки. Для публикации в Google Play необходимо:

1. Создать release keystore:
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. Добавить в `android/gradle.properties`:
```properties
MYAPP_RELEASE_STORE_FILE=release.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=*****
MYAPP_RELEASE_KEY_PASSWORD=*****
```

3. Обновить `android/app/build.gradle` секцию `signingConfigs`

## Быстрая команда для полной production сборки

```bash
# Полная пересборка с нуля
APP_ENV=production npx expo prebuild --platform android --clean && \
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties && \
cp google-services.json android/app/google-services.json && \
sed -i '' 's/android:resource="@color\/notification_icon_color"\/>/android:resource="@color\/notification_icon_color" tools:replace="android:resource"\/>/' android/app/src/main/AndroidManifest.xml && \
cd android && APP_ENV=production ./gradlew assembleRelease
```

После успешной сборки APK: `android/app/build/outputs/apk/release/app-release.apk`

## История версий

| Версия | Code | Дата | Изменения |
|--------|------|------|-----------|
| 1.0.1 | 2 | 2025-01-10 | Исправлен package name для FCM, добавлен SHA-1 |
| 1.0.1 | 739 | - | Предыдущая сборка |
