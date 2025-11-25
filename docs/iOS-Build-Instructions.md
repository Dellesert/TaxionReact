# Инструкция по сборке и установке iOS приложения

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
- **Team ID**: Z7R5N84Y3S

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
