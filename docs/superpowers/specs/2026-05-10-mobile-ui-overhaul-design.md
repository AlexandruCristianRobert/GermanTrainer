# Mobile UI overhaul — design

Date: 2026-05-10

## Summary

Make the German Trainer SPA usable on phones. The current header menu overflows below ~768px, the Manage screens render an `NDataTable` that doesn't fit, and home grids stay multi-column on narrow viewports. This overhaul introduces a single mobile breakpoint, a hamburger-drawer navigation on mobile (the existing horizontal menu stays on desktop), a stacked compact-list view of the Manage tables on mobile, responsive grid columns, and tightened content padding.

## Motivation

The user wants to use the app on a phone. Today the layout is desktop-first and several components actively break below ~768px viewport width.

## Scope

In scope:

- One breakpoint (`768px`) shared across the app via a `useBreakpoint` composable.
- Responsive navigation in `NavShell.vue` (hamburger drawer ↔ horizontal menu).
- Responsive layout content padding.
- Responsive grid columns on `Home.vue` and `NounsHome.vue`.
- Compact list view of `EntryList.vue` on mobile, used by `ManageNouns.vue` and `ManageAdjectives.vue`.
- Width / wrap fixes on the quiz screens (`GenderQuiz.vue`, `TranslationQuiz.vue`, `SentenceQuiz.vue`) and the setup screens (`nouns/QuizSetup.vue`, `adjectives/QuizSetup.vue`).

Out of scope:

- Theming, dark mode, color or font changes.
- PWA / offline / install prompts.
- Haptics, gestures, native bridges.
- New dependencies — Naive UI already ships `NDrawer`, `NIcon`, `NDropdown`, and responsive grid syntax.

## Design

### Breakpoint and `useBreakpoint`

A new composable `src/composables/useBreakpoint.ts` exposes:

```typescript
export function useBreakpoint(): { isMobile: Ref<boolean> }
```

It calls `window.matchMedia('(max-width: 767.99px)')`, tracks the result in a `ref`, and updates it via the `change` event. Cleans up the listener on unmount. Used by any component that needs to swap layouts. The cutoff `767.99px` matches `<768px = mobile`, `>=768px = desktop` — a common Tailwind/Bootstrap convention.

No global CSS variable is added; the breakpoint constant lives in the composable and is referenced from CSS media queries via the literal value `768px` (kept consistent by code review, not by single-source-of-truth — there are only ~3 media queries app-wide).

### Navigation (`NavShell.vue`)

Above 768px (today's behaviour):

- Header has the title on the left and a horizontal `NMenu` on the right.

Below 768px:

- Header has an `NButton` (text type, ghost) with a `☰` glyph on the left, the title left-aligned with smaller font, and nothing on the right.
- Tapping the icon opens an `NDrawer` from the left, ~260px wide, containing a vertical `NMenu` with the same items.
- Selecting an item in the drawer routes and closes the drawer.
- Header padding becomes `12px 16px` (down from `12px 24px`). The title font size drops to `16px` (from `18px`).

`NLayoutContent` `content-style` becomes responsive:

```typescript
const contentStyle = computed(() => isMobile.value ? 'padding: 12px' : 'padding: 24px')
```

### Home page (`Home.vue`) and Nouns hub (`NounsHome.vue`)

Replace fixed grid columns with Naive UI's responsive shorthand:

```vue
<n-grid cols="1 768:2 1024:3" :x-gap="16" :y-gap="16">
```

`Home.vue` uses `1 768:2 1024:3` (1 col mobile, 2 col tablet, 3 col desktop).
`NounsHome.vue` uses `1 768:2` (1 col mobile, 2 col tablet+).

Add `:y-gap="16"` so cards have vertical breathing room when stacked.

### Manage list (`EntryList.vue`)

`EntryList.vue` gains two optional props:

- `primaryKey?: string` — the field to render large/bold per row.
- `secondaryKey?: string` — the field to render below in muted text.

Defaults: first column key for primary, second for secondary.

Render logic:

- Above 768px: existing `NDataTable` + search input — unchanged.
- Below 768px: render the search input, then a stacked `<div class="entry-row">` per filtered row containing:
  - A primary line: `<strong>{{ row[primaryKey] }}</strong>` — for nouns this is `"{gender} {german}"` (joined upstream by `ManageNouns.vue` via a computed `displayRows`).
  - A secondary line in muted text: `{{ row[secondaryKey] }}`.
  - A small group chip if the row has a `group` field.
  - On the right, an `NDropdown` triggered by an `NButton` (text type, `⋮` glyph) with options:
    - `Edit` → emits `edit` with the row.
    - `Delete` → opens a Naive UI `useDialog().warning(...)` confirm dialog ("Delete this entry?"). On positive click, emits `delete` with the row. (`NPopconfirm` is used in the desktop table; on mobile we use the dialog API instead because it composes more cleanly with `NDropdown`.)
- Pagination is dropped on mobile — the list is short enough (under a few hundred entries) that one long scroll is fine. If the user grows the list past 100 entries, that's a future tweak.

`ManageNouns.vue` passes:

```vue
<EntryList
  :columns="columns"
  :rows="displayRows"
  primary-key="gendered"
  secondary-key="english"
  @edit="onEdit"
  @delete="onDelete"
/>
```

with a new `displayRows` computed: `items.value.map(n => ({ ...n, gendered: \`${n.gender} ${n.german}\` }))`.

`ManageAdjectives.vue` passes `primary-key="german"` and `secondary-key="english"`.

### Quiz screens

`GenderQuiz.vue`:

- Wrap the existing `NCard` in a `<div class="quiz-shell">` with `max-width: 480px; margin: 0 auto`.
- The der/die/das `NSpace` row already wraps; add `:wrap="true"` explicitly and use `size="medium"` for tighter spacing on phones.
- A scoped media query reduces `.german-word` from 40px → 32px below 480px viewport.

`TranslationQuiz.vue` and `SentenceQuiz.vue`:

- Wrap `NCard` in the same `.quiz-shell` div.
- Replace the inline `style="width: 280px"` on `NInput` with a class that does `max-width: 320px; width: 100%`. The input then fills the card on phones and caps at 320px on desktop.
- The 32px / 22px text sizes are kept; they are already readable on small screens.

### Setup screens (`nouns/QuizSetup.vue`, `adjectives/QuizSetup.vue`)

- Existing `style="max-width: 480px"` stays (it caps width on tablet+ while filling on phone).
- The All/None button row gets `:wrap="true"` so the buttons drop to a new line on the narrowest screens (already small, but cheap insurance).
- The custom-count `NInputNumber` gets `style="width: 100%"` so it fills the column on mobile.

### Settings (`ApiKeyForm.vue`)

- Existing `style="max-width: 640px"` already caps the form. No structural change.
- Add `:wrap="true"` to the Save / Test row so the buttons don't squish on phones.

### Testing

Manual checks at 360px, 768px, and 1280px in the browser DevTools device emulator:

- Header: hamburger icon visible <768px, opens drawer; horizontal menu visible ≥768px.
- Drawer item click navigates and closes.
- Home cards: 1 col below 768px, 2 col 768–1024px, 3 col above.
- Manage Nouns: data table at desktop, stacked compact list at mobile, kebab menu opens Edit/Delete actions.
- Quiz screens: card centered, input fills width with cap, no horizontal overflow at 360px.
- Settings: form fills width on mobile, capped on desktop.

No automated tests are added — these are layout changes; the existing 59 composable tests cover behavior. Visual regression testing is out of scope for a personal-use app.

## Files touched

- `src/composables/useBreakpoint.ts` — new.
- `src/components/NavShell.vue` — drawer + responsive header.
- `src/components/EntryList.vue` — mobile compact list view, new props.
- `src/modules/home/Home.vue` — responsive grid.
- `src/modules/nouns/NounsHome.vue` — responsive grid.
- `src/modules/nouns/ManageNouns.vue` — pass primary/secondary keys, add `displayRows`.
- `src/modules/adjectives/ManageAdjectives.vue` — pass primary/secondary keys.
- `src/modules/nouns/GenderQuiz.vue` — quiz-shell wrap, font media query.
- `src/modules/nouns/TranslationQuiz.vue` — quiz-shell wrap, input class.
- `src/modules/adjectives/SentenceQuiz.vue` — quiz-shell wrap, input class.
- `src/modules/nouns/QuizSetup.vue` — minor wrap/width tweaks.
- `src/modules/adjectives/QuizSetup.vue` — same.
- `src/components/ApiKeyForm.vue` — wrap on button row.

No changes to `src/db/types.ts`, the Dexie schema, the API client, or routing.
