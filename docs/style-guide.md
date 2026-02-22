# Тахион — UI Style Guide

Единый стандарт стилей для всех компонентов приложения.
Распространяется на `src/features/*/components/` и `src/shared/components/`.

---

## 1. Сетка отступов (4px grid)

Все значения `padding`, `margin`, `gap` должны быть **кратны 4**.

| Токен | px | Когда использовать |
|-------|----|--------------------|
| `xxs` | 2 | gap между числом и лейблом внутри tight-блока |
| `xs` | 4 | минимальный gap, micro-отступы внутри контента |
| `sm` | 8 | gap между элементами, padding кнопок-иконок, gap карточек в ряду |
| `md` | 12 | padding карточек, внутренние gap секций |
| `base` | 16 | padding контейнеров/экранов, margin между карточками, paddingVertical секций |
| `lg` | 20 | padding модалок/экранов (если нужно больше воздуха) |
| `xl` | 24 | крупные внутренние отступы |
| `2xl` | 32 | отступ между крупными блоками |

**Запрещённые значения для spacing:** `3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17`.

Если значение нужно — округлить до ближайшего из сетки.

---

## 2. Border Radius

Четыре уровня — без исключений:

| Уровень | px | Где применять |
|---------|----|---------------|
| `xl` | 16 | Сайдбар, модалка, контейнер верхнего уровня, bottom sheet |
| `lg` | 12 | Карточка, info card, кнопка-действие, input |
| `md` | 8 | Badge, мелкая кнопка, participant item, навигационная кнопка |
| `sm` | 4 | Thumbnail, мини-элемент |
| circle | `width / 2` | Avatar, dot, icon circle |

**Запрещено:** `6, 10, 11, 14, 18, 23, 25` — заменять на ближайший из таблицы.

Исключение: message bubble — допустим кастомный радиус для речевого пузырька.

---

## 3. Типографика

### Шкала размеров

| Роль | fontSize | fontWeight | Доп. стили |
|------|----------|------------|------------|
| Заголовок экрана / модалки | 24 | 700 | lineHeight: 32 |
| Число (stat, counter) | 18 | 700 | lineHeight: 22 |
| Заголовок хедера (навигация) | 16 | 600 | textAlign: center |
| Заголовок секции | 15 | 700 | — |
| Тело текста / значение в карточке | 15 | 400–600 | lineHeight: 20–22 |
| Имя в списке (chat, user) | 14–15 | 600 | — |
| Подзначение / вторичный текст | 13 | 500 | lineHeight: 18 |
| Кнопка текст | 13 | 700 | — |
| Мета (время, дата, badge) | 12 | 500–600 | — |
| Uppercase label (секция, карточка) | 12 | 700 | textTransform: uppercase, letterSpacing: 0.5 |
| Доп. мета (мелкий timestamp) | 11 | 500 | — |
| Мелкий лейбл (stat card) | 10 | 600 | textTransform: uppercase, letterSpacing: 0.5 |

### Правила

- **letterSpacing: 0.5** на всех `textTransform: 'uppercase'` лейблах — без исключений
- **lineHeight** указывать для многострочного текста и заголовков
- Не использовать `fontSize: 17` — заменять на 16 или 18

---

## 4. Тема (theme tokens)

Все цвета берутся из `useTheme()` — **никаких хардкод-цветов в компонентах**.

### Основные токены

```
theme.background          — фон экрана
theme.backgroundSecondary — приподнятая поверхность (карточка на фоне)
theme.backgroundTertiary  — subtle фон (hover, tertiary surface)
theme.card                — карточка
theme.text                — основной текст
theme.textSecondary       — вторичный текст
theme.textTertiary        — третичный текст
theme.border              — стандартный бордер
theme.borderLight         — мягкий бордер
theme.primary             — акцент (#E94444 / #EF4444)
theme.primaryLight        — фон акцента (#FEE2E2)
theme.input               — фон input
theme.inputBorder         — бордер input
theme.inputPlaceholder    — placeholder текст
```

### Статусные цвета

```
theme.success  — #10B981 (зелёный)
theme.warning  — #F59E0B (жёлтый)
theme.error    — #EF4444 (красный)
theme.info     — #3B82F6 (синий)
```

### Допустимые хардкод-цвета

Только для tint/overlay на статусных бейджах:

```typescript
// 12% opacity фон от статусного цвета
{ backgroundColor: '#10B98120' }  // success bg
{ backgroundColor: '#F59E0B20' }  // warning bg
{ backgroundColor: '#EF444420' }  // error bg
{ backgroundColor: '#3B82F620' }  // info bg
```

Суффикс `20` = 12% opacity. Использовать только в паре со статусным цветом.

---

## 5. Иконки (Ionicons)

| Контекст | size | IconCircle |
|----------|------|------------|
| Хедер (close, back, menu) | 24 | нет |
| Info card (тип, дата, место) | 22 | 44×44, borderRadius: 12 |
| Stat card (день/неделя/месяц) | 16 | 28×28, borderRadius: 14 |
| Inline (в строке, badge, tab) | 16–18 | нет |
| Мелкие (chevron, show more) | 16 | нет |
| Навигационные кнопки (mini calendar) | 16 | 32×32, borderRadius: 8 |

**IconCircle background:** `{color}20` (hex + суффикс 20).

---

## 6. Тени

### Два уровня — не придумывать новые

**Крупная (sidebar, модалка, карточка верхнего уровня):**
```typescript
// Web
{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
// Native
{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }
```

**Мелкая (вложенная карточка, stat card):**
```typescript
{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }
```

### Правила
- Выносить в константу (`sidebarShadow`, `cardShadow`) — не дублировать inline
- Platform.OS === 'web' проверка для boxShadow — всегда через тернарник или константу

---

## 7. Паттерны компонентов

### Карточка

```typescript
// Внешняя (секция, панель)
{ borderRadius: 16, padding: 16, borderWidth: 1 }

// Внутренняя (info card, item)
{ borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 8 }

// Compact (stat card, маленькая)
{ borderRadius: 12, padding: 12, gap: 8 }
```

### Секция в ScrollView

```typescript
{ paddingVertical: 16, borderBottomWidth: 1 }
// borderBottomColor: theme.border
```

Разделитель: `StyleSheet.hairlineWidth` + `theme.border`, или `borderBottomWidth: 1`.

### Хедер с центрированным заголовком

```typescript
headerBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               paddingHorizontal: 4, paddingVertical: 8, borderBottomWidth: 1, minHeight: 56 }
headerLeft:  { width: 48, alignItems: 'flex-start' }
headerRight: { width: 48, alignItems: 'flex-end' }
headerCenter: { flex: 1, alignItems: 'center' }
// Кнопки: padding: 8 → отступ от края: 4 + 8 = 12px (симметрия)
```

### Кнопка-действие (primary)

```typescript
{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, minHeight: 48 }
```

### Кнопка-ссылка (show more, collapse)

```typescript
{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: 8 }
```

### Touch Target

Минимальный `padding` для интерактивных элементов: **8px**. Запрещено: `padding: 4` на кнопках.

---

## 8. Организация стилей в коде

### Статические стили

```typescript
const styles = StyleSheet.create({ ... });
```
Всегда внизу файла. Содержат всё, что не зависит от темы.

### Динамические стили (цвета)

Передавать inline через массив:
```typescript
<View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
```

Для сложных случаев — `useMemo`:
```typescript
const dynamicStyles = useMemo(() => StyleSheet.create({
  text: { color: theme.text },
}), [theme]);
```

### Margin: явные свойства

```typescript
// Правильно
{ marginTop: 16, marginBottom: 16, marginLeft: 16 }

// Неправильно (переопределение shorthand)
{ margin: 16, marginRight: 0 }
```

### Дубликаты — в константы

```typescript
// Правильно
const cardShadow = Platform.OS === 'web' ? { ... } : { ... };
const styles = StyleSheet.create({
  card: { ...cardShadow },
});

// Неправильно: копипаст тени в каждый стиль
```

### Неиспользуемые стили

Удалять. Не оставлять «на будущее».

---

## 9. Чек-лист

Перед мержем компонента — пройтись по каждому пункту:

- [ ] Все spacing (`padding`, `margin`, `gap`) кратны 4
- [ ] `borderRadius` только из набора: 4, 8, 12, 16, circle
- [ ] `fontSize` соответствует таблице типографики
- [ ] `letterSpacing: 0.5` на всех `textTransform: 'uppercase'`
- [ ] Нет shorthand-переопределений (`margin: X, marginRight: 0`)
- [ ] Нет inline magic numbers (`marginTop: 3`, `gap: 7`)
- [ ] Все цвета из `theme.*` — нет хардкод-цветов (кроме status `+20`)
- [ ] Тени вынесены в константы, не дублируются
- [ ] Неиспользуемые стили удалены
- [ ] Touch target padding >= 8
- [ ] Хедер: левая и правая зона одинаковой ширины (симметрия)
- [ ] Web-only стили (`cursor`, `transition`, `boxShadow`) через `Platform.OS` check
