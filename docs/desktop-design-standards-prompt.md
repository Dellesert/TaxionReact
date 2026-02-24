# Desktop Design Standards — Claude Code Audit Prompt

> **Usage:** Paste this entire prompt into Claude Code, then add the component/screen name you want to audit at the end.
> Example: `[paste this prompt] Now audit src/features/tasks/components/lists/TaskItem.tsx`

---

## Your Role

You are auditing a React Native (Electron/Web) component for **desktop design compliance**. Your job:

1. Read the target component file(s)
2. Compare every style value against the standards below
3. Fix all deviations — change values to match the standard
4. Do NOT change component logic, props, state, or behavior
5. Do NOT change mobile styles — only desktop/web styles (check `isWideScreen`, `isDesktop`, `isDesktopElectron`, or `Platform.OS === 'web'`)
6. If the component has no desktop-specific branch, apply standards to the shared styles (they affect desktop too)

**Reference files in the project:**
- Design tokens: `src/shared/constants/design-system.constants.ts`
- Theme colors: `src/shared/constants/theme.constants.ts`
- Theme hook: `src/shared/hooks/useTheme.ts`
- Wide screen hook: `src/shared/hooks/useIsWideScreen.ts`

---

## 1. Typography Standards

Use these exact values. Do NOT invent intermediate sizes.

| Role | fontSize | fontWeight | lineHeight | Use for |
|------|----------|------------|------------|---------|
| **Page/Panel title** | 20 | '700' | 28 | Panel headers, detail view titles |
| **Card title** | 16 | '600' | 22 | List card names, item titles |
| **Section title** | 14 | '700' | 20 | Section headers inside panels |
| **Section label** | 12 | '700' | 16 | Uppercase labels (`letterSpacing: 0.5`) |
| **Body** | 14 | '400' | 20 | Main content text, descriptions |
| **Body emphasized** | 14 | '500' | 20 | Important values in body |
| **Secondary text** | 13 | '400' | 18 | Descriptions, subtitles, sub-values |
| **Caption / meta** | 12 | '600' | 16 | Timestamps, tags, small labels |
| **Tiny label** | 11 | '500' | 14 | Hint text, very small meta |

### Typography rules:
- **Never use fontSize > 20** in lists or panels (exception: dashboard display numbers)
- **Never use fontSize 15** — use 14 or 16 instead
- **fontWeight '600'** is the default for emphasis. Use '700' only for titles and section headers
- **Always set lineHeight** explicitly — do not rely on defaults
- Use `theme.text` for primary, `theme.textSecondary` for secondary, `theme.textTertiary` for tertiary

---

## 2. Card Standards (List Items)

Cards are items in scrollable lists (events, tasks, absences, polls, chats, schedules).

| Property | Value | Notes |
|----------|-------|-------|
| `padding` | `12` | All sides. Not 16, not 20 |
| `borderRadius` | `12` | Standard for all cards |
| `borderWidth` | `1` | Not 2. Consistent across all cards |
| `borderColor` | `theme.border` | Dynamic theme color |
| `backgroundColor` | `theme.card` | For card background |
| `marginBottom` | `8` | Between cards in lists |
| `marginHorizontal` | `16` | List padding (applied to card or list container) |

### Card shadows (Platform.select):
```tsx
// Web/Electron:
...Platform.select({
  web: {
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transitionProperty: 'box-shadow, transform',
    transitionDuration: '0.2s',
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
})
```

### Card hover states (desktop only):
```tsx
// Hovered state styles:
{
  transform: [{ translateY: -2 }],  // NOT -4
  ...Platform.select({
    web: {
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    },
    default: {
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
  }),
}

// Mouse event handlers:
onMouseEnter={Platform.OS === 'web' ? () => setHovered(true) : undefined}
onMouseLeave={Platform.OS === 'web' ? () => setHovered(false) : undefined}
```

### Card title inside card:
- fontSize: `16`, fontWeight: `'600'`, lineHeight: `22`
- `numberOfLines={1}` or `{2}` — always limit

### Card description/meta inside card:
- fontSize: `13`, lineHeight: `18` — for descriptions
- fontSize: `12`, lineHeight: `16` — for meta (dates, counts)
- Icon size for inline meta: `14`

### Card status badge:
- Size: `28x28`, icon: `14`, borderRadius: `14` (circle)

### Card color indicator (left accent bar):
- `width: 4`, `borderRadius: 2`

---

## 3. Detail Panel Standards (Right Side Panel)

Panels show details when a card is selected. Usually 380-420px wide.

| Property | Value | Notes |
|----------|-------|-------|
| **Header minHeight** | `56` | Panel header bar |
| **Header title fontSize** | `16` / `'600'` | Not 18 or 20 |
| **Header paddingLeft** | `20` | |
| **Header paddingRight** | `12` | |
| **Header paddingVertical** | `8` | |
| **ScrollContent padding** | `14` | Content area padding |
| **Section paddingVertical** | `12` | Between sections |
| **Panel title (object name)** | fontSize `20`, fontWeight `'700'`, lineHeight `28` | |
| **Section title** | fontSize `14`, fontWeight `'700'` | |
| **Body text** | fontSize `14`, lineHeight `20` | |
| **Sub-value text** | fontSize `13`, lineHeight `18` | |

### Info cards (inside panels):
| Property | Value |
|----------|-------|
| `padding` | `12` |
| `gap` | `10` |
| `borderRadius` | `10` |
| `borderWidth` | `1` |
| `borderColor` | `theme.border` |
| `marginBottom` | `8` |
| Icon container | `36x36`, borderRadius `10` |
| Icon size | `18` |
| Label fontSize | `12` (uppercase, letterSpacing 0.5) |
| Value fontSize | `14`, fontWeight `'600'` |

---

## 4. Button Standards

| Property | Value | Notes |
|----------|-------|-------|
| `minHeight` | `40` | Not 48 or 56 on desktop |
| `paddingVertical` | `8` | |
| `paddingHorizontal` | `10-16` | 10 for compact, 16 for standard |
| `borderRadius` | `10` | |
| `borderWidth` | `2` | For outlined buttons |
| Icon size | `18` | |
| Text fontSize | `13`, fontWeight `'700'` | |
| `gap` | `6` | Between icon and text |

### Button hover (desktop):
```tsx
cursor: 'pointer',
transition: 'opacity 0.15s ease',
// On hover: opacity 0.85
// On press: opacity 0.7
```

---

## 5. Badge Standards

Badges show status, counts, or categories.

| Property | Value |
|----------|-------|
| `paddingHorizontal` | `10` |
| `paddingVertical` | `6` |
| `borderRadius` | `10` |
| `gap` | `6` |
| Text fontSize | `13`, fontWeight `'700'` |

---

## 6. Icon & Avatar Standards

| Element | Size | borderRadius |
|---------|------|--------------|
| **Icon container (info card)** | `36x36` | `10` |
| **Icon container (nav card)** | `40x40` | `12` |
| **Icon size (inline meta)** | `14` | — |
| **Icon size (info card / button)** | `18` | — |
| **Avatar (creator/detail)** | `32` | `16` (circle) |
| **Avatar (list item)** | `28` | `14` (circle) |
| **Avatar (small/inline)** | `24` | `12` (circle) |

---

## 7. Spacing & Layout Standards

Use design system tokens from `design-system.constants.ts`:

| Token | Value | Use for |
|-------|-------|---------|
| `spacing.xs` | `4` | Minimal gaps, tiny margins |
| `spacing.sm` | `8` | Standard gap between items, marginBottom between cards |
| `spacing.md` | `12` | Card padding, section gaps |
| `spacing.lg` | `16` | Container padding, marginHorizontal |
| `spacing.xl` | `20` | Large padding (modals, page margins) |
| `spacing.xxl` | `24` | Desktop column gaps |
| `spacing.xxxl` | `32` | Major section separators |

### Section headers in lists:
| Property | Value |
|----------|-------|
| `paddingHorizontal` | `16` |
| `paddingTop` | `16` |
| `paddingBottom` | `6` |
| Title fontSize | `13-14`, fontWeight `'600'` |

---

## 8. Desktop/Electron Specifics

### Always add on interactive elements:
```tsx
// @ts-ignore
cursor: 'pointer',
```

### Web transitions:
```tsx
...Platform.select({
  web: {
    transitionProperty: 'background-color, transform, box-shadow, opacity',
    transitionDuration: '0.2s',
    transitionTimingFunction: 'ease',
  },
  default: {},
})
```

### Hover handling pattern:
```tsx
const [isHovered, setIsHovered] = useState(false);

// In JSX:
<Pressable
  onMouseEnter={Platform.OS === 'web' ? () => setIsHovered(true) : undefined}
  onMouseLeave={Platform.OS === 'web' ? () => setIsHovered(false) : undefined}
  style={[
    styles.card,
    isHovered && styles.cardHovered,
  ]}
>
```

### Platform.select for shadows:
Always use `Platform.select` to provide both web (`boxShadow`) and native (`shadowColor/Offset/Opacity/Radius/elevation`) shadows.

### Scrollbar hiding (already global):
The global.css already hides scrollbars. Do not add redundant scrollbar-hiding styles.

---

## 9. Audit Algorithm

When you receive a component to audit, follow these steps:

### Step 1: Read the file
Read the entire component file. Identify all `StyleSheet.create` blocks and inline styles.

### Step 2: Classify the component
Determine what type it is:
- **List card** → Apply Card Standards (section 2)
- **Detail panel** → Apply Panel Standards (section 3)
- **Modal / form** → Apply desktop modal template standards
- **Screen wrapper** → Check container padding and layout
- **Shared component** → Apply the most relevant category

### Step 3: Audit typography
For every `fontSize`, `fontWeight`, `lineHeight` in the styles:
- Map it to the typography table (section 1)
- Fix any values that don't match
- Pay special attention to fontSize 15 (→ change to 14) and fontSize 17 (→ change to 16 or 18)

### Step 4: Audit spacing
For every `padding`, `margin`, `gap`:
- Check against spacing standards (section 7)
- Card padding should be `12`, not 16 or 20
- marginBottom between cards should be `8`
- gaps should use even numbers from the spacing scale: 4, 6, 8, 10, 12, 16, 20, 24

### Step 5: Audit visual properties
- `borderRadius`: match to standards (12 for cards, 10 for info cards/buttons/badges)
- `borderWidth`: should be `1` for cards (not 2)
- Shadows: use `Platform.select` with correct values
- Colors: use `theme.*` tokens, never hardcoded colors

### Step 6: Audit interactive states
- Desktop hover: `translateY(-2)`, enhanced shadow
- Cursor: `cursor: 'pointer'` on all clickable elements
- Transitions: `0.2s ease` for all animated properties
- Mouse events: `onMouseEnter`/`onMouseLeave` with `Platform.OS === 'web'` guard

### Step 7: Audit icon/avatar sizes
- Inline meta icons: `14`
- Info card / button icons: `18`
- Icon containers: `36x36` in panels, `40x40` in nav cards
- Avatars: `28-32` (not 40-48 on desktop)

### Step 8: Verify imports
Ensure the component imports from design system constants:
```tsx
import { spacing, borderRadius, shadows, typography } from '@shared/constants/design-system.constants';
```
Use tokens where possible instead of magic numbers.

---

## 10. Anti-Patterns (Do NOT)

- **Do NOT** use fontSize `15` — use `14` instead
- **Do NOT** use padding `16` or `20` on list cards — use `12`
- **Do NOT** use borderWidth `2` on list cards — use `1`
- **Do NOT** use translateY `-4` on hover — use `-2`
- **Do NOT** use icon containers larger than `40x40` in panels — use `36x36`
- **Do NOT** use avatars larger than `32` in panels — use `28-32`
- **Do NOT** hardcode colors — use `theme.*` tokens
- **Do NOT** hardcode shadows — use `Platform.select` with standard values
- **Do NOT** add hover states without `Platform.OS === 'web'` guard
- **Do NOT** change mobile-only code paths — focus on desktop/shared styles
- **Do NOT** add new dependencies or create new files
- **Do NOT** refactor component structure — only fix style values

---

## 11. Final Checklist

Before committing, verify:

- [ ] **Card titles** — `16px` max for lists, `20px` for detail headers
- [ ] **Body text** — `13-14px`, not `15-16px`
- [ ] **Card padding** — `12px`, not `16-20px`
- [ ] **Card marginBottom** — `8px`, not `12-16px`
- [ ] **Card borderRadius** — `12`, consistent
- [ ] **Card borderWidth** — `1`, not `2`
- [ ] **Inline icons** — `14px` (meta), `18px` (info cards)
- [ ] **Icon containers** — `36x36` (not `44-56`)
- [ ] **Avatars** — `28-32px` (not `40-48`)
- [ ] **Buttons** — minHeight `40` (not `48-56`), icon `18`
- [ ] **Badges** — padding `6-10`, fontSize `12-13`
- [ ] **Section gaps** — `12px` vertical (not `16-20`)
- [ ] **No inflated lineHeight** — title `22`, body `18-20`
- [ ] **Hover states** — translateY `-2`, transition `0.2s`
- [ ] **cursor: 'pointer'** — on all clickable elements
- [ ] **Platform.select** — shadows use both web and native versions
- [ ] **No hardcoded colors** — all use `theme.*` tokens
- [ ] **Design token imports** — using `spacing`, `borderRadius`, `shadows` from constants

---

## Already Fixed (Reference Components)

These components are already compliant — use them as reference:
- `src/features/calendar/components/events/EventItem.tsx`
- `src/features/calendar/components/views/CalendarEventsList.tsx`
- `src/features/calendar/components/panels/EventDetailsPanel.tsx`
- `src/features/calendar/components/panels/UpcomingEventsCard.tsx`
- `src/features/calendar/components/panels/CalendarStatsPanel.tsx`
- `src/features/schedules/components/ScheduleEntryRow.tsx`
- `src/features/absences/screens/AbsenceListScreen.tsx`
- `src/features/absences/components/AbsenceCard.tsx`

## Components That Need Audit

- `src/features/tasks/components/lists/TaskItem.tsx`
- `src/features/polls/components/` (PollCard, PollDetailsPanel)
- `src/features/chat/components/chat-list/ChatItem.tsx`
- `src/features/chat/components/messages/` (message cards)
- `src/features/admin/components/` (all admin screens)
- `src/features/dashboard/components/` (DashboardCountCard, NavigationCard, SummaryCard)
- `src/shared/components/` (profile, settings elements)
