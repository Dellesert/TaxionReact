# Сборка Android APK

## Требования

- macOS / Linux / Windows
- Node.js 18+
- Java JDK 17+
- Android SDK с NDK 27.1.12297006
- Установленные зависимости проекта (`npm install`)

## Окружения сборки

Проект поддерживает два окружения:

| Окружение | Название приложения | Bundle ID | Иконка |
|-----------|---------------------|-----------|--------|
| Development (по умолчанию) | Тахион Dev | com.dellesert.tachyon-messenger.dev | icon-dev.png |
| Production | Тахион | com.dellesert.tachyon-messenger | icon.png |

Окружение определяется переменной `APP_ENV`. Если не задана — используется Development.

## Сборка Release APK

### Production сборка (для публикации)

```bash
# 1. Подготовка нативного кода (если изменились настройки или после npm install)
APP_ENV=production npx expo prebuild --platform android --clean

# 2. Исправление конфликта манифеста Firebase (см. ниже)

# 3. Сборка APK
cd android && APP_ENV=production ./gradlew assembleRelease
```

### Development сборка (для тестирования)

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

2. **Исправить AndroidManifest.xml** — добавить `tools:replace="android:resource"` в meta-data для Firebase notification color (см. раздел "Manifest merger failed" ниже).

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
sed -i '' 's/android:resource="@color\/notification_icon_color"\/>/android:resource="@color\/notification_icon_color" tools:replace="android:resource"\/>/' android/app/src/main/AndroidManifest.xml && \
cd android && APP_ENV=production ./gradlew assembleRelease
```

После успешной сборки APK: `android/app/build/outputs/apk/release/app-release.apk`
