```
Очень большой файл. Нужно сделать профессиональную декомпозицию и
рефакторинг. Разделить на компоненты. Все сделать по максимуму. Будто ты сеньор
разработчик. Главное чтобы функционал оставался прежним. Там менять ничего не надо.

Требования:
1. Следовать архитектуре, которая использована в TaskDetailScreen
2. Создать структуру:
   - Utils (вспомогательные функции) → src/utils/
   - Hooks (кастомные хуки для логики) → src/hooks/
   - Components (UI компоненты) → src/screens/[название]/components/
3. Главный компонент должен стать максимально простым (~300-400 строк)
4. Все типы TypeScript должны быть строгими, без any
5. Следовать принципам SOLID и DRY
6. Создать резервную копию оригинального файла
```

---

## 📋 Детальный чеклист для рефакторинга

### Подготовка

- [ ] Прочитать весь файл и понять его структуру
- [ ] Определить основные блоки функциональности
- [ ] Создать backup оригинального файла (.backup.tsx)
- [ ] Создать папку components если её нет

### Анализ и планирование

- [ ] Выделить:
  - [ ] Вспомогательные функции (helpers)
  - [ ] Бизнес-логику (для hooks)
  - [ ] UI компоненты (для components)
  - [ ] API вызовы (проверить, вынесены ли в api/)
  - [ ] Константы (вынести в constants/)
  - [ ] Стили (можно оставить в компонентах через StyleSheet)

### Создание Utils (src/utils/)

Создать файлы для:
- [ ] `[название]Helpers.ts` - чистые функции для расчетов/валидации
- [ ] `[название]Formatters.ts` - форматирование данных (даты, числа, текст)
- [ ] `[название]Validators.ts` - валидация форм и данных (если есть)

**Критерии для utils:**
- ✅ Чистые функции (pure functions)
- ✅ Не используют React hooks
- ✅ Легко тестировать
- ✅ Переиспользуемые

### Создание Custom Hooks (src/hooks/)

Создать хуки для:
- [ ] `use[Название]Data.ts` - загрузка и управление основными данными
- [ ] `use[Название]Actions.ts` - действия (create, update, delete)
- [ ] `use[Название][Сущность].ts` - для каждой подсущности (если есть)

**Критерии для hooks:**
- ✅ Инкапсулируют бизнес-логику
- ✅ Возвращают данные и функции для работы с ними
- ✅ Используют useCallback для функций
- ✅ Используют useMemo для вычисляемых значений
- ✅ Имеют четкий interface возвращаемых данных

**Паттерн структуры хука:**
```typescript
export const use[Название] = (params) => {
  // State
  const [data, setData] = useState();
  const [loading, setLoading] = useState(false);

  // Handlers
  const loadData = useCallback(async () => {
    // logic
  }, [deps]);

  // Return interface
  return {
    data,
    loading,
    loadData,
    // ...other
  };
};
```

### Создание UI Components (src/screens/[название]/components/)

Создать компоненты:
- [ ] `[Название]Tabs.tsx` - если есть табы
- [ ] `[Название][Раздел]Tab.tsx` - для каждой вкладки
- [ ] `[Название]Header.tsx` - если кастомный хедер
- [ ] `[Название]ActionButtons.tsx` - фиксированные кнопки действий
- [ ] `[Название]ActionMenu.tsx` - модальное меню (если есть)
- [ ] `[Название]Card.tsx` - карточки/элементы списка
- [ ] `[Название]EmptyState.tsx` - empty states
- [ ] `[Название]Loading.tsx` - skeleton loaders

**Критерии для components:**
- ✅ Принимают данные через props
- ✅ Вызывают callbacks для действий (не содержат логику)
- ✅ Максимально переиспользуемые
- ✅ Имеют четкий TypeScript interface для props
- ✅ Используют StyleSheet для стилей

**Паттерн структуры компонента:**
```typescript
interface [Название]Props {
  // props with types
}

export const [Название]: React.FC<[Название]Props> = ({
  // destructure props
}) => {
  const { theme } = useTheme();

  return (
    // JSX
  );
};

const styles = StyleSheet.create({
  // styles
});
```

### Рефакторинг главного компонента

- [ ] Заменить всю логику на вызовы хуков
- [ ] Заменить большие блоки JSX на импортированные компоненты
- [ ] Оставить только координацию между компонентами
- [ ] Убрать все вспомогательные функции (перенести в utils)
- [ ] Максимально упростить

**Структура рефакторенного главного компонента:**
```typescript
const [Название]Screen: React.FC = () => {
  // 1. Hooks and context
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuthStore();

  // 2. Custom hooks для данных
  const { data, loading } = use[Название]Data();
  const { action1, action2 } = use[Название]Actions();

  // 3. Local state (минимальный)
  const [activeTab, setActiveTab] = useState('overview');
  const [showModal, setShowModal] = useState(false);

  // 4. Handlers (только координация)
  const handleAction = () => {
    action1();
    setShowModal(false);
  };

  // 5. Render
  return (
    <SafeAreaView>
      <[Название]Header />
      <[Название]Tabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'tab1' && <[Название]Tab1 data={data} onAction={handleAction} />}
      {activeTab === 'tab2' && <[Название]Tab2 />}

      <[Название]ActionButtons onAction={handleAction} />
      <[Название]Modal visible={showModal} onClose={() => setShowModal(false)} />
    </SafeAreaView>
  );
};
```

### Проверка TypeScript

- [ ] Запустить `npx tsc --noEmit`
- [ ] Исправить все ошибки типов
- [ ] Убедиться что нет `any` типов
- [ ] Добавить недостающие поля в types файлы

### Тестирование

- [ ] Проверить что приложение компилируется

---

## 🎯 Целевые метрики качества

### Размер файлов
- ✅ Главный компонент: 300-500 строк
- ✅ Отдельный UI компонент: 100-300 строк
- ✅ Хук: 50-200 строк
- ✅ Утилита: 50-150 строк

### Code Quality
- ✅ TypeScript strict mode
- ✅ Нет `any` типов
- ✅ Нет дублирования кода
- ✅ Все функции именованы понятно
- ✅ Комментарии для сложной логики

### Архитектура
- ✅ Separation of Concerns
- ✅ Single Responsibility
- ✅ DRY (Don't Repeat Yourself)
- ✅ SOLID principles
- ✅ Composition over Inheritance

---

## 📚 Примеры из TaskDetailScreen

### Пример хука (useTaskData.ts)
```typescript
export const useTaskData = (taskId: string) => {
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadTask = useCallback(async () => {
    setIsLoading(true);
    const response = await taskApi.getTask(Number(taskId));
    setTask(response);
    setIsLoading(false);
  }, [taskId]);

  return {
    task,
    isLoading,
    loadTask,
  };
};
```

### Пример компонента ([Название]Tabs.tsx)
```typescript
interface [Название]TabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  count?: number;
}

export const [Название]Tabs: React.FC<[Название]TabsProps> = ({
  activeTab,
  onTabChange,
  count,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {/* Tab buttons */}
    </View>
  );
};
```

### Пример helper функции
```typescript
/**
 * Check if user can perform action
 */
export const canPerformAction = (
  entity: Entity | null,
  userId: number | undefined,
  userRole: string | undefined
): boolean => {
  if (!entity || !userId) return false;

  // Logic
  return true;
};
```

---

## 🚀 Команды для быстрого старта

```bash
# 1. Создать структуру папок
mkdir -p src/screens/[название]/components

# 2. Создать backup
cp src/screens/[название]/[Название]Screen.tsx src/screens/[название]/[Название]Screen.backup.tsx

# 3. Проверить TypeScript после рефакторинга
npx tsc --noEmit | grep [Название]

# 4. Посчитать строки (до/после)
wc -l src/screens/[название]/[Название]Screen.backup.tsx
wc -l src/screens/[название]/[Название]Screen.tsx
```

---

## ⚠️ Частые ошибки, которых нужно избегать

1. ❌ Не создавайте слишком много мелких компонентов (минимум 50 строк)
2. ❌ Не выносите стили в отдельные файлы (используйте StyleSheet.create внутри)
3. ❌ Не делайте хуки слишком универсальными (лучше специализированные)
4. ❌ Не забывайте про useCallback и useMemo для оптимизации
5. ❌ Не оставляйте неиспользуемые импорты
6. ❌ Не используйте `any` типы
7. ❌ Не ломайте существующий функционал

---

## ✅ Критерии успешного рефакторинга

- [x] Главный файл сократился минимум на 70%
- [x] Все TypeScript ошибки исправлены
- [x] Приложение работает без регрессий
- [x] Код легко читается
- [x] Компоненты переиспользуемые
- [x] Хуки изолируют логику
- [x] Следование принципам SOLID

---

## 📖 Дополнительные ресурсы

### Ссылки на примеры
- Пример рефакторинга: `src/screens/task/TaskDetailScreen.tsx`
- Примеры хуков: `src/hooks/useTask*.ts`
- Примеры компонентов: `src/screens/task/components/`
- Примеры утилит: `src/utils/taskHelpers.ts`

### Best Practices
- [React Hooks Best Practices](https://react.dev/reference/react)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- SOLID Principles in React
- Clean Code Guidelines

---

## 🎓 Пример использования промпта

**Для чата:**
```
Очень большой файл UserListScreen.tsx (2500 строк). Нужно сделать профессиональную
декомпозицию и рефакторинг по примеру TaskDetailScreen. Разделить на компоненты,
хуки и утилиты. Все сделать по максиму. Будто ты сеньор разработчик. Главное
чтобы функционал оставался прежним.

Следуй структуре:
- src/utils/ - для хелперов
- src/hooks/ - для кастомных хуков
- src/screens/user/components/ - для UI компонентов

Создай backup, сделай рефакторинг, исправь TypeScript ошибки
```

---

