# Desktop Sizing Guide — Тахион

Этот документ — референс для приведения компонентов к единому визуальному стилю на десктопе. Используй как промт при проверке каждого экрана/компонента.

---

## Эталонные размеры (ScheduleCard / EventItem)

### Карточки списков

| Свойство | Значение |
|---|---|
| **Container padding** | `12` |
| **Container marginBottom** | `8` |
| **Container borderRadius** | `12` |
| **Title fontSize** | `16` |
| **Title fontWeight** | `600` |
| **Title lineHeight** | `22` |
| **Description fontSize** | `13` |
| **Description lineHeight** | `18` |
| **Meta/secondary text fontSize** | `12` |
| **Meta/secondary lineHeight** | `16` |
| **Icon size (inline meta)** | `14` |
| **Status badge** | `28x28`, icon `14` |
| **Color indicator width** | `4` |

### Боковые панели (правая панель деталей, 380px)

| Свойство | Значение |
|---|---|
| **Panel title (заголовок объекта)** | `20px` / `700` / lh `28` |
| **Section title** | `14px` / `700` |
| **Section label (uppercase)** | `12px` / `700` / uppercase / ls `0.5` |
| **Body text (описание)** | `14px` / lh `20` |
| **Sub-value text** | `13px` / lh `18` |
| **ScrollContent padding** | `14` |
| **Section paddingVertical** | `12` |

### Info-карточки (внутри панелей)

| Свойство | Значение |
|---|---|
| **Card padding** | `12` |
| **Card gap** | `10` |
| **Card borderRadius** | `10` |
| **Icon container** | `36x36`, borderRadius `10` |
| **Icon size** | `18` |
| **Label fontSize** | `12` (uppercase) |
| **Value fontSize** | `14` / `600` |

### Кнопки действий (внутри панелей)

| Свойство | Значение |
|---|---|
| **paddingVertical** | `8` |
| **paddingHorizontal** | `10` |
| **minHeight** | `40` |
| **borderRadius** | `10` |
| **Icon size** | `18` |
| **Text fontSize** | `13` / `700` |

### Бейджи/статистика

| Свойство | Значение |
|---|---|
| **paddingHorizontal** | `10` |
| **paddingVertical** | `6` |
| **borderRadius** | `10` |
| **gap** | `6` |
| **Text fontSize** | `13` / `700` |

### Участники / пользователи (внутри панелей)

| Свойство | Значение |
|---|---|
| **Avatar (creator)** | `32` |
| **Avatar (list item)** | `28` |
| **Name fontSize** | `13-14` / `500-600` |
| **Group header icon** | `16` |
| **Group title fontSize** | `13` / `600` |
| **Item padding** | `px 10 / py 6` |
| **Item gap** | `6` |

### Заголовки панелей (header bar)

| Свойство | Значение |
|---|---|
| **minHeight** | `56` |
| **Title fontSize** | `16` / `600` |
| **paddingLeft** | `20` |
| **paddingRight** | `12` |
| **paddingVertical** | `8` |

### Section headers (списки)

| Свойство | Значение |
|---|---|
| **paddingHorizontal** | `16` |
| **paddingTop** | `16` |
| **paddingBottom** | `6` |
| **Title fontSize** | `13-15` / `600` |

---

## Чеклист для проверки компонента

При проверке каждого экрана/компонента на десктопе пройдись по этим пунктам:

- [ ] **Заголовки карточек** — не больше `16px` для списков, `20px` для деталей
- [ ] **Body text** — `13-14px`, не `15-16px`
- [ ] **Padding карточек** — `12px`, не `16-20px`
- [ ] **marginBottom между карточками** — `8px`, не `12-16px`
- [ ] **Иконки inline** — `14px` (meta), `18px` (info cards)
- [ ] **Icon containers** — `36x36` (не `44-56`)
- [ ] **Аватары** — `28-32px` (не `40-48`)
- [ ] **Кнопки** — minHeight `40` (не `48-56`), icon `18`
- [ ] **Бейджи** — padding `6-10`, fontSize `12-13`
- [ ] **Section gaps/padding** — `12px` vertical (не `16-20`)
- [ ] **Нет завышенных lineHeight** — title `22`, body `18-20`

---

## Компоненты уже исправлены

- [x] `EventItem.tsx` — карточки списка событий
- [x] `CalendarEventsList.tsx` — section headers
- [x] `EventDetailsPanel.tsx` — правая панель деталей

## Компоненты для проверки

- [x] `UpcomingEventsCard.tsx` — карточка ближайших событий (левый сайдбар)
- [x] `CalendarStatsPanel.tsx` — статистика (левый сайдбар)
- [x] `WeekTimelineView.tsx` — шкала времени недели
- [ ] `TaskItem` / карточки задач
- [ ] `PollCard` / карточки опросов
- [x] `DailySummaryView.tsx` — дневная сводка графиков
- [ ] `ScheduleEntryRow.tsx` — строки записей графика
- [ ] Admin screens — AnalyticsHub, Metrics, Performance
- [ ] Chat — список чатов, сообщения
- [ ] Profile — элементы настроек
