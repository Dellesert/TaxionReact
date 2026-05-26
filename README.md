# Tachyon Messenger — Mobile & Desktop Client

<p align="center">
  <img src="assets/images/logo.png" alt="Tachyon Messenger" width="120" />
</p>

<p align="center">
  Корпоративный мессенджер и платформа управления командой
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react" />
  <img src="https://img.shields.io/badge/Expo-54-000020?logo=expo" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript" />
  <img src="https://img.shields.io/badge/Electron-39-47848F?logo=electron" />
  <img src="https://img.shields.io/badge/Platforms-iOS%20%7C%20Android%20%7C%20Desktop-E94444" />
</p>

---

## О проекте

**Tachyon Messenger** — кросс-платформенное корпоративное приложение для обмена сообщениями и управления рабочими процессами. Работает на iOS, Android и десктопе (Windows / macOS / Linux) из единой кодовой базы.

Часть экосистемы **Taxion** — включает также:
- [TaxionBackend](https://github.com/Dellesert/TaxionBackend) — NestJS API с WebSocket, JWT, управлением отделами
- [TaxionDashboard](https://github.com/Dellesert/TaxionDashboard) — React веб-дашборд

---

## Возможности

| Модуль | Описание |
|--------|----------|
| 💬 **Чат** | Мессенджер с тредами, отправкой файлов, видео и голосовых сообщений |
| ✅ **Задачи** | Постановка и отслеживание задач внутри команды |
| 📅 **Календарь** | Корпоративный календарь событий |
| 📊 **Дашборд** | Сводка по активности и уведомлениям |
| 🗳️ **Опросы** | Создание и прохождение опросов внутри компании |
| 🕐 **Расписания** | Управление рабочим расписанием |
| 🏖️ **Отсутствия** | Учёт отпусков и отгулов |
| 🔔 **Уведомления** | Push-уведомления через Firebase FCM |
| 🛡️ **Авторизация** | JWT + 2FA + Passkey (биометрия) |
| ⚙️ **Админка** | Управление пользователями и правами |

---

## Технологический стек

### Core
- **React Native 0.81** + **Expo SDK 54** (New Architecture, Hermes)
- **TypeScript 5.9**
- **Expo Router 6** — файловая маршрутизация
- **React 19**

### State & Data
- **Zustand 5** — глобальное состояние
- **TanStack Query 5** — серверное состояние и кэширование
- **React Hook Form + Zod** — формы и валидация
- **MMKV** — быстрое локальное хранилище

### Сеть
- **Axios** — HTTP-клиент
- **WebSocket** — real-time чат
- **Firebase (FCM)** — push-уведомления

### UI
- **React Native Reanimated 3** — анимации
- **Expo Linear Gradient, Blur** — визуальные эффекты
- **FlashList** — производительные списки
- **React Native SVG**

### Desktop (Electron)
- **Electron 39** — десктоп-обёртка
- Сборка для Windows (NSIS), macOS (DMG), Linux (AppImage/deb)

### Мониторинг & CI/CD
- **Sentry** — трекинг ошибок
- **GitHub Actions** — автоматические сборки iOS (dev/prod)
- **EAS Build** — облачные сборки Expo

---

## Архитектура

```
src/
├── api/               # Базовые API-клиенты (axios, session, user)
├── config/            # Firebase и другие конфиги
└── features/          # Feature-sliced архитектура
    ├── auth/          # Авторизация, JWT, 2FA, Passkey
    ├── chat/          # Чат, треды, файлы
    ├── tasks/         # Задачи
    ├── calendar/      # Календарь
    ├── dashboard/     # Главный экран
    ├── notifications/ # Push-уведомления
    ├── polls/         # Опросы
    ├── schedules/     # Расписание
    ├── absences/      # Отсутствия
    ├── profile/       # Профиль пользователя
    └── admin/         # Администрирование
```

Каждый feature-модуль содержит: `api/`, `components/`, `screens/`, `hooks/`, `store/`, `types/`.

---

## Быстрый старт (разработка)

### Требования

- Node.js 18+ LTS
- npm 9+
- Для iOS: macOS + Xcode 15+ + CocoaPods
- Для Android: Android Studio + JDK 17+ + Android SDK API 33+

### Установка

```bash
git clone https://github.com/Dellesert/TaxionReact.git
cd TaxionReact

npm install

# Только для iOS
cd ios && pod install && cd ..
```

### Настройка переменных окружения

```bash
cp .env.example .env
```

Отредактируйте `.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
EXPO_PUBLIC_WS_URL=ws://localhost:8080
EXPO_PUBLIC_FIREBASE_API_KEY=ваш-ключ
EXPO_PUBLIC_FIREBASE_PROJECT_ID=ваш-проект
```

> Бэкенд: [TaxionBackend](https://github.com/Dellesert/TaxionBackend) — запускается на порту `8080`

### Запуск

```bash
# Expo Dev Server
npm start

# Android
npm run android

# iOS (только macOS)
npm run ios

# Desktop (Electron)
npm run electron:dev
```

---

## Сборка и деплой

Подробное руководство по сборке для App Store, Google Play и деплою десктоп-приложения — в [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Конфигурация окружений

| Переменная | Описание |
|------------|----------|
| `EXPO_PUBLIC_API_BASE_URL` | URL REST API бэкенда |
| `EXPO_PUBLIC_WS_URL` | URL WebSocket бэкенда |
| `EXPO_PUBLIC_FIREBASE_*` | Firebase конфигурация (FCM) |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN для мониторинга |
| `ANDROID_KEYSTORE_PASSWORD` | Пароль keystore для release-сборки |

Примеры: `.env.example` (dev), `.env.production.example` (prod).

---

## Связанные репозитории

| Репозиторий | Описание |
|-------------|----------|
| [TaxionBackend](https://github.com/Dellesert/TaxionBackend) | NestJS API, WebSocket, JWT |
| [TaxionDashboard](https://github.com/Dellesert/TaxionDashboard) | React веб-дашборд |

---

## Лицензия

Proprietary — все права защищены.
