# Cheatsheet Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the naive-ui–based verbs cheatsheet with an editorial "Grammatik-Atelier" page — custom-styled, content-tripled, with Fraunces/Source Serif/JetBrains Mono via @fontsource, sage-green vowel-change highlights, marginal Callout/ConjugationTable components, and an IntersectionObserver scroll-spy nav.

**Architecture:** Pure custom CSS (no naive-ui inside the page). Four small sub-components (`ChapterNav`, `ConjugationTable`, `Callout`, `VowelShift`) each with a single purpose. A shared `cheatsheet.css` for variables, fonts, and base typography. The 12 chapter sections live as static markup in the rewritten `CheatSheet.vue` (readable in source, hand-tunable). Fonts self-hosted via `@fontsource` packages.

**Tech Stack:** Vue 3 (script setup), TypeScript strict, Vite, vitest, @vue/test-utils, @fontsource/{fraunces,source-serif-4,jetbrains-mono}.

**Spec:** `docs/superpowers/specs/2026-05-23-cheatsheet-redesign-design.md`.

---

## File Structure

| File | Responsibility |
|---|---|
| `package.json` | (modify) add `@fontsource/fraunces`, `@fontsource/source-serif-4`, `@fontsource/jetbrains-mono` |
| `src/main.ts` | (modify) import the three font CSS entrypoints |
| `src/modules/verbs/cheatsheet/cheatsheet.css` | CSS variables, base typography, noise overlay, print styles |
| `src/modules/verbs/cheatsheet/VowelShift.vue` | Inline span highlight, single-letter pulse on first view |
| `src/modules/verbs/cheatsheet/Callout.vue` | Beachte / Ausnahme / Beispiele boxes (3 kinds) |
| `src/modules/verbs/cheatsheet/ConjugationTable.vue` | Framed mono table with caption notch |
| `src/modules/verbs/cheatsheet/ChapterNav.vue` | Left rail / mobile pill bar, scroll-spy, search filter |
| `src/modules/verbs/CheatSheet.vue` | (rewrite) Page shell + 12 chapter sections as static markup |
| `tests/modules/verbs/cheatsheet/VowelShift.test.ts` | Highlight class, slot rendering, `from` tooltip |
| `tests/modules/verbs/cheatsheet/Callout.test.ts` | Three kinds → correct labels + color classes |
| `tests/modules/verbs/cheatsheet/ConjugationTable.test.ts` | Caption, rows, optional vowel highlight |
| `tests/modules/verbs/cheatsheet/ChapterNav.test.ts` | Renders chapters; emits `select` and `update:searchQuery` |
| `tests/modules/verbs/CheatSheet.test.ts` | Page mounts; ChapterNav receives the 12 chapters |

---

### Task 1: Install fonts via @fontsource

**Files:**
- Modify: `package.json`
- Modify: `src/main.ts`

- [ ] **Step 1: Install the three font packages**

Run:
```bash
npm install @fontsource/fraunces @fontsource/source-serif-4 @fontsource/jetbrains-mono
```

Expected: packages added to `dependencies` in `package.json` with no install errors.

- [ ] **Step 2: Import only the specific weights we use in `src/main.ts`**

Open `src/main.ts` and add these imports at the very top (before the existing `import { createApp }` line):

```ts
import '@fontsource/fraunces/300.css'
import '@fontsource/fraunces/400.css'
import '@fontsource/fraunces/600.css'
import '@fontsource/fraunces/400-italic.css'
import '@fontsource/source-serif-4/400.css'
import '@fontsource/source-serif-4/600.css'
import '@fontsource/source-serif-4/400-italic.css'
import '@fontsource/jetbrains-mono/400.css'
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS, no errors.

- [ ] **Step 4: Verify build succeeds and font files are bundled**

Run: `npm run build`
Expected: PASS. Output should include woff2 assets in `dist/assets/`.

- [ ] **Step 5: Commit**

```bash
git checkout -- dist/ 2>/dev/null
git add package.json package-lock.json src/main.ts
git commit -m "build(verbs): self-host Fraunces, Source Serif 4, JetBrains Mono via @fontsource"
```

---

### Task 2: Shared cheatsheet.css — variables, fonts, base utilities

**Files:**
- Create: `src/modules/verbs/cheatsheet/cheatsheet.css`

- [ ] **Step 1: Create the CSS file with variables, base styles, and the noise overlay**

```css
/* ─── Grammatik-Atelier — shared variables, base typography, utilities ─── */

:root {
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'Source Serif 4', 'Source Serif Pro', Georgia, serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;

  --paper: #F7F2E8;
  --paper-deep: #EFE8D8;
  --ink: #1A1814;
  --ink-soft: #3D3A33;
  --mute: #8C8576;
  --rule: #2A2620;

  --sage: #5C7A52;
  --clay: #A03B2B;
  --ochre: #C29242;
  --cobalt: #2C5282;
}

/* Scoped to the cheatsheet page — apply via .grammatik root class */
.grammatik {
  position: relative;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 17px;
  line-height: 1.72;
  min-height: 100vh;
  padding: 32px;
}

/* Paper grain — a fine SVG noise at 3% opacity. Sourced inline as data URL. */
.grammatik::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.03;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}

.grammatik > * {
  position: relative;
  z-index: 1;
}

/* Headlines */
.grammatik h1, .grammatik h2, .grammatik h3 {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--ink);
  line-height: 1.15;
  margin: 0;
}

.grammatik p {
  margin: 0 0 1em 0;
}

.grammatik em { font-style: italic; color: var(--ink-soft); }
.grammatik strong { font-weight: 600; color: var(--ink); }

/* Mono inline (verb forms inside prose) */
.grammatik code,
.grammatik .mono {
  font-family: var(--font-mono);
  font-size: 0.88em;
  color: var(--ink);
  background: none;
  padding: 0;
}

/* Drop cap on lead paragraphs */
.grammatik .dropcap-p::first-letter {
  font-family: var(--font-display);
  font-weight: 300;
  font-style: italic;
  font-size: 4.5em;
  line-height: 0.85;
  float: left;
  margin: 6px 8px 0 0;
  color: var(--sage);
}

/* Horizontal rule */
.grammatik .rule {
  border: 0;
  border-top: 1px solid var(--rule);
  width: 80px;
  margin: 16px 0 28px 0;
}

/* Utility — screen-reader only */
.grammatik .sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Reduce motion globally for the page */
@media (prefers-reduced-motion: reduce) {
  .grammatik *, .grammatik *::before, .grammatik *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Print styles */
@media print {
  .grammatik { background: white; padding: 0; }
  .grammatik::before { display: none; }
  .grammatik [data-print-hide] { display: none !important; }
  .grammatik .chapter { page-break-before: always; }
  .grammatik .chapter:first-of-type { page-break-before: auto; }
  * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}
```

- [ ] **Step 2: Verify the file parses (typecheck passes; CSS is static)**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/verbs/cheatsheet/cheatsheet.css
git commit -m "feat(cheatsheet): base CSS — variables, paper grain, drop caps, print styles"
```

---

### Task 3: VowelShift component

**Files:**
- Create: `src/modules/verbs/cheatsheet/VowelShift.vue`
- Create: `tests/modules/verbs/cheatsheet/VowelShift.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VowelShift from '../../../../src/modules/verbs/cheatsheet/VowelShift.vue'

describe('VowelShift', () => {
  it('renders the slot content inside a span with class vowel-shift', () => {
    const wrapper = mount(VowelShift, { slots: { default: 'ä' } })
    const span = wrapper.find('span.vowel-shift')
    expect(span.exists()).toBe(true)
    expect(span.text()).toBe('ä')
  })

  it('puts the from prop on the title attribute for tooltip', () => {
    const wrapper = mount(VowelShift, {
      props: { from: 'fahren' },
      slots: { default: 'ä' }
    })
    expect(wrapper.find('span.vowel-shift').attributes('title')).toBe('fahren')
  })

  it('renders without title when from is not provided', () => {
    const wrapper = mount(VowelShift, { slots: { default: 'ä' } })
    expect(wrapper.find('span.vowel-shift').attributes('title')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npx vitest run tests/modules/verbs/cheatsheet/VowelShift.test.ts`
Expected: FAIL — component file not found.

- [ ] **Step 3: Implement the component**

```vue
<script setup lang="ts">
defineProps<{ from?: string }>()
</script>

<template>
  <span class="vowel-shift" :title="from">
    <slot />
  </span>
</template>

<style scoped>
.vowel-shift {
  color: var(--sage);
  font-weight: 600;
  border-bottom: 1px dotted var(--sage);
  cursor: help;
  animation: pulse 0.5s ease-out 0.4s 1 both;
  display: inline-block;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
</style>
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npx vitest run tests/modules/verbs/cheatsheet/VowelShift.test.ts`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/modules/verbs/cheatsheet/VowelShift.vue tests/modules/verbs/cheatsheet/VowelShift.test.ts
git commit -m "feat(cheatsheet): VowelShift inline highlight component"
```

---

### Task 4: Callout component

**Files:**
- Create: `src/modules/verbs/cheatsheet/Callout.vue`
- Create: `tests/modules/verbs/cheatsheet/Callout.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Callout from '../../../../src/modules/verbs/cheatsheet/Callout.vue'

describe('Callout', () => {
  it('renders kind=note with BEACHTE label and note class', () => {
    const wrapper = mount(Callout, {
      props: { kind: 'note' },
      slots: { default: 'Inhalt' }
    })
    expect(wrapper.find('.callout-label').text()).toBe('BEACHTE')
    expect(wrapper.find('.callout').classes()).toContain('callout--note')
  })

  it('renders kind=exception with AUSNAHME label and exception class', () => {
    const wrapper = mount(Callout, {
      props: { kind: 'exception' },
      slots: { default: 'Inhalt' }
    })
    expect(wrapper.find('.callout-label').text()).toBe('AUSNAHME')
    expect(wrapper.find('.callout').classes()).toContain('callout--exception')
  })

  it('renders kind=example with BEISPIELE label and example class', () => {
    const wrapper = mount(Callout, {
      props: { kind: 'example' },
      slots: { default: 'Inhalt' }
    })
    expect(wrapper.find('.callout-label').text()).toBe('BEISPIELE')
    expect(wrapper.find('.callout').classes()).toContain('callout--example')
  })

  it('respects label prop override', () => {
    const wrapper = mount(Callout, {
      props: { kind: 'note', label: 'CUSTOM' },
      slots: { default: 'x' }
    })
    expect(wrapper.find('.callout-label').text()).toBe('CUSTOM')
  })

  it('renders the slot content in .callout-body', () => {
    const wrapper = mount(Callout, {
      props: { kind: 'note' },
      slots: { default: '<p>Mein Text</p>' }
    })
    expect(wrapper.find('.callout-body').html()).toContain('<p>Mein Text</p>')
  })
})
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npx vitest run tests/modules/verbs/cheatsheet/Callout.test.ts`
Expected: FAIL — component file not found.

- [ ] **Step 3: Implement the component**

```vue
<script setup lang="ts">
import { computed } from 'vue'

type Kind = 'note' | 'exception' | 'example'

const props = defineProps<{
  kind: Kind
  label?: string
}>()

const DEFAULT_LABELS: Record<Kind, string> = {
  note: 'BEACHTE',
  exception: 'AUSNAHME',
  example: 'BEISPIELE'
}

const resolvedLabel = computed(() => props.label ?? DEFAULT_LABELS[props.kind])
</script>

<template>
  <aside class="callout" :class="`callout--${kind}`">
    <div class="callout-label">{{ resolvedLabel }}</div>
    <div class="callout-body">
      <slot />
    </div>
  </aside>
</template>

<style scoped>
.callout {
  --accent: var(--mute);
  border-left: 4px solid var(--accent);
  padding: 12px 0 12px 18px;
  margin: 18px 0;
  background: linear-gradient(to right, color-mix(in srgb, var(--accent) 6%, transparent), transparent 60%);
}

.callout--note      { --accent: var(--ochre); }
.callout--exception { --accent: var(--clay); }
.callout--example   { --accent: var(--cobalt); }

.callout-label {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.18em;
  color: var(--accent);
  margin-bottom: 6px;
}

.callout-body {
  font-size: 15px;
  line-height: 1.6;
  color: var(--ink-soft);
}

.callout-body :deep(p:last-child) { margin-bottom: 0; }
.callout-body :deep(em),
.callout--example .callout-body { font-style: italic; }
</style>
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npx vitest run tests/modules/verbs/cheatsheet/Callout.test.ts`
Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/modules/verbs/cheatsheet/Callout.vue tests/modules/verbs/cheatsheet/Callout.test.ts
git commit -m "feat(cheatsheet): Callout component — Beachte / Ausnahme / Beispiele"
```

---

### Task 5: ConjugationTable component

**Files:**
- Create: `src/modules/verbs/cheatsheet/ConjugationTable.vue`
- Create: `tests/modules/verbs/cheatsheet/ConjugationTable.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConjugationTable from '../../../../src/modules/verbs/cheatsheet/ConjugationTable.vue'

describe('ConjugationTable', () => {
  const rows = [
    { person: 'ich', form: 'spiele' },
    { person: 'du', form: 'spielst' },
    { person: 'er', form: 'spielt' }
  ]

  it('renders the verb in the caption', () => {
    const wrapper = mount(ConjugationTable, { props: { verb: 'spielen', rows } })
    expect(wrapper.find('.conj-caption').text()).toContain('spielen')
  })

  it('renders default caption label KONJUGATION', () => {
    const wrapper = mount(ConjugationTable, { props: { verb: 'spielen', rows } })
    expect(wrapper.find('.conj-caption').text()).toContain('KONJUGATION')
  })

  it('respects custom caption', () => {
    const wrapper = mount(ConjugationTable, {
      props: { verb: 'spielen', rows, caption: 'PRÄSENS' }
    })
    expect(wrapper.find('.conj-caption').text()).toContain('PRÄSENS')
  })

  it('renders one row per data entry with person + form', () => {
    const wrapper = mount(ConjugationTable, { props: { verb: 'spielen', rows } })
    const rowEls = wrapper.findAll('.conj-row')
    expect(rowEls).toHaveLength(3)
    expect(rowEls[0].text()).toContain('ich')
    expect(rowEls[0].text()).toContain('spiele')
    expect(rowEls[2].text()).toContain('er')
    expect(rowEls[2].text()).toContain('spielt')
  })

  it('emits HTML through the form field so VowelShift markup is preserved', () => {
    const wrapper = mount(ConjugationTable, {
      props: {
        verb: 'fahren',
        rows: [{ person: 'du', form: 'f<span class="vh">ä</span>hrst' }]
      }
    })
    expect(wrapper.find('.conj-form').html()).toContain('class="vh"')
  })
})
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npx vitest run tests/modules/verbs/cheatsheet/ConjugationTable.test.ts`
Expected: FAIL — component file not found.

- [ ] **Step 3: Implement the component**

```vue
<script setup lang="ts">
interface Row {
  person: string
  form: string
}

defineProps<{
  verb: string
  rows: Row[]
  caption?: string
}>()
</script>

<template>
  <figure class="conj-table">
    <figcaption class="conj-caption">
      <span class="conj-caption-label">{{ caption ?? 'KONJUGATION' }}</span>
      <span class="conj-caption-verb">{{ verb }}</span>
    </figcaption>
    <div class="conj-rows">
      <div v-for="(r, i) in rows" :key="i" class="conj-row">
        <span class="conj-person">{{ r.person }}</span>
        <span class="conj-form" v-html="r.form" />
      </div>
    </div>
  </figure>
</template>

<style scoped>
.conj-table {
  margin: 22px 0;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: color-mix(in srgb, var(--paper-deep) 60%, var(--paper) 40%);
  position: relative;
}

.conj-caption {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 16px 8px;
  border-bottom: 1px solid var(--mute);
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.15em;
  color: var(--ink-soft);
}

.conj-caption-label { color: var(--mute); }
.conj-caption-verb {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 16px;
  letter-spacing: 0;
  color: var(--ink);
}

.conj-rows { padding: 10px 16px 14px; }

.conj-row {
  display: grid;
  grid-template-columns: 60px 1fr;
  align-items: baseline;
  padding: 4px 0;
  transition: background-color 150ms ease;
  border-radius: 1px;
}

.conj-row:hover { background: var(--paper-deep); }

.conj-person {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--ink-soft);
  font-size: 14px;
}

.conj-form {
  font-family: var(--font-mono);
  font-size: 14.5px;
  color: var(--ink);
  line-height: 1.55;
}
</style>
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npx vitest run tests/modules/verbs/cheatsheet/ConjugationTable.test.ts`
Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/modules/verbs/cheatsheet/ConjugationTable.vue tests/modules/verbs/cheatsheet/ConjugationTable.test.ts
git commit -m "feat(cheatsheet): ConjugationTable framed mono table component"
```

---

### Task 6: ChapterNav component

**Files:**
- Create: `src/modules/verbs/cheatsheet/ChapterNav.vue`
- Create: `tests/modules/verbs/cheatsheet/ChapterNav.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChapterNav from '../../../../src/modules/verbs/cheatsheet/ChapterNav.vue'

const chapters = [
  { id: 'ch-1', numeral: 'I',  titleDe: 'Schwache Verben', titleEn: 'Weak verbs' },
  { id: 'ch-2', numeral: 'II', titleDe: 'Starke Verben',   titleEn: 'Strong verbs' }
]

describe('ChapterNav', () => {
  it('renders one nav item per chapter with numeral and German title', () => {
    const wrapper = mount(ChapterNav, { props: { chapters, searchQuery: '' } })
    const items = wrapper.findAll('.chapter-nav-item')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('I')
    expect(items[0].text()).toContain('Schwache Verben')
  })

  it('emits select with chapter id when an item is clicked', async () => {
    const wrapper = mount(ChapterNav, { props: { chapters, searchQuery: '' } })
    await wrapper.findAll('.chapter-nav-item')[1].trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual(['ch-2'])
  })

  it('emits update:searchQuery when search input changes', async () => {
    const wrapper = mount(ChapterNav, { props: { chapters, searchQuery: '' } })
    const input = wrapper.find('input.chapter-nav-search')
    await input.setValue('stark')
    expect(wrapper.emitted('update:searchQuery')?.[0]).toEqual(['stark'])
  })

  it('dims non-matching chapters when searchQuery is set', () => {
    const wrapper = mount(ChapterNav, { props: { chapters, searchQuery: 'stark' } })
    const items = wrapper.findAll('.chapter-nav-item')
    expect(items[0].classes()).toContain('dim')
    expect(items[1].classes()).not.toContain('dim')
  })

  it('also matches the English title in search', () => {
    const wrapper = mount(ChapterNav, { props: { chapters, searchQuery: 'weak' } })
    const items = wrapper.findAll('.chapter-nav-item')
    expect(items[0].classes()).not.toContain('dim')
    expect(items[1].classes()).toContain('dim')
  })
})
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npx vitest run tests/modules/verbs/cheatsheet/ChapterNav.test.ts`
Expected: FAIL — component file not found.

- [ ] **Step 3: Implement the component**

```vue
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

export interface Chapter {
  id: string
  numeral: string
  titleDe: string
  titleEn: string
}

const props = defineProps<{
  chapters: Chapter[]
  searchQuery: string
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', value: string): void
  (e: 'select', id: string): void
}>()

const activeId = ref<string | null>(null)

function matchesQuery(c: Chapter, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  return c.titleDe.toLowerCase().includes(needle) ||
         c.titleEn.toLowerCase().includes(needle)
}

const items = computed(() =>
  props.chapters.map(c => ({
    ...c,
    dim: !matchesQuery(c, props.searchQuery)
  }))
)

function onSelect(id: string) {
  emit('select', id)
}

function onSearchInput(e: Event) {
  const v = (e.target as HTMLInputElement).value
  emit('update:searchQuery', v)
}

// IntersectionObserver scroll-spy
let observer: IntersectionObserver | null = null
onMounted(() => {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return
  observer = new IntersectionObserver(
    entries => {
      const visible = entries.filter(e => e.isIntersecting)
      if (visible.length > 0) {
        // pick the topmost visible
        visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        activeId.value = visible[0].target.id
      }
    },
    { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
  )
  for (const c of props.chapters) {
    const el = document.getElementById(c.id)
    if (el) observer.observe(el)
  }
})
onUnmounted(() => observer?.disconnect())
</script>

<template>
  <nav class="chapter-nav" data-print-hide>
    <div class="chapter-nav-head">INHALT</div>
    <label class="sr-only" for="chapter-search">Search chapters</label>
    <input
      id="chapter-search"
      class="chapter-nav-search"
      type="search"
      placeholder="Suche…"
      :value="searchQuery"
      @input="onSearchInput"
    />
    <ol class="chapter-nav-list">
      <li
        v-for="c in items"
        :key="c.id"
        class="chapter-nav-item"
        :class="{ active: c.id === activeId, dim: c.dim }"
        :aria-current="c.id === activeId ? 'location' : undefined"
        @click="onSelect(c.id)"
      >
        <span class="chapter-nav-numeral">{{ c.numeral }}</span>
        <span class="chapter-nav-title">{{ c.titleDe }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.chapter-nav {
  position: sticky;
  top: 96px;
  width: 240px;
  font-size: 14px;
}

.chapter-nav-head {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.2em;
  color: var(--mute);
  margin-bottom: 12px;
}

.chapter-nav-search {
  width: 100%;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--rule);
  padding: 6px 0;
  font-family: var(--font-body);
  font-style: italic;
  color: var(--ink);
  outline: none;
  margin-bottom: 18px;
  font-size: 14px;
}

.chapter-nav-search:focus { border-bottom-color: var(--sage); }
.chapter-nav-search::placeholder { color: var(--mute); font-style: italic; }

.chapter-nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.chapter-nav-item {
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: 8px;
  align-items: baseline;
  padding: 8px 12px;
  border-left: 2px solid transparent;
  cursor: pointer;
  color: var(--ink-soft);
  transition: opacity 200ms ease, border-color 280ms ease-out, color 200ms ease;
}

.chapter-nav-item:hover { color: var(--ink); }

.chapter-nav-item.active {
  border-left-color: var(--sage);
  color: var(--ink);
}

.chapter-nav-item.dim { opacity: 0.3; }

.chapter-nav-numeral {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 16px;
  color: var(--ink-soft);
}

.chapter-nav-item.active .chapter-nav-numeral { color: var(--sage); }

.chapter-nav-title {
  font-family: var(--font-body);
  line-height: 1.3;
}

/* Mobile: horizontal pill bar */
@media (max-width: 767px) {
  .chapter-nav {
    position: sticky;
    top: 0;
    width: 100%;
    background: var(--paper);
    border-bottom: 1px solid var(--rule);
    padding: 8px 0;
    z-index: 10;
  }
  .chapter-nav-head { display: none; }
  .chapter-nav-search { margin-bottom: 8px; }
  .chapter-nav-list {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .chapter-nav-list::-webkit-scrollbar { display: none; }
  .chapter-nav-item {
    display: inline-flex;
    gap: 6px;
    flex-shrink: 0;
    padding: 8px 14px;
    border: 1px solid var(--rule);
    border-left: 1px solid var(--rule);
    border-radius: 999px;
    background: var(--paper);
    white-space: nowrap;
    min-height: 44px;
  }
  .chapter-nav-item.active {
    border-left-color: var(--rule);
    border-color: var(--sage);
    background: color-mix(in srgb, var(--sage) 10%, var(--paper));
  }
}
</style>
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npx vitest run tests/modules/verbs/cheatsheet/ChapterNav.test.ts`
Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/modules/verbs/cheatsheet/ChapterNav.vue tests/modules/verbs/cheatsheet/ChapterNav.test.ts
git commit -m "feat(cheatsheet): ChapterNav left rail / mobile pills with scroll-spy + search"
```

---

### Task 7: Rewrite CheatSheet.vue — page shell + chapters I–IV

**Files:**
- Modify (rewrite): `src/modules/verbs/CheatSheet.vue`
- Create: `tests/modules/verbs/CheatSheet.test.ts`

This task focuses on the page scaffolding and the first four chapters. Chapters V–XII follow in Task 8 to keep diffs reviewable.

- [ ] **Step 1: Write the page-level test**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CheatSheet from '../../../src/modules/verbs/CheatSheet.vue'

describe('CheatSheet page', () => {
  it('mounts and renders the grammatik root', () => {
    const wrapper = mount(CheatSheet)
    expect(wrapper.find('.grammatik').exists()).toBe(true)
  })

  it('passes 12 chapters to ChapterNav', () => {
    const wrapper = mount(CheatSheet)
    // ChapterNav lists 12 items
    expect(wrapper.findAll('.chapter-nav-item')).toHaveLength(12)
  })

  it('renders 12 chapter sections with sequential ids', () => {
    const wrapper = mount(CheatSheet)
    const sections = wrapper.findAll('section.chapter')
    expect(sections).toHaveLength(12)
    sections.forEach((s, i) => {
      expect(s.attributes('id')).toBe(`ch-${i + 1}`)
    })
  })
})
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npx vitest run tests/modules/verbs/CheatSheet.test.ts`
Expected: FAIL — old `CheatSheet.vue` doesn't have `.grammatik` root or 12 sections with `ch-N` ids.

- [ ] **Step 3: Rewrite the file — page shell + chapters I–IV**

Replace the entire contents of `src/modules/verbs/CheatSheet.vue` with:

```vue
<script setup lang="ts">
import { nextTick, ref } from 'vue'
import './cheatsheet/cheatsheet.css'
import ChapterNav, { type Chapter } from './cheatsheet/ChapterNav.vue'
import ConjugationTable from './cheatsheet/ConjugationTable.vue'
import Callout from './cheatsheet/Callout.vue'
import VowelShift from './cheatsheet/VowelShift.vue'

const chapters: Chapter[] = [
  { id: 'ch-1',  numeral: 'I',    titleDe: 'Schwache Verben',         titleEn: 'Weak (regular) verbs' },
  { id: 'ch-2',  numeral: 'II',   titleDe: 'Starke Verben',           titleEn: 'Strong verbs' },
  { id: 'ch-3',  numeral: 'III',  titleDe: 'Mischverben',             titleEn: 'Mixed verbs' },
  { id: 'ch-4',  numeral: 'IV',   titleDe: 'Modalverben',             titleEn: 'Modal verbs' },
  { id: 'ch-5',  numeral: 'V',    titleDe: 'Trennbar & untrennbar',   titleEn: 'Separable vs inseparable prefixes' },
  { id: 'ch-6',  numeral: 'VI',   titleDe: 'Partizip II',             titleEn: 'Past participle formation' },
  { id: 'ch-7',  numeral: 'VII',  titleDe: 'Haben oder Sein',         titleEn: 'Auxiliary in compound tenses' },
  { id: 'ch-8',  numeral: 'VIII', titleDe: 'Imperativ',               titleEn: 'Commands' },
  { id: 'ch-9',  numeral: 'IX',   titleDe: 'Konjunktiv II',           titleEn: 'Subjunctive II' },
  { id: 'ch-10', numeral: 'X',    titleDe: 'Vorgangspassiv',          titleEn: 'Process passive' },
  { id: 'ch-11', numeral: 'XI',   titleDe: 'Reflexive Verben',        titleEn: 'Reflexive verbs' },
  { id: 'ch-12', numeral: 'XII',  titleDe: 'Verben mit Dativ',        titleEn: 'Dative verbs' }
]

const searchQuery = ref('')

function onSelect(id: string) {
  if (typeof document === 'undefined') return
  const el = document.getElementById(id)
  if (!el) return
  nextTick(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
</script>

<template>
  <div class="grammatik">
    <header class="grammatik-header" data-print-hide>
      <span class="grammatik-mark">GRAMMATIK · KONJUGATION</span>
    </header>

    <div class="grammatik-layout">
      <ChapterNav
        :chapters="chapters"
        :search-query="searchQuery"
        @update:search-query="searchQuery = $event"
        @select="onSelect"
      />

      <main class="grammatik-main">
        <!-- ───────── I. Schwache Verben ───────── -->
        <section id="ch-1" class="chapter">
          <div class="chapter-numeral">I</div>
          <h2 class="chapter-title">Schwache Verben</h2>
          <p class="chapter-subtitle">Regular (weak) verbs — predictable endings on an unchanging stem</p>
          <hr class="rule" />

          <p class="dropcap-p">
            Weak verbs form the bedrock of German verbal morphology. The stem stays the same throughout
            the present tense; only the ending changes. If you can conjugate <code>spielen</code>, you can
            conjugate hundreds of others — <code>kaufen</code>, <code>machen</code>, <code>lieben</code>,
            <code>kochen</code>, <code>wohnen</code>, <code>fragen</code>, the whole regular crew.
          </p>

          <div class="two-col">
            <ConjugationTable
              verb="spielen"
              caption="PRÄSENS"
              :rows="[
                { person: 'ich', form: 'spiel<span class=&quot;ending&quot;>e</span>' },
                { person: 'du',  form: 'spiel<span class=&quot;ending&quot;>st</span>' },
                { person: 'er',  form: 'spiel<span class=&quot;ending&quot;>t</span>' },
                { person: 'wir', form: 'spiel<span class=&quot;ending&quot;>en</span>' },
                { person: 'ihr', form: 'spiel<span class=&quot;ending&quot;>t</span>' },
                { person: 'sie', form: 'spiel<span class=&quot;ending&quot;>en</span>' }
              ]"
            />
            <ConjugationTable
              verb="arbeiten"
              caption="PRÄSENS — Bindevokal"
              :rows="[
                { person: 'ich', form: 'arbeit<span class=&quot;ending&quot;>e</span>' },
                { person: 'du',  form: 'arbeit<span class=&quot;ending&quot;>est</span>' },
                { person: 'er',  form: 'arbeit<span class=&quot;ending&quot;>et</span>' },
                { person: 'wir', form: 'arbeit<span class=&quot;ending&quot;>en</span>' },
                { person: 'ihr', form: 'arbeit<span class=&quot;ending&quot;>et</span>' },
                { person: 'sie', form: 'arbeit<span class=&quot;ending&quot;>en</span>' }
              ]"
            />
          </div>

          <Callout kind="note">
            <p><strong>Bindevokal -e-.</strong> When the stem ends in <code>-d</code>, <code>-t</code>,
              <code>-chn</code>, <code>-ffn</code>, <code>-tm</code> or <code>-dn</code>, slip an extra
              <code>-e-</code> in before <code>-st</code> and <code>-t</code>. Examples:
              <code>arbeiten → du arbeitest, er arbeitet</code>;
              <code>warten → du wartest, er wartet</code>;
              <code>finden → du findest, er findet</code>;
              <code>öffnen → du öffnest, ihr öffnet</code>;
              <code>atmen → du atmest, er atmet</code>.</p>
          </Callout>

          <Callout kind="exception">
            <p><strong>Stems in -s / -ß / -z / -tz / -x.</strong> The du-form already ends in a sibilant,
              so it takes only <code>-t</code>, not <code>-st</code>. Examples:
              <code>tanzen → du tanz<strong>t</strong></code>;
              <code>heißen → du heiß<strong>t</strong></code>;
              <code>sitzen → du sitz<strong>t</strong></code>;
              <code>reisen → du reis<strong>t</strong></code>.</p>
          </Callout>

          <Callout kind="example">
            <p>
              "Ich arbeite jeden Tag in der Bibliothek."<br />
              "Du tanzt sehr gut."<br />
              "Wir wohnen in Berlin."
            </p>
          </Callout>
        </section>

        <!-- ───────── II. Starke Verben ───────── -->
        <section id="ch-2" class="chapter">
          <div class="chapter-numeral">II</div>
          <h2 class="chapter-title">Starke Verben</h2>
          <p class="chapter-subtitle">Strong verbs — vowel changes in du and er/sie/es</p>
          <hr class="rule" />

          <p class="dropcap-p">
            Strong verbs shift their stem vowel in the 2nd- and 3rd-person singular. The pattern is
            predictable once you've learned which letter swaps for which — and crucially, the change
            shows up <em>only</em> in du and er/sie/es. Everywhere else, the stem is normal.
          </p>

          <h3 class="pattern-heading">a → ä</h3>
          <p>
            <code>fahren → du f<VowelShift from="fahren">ä</VowelShift>hrst, er f<VowelShift from="fahren">ä</VowelShift>hrt</code>
            · <code>schlafen → schl<VowelShift>ä</VowelShift>ft</code>
            · <code>tragen → tr<VowelShift>ä</VowelShift>gt</code>
            · <code>waschen → w<VowelShift>ä</VowelShift>scht</code>
            · <code>halten → h<VowelShift>ä</VowelShift>lt</code>
            · <code>lassen → l<VowelShift>ä</VowelShift>sst</code>.
          </p>

          <h3 class="pattern-heading">au → äu</h3>
          <p>
            <code>laufen → du l<VowelShift from="laufen">äu</VowelShift>fst, er l<VowelShift from="laufen">äu</VowelShift>ft</code>
            · <code>saufen → s<VowelShift>äu</VowelShift>ft</code>.
          </p>

          <h3 class="pattern-heading">e → i</h3>
          <p>
            <code>geben → du g<VowelShift from="geben">i</VowelShift>bst, er g<VowelShift from="geben">i</VowelShift>bt</code>
            · <code>nehmen → n<VowelShift>i</VowelShift>mmt</code>
            · <code>helfen → h<VowelShift>i</VowelShift>lft</code>
            · <code>sprechen → spr<VowelShift>i</VowelShift>cht</code>
            · <code>essen → <VowelShift>i</VowelShift>sst</code>
            · <code>treffen → tr<VowelShift>i</VowelShift>fft</code>
            · <code>werfen → w<VowelShift>i</VowelShift>rft</code>.
          </p>

          <h3 class="pattern-heading">e → ie</h3>
          <p>
            <code>sehen → du s<VowelShift from="sehen">ie</VowelShift>hst, er s<VowelShift from="sehen">ie</VowelShift>ht</code>
            · <code>lesen → l<VowelShift>ie</VowelShift>st</code>
            · <code>empfehlen → empf<VowelShift>ie</VowelShift>hlt</code>
            · <code>stehlen → st<VowelShift>ie</VowelShift>hlt</code>.
          </p>

          <Callout kind="exception">
            <p><strong>Looks strong but isn't.</strong> Some common verbs you'd expect to shift, don't —
              <code>kommen → er kommt</code>, <code>gehen → er geht</code>, <code>schwimmen → er schwimmt</code>.
              Memorise these so you don't over-apply the rules.</p>
          </Callout>

          <Callout kind="example">
            <p>
              "Er fährt nach Hamburg."<br />
              "Sie liest gerade ein Buch."<br />
              "Du gibst mir das Salz, bitte."
            </p>
          </Callout>
        </section>

        <!-- ───────── III. Mischverben ───────── -->
        <section id="ch-3" class="chapter">
          <div class="chapter-numeral">III</div>
          <h2 class="chapter-title">Mischverben</h2>
          <p class="chapter-subtitle">Mixed verbs — irregular stem, weak endings</p>
          <hr class="rule" />

          <p class="dropcap-p">
            A small but important group. In the Präteritum and Partizip II, the stem vowel changes (like
            a strong verb), but the endings stay weak (<code>-te</code>, <code>-t</code>). They're
            unpredictable — just memorise them.
          </p>

          <ConjugationTable
            verb="Mischverben"
            caption="STAMMFORMEN — selected"
            :rows="[
              { person: 'bringen', form: 'br<span class=&quot;vh&quot;>a</span>chte · ge·br<span class=&quot;vh&quot;>a</span>cht' },
              { person: 'denken',  form: 'd<span class=&quot;vh&quot;>a</span>chte · ge·d<span class=&quot;vh&quot;>a</span>cht' },
              { person: 'wissen',  form: 'w<span class=&quot;vh&quot;>u</span>sste · ge·w<span class=&quot;vh&quot;>u</span>sst' },
              { person: 'kennen',  form: 'k<span class=&quot;vh&quot;>a</span>nnte · ge·k<span class=&quot;vh&quot;>a</span>nnt' },
              { person: 'nennen',  form: 'n<span class=&quot;vh&quot;>a</span>nnte · ge·n<span class=&quot;vh&quot;>a</span>nnt' },
              { person: 'brennen', form: 'br<span class=&quot;vh&quot;>a</span>nnte · ge·br<span class=&quot;vh&quot;>a</span>nnt' },
              { person: 'rennen',  form: 'r<span class=&quot;vh&quot;>a</span>nnte · ge·r<span class=&quot;vh&quot;>a</span>nnt' },
              { person: 'senden',  form: 's<span class=&quot;vh&quot;>a</span>ndte · ge·s<span class=&quot;vh&quot;>a</span>ndt' }
            ]"
          />

          <Callout kind="note">
            <p>The Präsens of mixed verbs is fully regular — the irregularity only shows up in past forms.
              <code>bringen → ich bringe, du bringst, er bringt</code>. The surprise is <code>brachte</code> in
              Präteritum and <code>gebracht</code> as Partizip II.</p>
          </Callout>
        </section>

        <!-- ───────── IV. Modalverben ───────── -->
        <section id="ch-4" class="chapter">
          <div class="chapter-numeral">IV</div>
          <h2 class="chapter-title">Modalverben</h2>
          <p class="chapter-subtitle">The six modal verbs and their full conjugation grid</p>
          <hr class="rule" />

          <p class="dropcap-p">
            Six verbs, all irregular in the singular present, all using <code>-te</code> in the Präteritum.
            Modals usually pair with a bare infinitive at the end of the clause: <code>Ich muss arbeiten</code>.
            In compound tenses with another infinitive, they form a "double infinitive" rather than a
            normal Partizip II.
          </p>

          <div class="modal-grid">
            <table class="modal-table">
              <thead>
                <tr>
                  <th></th>
                  <th>können</th><th>müssen</th><th>dürfen</th>
                  <th>sollen</th><th>wollen</th><th>mögen</th>
                </tr>
              </thead>
              <tbody>
                <tr><th>ich</th><td>kann</td><td>muss</td><td>darf</td><td>soll</td><td>will</td><td>mag</td></tr>
                <tr><th>du</th><td>kannst</td><td>musst</td><td>darfst</td><td>sollst</td><td>willst</td><td>magst</td></tr>
                <tr><th>er/sie/es</th><td>kann</td><td>muss</td><td>darf</td><td>soll</td><td>will</td><td>mag</td></tr>
                <tr><th>wir</th><td>können</td><td>müssen</td><td>dürfen</td><td>sollen</td><td>wollen</td><td>mögen</td></tr>
                <tr><th>ihr</th><td>könnt</td><td>müsst</td><td>dürft</td><td>sollt</td><td>wollt</td><td>mögt</td></tr>
                <tr><th>sie/Sie</th><td>können</td><td>müssen</td><td>dürfen</td><td>sollen</td><td>wollen</td><td>mögen</td></tr>
                <tr class="row-sep"><th>Präteritum</th><td>konnte</td><td>musste</td><td>durfte</td><td>sollte</td><td>wollte</td><td>mochte</td></tr>
                <tr><th>Konjunktiv II</th><td>könnte</td><td>müsste</td><td>dürfte</td><td>sollte</td><td>wollte</td><td>möchte</td></tr>
                <tr><th>Partizip II</th><td>gekonnt</td><td>gemusst</td><td>gedurft</td><td>gesollt</td><td>gewollt</td><td>gemocht</td></tr>
              </tbody>
            </table>
          </div>

          <Callout kind="note">
            <p><strong>Doppel-Infinitiv.</strong> When a modal joins another verb in Perfekt or
              Plusquamperfekt, both verbs end up as infinitives — no <code>ge-</code> Partizip II.
              Compare: <em>Ich habe es gewollt</em> (modal alone, with Partizip II) vs
              <em>Ich habe arbeiten müssen</em> (modal + infinitive, double infinitive).</p>
          </Callout>

          <Callout kind="note">
            <p><strong>"möchte" is technically Konjunktiv II of mögen</strong>, but it functions as its own
              modal in everyday use — <em>"Ich möchte einen Kaffee, bitte."</em> Treat it as the polite
              equivalent of <em>"Ich will"</em>.</p>
          </Callout>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.grammatik-header {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--rule);
  margin-bottom: 32px;
}

.grammatik-mark {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.2em;
  color: var(--ink-soft);
}

.grammatik-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 48px;
  max-width: 1160px;
  margin: 0 auto;
}

.grammatik-main {
  max-width: 720px;
}

.chapter {
  position: relative;
  margin: 96px 0;
  scroll-margin-top: 96px;
  animation: chapter-in 400ms ease-out both;
}

.chapter:first-of-type { margin-top: 16px; }

@keyframes chapter-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.chapter-numeral {
  position: absolute;
  top: -8px;
  left: -88px;
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 300;
  font-size: 96px;
  line-height: 1;
  color: var(--sage);
  opacity: 0.85;
}

.chapter-title {
  font-size: 44px;
  font-weight: 600;
  line-height: 1.1;
  margin-bottom: 4px;
}

.chapter-subtitle {
  font-size: 18px;
  font-style: italic;
  color: var(--ink-soft);
  margin: 0 0 0 0;
}

.pattern-heading {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  margin: 22px 0 10px 0;
  color: var(--sage);
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.modal-grid { overflow-x: auto; margin: 22px 0; }

.modal-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  font-family: var(--font-mono);
}

.modal-table th, .modal-table td {
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px dotted var(--mute);
}

.modal-table th {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--ink-soft);
  font-weight: 400;
}

.modal-table thead th {
  font-family: var(--font-display);
  font-style: normal;
  font-weight: 600;
  color: var(--ink);
  border-bottom: 1px solid var(--rule);
}

.modal-table .row-sep th, .modal-table .row-sep td {
  border-top: 1px solid var(--rule);
  padding-top: 12px;
}

/* Highlight ending letters inside conj forms */
:deep(.conj-form .ending) {
  color: var(--sage);
  font-weight: 600;
}

/* Highlight vowel changes inside conj forms (.vh shorthand) */
:deep(.conj-form .vh) {
  color: var(--sage);
  font-weight: 600;
}

@media (max-width: 959px) {
  .grammatik-layout {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .chapter-numeral {
    position: static;
    margin-bottom: 12px;
    font-size: 64px;
  }
  .chapter-title { font-size: 32px; }
  .two-col { grid-template-columns: 1fr; }
}
</style>
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS — CheatSheet tests + all previously-passing tests still green.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/verbs/CheatSheet.vue tests/modules/verbs/CheatSheet.test.ts
git commit -m "feat(cheatsheet): page shell + chapters I–IV (weak / strong / mixed / modal)"
```

---

### Task 8: Add chapters V–VIII

**Files:**
- Modify: `src/modules/verbs/CheatSheet.vue`

- [ ] **Step 1: Insert chapters V–VIII after the chapter IV `</section>` tag**

Find the line `</section>` that closes chapter IV (`<section id="ch-4">`), and insert the following four chapter blocks immediately after it (before the closing `</main>`):

```vue
        <!-- ───────── V. Trennbar / Untrennbar ───────── -->
        <section id="ch-5" class="chapter">
          <div class="chapter-numeral">V</div>
          <h2 class="chapter-title">Trennbar &amp; untrennbar</h2>
          <p class="chapter-subtitle">Separable vs. inseparable prefixes</p>
          <hr class="rule" />

          <p class="dropcap-p">
            Many German verbs come with a prefix glued to the infinitive. Some of them <em>split off</em>
            in main clauses and migrate to the end of the sentence; others stay locked to the stem
            forever. The rule is mechanical once you know the lists.
          </p>

          <div class="prefix-split">
            <div>
              <h3 class="pattern-heading">Trennbar — they split</h3>
              <p class="mono-block">
                ab- · an- · auf- · aus- · ein- · mit- · nach- · vor- · zu- · fern- · weg- · zurück- ·
                hin- · her- · fest-
              </p>
              <p>
                Stressed on the prefix. In main clauses, the prefix flies to the end:<br />
                <em>Ich <strong>stehe</strong> um 7 Uhr <strong>auf</strong>.</em><br />
                Partizip II inserts <code>ge-</code> between prefix and stem:
                <code>aufgestanden</code>, <code>angerufen</code>, <code>eingekauft</code>.
              </p>
            </div>
            <div>
              <h3 class="pattern-heading">Untrennbar — they don't</h3>
              <p class="mono-block">
                be- · emp- · ent- · er- · ge- · ver- · zer- · miss-
              </p>
              <p>
                Unstressed prefix. Stays attached forever:<br />
                <em>Ich <strong>verkaufe</strong> das Auto.</em><br />
                Partizip II drops <code>ge-</code>: <code>verkauft</code>, <code>besucht</code>,
                <code>begonnen</code>, <code>empfohlen</code>.
              </p>
            </div>
          </div>

          <Callout kind="exception">
            <p><strong>Both, depending on stress:</strong> <code>durch-</code>, <code>über-</code>,
              <code>um-</code>, <code>unter-</code>, <code>voll-</code>, <code>wieder-</code>.
              The meaning shifts with the stress. Compare
              <em>umfahren</em> (run over — separable, stress on um-) vs
              <em>umfahren</em> (drive around — inseparable, stress on the stem).</p>
          </Callout>

          <Callout kind="example">
            <p>
              "Wann <strong>fängt</strong> der Film <strong>an</strong>?" (separable)<br />
              "Ich <strong>verstehe</strong> die Frage nicht." (inseparable)<br />
              "Sie hat mich gestern <strong>angerufen</strong>." (separable Partizip II)
            </p>
          </Callout>
        </section>

        <!-- ───────── VI. Partizip II ───────── -->
        <section id="ch-6" class="chapter">
          <div class="chapter-numeral">VI</div>
          <h2 class="chapter-title">Partizip II</h2>
          <p class="chapter-subtitle">How the past participle is built, branch by branch</p>
          <hr class="rule" />

          <p class="dropcap-p">
            Almost every verb falls into one of five branches. Pick the right branch, apply the
            template, and you're done. The hard part — strong-verb stems — has to be memorised, but the
            shape of the participle is rule-based.
          </p>

          <h3 class="pattern-heading">Weak (regular)</h3>
          <p>
            Template: <code>ge- + stem + -t</code>.
            <code>spielen → gespielt</code> ·
            <code>kaufen → gekauft</code> ·
            <code>arbeiten → gearbeitet</code> (Bindevokal -e-) ·
            <code>fragen → gefragt</code> ·
            <code>lieben → geliebt</code> ·
            <code>tanzen → getanzt</code>.
          </p>

          <h3 class="pattern-heading">Strong</h3>
          <p>
            Template: <code>ge- + (often vowel-changed) stem + -en</code>.
            <code>gehen → gegangen</code> ·
            <code>sehen → gesehen</code> ·
            <code>schreiben → geschrieben</code> ·
            <code>finden → gefunden</code> ·
            <code>nehmen → genommen</code> ·
            <code>sprechen → gesprochen</code>.
          </p>

          <h3 class="pattern-heading">Separable</h3>
          <p>
            Template: <code>prefix + ge + stem + ending</code> — <code>ge</code> goes <em>inside</em>
            the verb. <code>aufstehen → aufgestanden</code> · <code>einkaufen → eingekauft</code> ·
            <code>anrufen → angerufen</code>.
          </p>

          <h3 class="pattern-heading">Inseparable</h3>
          <p>
            Template: <code>stem + ending</code> — <strong>no</strong> <code>ge-</code>.
            <code>verkaufen → verkauft</code> · <code>besuchen → besucht</code> ·
            <code>vergessen → vergessen</code> · <code>gewinnen → gewonnen</code>.
          </p>

          <h3 class="pattern-heading">-ieren verbs</h3>
          <p>
            Template: <code>stem + -t</code>, no <code>ge-</code>.
            <code>studieren → studiert</code> · <code>fotografieren → fotografiert</code> ·
            <code>passieren → passiert</code> · <code>diskutieren → diskutiert</code>.
          </p>
        </section>

        <!-- ───────── VII. Haben oder Sein ───────── -->
        <section id="ch-7" class="chapter">
          <div class="chapter-numeral">VII</div>
          <h2 class="chapter-title">Haben oder Sein</h2>
          <p class="chapter-subtitle">Picking the auxiliary in Perfekt and Plusquamperfekt</p>
          <hr class="rule" />

          <p class="dropcap-p">
            Two-thirds of all German verbs take <code>haben</code>. The remaining third — verbs of
            motion and change-of-state, plus a handful of stubborn irregulars — take <code>sein</code>.
            Get this wrong and natives will notice immediately.
          </p>

          <h3 class="pattern-heading">Sein — verbs of motion (where to/from?)</h3>
          <p>
            <code>gehen → ist gegangen</code> · <code>kommen → ist gekommen</code> ·
            <code>fahren → ist gefahren</code> · <code>fliegen → ist geflogen</code> ·
            <code>laufen → ist gelaufen</code> · <code>schwimmen → ist geschwommen</code> ·
            <code>steigen → ist gestiegen</code> · <code>reisen → ist gereist</code>.
          </p>

          <h3 class="pattern-heading">Sein — verbs of state change</h3>
          <p>
            <code>aufstehen → ist aufgestanden</code> · <code>einschlafen → ist eingeschlafen</code> ·
            <code>sterben → ist gestorben</code> · <code>werden → ist geworden</code> ·
            <code>wachsen → ist gewachsen</code>.
          </p>

          <h3 class="pattern-heading">Sein — always-sein irregulars</h3>
          <p>
            <code>sein → ist gewesen</code> · <code>bleiben → ist geblieben</code> ·
            <code>passieren → ist passiert</code> · <code>geschehen → ist geschehen</code>.
          </p>

          <Callout kind="exception">
            <p><strong>Tricky cases.</strong> <code>schwimmen</code> takes <em>sein</em> for movement
              (<em>"Ich bin durch den See geschwommen"</em>) but <em>haben</em> for the activity itself
              in some regional usage (<em>"Ich habe geschwommen"</em>). When in doubt, use <em>sein</em>.</p>
          </Callout>
        </section>

        <!-- ───────── VIII. Imperativ ───────── -->
        <section id="ch-8" class="chapter">
          <div class="chapter-numeral">VIII</div>
          <h2 class="chapter-title">Imperativ</h2>
          <p class="chapter-subtitle">Commands — du, ihr, Sie</p>
          <hr class="rule" />

          <p class="dropcap-p">
            German has three command forms, each derived from a different person of the Präsens. The du
            form drops its <code>-st</code>, the ihr form is identical to its Präsens, and the Sie form
            simply inverts subject and verb.
          </p>

          <ConjugationTable
            verb="spielen"
            caption="IMPERATIV"
            :rows="[
              { person: 'du',  form: 'spiel<span class=&quot;ending&quot;>!</span>' },
              { person: 'ihr', form: 'spielt!' },
              { person: 'Sie', form: 'spielen Sie!' }
            ]"
          />

          <Callout kind="note">
            <p><strong>e → i / ie carries through</strong> into the du-imperativ for strong verbs:
              <code>geben → g<VowelShift>i</VowelShift>b!</code> ·
              <code>nehmen → n<VowelShift>i</VowelShift>mm!</code> ·
              <code>sehen → s<VowelShift>ie</VowelShift>h!</code> ·
              <code>lesen → l<VowelShift>ie</VowelShift>s!</code> ·
              <code>essen → <VowelShift>i</VowelShift>ss!</code>.</p>
          </Callout>

          <Callout kind="exception">
            <p><strong>a → ä does NOT carry through.</strong> The du-imperativ drops the umlaut:
              <code>fahren → fahr!</code> (not <em>fähr!</em>) ·
              <code>schlafen → schlaf!</code> ·
              <code>laufen → lauf!</code> ·
              <code>tragen → trag!</code>.</p>
          </Callout>

          <Callout kind="note">
            <p><strong>Bindevokal verbs</strong> keep their -e in the du-imperativ:
              <code>arbeiten → arbeite!</code> · <code>warten → warte!</code> ·
              <code>antworten → antworte!</code>.</p>
          </Callout>

          <Callout kind="example">
            <p>
              "Komm her!" (du)<br />
              "Geht nach Hause!" (ihr)<br />
              "Setzen Sie sich, bitte!" (Sie)
            </p>
          </Callout>
        </section>
```

You'll also need to add this CSS rule to the `<style scoped>` block at the bottom of `CheatSheet.vue`, just before the `@media (max-width: 959px)` block:

```css
.prefix-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin: 22px 0;
}

.mono-block {
  font-family: var(--font-mono);
  font-size: 13.5px;
  color: var(--ink-soft);
  line-height: 1.7;
  padding: 10px 14px;
  background: var(--paper-deep);
  border-radius: 2px;
}

@media (max-width: 959px) {
  .prefix-split { grid-template-columns: 1fr; }
}
```

(The second `@media` block can be merged into the existing one in Step 3 of Task 7 — append the prefix-split rule there.)

- [ ] **Step 2: Update CheatSheet test to expect 12 sections (already does) — no changes needed**

Test from Task 7 already verifies 12 chapters, but only 4 exist after Task 7. After this task adds 4 more, the test still won't pass until Task 9 ships the remaining 4. Run the test to verify it currently fails as expected:

Run: `npx vitest run tests/modules/verbs/CheatSheet.test.ts`
Expected: Still FAILS on the "12 sections" assertion (8 of 12 present). Tests for the other components still PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/verbs/CheatSheet.vue
git commit -m "feat(cheatsheet): chapters V–VIII (prefixes, partizip II, aux, imperativ)"
```

---

### Task 9: Add chapters IX–XII (final 4)

**Files:**
- Modify: `src/modules/verbs/CheatSheet.vue`

- [ ] **Step 1: Insert the four remaining chapters after chapter VIII's closing `</section>`**

```vue
        <!-- ───────── IX. Konjunktiv II ───────── -->
        <section id="ch-9" class="chapter">
          <div class="chapter-numeral">IX</div>
          <h2 class="chapter-title">Konjunktiv II</h2>
          <p class="chapter-subtitle">Subjunctive II — the conditional / polite mood</p>
          <hr class="rule" />

          <p class="dropcap-p">
            Two forms are in active competition: the proper Konjunktiv II built on the Präteritum stem
            (<em>wäre</em>, <em>hätte</em>, <em>käme</em>, <em>ginge</em>) and the analytic
            <code>würde + Infinitiv</code>. For most verbs, native speakers use the würde-form. For a
            small set of common verbs, the proper K2 is preferred.
          </p>

          <h3 class="pattern-heading">Use real K2 forms for these</h3>
          <ConjugationTable
            verb="Common real-K2 forms"
            caption="KONJUNKTIV II — ich-form"
            :rows="[
              { person: 'sein',    form: 'wäre' },
              { person: 'haben',   form: 'hätte' },
              { person: 'werden',  form: 'würde' },
              { person: 'können',  form: 'könnte' },
              { person: 'müssen',  form: 'müsste' },
              { person: 'dürfen',  form: 'dürfte' },
              { person: 'sollen',  form: 'sollte' },
              { person: 'wollen',  form: 'wollte' },
              { person: 'mögen',   form: 'möchte' },
              { person: 'wissen',  form: 'wüsste' },
              { person: 'gehen',   form: 'ginge' },
              { person: 'kommen',  form: 'käme' },
              { person: 'geben',   form: 'gäbe' },
              { person: 'finden',  form: 'fände' },
              { person: 'lassen',  form: 'ließe' },
              { person: 'bleiben', form: 'bliebe' },
              { person: 'tun',     form: 'täte' }
            ]"
          />

          <Callout kind="note">
            <p><strong>For everything else, use <code>würde + Infinitiv</code>.</strong>
              <em>"Ich würde das nie machen"</em> sounds natural;
              <em>"Ich machte das nie"</em> reads as Präteritum, not as conditional. The würde-form
              eliminates the ambiguity.</p>
          </Callout>

          <Callout kind="example">
            <p>
              "Wenn ich mehr Zeit <strong>hätte</strong>, würde ich Spanisch lernen."<br />
              "<strong>Könntest</strong> du das Fenster schließen?"<br />
              "Ich <strong>würde</strong> gern Kaffee trinken."
            </p>
          </Callout>
        </section>

        <!-- ───────── X. Vorgangspassiv ───────── -->
        <section id="ch-10" class="chapter">
          <div class="chapter-numeral">X</div>
          <h2 class="chapter-title">Vorgangspassiv</h2>
          <p class="chapter-subtitle">The process passive — werden + Partizip II</p>
          <hr class="rule" />

          <p class="dropcap-p">
            German has two passive constructions. The <em>Vorgangspassiv</em> describes a process
            (something is being done) and is built with <code>werden</code> + Partizip II. The
            <em>Zustandspassiv</em> describes a state (it is already done) and uses
            <code>sein</code> + Partizip II — that's a stylistic distinction we'll skip here.
          </p>

          <ConjugationTable
            verb="fragen"
            caption="VORGANGSPASSIV — er-form across tenses"
            :rows="[
              { person: 'Präsens',          form: 'wird gefragt' },
              { person: 'Präteritum',       form: 'wurde gefragt' },
              { person: 'Perfekt',          form: 'ist gefragt <span class=&quot;vh&quot;>worden</span>' },
              { person: 'Plusquamperfekt',  form: 'war gefragt <span class=&quot;vh&quot;>worden</span>' },
              { person: 'Futur I',          form: 'wird gefragt werden' },
              { person: 'Konjunktiv II',    form: 'würde gefragt werden' }
            ]"
          />

          <Callout kind="exception">
            <p><strong>worden, not geworden.</strong> When <em>werden</em> is the auxiliary of the
              passive, its Partizip II contracts to <code>worden</code> — not <code>geworden</code>.
              <code>geworden</code> is reserved for <em>werden</em> used as a main verb ("to become").
              Compare: <em>"Er ist Arzt geworden"</em> (became a doctor) vs <em>"Er ist gefragt worden"</em>
              (was asked).</p>
          </Callout>

          <Callout kind="note">
            <p><strong>Only transitive verbs.</strong> A normal passive needs an accusative object to
              promote to subject. Intransitive verbs (<em>gehen</em>, <em>schlafen</em>) can't form a
              normal passive — German allows an "impersonal passive" for some of these
              (<em>"Hier wird getanzt"</em>), but it's a marked construction.</p>
          </Callout>

          <Callout kind="example">
            <p>
              "Das Haus <strong>wird</strong> gebaut." (Präsens passive)<br />
              "Der Brief <strong>wurde</strong> gestern geschrieben." (Präteritum passive)<br />
              "Das Buch <strong>ist</strong> übersetzt <strong>worden</strong>." (Perfekt passive)
            </p>
          </Callout>
        </section>

        <!-- ───────── XI. Reflexive Verben ───────── -->
        <section id="ch-11" class="chapter">
          <div class="chapter-numeral">XI</div>
          <h2 class="chapter-title">Reflexive Verben</h2>
          <p class="chapter-subtitle">Reflexive verbs — accusative and dative pronouns</p>
          <hr class="rule" />

          <p class="dropcap-p">
            Many German verbs require a reflexive pronoun where English wouldn't use one. The pronoun
            agrees with the subject and is accusative by default — but a small set of verbs take a
            dative reflexive pronoun instead, especially when there's already an accusative object.
          </p>

          <div class="two-col">
            <ConjugationTable
              verb="Akkusativ"
              caption="REFLEXIV (acc)"
              :rows="[
                { person: 'ich', form: 'mich' },
                { person: 'du',  form: 'dich' },
                { person: 'er',  form: 'sich' },
                { person: 'wir', form: 'uns' },
                { person: 'ihr', form: 'euch' },
                { person: 'sie', form: 'sich' }
              ]"
            />
            <ConjugationTable
              verb="Dativ"
              caption="REFLEXIV (dat)"
              :rows="[
                { person: 'ich', form: '<span class=&quot;vh&quot;>mir</span>' },
                { person: 'du',  form: '<span class=&quot;vh&quot;>dir</span>' },
                { person: 'er',  form: 'sich' },
                { person: 'wir', form: 'uns' },
                { person: 'ihr', form: 'euch' },
                { person: 'sie', form: 'sich' }
              ]"
            />
          </div>

          <Callout kind="note">
            <p><strong>Accusative reflexive verbs:</strong> sich freuen, sich erinnern, sich entscheiden,
              sich beeilen, sich treffen, sich setzen, sich ärgern, sich entschuldigen, sich beschweren,
              sich kümmern, sich gewöhnen, sich verlieben, sich interessieren, sich bewerben,
              sich anmelden.</p>
          </Callout>

          <Callout kind="note">
            <p><strong>Dative reflexive — when there's already an acc object:</strong>
              <em>"Ich putze <strong>mir</strong> die Zähne"</em> (the teeth = acc, so the pronoun is dat).
              Also: <em>sich (etwas) vorstellen</em> (imagine), <em>sich (etwas) merken</em> (remember),
              <em>sich (etwas) leisten</em> (afford), <em>sich (etwas) überlegen</em> (consider).</p>
          </Callout>

          <Callout kind="note">
            <p><strong>Verb + sich + preposition</strong> patterns memorise the case the preposition
              triggers:<br />
              <em>sich freuen <strong>auf</strong></em> + acc (look forward to) ·
              <em>sich freuen <strong>über</strong></em> + acc (be happy about) ·
              <em>sich erinnern <strong>an</strong></em> + acc ·
              <em>sich interessieren <strong>für</strong></em> + acc ·
              <em>sich kümmern <strong>um</strong></em> + acc ·
              <em>sich entscheiden <strong>für/gegen</strong></em> + acc.</p>
          </Callout>
        </section>

        <!-- ───────── XII. Verben mit Dativ ───────── -->
        <section id="ch-12" class="chapter">
          <div class="chapter-numeral">XII</div>
          <h2 class="chapter-title">Verben mit Dativ</h2>
          <p class="chapter-subtitle">Verbs whose object is in the dative case</p>
          <hr class="rule" />

          <p class="dropcap-p">
            Most transitive verbs take an accusative object — but a tight list of common verbs demand
            <em>dative</em> instead. There's no pattern to it; you simply have to memorise the list.
            Get it wrong (<em>"Ich helfe dich"</em>) and you'll sound foreign immediately.
          </p>

          <h3 class="pattern-heading">Pure-dative verbs</h3>
          <p>
            <code>helfen</code> · <code>danken</code> · <code>gefallen</code> · <code>gehören</code> ·
            <code>passieren</code> · <code>schmecken</code> · <code>antworten</code> ·
            <code>gratulieren</code> · <code>folgen</code> · <code>vertrauen</code> ·
            <code>widersprechen</code> · <code>zuhören</code>.
          </p>
          <p>
            <em>"Ich helfe <strong>dir</strong>."</em>
            (not <em>dich</em>) ·
            <em>"Das gefällt <strong>mir</strong>."</em>
            (literally "that pleases me") ·
            <em>"Folge <strong>mir</strong>!"</em>
          </p>

          <h3 class="pattern-heading">Ditransitive — both dative and accusative</h3>
          <p>
            <code>geben</code> · <code>bringen</code> · <code>schenken</code> · <code>schicken</code> ·
            <code>schreiben</code> · <code>zeigen</code> · <code>erklären</code> · <code>sagen</code> ·
            <code>empfehlen</code> · <code>kaufen</code>.
          </p>
          <p>
            The recipient is dative, the thing is accusative:<br />
            <em>"Ich gebe <strong>dem Kind</strong> (dat) <strong>einen Apfel</strong> (acc)."</em><br />
            <em>"Sie schenkt <strong>ihrem Freund</strong> (dat) <strong>eine Uhr</strong> (acc)."</em>
          </p>

          <Callout kind="exception">
            <p><strong>Common mistake:</strong> English speakers say <em>"I helped him"</em> with
              accusative-shaped intuition. In German, helfen takes dative — <em>"Ich habe <strong>ihm</strong>
              geholfen"</em>, not <em>"ihn"</em>. Same trap with <code>danken</code>, <code>folgen</code>,
              <code>gehören</code>.</p>
          </Callout>

          <Callout kind="example">
            <p>
              "Das Buch <strong>gehört mir</strong>."<br />
              "Sie hat <strong>ihrer Mutter</strong> ein schönes Geschenk gekauft."<br />
              "Folgen Sie <strong>dem Schild</strong>!"
            </p>
          </Callout>
        </section>
```

- [ ] **Step 2: Run the page test — should now pass with all 12 sections**

Run: `npx vitest run tests/modules/verbs/CheatSheet.test.ts`
Expected: PASS — all 3 page-level tests green.

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: PASS across the board.

- [ ] **Step 4: Typecheck and build**

```bash
npm run typecheck
npm run build
```

Expected: both PASS.

- [ ] **Step 5: Clean up dist/ and commit**

```bash
git checkout -- dist/ 2>/dev/null
git add src/modules/verbs/CheatSheet.vue
git commit -m "feat(cheatsheet): chapters IX–XII (konjunktiv II, passiv, reflexive, dative)"
```

---

### Task 10: Manual visual QA — start dev server and inspect

**Files:** none (manual)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: server starts; URL printed (usually http://localhost:5173).

- [ ] **Step 2: Open in browser and visit `/verbs/cheatsheet`**

Verify:
- [ ] Cream paper background visible
- [ ] Fraunces displays on chapter titles (serif with distinctive italics)
- [ ] Source Serif 4 reads body copy
- [ ] JetBrains Mono renders verb forms / mono blocks
- [ ] Drop cap appears on each chapter's first paragraph (sage green letter)
- [ ] Sage-green vowel highlights visible in `fährt`, `gibt`, `nimmt`, etc.
- [ ] Callouts render in three colors (ochre / clay / cobalt) with the correct labels (BEACHTE / AUSNAHME / BEISPIELE)
- [ ] Chapter numerals (I, II, III…) appear oversized in italic display
- [ ] Conjugation tables have notched captions and mono content
- [ ] Modal table (chapter IV) scrolls horizontally if needed
- [ ] Two-column layouts (Schwache Verben tables, prefixes) work on desktop
- [ ] Left rail nav is sticky on scroll and highlights the section currently in view
- [ ] Clicking a nav item smooth-scrolls to that section
- [ ] Search field dims non-matching chapters

- [ ] **Step 3: Test mobile layout (DevTools, < 768px)**

Verify:
- [ ] Single-column layout
- [ ] Chapter numeral inline (not floated outside)
- [ ] Chapter pills horizontal-scroll at top, current pill highlighted
- [ ] Tap targets ≥ 44px

- [ ] **Step 4: Test print preview (Ctrl/Cmd-P)**

Verify:
- [ ] Nav rail hidden
- [ ] Search field hidden
- [ ] Chapters break onto new pages
- [ ] Paper-and-ink colors preserved
- [ ] No noise overlay

- [ ] **Step 5: Test reduced motion (DevTools → Rendering → Emulate prefers-reduced-motion)**

Verify:
- [ ] Page loads without entry animations
- [ ] No pulse animation on vowel-change letters

- [ ] **Step 6: Stop the dev server with Ctrl-C**

No commit needed for QA — but if any visual issues turn up, fix them in their owning component and commit those fixes with a focused message.

---

## Self-Review Notes

- **Spec coverage:** every spec section maps to a task:
  - Fonts loaded via @fontsource → Task 1 ✓
  - CSS variables + paper grain + print → Task 2 ✓
  - VowelShift component → Task 3 ✓
  - Callout component → Task 4 ✓
  - ConjugationTable component → Task 5 ✓
  - ChapterNav with scroll-spy + search → Task 6 ✓
  - 12 chapters with expanded content → Tasks 7, 8, 9 (split for review) ✓
  - Print stylesheet + reduced motion → Task 2 + manual QA in Task 10 ✓
  - Accessibility (sr-only label, aria-current) → Task 6 ✓
  - Tests for each helper component + page → Tasks 3–7 ✓
- **No placeholders:** every step has the literal code/command to run.
- **Type consistency:** `Chapter` interface in ChapterNav (Task 6) is re-exported and used by CheatSheet (Task 7) via `import ChapterNav, { type Chapter } from './cheatsheet/ChapterNav.vue'`. Callout `kind` union (`'note' | 'exception' | 'example'`) is consistent between component (Task 4) and usage (Tasks 7–9). ConjugationTable's `rows` prop shape (`{ person, form }`) is the same wherever it's used. ✓
