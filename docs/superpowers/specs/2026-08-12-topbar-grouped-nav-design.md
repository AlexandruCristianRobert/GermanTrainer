# Top bar · grouped navigation — design

Date: 2026-08-12 · Status: approved by user

## Problem

`src/components/NavShell.vue` hardcodes a flat list of 13 links. Five modules
(Konjunktiv, Passiv, Writing tutor, Mock C1, Schreiben) are missing from the
bar entirely, and at laptop widths even the 13 overflow. The desktop bar and
the mobile drawer duplicate the same hardcoded list.

## Decision

Dropdown category groups (click-open), one row, with this taxonomy:

| Group (label shown) | Items (label · route) |
|---|---|
| **Wörter** | Nouns `nouns` · Adjectives `adjectives` · Declension `declension` |
| **Verben** | Verbs `verbs` · Dativ `dative` · Konjunktiv I `konjunktiv` · Passiv `passiv` |
| **Kleine Wörter** | Prepositions `prepositions` · Da-Compounds `dacompounds` · Direction Words `directionwords` |
| **Prüfung** | Sprechen `sprechen` · Schreiben (B2) `schreiben` · Writing tutor (C1) `writing` · Mock C1 `simulator-c1` |

Top-level text links: **Sätze** `sentence`, **History** `history`.
Right side: Settings becomes a gear icon button beside the theme toggle and
burger. Home lives on the logo mark only; the "Home" nav item is removed.
Category labels are German; module labels keep their existing English names
with the existing German `de` subtitles in the drawer (the mixed register the
current bar already uses).

## Data model — `src/data/nav.ts` (new)

```ts
export interface NavLeaf { route: string; label: string; de?: string; aliases?: string[] }
export interface NavGroup { id: string; label: string; items: NavLeaf[] }
export const NAV_GROUPS: NavGroup[]     // the four groups above, in order
export const NAV_SINGLES: NavLeaf[]     // Sätze, History
export const NAV_SETTINGS: NavLeaf      // Settings (gear)
export function navMatches(routeName: string, leaf: NavLeaf): boolean
```

`navMatches` = `routeName === leaf.route`, or `routeName.startsWith(leaf.route + '-')`,
or any alias matches by the same two rules. `aliases` exists for route
families whose names do not share the leaf's route prefix (the implementer
greps `router.ts` per leaf and fills them; e.g. the Da-Compounds drill
routes if they are not `dacompounds-*`-named). This replaces the current
`name.split('-')[0]` heuristic, which silently mismatches hyphenated route
names like `simulator-c1`.

Both the desktop bar and the drawer render exclusively from these exports.

## Desktop interaction

- Category buttons: click toggles the panel; exactly one panel open at a
  time; closes on outside click, Escape (focus returns to the trigger), or
  route navigation.
- Active state: a category gets the existing accent underline when
  `navMatches` hits one of its items; inside an open panel the active item
  is highlighted. Singles keep the current underline behavior.
- Panel styling: bespoke, on the existing tokens (paper background,
  hairline border, soft shadow, 2px radius), absolutely positioned under
  the trigger, above the sticky bar's z-index. No naive-ui NDropdown — the
  bar is hand-styled and the stock panel would look foreign.
- A11y: `aria-haspopup="menu"` + `aria-expanded` on triggers,
  `role="menu"`/`role="menuitem"` in panels.

## Mobile drawer

Same data: one section per group — mono uppercase micro-header (the
`mark-sub` style) then the group's items with their `de` subtitles — followed
by the singles and Settings. Non-collapsing; the drawer scrolls. The 720px
burger breakpoint stays.

## Testing

- `tests/data/nav.test.ts`: groups non-empty and uniquely labeled; no route
  appears twice across groups/singles/settings; every nav route + alias
  resolves against the real router (`router.getRoutes()`); **coverage guard**:
  every named route in the router maps (via `navMatches`) to some nav leaf —
  so a future module missing from the bar fails CI. Known intentional
  exceptions (e.g. `home`) are listed explicitly in the test.
- `tests/modules/NavShell.test.ts`: mount test — clicking a category opens
  its panel; clicking an item navigates and closes; active classes track the
  route; Escape closes.

## Out of scope

Hover-open menus, any visual redesign beyond the bar, route renames, Home
page changes, drawer accordion behavior.
