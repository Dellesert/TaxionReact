# Desktop Skeleton Loading — Гайд

Паттерн для замены спиннера на скелетоны при загрузке десктопных страниц.
Реализовано на примере Календаря — повторить для остальных страниц.

## Архитектура (два уровня)

```
Suspense fallback (lazy-загрузка JS-чанка)
  └─ DesktopFallback — полный макет страницы со скелетонами
       ├─ Левая карточка: sidebar skeleton
       └─ Правая карточка: content skeleton

isLoading (загрузка данных с API)
  └─ Внутри DesktopView — скелетоны в каждой панели
       ├─ Левая: <SidebarSkeleton />
       └─ Центр: <ContentSkeleton />
       └─ При готовности: <FadeIn> обёртка (300ms opacity 0→1)
```

## Шаги для новой страницы

### 1. Создать скелетон-компоненты

Для каждой панели десктоп-лейаута создать свой скелетон в `components/states/`:

```tsx
// Пример: LeftPanelSkeleton.tsx
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

export const LeftPanelSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const line = { backgroundColor: theme.border, opacity };

  return (
    <ScrollView contentContainerStyle={styles.content} style={{ backgroundColor: theme.background }}>
      {/* Повторить структуру реальных компонентов панели */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Animated.View style={[styles.title, line]} />
        <Animated.View style={[styles.subtitle, line]} />
        {/* ... */}
      </View>
    </ScrollView>
  );
};
```

**Ключевые правила скелетонов:**
- Пульсация opacity 0.3↔0.7, duration 1000ms
- `useNativeDriver: true`
- `backgroundColor: theme.border` для всех плейсхолдеров
- Форма элементов повторяет реальный контент (borderRadius, размеры)
- Используется `Animated.View`, не сторонние библиотеки

### 2. Создать Suspense-фоллбек

Компонент, который повторяет полный десктоп-лейаут страницы (карточки + отступы), но с скелетонами внутри:

```tsx
// Пример: TasksDesktopFallback.tsx
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { LeftPanelSkeleton } from './LeftPanelSkeleton';
import { ContentSkeleton } from './ContentSkeleton';

export const TasksDesktopFallback: React.FC = () => {
  const { theme, isDark } = useTheme();
  const cardBg = isDark ? theme.card : '#FFFFFF';

  return (
    <View style={styles.container}>
      {/* Toolbar placeholder */}
      <View style={[styles.toolbar, { backgroundColor: cardBg, borderColor: theme.border }]} />
      <View style={styles.content}>
        <View style={[styles.leftCard, { backgroundColor: cardBg, borderColor: theme.border }]}>
          <LeftPanelSkeleton />
        </View>
        <View style={[styles.rightCard, { backgroundColor: cardBg, borderColor: theme.border }]}>
          <ContentSkeleton />
        </View>
      </View>
    </View>
  );
};
```

**Важно:** Стили карточек (width, margin, borderRadius, shadow) должны совпадать со стилями реального DesktopView.

### 3. Подключить Suspense-фоллбек в MainNavigator

В `src/navigation/MainNavigator.tsx`, обернуть lazy-компонент во вложенный `<Suspense>`:

```tsx
import { TasksDesktopFallback } from '@features/tasks/components/states/TasksDesktopFallback';

// В renderContent():
case 'Tasks':
  return (
    <Suspense fallback={<TasksDesktopFallback />}>
      <TaskNavigator />
    </Suspense>
  );
```

Внешний `<Suspense>` с `ActivityIndicator` остаётся как catch-all для других табов.

### 4. Добавить скелетоны в DesktopView (для загрузки данных)

В самом DesktopView-компоненте заменить лоадер на скелетоны:

```tsx
{isLoading ? (
  <LeftPanelSkeleton />
) : (
  <FadeIn>
    {/* реальный контент */}
  </FadeIn>
)}
```

### 5. FadeIn-обёртка (плавное появление)

Компонент `FadeIn` добавляется в файл DesktopView (или выносится в shared):

```tsx
const FadeIn: React.FC<{ children: React.ReactNode; style?: any; enabled?: boolean }> = ({ children, style, enabled = true }) => {
  const opacity = useRef(new Animated.Value(enabled ? 0 : 1)).current;
  useEffect(() => {
    if (enabled) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [opacity, enabled]);
  return <Animated.View style={[{ flex: 1, opacity }, style]}>{children}</Animated.View>;
};
```

Обернуть реальный контент каждой панели в `<FadeIn>` при переходе от скелетона.

**Важно: не анимировать при загрузке из кеша.** Если данные приходят мгновенно (из кеша), fade вызывает лишнее мигание. Чтобы этого избежать, засекаем время маунта компонента и включаем анимацию только если загрузка заняла достаточно времени для того, чтобы скелетон был виден:

```tsx
// В компоненте экрана:
const mountTime = useRef(Date.now());

// В JSX:
{isLoading ? (
  <ContentSkeleton />
) : (
  <FadeIn enabled={Date.now() - mountTime.current > 150}>
    {/* реальный контент */}
  </FadeIn>
)}
```

- `> 150` мс — данные грузились реально, скелетон был виден → плавное появление
- `≤ 150` мс — данные из кеша, скелетон не видели → контент сразу, без мигания

## Чеклист для новой страницы

- [ ] Скелетон-компоненты для каждой панели (повторяют структуру реального контента)
- [ ] `*DesktopFallback` — полный макет страницы со скелетонами (для Suspense)
- [ ] В `MainNavigator.tsx` — вложенный `<Suspense fallback={<*DesktopFallback />}>`
- [ ] В `*DesktopView` — `isLoading ? <Skeleton /> : <FadeIn enabled={Date.now() - mountTime.current > 150}>{content}</FadeIn>`
- [ ] Стили карточек фоллбека совпадают с реальным лейаутом

## Референс (готовая реализация — Календарь)

| Файл | Назначение |
|------|-----------|
| `calendar/components/states/LeftSidebarSkeleton.tsx` | Скелетон левой панели |
| `calendar/components/states/EventListSkeleton.tsx` | Скелетон списка событий |
| `calendar/components/states/CalendarDesktopFallback.tsx` | Suspense-фоллбек |
| `calendar/components/views/CalendarDesktopView.tsx` | FadeIn + isLoading скелетоны |
| `navigation/MainNavigator.tsx` | Вложенный Suspense для Calendar |
