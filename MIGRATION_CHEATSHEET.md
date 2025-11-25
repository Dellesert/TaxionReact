# 🚀 Шпаргалка по миграции

## Быстрый старт

```bash
# После каждой фазы проверяем TypeScript
npx tsc --noEmit

# Делаем commit после каждой фазы
git add .
git commit -m "feat: migrate [feature] to features/"
```

## Структура фичи

```
features/[feature]/
├── api/          # API для этой фичи
├── components/   # Все компоненты (глобальные + screen-specific)
├── hooks/        # Хуки фичи
├── screens/      # Экраны
├── types/        # Типы (если есть)
└── utils/        # Утилиты
```

## Откуда → Куда

### Auth
```
src/screens/auth/*.tsx → features/auth/screens/
src/screens/auth/components/* → features/auth/components/
src/hooks/useLoginForm.ts, usePasswordAuth.ts, etc → features/auth/hooks/
src/utils/authHelpers.ts, invitationHelpers.ts, etc → features/auth/utils/
src/api/auth.api.ts → features/auth/api/
```

### Notifications
```
src/screens/notification/*.tsx → features/notifications/screens/
src/screens/notification/components/* → features/notifications/components/
src/components/notification/* → features/notifications/components/
src/hooks/useNotification*.ts → features/notifications/hooks/
src/utils/notification*.ts → features/notifications/utils/
src/api/notification.api.ts → features/notifications/api/
```

### Calendar
```
src/screens/calendar/*.tsx → features/calendar/screens/
src/screens/calendar/components/* → features/calendar/components/
src/components/calendar/* → features/calendar/components/
src/hooks/useCalendar*.ts → features/calendar/hooks/
src/utils/calendarHelpers.ts → features/calendar/utils/
src/api/calendar.api.ts → features/calendar/api/
src/types/calendar.types.ts → features/calendar/types/
```

### Polls
```
src/screens/poll/*.tsx → features/polls/screens/
src/screens/poll/components/* → features/polls/components/
src/components/poll/* → features/polls/components/
src/hooks/usePoll*.ts → features/polls/hooks/
src/utils/poll*.ts → features/polls/utils/
src/api/poll.api.ts → features/polls/api/
src/types/poll.types.ts → features/polls/types/
```

### Profile
```
src/screens/profile/*.tsx → features/profile/screens/
src/screens/profile/components/* → features/profile/components/ (с вложенностью!)
src/hooks/useProfile*.ts, useAbout*.ts, useActiveSessions*.ts, usePasskey*.ts → features/profile/hooks/
src/utils/profileHelpers.ts, about*.ts, activeSessions*.ts, passkey*.ts → features/profile/utils/
src/api/user.api.ts → features/profile/api/ (ОСТОРОЖНО! используется в Admin)
src/types/user.types.ts → features/profile/types/ (частично)
```

### Tasks
```
src/screens/task/*.tsx → features/tasks/screens/
src/screens/task/components/* → features/tasks/components/
src/components/task/* → features/tasks/components/
src/hooks/useTask*.ts, useSubtasksCache.ts → features/tasks/hooks/
src/utils/task*.ts → features/tasks/utils/
src/api/task.api.ts → features/tasks/api/
src/types/task.types.ts → features/tasks/types/
```

### Chat
```
src/screens/chat/*.tsx → features/chat/screens/
src/screens/chat/components/* → features/chat/components/
src/components/chat/* → features/chat/components/
src/hooks/useChat*.ts, useSelectionMode.ts, useCreateChat*.ts, useTypingIndicator.ts, useMessageData.ts → features/chat/hooks/
src/utils/chat*.ts, message.utils.ts, file.utils.ts → features/chat/utils/
src/api/chat.api.ts → features/chat/api/
src/types/chat.types.ts → features/chat/types/
```

## Общие файлы → Shared

```
src/hooks/useAuth.ts, useTheme.ts, useWebSocket.ts, useImageLoader.ts → shared/hooks/
src/utils/dateHelpers.ts, errorUtils.ts, secureStorage.ts, mockData.ts → shared/utils/
src/constants/* → shared/constants/
src/contexts/* → shared/contexts/
src/types/common.types.ts, modal.types.ts → shared/types/
src/api/axios.ts → shared/api/client.ts
```

## Команды для миграции

```bash
# Создать структуру
mkdir -p src/features/auth/{api,components,hooks,screens,utils}

# Переместить файлы (Windows PowerShell)
Move-Item src/screens/auth/*.tsx src/features/auth/screens/
Move-Item src/screens/auth/components/* src/features/auth/components/

# Переместить файлы (Git Bash)
git mv src/screens/auth/*.tsx src/features/auth/screens/
git mv src/screens/auth/components/* src/features/auth/components/
```

## Чеклист для каждой фичи

- [ ] Создать папки
- [ ] Переместить screens
- [ ] Переместить components (screen + global)
- [ ] Переместить hooks
- [ ] Переместить utils
- [ ] Переместить API
- [ ] Переместить types
- [ ] Создать index.ts файлы
- [ ] Обновить импорты внутри фичи
- [ ] Обновить импорты в navigation
- [ ] `npx tsc --noEmit`
- [ ] Commit

## Важно!

1. **После КАЖДОЙ фазы**: `npx tsc --noEmit`
2. **Делаем commit** после каждой фазы
3. **Создаем index.ts** для удобного экспорта
4. **Обновляем импорты** - TypeScript покажет ошибки
5. **Admin не трогаем** - отложено
6. **Глобальные компоненты** в `/src/components/` не трогаем - отложено

## Примеры импортов (после миграции)

```typescript
// Старый способ
import { LoginForm } from '@screens/auth/components/LoginForm';
import { useLoginForm } from '@hooks/useLoginForm';

// Новый способ
import { LoginForm } from '@features/auth/components/LoginForm';
import { useLoginForm } from '@features/auth/hooks/useLoginForm';

// Или с алиасом
import { LoginForm } from '@auth/components/LoginForm';
import { useLoginForm } from '@auth/hooks/useLoginForm';

// Или через index
import { LoginForm, useLoginForm } from '@auth';
```

## Примерный index.ts

```typescript
// features/auth/index.ts
export * from './screens';
export * from './components';
export * from './hooks';
export * from './utils';
```

```typescript
// features/auth/hooks/index.ts
export { useLoginForm } from './useLoginForm';
export { usePasswordAuth } from './usePasswordAuth';
export { usePasskeyAuth } from './usePasskeyAuth';
// ...
```
