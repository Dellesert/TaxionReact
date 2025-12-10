# Настройка Push-уведомлений для iOS

## Быстрая настройка (5 шагов)

### 1. Получить GoogleService-Info.plist из Firebase

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите ваш проект
3. ⚙️ → Project Settings → iOS app (или добавьте новый iOS app)
4. Скачайте `GoogleService-Info.plist`
5. **Поместите файл в: `ios/Tahion/GoogleService-Info.plist`**

### 2. Создать APNs Authentication Key

1. Откройте [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
2. Нажмите "+" для создания нового ключа
3. Выберите "Apple Push Notifications service (APNs)"
4. Скачайте файл `.p8` (например: `AuthKey_ABC123XYZ.p8`)
5. **Сохраните Key ID** (отображается после создания)

### 3. Загрузить APNs ключ в Firebase

1. Firebase Console → Project Settings → Cloud Messaging
2. Раздел "Apple app configuration" → iOS app
3. Нажмите "Upload" в разделе APNs Authentication Key
4. Выберите скачанный `.p8` файл
5. Введите:
   - **Key ID**: из шага 2
   - **Team ID**: `QNVQ55232N`

### 4. Установить зависимости и пересобрать

```bash
# Установить Firebase pods
cd ios
pod install
cd ..

# Пересобрать приложение
npx expo run:ios --device --configuration Release --no-bundler
```

### 5. Проверить что работает

После запуска приложения, проверьте логи в Xcode:
- ✅ `[PushIOS] 📱 APNs Token: ...`
- ✅ `[PushIOS] 📬 FCM Token: ...`
- ✅ `[AppDelegate] 📬 FCM Token: ...`

Если все токены появились - настройка завершена!

## Тестирование

### Способ 1: Firebase Console (быстрый тест)

1. Firebase Console → Cloud Messaging → "Send test message"
2. Скопируйте FCM Token из логов Xcode
3. Отправьте тестовое уведомление

### Способ 2: Backend API (реальный сценарий)

```bash
# Проверить устройства
curl -X GET https://taxion.fusioninsight.cloud/api/v1/devices \
  -H "Authorization: Bearer YOUR_TOKEN"

# Отправить уведомление
curl -X POST https://taxion.fusioninsight.cloud/api/v1/notifications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "message": "Hello!",
    "type": "system",
    "channels": ["push"]
  }'
```

## Troubleshooting

### Проблема: Токены не получаются

**Симптом:**
```
[PushIOS] ❌ Failed to register for remote notifications
```

**Решение:**
1. Проверьте что `GoogleService-Info.plist` в правильной папке
2. Проверьте что APNs ключ загружен в Firebase Console
3. Убедитесь что Pod установлен: `cd ios && pod install`
4. Проверьте capabilities в Xcode (Push Notifications должен быть включен)

### Проблема: Уведомления не приходят

**Симптом:** Токены есть, но уведомления не приходят

**Решение:**
1. Проверьте что используется правильный environment в entitlements:
   - Development: `aps-environment: development`
   - Production: `aps-environment: production`
2. Убедитесь что APNs ключ соответствует вашему App Bundle ID
3. Проверьте что разрешения на уведомления даны в Settings → Notifications

### Проблема: Firebase module not available

**Симптом:**
```
[PushIOS] ⚠️ Firebase Messaging not available, using APNs token
```

**Решение:**
Это fallback режим. Приложение работает, но использует APNs токен вместо FCM.
Чтобы использовать FCM токен:
1. Добавьте `GoogleService-Info.plist` в `ios/Tahion/`
2. Запустите `cd ios && pod install`
3. Пересоберите приложение

## Структура файлов

```
ios/
├── Podfile                          # ✅ Firebase/Messaging добавлен
├── Tahion/
│   ├── GoogleService-Info.plist     # ⚠️ НУЖНО ДОБАВИТЬ ИЗ FIREBASE
│   ├── Info.plist                   # ✅ UIBackgroundModes настроен
│   ├── Tahion.entitlements          # ✅ aps-environment: development
│   ├── AppDelegate.swift            # ✅ Firebase инициализирован
│   └── ...
```

## Важные моменты

1. **GoogleService-Info.plist обязателен** для получения FCM токенов на iOS
2. **APNs ключ** должен быть загружен в Firebase Console
3. **Bundle ID** в Firebase должен совпадать с `com.dellesert.tachyon-messenger`
4. **Environment** в entitlements должен соответствовать build (development/production)
5. **Push Notifications capability** должен быть включен в Xcode

## Полная документация

Смотрите [iOS-Build-Instructions.md](./iOS-Build-Instructions.md) для полной инструкции.

## Код изменений

### Что было добавлено:

1. **Podfile** - добавлен `pod 'Firebase/Messaging'`
2. **AppDelegate.swift** - добавлена инициализация Firebase и обработчики APNs
3. **pushNotificationIOS.service.ts** - новый сервис для iOS с поддержкой FCM
4. **pushNotification.service.ts** - обновлен для использования iOS-специфичного сервиса

### Что нужно сделать вручную:

1. ❌ **Добавить `GoogleService-Info.plist`** - скачайте из Firebase Console
2. ❌ **Загрузить APNs ключ** в Firebase Console
3. ❌ **Включить Push Notifications** capability в Xcode (если еще не включен)
4. ✅ **Установить pods** - `cd ios && pod install`
5. ✅ **Пересобрать** - `npx expo run:ios --device`

## Проверка конфигурации

Запустите checklist:

- [ ] `GoogleService-Info.plist` находится в `ios/Tahion/`
- [ ] APNs Authentication Key (.p8) загружен в Firebase Console
- [ ] Bundle ID в Firebase = `com.dellesert.tachyon-messenger`
- [ ] Push Notifications capability включен в Xcode
- [ ] Pods установлены (`cd ios && pod install`)
- [ ] Приложение пересобрано и запущено
- [ ] В логах появляются FCM токены
- [ ] Тестовое уведомление из Firebase Console приходит

Если все пункты выполнены - push-уведомления настроены правильно!
