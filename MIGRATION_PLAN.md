# 📋 План миграции к Feature-Based Architecture

## 🎯 Цель
Перейти от layer-based к feature-based архитектуре для улучшения масштабируемости и поддерживаемости проекта.

## 📊 Текущее состояние

### Статистика
- **Всего файлов**: ~364 TypeScript файлов
- **Hooks**: 66 файлов (все в `/src/hooks/`)
- **Utils**: 35 файлов (все в `/src/utils/`)
- **Components**: 82 глобальных + ~133 в screens
- **Screens**: 35 экранов

### Фичи для миграции (в порядке сложности)
1. ✅ **Auth** - 6 screens, 19 components, 9 hooks, 4 utils (ПРОСТАЯ)
2. ✅ **Notifications** - 1 screen, 4 components, 3 hooks, 2 utils (ПРОСТАЯ)
3. ✅ **Calendar** - 1 screen, 11 components, 2 hooks, 1 utils (ПРОСТАЯ)
4. ✅ **Polls** - 3 screens, 23 components, 7 hooks, 2 utils (СРЕДНЯЯ)
5. ✅ **Profile** - 7 screens, 18 components, 7 hooks, 5 utils (СРЕДНЯЯ)
6. ✅ **Tasks** - 2 screens, 30 components, 9 hooks, 2 utils (СРЕДНЯЯ)
7. ✅ **Chat** - 5 screens, 54 components, 18 hooks, 9 utils (СЛОЖНАЯ)
8. ⏸️ **Admin** - 9 screens (отложено - сначала рефакторинг)

### Что НЕ мигрируем сейчас
- ❌ `/src/components/` (глобальные компоненты - потом)
- ❌ `/src/screens/admin/` (сначала рефакторинг)
- ❌ Общие хуки (`useAuth`, `useTheme`, `useWebSocket`, `useImageLoader`)
- ❌ Общие utils (`dateHelpers`, `errorUtils`, `secureStorage`, `mockData`)

---

## 🏗️ Новая структура

```
src/
├── features/                    # 🆕 Фичи приложения
│   ├── auth/
│   │   ├── api/                # Auth API
│   │   ├── components/         # Компоненты auth screens
│   │   ├── hooks/              # Auth хуки
│   │   ├── screens/            # Auth экраны
│   │   ├── types/              # Auth типы (если есть)
│   │   └── utils/              # Auth утилиты
│   │
│   ├── calendar/
│   ├── chat/
│   ├── notifications/
│   ├── polls/
│   ├── profile/
│   └── tasks/
│
├── shared/                      # 🆕 Общий код
│   ├── api/                    # API client, interceptors
│   ├── components/             # Пока пусто (мигрируем позже)
│   ├── constants/              # Общие константы
│   ├── contexts/               # React contexts
│   ├── hooks/                  # Общие хуки
│   ├── types/                  # Общие типы
│   └── utils/                  # Общие утилиты
│
├── navigation/                  # Без изменений
├── store/                       # Без изменений
├── services/                    # Без изменений
│
├── components/                  # ⏸️ ВРЕМЕННО (мигрируем позже)
├── screens/                     # ⏸️ ВРЕМЕННО (будет удалена)
└── App.tsx
```

---

## 📝 Пошаговый план

### Phase 0: Подготовка (5 минут)
- [x] Создать план миграции
- [ ] Создать структуру папок `/features/` и `/shared/`
- [ ] Обновить `.gitignore` если нужно
- [ ] Сделать commit перед началом

### Phase 1: Auth (15-20 минут)
**Простота**: ⭐ (самая простая фича)

**Что мигрируем:**
```
Screens (6):
  src/screens/auth/*.tsx → features/auth/screens/

Components (19):
  src/screens/auth/components/* → features/auth/components/

Hooks (9):
  src/hooks/useLoginForm.ts
  src/hooks/usePasswordAuth.ts
  src/hooks/usePasskeyAuth.ts
  src/hooks/useInvitationValidation.ts
  src/hooks/useInvitationAcceptance.ts
  src/hooks/usePasswordReset.ts
  src/hooks/useResetPasswordAction.ts
  src/hooks/useTokenValidation.ts
  src/hooks/use2FA*.ts (3 файла)
  → features/auth/hooks/

Utils (4):
  src/utils/authHelpers.ts
  src/utils/invitationHelpers.ts
  src/utils/passwordResetHelpers.ts
  src/utils/twoFactorHelpers.ts
  → features/auth/utils/

API:
  src/api/auth.api.ts → features/auth/api/auth.api.ts
```

**Шаги:**
1. Создать структуру `features/auth/{screens,components,hooks,utils,api}`
2. Скопировать файлы
3. Обновить импорты внутри auth
4. Обновить импорты в других файлах (navigation, etc)
5. Тест: `npx tsc --noEmit`
6. Commit: "feat: migrate auth to features/"

### Phase 2: Notifications (10 минут)
**Простота**: ⭐ (маленькая фича)

**Что мигрируем:**
```
Screens (1):
  src/screens/notification/NotificationListScreen.tsx

Components (2):
  src/screens/notification/components/*
  + src/components/notification/* (2 файла)

Hooks (3):
  src/hooks/useNotificationListData.ts
  src/hooks/useNotificationListActions.ts
  src/hooks/useNotificationSettings.ts

Utils (2):
  src/utils/notificationHelpers.ts
  src/utils/notificationFormatters.ts

API:
  src/api/notification.api.ts
```

**Шаги:**
1. Создать `features/notifications/`
2. Переместить файлы (включая глобальные компоненты!)
3. Обновить импорты
4. Тест: `npx tsc --noEmit`
5. Commit: "feat: migrate notifications to features/"

### Phase 3: Calendar (15 минут)
**Простота**: ⭐⭐

**Что мигрируем:**
```
Screens (1):
  src/screens/calendar/CalendarScreen.tsx

Components (11):
  src/screens/calendar/components/* (5)
  + src/components/calendar/* (6)

Hooks (2):
  src/hooks/useCalendarData.ts
  src/hooks/useCalendarNavigation.ts

Utils (1):
  src/utils/calendarHelpers.ts

API:
  src/api/calendar.api.ts

Types:
  src/types/calendar.types.ts → features/calendar/types/
```

**Шаги:**
1. Создать `features/calendar/`
2. Переместить все файлы
3. Обновить импорты
4. Тест
5. Commit: "feat: migrate calendar to features/"

### Phase 4: Polls (20 минут)
**Простота**: ⭐⭐

**Что мигрируем:**
```
Screens (3):
  src/screens/poll/*.tsx

Components (23):
  src/screens/poll/components/* (16)
  + src/components/poll/* (7)

Hooks (7):
  src/hooks/usePoll*.ts (7 файлов)

Utils (2):
  src/utils/pollHelpers.ts
  src/utils/pollListHelpers.ts

API:
  src/api/poll.api.ts

Types:
  src/types/poll.types.ts
```

**Шаги:**
1. Создать `features/polls/`
2. Переместить
3. Обновить импорты
4. Тест
5. Commit: "feat: migrate polls to features/"

### Phase 5: Profile (25 минут)
**Простота**: ⭐⭐⭐ (вложенные компоненты)

**Что мигрируем:**
```
Screens (7):
  src/screens/profile/*.tsx

Components (18 с вложенностью):
  src/screens/profile/components/
    ├── about/* (6)
    ├── notification/* (3)
    └── *.tsx (9)

Hooks (7):
  src/hooks/useProfile*.ts
  src/hooks/useAbout*.ts
  src/hooks/useActiveSessions*.ts
  src/hooks/usePasskey*.ts

Utils (5):
  src/utils/profileHelpers.ts
  src/utils/aboutHelpers.ts
  src/utils/aboutConstants.ts
  src/utils/activeSessionsHelpers.ts
  src/utils/activeSessionsFormatters.ts
  src/utils/passkeyHelpers.ts
  src/utils/passkeyFormatters.ts
  src/utils/passkeyUtils.ts

API:
  src/api/user.api.ts (частично - осторожно!)

Types:
  src/types/user.types.ts (частично)
```

**Внимание**: `user.api.ts` используется и в Admin!

**Шаги:**
1. Создать `features/profile/`
2. Переместить файлы (сохранить вложенность components)
3. Обновить импорты
4. Тест
5. Commit: "feat: migrate profile to features/"

### Phase 6: Tasks (25-30 минут)
**Простота**: ⭐⭐⭐

**Что мигрируем:**
```
Screens (2):
  src/screens/task/*.tsx

Components (30):
  src/screens/task/components/* (15)
  + src/components/task/* (15)

Hooks (9):
  src/hooks/useTask*.ts
  src/hooks/useSubtasksCache.ts

Utils (2):
  src/utils/taskHelpers.ts
  src/utils/taskListHelpers.ts

API:
  src/api/task.api.ts

Types:
  src/types/task.types.ts
```

**Шаги:**
1. Создать `features/tasks/`
2. Переместить
3. Обновить импорты
4. Тест
5. Commit: "feat: migrate tasks to features/"

### Phase 7: Chat (40-50 минут) 🔥
**Простота**: ⭐⭐⭐⭐⭐ (самая сложная!)

**Что мигрируем:**
```
Screens (5):
  src/screens/chat/*.tsx

Components (54!):
  src/screens/chat/components/* (22)
  + src/components/chat/* (32)

Hooks (18):
  src/hooks/useChat*.ts (14)
  src/hooks/useSelectionMode.ts
  src/hooks/useCreateChat*.ts (2)
  src/hooks/useTypingIndicator.ts
  src/hooks/useMessageData.ts

Utils (9):
  src/utils/chatUtils.ts
  src/utils/chatHelpers.ts
  src/utils/chatScreenHelpers.ts
  src/utils/chatSettingsHelpers.ts
  src/utils/chatSettingsFormatters.ts
  src/utils/chatDetailHelpers.ts
  src/utils/chatDetailFormatters.ts
  src/utils/createChatHelpers.ts
  src/utils/createChatFormatters.ts
  src/utils/message.utils.ts
  src/utils/file.utils.ts

API:
  src/api/chat.api.ts

Types:
  src/types/chat.types.ts
```

**Внимание**:
- Самая большая фича (54 компонента!)
- Много внутренних зависимостей
- Может быть стоит разделить utils по экранам

**Шаги:**
1. Создать `features/chat/`
2. Опционально: создать подпапки `utils/{list,screen,detail,settings,create}`
3. Переместить все файлы
4. Обновить много импортов
5. Тест
6. Commit: "feat: migrate chat to features/"

### Phase 8: Shared (15 минут)
**Цель**: Переместить общие файлы в `/shared/`

**Что мигрируем:**
```
API (базовый клиент):
  src/api/axios.ts → shared/api/client.ts
  src/api/interceptors.ts → shared/api/ (если есть)

Hooks (общие):
  src/hooks/useAuth.ts → shared/hooks/
  src/hooks/useTheme.ts → shared/hooks/
  src/hooks/useWebSocket.ts → shared/hooks/
  src/hooks/useImageLoader.ts → shared/hooks/

Utils (общие):
  src/utils/dateHelpers.ts → shared/utils/
  src/utils/errorUtils.ts → shared/utils/
  src/utils/secureStorage.ts → shared/utils/
  src/utils/mockData.ts → shared/utils/

Constants:
  src/constants/* → shared/constants/

Contexts:
  src/contexts/* → shared/contexts/

Types (общие):
  src/types/common.types.ts → shared/types/
  src/types/modal.types.ts → shared/types/
```

**Шаги:**
1. Создать все подпапки в `shared/`
2. Переместить файлы
3. Обновить импорты
4. Тест
5. Commit: "feat: move shared code to shared/"

### Phase 9: Path Aliases (10 минут)
**Цель**: Обновить `tsconfig.json` и `babel.config.js`

**Новые aliases:**
```json
{
  "@/*": ["./src/*"],
  "@features/*": ["./src/features/*"],
  "@shared/*": ["./src/shared/*"],

  // Feature aliases (для удобства)
  "@auth/*": ["./src/features/auth/*"],
  "@chat/*": ["./src/features/chat/*"],
  "@tasks/*": ["./src/features/tasks/*"],
  "@calendar/*": ["./src/features/calendar/*"],
  "@polls/*": ["./src/features/polls/*"],
  "@profile/*": ["./src/features/profile/*"],
  "@notifications/*": ["./src/features/notifications/*"],

  // Legacy (временно - для старых импортов)
  "@components/*": ["./src/components/*"],
  "@screens/*": ["./src/screens/*"],
  "@hooks/*": ["./src/shared/hooks/*"],
  "@utils/*": ["./src/shared/utils/*"],
  "@api/*": ["./src/shared/api/*"],
  "@types/*": ["./src/shared/types/*"],
  "@constants/*": ["./src/shared/constants/*"],
  "@contexts/*": ["./src/shared/contexts/*"],

  // Unchanged
  "@store/*": ["./src/store/*"],
  "@navigation/*": ["./src/navigation/*"],
  "@services/*": ["./src/services/*"]
}
```

**Шаги:**
1. Обновить `tsconfig.json`
2. Обновить `babel.config.js` (если есть aliases там)
3. Restart TypeScript server
4. Тест
5. Commit: "chore: update path aliases for new structure"

### Phase 10: Cleanup (10 минут)
**Цель**: Удалить старые пустые папки

**Удаляем:**
```
src/screens/auth/       (если пуста)
src/screens/calendar/   (если пуста)
src/screens/chat/       (если пуста)
src/screens/notification/ (если пуста)
src/screens/poll/       (если пуста)
src/screens/profile/    (если пуста)
src/screens/task/       (если пуста)
```

**НЕ удаляем:**
```
src/screens/admin/      (отложено)
src/components/         (отложено)
src/hooks/index.ts      (может быть экспорты)
```

**Шаги:**
1. Проверить что папки пустые
2. Удалить пустые папки
3. Commit: "chore: remove empty old structure folders"

### Phase 11: Final Testing (15-20 минут)
**Цель**: Убедиться что всё работает

**Чеклист:**
- [ ] `npx tsc --noEmit` - без ошибок
- [ ] `npm run build` - успешно (если есть)
- [ ] Запуск приложения - работает
- [ ] Навигация между экранами - работает
- [ ] Проверить по 1 экрану каждой фичи

**Если ошибки:**
1. Записать все ошибки
2. Исправить импорты
3. Повторить тесты
4. Commit: "fix: resolve migration import issues"

---

## 🎯 Итоговая структура после миграции

```
src/
├── features/
│   ├── auth/
│   │   ├── api/
│   │   │   └── auth.api.ts
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── LoginLogo.tsx
│   │   │   ├── AlternativeLoginMethods.tsx
│   │   │   ├── InvitationCodeStep.tsx
│   │   │   ├── ... (19 компонентов)
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── useLoginForm.ts
│   │   │   ├── usePasswordAuth.ts
│   │   │   ├── use2FAVerification.ts
│   │   │   ├── ... (9 хуков)
│   │   │   └── index.ts
│   │   ├── screens/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── ForgotPasswordScreen.tsx
│   │   │   ├── ... (6 экранов)
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── authHelpers.ts
│   │       ├── invitationHelpers.ts
│   │       ├── ... (4 utils)
│   │       └── index.ts
│   │
│   ├── calendar/
│   ├── chat/
│   ├── notifications/
│   ├── polls/
│   ├── profile/
│   └── tasks/
│
├── shared/
│   ├── api/
│   │   └── client.ts
│   ├── constants/
│   │   └── ...
│   ├── contexts/
│   │   └── ...
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTheme.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── common.types.ts
│   │   └── index.ts
│   └── utils/
│       ├── dateHelpers.ts
│       ├── errorUtils.ts
│       └── index.ts
│
├── components/          # ВРЕМЕННО (мигрируем позже)
│   ├── common/
│   └── ...
│
├── navigation/
├── services/
├── store/
├── screens/
│   └── admin/          # ВРЕМЕННО (рефакторим позже)
└── App.tsx
```

---

## 📊 Временные затраты

| Phase | Время | Сложность |
|-------|-------|-----------|
| 0. Подготовка | 5 мин | ⭐ |
| 1. Auth | 15-20 мин | ⭐ |
| 2. Notifications | 10 мин | ⭐ |
| 3. Calendar | 15 мин | ⭐⭐ |
| 4. Polls | 20 мин | ⭐⭐ |
| 5. Profile | 25 мин | ⭐⭐⭐ |
| 6. Tasks | 25-30 мин | ⭐⭐⭐ |
| 7. Chat | 40-50 мин | ⭐⭐⭐⭐⭐ |
| 8. Shared | 15 мин | ⭐⭐ |
| 9. Path Aliases | 10 мин | ⭐ |
| 10. Cleanup | 10 мин | ⭐ |
| 11. Testing | 15-20 мин | ⭐⭐ |
| **ИТОГО** | **3-4 часа** | |

---

## ⚠️ Важные замечания

### 1. Импорты
После каждой фазы нужно обновлять импорты в:
- Файлах внутри фичи (относительные пути)
- Навигации (`src/navigation/`)
- Других фичах (если есть зависимости)

### 2. Index файлы
В каждой папке создавать `index.ts` для удобного экспорта:
```typescript
// features/auth/components/index.ts
export { LoginForm } from './LoginForm';
export { LoginLogo } from './LoginLogo';
// ...
```

### 3. Типы
Если типы используются в нескольких фичах → `shared/types/`

### 4. API
Осторожно с `user.api.ts` - используется и в Profile и в Admin!

### 5. Тестирование
После КАЖДОЙ фазы:
```bash
npx tsc --noEmit
```

### 6. Git commits
Делать commit после каждой фазы для возможности отката

### 7. Backup
Текущие `.backup.tsx` файлы можно удалить после миграции

---

## 🚀 Порядок выполнения

### Сессия 1 (1 час)
- Phase 0: Подготовка
- Phase 1: Auth
- Phase 2: Notifications
- Phase 3: Calendar
- ✅ Commit & Push

### Сессия 2 (1 час)
- Phase 4: Polls
- Phase 5: Profile
- ✅ Commit & Push

### Сессия 3 (1 час)
- Phase 6: Tasks
- Phase 7: Chat (начало)
- ✅ Commit & Push

### Сессия 4 (1 час)
- Phase 7: Chat (завершение)
- Phase 8: Shared
- Phase 9: Path Aliases
- Phase 10: Cleanup
- Phase 11: Final Testing
- ✅ Commit & Push

---

## 📝 Чеклист для каждой фичи

При миграции фичи:

- [ ] Создать структуру папок `features/[feature]/{api,components,hooks,screens,utils,types}`
- [ ] Переместить screens из `src/screens/[feature]/`
- [ ] Переместить screen components из `src/screens/[feature]/components/`
- [ ] Переместить global components из `src/components/[feature]/`
- [ ] Переместить hooks из `src/hooks/use[Feature]*.ts`
- [ ] Переместить utils из `src/utils/[feature]*.ts`
- [ ] Переместить API из `src/api/[feature].api.ts`
- [ ] Переместить types из `src/types/[feature].types.ts`
- [ ] Создать `index.ts` во всех папках
- [ ] Обновить импорты внутри фичи
- [ ] Обновить импорты в navigation
- [ ] Обновить импорты в других фичах
- [ ] Запустить `npx tsc --noEmit`
- [ ] Исправить ошибки если есть
- [ ] Commit: `feat: migrate [feature] to features/`

---

## 🎉 После миграции

### Преимущества:
- ✅ Все файлы фичи в одном месте
- ✅ Легко найти код
- ✅ Легко удалить фичу (если нужно)
- ✅ Понятно где создавать новые файлы
- ✅ Легче onboarding новых разработчиков

### Следующие шаги:
1. Отрефакторить Admin фичу
2. Мигрировать глобальные компоненты в `shared/components/`
3. Создать документацию по структуре
4. Обновить README.md

---

## 📚 Ресурсы

- [Feature-Sliced Design](https://feature-sliced.design/)
- [React Folder Structure](https://www.robinwieruch.de/react-folder-structure/)
- [Bulletproof React](https://github.com/alan2207/bulletproof-react)
