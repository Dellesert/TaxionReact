# ScreenHeader Component - Examples

Универсальный компонент заголовка экрана с поддержкой различных конфигураций.

## Основные примеры использования

### 1. Простой заголовок (только текст)

```tsx
<ScreenHeader title="Календарь" />
```

### 2. Заголовок с левой кнопкой (текст)

```tsx
<ScreenHeader
  title="Чаты"
  leftButton={{
    text: "Изм.",
    onPress: () => setIsEditMode(!isEditMode),
  }}
/>
```

### 3. Заголовок с правой кнопкой (иконка)

```tsx
<ScreenHeader
  title="Задачи"
  rightButton={{
    icon: "add",
    onPress: handleCreate,
  }}
/>
```

### 4. Заголовок с правой кнопкой (текст "+")

```tsx
<ScreenHeader
  title="Опросы"
  rightButton={{
    text: "+",
    onPress: handleCreatePoll,
  }}
/>
```

### 5. Заголовок с обеими кнопками

```tsx
<ScreenHeader
  title="Чаты"
  leftButton={{
    text: isEditMode ? "Готово" : "Изм.",
    onPress: toggleEditMode,
  }}
  rightButton={{
    text: "+",
    onPress: handleNewChat,
  }}
/>
```

### 6. Заголовок с подзаголовком

```tsx
<ScreenHeader
  title="Календарь"
  subtitle="5 событий на этой неделе"
/>
```

### 7. Заголовок с контентом снизу (фильтры, pills)

```tsx
<ScreenHeader
  title="Задачи"
  rightButton={{
    icon: "add",
    onPress: handleCreate,
  }}
  belowTitleContent={
    <View style={styles.viewPills}>
      {['day', 'week', 'month'].map((view) => (
        <TouchableOpacity
          key={view}
          style={[styles.pill, selectedView === view && styles.pillActive]}
          onPress={() => setSelectedView(view)}
        >
          <Text>{view}</Text>
        </TouchableOpacity>
      ))}
    </View>
  }
  showDivider={true}
/>
```

### 8. Полностью кастомный header (сложные случаи)

```tsx
<ScreenHeader
  title="Календарь"
  customContent={
    <>
      {/* Ваш кастомный UI */}
      <View style={styles.customHeader}>
        <Text>Мой кастомный заголовок</Text>
        {/* ... другие элементы ... */}
      </View>
    </>
  }
/>
```

### 9. Компактный header (меньше отступы)

```tsx
<ScreenHeader
  title="Настройки"
  compact={true}
/>
```

### 10. Header без тени

```tsx
<ScreenHeader
  title="Профиль"
  withShadow={false}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | required | Заголовок экрана |
| `subtitle` | `string` | optional | Подзаголовок |
| `leftButton` | `{icon?, text?, onPress}` | optional | Левая кнопка |
| `rightButton` | `{icon?, text?, onPress}` | optional | Правая кнопка |
| `customContent` | `ReactNode` | optional | Полностью кастомный контент |
| `belowTitleContent` | `ReactNode` | optional | Контент под заголовком |
| `showDivider` | `boolean` | `false` | Показывать разделитель перед belowTitleContent |
| `withShadow` | `boolean` | `true` | Показывать тень |
| `compact` | `boolean` | `false` | Компактный режим (меньше отступы) |
| `containerStyle` | `ViewStyle` | optional | Кастомные стили контейнера |
| `titleStyle` | `TextStyle` | optional | Кастомные стили заголовка |

## Примеры для разных экранов

### ChatListScreen

```tsx
<ScreenHeader
  title="Чаты"
  leftButton={{
    text: isEditMode ? "Готово" : "Изм.",
    onPress: toggleEditMode,
  }}
  rightButton={!isEditMode ? {
    text: "+",
    onPress: handleNewChat,
  } : undefined}
/>
```

### PollListScreen

```tsx
<ScreenHeader
  title="Опросы"
  rightButton={canCreatePoll ? {
    text: "+",
    onPress: handleCreatePoll,
  } : undefined}
/>
```

### TaskListScreen

```tsx
<ScreenHeader
  title="Задачи"
  rightButton={{
    icon: "add",
    onPress: handleCreateTask,
  }}
  leftButton={{
    icon: "filter",
    onPress: showFilterMenu,
  }}
/>
```

### CalendarScreen (с кастомным контентом)

```tsx
<ScreenHeader
  title="Календарь"
  customContent={
    <>
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>Календарь</Text>
        <View style={styles.viewPills}>
          {/* View selector pills */}
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.dateNav}>
        {/* Date navigation */}
      </View>
    </>
  }
/>
```

## Рекомендации по дизайну

1. **Используйте иконки для частых действий** - `icon: "add"`, `icon: "filter"`, `icon: "search"`
2. **Используйте текст "+" для создания** - более минималистично
3. **Используйте текст "Изм."/"Готово" для режима редактирования** - стандарт iOS
4. **Добавляйте подзаголовки для контекста** - количество элементов, статус и т.д.
5. **Используйте `belowTitleContent` для фильтров** - держит интерфейс чистым
6. **Используйте `customContent` только для сложных случаев** - когда стандартный layout не подходит
