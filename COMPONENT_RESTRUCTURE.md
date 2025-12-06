# Реструктуризация компонентов проекта

## Обзор

Проведена полная реструктуризация компонентов трёх основных модулей приложения: Чаты, Задачи и Опросы.
Всего организовано **114 компонентов** в **26 логических категорий**.

---

## 📊 Статистика

| Модуль | Компонентов | Категорий | Обновлено файлов |
|--------|-------------|-----------|------------------|
| **Чаты** | 53 | 9 | ~65 |
| **Задачи** | 36 | 8 | ~45 |
| **Опросы** | 25 | 9 | ~35 |
| **ИТОГО** | **114** | **26** | **~145** |

---

## 📁 Новая структура

### 1. Чаты (`src/features/chat/components/`)

```
chat/components/
├── attachments/      - 3 файла   - Компоненты вложений
│   ├── AttachmentsTab.tsx
│   ├── FileAttachmentPicker.tsx
│   └── MessageAttachments.tsx
│
├── chat-details/     - 4 файла   - Детали чата
│   ├── ChatScreenContent.tsx
│   ├── GroupChatInfo.tsx
│   ├── ParticipantsTab.tsx
│   └── PrivateChatInfo.tsx
│
├── chat-list/        - 5 файлов  - Список чатов
│   ├── ChatEmptyState.tsx
│   ├── ChatItem.tsx
│   ├── ChatListContent.tsx
│   ├── ChatListSkeleton.tsx
│   └── ChatSearchBar.tsx
│
├── common/           - 12 файлов - Базовые UI компоненты
│   ├── ChatActionBar.tsx
│   ├── ChatDetailTabs.tsx
│   ├── ChatListTabs.tsx
│   ├── ChatNameInput.tsx
│   ├── DateSeparator.tsx
│   ├── FloatingDateHeader.tsx
│   ├── LinkifiedText.tsx
│   ├── MessageStatus.tsx
│   ├── QuickActions.tsx
│   ├── ScrollToBottomButton.tsx
│   ├── SelectedUsersCounter.tsx
│   └── SelectionModeToolbar.tsx
│
├── create-chat/      - 2 файла   - Создание чата
│   ├── CreateChatSearchBar.tsx
│   └── CreateChatUserItem.tsx
│
├── headers/          - 6 файлов  - Заголовки экранов
│   ├── ChatDesktopHeader.tsx
│   ├── ChatDetailHeader.tsx
│   ├── ChatHeader.tsx
│   ├── ChatListHeader.tsx
│   ├── ChatSettingsHeader.tsx
│   └── CreateChatHeader.tsx
│
├── messages/         - 10 файлов - Компоненты сообщений
│   ├── EmptyMessagesState.tsx
│   ├── MessageBubble.tsx
│   ├── MessageInput.tsx
│   ├── MessageItem.tsx
│   ├── MessageListComponent.tsx
│   ├── MessageSkeleton.tsx
│   ├── PinnedMessageBanner.tsx
│   ├── PollMessageCard.tsx
│   ├── TaskMessageCard.tsx
│   └── UnreadMessagesBanner.tsx
│
├── modals/           - 8 файлов  - Модальные окна
│   ├── ChatCreateMenu.tsx
│   ├── ChatMembersModal.tsx
│   ├── ChatModals.tsx
│   ├── ChatSettingsModal.tsx
│   ├── CreateChatModal.tsx
│   ├── ForwardMessageModal.tsx
│   ├── ImageViewer.tsx
│   └── MessageContextMenu.tsx
│
├── states/           - 3 файла   - Состояния (empty, error, loading)
│   ├── ChatEmptyMessages.tsx
│   ├── ChatEmptyPlaceholder.tsx
│   └── ChatErrorState.tsx
│
└── index.ts          - Barrel export для удобного импорта
```

---

### 2. Задачи (`src/features/tasks/components/`)

```
tasks/components/
├── common/           - 9 файлов  - Базовые UI компоненты
│   ├── ExpandAllSubtasksButton.tsx
│   ├── TaskActionButtons.tsx
│   ├── TaskActionMenu.tsx
│   ├── TaskListHeader.tsx
│   ├── TaskProgressBar.tsx
│   ├── TaskSearchBar.tsx
│   ├── TaskStatusTabs.tsx
│   ├── TaskTabs.tsx
│   └── TaskViewSwitcher.tsx
│
├── detail-tabs/      - 4 файла   - Вкладки деталей задачи
│   ├── TaskAttachmentsTab.tsx
│   ├── TaskCommentsTab.tsx
│   ├── TaskHistoryTab.tsx
│   └── TaskOverviewTab.tsx
│
├── filters/          - 4 файла   - Компоненты фильтрации
│   ├── AdvancedTaskFilterMenu.tsx
│   ├── BoardFilterMenu.tsx
│   ├── MobileFilterMenu.tsx
│   └── TaskFilterMenu.tsx
│
├── kanban/           - 2 файла   - Канбан-доска
│   ├── TaskKanbanBoard.tsx
│   └── TaskKanbanColumn.tsx
│
├── lists/            - 4 файла   - Списки и таблицы задач
│   ├── TaskAttachmentsList.tsx
│   ├── TaskItem.tsx
│   ├── TaskListContent.tsx
│   └── TaskTableView.tsx
│
├── modals/           - 5 файлов  - Модальные окна
│   ├── CreateSubtaskModal.tsx
│   ├── CreateTaskModal.tsx
│   ├── DelegateTaskModal.tsx
│   ├── EditTaskModal.tsx
│   └── ShareTaskModal.tsx
│
├── states/           - 5 файлов  - Состояния
│   ├── ChecklistSkeleton.tsx
│   ├── TaskAccessDenied.tsx
│   ├── TaskDetailSkeleton.tsx
│   ├── TaskListEmptyState.tsx
│   └── TaskSkeleton.tsx
│
├── task-details/     - 3 файла   - Детали задачи
│   ├── TaskChecklistsView.tsx
│   ├── TaskDesktopLayout.tsx
│   └── TaskSubtasksList.tsx
│
└── index.ts          - Barrel export
```

---

### 3. Опросы (`src/features/polls/components/`)

```
polls/components/
├── common/           - 1 файл    - Базовые UI компоненты
│   └── PollFilterMenu.tsx
│
├── headers/          - 3 файла   - Заголовки экранов
│   ├── PollDesktopHeader.tsx
│   ├── PollHeader.tsx
│   └── PollListHeader.tsx
│
├── lists/            - 2 файла   - Списки опросов
│   ├── PollItem.tsx
│   └── PollListContent.tsx
│
├── modals/           - 4 файла   - Модальные окна
│   ├── CreatePollModal.tsx
│   ├── EditPollModal.tsx
│   ├── PollDetailModal.tsx
│   └── SharePollModal.tsx
│
├── poll-details/     - 2 файла   - Детали опроса
│   ├── PollDesktopLayout.tsx
│   └── PollInfo.tsx
│
├── results/          - 1 файл    - Результаты опроса
│   └── PollResults.tsx
│
├── states/           - 6 файлов  - Состояния
│   ├── PollDetailSkeleton.tsx
│   ├── PollErrorState.tsx
│   ├── PollListEmptyState.tsx
│   ├── PollListErrorState.tsx
│   ├── PollSkeleton.tsx
│   └── PollVotersEmptyState.tsx
│
├── voters/           - 4 файла   - Компоненты голосующих
│   ├── PollVoterCard.tsx
│   ├── PollVotersByOption.tsx
│   ├── PollVotersControls.tsx
│   └── PollVotersHeader.tsx
│
├── voting/           - 2 файла   - Компоненты голосования
│   ├── PollActionButtons.tsx
│   └── PollVotingUI.tsx
│
└── index.ts          - Barrel export
```

---

## 🎯 Преимущества новой структуры

### 1. **Логическая группировка**
Компоненты сгруппированы по функциональному назначению, а не хранятся в одной плоской структуре.

### 2. **Легкая навигация**
- Быстро найти нужный компонент
- Интуитивно понятно, где искать функциональность
- Новые разработчики быстрее разбираются в проекте

### 3. **Масштабируемость**
- Просто добавлять новые компоненты в соответствующие категории
- Легко расширять функциональность модулей
- Готово к росту команды разработки

### 4. **Современные практики**
Структура соответствует best practices крупных проектов:
- Discord
- Slack
- Microsoft Teams
- Notion

### 5. **Чистый код**
- Избавились от десятков файлов в одной папке
- Улучшена читаемость кодовой базы
- Профессиональный вид проекта

---

## 🔧 Технические детали

### Обновлённые импорты

Все импорты обновлены с учётом новой структуры:

**Было:**
```typescript
import { MessageBubble } from '../components/MessageBubble';
```

**Стало:**
```typescript
import { MessageBubble } from '../components/messages/MessageBubble';
```

### Barrel Exports

Созданы `index.ts` файлы для удобного импорта:

```typescript
// src/features/chat/components/index.ts
export { MessageBubble } from './messages/MessageBubble';
export { MessageInput } from './messages/MessageInput';
export { ChatHeader } from './headers/ChatHeader';
// ...
```

### Исправлены пути

Обновлены пути к вспомогательным модулям внутри компонентов:
- `../types/` → `../../types/`
- `../utils/` → `../../utils/`
- `../api/` → `../../api/`
- `../hooks/` → `../../hooks/`

---

## ✅ Проверка качества

- ✅ TypeScript компиляция без ошибок импортов
- ✅ Все навигаторы корректно работают
- ✅ Проект запускается без критических ошибок
- ✅ Кросс-импорты между подпапками исправлены

---

## 📝 Рекомендации по работе

### Добавление нового компонента

1. Определите категорию компонента
2. Создайте файл в соответствующей подпапке
3. Добавьте экспорт в `index.ts` при необходимости

### Пример:

Добавление нового модального окна для чата:

```bash
# Создать файл
src/features/chat/components/modals/NewModal.tsx

# Добавить в index.ts
export { NewModal } from './modals/NewModal';
```

---

## 🚀 Итог

Проект теперь имеет **enterprise-уровень** организации кода:
- Профессиональная структура
- Легко поддерживать и масштабировать
- Соответствует современным стандартам
- Готово к работе большой команды

**Дата реструктуризации:** 2025-12-06
