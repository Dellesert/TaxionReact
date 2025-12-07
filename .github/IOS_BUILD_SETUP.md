# iOS Build Setup Guide

Инструкция по настройке GitHub Actions для автоматической сборки iOS IPA.

## Требования

- Apple Developer Account (платный, $99/год)
- Доступ к Apple Developer Portal
- macOS для экспорта сертификатов

## Шаг 1: Создание сертификата подписи

### 1.1 Создать сертификат в Apple Developer Portal

1. Перейди на [Apple Developer → Certificates](https://developer.apple.com/account/resources/certificates/list)
2. Нажми **+** для создания нового сертификата
3. Выбери:
   - **Apple Development** — для Dev Client
   - **Apple Distribution** — для Production (Ad Hoc / App Store)
4. Следуй инструкциям для создания CSR и загрузки сертификата

### 1.2 Экспортировать сертификат в .p12

1. Открой **Keychain Access** на Mac
2. Найди свой сертификат в разделе **My Certificates**
3. Правый клик → **Export** → Сохрани как `.p12`
4. Установи пароль (запомни его!)

### 1.3 Конвертировать в Base64

```bash
base64 -i ~/Desktop/certificate.p12 | pbcopy
```

Содержимое скопировано в буфер обмена.

## Шаг 2: Создание Provisioning Profiles

### 2.1 Зарегистрировать App ID

1. [Apple Developer → Identifiers](https://developer.apple.com/account/resources/identifiers/list)
2. Нажми **+** → **App IDs** → **App**
3. Заполни:
   - **Description**: Tahion Messenger
   - **Bundle ID**: Explicit → `com.dellesert.tachyon-messenger`
4. Включи capabilities:
   - ✅ Push Notifications
5. Нажми **Continue** → **Register**

6. Повтори для Production bundle ID: `com.dellesert.tachyon-messenger.release`

### 2.2 Зарегистрировать устройства

1. [Apple Developer → Devices](https://developer.apple.com/account/resources/devices/list)
2. Нажми **+**
3. Введи UDID устройства

Получить UDID:
```bash
# Подключи iPhone и выполни:
xcrun xctrace list devices
```

### 2.3 Создать Provisioning Profiles

#### Development Profile:

1. [Apple Developer → Profiles](https://developer.apple.com/account/resources/profiles/list)
2. Нажми **+** → **iOS App Development**
3. Выбери App ID: `com.dellesert.tachyon-messenger`
4. Выбери сертификат Development
5. Выбери устройства
6. Назови: `Tahion Development`
7. Скачай `.mobileprovision` файл

#### Production Profile (для Release):

1. Нажми **+** → **iOS App Development** (не Ad Hoc, т.к. используем Apple Development сертификат)
2. Выбери App ID: `com.dellesert.tachyon-messenger.release`
3. Выбери сертификат **Apple Development** (тот же, что для Dev Client)
4. Выбери устройства
5. Назови: `Tahion Production`
6. Скачай `.mobileprovision` файл

> **Важно:** Оба профиля должны использовать один и тот же сертификат Apple Development!

### 2.4 Конвертировать Profiles в Base64

```bash
# Development profile:
base64 -i ~/Downloads/Tahion_Development.mobileprovision | pbcopy
# Вставь в секрет IOS_DEV_PROVISIONING_PROFILE_BASE64

Использовать PowerShell (рекомендуется для Windows)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("D:\Загрузки\Taxion_Dev_Client.mobileprovision"))

# Production profile:
base64 -i ~/Downloads/Tahion_Ad_Hoc.mobileprovision | pbcopy
# Вставь в секрет IOS_PROD_PROVISIONING_PROFILE_BASE64
```

## Шаг 3: Настройка GitHub Secrets

Перейди в репозиторий → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret Name | Описание | Как получить |
|-------------|----------|--------------|
| `IOS_CERTIFICATE_BASE64` | Сертификат подписи | `base64 -i certificate.p12 \| pbcopy` |
| `IOS_CERTIFICATE_PASSWORD` | Пароль от .p12 | Пароль, который ты установил при экспорте |
| `IOS_DEV_PROVISIONING_PROFILE_BASE64` | Development profile | `base64 -i dev.mobileprovision \| pbcopy` |
| `IOS_PROD_PROVISIONING_PROFILE_BASE64` | Ad Hoc profile | `base64 -i adhoc.mobileprovision \| pbcopy` |
| `APPLE_TEAM_ID` | Team ID | `QNVQ55232N` (найди в Apple Developer Portal) |
| `KEYCHAIN_PASSWORD` | Пароль для keychain | Любой случайный пароль, например `build123` |

## Шаг 4: Запуск сборки

1. Перейди в репозиторий → **Actions**
2. Выбери **Build iOS IPA** в списке слева
3. Нажми **Run workflow**
4. Выбери тип сборки:
   - `both` — Dev Client + Production (по умолчанию)
   - `production` — только Production
   - `development` — только Dev Client
5. Нажми **Run workflow**

## Шаг 5: Скачивание IPA

После успешной сборки:

1. Открой завершённый workflow run
2. Прокрути вниз до раздела **Artifacts**
3. Скачай:
   - `Tahion-DevClient-IPA` — для разработки
   - `Tahion-Production-IPA` — релизная версия

## Установка IPA на устройство

### Через Finder (macOS Catalina+):

1. Подключи iPhone к Mac
2. Открой Finder → выбери iPhone в боковой панели
3. Перетащи .ipa файл на окно iPhone

### Через Apple Configurator 2:

1. Установи [Apple Configurator 2](https://apps.apple.com/app/apple-configurator-2/id1037126344) из Mac App Store
2. Подключи iPhone
3. Выбери устройство → **Add** → **Apps** → выбери .ipa

### Через командную строку:

```bash
xcrun devicectl device install app --device <UDID> path/to/Tahion.ipa
```

## Troubleshooting

### "No signing certificate matching team ID"

Убедись, что:
- Сертификат не истёк
- Сертификат соответствует Team ID
- .p12 содержит приватный ключ (экспортируй из "My Certificates", не "Certificates")

### "Provisioning profile doesn't include signing certificate"

- Пересоздай provisioning profile, выбрав правильный сертификат

### "No devices registered"

- Добавь UDID устройства в Apple Developer Portal
- Обнови provisioning profile, включив новое устройство
- Обнови секрет `IOS_*_PROVISIONING_PROFILE_BASE64`

### Build timeout

- Проверь, что `macos-15` runner доступен
- Попробуй увеличить `timeout-minutes` в workflow

### "No Accounts" или "No profiles found"

Эта ошибка означает, что на CI нет provisioning profiles. Убедись что:
- Секреты `IOS_DEV_PROVISIONING_PROFILE_BASE64` и `IOS_PROD_PROVISIONING_PROFILE_BASE64` созданы
- Оба профиля используют тот же сертификат, что в `IOS_CERTIFICATE_BASE64`
- Профили созданы для правильных Bundle ID:
  - Dev: `com.dellesert.tachyon-messenger`
  - Prod: `com.dellesert.tachyon-messenger.release`

## Быстрый экспорт всех секретов

Выполни на Mac с настроенными сертификатами:

```bash
#!/bin/bash

echo "=== IOS_CERTIFICATE_BASE64 ==="
base64 -i ~/Desktop/certificate.p12

echo ""
echo "=== IOS_DEV_PROVISIONING_PROFILE_BASE64 ==="
base64 -i ~/Library/MobileDevice/Provisioning\ Profiles/dev_profile.mobileprovision

echo ""
echo "=== IOS_PROD_PROVISIONING_PROFILE_BASE64 ==="
base64 -i ~/Library/MobileDevice/Provisioning\ Profiles/prod_profile.mobileprovision

echo ""
echo "=== APPLE_TEAM_ID ==="
echo "QNVQ55232N"
```

## Ссылки

- [Apple Developer Portal](https://developer.apple.com/account)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Expo Prebuild](https://docs.expo.dev/workflow/prebuild/)
