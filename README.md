# Tachyon Messenger Mobile - Deployment Guide

Полное руководство по развертыванию мобильного приложения Tachyon Messenger (React Native + Expo).

## Содержание

- [Требования](#требования)
- [Быстрый старт](#быстрый-старт)
- [Настройка окружения](#настройка-окружения)
- [Development Build](#development-build)
- [Production Build](#production-build)
- [Деплой в App Store](#деплой-в-app-store)
- [Деплой в Google Play](#деплой-в-google-play)
- [Обновления Over-the-Air (OTA)](#обновления-over-the-air-ota)
- [Troubleshooting](#troubleshooting)
- [CI/CD](#cicd)

---

## Требования

### Для всех платформ

- **Node.js**: 18+ LTS
- **npm**: 9+
- **Expo CLI**: 6+
- **Git**: 2.30+

### Для iOS (только macOS)

- **macOS**: 12+ (Monterey или новее)
- **Xcode**: 15+
- **CocoaPods**: 1.12+
- **Apple Developer Account**: $99/год
- **Xcode Command Line Tools**

### Для Android

- **Android Studio**: 2023+
- **JDK**: 17+
- **Android SDK**: API 33+
- **Google Play Developer Account**: $25 единоразово

### Дополнительно для Production

- **Expo Account** (бесплатно)
- **EAS CLI** для облачных сборок (опционально)

---

## Быстрый старт

### 1. Клонирование репозитория

```bash
# Клонирование
git clone https://github.com/yourusername/TaxionReact.git
cd TaxionReact

# Или загрузка архива
# wget https://github.com/yourusername/TaxionReact/archive/main.zip
# unzip main.zip && cd TaxionReact-main
```

### 2. Установка зависимостей

```bash
# Установка npm пакетов
npm install

# Для iOS (только macOS)
cd ios && pod install && cd ..
```

### 3. Настройка окружения

```bash
# Копирование примера
cp .env.example .env

# Редактирование
nano .env
```

Укажите URL вашего API:

```env
# Development
API_BASE_URL=http://localhost:8080/api/v1
WS_BASE_URL=ws://localhost:8080

# Production (замените на ваш домен!)
# API_BASE_URL=https://api.yourdomain.com/api/v1
# WS_BASE_URL=wss://api.yourdomain.com
```

### 4. Запуск в режиме разработки

```bash
# Запуск Expo development server
npm start

# Или для конкретной платформы
npm run android  # Android
npm run ios      # iOS (только macOS)
```

---

## Настройка окружения

### Конфигурация API endpoints

Отредактируйте файл `src/constants/api.constants.ts`:

```typescript
/**
 * API Configuration
 */

// Определение базового URL в зависимости от окружения
const getApiBaseUrl = () => {
  // В режиме разработки используем localhost
  if (__DEV__) {
    // Для iOS симулятора
    if (Platform.OS === 'ios') {
      return 'http://localhost:8080/api/v1';
    }
    // Для Android эмулятора (используется 10.0.2.2)
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8080/api/v1';
    }
    // Для физических устройств используйте IP адрес компьютера
    // return 'http://192.168.1.100:8080/api/v1';
  }

  // Production API URL
  return 'https://api.yourdomain.com/api/v1';
};

const getWebSocketUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'ios') {
      return 'ws://localhost:8080';
    }
    if (Platform.OS === 'android') {
      return 'ws://10.0.2.2:8080';
    }
  }

  return 'wss://api.yourdomain.com';
};

export const API_BASE_URL = getApiBaseUrl();
export const WS_BASE_URL = getWebSocketUrl();
```

### Настройка app.json

Отредактируйте `app.json` для production:

```json
{
  "expo": {
    "name": "Tachyon Messenger",
    "slug": "tachyon-messenger",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "tachyon",
    "userInterfaceStyle": "automatic",

    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#E94444"
    },

    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourdomain.tachyon",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "Тахион использует камеру для отправки фото в чаты",
        "NSPhotoLibraryUsageDescription": "Тахион использует галерею для отправки изображений",
        "NSMicrophoneUsageDescription": "Тахион использует микрофон для голосовых сообщений"
      }
    },

    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#E94444"
      },
      "package": "com.yourdomain.tachyon",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "RECORD_AUDIO"
      ]
    },

    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

---

## Development Build

Development build позволяет разработчикам тестировать приложение с нативными модулями.

### Локальная сборка (Development)

#### iOS (macOS only)

```bash
# Убедитесь что CocoaPods установлен
sudo gem install cocoapods

# Установка зависимостей
cd ios && pod install && cd ..

# Сборка и запуск
npm run ios

# Или для конкретного симулятора
npx expo run:ios --device "iPhone 15 Pro"

# Для физического устройства
npx expo run:ios --device
```

#### Android

```bash
# Убедитесь что Android SDK установлен
# Установите переменные окружения:
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Запуск эмулятора (или подключите физическое устройство)
# Список доступных AVD
emulator -list-avds

# Запуск эмулятора
emulator -avd Pixel_5_API_33 &

# Сборка и запуск
npm run android

# Или напрямую через Expo
npx expo run:android
```

### Установка на физическое устройство (Development)

#### iOS (через TestFlight или Direct Install)

1. **Подключите iPhone через USB**
2. **Запустите сборку:**
   ```bash
   npx expo run:ios --device
   ```
3. **Выберите устройство из списка**

#### Android (через APK)

1. **Сборка debug APK:**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```

2. **APK будет в:** `android/app/build/outputs/apk/debug/app-debug.apk`

3. **Установка через adb:**
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

---

## Production Build

### Вариант 1: Использование EAS Build (рекомендуется)

EAS Build - это облачный сервис от Expo для сборки приложений.

#### 1. Установка EAS CLI

```bash
npm install -g eas-cli

# Вход в Expo аккаунт
eas login
```

#### 2. Настройка EAS

```bash
# Инициализация EAS
eas build:configure
```

Создастся файл `eas.json`:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true,
      "env": {
        "API_BASE_URL": "https://api.yourdomain.com/api/v1",
        "WS_BASE_URL": "wss://api.yourdomain.com"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

#### 3. Сборка для iOS

```bash
# Production build
eas build --platform ios --profile production

# Получите .ipa файл для загрузки в App Store Connect
```

#### 4. Сборка для Android

```bash
# Production build (AAB для Google Play)
eas build --platform android --profile production

# Или APK для прямой установки
eas build --platform android --profile preview
```

#### 5. Одновременная сборка для обеих платформ

```bash
eas build --platform all --profile production
```

### Вариант 2: Локальная сборка

#### iOS - Создание .ipa файла

```bash
# 1. Открыть проект в Xcode
cd ios && xed .

# 2. В Xcode:
# - Product > Archive
# - Выберите архив
# - Distribute App > App Store Connect
# - Следуйте инструкциям

# Или через командную строку:
xcodebuild -workspace ios/TachyonMessenger.xcworkspace \
  -scheme TachyonMessenger \
  -configuration Release \
  -archivePath build/TachyonMessenger.xcarchive \
  archive

# Экспорт .ipa
xcodebuild -exportArchive \
  -archivePath build/TachyonMessenger.xcarchive \
  -exportPath build \
  -exportOptionsPlist ExportOptions.plist
```

**ExportOptions.plist:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store</string>
  <key>teamID</key>
  <string>YOUR_TEAM_ID</string>
  <key>uploadBitcode</key>
  <false/>
  <key>uploadSymbols</key>
  <true/>
</dict>
</plist>
```

#### Android - Создание подписанного AAB/APK

**1. Создание keystore (первый раз):**

```bash
# Генерация keystore
keytool -genkey -v -keystore tachyon-release.keystore \
  -alias tachyon-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# ВАЖНО: Сохраните пароль в безопасном месте!
```

**2. Настройка gradle:**

Создайте `android/gradle.properties` (или добавьте):

```properties
MYAPP_RELEASE_STORE_FILE=tachyon-release.keystore
MYAPP_RELEASE_KEY_ALIAS=tachyon-key
MYAPP_RELEASE_STORE_PASSWORD=your_keystore_password
MYAPP_RELEASE_KEY_PASSWORD=your_key_password
```

**3. Редактирование `android/app/build.gradle`:**

```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}
```

**4. Сборка:**

```bash
cd android

# AAB (для Google Play Store)
./gradlew bundleRelease

# APK (для прямого распространения)
./gradlew assembleRelease

# Файлы будут в:
# AAB: android/app/build/outputs/bundle/release/app-release.aab
# APK: android/app/build/outputs/apk/release/app-release.apk
```

---

## Деплой в App Store

### Подготовка

1. **Apple Developer Account** ($99/год)
2. **App Store Connect аккаунт**
3. **Provisioning Profile и Certificate**

### Шаги

#### 1. Создание App в App Store Connect

1. Зайдите в [App Store Connect](https://appstoreconnect.apple.com)
2. **My Apps** → **+** → **New App**
3. Заполните информацию:
   - **Platform**: iOS
   - **Name**: Tachyon Messenger
   - **Primary Language**: Russian
   - **Bundle ID**: com.yourdomain.tachyon
   - **SKU**: tachyon-messenger-ios

#### 2. Подготовка метаданных

**Необходимая информация:**
- Иконка 1024x1024px
- Скриншоты для всех размеров устройств
- Описание приложения
- Ключевые слова
- URL поддержки
- Политика конфиденциальности

**Скриншоты для iOS:**
- iPhone 6.7" (1290 x 2796)
- iPhone 6.5" (1242 x 2688)
- iPhone 5.5" (1242 x 2208)
- iPad Pro 12.9" (2048 x 2732)

#### 3. Загрузка билда

**Через Xcode:**
```bash
# После создания архива в Xcode:
# Window → Organizer → Distribute App → App Store Connect
```

**Через Transporter:**
1. Скачайте [Transporter](https://apps.apple.com/us/app/transporter/id1450874784)
2. Перетащите .ipa файл
3. **Deliver**

**Через EAS Submit:**
```bash
eas submit --platform ios --profile production
```

#### 4. Отправка на Review

1. В App Store Connect выберите загруженный build
2. Заполните все обязательные поля
3. **Submit for Review**

**Среднее время ревью:** 24-48 часов

### Возможные причины отклонения

- ❌ Отсутствие политики конфиденциальности
- ❌ Краш при запуске
- ❌ Использование тестовых/фейковых данных
- ❌ Неполное описание функционала
- ❌ Проблемы с безопасностью данных

---

## Деплой в Google Play

### Подготовка

1. **Google Play Developer Account** ($25 единоразово)
2. **Подписанный AAB файл**

### Шаги

#### 1. Создание приложения в Google Play Console

1. Зайдите в [Google Play Console](https://play.google.com/console)
2. **Create app**
3. Заполните информацию:
   - **App name**: Tachyon Messenger
   - **Default language**: Russian
   - **App or Game**: App
   - **Free or Paid**: Free

#### 2. Заполнение Store Listing

**Необходимая информация:**
- Короткое описание (80 символов)
- Полное описание (4000 символов)
- Иконка 512x512px
- Feature Graphic 1024x500px
- Скриншоты (минимум 2, максимум 8)
- Категория приложения
- Email контакт
- Политика конфиденциальности URL

**Скриншоты для Android:**
- Phone: 1080 x 1920px (минимум)
- 7-inch Tablet: 1200 x 1920px
- 10-inch Tablet: 1600 x 2560px

#### 3. Настройка Content Rating

1. **Content rating** → **Start questionnaire**
2. Ответьте на вопросы о контенте
3. Получите рейтинг (обычно "Everyone" или "Teen")

#### 4. Создание Release

```bash
# Если используете EAS
eas submit --platform android --profile production

# Или вручную:
```

1. **Production** → **Create new release**
2. Загрузите AAB файл
3. **Release name**: 1.0.0 (1)
4. **Release notes**:
   ```
   Первый релиз Tachyon Messenger
   - Обмен сообщениями в реальном времени
   - Двухфакторная аутентификация (2FA)
   - Безопасная передача данных
   ```
5. **Save** → **Review release** → **Start rollout to Production**

#### 5. Фазированный релиз (опционально)

Можно сначала выпустить для ограниченной аудитории:
- 5% → 10% → 20% → 50% → 100%

### Обновления приложения

```bash
# Обновите версию в app.json
{
  "version": "1.1.0",
  "android": {
    "versionCode": 2  // Увеличивайте на 1 с каждым обновлением
  }
}

# Пересоберите
eas build --platform android --profile production

# Загрузите в новый release
eas submit --platform android --profile production
```

---

## Обновления Over-the-Air (OTA)

Expo поддерживает OTA обновления для JS кода без пересборки native бинарников.

### Настройка Expo Updates

**1. Установка:**

```bash
npx expo install expo-updates
```

**2. Конфигурация в app.json:**

```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 0,
      "url": "https://u.expo.dev/your-project-id"
    },
    "runtimeVersion": {
      "policy": "sdkVersion"
    }
  }
}
```

**3. Публикация обновления:**

```bash
# Публикация для production канала
eas update --branch production --message "Исправление бага чата"

# Для specific runtime version
eas update --branch production --runtime-version 1.0.0
```

**4. Проверка обновлений в коде:**

```typescript
import * as Updates from 'expo-updates';

// Проверка обновлений при старте
async function checkForUpdates() {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
}
```

### Ограничения OTA

**Можно обновлять:**
- ✅ JavaScript код
- ✅ React компоненты
- ✅ Стили
- ✅ Assets (изображения, шрифты)

**НЕ можно обновлять:**
- ❌ Нативный код (Java/Kotlin/Swift/Objective-C)
- ❌ Нативные зависимости
- ❌ app.json конфигурацию
- ❌ Permissions

Для таких изменений нужен новый binary build.

---

## Troubleshooting

### iOS

#### Проблема: "Command PhaseScriptExecution failed"

**Решение:**
```bash
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
```

#### Проблема: "Unable to boot simulator"

**Решение:**
```bash
# Перезапуск симулятора
killall Simulator
xcrun simctl erase all
```

#### Проблема: Provisioning Profile ошибки

**Решение:**
1. Xcode → Preferences → Accounts
2. Выберите ваш Apple ID
3. Download Manual Profiles
4. Убедитесь что Bundle ID совпадает

### Android

#### Проблема: "SDK location not found"

**Решение:**

Создайте `android/local.properties`:
```properties
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

#### Проблема: "Execution failed for task ':app:validateSigningRelease'"

**Решение:**
- Проверьте что keystore файл существует
- Проверьте пароли в gradle.properties
- Убедитесь что пути правильные

#### Проблема: Metro bundler ошибки

**Решение:**
```bash
# Очистка кэша
npx expo start -c

# Или
rm -rf node_modules
npm install
watchman watch-del-all
```

### Общие проблемы

#### Проблема: "Unable to resolve module"

**Решение:**
```bash
# Очистка и переустановка
rm -rf node_modules package-lock.json
npm install

# Перезапуск Metro
npx expo start -c
```

#### Проблема: API не подключается

**Решение:**

**Для Android эмулятора:**
- Используйте `10.0.2.2` вместо `localhost`

**Для iOS симулятора:**
- Можно использовать `localhost`

**Для физических устройств:**
- Используйте IP адрес компьютера (должны быть в одной сети)
- Проверьте файрвол

```bash
# Узнать IP адрес (macOS)
ipconfig getifaddr en0

# Использовать в коде
const API_URL = 'http://192.168.1.100:8080/api/v1';
```

---

## CI/CD

### GitHub Actions для автоматической сборки

Создайте `.github/workflows/build.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build Android
        run: eas build --platform android --profile production --non-interactive

      - name: Build iOS
        run: eas build --platform ios --profile production --non-interactive
```

### Secrets для GitHub Actions

Добавьте в репозиторий (Settings → Secrets):

```
EXPO_TOKEN=your_expo_token
ANDROID_KEYSTORE_BASE64=base64_encoded_keystore
ANDROID_KEYSTORE_PASSWORD=your_password
ANDROID_KEY_ALIAS=your_alias
ANDROID_KEY_PASSWORD=your_password
```

---

## Чек-лист перед релизом

### Перед сборкой

- [ ] Обновлена версия в `app.json` (`version` и `versionCode`/`buildNumber`)
- [ ] API_BASE_URL указывает на production сервер
- [ ] WS_BASE_URL указывает на production WebSocket
- [ ] Все иконки и splash screens на месте (icon.png, adaptive-icon.png, splash-icon.png)
- [ ] Bundle Identifier (iOS) и Package Name (Android) настроены правильно
- [ ] Проверены permissions в app.json
- [ ] Удалены все console.log и debug код
- [ ] Проверена работа на физических устройствах
- [ ] Протестирована работа 2FA
- [ ] Проверена работа WebSocket соединения
- [ ] Проверена работа загрузки файлов/изображений

### Документация

- [ ] Политика конфиденциальности опубликована
- [ ] Пользовательское соглашение готово
- [ ] Скриншоты приложения готовы
- [ ] Описание для App Store / Google Play написано
- [ ] Support URL указан

### Тестирование

- [ ] Протестирован вход/регистрация
- [ ] Протестирована 2FA
- [ ] Протестированы все основные функции
- [ ] Проверена работа на медленном интернете
- [ ] Проверена работа без интернета
- [ ] Протестировано на разных размерах экранов
- [ ] Проверена работа на iOS и Android

### Security

- [ ] SSL Pinning включен (опционально)
- [ ] Sensitive данные не логируются
- [ ] API ключи не хардкодятся
- [ ] Используется HTTPS для всех запросов
- [ ] Проверена защита от XSS/SQL injection

---

## Полезные команды

```bash
# Очистка кэша
npx expo start -c
npm start -- --reset-cache

# Очистка всего
rm -rf node_modules
rm -rf ios/Pods ios/Podfile.lock
rm -rf android/.gradle android/build android/app/build
npm install

# Проверка размера bundle
npx expo export --platform android
du -sh dist

# Анализ зависимостей
npx expo install --check
npm outdated

# Тестирование production build локально
# iOS
npx expo run:ios --configuration Release

# Android
npx expo run:android --variant release

# Логи из устройства
# iOS
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "Tachyon"'

# Android
adb logcat *:S ReactNative:V ReactNativeJS:V

# Проверка permissions
# iOS
npx pod-install
cat ios/TachyonMessenger/Info.plist | grep -A 1 "NSCamera"

# Android
cat android/app/src/main/AndroidManifest.xml | grep "uses-permission"
```

---

## Useful Links

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design Guidelines](https://material.io/design)

---

## Контакты и поддержка

- **Email**: support@yourdomain.com
- **Telegram**: @yoursupport
- **GitHub Issues**: https://github.com/yourusername/TaxionReact/issues

---

## Лицензия

Proprietary - Все права защищены

---

**Последнее обновление**: 31 октября 2025
