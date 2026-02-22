# Шаблон: Конвертация пошаговой модалки в десктопный двухколоночный макет

## Модалки для конвертации

| Модалка | Файл | Шаги |
|---------|------|------|
| EditScheduleModal | `src/features/schedules/components/EditScheduleModal.tsx` | 4 (done) |
| CreateScheduleModal | `src/features/schedules/components/CreateScheduleModal.tsx` | 5 (0-4) |
| CreateTaskModal | `src/features/tasks/components/modals/CreateTaskModal.tsx` | 5 |
| CreateSubtaskModal | `src/features/tasks/components/modals/CreateSubtaskModal.tsx` | 5 |
| CreatePollModal | `src/features/polls/components/modals/CreatePollModal.tsx` | 4 |
| EditPollModal | `src/features/polls/components/modals/EditPollModal.tsx` | 3 |
| CreateEventModal | `src/features/calendar/components/modals/CreateEventModal.tsx` | 4 |

---

## Чеклист конвертации

### 1. Добавить детекцию Electron (~после `useIsWideScreen`)

```tsx
const isDesktop = useIsWideScreen();
const isElectronApp = Platform.OS === 'web' && typeof window !== 'undefined' && !!(window as any).electron;
const isDesktopElectron = isDesktop && isElectronApp;
```

### 2. Добавить state для window controls hover

```tsx
const [hoveredWindowBtn, setHoveredWindowBtn] = useState<'minimize' | 'maximize' | 'close' | null>(null);
```

### 3. Скипнуть анимацию шагов на десктопе

Найти `useEffect` с `slideAnim` / `Animated.spring` и добавить:

```tsx
useEffect(() => {
  if (isDesktopElectron) return;
  Animated.spring(slideAnim, { ... }).start();
}, [currentStep, isDesktopElectron]);
```

### 4. Добавить десктопный return перед мобильным

Общая структура:

```tsx
if (!data) return null; // существующая проверка

// ===== DESKTOP ELECTRON =====
if (isDesktopElectron) {
  return (
    <Modal visible={visible} animationType={animationType} transparent={false}
      onRequestClose={handleClose} statusBarTranslucent>
      <View style={[styles.desktopElectronContainer, { backgroundColor: theme.background }]}>

        {/* Title Bar */}
        {/* ... см. секцию "Title Bar" ниже ... */}

        {/* Two-Column Content */}
        <ScrollView style={styles.desktopScrollView}
          contentContainerStyle={styles.desktopScrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.desktopColumnsWrapper}>

            {/* Левая колонка */}
            <View style={styles.desktopColumn}>
              <View style={[styles.desktopSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.desktopSectionTitle, { color: theme.text }]}>Заголовок секции</Text>
                {/* Контент из шагов 1-2 */}
              </View>
            </View>

            {/* Правая колонка */}
            <View style={styles.desktopColumn}>
              <View style={[styles.desktopSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.desktopSectionTitle, { color: theme.text }]}>Заголовок секции</Text>
                {/* Контент из шагов 3-4 */}
              </View>
            </View>

          </View>
        </ScrollView>

        {/* Пикеры — скопировать все DatePickerModal, UserSelectorModal и т.д. */}

      </View>
    </Modal>
  );
}

// ===== MOBILE (без изменений) =====
return ( <Modal ...> {/* существующий визард */} </Modal> );
```

### 5. Title Bar (копировать как есть)

```tsx
<View style={[styles.desktopTitleBar, { backgroundColor: theme.backgroundSecondary }]}>
  {/* Кнопка назад */}
  <View
    style={styles.desktopTitleBarBackButton}
    // @ts-ignore
    onClick={handleClose}
    onMouseEnter={(e: any) => {
      if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = theme.backgroundTertiary;
    }}
    onMouseLeave={(e: any) => {
      if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = 'transparent';
    }}
  >
    <Ionicons name="arrow-back" size={18} color={theme.text} />
  </View>

  {/* Заголовок — draggable */}
  <View style={styles.desktopTitleBarDragArea}>
    <Text style={[styles.desktopTitleBarTitle, { color: theme.text }]} numberOfLines={1}>
      ЗАГОЛОВОК МОДАЛКИ
    </Text>
  </View>

  {/* Кнопка сохранить/создать */}
  <View
    style={[styles.desktopTitleBarSaveButton, { backgroundColor: theme.primary }]}
    // @ts-ignore
    onClick={isLoading ? undefined : handleSave}
    onMouseEnter={(e: any) => {
      if (e.currentTarget?.style && !isLoading) e.currentTarget.style.opacity = '0.85';
    }}
    onMouseLeave={(e: any) => {
      if (e.currentTarget?.style) e.currentTarget.style.opacity = '1';
    }}
  >
    {isLoading ? (
      <ActivityIndicator size="small" color="#FFFFFF" />
    ) : (
      <>
        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        <Text style={styles.desktopTitleBarSaveText}>Сохранить</Text>
      </>
    )}
  </View>

  {/* Window controls */}
  <View style={styles.desktopWindowControls}>
    <View
      style={[styles.desktopWindowControlButton,
        hoveredWindowBtn === 'minimize' && { backgroundColor: theme.border }]}
      // @ts-ignore
      onClick={() => window.electron?.minimize?.()}
      onMouseEnter={() => setHoveredWindowBtn('minimize')}
      onMouseLeave={() => setHoveredWindowBtn(null)}
    >
      <Ionicons name="remove" size={14} color={theme.text} />
    </View>
    <View
      style={[styles.desktopWindowControlButton,
        hoveredWindowBtn === 'maximize' && { backgroundColor: theme.border }]}
      // @ts-ignore
      onClick={() => window.electron?.maximize?.()}
      onMouseEnter={() => setHoveredWindowBtn('maximize')}
      onMouseLeave={() => setHoveredWindowBtn(null)}
    >
      <Ionicons name="square-outline" size={12} color={theme.text} />
    </View>
    <View
      style={[styles.desktopWindowControlButton,
        hoveredWindowBtn === 'close' && { backgroundColor: '#E81123' }]}
      // @ts-ignore
      onClick={() => window.electron?.close?.()}
      onMouseEnter={() => setHoveredWindowBtn('close')}
      onMouseLeave={() => setHoveredWindowBtn(null)}
    >
      <Ionicons name="close" size={14}
        color={hoveredWindowBtn === 'close' ? '#FFFFFF' : theme.text} />
    </View>
  </View>

  <View style={[styles.desktopTitleBarBorder, { backgroundColor: theme.border }]} />
</View>
```

### 6. Добавить стили (копировать как есть)

```tsx
// ===== Desktop Electron styles =====
desktopElectronContainer: {
  flex: 1,
},
desktopTitleBar: {
  height: 52,
  flexDirection: 'row',
  alignItems: 'center',
  position: 'relative',
  // @ts-ignore
  WebkitAppRegion: 'no-drag',
  userSelect: 'none',
},
desktopTitleBarBackButton: {
  width: 36,
  height: 36,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 6,
  marginLeft: 12,
  // @ts-ignore
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
  WebkitAppRegion: 'no-drag',
},
desktopTitleBarDragArea: {
  flex: 1,
  height: '100%',
  justifyContent: 'center',
  paddingHorizontal: 12,
  // @ts-ignore
  WebkitAppRegion: 'drag',
},
desktopTitleBarTitle: {
  fontSize: 16,
  fontWeight: '700',
},
desktopTitleBarSaveButton: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 7,
  borderRadius: 8,
  gap: 5,
  marginRight: 8,
  // @ts-ignore
  cursor: 'pointer',
  transition: 'opacity 0.15s ease',
  WebkitAppRegion: 'no-drag',
},
desktopTitleBarSaveText: {
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: '600',
},
desktopWindowControls: {
  flexDirection: 'row',
  height: '100%',
  flexShrink: 0,
  // @ts-ignore
  WebkitAppRegion: 'no-drag',
},
desktopWindowControlButton: {
  width: 40,
  height: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  // @ts-ignore
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
},
desktopTitleBarBorder: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: 1,
},
desktopScrollView: {
  flex: 1,
},
desktopScrollContent: {
  padding: 24,
  paddingBottom: 40,
},
desktopColumnsWrapper: {
  flexDirection: 'row',
  gap: 24,
  maxWidth: 1200,
  alignSelf: 'center',
  width: '100%',
},
desktopColumn: {
  flex: 1,
  gap: 20,
},
desktopSection: {
  borderRadius: 16,
  borderWidth: 1,
  padding: 20,
  gap: 16,
},
desktopSectionTitle: {
  fontSize: 17,
  fontWeight: '700',
  marginBottom: 4,
},
desktopTypeCard: {       // компактные карточки выбора (тип, категория)
  padding: 12,
  gap: 12,
},
desktopTypeIcon: {       // иконка 44px вместо 56px
  width: 44,
  height: 44,
  borderRadius: 22,
},
desktopOptionCard: {     // компактные radio-карточки (видимость, права)
  padding: 10,
  gap: 10,
},
desktopOptionIcon: {     // иконка 32px вместо 40px
  width: 32,
  height: 32,
  borderRadius: 16,
},
```

---

## Правила распределения по колонкам

| Левая колонка | Правая колонка |
|---------------|----------------|
| Название / описание (текстовые поля) | Даты / время / период |
| Тип / категория (выбор из списка) | Настройки доступа / видимости |
| Основной контент (чеклист, варианты) | Аудитория / назначение |
| | Цвет / приоритет / доп. параметры |

**Принцип:** слева — "что", справа — "когда/кому/как".

---

## Что НЕ рендерить на десктопе

- `progressBar` / шаговый индикатор
- `stepTitle` / `stepDescription`
- `bottomNav` (Назад / Далее / Сохранить) — сохранение в title bar
- `summaryCard` — избыточно, всё и так видно
- `KeyboardAvoidingView` — нет виртуальной клавиатуры
- `isKeyboardVisible` проверки / compact стили

## Что обязательно включить

- Все `DatePickerModal`, `UserSelectorModal` и другие пикеры
- Вложенные модалки (group picker и т.д.)
- Валидацию в `handleSave` (она уже есть, работает независимо от шагов)

---

## Стилизация полей внутри секций

Для визуальной глубины — инпуты используют `theme.background` внутри карточки `theme.card`:

```tsx
<View style={[styles.desktopSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
  <TextInput style={[styles.input, {
    backgroundColor: theme.background,  // <-- background, не card
    borderColor: theme.border,
    color: theme.text
  }]} ... />
</View>
```

Карточки выбора (тип, видимость) тоже `backgroundColor: theme.background`.

---

## Пример: план для CreateTaskModal (5 шагов)

**Шаги:** 1) Название → 2) Тип задачи → 3) Тип контента → 4) Контент → 5) Детали

**Левая колонка:**
- Секция "Основная информация" — название, тип задачи, тип контента
- Секция "Контент" — текст / чеклист

**Правая колонка:**
- Секция "Детали" — срок, приоритет, исполнитель
- Секция "Настройки" — аудитория, отдел

**Title bar:** "Создание задачи" + кнопка "Создать"
