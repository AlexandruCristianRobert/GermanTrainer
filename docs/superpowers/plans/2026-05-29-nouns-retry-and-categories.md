# Nouns: Retry-Wrong Loop + Fantasy/Switzerland Categories — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "retry only the nouns I got wrong" loop to the noun quizzes, two new noun categories (Fantasy, Switzerland, ≥100 each), ~15–20 new nouns per existing category, and physically de-duplicate the seed file.

**Architecture:** Nouns live in Dexie (`db.nouns`), seeded from `src/data/nouns.seed.json`; `german` is a unique index and `dedupeNouns()` collapses dupes at seed/migration time. New categories ship to existing users via a Dexie `version(7)` top-up upgrade (the `version(4)` precedent). The retry loop is in-component: `QuizResult` emits `retry-wrong`, `QuizRunner` rebuilds the quiz in place from the wrong nouns via a `shallowRef`.

**Tech Stack:** Vue 3 (`<script setup>`), TypeScript (strict), Vite, Dexie (IndexedDB), Vitest. Shell: PowerShell on Windows. Test command: `npm run test`; type-check: `npm run typecheck`.

**Baseline:** main is at the pool-refactor merge; full suite is **416 tests passing**, `vue-tsc` clean. Each task must keep the suite green (≥416 + new tests) and typecheck clean.

**Data-authoring constraints (apply to every data task):**
- Each seed entry is exactly `{ "german": string, "gender": "der"|"die"|"das", "english": string, "group": NounGroup }` — **no `id`, no `createdAt`** (those are added at seed time).
- `german` MUST be **unique across the entire file** (it is a unique Dexie index; the integrity test fails on any collision). Before adding a word, confirm it is not already present in the seed.
- Use the noun **without** an article in `german` (e.g. `"Drache"`, not `"der Drache"`); the article is conveyed by `gender`.
- `gender` must be correct standard-German gender. `english` is a concise gloss; multiple accepted answers separated by `/` (e.g. `"dragon"`, `"sidewalk / pavement"`).
- Match the existing file's 2-space-indented JSON formatting.

---

### Task 1: Add `Fantasy` and `Switzerland` to `NOUN_GROUPS`

**Files:**
- Modify: `src/db/types.ts:3-24` (the `NOUN_GROUPS` array)
- Test: `tests/db/types.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/db/types.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { NOUN_GROUPS } from '../../src/db/types'

describe('NOUN_GROUPS', () => {
  it('includes the Fantasy and Switzerland categories', () => {
    expect(NOUN_GROUPS).toContain('Fantasy')
    expect(NOUN_GROUPS).toContain('Switzerland')
  })

  it('keeps "Other" as the last group', () => {
    expect(NOUN_GROUPS[NOUN_GROUPS.length - 1]).toBe('Other')
  })

  it('has no duplicate group names', () => {
    expect(new Set(NOUN_GROUPS).size).toBe(NOUN_GROUPS.length)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/db/types.test.ts`
Expected: FAIL — `NOUN_GROUPS` does not contain `'Fantasy'`/`'Switzerland'`.

- [ ] **Step 3: Implement — insert the two groups before `'Other'`**

In `src/db/types.ts`, change the tail of the `NOUN_GROUPS` array so the last three entries are:

```ts
  'City & Shopping',
  'Fantasy',
  'Switzerland',
  'Other'
] as const
```

(Insert `'Fantasy'` and `'Switzerland'` immediately before `'Other'`; leave all other entries unchanged.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/db/types.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck` (expect exit 0).
```bash
git add src/db/types.ts tests/db/types.test.ts
git commit -m "feat(nouns): add Fantasy and Switzerland to NOUN_GROUPS"
```

---

### Task 2: De-duplicate the seed file + seed-integrity test

**Files:**
- Modify: `src/data/nouns.seed.json` (rewrite, dupes removed)
- Test: `tests/data/nouns.seed.test.ts` (create)

**Why last-wins:** must match `dedupeNouns()` (`src/db/index.ts:98`) exactly so the DB content is unchanged vs today. Algorithm: iterate entries in order; keep a `Map` keyed by `german.trim()`, calling `set` on every entry (so the LAST occurrence's value wins) — then emit `Array.from(map.values())` (first-insertion position, last value).

- [ ] **Step 1: Write the failing test**

Create `tests/data/nouns.seed.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import seed from '../../src/data/nouns.seed.json'
import { NOUN_GROUPS, type Gender } from '../../src/db/types'

type SeedEntry = { german: string; gender: Gender; english: string; group: string }
const entries = seed as SeedEntry[]

describe('nouns.seed.json integrity', () => {
  it('has no duplicate german keys (trimmed)', () => {
    const counts = new Map<string, number>()
    for (const e of entries) counts.set(e.german.trim(), (counts.get(e.german.trim()) ?? 0) + 1)
    const dupes = [...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k)
    expect(dupes).toEqual([])
  })

  it('every entry has a valid gender', () => {
    const ok = new Set<Gender>(['der', 'die', 'das'])
    const bad = entries.filter(e => !ok.has(e.gender)).map(e => e.german)
    expect(bad).toEqual([])
  })

  it('every entry has a valid group', () => {
    const ok = new Set<string>(NOUN_GROUPS)
    const bad = entries.filter(e => !ok.has(e.group)).map(e => e.german)
    expect(bad).toEqual([])
  })

  it('every entry has a non-empty german and english', () => {
    const bad = entries.filter(e => !e.german?.trim() || !e.english?.trim()).map(e => e.german)
    expect(bad).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify the dup assertion fails**

Run: `npx vitest run tests/data/nouns.seed.test.ts`
Expected: FAIL on "no duplicate german keys" (263 dupes today). The gender/group/non-empty assertions should already PASS.

- [ ] **Step 3: Rewrite the seed file de-duplicated (last-wins)**

Run this from the repo root to rewrite the file in place (Node is available):

```bash
node -e "const fs=require('fs');const p='src/data/nouns.seed.json';const a=JSON.parse(fs.readFileSync(p,'utf8'));const m=new Map();for(const e of a)m.set(e.german.trim(),e);const out=Array.from(m.values());fs.writeFileSync(p, JSON.stringify(out,null,2)+'\n');console.log('entries',a.length,'->',out.length);"
```

Expected console: `entries 1670 -> 1407` (or similar; the point is the dupes are removed). Verify the file still parses and entry shape is unchanged (`{german,gender,english,group}`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/data/nouns.seed.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Full suite + commit**

Run: `npm run test` (expect ≥416 passing, 0 failures — the live DB content is unchanged).
```bash
git add src/data/nouns.seed.json tests/data/nouns.seed.test.ts
git commit -m "chore(nouns): de-duplicate seed file (last-wins) + seed-integrity test"
```

---

### Task 3: Add the `Fantasy` category (≥100 nouns)

**Files:**
- Modify: `src/data/nouns.seed.json` (append Fantasy entries)
- Test: extend `tests/data/nouns.seed.test.ts`

**This is a data-authoring task.** Generate **≥110** unique Fantasy nouns (target 110 to leave margin after any verification removals). Theme: fantasy / medieval / mythical vocabulary — creatures, magic, weapons & armour, places, roles, items. All `group: "Fantasy"`. Unique germans not already in the seed.

Anchor examples (extend well beyond these to ≥110, do not stop here):
`der Drache` (dragon), `die Hexe` (witch), `der Zauberer` (wizard), `die Zauberin` (sorceress), `das Schwert` (sword), `der Zwerg` (dwarf), `die Elfe` (elf), `der Ork` (orc), `der Ritter` (knight), `die Burg` (castle), `der Zauberstab` (wand), `das Einhorn` (unicorn), `der Kobold` (goblin), `der Troll` (troll), `die Magie` (magic), `der Zaubertrank` (potion), `der Zauberspruch` (spell), `das Verlies` (dungeon), `der Drachentöter` (dragonslayer), `die Rüstung` (armour), `der Schild` (shield), `die Armbrust` (crossbow), `der Bogen` (bow), `der Pfeil` (arrow), `der Dolch` (dagger), `die Klinge` (blade), `der Held` (hero), `die Heldin` (heroine), `der Schurke` (rogue/villain), `der König` (king)*, `die Königin` (queen)*, `der Riese` (giant), `die Fee` (fairy), `der Geist` (ghost), `das Gespenst` (spectre), `der Vampir` (vampire), `der Werwolf` (werewolf), `die Meerjungfrau` (mermaid), `der Zentaur` (centaur), `der Greif` (griffin), `der Basilisk` (basilisk), `die Schriftrolle` (scroll), `der Amulett`/`das Amulett` (amulet), `der Talisman` (talisman), `die Prophezeiung` (prophecy), `das Königreich` (kingdom), `der Thron` (throne), `die Krone` (crown), `der Kerker` (dungeon/jail), `der Turm` (tower).

*If a candidate german already exists in the seed (e.g. a common word), pick a fantasy-specific alternative instead — the integrity test will fail on any collision.

- [ ] **Step 1: Add the Fantasy count assertions to the test (failing)**

Append to `tests/data/nouns.seed.test.ts` inside the `describe`:

```ts
  it('has at least 100 Fantasy nouns', () => {
    expect(entries.filter(e => e.group === 'Fantasy').length).toBeGreaterThanOrEqual(100)
  })
```

Run: `npx vitest run tests/data/nouns.seed.test.ts`
Expected: FAIL — 0 Fantasy nouns.

- [ ] **Step 2: Append ≥110 Fantasy entries to `src/data/nouns.seed.json`**

Add the entries (each `{ "german", "gender", "english", "group": "Fantasy" }`). Ensure every german is unique vs the rest of the file. Keep correct genders.

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run tests/data/nouns.seed.test.ts`
Expected: PASS — including the new "≥100 Fantasy" and the "no duplicate german keys" assertions (the latter guards collisions you may have introduced).

- [ ] **Step 4: Commit**

```bash
git add src/data/nouns.seed.json tests/data/nouns.seed.test.ts
git commit -m "feat(nouns): add Fantasy category (>=100 nouns)"
```

> **Controller note (gender verification):** after the implementer reports DONE, dispatch a gender-verification reviewer over the appended Fantasy block (see Task 6) before marking the task complete.

---

### Task 4: Add the `Switzerland` category (≥100 nouns)

**Files:**
- Modify: `src/data/nouns.seed.json` (append Switzerland entries)
- Test: extend `tests/data/nouns.seed.test.ts`

**This is a data-authoring task.** Generate **≥110** unique Switzerland-**themed** nouns, all `group: "Switzerland"`, germans unique vs the whole file. Theme buckets to cover: geography (cantons, lakes, mountains, passes, rivers), food specialities, culture/traditions/symbols, politics/institutions. **Avoid collisions** with existing common words (e.g. don't reuse `Käse`, `Berg`, `See`, `Uhr` — they're already in the seed; use Switzerland-specific terms/compounds instead).

Anchor examples (extend to ≥110):
`das Matterhorn` (the Matterhorn), `der Jura` (the Jura), `der Genfersee` (Lake Geneva), `der Vierwaldstättersee` (Lake Lucerne), `die Eidgenossenschaft` (Confederation), `der Eidgenosse` (confederate citizen), `der Kanton` (canton), `der Nationalrat` (National Council), `der Ständerat` (Council of States), `der Bundesrat` (Federal Council), `das Fondue` (fondue), `das Raclette` (raclette), `die Rösti` (rösti), `der Cervelat` (cervelat sausage), `der Emmentaler` (Emmental cheese), `der Greyerzer` (Gruyère), `das Birchermüesli` (bircher muesli), `das Alphorn` (alphorn), `das Edelweiss` (edelweiss), `der Jodel` (yodel), `das Schwingen` (Swiss wrestling), `das Hornussen` (hornussen), `der Sennenhund` (mountain dog), `die Alpwirtschaft` (alpine farming), `der Röstigraben` (the "rösti divide"), `die Fasnacht` (Swiss carnival), `der Rütli` (the Rütli meadow), `die Helvetia` (Helvetia), `die Armbrust` (crossbow — if not used by Fantasy), `der Schweizerfranken` (Swiss franc), `das Postauto` (postbus), `die Rhätische Bahn`/`die Bergbahn` (mountain railway), `der Gotthard` (the Gotthard), `der Aletschgletscher` (Aletsch glacier), `die Sennerei` (alpine dairy), `der Schwingerkönig` (wrestling champion).

- [ ] **Step 1: Add the Switzerland count assertion (failing)**

Append to `tests/data/nouns.seed.test.ts`:

```ts
  it('has at least 100 Switzerland nouns', () => {
    expect(entries.filter(e => e.group === 'Switzerland').length).toBeGreaterThanOrEqual(100)
  })
```

Run: `npx vitest run tests/data/nouns.seed.test.ts`
Expected: FAIL — 0 Switzerland nouns.

- [ ] **Step 2: Append ≥110 Switzerland entries to `src/data/nouns.seed.json`**

Add the entries. Unique germans, correct genders, `group: "Switzerland"`.

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run tests/data/nouns.seed.test.ts`
Expected: PASS (incl. no-dupes guard and ≥100 Switzerland).

- [ ] **Step 4: Commit**

```bash
git add src/data/nouns.seed.json tests/data/nouns.seed.test.ts
git commit -m "feat(nouns): add Switzerland category (>=100 nouns)"
```

> **Controller note:** dispatch a gender-verification reviewer over the appended Switzerland block (Task 6) before marking complete.

---

### Task 5: Top up the 20 existing categories (~15–20 each)

**Files:**
- Modify: `src/data/nouns.seed.json` (append entries to existing groups)
- Test: extend `tests/data/nouns.seed.test.ts`

**This is a data-authoring task.** Add ~15–20 unique nouns to each of the 20 existing categories (`Office, Work, Furniture, House, Rooms, Family, School, Bank & Money, Food, Body & Health, Clothing, Nature & Weather, Animals, Transport & Travel, Technology, Sports & Hobbies, Culture & Arts, Time & Numbers, City & Shopping, Other`). Each entry uses its real category as `group`. Unique germans vs the whole file (the no-dupes test guards this).

- [ ] **Step 1: Add a "every category is well-populated" assertion (failing)**

Append to `tests/data/nouns.seed.test.ts`:

```ts
  it('every category has a healthy minimum count', () => {
    const counts = new Map<string, number>()
    for (const e of entries) counts.set(e.group, (counts.get(e.group) ?? 0) + 1)
    // After top-up, the smallest existing category (Rooms) should clear ~50.
    const thin = NOUN_GROUPS.filter(g => (counts.get(g) ?? 0) < 50)
    expect(thin).toEqual([])
  })
```

Run: `npx vitest run tests/data/nouns.seed.test.ts`
Expected: FAIL — small categories (e.g. `Rooms`, `Clothing`, `Technology`) are below 50 before top-up.

- [ ] **Step 2: Append ~15–20 entries per existing category**

Add the entries across all 20 existing groups. (During execution this may be split into per-category batches; the artifact is the same.) Ensure unique germans and correct genders.

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run tests/data/nouns.seed.test.ts`
Expected: PASS — every category ≥ 50, no dupes, all valid.

- [ ] **Step 4: Full suite + commit**

Run: `npm run test` (expect all green).
```bash
git add src/data/nouns.seed.json tests/data/nouns.seed.test.ts
git commit -m "feat(nouns): top up existing categories (~15-20 each)"
```

> **Controller note:** dispatch a gender-verification reviewer over the Task-5 additions (Task 6) before marking complete.

---

### Task 6: Gender & translation verification pass (data quality)

**Files:**
- Modify: `src/data/nouns.seed.json` (fix any wrong genders/translations found)

**No unit test asserts semantic gender correctness** — this task is a focused review. During execution the controller dispatches one or more verification subagents, each given a block of newly-added entries (Fantasy, Switzerland, and the per-category top-ups) with this instruction: *"For each `{german, gender, english}`, confirm the gender is the correct standard-German article and the english gloss is accurate. Return a list of corrections (german → correct gender / corrected english)."* Apply all corrections.

- [ ] **Step 1: Collect every entry added in Tasks 3–5** (group ∈ {Fantasy, Switzerland} plus the new germans in existing groups).
- [ ] **Step 2: Verify genders/translations** (verification subagents) and apply corrections to `src/data/nouns.seed.json`.
- [ ] **Step 3: Run the integrity test + full suite**

Run: `npx vitest run tests/data/nouns.seed.test.ts` then `npm run test`
Expected: PASS (corrections never introduce dupes or invalid groups/genders).

- [ ] **Step 4: Commit**

```bash
git add src/data/nouns.seed.json
git commit -m "fix(nouns): gender/translation corrections from verification pass"
```

---

### Task 7: Dexie `version(7)` top-up migration

**Files:**
- Modify: `src/db/index.ts:77-83` (after the `version(6)` block, add `version(7)`)

Existing users already have nouns, so `seedIfEmpty` never re-runs. Mirror the `version(4)` upgrade (`src/db/index.ts:40-70`): add seed germans not present, update `group` where the seed re-assigns it, leave user-added nouns untouched. New users / "reset to seed" get everything via the existing `seedIfEmpty` / `resetTableToSeed` (both already call `dedupeNouns`).

- [ ] **Step 1: Add the `version(7)` block**

After the `version(6)` block, append:

```ts
    this.version(7).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt',
      simulatorSessions: '&id, status, startedAt'
    }).upgrade(async tx => {
      // Top up new seed entries (new Fantasy/Switzerland categories + per-category
      // additions) for existing users, who never re-run seedIfEmpty. Same approach
      // as version(4): add missing germans, re-group where the seed changed it,
      // leave user-added nouns untouched.
      const table = tx.table<Noun>('nouns')
      const existing = await table.toArray()
      const byGerman = new Map<string, Noun>()
      for (const n of existing) byGerman.set(n.german, n)

      const now = Date.now()
      const seedDeduped = dedupeNouns(nounsSeed as NounSeedEntry[])
      const toAdd: Array<Omit<Noun, 'id'>> = []
      const toUpdate: Array<{ id: number; group: NounGroup }> = []
      for (const seed of seedDeduped) {
        const current = byGerman.get(seed.german)
        if (!current) {
          toAdd.push({ ...seed, createdAt: now })
        } else if (current.group !== seed.group && current.id != null) {
          toUpdate.push({ id: current.id, group: seed.group })
        }
      }
      if (toAdd.length > 0) await table.bulkAdd(toAdd)
      for (const u of toUpdate) await table.update(u.id, { group: u.group })
    })
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exit 0. (`Noun`, `NounGroup`, `NounSeedEntry`, `dedupeNouns`, `nounsSeed` are all already in scope in `db/index.ts`.)

- [ ] **Step 3: Full suite**

Run: `npm run test`
Expected: all green (no Dexie migration unit test — the repo has none; verified by typecheck + the version(4) precedent + manual smoke at the end).

- [ ] **Step 4: Commit**

```bash
git add src/db/index.ts
git commit -m "feat(db): version(7) top-up migration for new noun seed entries"
```

---

### Task 8: `wrongNouns` helper in `useNounQuiz`

**Files:**
- Modify: `src/composables/useNounQuiz.ts` (add + export `wrongNouns`)
- Test: `tests/composables/useNounQuiz.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/composables/useNounQuiz.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { wrongNouns, type NounQuestion } from '../../src/composables/useNounQuiz'
import type { Noun } from '../../src/db/types'

function noun(german: string): Noun {
  return { german, gender: 'der', english: german, group: 'Other', createdAt: 0 }
}
function q(german: string, isCorrect: boolean | null): NounQuestion {
  return { noun: noun(german), userAnswer: null, isCorrect }
}

describe('wrongNouns', () => {
  it('returns exactly the nouns whose answer was incorrect', () => {
    const questions = [q('A', true), q('B', false), q('C', true), q('D', false)]
    expect(wrongNouns(questions).map(n => n.german)).toEqual(['B', 'D'])
  })

  it('returns [] when every answer is correct (loop terminates)', () => {
    const questions = [q('A', true), q('B', true)]
    expect(wrongNouns(questions)).toEqual([])
  })

  it('treats unanswered (null) as not-wrong (only false counts)', () => {
    const questions = [q('A', null), q('B', false)]
    expect(wrongNouns(questions).map(n => n.german)).toEqual(['B'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/composables/useNounQuiz.test.ts`
Expected: FAIL — `wrongNouns` is not exported.

- [ ] **Step 3: Implement `wrongNouns`**

In `src/composables/useNounQuiz.ts`, add after the imports (and export it):

```ts
import type { Noun } from '../db/types'
// ... existing code ...

/** The nouns from a finished round whose answer was incorrect (excludes unanswered/null). */
export function wrongNouns(questions: NounQuestion[]): Noun[] {
  return questions.filter(q => q.isCorrect === false).map(q => q.noun)
}
```

(`Noun` is already imported at the top of the file; do not duplicate the import.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/composables/useNounQuiz.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck` (exit 0).
```bash
git add src/composables/useNounQuiz.ts tests/composables/useNounQuiz.test.ts
git commit -m "feat(nouns): export wrongNouns helper for retry-wrong loop"
```

---

### Task 9: `QuizResult` — retry button + celebratory all-correct state

**Files:**
- Modify: `src/modules/nouns/QuizResult.vue`

- [ ] **Step 1: Declare the new emit**

Replace `defineEmits<{ (e: 'restart'): void }>()` with:

```ts
defineEmits<{ (e: 'restart'): void; (e: 'retry-wrong'): void }>()
```

- [ ] **Step 2: Add the retry action + all-correct banner to the header actions**

In the `<template>`, replace the existing `.result-actions` block with:

```html
      <div class="result-actions">
        <button
          v-if="wrongCount > 0"
          class="btn btn-accent"
          type="button"
          @click="$emit('retry-wrong')"
        >
          Retry {{ wrongCount }} wrong <span aria-hidden="true">→</span>
        </button>
        <span v-else class="all-correct-banner">Alles richtig! 🎉</span>
        <button class="btn btn-ghost" type="button" @click="$emit('restart')">Setup another</button>
      </div>
```

(`wrongCount` is already computed in this component at `:19`.)

- [ ] **Step 3: Add a style for the banner**

In `<style scoped>`, add:

```css
.all-correct-banner {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 18px;
  color: var(--success);
  align-self: center;
}
```

- [ ] **Step 4: Typecheck + manual check**

Run: `npm run typecheck` (exit 0).
Manual (after Task 10 wires it): a finished quiz with wrong answers shows "Retry N wrong"; a clean round shows "Alles richtig! 🎉" and no retry button.

- [ ] **Step 5: Commit**

```bash
git add src/modules/nouns/QuizResult.vue
git commit -m "feat(nouns): QuizResult retry-wrong action + all-correct end state"
```

---

### Task 10: `QuizRunner` — `shallowRef` quiz + `retryWrong()` wiring

**Files:**
- Modify: `src/modules/nouns/QuizRunner.vue`

Convert the plain `let quiz` to a `shallowRef`, wire the `retry-wrong` event, and drop the `(ready.value, …)` reactivity hack (no longer needed once the quiz is reactive). The history `watch` is unchanged — its `historySaved` guard already saves only the first finished round, so retry rounds are not saved.

- [ ] **Step 1: Imports — add `shallowRef` and the shared `shuffle` + `wrongNouns`**

Change the Vue import and add two imports:

```ts
import { computed, onMounted, shallowRef, ref, watch } from 'vue'
import { useNounQuiz, wrongNouns, type NounQuizMode } from '../../composables/useNounQuiz'
import { shuffle } from '../../data/pool'
```

(Remove `shallowRef`-redundant pieces only; keep `computed`, `onMounted`, `ref`, `watch`. `nextTick` is not currently imported here — do not add it.)

- [ ] **Step 2: Replace the quiz holder**

Replace:
```ts
let quiz: ReturnType<typeof useNounQuiz> | null = null
const ready = ref(false)
```
with:
```ts
const quiz = shallowRef<ReturnType<typeof useNounQuiz> | null>(null)
```

- [ ] **Step 3: Update `onMounted` to assign the ref (drop `ready`)**

In `onMounted`, replace:
```ts
      quiz = useNounQuiz(nouns.value, m)
      ready.value = true
      startedAtMs.value = Date.now()
```
with:
```ts
      quiz.value = useNounQuiz(nouns.value, m)
      startedAtMs.value = Date.now()
```

- [ ] **Step 4: Simplify the computeds (drop the `(ready.value, …)` hack)**

Replace the computed block:
```ts
const current = computed(() => (ready.value, quiz?.current.value ?? null))
const finished = computed(() => (ready.value, quiz?.finished.value ?? false))
const questions = computed(() => (ready.value, quiz?.questions.value ?? []))
const score = computed(() => (ready.value, quiz?.score.value ?? 0))
const total = computed(() => (ready.value, quiz?.total.value ?? 0))
const currentIndex = computed(() => (ready.value, quiz?.currentIndex.value ?? 0))
```
with:
```ts
const current = computed(() => quiz.value?.current.value ?? null)
const finished = computed(() => quiz.value?.finished.value ?? false)
const questions = computed(() => quiz.value?.questions.value ?? [])
const score = computed(() => quiz.value?.score.value ?? 0)
const total = computed(() => quiz.value?.total.value ?? 0)
const currentIndex = computed(() => quiz.value?.currentIndex.value ?? 0)
```

- [ ] **Step 5: Update the handlers that reference `quiz`**

Replace `onAnswered`/`onNext`:
```ts
function onAnswered(_correct: boolean, answer: string) {
  if (!quiz.value) return
  quiz.value.submit(answer)
}

function onNext() { quiz.value?.advance() }

function retryWrong() {
  if (!quiz.value) return
  const wrong = wrongNouns(quiz.value.questions.value)
  if (wrong.length === 0) return
  nouns.value = shuffle(wrong)
  quiz.value = useNounQuiz(nouns.value, mode.value)
}
```

- [ ] **Step 6: Update the template — `v-else-if="finished && quiz.value"` and wire the emit**

In the template, the `QuizResult` usage becomes:
```html
  <QuizResult
    v-else-if="finished && quiz.value"
    :questions="questions"
    :score="score"
    :total="total"
    :mode="mode"
    @restart="restart"
    @retry-wrong="retryWrong"
  />
```
(The `current`/`GenderQuiz`/`TranslationQuiz` branch is unchanged — it already reads the `current` computed, which now tracks `quiz.value`.)

- [ ] **Step 7: Typecheck + full suite**

Run: `npm run typecheck` (exit 0) then `npm run test` (all green).

- [ ] **Step 8: Commit**

```bash
git add src/modules/nouns/QuizRunner.vue
git commit -m "feat(nouns): retry-wrong loop wiring (shallowRef quiz + retryWrong)"
```

---

### Task 11: Manual smoke (final verification)

**Files:** none (verification only)

- [ ] **Step 1:** `npm run typecheck` (exit 0) and `npm run test` (all green, ≥416 + new tests).
- [ ] **Step 2:** Run `npm run dev`, open the nouns trainer. In **Setup**, confirm `Fantasy` and `Switzerland` appear with counts ≥ 100.
- [ ] **Step 3:** Start a gender quiz, deliberately miss a few, finish. Confirm the result page shows **"Retry N wrong"**. Click it → a new round runs with only the missed nouns. Repeat until all correct → confirm **"Alles richtig! 🎉"** and no retry button. Repeat the smoke for translation mode.
- [ ] **Step 4:** Confirm history saved exactly **one** run for the session (the original), not one per retry round.

---

## Self-Review

**Spec coverage:**
- Retry-wrong loop → Tasks 8 (helper), 9 (result UI), 10 (runner wiring), 11 (smoke). ✓
- Fantasy ≥100 → Task 3. ✓ Switzerland ≥100 → Task 4. ✓ Top-up ~15–20/category → Task 5. ✓
- Dedup seed + guard + no-dupe test → Task 2 (guard `dedupeNouns` already exists; test added). ✓
- New categories in NOUN_GROUPS → Task 1. ✓
- DB version(7) top-up migration → Task 7. ✓
- Gender-quality approach → Task 6 (verification pass) + controller notes on Tasks 3–5. ✓
- History: retry rounds not saved → Task 10 Step (watch unchanged; documented). ✓
- Tests: seed integrity + wrongNouns → Tasks 2/3/4/5 + 8. ✓

**Placeholder scan:** Data tasks specify entry shape, constraints, anchor examples, and the gating integrity test (the generated nouns are the implementer's output, validated by tests + Task 6) — no code placeholders. Code tasks contain full snippets. ✓

**Type consistency:** `wrongNouns(questions: NounQuestion[]): Noun[]` defined in Task 8, used in Task 10. `quiz` is `shallowRef<ReturnType<typeof useNounQuiz> | null>` consistently in Task 10. `retry-wrong` emit name matches between Task 9 (`defineEmits`) and Task 10 (`@retry-wrong`). `NounGroup`/`Gender` usages match `db/types.ts`. ✓

**Note on `ready`:** Task 10 removes the `ready` ref entirely; confirm no other reference to `ready` remains in `QuizRunner.vue` after Step 4 (search the file). The `loading`/`error` refs are unrelated and stay.
