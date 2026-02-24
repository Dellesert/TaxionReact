# Mobile Design Standards — Claude Code Audit Prompt

> **Usage:** Paste this entire prompt into Claude Code, then add the component/screen name you want to audit at the end.
> Example: `[paste this prompt] Now audit src/features/tasks/components/lists/TaskItem.tsx`

---

## Your Role

You are auditing a React Native component for **mobile design compliance**. Your job:

1. Read the target component file(s)
2. Compare every style value against the standards below
3. Fix all deviations — change values to match the standard
4. Do NOT change component logic, props, state, or behavior
5. Do NOT change desktop-only styles — only mobile/shared styles (check `!isWideScreen`, `!isDesktop`, or shared code paths)
6. If the component has no mobile-specific branch, apply standards to the shared styles (they affect mobile too)

**Reference files in the project:**
- Design tokens: `src/shared/constants/design-system.constants.ts`
- Theme colors: `src/shared/constants/theme.constants.ts`
- Theme hook: `src/shared/hooks/useTheme.ts`
- Wide screen hook: `src/shared/hooks/useIsWideScreen.ts`
- Screen header: `src/shared/components/common/ScreenHeader.tsx`
- Tab bar: `src/shared/components/navigation/AnimatedTabBar.tsx`

---

## 1. Typography Standards

Use these exact values. Do NOT invent intermediate sizes.

| Role | fontSize | fontWeight | lineHeight | Use for |
|------|----------|------------|------------|---------|
| **Screen title** | 20 | '600' | 28 | Screen header titles, centered |
| **Card title / name** | 15 | '600' | 22 | Card primary text, item names |
| **Section title** | 14 | '600' | 20 | Section headers in lists |
| **Body** | 15 | '400' | 22 | Main content text, descriptions |
| **Body small** | 14 | '400' | 20 | Secondary body text |
| **Secondary text** | 13 | '500' | 18 | Dates, subtitles, meta info |
| **Caption / meta** | 12 | '600' | 16 | Timestamps, small labels |
| **Tiny label / badge** | 11 | '500' | 14 | Uppercase badges, tag text (`letterSpacing: 0.3`) |

### Typography rules:
- **fontSize 15 is the standard body** on mobile (unlike desktop where it's 14)
- **Never use fontSize > 20** in lists or cards (exception: dashboard display numbers)
- **Never use fontSize 17 or 19** — use 16 or 18/20 instead
- **fontWeight '600'** is the default for emphasis. Use '700' only for screen-level titles if needed
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

### Card shadows (native):
```tsx
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.06,
shadowRadius: 4,
elevation: 2,
```
Note: mobile shadows are slightly lighter than desktop (`0.06` vs `0.08`, `radius: 4` vs `8`).

### Card title inside card:
- fontSize: `15`, fontWeight: `'600'`, lineHeight: `22`
- `numberOfLines={1}` or `{2}` — always limit

### Card description/meta inside card:
- fontSize: `13`, lineHeight: `18` — for descriptions and dates
- fontSize: `12`, lineHeight: `16` — for timestamps, small meta
- Icon size for inline meta: `14`

### Card status badge:
- Size: `28x28`, icon: `14`, borderRadius: `14` (circle)

### Card color indicator (left accent bar):
- `width: 4`, `borderRadius: 2`
- Position: absolute, full height of card

### Card internal layout:
- `gap: 8` between major content sections
- Section dividers: use `StyleSheet.hairlineWidth` (not `1`)

---

## 3. Screen Header Standards

All mobile screens use `ScreenHeader` component with custom content.

| Property | Value | Notes |
|----------|-------|-------|
| **Title fontSize** | `20` | Centered |
| **Title fontWeight** | `'600'` | |
| **Subtitle fontSize** | `13` | |
| **paddingHorizontal** | `14` | |
| **Shadow** | `shadowOpacity: 0.06`, `shadowRadius: 2`, `elevation: 4` | |
| **Back button icon** | `"arrow-back"`, size `24` | `color: theme.primary` |
| **Back button padding** | `8` | Wrapped in TouchableOpacity |
| **Side button minWidth** | `40` | Left and right action areas |

### Custom header row pattern:
```tsx
headerRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
}
headerLeft: { width: 100 }    // back button
title: { flex: 1, textAlign: 'center' }
headerRight: { width: 100, flexDirection: 'row', justifyContent: 'flex-end' }
iconButton: { paddingHorizontal: 4 }
```

---

## 4. Touch Target Standards

**Critical for mobile usability.** All interactive elements must meet minimum touch targets.

| Property | Value | Notes |
|----------|-------|-------|
| **Minimum touch target** | `44` | iOS HIG / Material Design standard |
| **Recommended touch target** | `48` | For primary actions |
| **hitSlop (small)** | `8` all sides | For icons that are visually small |
| **hitSlop (medium)** | `12` all sides | Default for most touchables |
| **hitSlop (large)** | `16` all sides | For hard-to-reach elements |

### Rules:
- Every `TouchableOpacity` / `Pressable` must have at least `44px` effective touch area
- Use `hitSlop` to extend tap area when visual size < 44
- Buttons: `minHeight: 44` (not 40 like desktop)
- Icon-only buttons: wrap in `44x44` touchable area minimum

---

## 5. Button Standards

| Property | Value | Notes |
|----------|-------|-------|
| `minHeight` | `44` | Not 40 (that's desktop) |
| `paddingVertical` | `10` | |
| `paddingHorizontal` | `16` | Standard; `12` for compact |
| `borderRadius` | `10` | |
| `borderWidth` | `2` | For outlined buttons |
| Icon size | `18` | |
| Text fontSize | `14`, fontWeight `'700'` | Slightly larger than desktop (13) |
| `gap` | `6` | Between icon and text |

### Button active state (mobile):
```tsx
<TouchableOpacity activeOpacity={0.7}>
```
No hover states on mobile — use `activeOpacity` only.

---

## 6. Badge & Chip Standards

### Status badges:
| Property | Value |
|----------|-------|
| `paddingHorizontal` | `10` |
| `paddingVertical` | `6` |
| `borderRadius` | `10` |
| `gap` | `6` |
| Text fontSize | `13`, fontWeight `'700'` |

### Tag chips (inside cards):
| Property | Value |
|----------|-------|
| `paddingVertical` | `4` |
| `paddingHorizontal` | `8` |
| `borderRadius` | `16` |
| Text fontSize | `11`, textTransform `'uppercase'`, letterSpacing `0.3` |
| Background | `${theme.primary}10` (10% opacity) |

### Filter chips (header bars):
| Property | Value |
|----------|-------|
| `paddingHorizontal` | `12` |
| `paddingVertical` | `8` |
| `borderRadius` | `20` (pill) |
| `borderWidth` | `1` |
| `alignSelf` | `'flex-start'` |

---

## 7. Icon & Avatar Standards

| Element | Size | borderRadius |
|---------|------|--------------|
| **Back button icon** | `24` | — |
| **Tab bar icon** | `26` | — |
| **Inline meta icon** | `14` | — |
| **Card / button icon** | `18` | — |
| **Avatar (card primary)** | `36` | `18` (circle) |
| **Avatar (list secondary)** | `28` | `14` (circle) |
| **Avatar (inline meta)** | `24` | `12` (circle) |
| **Empty state icon** | `48` | — |

---

## 8. Spacing & Layout Standards

Use design system tokens from `design-system.constants.ts`:

| Token | Value | Use for |
|-------|-------|---------|
| `spacing.xs` | `4` | Minimal gaps, icon-to-text micro spacing |
| `spacing.sm` | `8` | Gap between card sections, marginBottom between cards |
| `spacing.md` | `12` | Card padding, internal section gaps |
| `spacing.lg` | `16` | Container paddingHorizontal, list margins |
| `spacing.xl` | `20` | Screen-level padding, modal padding |
| `spacing.xxl` | `24` | Large separators |
| `spacing.xxxl` | `32` | Major section dividers |

### Section headers in lists:
| Property | Value |
|----------|-------|
| `paddingHorizontal` | `16` |
| `paddingTop` | `16` |
| `paddingBottom` | `6` |
| Title fontSize | `14`, fontWeight `'600'` |
| Color | `theme.textSecondary` |

---

## 9. List & Scroll Standards

### FlatList / SectionList configuration:
| Property | Value | Notes |
|----------|-------|-------|
| `contentContainerStyle.paddingHorizontal` | `16` | Standard list padding |
| `contentContainerStyle.paddingTop` | `8` | Space below header |
| `contentContainerStyle.paddingBottom` | `120` (iOS) / `32` (Android) | Space for floating tab bar |
| `onEndReachedThreshold` | `0.3` — `0.5` | Infinite scroll trigger |
| `stickySectionHeadersEnabled` | `false` | Section headers do not stick |

### Pull-to-refresh:
```tsx
refreshControl={
  <RefreshControl
    refreshing={isRefreshing}
    onRefresh={handleRefresh}
    tintColor={theme.primary}
  />
}
```

### Bottom padding pattern:
```tsx
paddingBottom: Platform.OS === 'ios' ? 120 : 32,
```
This accounts for the floating tab bar (~78px + bottom safe area).

---

## 10. Safe Area & Status Bar Standards

### SafeAreaView:
- Use `SafeAreaView` from `react-native-safe-area-context` on all screen-level components
- Typical edges: `edges={['left', 'right']}` — ScreenHeader handles top inset
- Full modal screens: `edges={['top', 'left', 'right', 'bottom']}`

### Status bar:
```tsx
import { StatusBar } from 'expo-status-bar';

<StatusBar style={isDark ? 'light' : 'dark'} />
```
- Use `useFocusEffect` to reset status bar style when navigating back

### Android-specific top padding (modals):
```tsx
paddingTop: Platform.OS === 'android'
  ? (insets.top || StatusBar.currentHeight || 0)
  : insets.top,
```

---

## 11. Modal Standards (Mobile)

| Property | Value | Notes |
|----------|-------|-------|
| `animationType` | `'slide'` | Slides up from bottom |
| `presentationStyle` | `'fullScreen'` | Full screen on mobile |
| `padding` | `20` | Content area padding |
| Keyboard handling | `KeyboardAvoidingView` | Always wrap form modals |

### KeyboardAvoidingView:
```tsx
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
```

---

## 12. Mobile-Specific Patterns

### No hover states:
- Do NOT add `onMouseEnter` / `onMouseLeave` on mobile
- Do NOT add `cursor: 'pointer'` on mobile
- Do NOT add web transitions on mobile
- Use `activeOpacity` on `TouchableOpacity` instead

### Platform branching:
```tsx
const isDesktop = useIsWideScreen(); // true if width >= 768

{isDesktop ? (
  <DesktopLayout />
) : (
  <MobileLayout />
)}
```

### Empty states:
| Property | Value |
|----------|-------|
| Icon size | `48` |
| Icon color | `theme.textSecondary` |
| Title fontSize | `16`, fontWeight `'600'` |
| Subtitle fontSize | `13`, textAlign `'center'`, maxWidth `250` |
| `paddingVertical` | `48` |

### Error banners:
```tsx
{
  paddingHorizontal: 16,
  marginHorizontal: 16,
  marginTop: 8,
  borderRadius: 8,
  flexDirection: 'row',
  gap: 8,
}
```

### Filter/sub-header bar:
```tsx
{
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderBottomWidth: 1,
  borderBottomColor: theme.border,
}
```

---

## 13. Audit Algorithm

When you receive a component to audit, follow these steps:

### Step 1: Read the file
Read the entire component file. Identify all `StyleSheet.create` blocks and inline styles.

### Step 2: Classify the component
Determine what type it is:
- **List card** → Apply Card Standards (section 2)
- **Screen** → Apply Screen Header + List + Safe Area standards (sections 3, 9, 10)
- **Modal / form** → Apply Modal standards (section 11)
- **Shared component** → Apply the most relevant category

### Step 3: Audit typography
For every `fontSize`, `fontWeight`, `lineHeight` in the styles:
- Map it to the typography table (section 1)
- On mobile, body text is `15` (not `14` like desktop)
- Fix any values that don't match
- Pay special attention to fontSize 17 (→ change to 16 or 18) and fontSize 19 (→ change to 20)

### Step 4: Audit spacing
For every `padding`, `margin`, `gap`:
- Check against spacing standards (section 8)
- Card padding should be `12`, not 16 or 20
- marginBottom between cards should be `8`
- List horizontal padding should be `16`
- Gaps should use values from the spacing scale: 4, 6, 8, 10, 12, 16, 20, 24

### Step 5: Audit visual properties
- `borderRadius`: match to standards (12 for cards, 10 for buttons/badges, 20 for chips)
- `borderWidth`: should be `1` for cards (not 2)
- Shadows: use native shadow props (not `boxShadow`)
- Colors: use `theme.*` tokens, never hardcoded colors
- Dividers: use `StyleSheet.hairlineWidth` (not `1`)

### Step 6: Audit touch targets
- Every interactive element must have ≥ `44px` effective touch area
- Add `hitSlop` where visual size is smaller than 44
- Buttons: `minHeight: 44` (not smaller)
- Icon buttons: must be wrapped in ≥ `44x44` touchable

### Step 7: Audit icon/avatar sizes
- Inline meta icons: `14`
- Card / button icons: `18`
- Back button: `24`
- Tab bar: `26`
- Avatars: `24` (inline), `28` (list), `36` (card primary)

### Step 8: Audit safe areas & scroll
- Screen uses `SafeAreaView` with correct `edges`
- Lists have `paddingBottom: 120` (iOS) / `32` (Android) for tab bar
- Pull-to-refresh uses `theme.primary` tint
- Status bar style is set correctly

### Step 9: Verify imports
Ensure the component imports from design system constants:
```tsx
import { spacing, borderRadius, shadows, typography, touchTarget } from '@shared/constants/design-system.constants';
```
Use tokens where possible instead of magic numbers.

---

## 14. Anti-Patterns (Do NOT)

- **Do NOT** use `cursor: 'pointer'` on mobile — it's desktop-only
- **Do NOT** add `onMouseEnter` / `onMouseLeave` on mobile — no hover on touch devices
- **Do NOT** add web transitions (`transitionProperty`, `transitionDuration`) on mobile
- **Do NOT** use `boxShadow` on mobile — use native `shadowColor/Offset/Opacity/Radius/elevation`
- **Do NOT** use padding `16` or `20` on list cards — use `12`
- **Do NOT** use borderWidth `2` on list cards — use `1`
- **Do NOT** use touch targets smaller than `44px` — add `hitSlop` if needed
- **Do NOT** use `minHeight: 40` for buttons on mobile — use `44`
- **Do NOT** use avatars larger than `36` in cards — use `24-36`
- **Do NOT** hardcode colors — use `theme.*` tokens
- **Do NOT** skip `SafeAreaView` on screen components
- **Do NOT** skip `paddingBottom` for floating tab bar clearance
- **Do NOT** change desktop-only code paths — focus on mobile/shared styles
- **Do NOT** add new dependencies or create new files
- **Do NOT** refactor component structure — only fix style values

---

## 15. Final Checklist

Before committing, verify:

- [ ] **Card titles** — `15px`, fontWeight `'600'`
- [ ] **Body text** — `14-15px`, not `16-17px`
- [ ] **Screen title** — `20px`, fontWeight `'600'`, centered
- [ ] **Card padding** — `12px`, not `16-20px`
- [ ] **Card marginBottom** — `8px`, not `12-16px`
- [ ] **Card borderRadius** — `12`, consistent
- [ ] **Card borderWidth** — `1`, not `2`
- [ ] **Card shadows** — `shadowOpacity: 0.06`, `shadowRadius: 4`, `elevation: 2`
- [ ] **List paddingHorizontal** — `16px`
- [ ] **List paddingBottom** — `120px` (iOS) / `32px` (Android)
- [ ] **Touch targets** — all ≥ `44px` (use `hitSlop` if visual size is smaller)
- [ ] **Buttons** — minHeight `44` (not `40`), icon `18`
- [ ] **Inline icons** — `14px` (meta), `18px` (cards/buttons)
- [ ] **Avatars** — `24px` (inline), `28px` (list), `36px` (card)
- [ ] **Badges** — padding `4-8`, fontSize `11-13`
- [ ] **Section gaps** — `8-12px` vertical
- [ ] **No inflated lineHeight** — body `20-22`, meta `16-18`
- [ ] **SafeAreaView** — present on all screens with correct `edges`
- [ ] **Status bar** — style set correctly for theme
- [ ] **No hardcoded colors** — all use `theme.*` tokens
- [ ] **No hover/cursor/transitions** — removed from mobile paths
- [ ] **Native shadows** — no `boxShadow` on mobile
- [ ] **Design token imports** — using `spacing`, `borderRadius`, `shadows`, `touchTarget`
- [ ] **Dividers** — `StyleSheet.hairlineWidth`, not `1`

---

## Already Fixed (Reference Components)

These components are already compliant — use them as reference:
- `src/features/absences/components/AbsenceCard.tsx`
- `src/features/calendar/components/events/EventItem.tsx`
- `src/features/schedules/components/ScheduleEntryRow.tsx`
- `src/features/absences/screens/AbsenceListScreen.tsx`
- `src/features/schedules/screens/ScheduleListScreen.tsx`

## Key Differences from Desktop Standards

| Property | Mobile | Desktop |
|----------|--------|---------|
| Body fontSize | `15` | `14` |
| Button minHeight | `44` | `40` |
| Button text fontSize | `14` | `13` |
| Card shadow opacity | `0.06` | `0.08` |
| Card shadow radius | `4` | `8` |
| Shadow type | Native (`shadowColor` etc.) | Web (`boxShadow`) |
| Hover states | None — use `activeOpacity` | `onMouseEnter/Leave` + translateY |
| Cursor | Not applicable | `cursor: 'pointer'` |
| Transitions | Not applicable | `transitionProperty/Duration` |
| List paddingBottom | `120` (iOS) / `32` (Android) | `16-24` |
| Touch target min | `44` | No strict minimum |
| Avatar in cards | `36` | `28-32` |
