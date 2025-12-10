# Инструкция по сборке и установке iOS приложения

## ВАЖНО: Настройка Push-уведомлений для iOS

Перед сборкой приложения необходимо настроить Firebase для push-уведомлений:

### 1. Скачать GoogleService-Info.plist из Firebase Console

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите ваш проект
3. Перейдите в Project Settings (⚙️ → Project Settings)
4. Выберите iOS app или добавьте новый iOS app если его нет
5. Скачайте файл `GoogleService-Info.plist`
6. **Поместите файл в:** `ios/Tahion/GoogleService-Info.plist`

### 2. Настроить APNs ключ в Firebase Console

1. В Firebase Console → Project Settings → Cloud Messaging → iOS app
2. Загрузите APNs Authentication Key (.p8 файл) или APNs Certificate
3. Для создания APNs ключа:
   - Откройте [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
   - Create a Key → Enable "Apple Push Notifications service (APNs)"
   - Скачайте .p8 файл и загрузите в Firebase Console
   - Укажите Key ID и Team ID (Team ID: QNVQ55232N)

### 3. Обновить Entitlements для production

Если собираете production build, измените в Xcode:
- Откройте `ios/Tahion.xcworkspace` в Xcode
- Выберите target "Tahion"
- Signing & Capabilities → Push Notifications (убедитесь что включен)
- Для production build в `Tahion.entitlements` измените:
  ```xml
  <key>aps-environment</key>
  <string>production</string>  <!-- вместо development -->
  ```

### 4. Установить Firebase pods

После добавления `GoogleService-Info.plist`:
```bash
cd ios
pod install
cd ..
```

### 5. Проверка настройки

После установки приложения на устройство, проверьте логи в Xcode Console:

#### Успешная настройка (должны быть):
```
[PushIOS] registerForPushNotifications called
[PushIOS] Device.isDevice: true
[PushIOS] Existing permission status: granted
[PushIOS] Getting APNs device push token...
[PushIOS] 📱 APNs Token: 1234567890abcd...
[PushIOS] Firebase Messaging module available, getting FCM token...
[PushIOS] 📬 FCM Token: dAbC123XyZ456...
[PushIOS] ✅ Token registered successfully on backend
[AppDelegate] 📱 APNs Device Token: 1234567890abcdef...
[AppDelegate] 📬 FCM Token: dAbC123XyZ456PqR789...
[App] ✅ Push notifications registered, token: dAbC123XyZ456...
```

#### Если токены не появляются, проверьте:

1. **GoogleService-Info.plist отсутствует**
   - Симптомы:
     ```
     [PushIOS] ⚠️ Firebase Messaging not available, using APNs token
     [PushIOS] ℹ️ To use FCM tokens, ensure GoogleService-Info.plist is added
     ```
   - Решение: Скачайте из Firebase Console и поместите в `ios/Tahion/`

2. **APNs ключ не загружен в Firebase**
   - Симптомы: Токен получен, но уведомления не приходят
   - Решение: Загрузите .p8 файл в Firebase Console → Project Settings → Cloud Messaging

3. **Push Notifications capability не включен**
   - Откройте проект в Xcode
   - Target "Tahion" → Signing & Capabilities
   - Нажмите "+ Capability" → "Push Notifications"

4. **Разрешения не даны**
   - Симптомы: `[PushIOS] Push notification permission denied`
   - Решение: Удалите приложение, переустановите и разрешите уведомления

5. **Firebase pods не установлены**
   - Симптомы: Build errors или `Firebase/Messaging` not found
   - Решение:
     ```bash
     cd ios
     pod install
     cd ..
     ```

### Тестирование Push-уведомлений

#### Способ 1: Через Firebase Console (простой)

1. В Firebase Console → Cloud Messaging → Send test message
2. Введите FCM токен из логов приложения (смотрите Xcode логи: "📬 FCM Token:")
3. Заполните:
   - **Notification title**: "Test Push"
   - **Notification text**: "Hello from Firebase"
4. Нажмите "Test" и выберите устройство
5. Уведомление должно прийти на устройство

#### Способ 2: Через Backend API (рекомендуется)

```bash
# 1. Авторизуйтесь и получите токен
curl -X POST https://taxion.fusioninsight.cloud/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "yourpassword"}'

# 2. Проверьте зарегистрированные устройства
curl -X GET https://taxion.fusioninsight.cloud/api/v1/devices \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Отправьте тестовое уведомление через notification service
curl -X POST https://taxion.fusioninsight.cloud/api/v1/notifications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Push from API",
    "message": "This is a test notification",
    "type": "system",
    "priority": "high",
    "channels": ["push"]
  }'
```

---

## Быстрый старт

### Установка релизной версии на iPhone
```bash
# 1. Перейти в папку проекта
cd /Users/dellesert/Documents/GitHub/TaxionReact

# 2. Подключить iPhone к компьютеру

# 3. Запустить сборку и установку
npx expo run:ios --device --configuration Release --no-bundler
```

## Полная инструкция

### 1. Проверка подключенных устройств

Проверить, что iPhone подключен и виден системой:
```bash
xcrun devicectl list devices
```

Вывод покажет список устройств с их UDID, например:
```
iPhone (3)   iPhone-3.coredevice.local   00008030-0004089C0C01402E   connected   iPhone 11 (iPhone12,1)
```

### 2. Проверка сертификатов для подписи

Посмотреть доступные сертификаты для подписи приложения:
```bash
security find-identity -v -p codesigning
```

### 3. Сборка релизного архива (для App Store)

Создать архив приложения на рабочем столе:
```bash
xcodebuild archive \
  -workspace ios/Tahion.xcworkspace \
  -scheme Tahion \
  -configuration Release \
  -archivePath ~/Desktop/Tahion.xcarchive \
  -sdk iphoneos \
  -destination "generic/platform=iOS"
```

Архив будет сохранен в: `~/Desktop/Tahion.xcarchive`

### 4. Установка на подключенный iPhone

#### Вариант А: Через Expo CLI (рекомендуется)

**С интерактивным выбором устройства:**
```bash
npx expo run:ios --device --configuration Release --no-bundler
```

**С указанием конкретного устройства:**
```bash
# Для iPhone (3)
npx expo run:ios --device 00008030-0004089C0C01402E --configuration Release --no-bundler
```

**Debug версия (с dev-клиентом):**
```bash
npx expo run:ios --device 00008030-0004089C0C01402E --no-bundler
```

#### Вариант Б: Через xcodebuild напрямую

```bash
xcodebuild \
  -workspace ios/Tahion.xcworkspace \
  -scheme Tahion \
  -configuration Release \
  -destination 'id=00008030-0004089C0C01402E' \
  -allowProvisioningUpdates \
  build
```

### 5. Просмотр доступных схем и конфигураций

```bash
xcodebuild -workspace ios/Tahion.xcworkspace -list
```

## Решение проблем

### Очистка сборки

Если сборка не проходит или нужно начать заново:
```bash
# Очистка build директории
cd ios
rm -rf build
cd ..

# Очистка DerivedData
rm -rf ~/Library/Developer/Xcode/DerivedData/Tahion-*

# Очистка Metro bundler cache
npx react-native start --reset-cache
```

### Переустановка зависимостей CocoaPods

```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Полная очистка и переустановка

```bash
# Удалить node_modules и lock файлы
rm -rf node_modules
rm -rf package-lock.json
rm -rf yarn.lock

# Переустановить зависимости
npm install

# Переустановить pods
cd ios
rm -rf Pods
rm Podfile.lock
export LANG=en_US.UTF-8

pod install
cd ..
```

## Дополнительные команды

### Запуск Metro bundler отдельно
```bash
npx react-native start --reset-cache
```

### Просмотр логов устройства
```bash
xcrun devicectl device info logs --device 00008030-0004089C0C01402E
```

### Проверка статуса сборки
```bash
# Просмотр логов последней сборки
cat build_log.txt
cat release_install_log.txt
```

### Создание IPA файла для распространения

```bash
# 1. Создать архив
xcodebuild archive \
  -workspace ios/Tahion.xcworkspace \
  -scheme Tahion \
  -configuration Release \
  -archivePath ~/Desktop/Tahion.xcarchive \
  -sdk iphoneos

# 2. Экспортировать IPA
xcodebuild -exportArchive \
  -archivePath ~/Desktop/Tahion.xcarchive \
  -exportPath ~/Desktop/TahionIPA \
  -exportOptionsPlist ios/ExportOptions.plist
```

## Информация о проекте

- **Название проекта**: Тахион
- **Bundle ID**: com.dellesert.tachyon-messenger
- **Workspace**: ios/Tahion.xcworkspace
- **Scheme**: Tahion
- **Team ID**: QNVQ55232N

## Типичные ошибки и решения

### "Code Sign error"
Убедитесь, что:
- Сертификаты для подписи установлены
- В Xcode выбрана правильная команда разработчика (Team)
- Provisioning Profile актуален

### "Device not found"
- Проверьте подключение iPhone к компьютеру
- Разблокируйте iPhone
- Доверьтесь компьютеру на iPhone (при первом подключении)

### "Build failed"
- Очистите сборку командами из раздела "Решение проблем"
- Проверьте, что все зависимости установлены
- Убедитесь, что версия Xcode поддерживает целевую версию iOS

## Полезные ссылки

- [Expo Documentation](https://docs.expo.dev/)
- [React Native iOS Guide](https://reactnative.dev/docs/running-on-device)
- [Xcode Command Line Tools](https://developer.apple.com/xcode/)
