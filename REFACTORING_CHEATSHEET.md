Очень большой файл. Нужно сделать профессиональную декомпозицию
и рефакторинг по примеру TaskDetailScreen. Разделить на компоненты. Все сделать
по максиму. Будто ты сеньор разработчик. Главное чтобы функционал оставался
прежним. Там менять ничего не надо.

## 📁 Структура (куда что класть)

```
src/
├── utils/                          # Чистые функции
│   ├── [название]Helpers.ts       # Вычисления, валидация
│   └── [название]Formatters.ts    # Форматирование данных
│
├── hooks/                          # Бизнес-логика
│   ├── use[Название]Data.ts       # Загрузка данных
│   ├── use[Название]Actions.ts    # Действия (CRUD)
│   └── use[Название][Entity].ts   # Работа с подсущностью
│
└── screens/[название]/
    ├── [Название]Screen.tsx       # ГЛАВНЫЙ (300-400 строк)
    └── components/                 # UI компоненты
        ├── [Название]Tabs.tsx
        ├── [Название][Tab]Tab.tsx
        ├── [Название]ActionButtons.tsx
        └── [Название]ActionMenu.tsx
```

---

## 🔧 Что куда выносить

### ➡️ В Utils (src/utils/)
- ✅ Функции расчетов: `calculateTotal()`, `isValid()`
- ✅ Проверки прав: `canEdit()`, `canDelete()`
- ✅ Форматирование: `formatDate()`, `formatCurrency()`
- ✅ Маппинг данных: `mapUserToDisplay()`
- ❌ НЕ используют React hooks
- ❌ НЕ содержат state

### ➡️ В Hooks (src/hooks/)
- ✅ API вызовы: `loadData()`, `saveData()`
- ✅ State management: `useState`, `useReducer`
- ✅ Side effects: `useEffect`
- ✅ Callbacks: `useCallback`
- ✅ Memoization: `useMemo`
- ❌ НЕ содержат JSX

### ➡️ В Components (src/screens/.../components/)
- ✅ UI элементы
- ✅ Принимают props
- ✅ Вызывают callbacks
- ✅ Локальные стили
- ❌ НЕ содержат бизнес-логику
- ❌ НЕ делают API вызовы

---

## 📝 Шаблоны кода

### Hook Template
```typescript
export const use[Название] = (id: string) => {
  const [data, setData] = useState<Type | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await api.get(id);
    setData(result);
    setLoading(false);
  }, [id]);

  return { data, loading, loadData };
};
```

### Component Template
```typescript
interface Props {
  data: Type;
  onAction: () => void;
}

export const Component: React.FC<Props> = ({ data, onAction }) => {
  const { theme } = useTheme();

  return <View>{/* JSX */}</View>;
};

const styles = StyleSheet.create({});
```

### Helper Template
```typescript
/**
 * Description
 */
export const helperFunction = (
  param1: Type,
  param2: Type
): ReturnType => {
  // Pure function logic
  return result;
};
```

---

## ⚡ Команды

```bash
# Создать backup
cp src/path/File.tsx src/path/File.backup.tsx

# Создать папки
mkdir -p src/screens/[name]/components

# Проверить TS
npx tsc --noEmit | grep [FileName]

# Посчитать строки
wc -l src/path/File.tsx

# Найти импорты
grep "import.*from" src/path/File.tsx
```

---

## ✅ Чеклист

- [ ] Создан backup (.backup.tsx)
- [ ] Создана папка components/
- [ ] Вынесены utils (helpers, formatters)
- [ ] Созданы hooks (data, actions)
- [ ] Созданы UI components
- [ ] Главный файл упрощен (<500 строк)
- [ ] TypeScript ошибки исправлены
- [ ] Все работает без регрессий

---

## 🎨 Именование

| Тип | Формат | Пример |
|-----|--------|--------|
| Hook | `use[Название][Entity]` | `useTaskData`, `useTaskComments` |
| Component | `[Название][Часть]` | `TaskTabs`, `TaskActionMenu` |
| Helper | `[действие][Объект]` | `getUserName`, `canEditTask` |
| Props | `[Название]Props` | `TaskTabsProps` |
| File (util) | `[название]Helpers.ts` | `taskHelpers.ts` |
| File (hook) | `use[Название].ts` | `useTaskData.ts` |
| File (component) | `[Название].tsx` | `TaskTabs.tsx` |

---

## 🚨 Частые ошибки

| ❌ Не делай | ✅ Делай |
|------------|---------|
| Компоненты <50 строк | Компоненты 100-300 строк |
| Хуки с JSX | Хуки возвращают данные/функции |
| Utils с hooks | Utils - чистые функции |
| `any` типы | Строгие TypeScript типы |
| Inline стили | `StyleSheet.create()` |
| Дублирование кода | DRY принцип |
| Логика в компонентах | Логика в hooks |

---

## 📊 Целевые метрики

```
До:  [====================================] 3000+ строк
После: [======] 300-400 строк

Сокращение: ~85-90%
```

| Тип файла | Строк |
|-----------|-------|
| Главный компонент | 300-500 |
| UI компонент | 100-300 |
| Hook | 50-200 |
| Util | 50-150 |

---

## 🔍 Быстрая диагностика

**Файл нуждается в рефакторинге если:**
- 🔴 Больше 1000 строк
- 🔴 Больше 10 useState
- 🔴 Больше 5 useEffect
- 🔴 Много вложенных условий
- 🔴 Дублирование кода
- 🔴 Сложно найти нужный код
- 🔴 Много комментариев "хак" или "TODO"

---

## 📚 Примеры

### Откуда учиться
```
✅ Идеальный пример:
src/screens/task/TaskDetailScreen.tsx (350 строк)

✅ Примеры hooks:
src/hooks/useTaskData.ts
src/hooks/useTaskComments.ts

✅ Примеры components:
src/screens/task/components/TaskTabs.tsx
src/screens/task/components/TaskOverviewTab.tsx

✅ Примеры utils:
src/utils/taskHelpers.ts
src/utils/activityHelpers.tsx
```

---

## 🎯 Финальная проверка

```typescript
// Главный компонент должен выглядеть так:
const Screen = () => {
  // 1. Hooks (3-5 строк)
  const { data } = useData();
  const { action } = useActions();

  // 2. State (2-3 строки)
  const [tab, setTab] = useState('overview');

  // 3. Handlers (5-10 строк)
  const handle = () => action();

  // 4. Render (50-100 строк)
  return (
    <SafeAreaView>
      <Header />
      <Tabs />
      <Content />
      <Actions />
    </SafeAreaView>
  );
};

