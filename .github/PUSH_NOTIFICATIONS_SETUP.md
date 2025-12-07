# Push Notifications Setup для iOS

Полная инструкция по настройке push-уведомлений для iOS приложения Тахион.

## Архитектура Push-уведомлений

### Общая схема (Firebase Cloud Messaging)

Ваше приложение использует **Firebase Cloud Messaging (FCM)** для отправки push-уведомлений на все платформы:

```
┌─────────────┐     Device Token      ┌──────────────┐     FCM Token       ┌─────────────┐
│ iOS Client  │ ──────────────────>  │  Backend     │ ──────────────────> │   Firebase  │
│ (Expo)      │                       │  (Go + FCM)  │                     │     FCM     │
└─────────────┘                       └──────────────┘                     └─────────────┘
      │                                       │                                    │
      │                                       │                                    │
      └───── APNs Token ──────────────────────┴──── Converts to APNs ────────────┘
```

### Как это работает:

1. **iOS приложение** запрашивает разрешение через `expo-notifications`
2. iOS генерирует **APNs Device Token**
3. Токен отправляется на **бэкенд** через API `/devices`
4. Бэкенд использует **Firebase Admin SDK** для отправки
5. **FCM автоматически конвертирует** сообщения в формат APNs
6. **APNs доставляет** уведомление на устройство

### Преимущества FCM:

- ✅ Единый API для всех платформ (iOS, Android, Web)
- ✅ Автоматическая конвертация в платформенные форматы
- ✅ Не нужно управлять отдельными APNs сертификатами
- ✅ Встроенная аналитика и мониторинг
- ✅ Поддержка топиков и групповых рассылок

### Что нужно настроить:

**На стороне iOS:**
- ✅ Push Notifications capability в App IDs
- ✅ Правильные entitlements (development/production)
- ✅ APNs Authentication Key загружен в Firebase

**На стороне Firebase:**
- ✅ Проект Firebase создан
- ✅ APNs Authentication Key загружен в Firebase Console
- ✅ Service Account JSON для бэкенда

## Требования

- Apple Developer Account ($99/год)
- Firebase проект (бесплатный план подходит)
- Доступ к Apple Developer Portal
- APNs Authentication Key (рекомендуется)

## Шаг 1: Создание App IDs с Push Notifications

### 1.1 Development App ID

1. Перейдите на [Apple Developer → Identifiers](https://developer.apple.com/account/resources/identifiers/list)
2. Найдите существующий `com.dellesert.tachyon-messenger` или создайте новый (**+** → **App IDs** → **App**)
3. Заполните (если создаёте новый):
   - **Description**: Tahion Messenger Dev
   - **Bundle ID**: Explicit → `com.dellesert.tachyon-messenger`
4. **ВАЖНО:** Включите capabilities:
   - ✅ **Push Notifications** ← ОБЯЗАТЕЛЬНО!
   - ✅ **Associated Domains** (для Passkeys)
5. Нажмите **Save** или **Continue** → **Register**

### 1.2 Production App ID

1. Создайте или обновите `com.dellesert.tachyon-messenger.release`:
   - **Description**: Tahion Messenger Prod
   - **Bundle ID**: `com.dellesert.tachyon-messenger.release`
   - ✅ **Push Notifications** ← ОБЯЗАТЕЛЬНО!
   - ✅ **Associated Domains**
2. Нажмите **Save** или **Continue** → **Register**

## Шаг 2: Создание APNs Authentication Key для Firebase

**Рекомендуется использовать APNs Authentication Key (не сертификаты!)**

### 2.1 Создание ключа в Apple Developer

1. Перейдите на [Apple Developer → Keys](https://developer.apple.com/account/resources/authkeys/list)
2. Нажмите **+**
3. Введите имя: `Tahion APNs Key`
4. Включите **Apple Push Notifications service (APNs)**
5. Нажмите **Continue** → **Register**
6. **СКАЧАЙТЕ .p8 файл** (можно скачать только один раз!)
7. **Сохраните Key ID** (например: `ABCD1234EF`)
8. **Сохраните Team ID** (например: `QNVQ55232N`)

⚠️ **ВАЖНО:** Файл .p8 можно скачать только один раз! Сохраните его в надёжном месте.

### 2.2 Загрузка ключа в Firebase Console

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите проект **taxion-476e8** (или ваш проект)
3. Перейдите в **Project Settings** (⚙️ в левом верхнем углу)
4. Откройте вкладку **Cloud Messaging**
5. Прокрутите вниз до **Apple app configuration**
6. Нажмите **Upload** в секции **APNs Authentication Key**
7. Загрузите скачанный .p8 файл
8. Введите:
   - **Key ID**: `ABCD1234EF` (ваш Key ID)
   - **Team ID**: `QNVQ55232N`
9. Нажмите **Upload**

✅ Теперь Firebase может отправлять push-уведомления на iOS через APNs!

## Шаг 3: Обновление Provisioning Profiles

После добавления Push Notifications capability, **обязательно пересоздайте** provisioning profiles.

### 3.1 Development Profile

1. [Apple Developer → Profiles](https://developer.apple.com/account/resources/profiles/list)
2. Найдите существующий профиль или создайте новый (**+** → **iOS App Development**)
3. Выберите App ID: `com.dellesert.tachyon-messenger`
4. Выберите сертификат **Apple Development**
5. Выберите тестовые устройства
6. Назовите: `Tahion Development`
7. Нажмите **Generate** и скачайте `.mobileprovision`

### 3.2 Production Profile

1. Создайте новый профиль (**+** → **Ad Hoc** для тестирования или **App Store** для релиза)
2. Выберите App ID: `com.dellesert.tachyon-messenger.release`
3. Выберите сертификат **Apple Distribution**
4. Для Ad Hoc - выберите устройства
5. Назовите: `Tahion Production`
6. Нажмите **Generate** и скачайте

### 3.3 Проверка профилей

Убедитесь что профили содержат Push Notifications entitlement:

**На Windows (PowerShell):**
```powershell
# Сохраните профиль как текст и найдите aps-environment
Get-Content "D:\Загрузки\profile.mobileprovision" | Select-String -Pattern "aps-environment" -Context 0,2
```

**На Mac:**
```bash
security cms -D -i ~/Downloads/profile.mobileprovision | grep -A 2 aps-environment
```

Должно быть:
```xml
<key>aps-environment</key>
<string>development</string>  <!-- или production -->
```

## Шаг 4: Конвертация профилей в Base64

### На Windows (PowerShell):
```powershell
# Development profile
[Convert]::ToBase64String([IO.File]::ReadAllBytes("D:\Загрузки\Taxion_Dev_Client.mobileprovision"))

# Production profile
[Convert]::ToBase64String([IO.File]::ReadAllBytes("D:\Загрузки\Taxion_Production.mobileprovision"))
```

### На macOS:
```bash
# Development profile
base64 -i ~/Downloads/Taxion_Dev_Client.mobileprovision | pbcopy

# Production profile
base64 -i ~/Downloads/Taxion_Production.mobileprovision | pbcopy
```

## Шаг 5: Обновление GitHub Secrets

Добавьте/обновите в **Settings → Secrets and variables → Actions**:

| Secret Name | Значение |
|------------|----------|
| `IOS_DEV_PROVISIONING_PROFILE_BASE64` | Base64 development профиля с Push capability |
| `IOS_PROD_PROVISIONING_PROFILE_BASE64` | Base64 production профиля с Push capability |

Остальные секреты должны остаться без изменений:
- `IOS_CERTIFICATE_BASE64`
- `IOS_CERTIFICATE_PASSWORD`
- `APPLE_TEAM_ID`
- `KEYCHAIN_PASSWORD`

## Шаг 6: Проверка настроек бэкенда

### 6.1 Проверьте Firebase Service Account

На бэкенде должен быть файл `credentials/firebase-credentials.json`:

```bash
# Проверьте наличие
ls D:\Documents\GitHub\TaxionBack\credentials\firebase-credentials.json
```

Этот файл содержит service account для Firebase Admin SDK.

### 6.2 Environment Variables

Убедитесь что в `.env` бэкенда (или в docker-compose) установлены:

```env
# FCM Configuration
FCM_ENABLED=true
FCM_CREDENTIALS_FILE=./credentials/firebase-credentials.json
FCM_PROJECT_ID=taxion-476e8
```

### 6.3 Как работает бэкенд

Ваш бэкенд уже правильно настроен! Он:

1. **Инициализирует FCM** при старте (`services/notification/main.go:119-136`)
2. **Принимает device tokens** через `/devices` API
3. **Отправляет push** используя `FCMProvider.SendPush()`
4. **Автоматически конфигурирует APNs** настройки (`fcm_provider.go:349-394`):
   - Priority (high/normal)
   - Sound
   - Badge count
   - Content-available для silent push
   - Category и Thread ID

## Шаг 7: Проверка entitlements в проекте

### Убедитесь что созданы правильные файлы:

**ios/Tahion/Tahion-Dev.entitlements:**
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

**ios/Tahion/Tahion-Prod.entitlements:**
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

### Проверьте Xcode project settings:

Файл `ios/Tahion.xcodeproj/project.pbxproj` должен содержать:
- Debug configuration → `CODE_SIGN_ENTITLEMENTS = Tahion/Tahion-Dev.entitlements`
- Release configuration → `CODE_SIGN_ENTITLEMENTS = Tahion/Tahion-Prod.entitlements`

✅ Это уже настроено в вашем проекте!

## Шаг 8: Тестирование

### 8.1 Запустите Dev Client сборку

```bash
# В GitHub Actions
Actions → Build iOS Dev Client → Run workflow
```

### 8.2 Установите на устройство

После сборки скачайте IPA и установите на тестовое устройство.

### 8.3 Получите device token

1. Запустите приложение
2. Разрешите push-уведомления
3. Залогиньтесь
4. Проверьте логи - должен быть токен:

```javascript
[Push] Device Push Token: <длинная строка>
```

### 8.4 Отправьте тестовое уведомление

Используйте Firebase Console или бэкенд API:

**Через Firebase Console:**
1. Firebase Console → Cloud Messaging
2. Send your first message
3. Notification text: "Test"
4. Send test message
5. Вставьте FCM Registration token

**Через бэкенд API:**
```bash
curl -X POST https://taxion.fusioninsight.cloud/api/v1/notifications/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Push",
    "body": "Push notifications работают!",
    "user_id": YOUR_USER_ID
  }'
```

### 8.5 Проверьте что уведомление пришло

- Если приложение **в фоне** - баннер должен появиться
- Если приложение **открыто** - уведомление в app
- Проверьте **звук** и **badge**

## Troubleshooting

### "No valid 'aps-environment' entitlement"

**Причина:** Provisioning profile не содержит Push Notifications capability

**Решение:**
1. Убедитесь что App ID включает Push Notifications
2. Пересоздайте provisioning profile (Edit → Generate)
3. Скачайте НОВЫЙ профиль
4. Конвертируйте в Base64 и обновите GitHub Secret

### Push не приходят на iOS

**Проверьте:**

1. **APNs ключ загружен в Firebase:**
   - Firebase Console → Project Settings → Cloud Messaging → APNs Authentication Key

2. **Правильный environment:**
   - Dev build должен использовать `aps-environment: development`
   - Prod build должен использовать `aps-environment: production`

3. **Разрешения в приложении:**
   - Settings → Tahion → Notifications → Allow Notifications

4. **Токен зарегистрирован:**
   - Проверьте в БД таблицу `device_tokens`
   - Токен должен быть актуальным

5. **Логи бэкенда:**
   ```bash
   # Проверьте логи notification service
   docker logs taxion-notification
   ```

   Должно быть:
   ```
   INFO FCM push notification sent successfully
   ```

### "InvalidRegistration" или "Unregistered" ошибка

**Причины:**
- Токен получен от другого Bundle ID
- Токен получен в другом окружении (dev vs prod)
- Пользователь удалил приложение
- Токен устарел

**Решение:**
- Всегда обновляйте токен при каждом запуске приложения
- Бэкенд должен удалять невалидные токены из БД
- Проверьте что Bundle ID совпадает

### "MismatchSenderId" ошибка

**Причина:** FCM project ID не совпадает с проектом в firebase-credentials.json

**Решение:**
- Проверьте `FCM_PROJECT_ID` в .env бэкенда
- Должно быть `taxion-476e8`

### Push приходят на Android, но не на iOS

**Причина:** APNs ключ не загружен или неправильный в Firebase

**Решение:**
1. Firebase Console → Cloud Messaging
2. Проверьте **APNs Authentication Key**
3. Убедитесь что Team ID правильный (`QNVQ55232N`)
4. Перезагрузите ключ если нужно

## Полезные ссылки

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Admin SDK для Go](https://firebase.google.com/docs/admin/setup)
- [Apple Push Notifications](https://developer.apple.com/documentation/usernotifications)
- [Expo Notifications](https://docs.expo.dev/push-notifications/overview/)
- [APNs через FCM](https://firebase.google.com/docs/cloud-messaging/ios/certs)

## Важные замечания

1. **Используйте FCM** - это уже настроено на бэкенде и работает отлично
2. **APNs Authentication Key** лучше чем сертификаты - не истекает, работает для всех App IDs
3. **Разные entitlements** для dev/prod обеспечивают правильную доставку
4. **Обновляйте токены** при каждом запуске приложения - они могут меняться
5. **Firebase Console** предоставляет аналитику и статистику доставки
6. **Бэкенд логи** помогают отладить проблемы с отправкой

## Проверочный список перед запуском в production

- [ ] APNs Authentication Key загружен в Firebase Console
- [ ] Push Notifications включен в обоих App IDs
- [ ] Provisioning profiles пересозданы с Push capability
- [ ] GitHub Secrets обновлены с новыми профилями
- [ ] Entitlements файлы правильные (dev/prod)
- [ ] Тестовые push проходят на dev build
- [ ] Associated Domains настроен для Passkeys
- [ ] apple-app-site-association файл доступен на домене
- [ ] FCM credentials актуальны на бэкенде
- [ ] Логи показывают успешную отправку
