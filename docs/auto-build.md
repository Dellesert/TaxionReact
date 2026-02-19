# Auto Build Scripts

Скрипты для автоматической сборки всех платформ одной командой. Каждый скрипт автоматически увеличивает номер сборки, выполняет clean prebuild и собирает готовый артефакт.

## Быстрый старт

```bash
# Собрать всё (prod) одной командой
./scripts/build.sh all:prod

# Только iOS
./scripts/build-ios.sh prod

# Только Android
./scripts/build-android.sh prod

# Только Windows (Electron)
./scripts/build-windows.sh
```

---

## Скрипты

| Скрипт | Платформа | Артефакт |
|--------|-----------|----------|
| `scripts/build-ios.sh` | iOS | `.ipa` |
| `scripts/build-android.sh` | Android | `.apk` |
| `scripts/build-windows.sh` | Windows (Electron) | `.exe` installer |
| `scripts/build.sh` | Все платформы | Все артефакты |

---

## iOS — `build-ios.sh`

### Использование

```bash
./scripts/build-ios.sh           # интерактивный выбор
./scripts/build-ios.sh dev       # Development (Debug)
./scripts/build-ios.sh prod      # Production (Release)
```

### Что делает

| Шаг | Действие |
|-----|----------|
| 1/5 | Увеличивает `ios.buildNumber` в `version.json` |
| 2/5 | `rm -rf ios` + `expo prebuild --platform ios` |
| 3/5 | `pod install` |
| 4/5 | `xcodebuild archive` |
| 5/5 | `xcodebuild -exportArchive` → IPA |

### Параметры по окружению

| Параметр | dev | prod |
|----------|-----|------|
| APP_ENV | `development` | `production` |
| Workspace | `ios/Dev.xcworkspace` | `ios/Tahion.xcworkspace` |
| Scheme | `Dev` | `Tahion` |
| Configuration | `Debug` | `Release` |
| ExportOptions | `ExportOptions.plist` | `ExportOptions-AppStore.plist` |

### Результат

| Окружение | Путь |
|-----------|------|
| dev | `ios/build/ipa-dev/Dev.ipa` |
| prod | `ios/build/ipa-release/Tahion.ipa` |

### Требования

- macOS
- Xcode 16+
- CocoaPods
- Node.js 18+
- Apple Developer Team ID: `QNVQ55232N`

---

## Android — `build-android.sh`

### Использование

```bash
./scripts/build-android.sh           # интерактивный выбор
./scripts/build-android.sh dev       # Development (Debug APK)
./scripts/build-android.sh prod      # Production (Release APK)
```

### Что делает

| Шаг | Действие |
|-----|----------|
| 1/4 | Увеличивает `android.versionCode` в `version.json` |
| 2/4 | `rm -rf android` + `expo prebuild --platform android` |
| 3/4 | Автоматически прописывает `org.gradle.java.home` в `gradle.properties` |
| 4/4 | `./gradlew assembleDebug` или `assembleRelease` |

### Автоопределение Java

Скрипт определяет ОС через `uname` и автоматически прописывает путь к JBR из Android Studio:

| ОС | `org.gradle.java.home` |
|----|------------------------|
| macOS | `/Applications/Android Studio.app/Contents/jbr/Contents/Home` |
| Windows (Git Bash) | `C:\Program Files\Android\Android Studio\jbr` |
| Linux | `/opt/android-studio/jbr` |

Также автоматически устанавливается `JAVA_HOME` и `ANDROID_HOME`.

### Результат

| Окружение | Путь |
|-----------|------|
| dev | `android/app/build/outputs/apk/debug/app-debug.apk` |
| prod | `android/app/build/outputs/apk/release/app-release.apk` |

### Требования

- Node.js 18+
- Android Studio с JBR (JetBrains Runtime)
- Android SDK с NDK 27.1.12297006
- На Windows: Git Bash для запуска скрипта

---

## Windows — `build-windows.sh`

### Использование

```bash
./scripts/build-windows.sh
```

### Что делает

| Шаг | Действие |
|-----|----------|
| 1/2 | Увеличивает `windows.versionCode` в `version.json` |
| 2/2 | `npm run electron:build:win` (web bundle + иконки + NSIS installer) |

### Результат

```
dist-electron/Tachyon Messenger-Setup-X.X.X.exe
```

### Требования

- Node.js 18+
- Установленные зависимости (`npm install`)

---

## Общий скрипт — `build.sh`

Запускает сборки последовательно: iOS → Windows → Android. Если одна платформа падает — остальные продолжают собираться.

### Использование

```bash
# Интерактивный режим (спросит что собирать)
./scripts/build.sh

# Конкретные платформы с указанием окружения
./scripts/build.sh ios:prod windows
./scripts/build.sh ios:dev android:prod
./scripts/build.sh android:dev

# Все платформы
./scripts/build.sh all:prod
./scripts/build.sh all:dev
```

### Все аргументы

| Аргумент | Описание |
|----------|----------|
| `ios` | iOS (спросит dev/prod интерактивно) |
| `ios:dev` | iOS Development |
| `ios:prod` | iOS Production |
| `android` | Android (спросит dev/prod интерактивно) |
| `android:dev` | Android Development |
| `android:prod` | Android Production |
| `windows` или `win` | Windows (Electron) |
| `all` | Все платформы (спросит dev/prod интерактивно) |
| `all:dev` | Все платформы — Development |
| `all:prod` | Все платформы — Production |

### Порядок сборки

1. **iOS** — самая долгая (prebuild + pods + archive + export)
2. **Windows** — средняя (web bundle + electron-builder)
3. **Android** — средняя (prebuild + gradle)

### Сводка

В конце выводится сводка по всем платформам:

```
═══════════════════════════════════════════════
  ALL BUILDS COMPLETE
═══════════════════════════════════════════════
  ✓ iOS (prod)    — 12m 34s
  ✓ Windows       — 3m 21s
  ✓ Android (prod) — 8m 15s
───────────────────────────────────────────────
  Total time: 24m 10s
═══════════════════════════════════════════════
```

---

## Версионирование

Все скрипты автоматически увеличивают номер сборки перед каждой сборкой. Версии хранятся в `version.json`:

```json
{
  "version": "1.0.1",
  "ios": { "buildNumber": "34" },
  "android": { "versionCode": 33 },
  "windows": { "versionCode": 3 }
}
```

| Платформа | Поле | Скрипт инкремента |
|-----------|------|-------------------|
| iOS | `ios.buildNumber` | `node scripts/bump-version.js --ios` |
| Android | `android.versionCode` | `node scripts/bump-version.js --android` |
| Windows | `windows.versionCode` | Инлайн в `build-windows.sh` |

Для ручного управления версией:

```bash
node scripts/bump-version.js --patch     # 1.0.1 → 1.0.2
node scripts/bump-version.js --minor     # 1.0.1 → 1.1.0
node scripts/bump-version.js --major     # 1.0.1 → 2.0.0
node scripts/bump-version.js --version 2.0.0  # конкретная версия
```

---

## Структура файлов

```
scripts/
├── build.sh              # Общий скрипт (все платформы)
├── build-ios.sh          # iOS сборка
├── build-android.sh      # Android сборка
├── build-windows.sh      # Windows (Electron) сборка
└── bump-version.js       # Управление версиями
```

### Артефакты после сборки

```
ios/build/
├── ipa-dev/              # iOS Development IPA
└── ipa-release/          # iOS Production IPA

android/app/build/outputs/apk/
├── debug/app-debug.apk
└── release/app-release.apk

dist-electron/
└── Tachyon Messenger-Setup-X.X.X.exe
```

---

## Troubleshooting

### iOS: Code signing ошибки

Убедитесь что Team ID `QNVQ55232N` имеет валидные provisioning profiles. Скрипт использует `CODE_SIGN_STYLE=Automatic` и `-allowProvisioningUpdates`.

### Android: Java not found

Скрипт ожидает JBR из Android Studio по стандартному пути. Если Android Studio установлен в нестандартное место, отредактируйте `JAVA_HOME_PATH` в `build-android.sh`.

### Windows: electron-builder ошибки

Убедитесь что зависимости electron установлены:
```bash
cd electron && npm install && cd ..
```

### Скрипт не запускается

```bash
chmod +x scripts/build.sh scripts/build-ios.sh scripts/build-android.sh scripts/build-windows.sh
```
