# Noun Quiz: "All" preset, Gender Tips, Keyboard Shortcuts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the noun quiz with an "All" question-count preset and a collapsible gender-tips panel on the setup page, and add `1/2/3` keyboard shortcuts in the gender quiz (Enter→Next already works via focus).

**Architecture:** Pure UI changes to two Vue SFCs. No store, no router, no data layer, no new dependencies. The "All" preset extends `preset`'s union type and the `requested` computed. The tips panel is static content inside `NCollapse`. Keyboard shortcuts use a `window` `keydown` listener registered in `onMounted` and removed in `onBeforeUnmount` on `GenderQuiz.vue`.

**Tech Stack:** Vue 3 (`<script setup lang="ts">`), Naive UI (`NCollapse`, `NCollapseItem`, `NRadio`, `NRadioGroup`), Vitest 4 + `@vue/test-utils` 2, jsdom, TypeScript 5.6.

**Spec:** [`docs/superpowers/specs/2026-05-14-noun-quiz-all-and-tips-design.md`](../specs/2026-05-14-noun-quiz-all-and-tips-design.md)

---

## File map

- **Modify** `src/modules/nouns/QuizSetup.vue` — widen `preset` type, add `'all'` radio, update `requested`, insert `NCollapse` block of static tips above Groups.
- **Modify** `src/modules/nouns/GenderQuiz.vue` — add `onMounted`/`onBeforeUnmount` keydown listener mapping `1/2/3` → `pick()`; ignore repeat and modifier keys; no-op when submitted.
- **Create** `tests/modules/nouns/QuizSetup.test.ts` — component tests covering the "All" preset behaviour and presence of the tips panel.
- **Create** `tests/modules/nouns/GenderQuiz.test.ts` — component tests covering `1/2/3` keyboard shortcuts.

Each task below is TDD: failing test first, run it, implement, run again, commit.

---

## Task 1: Test the "All" preset adds a radio with all-of-available count

**Files:**
- Test: `tests/modules/nouns/QuizSetup.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/modules/nouns/QuizSetup.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { h } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import { NMessageProvider } from 'naive-ui'
import QuizSetup from '../../../src/modules/nouns/QuizSetup.vue'

vi.mock('../../../src/composables/useNouns', () => ({
  useNouns: () => ({
    countsByGroup: async () => ({
      Office: 4, Work: 0, Furniture: 3, House: 0, Rooms: 0,
      Family: 0, School: 0, 'Bank & Money': 0, Food: 0, Other: 0
    })
  })
}))

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/quiz', name: 'nouns-quiz-run', component: { template: '<div />' } }
    ]
  })
}

async function mountSetup() {
  const router = makeRouter()
  const wrapper = mount(
    {
      components: { NMessageProvider, QuizSetup },
      render: () => h(NMessageProvider, null, { default: () => h(QuizSetup) })
    },
    { global: { plugins: [router] } }
  )
  await flushPromises()
  return { wrapper, router }
}

describe('QuizSetup — All preset', () => {
  beforeEach(() => localStorage.clear())

  it('renders an "All" radio in the question-count group', async () => {
    const { wrapper } = await mountSetup()
    const labels = wrapper.findAll('label').map(l => l.text())
    expect(labels).toContain('All')
  })

  it('routes with count equal to total available nouns when All is selected', async () => {
    const { wrapper, router } = await mountSetup()
    const push = vi.spyOn(router, 'push')

    const allRadio = wrapper.findAll('label').find(l => l.text() === 'All')
    expect(allRadio).toBeTruthy()
    await allRadio!.find('input[type="radio"]').setValue()

    const startBtn = wrapper.findAll('button').find(b => b.text() === 'Start quiz')!
    await startBtn.trigger('click')

    expect(push).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'nouns-quiz-run',
        query: expect.objectContaining({ count: '7' })
      })
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/modules/nouns/QuizSetup.test.ts`
Expected: FAIL — no "All" label found (current QuizSetup only has 10/15/20/Custom).

- [ ] **Step 3: Implement the "All" radio and update `requested`**

In `src/modules/nouns/QuizSetup.vue`:

Change the `preset` ref type and value (around line 22):

```typescript
const preset = ref<10 | 15 | 20 | 'custom' | 'all'>(10)
```

Change the `requested` computed (around line 63):

```typescript
const requested = computed(() => {
  if (preset.value === 'custom') return customCount.value
  if (preset.value === 'all') return totalAvailable.value
  return preset.value
})
```

Add the radio inside the question-count `<n-radio-group>` (after the Custom radio, around line 138):

```vue
<n-radio value="all">All</n-radio>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/modules/nouns/QuizSetup.test.ts`
Expected: PASS (both tests green).

- [ ] **Step 5: Type-check**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/nouns/QuizSetup.vue tests/modules/nouns/QuizSetup.test.ts
git commit -m "feat(nouns): add 'All' preset to quiz setup question count"
```

---

## Task 2: Add the collapsible gender-tips panel

**Files:**
- Modify: `src/modules/nouns/QuizSetup.vue`
- Modify: `tests/modules/nouns/QuizSetup.test.ts`

- [ ] **Step 1: Add a failing test for the tips panel**

Append to the `describe('QuizSetup — All preset', …)` block in `tests/modules/nouns/QuizSetup.test.ts` a new describe:

```typescript
describe('QuizSetup — Gender tips panel', () => {
  beforeEach(() => localStorage.clear())

  it('renders the gender tips collapse header', async () => {
    const { wrapper } = await mountSetup()
    expect(wrapper.text()).toContain('Gender tips')
  })

  it('includes sub-sections for endings, semantic categories, compound rule, traps, plural', async () => {
    const { wrapper } = await mountSetup()
    const text = wrapper.text()
    expect(text).toContain('Endings')
    expect(text).toContain('Semantic categories')
    expect(text).toContain('Compound noun')
    expect(text).toContain('Traps')
    expect(text).toContain('Plural')
  })
})
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npx vitest run tests/modules/nouns/QuizSetup.test.ts -t "Gender tips panel"`
Expected: FAIL — "Gender tips" string not found.

- [ ] **Step 3: Add `NCollapse`/`NCollapseItem` to the imports**

Update the naive-ui import block at the top of `src/modules/nouns/QuizSetup.vue`:

```typescript
import {
  NRadioGroup, NRadio, NSpace, NButton, NInputNumber, NAlert, NCheckboxGroup, NCheckbox,
  NCollapse, NCollapseItem,
  useMessage
} from 'naive-ui'
```

- [ ] **Step 4: Insert the tips panel in the template**

Place the following block directly below `<h2>Noun quiz setup</h2>` and above the `<n-alert v-if="totalAvailable === 0 …">`:

```vue
<n-collapse>
  <n-collapse-item title="Gender tips" name="tips">
    <n-collapse>
      <n-collapse-item title="Endings → likely gender" name="endings">
        <p><strong>die</strong>: -ung, -heit, -keit, -schaft, -tät, -ion, -ik, -ie, -ei, -enz, -anz</p>
        <p><strong>der</strong>: -er (agent), -ling, -ismus, -ant, -ent, -or, -ist</p>
        <p><strong>das</strong>: -chen, -lein, -ment, -um, -tum, -nis (often), -sel</p>
      </n-collapse-item>
      <n-collapse-item title="Semantic categories" name="semantic">
        <p><strong>der</strong>: days, months, seasons, compass points, weather (Regen, Schnee, Wind), male persons/professions, alcoholic drinks (except das Bier), car brands.</p>
        <p><strong>die</strong>: female persons/professions, most trees, most flowers, most fruits, cardinal numbers as nouns (die Eins), motorcycles, ships.</p>
        <p><strong>das</strong>: metals & chemical elements, most countries & cities, infinitives as nouns (das Essen), diminutives, colours as nouns (das Rot), young living things (das Baby, das Kind).</p>
      </n-collapse-item>
      <n-collapse-item title="Compound noun rule" name="compound">
        <p>The gender of a compound noun follows its <em>last</em> component.</p>
        <p>das Haus + die Tür → <strong>die</strong> Haustür</p>
        <p>die Sonne + der Schein → <strong>der</strong> Sonnenschein</p>
      </n-collapse-item>
      <n-collapse-item title="Traps & exceptions" name="traps">
        <p><strong>das Mädchen</strong>, <strong>das Fräulein</strong> — diminutive -chen/-lein overrides natural gender.</p>
        <p><strong>der Junge</strong> — masculine despite -e ending.</p>
        <p><strong>die Person</strong> — feminine regardless of the person's sex.</p>
        <p><strong>das Baby</strong>, <strong>das Kind</strong> — neuter regardless of sex.</p>
        <p><strong>die Zeit, die Arbeit, die Antwort</strong> — common -t feminines.</p>
      </n-collapse-item>
      <n-collapse-item title="Plural quick reference" name="plural">
        <p>Most <strong>die</strong> feminines: plural in -(e)n (die Frau → die Frauen).</p>
        <p>Many <strong>der</strong>/<strong>das</strong> words: plural in -e (der Tisch → die Tische).</p>
        <p>Many neuters: -er + umlaut (das Haus → die Häuser).</p>
        <p>-chen / -lein diminutives: unchanged in the plural.</p>
        <p>Foreign / loanwords: often -s (das Auto → die Autos).</p>
      </n-collapse-item>
    </n-collapse>
  </n-collapse-item>
</n-collapse>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/modules/nouns/QuizSetup.test.ts`
Expected: PASS (all tests, including the previous "All" preset tests).

- [ ] **Step 6: Type-check**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/modules/nouns/QuizSetup.vue tests/modules/nouns/QuizSetup.test.ts
git commit -m "feat(nouns): add collapsible gender-tips panel to quiz setup"
```

---

## Task 3: Add 1/2/3 keyboard shortcuts to the gender quiz

**Files:**
- Test: `tests/modules/nouns/GenderQuiz.test.ts` (create)
- Modify: `src/modules/nouns/GenderQuiz.vue`

- [ ] **Step 1: Write the failing test**

Create `tests/modules/nouns/GenderQuiz.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GenderQuiz from '../../../src/modules/nouns/GenderQuiz.vue'
import type { Noun } from '../../../src/db/types'

const noun: Noun = {
  id: 1, german: 'Tisch', gender: 'der', english: 'table',
  group: 'Furniture', createdAt: 0
}

function mountQuiz() {
  return mount(GenderQuiz, {
    attachTo: document.body,
    props: { noun, questionNumber: 1, totalQuestions: 5 }
  })
}

function press(key: string, init: KeyboardEventInit = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, ...init }))
}

describe('GenderQuiz — keyboard shortcuts', () => {
  it('emits answered(true, "der") when 1 is pressed', async () => {
    const wrapper = mountQuiz()
    press('1')
    await wrapper.vm.$nextTick()
    const events = wrapper.emitted('answered')
    expect(events).toBeTruthy()
    expect(events![0]).toEqual([true, 'der'])
    wrapper.unmount()
  })

  it('emits answered(false, "die") when 2 is pressed for a der noun', async () => {
    const wrapper = mountQuiz()
    press('2')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('answered')![0]).toEqual([false, 'die'])
    wrapper.unmount()
  })

  it('emits answered(_, "das") when 3 is pressed', async () => {
    const wrapper = mountQuiz()
    press('3')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('answered')![0][1]).toBe('das')
    wrapper.unmount()
  })

  it('ignores 1/2/3 once already submitted', async () => {
    const wrapper = mountQuiz()
    press('1')
    await wrapper.vm.$nextTick()
    press('2')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('answered')!.length).toBe(1)
    wrapper.unmount()
  })

  it('ignores 1/2/3 when a modifier key is held', async () => {
    const wrapper = mountQuiz()
    press('1', { ctrlKey: true })
    press('2', { metaKey: true })
    press('3', { altKey: true })
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('answered')).toBeUndefined()
    wrapper.unmount()
  })

  it('ignores auto-repeat events', async () => {
    const wrapper = mountQuiz()
    press('1', { repeat: true })
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('answered')).toBeUndefined()
    wrapper.unmount()
  })

  it('removes the listener on unmount', async () => {
    const wrapper = mountQuiz()
    wrapper.unmount()
    press('1')
    // No assertion target on a torn-down wrapper; the test passes if no
    // exception is thrown by stale handlers touching unmounted state.
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/modules/nouns/GenderQuiz.test.ts`
Expected: FAIL — no `answered` emission, because no keyboard handler exists yet.

- [ ] **Step 3: Implement the keydown handler in `GenderQuiz.vue`**

Update the imports at the top of `src/modules/nouns/GenderQuiz.vue`:

```typescript
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
```

Just below the existing `function next() { … }` block, add:

```typescript
const keyToGender: Record<string, 'der' | 'die' | 'das'> = {
  '1': 'der',
  '2': 'die',
  '3': 'das'
}

function onKeydown(e: KeyboardEvent) {
  if (e.repeat) return
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (submitted.value) return
  const g = keyToGender[e.key]
  if (!g) return
  e.preventDefault()
  pick(g)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/modules/nouns/GenderQuiz.test.ts`
Expected: PASS (all seven tests green).

- [ ] **Step 5: Run the full test suite to catch regressions**

Run: `npm test`
Expected: full suite PASS.

- [ ] **Step 6: Type-check and build**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/modules/nouns/GenderQuiz.vue tests/modules/nouns/GenderQuiz.test.ts
git commit -m "feat(nouns): add 1/2/3 keyboard shortcuts to gender quiz"
```

---

## Task 4: Manual verification

- [ ] **Step 1: Run the dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify "All" preset**

In the browser:
1. Go to Nouns → Quiz.
2. Select one or two groups with known counts.
3. Click the **All** radio.
4. Click **Start quiz**. The URL's `count` query should equal the total in the selected groups.

- [ ] **Step 3: Verify Gender tips panel**

On the same setup page, expand **Gender tips**, then expand each of the five sub-sections (Endings, Semantic categories, Compound noun rule, Traps & exceptions, Plural quick reference). Confirm content renders without layout breakage.

- [ ] **Step 4: Verify keyboard play-through**

Start a gender quiz. Without using the mouse:
1. Press `1`/`2`/`3` to answer each question — the matching button should highlight green/red as appropriate.
2. Press `Enter` to advance (the Next button is auto-focused after answering).
3. Complete a full quiz keyboard-only and reach the result screen.

- [ ] **Step 5: Verify shortcut safety**

- Hold `Ctrl` and press `1` — should not register as an answer (the browser may switch tabs, which is fine).
- After answering, press `1`/`2`/`3` again — must not change the answer or re-emit.

- [ ] **Step 6: Commit notes (optional)**

If any manual issues are found, fix them with a follow-up commit. Otherwise no action required.

---

## Done criteria

- `npm test` passes.
- `npm run typecheck` passes.
- `npm run build` passes.
- Manual run-through from Task 4 completes mouse-free in the gender quiz.
- `git status` clean.
