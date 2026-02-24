# Мгновенное переключение вкладок на десктопе (Electron)

## Проблема

На десктопе навигация реализована через `switch` в `MainNavigator.tsx`. При переключении вкладок компонент **полностью размонтируется**, а при возврате — монтируется заново. Это вызывает:

1. Повторную инициализацию всех хуков (`useState`, `useCallback`, etc.)
2. Показ скелетонов/лоадеров пока данные грузятся с API
3. FadeIn-анимации (opacity 0→1), создающие ощущение задержки даже при наличии кэша

## Паттерн исправления

### 1. Пре-загрузка Zustand store из localStorage

На web `skipHydration: !isNative` отключает авто-ридратацию. Store стартует пустым. Решение — синхронно прочитать данные из `localStorage` до создания store.

**Шаблон** (см. `calendarStore.ts`):

```ts
import { isNative } from '@shared/storage';

// Пре-загрузка из localStorage на web
let preloadedData: YourDataType | null = null;
if (!isNative) {
  try {
    // Ключ = namespace:name из persist конфига
    // namespace — из createAsyncStorage('taxion-xxx-storage')
    // name — из persist({ name: 'xxx-storage' })
    const stored = localStorage.getItem('taxion-xxx-storage:xxx-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.yourField) {
        preloadedData = parsed.state.yourField;
      }
    }
  } catch {
    // Ignore — используем начальное значение
  }
}

export const useYourStore = create<YourStore>()(
  persist(
    (set, get) => ({
      yourField: preloadedData || initialValue,  // ← Используем пре-загруженные данные
      // ...
    }),
    {
      name: 'xxx-storage',
      storage: createJSONStorage(() => getZustandXxxStorage()),
      skipHydration: !isNative,
    }
  )
);
```

**Как найти правильный ключ localStorage:**
- Открой `src/shared/storage/index.ts`
- Найди `STORAGE_IDS.xxx` — это namespace (напр. `'taxion-calendar-storage'`)
- В store файле найди `name` в persist конфиге (напр. `'calendar-storage'`)
- Итоговый ключ: `${namespace}:${name}` → `'taxion-calendar-storage:calendar-storage'`

### 2. Убрать FadeIn-анимации

FadeIn стартует с `opacity: 0` при каждом маунте. При ремаунте (переключение вкладок) контент невидим 300ms даже если данные уже есть.

**Замена:**

```tsx
// ❌ Было
const FadeIn = ({ children, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);
  return <Animated.View style={[{ flex: 1, opacity }, style]}>{children}</Animated.View>;
};

// ✅ Стало
const ContentPane = ({ children, style }) => {
  return <View style={[{ flex: 1 }, style]}>{children}</View>;
};
```

### 3. Паттерн useXxxData хука — stale-while-revalidate

Хук данных должен:
- При маунте проверить Zustand store на наличие кэша
- Если кэш есть → `isLoading = false`, показать кэшированные данные сразу
- Параллельно запустить API-запрос для обновления (без показа скелетона)

**Шаблон** (см. `useCalendarData.ts`):

```ts
export const useYourData = (params) => {
  const getFromCache = useYourStore((s) => s.getFromCache);
  const setToCache = useYourStore((s) => s.setToCache);

  const cacheKey = computeCacheKey(params);
  const cached = getFromCache(cacheKey);  // Проверяем кэш при рендере

  const [data, setData] = useState(cached || []);
  const [isLoading, setIsLoading] = useState(!cached);  // false если кэш есть!

  const loadData = useCallback(async () => {
    const cached = getFromCache(cacheKey);
    if (!cached) {
      setIsLoading(true);  // Скелетон только если нет кэша
    }
    // API вызов...
    const freshData = await api.getData(params);
    setData(freshData);
    setToCache(cacheKey, freshData);
    setIsLoading(false);
  }, [params, cacheKey]);

  return { data, isLoading, loadData };
};
```

### 4. Скелетон-гарды в DesktopView

В десктопных view скелетон показывается по `isLoading`:

```tsx
{isLoading ? (
  <YourSkeleton />
) : (
  <ContentPane>  {/* НЕ FadeIn! */}
    <YourContent data={data} />
  </ContentPane>
)}
```

## Чеклист для исправления компонента

- [ ] **Store**: добавить пре-загрузку из `localStorage` (если `skipHydration: !isNative`)
- [ ] **useXxxData хук**: убедиться что `isLoading` = `false` при наличии кэша
- [ ] **DesktopView**: заменить `FadeIn` на `View`/`ContentPane`
- [ ] **DesktopView**: убедиться что скелетон показывается только по `isLoading`

## Список stores и их ключей

| Store | Файл | localStorage ключ |
|-------|------|-------------------|
| Calendar | `calendarStore.ts` | `taxion-calendar-storage:calendar-storage` |
| Task | `taskStore.ts` | `taxion-task-storage:task-storage` |
| Poll | `pollStore.ts` | `taxion-poll-storage:poll-storage` |
| Chat | `chatStore.ts` | `taxion-chat-storage:chat-storage` |
| User | `userStore.ts` | `taxion-user-storage:user-storage` |
