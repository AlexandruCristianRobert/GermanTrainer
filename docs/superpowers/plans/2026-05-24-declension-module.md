# Declension Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/declension` module that drills the German case/gender/determiner system through three focused exercises (decline-the-phrase, article-fill-in-context, adjective-ending production), backed by a curated dataset of ~190 examples across A1–B2.

**Architecture:** A TypeScript module exports three parallel datasets (declension tables, article-fill sentences, adjective-ending sentences). Two composables handle sampling/filtering and quiz acceptance. Three setup + runner pairs reuse existing patterns: the decline-the-phrase runner clones the verb-conjugation 4-input table; the article-fill and adjective-ending runners mirror the preposition article-fill single-card design. The module integrates with quiz history, stats, setup-memory, and data-backup via the existing infrastructure — no schema or composable changes outside the module itself.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, vue-router, vitest. Same patterns as the Prepositions and Verbs modules.

---

## Pinned design decisions

These were decided during brainstorming and apply throughout the plan:

| Decision | Choice | Rationale |
|---|---|---|
| Module name (English nav) | **Declension** | Matches "Prepositions" sibling naming style; "Cases" overlaps the prep module's case-identification drill |
| German subtitle | **Deklination** | Consistent with existing modules (Substantive, Verben, Adjektive, Präpositionen) |
| Route prefix | `/declension` | English route to match nav label |
| Drill types in v1 | **3**: decline-the-phrase, article-fill, adjective-endings | The 3 highest-leverage drills for B1+ learners |
| Determiner coverage v1 | **3**: definite, indefinite, possessive | Covers ~90% of usage; demonstrative/negative/no-article/interrogative are v2 |
| Adjective-ending input | **Full inflected word** (`schöne`, `schönen`) | Closer to real writing than typing bare endings; less artificial |
| Adj. inflection coverage | **3**: weak, mixed, strong | Determined by what precedes the adjective; complete for the v1 determiner set |
| Curation source | **Curated TS module** (no Gemini) | Predictable, offline, fast — same pattern as prepositions |
| Cheatsheet chapter | **Stretch task** (Task 12) | Module ships without it; implementer can skip if time is tight |

---

## File structure

**Created:**

- `src/data/declension.ts` — schema, level/case/gender/determiner constants, three exported datasets: `DECLENSION_TABLES`, `ARTICLE_FILL_ENTRIES`, `ADJECTIVE_ENDING_ENTRIES`
- `src/composables/useDeclension.ts` — sample + filter helpers across the three datasets
- `src/composables/useDeclensionQuiz.ts` — acceptance + state holders for the three drill types
- `src/modules/declension/DeclensionHome.vue` — 4-card landing
- `src/modules/declension/TablesReference.vue` — browse the canonical declension tables (definite article, indefinite article, possessive endings, weak/mixed/strong adjective endings)
- `src/modules/declension/TableQuizSetup.vue` — filters for decline-the-phrase
- `src/modules/declension/TableQuizRunner.vue` — single-card with 4 input rows (one per case)
- `src/modules/declension/TableQuizResult.vue` — per-entry recap with case-by-case grading
- `src/modules/declension/ArticleQuizSetup.vue` — filters for article-fill
- `src/modules/declension/ArticleQuizRunner.vue` — single-card per sentence, text input + inline result
- `src/modules/declension/AdjectiveQuizSetup.vue` — filters for adjective-endings
- `src/modules/declension/AdjectiveQuizRunner.vue` — single-card per sentence, text input + inline result
- `tests/data/declension.test.ts` — data integrity
- `tests/composables/useDeclensionQuiz.test.ts` — acceptance

**Modified:**

- `src/router.ts` — 10 new routes (one for tables-reference + setup/run/result × 3 quizzes; result is inlined for article + adjective)
- `src/components/NavShell.vue` — add "Declension" between Prepositions and History
- `src/composables/useQuizHistory.ts` — extend `QuizHistoryType` with 3 new values + extend `QuizHistoryMeta` with declension-specific fields
- `src/components/charts/quiz-type-labels.ts` — label/de map entries + order
- `src/modules/history/HistoryPage.vue` — `QUIZ_TYPES` entries + `typeOrder` extension
- `src/composables/useUserData.ts` — 3 new keys in `USER_DATA_KEYS` + `KEY_LABELS`
- `tests/composables/useUserData.test.ts` — assert new keys appear in the export summary
- `src/composables/useQuizStats.ts` — extend `zeroRunsByType()` + `zeroAccuracyByType()` factories

---

## Curated dataset summary

Total **~190 entries** across three datasets:

| Dataset | Count | Coverage |
|---|---|---|
| `DECLENSION_TABLES` | 30 | 3 determiners × 4 genders, 2–3 noun examples per bucket |
| `ARTICLE_FILL_ENTRIES` | 80 | A1–B2 sentences, distributed across cases + determiners + genders |
| `ADJECTIVE_ENDING_ENTRIES` | 80 | A1–B2 sentences, distributed across cases + inflections + genders |

Same curation effort as the prepositions module.

---

## Tasks

### Task 1: Schema + curated dataset

**Files:**
- Create: `src/data/declension.ts`

The dataset file is the foundation. Get the types right first; the implementer then populates ~190 examples mechanically.

- [ ] **Step 1: Type definitions + constants**

```ts
// src/data/declension.ts

export type DeclCase = 'nominative' | 'accusative' | 'dative' | 'genitive'
export type DeclGender = 'masculine' | 'feminine' | 'neuter' | 'plural'
export type Determiner = 'definite' | 'indefinite' | 'possessive'
export type Inflection = 'weak' | 'strong' | 'mixed'
export type DeclLevel = 'A1' | 'A2' | 'B1' | 'B2'

/** A canonical declension-table entry. The user produces all 4 case forms
 *  given the dictionary form + determiner + gender as the prompt. */
export interface DeclensionEntry {
  id: string                    // lowercase kebab — used as storage key + test id
  level: DeclLevel
  determiner: Determiner
  gender: DeclGender
  /** Optional descriptive adjective in dictionary form, shown as part of the prompt */
  adjective?: string            // e.g. "schön"
  /** Noun in dictionary form (capitalised) */
  noun: string                  // e.g. "Mann"
  /** What lemma to use for possessive determiners — ignored for def/indef */
  possessiveLemma?: string      // e.g. "mein" — required when determiner === 'possessive'
  /** Expected full noun-phrase per case, including the determiner + noun + any
   *  case-driven suffix changes (e.g. genitive -s). */
  forms: Record<DeclCase, string>
  /** Optional marginalia tip displayed alongside the prompt */
  hint?: string
}

/** A single sentence with one article blanked. Tests "given the case is X,
 *  produce the article form". The case is named in the UI as a hint. */
export interface ArticleFillEntry {
  id: string
  level: DeclLevel
  case: DeclCase
  gender: DeclGender
  determiner: Determiner
  /** Sentence with the article in place — shown after submit */
  sentence: string
  /** Same sentence with the article replaced by '___' */
  blanked: string
  /** The article the user must produce */
  expectedAnswer: string
  /** Additional acceptable forms — rare */
  alternatives?: string[]
  gloss: string
  /** Brief explanation of why this case applies — shown in feedback */
  caseRationale: string         // e.g. "Dativ: indirect object of geben"
}

/** A single sentence with an adjective ending blanked. Tests the weak/mixed/strong
 *  ending rule. The user produces the FULL inflected word (e.g. "schöne"), not
 *  just the ending. */
export interface AdjectiveEndingEntry {
  id: string
  level: DeclLevel
  inflection: Inflection
  case: DeclCase
  gender: DeclGender
  /** What precedes the adjective — drives the inflection type */
  preceding: Determiner | 'none'
  /** Sentence with the inflected adjective in place — shown after submit */
  sentence: string
  /** Same sentence with the adjective replaced by '___' */
  blanked: string
  /** Dictionary form of the adjective — shown as a hint */
  baseAdjective: string         // e.g. "schön"
  /** Full inflected form the user must produce */
  expectedAnswer: string        // e.g. "schöne"
  /** Additional acceptable forms — rare */
  alternatives?: string[]
  gloss: string
}

export const DECL_CASES = ['nominative', 'accusative', 'dative', 'genitive'] as const
export const DECL_GENDERS = ['masculine', 'feminine', 'neuter', 'plural'] as const
export const DECL_DETERMINERS = ['definite', 'indefinite', 'possessive'] as const
export const DECL_INFLECTIONS = ['weak', 'strong', 'mixed'] as const
export const DECL_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const

/** Short German labels for the case axis used by the runner UI */
export const CASE_LABEL_DE: Record<DeclCase, string> = {
  nominative: 'Nominativ',
  accusative: 'Akkusativ',
  dative: 'Dativ',
  genitive: 'Genitiv'
}

/** Short English labels for the gender axis */
export const GENDER_LABEL: Record<DeclGender, string> = {
  masculine: 'masculine',
  feminine: 'feminine',
  neuter: 'neuter',
  plural: 'plural'
}
```

- [ ] **Step 2: Populate `DECLENSION_TABLES` (30 entries)**

3 determiners × 4 genders = 12 combinations. Aim for 2–3 entries per combination, biased toward A1–A2 nouns. Pattern (use these as the verbatim seeds and extend with similar entries):

```ts
export const DECLENSION_TABLES: DeclensionEntry[] = [
  // ── Definite article ──────────────────────────────────────────
  {
    id: 'def-m-tisch', level: 'A1', determiner: 'definite', gender: 'masculine',
    noun: 'Tisch',
    forms: {
      nominative: 'der Tisch',
      accusative: 'den Tisch',
      dative: 'dem Tisch',
      genitive: 'des Tisches'
    },
    hint: 'Masculine nouns add -s or -es in the genitive singular.'
  },
  {
    id: 'def-f-frau', level: 'A1', determiner: 'definite', gender: 'feminine',
    noun: 'Frau',
    forms: {
      nominative: 'die Frau',
      accusative: 'die Frau',
      dative: 'der Frau',
      genitive: 'der Frau'
    },
    hint: 'Feminine nouns are unchanged in the singular — only the article shifts.'
  },
  {
    id: 'def-n-buch', level: 'A1', determiner: 'definite', gender: 'neuter',
    noun: 'Buch',
    forms: {
      nominative: 'das Buch',
      accusative: 'das Buch',
      dative: 'dem Buch',
      genitive: 'des Buches'
    }
  },
  {
    id: 'def-pl-kinder', level: 'A1', determiner: 'definite', gender: 'plural',
    noun: 'Kinder',
    forms: {
      nominative: 'die Kinder',
      accusative: 'die Kinder',
      dative: 'den Kindern',
      genitive: 'der Kinder'
    },
    hint: 'Plural dative takes -n on the noun (unless it already ends in -n or -s).'
  },

  // ── Indefinite article ────────────────────────────────────────
  {
    id: 'indef-m-mann', level: 'A1', determiner: 'indefinite', gender: 'masculine',
    noun: 'Mann',
    forms: {
      nominative: 'ein Mann',
      accusative: 'einen Mann',
      dative: 'einem Mann',
      genitive: 'eines Mannes'
    }
  },
  {
    id: 'indef-f-frau', level: 'A1', determiner: 'indefinite', gender: 'feminine',
    noun: 'Frau',
    forms: {
      nominative: 'eine Frau',
      accusative: 'eine Frau',
      dative: 'einer Frau',
      genitive: 'einer Frau'
    }
  },
  // …populate the other 6 indef combinations…

  // ── Possessive ────────────────────────────────────────────────
  {
    id: 'poss-m-bruder-mein', level: 'A1', determiner: 'possessive', gender: 'masculine',
    possessiveLemma: 'mein', noun: 'Bruder',
    forms: {
      nominative: 'mein Bruder',
      accusative: 'meinen Bruder',
      dative: 'meinem Bruder',
      genitive: 'meines Bruders'
    },
    hint: 'Possessives take the same endings as the indefinite article.'
  }
  // …populate the other 11 possessive combinations (vary the lemma: mein/dein/sein/ihr/unser/euer)…
]
```

**Required coverage for the implementer:**
- Definite × {m, f, n, pl} × 2–3 noun examples each = 8–12 entries
- Indefinite × {m, f, n} × 2–3 noun examples each = 6–9 entries (plural has no indefinite form — skip)
- Possessive × {m, f, n, pl} × 2–3 noun examples each, varying the lemma across `mein/dein/sein/ihr/unser/euer` = 8–12 entries

Total target: **~30 entries**.

Genitive masculine/neuter noun suffix rules (the implementer must follow these):
- Most one-syllable nouns add `-es` (`das Buch → des Buches`, `der Mann → eines Mannes`)
- Most multi-syllable nouns add `-s` (`der Bruder → meines Bruders`, `der Lehrer → des Lehrers`)
- Weak masculine nouns (`-n` declension: `Student`, `Junge`, `Mensch`) add `-en` in all non-nominative cases (`des Studenten`, `den Studenten`, `dem Studenten`). Pick at least one to include.

- [ ] **Step 3: Populate `ARTICLE_FILL_ENTRIES` (80 sentences)**

Use this seed for the implementer:

```ts
export const ARTICLE_FILL_ENTRIES: ArticleFillEntry[] = [
  {
    id: 'art-nom-m-001', level: 'A1', case: 'nominative', gender: 'masculine', determiner: 'definite',
    sentence: 'Der Hund schläft.',
    blanked: '___ Hund schläft.',
    expectedAnswer: 'Der',
    alternatives: ['der'],
    gloss: 'The dog is sleeping.',
    caseRationale: 'Nominativ: subject of schlafen.'
  },
  {
    id: 'art-acc-m-001', level: 'A1', case: 'accusative', gender: 'masculine', determiner: 'definite',
    sentence: 'Ich sehe den Hund.',
    blanked: 'Ich sehe ___ Hund.',
    expectedAnswer: 'den',
    gloss: 'I see the dog.',
    caseRationale: 'Akkusativ: direct object of sehen.'
  },
  {
    id: 'art-dat-m-001', level: 'A1', case: 'dative', gender: 'masculine', determiner: 'definite',
    sentence: 'Ich gebe dem Mann das Buch.',
    blanked: 'Ich gebe ___ Mann das Buch.',
    expectedAnswer: 'dem',
    gloss: 'I give the book to the man.',
    caseRationale: 'Dativ: indirect object of geben (recipient).'
  },
  {
    id: 'art-gen-m-001', level: 'B1', case: 'genitive', gender: 'masculine', determiner: 'definite',
    sentence: 'Das Auto des Vaters ist neu.',
    blanked: 'Das Auto ___ Vaters ist neu.',
    expectedAnswer: 'des',
    gloss: "The father's car is new.",
    caseRationale: 'Genitiv: possession (whose car?).'
  }
  // …populate ~76 more across cases/genders/determiners…
]
```

**Distribution target** (rough — implementer should aim for):
- Nominative ~20 entries
- Accusative ~20 entries
- Dative ~25 entries (most useful drill — biggest learner gap)
- Genitive ~15 entries
- Per case: roughly 1/3 each masculine, feminine, neuter, with plurals sprinkled (~10% of total)
- Per case: roughly 40% definite, 35% indefinite, 25% possessive

Constraints (asserted by tests):
- `blanked` contains exactly `___`
- `sentence` equals `blanked` with `___` replaced by `expectedAnswer`
- `expectedAnswer` is unique within `sentence` (so the grader can't false-match a substring elsewhere)
- `caseRationale` is non-empty for every entry

- [ ] **Step 4: Populate `ADJECTIVE_ENDING_ENTRIES` (80 sentences)**

```ts
export const ADJECTIVE_ENDING_ENTRIES: AdjectiveEndingEntry[] = [
  {
    id: 'adj-weak-nom-m-001', level: 'A2', inflection: 'weak', case: 'nominative', gender: 'masculine',
    preceding: 'definite',
    sentence: 'Der schöne Park ist groß.',
    blanked: 'Der ___ Park ist groß.',
    baseAdjective: 'schön',
    expectedAnswer: 'schöne',
    gloss: 'The beautiful park is big.'
  },
  {
    id: 'adj-mixed-acc-m-001', level: 'A2', inflection: 'mixed', case: 'accusative', gender: 'masculine',
    preceding: 'indefinite',
    sentence: 'Ich sehe einen schönen Park.',
    blanked: 'Ich sehe einen ___ Park.',
    baseAdjective: 'schön',
    expectedAnswer: 'schönen',
    gloss: 'I see a beautiful park.'
  },
  {
    id: 'adj-strong-nom-pl-001', level: 'B1', inflection: 'strong', case: 'nominative', gender: 'plural',
    preceding: 'none',
    sentence: 'Frische Brötchen schmecken gut.',
    blanked: '___ Brötchen schmecken gut.',
    baseAdjective: 'frisch',
    expectedAnswer: 'Frische',
    alternatives: ['frische'],
    gloss: 'Fresh rolls taste good.'
  }
  // …populate ~77 more across inflection × case × gender × preceding combos…
]
```

**Inflection rule quick reference (implementer must follow):**

*Weak* (after definite-style determiner: der/die/das/dieser/jener/welcher):
- All nominative + accusative-feminine/neuter/plural → `-e`
- All others (masc-acc, all-dative, all-genitive, plural-dat) → `-en`

*Mixed* (after ein-style determiner: ein/kein/mein/dein/...):
- Nom masc → `-er`, Nom fem → `-e`, Nom neut → `-es`
- Acc masc → `-en`, Acc fem → `-e`, Acc neut → `-es`
- All dative + genitive → `-en`
- Plural → strong endings (because ein has no plural form)

*Strong* (no determiner):
- Nom masc → `-er`, Nom fem → `-e`, Nom neut → `-es`, Nom plural → `-e`
- Acc masc → `-en`, Acc fem → `-e`, Acc neut → `-es`, Acc plural → `-e`
- Dat masc → `-em`, Dat fem → `-er`, Dat neut → `-em`, Dat plural → `-en`
- Gen masc → `-en`, Gen fem → `-er`, Gen neut → `-en`, Gen plural → `-er`

**Distribution target:**
- ~30 weak entries (most common — definite article is everywhere)
- ~30 mixed entries (very common — ein/mein/kein constructions)
- ~20 strong entries (less common but pedagogically critical)
- Across all four cases, biased toward dative + accusative

- [ ] **Step 5: Verify + commit**

Run: `npm run typecheck` → clean
Open the file and self-audit:
- 30 + 80 + 80 = 190 entries total
- Every entry has a unique id (kebab-case)
- Every `expectedAnswer` reconstructs the original `sentence` when substituted into `blanked`
- No accidental encoding issues with umlauts (`ä`, `ö`, `ü`, `ß`)

```bash
git add src/data/declension.ts
git commit -m "$(cat <<'EOF'
feat(declension): schema + curated dataset (190 entries, A1–B2)

Adds src/data/declension.ts with three parallel datasets:

  * DECLENSION_TABLES (30): one full nom/acc/dat/gen table per
    {determiner × gender × noun} bucket, covering definite,
    indefinite, and possessive determiners across masculine,
    feminine, neuter, and plural genders. Genitive forms include
    the noun's case suffix (des Mannes, des Buches, des Studenten).

  * ARTICLE_FILL_ENTRIES (80): A1–B2 sentences with a single
    article blanked. Each entry names the case + gender + determiner
    and supplies a caseRationale ("Dativ: indirect object of geben")
    shown in feedback.

  * ADJECTIVE_ENDING_ENTRIES (80): A1–B2 sentences with the
    inflected adjective blanked. Annotated with inflection type
    (weak / mixed / strong) and what precedes the adjective.
    Coverage skews toward dative + accusative — the two cases
    where learners trip on adjective endings the most.

Type-level enums for the case / gender / determiner / inflection
axes are exported for downstream filter UIs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Data integrity tests

**Files:**
- Create: `tests/data/declension.test.ts`

- [ ] **Step 1: Write tests**

```ts
// tests/data/declension.test.ts
import { describe, test, expect } from 'vitest'
import {
  DECLENSION_TABLES,
  ARTICLE_FILL_ENTRIES,
  ADJECTIVE_ENDING_ENTRIES,
  DECL_CASES, DECL_GENDERS, DECL_DETERMINERS, DECL_INFLECTIONS, DECL_LEVELS
} from '../../src/data/declension'

describe('declension tables', () => {
  test('all ids unique', () => {
    const ids = DECLENSION_TABLES.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('every entry has all 4 case forms', () => {
    for (const e of DECLENSION_TABLES) {
      for (const c of DECL_CASES) {
        expect(e.forms[c], `${e.id} missing ${c}`).toBeTruthy()
      }
    }
  })

  test('possessive entries declare a possessiveLemma', () => {
    for (const e of DECLENSION_TABLES) {
      if (e.determiner === 'possessive') {
        expect(e.possessiveLemma, `${e.id}: possessive missing lemma`).toBeTruthy()
      }
    }
  })

  test('every form mentions the noun (case shift on the noun is allowed)', () => {
    for (const e of DECLENSION_TABLES) {
      const stem = e.noun.slice(0, Math.max(3, e.noun.length - 2)) // tolerate suffix changes
      for (const c of DECL_CASES) {
        expect(e.forms[c].toLowerCase()).toContain(stem.toLowerCase())
      }
    }
  })

  test('valid enum values', () => {
    const cases = new Set<string>(DECL_CASES)
    const genders = new Set<string>(DECL_GENDERS)
    const determiners = new Set<string>(DECL_DETERMINERS)
    const levels = new Set<string>(DECL_LEVELS)
    for (const e of DECLENSION_TABLES) {
      expect(determiners.has(e.determiner)).toBe(true)
      expect(genders.has(e.gender)).toBe(true)
      expect(levels.has(e.level)).toBe(true)
      for (const c of Object.keys(e.forms)) expect(cases.has(c)).toBe(true)
    }
  })
})

describe('article-fill entries', () => {
  test('all ids unique', () => {
    const ids = ARTICLE_FILL_ENTRIES.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('every blanked contains exactly one "___"', () => {
    for (const e of ARTICLE_FILL_ENTRIES) {
      const count = e.blanked.split('___').length - 1
      expect(count, `${e.id}: ${count} blanks in "${e.blanked}"`).toBe(1)
    }
  })

  test('sentence = blanked with ___ replaced by expectedAnswer', () => {
    for (const e of ARTICLE_FILL_ENTRIES) {
      const reconstructed = e.blanked.replace('___', e.expectedAnswer)
      expect(reconstructed, `${e.id}: reconstruction mismatch`).toBe(e.sentence)
    }
  })

  test('expectedAnswer is unique within the sentence', () => {
    for (const e of ARTICLE_FILL_ENTRIES) {
      const count = e.sentence.split(e.expectedAnswer).length - 1
      expect(count, `${e.id}: "${e.expectedAnswer}" appears ${count}x in "${e.sentence}"`).toBe(1)
    }
  })

  test('caseRationale is non-empty', () => {
    for (const e of ARTICLE_FILL_ENTRIES) {
      expect(e.caseRationale.trim().length, `${e.id}: empty caseRationale`).toBeGreaterThan(0)
    }
  })

  test('valid enum values', () => {
    const cases = new Set<string>(DECL_CASES)
    const genders = new Set<string>(DECL_GENDERS)
    const determiners = new Set<string>(DECL_DETERMINERS)
    for (const e of ARTICLE_FILL_ENTRIES) {
      expect(cases.has(e.case)).toBe(true)
      expect(genders.has(e.gender)).toBe(true)
      expect(determiners.has(e.determiner)).toBe(true)
    }
  })
})

describe('adjective-ending entries', () => {
  test('all ids unique', () => {
    const ids = ADJECTIVE_ENDING_ENTRIES.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('every blanked contains exactly one "___"', () => {
    for (const e of ADJECTIVE_ENDING_ENTRIES) {
      const count = e.blanked.split('___').length - 1
      expect(count).toBe(1)
    }
  })

  test('sentence = blanked with ___ replaced by expectedAnswer', () => {
    for (const e of ADJECTIVE_ENDING_ENTRIES) {
      const reconstructed = e.blanked.replace('___', e.expectedAnswer)
      expect(reconstructed, `${e.id}: reconstruction mismatch`).toBe(e.sentence)
    }
  })

  test('expectedAnswer starts with baseAdjective stem', () => {
    for (const e of ADJECTIVE_ENDING_ENTRIES) {
      const stem = e.baseAdjective.toLowerCase()
      expect(e.expectedAnswer.toLowerCase().startsWith(stem),
        `${e.id}: "${e.expectedAnswer}" doesn't start with stem "${stem}"`).toBe(true)
    }
  })

  test("inflection matches preceding determiner", () => {
    for (const e of ADJECTIVE_ENDING_ENTRIES) {
      if (e.preceding === 'definite' && e.inflection !== 'weak')
        throw new Error(`${e.id}: definite preceding should be weak, got ${e.inflection}`)
      if ((e.preceding === 'indefinite' || e.preceding === 'possessive') &&
          e.inflection !== 'mixed' && !(e.gender === 'plural' && e.inflection === 'strong'))
        throw new Error(`${e.id}: indef/poss preceding should be mixed (or strong if plural), got ${e.inflection}`)
      if (e.preceding === 'none' && e.inflection !== 'strong')
        throw new Error(`${e.id}: no preceding should be strong, got ${e.inflection}`)
    }
  })

  test('valid enum values', () => {
    const cases = new Set<string>(DECL_CASES)
    const genders = new Set<string>(DECL_GENDERS)
    const inflections = new Set<string>(DECL_INFLECTIONS)
    for (const e of ADJECTIVE_ENDING_ENTRIES) {
      expect(cases.has(e.case)).toBe(true)
      expect(genders.has(e.gender)).toBe(true)
      expect(inflections.has(e.inflection)).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run + commit**

```bash
npx vitest run tests/data/declension.test.ts
# expect: all green
git add tests/data/declension.test.ts
git commit -m "test(declension): data integrity (17 tests)"
```

---

### Task 3: useDeclension composable

**Files:**
- Create: `src/composables/useDeclension.ts`

Sampling + filtering helpers, mirroring `usePrepositions`.

- [ ] **Step 1: Implement**

```ts
// src/composables/useDeclension.ts
import {
  DECLENSION_TABLES, ARTICLE_FILL_ENTRIES, ADJECTIVE_ENDING_ENTRIES,
  type DeclensionEntry, type ArticleFillEntry, type AdjectiveEndingEntry,
  type DeclCase, type DeclGender, type Determiner, type Inflection, type DeclLevel
} from '../data/declension'

export interface DeclensionFilter {
  levels?: DeclLevel[]
  determiners?: Determiner[]
  genders?: DeclGender[]
}
export interface ArticleFilter {
  levels?: DeclLevel[]
  cases?: DeclCase[]
  determiners?: Determiner[]
  genders?: DeclGender[]
}
export interface AdjectiveFilter {
  levels?: DeclLevel[]
  inflections?: Inflection[]
  cases?: DeclCase[]
  genders?: DeclGender[]
}

function setOf<T extends string>(arr: T[] | undefined): Set<T> | null {
  return arr && arr.length > 0 ? new Set(arr) : null
}

export function filterDeclensionTables(f: DeclensionFilter = {}): DeclensionEntry[] {
  const levels = setOf(f.levels)
  const determiners = setOf(f.determiners)
  const genders = setOf(f.genders)
  return DECLENSION_TABLES.filter(e => {
    if (levels && !levels.has(e.level)) return false
    if (determiners && !determiners.has(e.determiner)) return false
    if (genders && !genders.has(e.gender)) return false
    return true
  })
}

export function sampleDeclensionTables(count: number, f: DeclensionFilter = {}): DeclensionEntry[] {
  const pool = filterDeclensionTables(f)
  return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length))
}

export function filterArticleFill(f: ArticleFilter = {}): ArticleFillEntry[] {
  const levels = setOf(f.levels)
  const cases = setOf(f.cases)
  const determiners = setOf(f.determiners)
  const genders = setOf(f.genders)
  return ARTICLE_FILL_ENTRIES.filter(e => {
    if (levels && !levels.has(e.level)) return false
    if (cases && !cases.has(e.case)) return false
    if (determiners && !determiners.has(e.determiner)) return false
    if (genders && !genders.has(e.gender)) return false
    return true
  })
}

export function sampleArticleFill(count: number, f: ArticleFilter = {}): ArticleFillEntry[] {
  const pool = filterArticleFill(f)
  return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length))
}

export function filterAdjectiveEndings(f: AdjectiveFilter = {}): AdjectiveEndingEntry[] {
  const levels = setOf(f.levels)
  const inflections = setOf(f.inflections)
  const cases = setOf(f.cases)
  const genders = setOf(f.genders)
  return ADJECTIVE_ENDING_ENTRIES.filter(e => {
    if (levels && !levels.has(e.level)) return false
    if (inflections && !inflections.has(e.inflection)) return false
    if (cases && !cases.has(e.case)) return false
    if (genders && !genders.has(e.gender)) return false
    return true
  })
}

export function sampleAdjectiveEndings(count: number, f: AdjectiveFilter = {}): AdjectiveEndingEntry[] {
  const pool = filterAdjectiveEndings(f)
  return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length))
}

export function useDeclension() {
  return {
    tables: DECLENSION_TABLES,
    articleEntries: ARTICLE_FILL_ENTRIES,
    adjectiveEntries: ADJECTIVE_ENDING_ENTRIES,
    filterDeclensionTables, sampleDeclensionTables,
    filterArticleFill, sampleArticleFill,
    filterAdjectiveEndings, sampleAdjectiveEndings
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npm run typecheck
git add src/composables/useDeclension.ts
git commit -m "feat(declension): useDeclension sampling + filter helpers"
```

---

### Task 4: useDeclensionQuiz composable + tests

**Files:**
- Create: `src/composables/useDeclensionQuiz.ts`
- Create: `tests/composables/useDeclensionQuiz.test.ts`

TDD the acceptance functions — multiple normalization rules + edge cases.

- [ ] **Step 1: Write failing tests**

```ts
// tests/composables/useDeclensionQuiz.test.ts
import { describe, test, expect } from 'vitest'
import { checkForm, checkArticle, checkAdjective } from '../../src/composables/useDeclensionQuiz'

describe('checkForm — multi-word noun phrase acceptance', () => {
  test('exact match accepts', () => {
    expect(checkForm('des Mannes', 'des Mannes', [])).toBe(true)
  })
  test('case-insensitive', () => {
    expect(checkForm('DES MANNES', 'des Mannes', [])).toBe(true)
  })
  test('trims and collapses inner whitespace', () => {
    expect(checkForm('  des   Mannes  ', 'des Mannes', [])).toBe(true)
  })
  test('rejects wrong article', () => {
    expect(checkForm('den Mannes', 'des Mannes', [])).toBe(false)
  })
  test('rejects missing genitive -s', () => {
    expect(checkForm('des Mann', 'des Mannes', [])).toBe(false)
  })
  test('accepts a listed alternative', () => {
    expect(checkForm('des Manns', 'des Mannes', ['des Manns'])).toBe(true)
  })
  test('rejects empty input', () => {
    expect(checkForm('', 'des Mannes', [])).toBe(false)
    expect(checkForm('   ', 'des Mannes', [])).toBe(false)
  })
})

describe('checkArticle — single-word article acceptance', () => {
  test('exact match accepts', () => {
    expect(checkArticle('dem', 'dem', [])).toBe(true)
  })
  test('case-insensitive', () => {
    expect(checkArticle('Dem', 'dem', [])).toBe(true)
  })
  test('rejects empty + wrong', () => {
    expect(checkArticle('', 'dem', [])).toBe(false)
    expect(checkArticle('den', 'dem', [])).toBe(false)
  })
  test('accepts capitalized variant (sentence-initial)', () => {
    expect(checkArticle('der', 'Der', [])).toBe(true)
  })
})

describe('checkAdjective — adjective ending acceptance', () => {
  test('full inflected form accepts', () => {
    expect(checkAdjective('schöne', 'schöne', [])).toBe(true)
  })
  test('case-insensitive', () => {
    expect(checkAdjective('SCHÖNE', 'schöne', [])).toBe(true)
  })
  test('trims whitespace', () => {
    expect(checkAdjective('  schöne  ', 'schöne', [])).toBe(true)
  })
  test('rejects empty + wrong ending', () => {
    expect(checkAdjective('', 'schöne', [])).toBe(false)
    expect(checkAdjective('schönen', 'schöne', [])).toBe(false)
  })
  test('does NOT accept the bare stem (the whole point of the drill)', () => {
    expect(checkAdjective('schön', 'schöne', [])).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run tests/composables/useDeclensionQuiz.test.ts
# expect: module-not-found errors
```

- [ ] **Step 3: Implement**

```ts
// src/composables/useDeclensionQuiz.ts
import { computed, ref } from 'vue'
import type {
  DeclensionEntry, ArticleFillEntry, AdjectiveEndingEntry,
  DeclCase
} from '../data/declension'
import { DECL_CASES } from '../data/declension'

// ── Acceptance helpers ──────────────────────────────────────────

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function checkForm(input: string, expected: string, alternatives: string[]): boolean {
  const a = normalize(input)
  if (a.length === 0) return false
  if (normalize(expected) === a) return true
  return alternatives.some(alt => normalize(alt) === a)
}

export function checkArticle(input: string, expected: string, alternatives: string[]): boolean {
  return checkForm(input, expected, alternatives)
}

export function checkAdjective(input: string, expected: string, alternatives: string[]): boolean {
  return checkForm(input, expected, alternatives)
}

// ── Decline-the-phrase quiz state ───────────────────────────────

export interface TableRowResult {
  case: DeclCase
  expected: string
  userAnswer: string
  isCorrect: boolean
}

export interface TableQuestion {
  entry: DeclensionEntry
  rows: TableRowResult[]
  correctCount: number
  totalCount: number
  submitted: boolean
}

export function useTableQuiz(entries: DeclensionEntry[]) {
  const questions = ref<TableQuestion[]>(
    entries.map(e => ({
      entry: e,
      rows: DECL_CASES.map(c => ({
        case: c, expected: e.forms[c], userAnswer: '', isCorrect: false
      })),
      correctCount: 0,
      totalCount: DECL_CASES.length,
      submitted: false
    }))
  )
  const currentIndex = ref(0)

  function submit(answers: string[]) {
    const q = questions.value[currentIndex.value]
    if (!q) return
    let correct = 0
    q.rows.forEach((row, i) => {
      const userAnswer = answers[i] ?? ''
      const ok = checkForm(userAnswer, row.expected, [])
      row.userAnswer = userAnswer
      row.isCorrect = ok
      if (ok) correct++
    })
    q.correctCount = correct
    q.submitted = true
  }

  function advance() { currentIndex.value += 1 }
  function skip() {
    submit(new Array(DECL_CASES.length).fill(''))
    advance()
  }

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const total = computed(() => questions.value.length)
  const totalRows = computed(() => questions.value.reduce((s, q) => s + q.totalCount, 0))
  const correctRows = computed(() => questions.value.reduce((s, q) => s + q.correctCount, 0))

  return { questions, currentIndex, current, finished, total, totalRows, correctRows, submit, advance, skip }
}

// ── Article-fill quiz state ─────────────────────────────────────

export interface ArticleQuestion {
  entry: ArticleFillEntry
  userAnswer: string
  isCorrect: boolean | null
}

export function useArticleQuiz(entries: ArticleFillEntry[]) {
  const questions = ref<ArticleQuestion[]>(
    entries.map(e => ({ entry: e, userAnswer: '', isCorrect: null }))
  )
  const currentIndex = ref(0)

  function submit(answer: string) {
    const q = questions.value[currentIndex.value]
    if (!q) return
    q.userAnswer = answer
    q.isCorrect = checkArticle(answer, q.entry.expectedAnswer, q.entry.alternatives ?? [])
  }
  function advance() { currentIndex.value += 1 }

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  return { questions, currentIndex, current, finished, submit, advance, score, total }
}

// ── Adjective-ending quiz state ─────────────────────────────────

export interface AdjectiveQuestion {
  entry: AdjectiveEndingEntry
  userAnswer: string
  isCorrect: boolean | null
}

export function useAdjQuiz(entries: AdjectiveEndingEntry[]) {
  const questions = ref<AdjectiveQuestion[]>(
    entries.map(e => ({ entry: e, userAnswer: '', isCorrect: null }))
  )
  const currentIndex = ref(0)

  function submit(answer: string) {
    const q = questions.value[currentIndex.value]
    if (!q) return
    q.userAnswer = answer
    q.isCorrect = checkAdjective(answer, q.entry.expectedAnswer, q.entry.alternatives ?? [])
  }
  function advance() { currentIndex.value += 1 }

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  return { questions, currentIndex, current, finished, submit, advance, score, total }
}
```

- [ ] **Step 4: Run + commit**

```bash
npx vitest run tests/composables/useDeclensionQuiz.test.ts
# expect: ~15 tests passing
npm run typecheck
git add src/composables/useDeclensionQuiz.ts tests/composables/useDeclensionQuiz.test.ts
git commit -m "feat(declension): useDeclensionQuiz acceptance + state holders"
```

---

### Task 5: Router + Nav + History + UserData wiring

**Files:**
- Modify: `src/router.ts`
- Modify: `src/components/NavShell.vue`
- Modify: `src/composables/useQuizHistory.ts`
- Modify: `src/components/charts/quiz-type-labels.ts`
- Modify: `src/modules/history/HistoryPage.vue`
- Modify: `src/composables/useUserData.ts`
- Modify: `src/composables/useQuizStats.ts`
- Modify: `tests/composables/useUserData.test.ts`

- [ ] **Step 1: Add 10 routes to `src/router.ts`**

Insert between the existing prepositions routes and the history/settings entries:

```ts
{ path: '/declension', name: 'declension', component: () => import('./modules/declension/DeclensionHome.vue') },
{ path: '/declension/tables', name: 'declension-tables', component: () => import('./modules/declension/TablesReference.vue') },
{ path: '/declension/table-quiz', name: 'declension-table', component: () => import('./modules/declension/TableQuizSetup.vue') },
{ path: '/declension/table-quiz/run', name: 'declension-table-run', component: () => import('./modules/declension/TableQuizRunner.vue') },
{ path: '/declension/table-quiz/result', name: 'declension-table-result', component: () => import('./modules/declension/TableQuizResult.vue') },
{ path: '/declension/article-quiz', name: 'declension-article', component: () => import('./modules/declension/ArticleQuizSetup.vue') },
{ path: '/declension/article-quiz/run', name: 'declension-article-run', component: () => import('./modules/declension/ArticleQuizRunner.vue') },
{ path: '/declension/adj-quiz', name: 'declension-adj', component: () => import('./modules/declension/AdjectiveQuizSetup.vue') },
{ path: '/declension/adj-quiz/run', name: 'declension-adj-run', component: () => import('./modules/declension/AdjectiveQuizRunner.vue') },
```

- [ ] **Step 2: Add NavShell entry**

In `src/components/NavShell.vue`, find the `items` array. After the `prepositions` entry, add:

```ts
{ route: 'declension', label: 'Declension', de: 'Deklination' },
```

- [ ] **Step 3: Extend QuizHistoryType + Meta**

In `src/composables/useQuizHistory.ts`:

```ts
export type QuizHistoryType =
  | 'noun-gender'
  | 'noun-translation'
  | 'adjective'
  | 'verb-translation'
  | 'verb-conjugation'
  | 'prep-case'
  | 'prep-article'
  | 'prep-two-way'
  | 'decl-table'
  | 'decl-article'
  | 'decl-adjective'

export interface QuizHistoryMeta {
  mode?: 'gender' | 'translation'
  groups?: string[]
  levels?: string[]
  types?: string[]
  cases?: string[]
  tenses?: string[]
  prepLevels?: string[]
  prepCases?: string[]
  declLevels?: string[]
  declCases?: string[]
  declDeterminers?: string[]
  declInflections?: string[]
}
```

- [ ] **Step 4: Extend quiz-type labels**

In `src/components/charts/quiz-type-labels.ts`, add three entries to each of the three exports:

```ts
// QUIZ_TYPE_LABEL — add at the bottom
'decl-table': 'Declension · table',
'decl-article': 'Declension · article',
'decl-adjective': 'Declension · adj. ending'

// QUIZ_TYPE_DE — add at the bottom
'decl-table': 'Deklination · Tabelle',
'decl-article': 'Deklination · Artikel',
'decl-adjective': 'Deklination · Endung'

// QUIZ_TYPES_ORDER — append
'decl-table',
'decl-article',
'decl-adjective'
```

- [ ] **Step 5: Extend HistoryPage QUIZ_TYPES + typeOrder**

In `src/modules/history/HistoryPage.vue`, extend the `QUIZ_TYPES` map and `typeOrder` array with the three new entries (label/de/module='Declension', plus added to the ordered list).

- [ ] **Step 6: Extend useUserData**

In `src/composables/useUserData.ts`, add to `USER_DATA_KEYS` (after the prep setup keys, before legacy keys):

```ts
'declTableSetup',
'declArticleSetup',
'declAdjectiveSetup',
```

Add to `KEY_LABELS`:

```ts
declTableSetup: { label: 'Declension table quiz setup', group: 'Quiz setup' },
declArticleSetup: { label: 'Declension article quiz setup', group: 'Quiz setup' },
declAdjectiveSetup: { label: 'Declension adjective quiz setup', group: 'Quiz setup' },
```

- [ ] **Step 7: Extend useQuizStats zero record factories**

In `src/composables/useQuizStats.ts`, extend BOTH `zeroRunsByType()` and `zeroAccuracyByType()` with three new entries each (`'decl-table'`, `'decl-article'`, `'decl-adjective'`) — `0` and `emptyBucket()` respectively. Mirrors the prep-* fix from commit `4e50af6`.

- [ ] **Step 8: Add userdata test**

In `tests/composables/useUserData.test.ts`, append:

```ts
test('declension setup keys are recognized', () => {
  localStorage.setItem('declTableSetup', JSON.stringify({ levels: ['A1'], count: 10 }))
  localStorage.setItem('declArticleSetup', JSON.stringify({ levels: ['A1'], count: 10 }))
  localStorage.setItem('declAdjectiveSetup', JSON.stringify({ levels: ['A1'], count: 10 }))
  const out = buildExport()
  expect(out.data['declTableSetup']).toEqual({ levels: ['A1'], count: 10 })
  expect(out.data['declArticleSetup']).toEqual({ levels: ['A1'], count: 10 })
  expect(out.data['declAdjectiveSetup']).toEqual({ levels: ['A1'], count: 10 })
})
```

- [ ] **Step 9: Verify + commit**

```bash
npm run typecheck
# expect: 10 TS2307 errors (the unresolved .vue files — fine; later tasks fix them)
npx vitest run tests/composables/useUserData.test.ts
# expect: 9 passing (8 existing + 1 new)
git add -A
git commit -m "feat(declension): router + nav + history + userdata wiring"
```

---

### Task 6: DeclensionHome landing

**Files:**
- Create: `src/modules/declension/DeclensionHome.vue`

4-card module grid. Same shape as `PrepositionsHome.vue`.

- [ ] **Step 1: Implement**

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

interface Card { numeral: string; route: string; title: string; de: string; desc: string; cta: string }

const cards: Card[] = [
  { numeral: 'A', route: 'declension-tables', title: 'Tables reference', de: 'Tabellen',
    desc: 'Browse the canonical declension tables — definite, indefinite, possessive articles, and weak/mixed/strong adjective endings.',
    cta: 'Open' },
  { numeral: 'B', route: 'declension-table', title: 'Decline the phrase', de: 'Vier Fälle',
    desc: 'Given a noun phrase in the nominative, type all four case forms. The foundational drill of German grammar.',
    cta: 'Start' },
  { numeral: 'C', route: 'declension-article', title: 'Article in context', de: 'Artikel einsetzen',
    desc: 'Fill in the missing article in a real sentence. The case rule is given as a hint above.',
    cta: 'Start' },
  { numeral: 'D', route: 'declension-adj', title: 'Adjective endings', de: 'Adjektivendungen',
    desc: 'Produce the correct inflected adjective. Weak / mixed / strong inflection is named above each prompt.',
    cta: 'Start' }
]
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel V · Deklination</div>
        <h1 class="section-title">Declension<em>.</em></h1>
        <p class="section-subtitle">
          Four cases × three genders × the article ahead of the adjective — the system that
          turns vocabulary into actual sentences. Three drills, one rule each.
        </p>
      </div>
    </header>

    <div class="module-grid">
      <article v-for="c in cards" :key="c.route"
        class="card module-card interactive"
        role="button" tabindex="0"
        @click="router.push({ name: c.route })"
        @keydown.enter="router.push({ name: c.route })">
        <div class="module-numeral">{{ c.numeral }}</div>
        <h2>{{ c.title }}</h2>
        <div class="module-de">{{ c.de }}</div>
        <p class="module-desc">{{ c.desc }}</p>
        <div class="module-cta">{{ c.cta }} <span aria-hidden="true">→</span></div>
      </article>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verify + commit**

```bash
npm run typecheck
# expect: 9 errors (was 10; landing resolves)
git add src/modules/declension/DeclensionHome.vue
git commit -m "feat(declension): home landing — 4-card module grid"
```

---

### Task 7: TablesReference — canonical declension tables

**Files:**
- Create: `src/modules/declension/TablesReference.vue`

Reference card with seven full tables (rendered from in-file constants, not the dataset — these are CANONICAL and never change): definite article (4×4), indefinite (4×3 — no plural), possessive endings (4×4 with `mein` as the example lemma), weak adjective endings, mixed adjective endings, strong adjective endings, personal pronouns (for context, even though we don't drill them).

- [ ] **Step 1: Implement**

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { DECL_CASES, CASE_LABEL_DE } from '../../data/declension'

const router = useRouter()

const DEFINITE = {
  nominative: ['der', 'die', 'das', 'die'],
  accusative: ['den', 'die', 'das', 'die'],
  dative:     ['dem', 'der', 'dem', 'den'],
  genitive:   ['des', 'der', 'des', 'der']
}

const INDEFINITE = {
  nominative: ['ein',   'eine',  'ein',   '—'],
  accusative: ['einen', 'eine',  'ein',   '—'],
  dative:     ['einem', 'einer', 'einem', '—'],
  genitive:   ['eines', 'einer', 'eines', '—']
}

const POSSESSIVE = {
  nominative: ['mein',   'meine',  'mein',   'meine'],
  accusative: ['meinen', 'meine',  'mein',   'meine'],
  dative:     ['meinem', 'meiner', 'meinem', 'meinen'],
  genitive:   ['meines', 'meiner', 'meines', 'meiner']
}

const WEAK = {
  nominative: ['-e',  '-e',  '-e',  '-en'],
  accusative: ['-en', '-e',  '-e',  '-en'],
  dative:     ['-en', '-en', '-en', '-en'],
  genitive:   ['-en', '-en', '-en', '-en']
}

const MIXED = {
  nominative: ['-er', '-e',  '-es', '-e'],
  accusative: ['-en', '-e',  '-es', '-e'],
  dative:     ['-en', '-en', '-en', '-en'],
  genitive:   ['-en', '-en', '-en', '-en']
}

const STRONG = {
  nominative: ['-er', '-e',  '-es', '-e'],
  accusative: ['-en', '-e',  '-es', '-e'],
  dative:     ['-em', '-er', '-em', '-en'],
  genitive:   ['-en', '-er', '-en', '-er']
}

const COL = ['masc.', 'fem.', 'neut.', 'plur.']

function back() { router.push({ name: 'declension' }) }
</script>

<template>
  <div class="page tables-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel V · Tabellen</div>
        <h1 class="section-title">Tables<em>.</em></h1>
        <p class="section-subtitle">The full declension reference — articles + adjective endings.</p>
      </div>
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
    </header>

    <section class="decl-table-block">
      <h2>Definite article</h2>
      <table class="decl-table">
        <thead><tr><th>Case</th><th v-for="c in COL" :key="c">{{ c }}</th></tr></thead>
        <tbody>
          <tr v-for="cs in DECL_CASES" :key="cs">
            <th>{{ CASE_LABEL_DE[cs] }}</th>
            <td v-for="(form, i) in DEFINITE[cs]" :key="i">{{ form }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="decl-table-block">
      <h2>Indefinite article</h2>
      <table class="decl-table">
        <thead><tr><th>Case</th><th v-for="c in COL" :key="c">{{ c }}</th></tr></thead>
        <tbody>
          <tr v-for="cs in DECL_CASES" :key="cs">
            <th>{{ CASE_LABEL_DE[cs] }}</th>
            <td v-for="(form, i) in INDEFINITE[cs]" :key="i">{{ form }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="decl-table-block">
      <h2>Possessive — <code>mein</code> as example (all of mein/dein/sein/ihr/unser/euer follow the same endings)</h2>
      <table class="decl-table">
        <thead><tr><th>Case</th><th v-for="c in COL" :key="c">{{ c }}</th></tr></thead>
        <tbody>
          <tr v-for="cs in DECL_CASES" :key="cs">
            <th>{{ CASE_LABEL_DE[cs] }}</th>
            <td v-for="(form, i) in POSSESSIVE[cs]" :key="i">{{ form }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="decl-table-block">
      <h2>Adjective endings — weak (after definite-style determiner)</h2>
      <table class="decl-table">
        <thead><tr><th>Case</th><th v-for="c in COL" :key="c">{{ c }}</th></tr></thead>
        <tbody>
          <tr v-for="cs in DECL_CASES" :key="cs">
            <th>{{ CASE_LABEL_DE[cs] }}</th>
            <td v-for="(form, i) in WEAK[cs]" :key="i">{{ form }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="decl-table-block">
      <h2>Adjective endings — mixed (after ein/kein/possessive)</h2>
      <table class="decl-table">
        <thead><tr><th>Case</th><th v-for="c in COL" :key="c">{{ c }}</th></tr></thead>
        <tbody>
          <tr v-for="cs in DECL_CASES" :key="cs">
            <th>{{ CASE_LABEL_DE[cs] }}</th>
            <td v-for="(form, i) in MIXED[cs]" :key="i">{{ form }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="decl-table-block">
      <h2>Adjective endings — strong (no determiner)</h2>
      <table class="decl-table">
        <thead><tr><th>Case</th><th v-for="c in COL" :key="c">{{ c }}</th></tr></thead>
        <tbody>
          <tr v-for="cs in DECL_CASES" :key="cs">
            <th>{{ CASE_LABEL_DE[cs] }}</th>
            <td v-for="(form, i) in STRONG[cs]" :key="i">{{ form }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.tables-page { max-width: 880px; }
.decl-table-block { margin: 36px 0; }
.decl-table-block h2 {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 20px;
  margin: 0 0 12px 0;
}
.decl-table-block h2 code {
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 400;
  background: var(--paper-deep);
  padding: 2px 6px;
  border-radius: 2px;
}
.decl-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-display);
  font-size: 17px;
}
.decl-table th, .decl-table td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px dotted var(--hairline);
}
.decl-table thead th {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
  border-bottom: 1px solid var(--rule);
}
.decl-table tbody th {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
  width: 110px;
}
@media (max-width: 600px) {
  .decl-table { font-size: 15px; }
  .decl-table th, .decl-table td { padding: 8px 10px; }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
npm run typecheck
git add src/modules/declension/TablesReference.vue
git commit -m "feat(declension): tables reference page with 6 canonical tables"
```

---

### Task 8: Decline-the-phrase quiz

**Files:**
- Create: `src/modules/declension/TableQuizSetup.vue`
- Create: `src/modules/declension/TableQuizRunner.vue`
- Create: `src/modules/declension/TableQuizResult.vue`

Single-card runner with 4 input rows (one per case). Reuses the verb-conjugation runner's layout almost verbatim — replace 6 person rows with 4 case rows.

**Setup spec:** chip filters for `level` (A1/A2/B1/B2), `determiner` (definite/indefinite/possessive), `gender` (m/f/n/pl), count picker (10/15/20/all/custom). Setup memory at `declTableSetup`.

**Runner spec:**
- Quiz card centred. Prompt shows the noun + adjective base + a German-uppercase metadata line (e.g. "Maskulin · Bestimmter Artikel").
- 4 input rows below the prompt, one per case, labeled with the German case name and the singular dot-style numeral (i, ii, iii, iv). Inputs are full-width, monospace 17px.
- Submit-all button at the bottom. After submit: per-row sage/clay highlight + the canonical answer shown next to wrong rows.
- Next button advances. Final card has a "Finish quiz" label.
- History entry on finish: `type: 'decl-table'`, `count = totalRows` (sum of all 4-row cards), `correct = correctRows`, `meta: { declLevels, declDeterminers }`.

**Result spec:** Standard `result-list` with one row per table card showing: nominative phrase + (m/f/n/pl) + (det type), then a 4-row mini-grid showing user-vs-expected per case with red strikethrough on wrong attempts.

Code shape for the runner is parallel to `ConjugationQuizRunner.vue` — copy the structure and swap the 6 person rows for 4 case rows.

- [ ] **Step 1: Setup page** — copy `prep/CaseQuizSetup.vue` shape, swap filter chips for determiner + gender + level.

- [ ] **Step 2: Runner page** — copy `verbs/ConjugationQuizRunner.vue` shape; replace pronoun rows with case rows; prompt shows `entry.nominative` instead of verb forms.

- [ ] **Step 3: Result page** — copy `verbs/ConjugationQuizResult.vue` shape if it exists, otherwise model after `prep/CaseQuizResult.vue`.

- [ ] **Step 4: Verify** — manual smoke test: navigate to `/declension/table-quiz`, set filters, start a 5-entry quiz, fill some correctly and some wrong, submit each card, verify result page renders correctly, verify history shows the run as "Declension · table".

- [ ] **Step 5: Commit**

```bash
git add src/modules/declension/TableQuiz*.vue
git commit -m "feat(declension): decline-the-phrase quiz (4-input table per card)"
```

---

### Task 9: Article-fill quiz

**Files:**
- Create: `src/modules/declension/ArticleQuizSetup.vue`
- Create: `src/modules/declension/ArticleQuizRunner.vue`

Near-identical to `prep/ArticleQuiz*` — copy that pair and swap:
- Dataset: `sampleArticleFill` from `useDeclension`
- Composable: `useArticleQuiz` from `useDeclensionQuiz`
- Filters: `level + case + determiner + gender` (4 chip groups; prep had 2)
- Setup memory: `declArticleSetup`
- History type: `'decl-article'`
- History meta: `declLevels`, `declCases`, `declDeterminers`
- Hint above prompt: shows `CASE_LABEL_DE[entry.case]` (e.g. "Dativ") — same shape as the prep article quiz's case hint
- Feedback: also shows `entry.caseRationale` (e.g. "Dativ: indirect object of geben") below the canonical answer

- [ ] **Step 1–2: Setup + Runner** following the pattern.

- [ ] **Step 3: Smoke test + commit**

```bash
git add src/modules/declension/ArticleQuiz*.vue
git commit -m "feat(declension): article-fill quiz (single-card with case rationale)"
```

---

### Task 10: Adjective-endings quiz

**Files:**
- Create: `src/modules/declension/AdjectiveQuizSetup.vue`
- Create: `src/modules/declension/AdjectiveQuizRunner.vue`

Same shape as article-fill but with inflection-typed filters:
- Filters: `level + inflection + case + gender`
- Setup memory: `declAdjectiveSetup`
- History type: `'decl-adjective'`
- History meta: `declLevels`, `declCases`, `declInflections`
- Hint above prompt: shows `inflection + case` ("Mixed · Akkusativ")
- Sub-hint on the prompt card: the `baseAdjective` shown in italic muted Fraunces above the input (so the user knows what stem to inflect)
- Input placeholder: "Full inflected form (e.g. schöne)…"

Reuse the runner CSS from `prep/ArticleQuizRunner.vue` — only the hint wording + input placeholder differ.

- [ ] **Step 1–2: Setup + Runner.**

- [ ] **Step 3: Smoke test + commit**

```bash
git add src/modules/declension/AdjectiveQuiz*.vue
git commit -m "feat(declension): adjective-endings quiz (single-card)"
```

---

### Task 11: Verify + deploy

- [ ] **Step 1: Typecheck** — `npm run typecheck` → clean (0 errors)
- [ ] **Step 2: Tests** — `npm test` → expected count ≈ 233 + 17 (data integrity) + 15 (acceptance) + 1 (userdata) = **266 tests**
- [ ] **Step 3: Build** — `npm run build` → succeeds (HistoryPage chunk grows slightly to accommodate new history types; still within bounds)
- [ ] **Step 4: Deploy** — `npm run deploy` + `git checkout -- dist/`
- [ ] **Step 5: Final smoke** — open the live site, navigate `/declension`, click each of the 4 cards, run a 5-entry session of each of the 3 quiz types, confirm `/history` shows the new types and the stats donut + radar + breakdown include them automatically.

---

### Task 12 (stretch): Cheatsheet "Kasus & Deklination" chapter

**Files:**
- Modify: `src/modules/verbs/CheatSheet.vue` (or the existing cheatsheet shell)

Add a new chapter "V · Kasus & Deklination" that hosts the same six tables from `TablesReference.vue` but with prose context: a lead paragraph with drop-cap, the four article tables (definite, indefinite, possessive endings) followed by the three adjective-ending tables (weak, mixed, strong) followed by 4–6 callout boxes covering tricky cases (weak-masculine nouns, genitive -s vs -es, the dative -n plural rule, when to use which inflection).

Skip this task if time is tight — the `/declension/tables` page already covers the reference need without prose.

- [ ] **Step 1: Add chapter to CheatSheet.vue** modelled on the existing chapters I/II.
- [ ] **Step 2: Smoke test.**
- [ ] **Step 3: Commit:**

```bash
git add src/modules/verbs/CheatSheet.vue
git commit -m "feat(cheatsheet): chapter V — Kasus & Deklination"
```

---

## Self-Review

**1. Spec coverage**

- Schema + dataset (Task 1) ✓
- Data integrity (Task 2) ✓
- Sampling helpers (Task 3) ✓
- Acceptance + state holders (Task 4) ✓
- Router + nav + history + userdata + stats wiring (Task 5) ✓
- Landing (Task 6) ✓
- Reference tables (Task 7) ✓
- Decline-the-phrase quiz (Task 8) ✓
- Article-fill quiz (Task 9) ✓
- Adjective-endings quiz (Task 10) ✓
- Verify + deploy (Task 11) ✓
- Cheatsheet chapter (Task 12, stretch) ✓

**2. Placeholder scan**

- Task 1 Steps 2–4 say "populate the other N combinations following the same shape" — unavoidable for ~190 examples; the test suite (Task 2) catches shape errors. The seed examples + grammar rule references are sufficient for an implementer to extend.
- Tasks 8–10 reference "the prep/CaseQuizSetup.vue shape" rather than re-stating the full setup-page boilerplate. The prep module is already in the codebase and the shape is identical except for filter chips; restating it would balloon the plan without adding info.

**3. Type consistency**

- `DeclCase` / `DeclGender` / `Determiner` / `Inflection` / `DeclLevel` — used consistently across the dataset file, composables, setup pages, runner pages, and meta fields.
- Storage keys: `declTableSetup`, `declArticleSetup`, `declAdjectiveSetup` — used consistently across the 3 setup pages, `useUserData` extension, and userdata test.
- History types: `'decl-table'`, `'decl-article'`, `'decl-adjective'` — used consistently across `QuizHistoryType`, labels file, HistoryPage map, and saveQuizRun calls.
- Route names: `declension`, `declension-tables`, `declension-table`, `declension-table-run`, `declension-table-result`, `declension-article`, `declension-article-run`, `declension-adj`, `declension-adj-run` — used consistently across the router, NavShell, landing, all 3 setup pages, all 3 runner pages.

No issues found beyond the explicit dataset-curation hand-offs.

---

## Risks

- **Curation grammar errors.** A native-fluent reviewer should spot-check the dataset before merging — the integrity tests catch shape issues but not grammar mistakes. (The prep module dataset went through 1 review-and-fix cycle for the same reason.)
- **Adjective-ending dataset complexity.** The strong/mixed/weak rule has more rules than any other German grammar topic. The integrity test asserts that `preceding` ↔ `inflection` is consistent, but the ending itself (`-e` vs `-en` vs `-er` etc.) is not auto-verified. Manual review of at least 10–15 random entries per inflection type is recommended.
- **HistoryPage chunk size growth.** Adding 3 more history types + setup-memory keys is incremental. Expected chunk delta: < 5 KB minified. No action required.
- **Reference-tables CSS.** The 6 tables on `TablesReference.vue` are inline data (not in the curated dataset). This is intentional — they're canonical and shouldn't share the test surface with the variable curated data — but it does mean the data is duplicated between the reference tables and the curated examples. Tests are not added for the reference-tables data because it's static and read by humans only.

---

## Effort estimate

| Phase | Days |
|---|---|
| Task 1 — Schema + 190 curated examples + grammar review | 2 |
| Task 2 — Data integrity tests | 0.25 |
| Task 3 — useDeclension composable | 0.25 |
| Task 4 — useDeclensionQuiz composable + tests | 0.5 |
| Task 5 — Router/nav/history/userdata wiring | 0.5 |
| Task 6 — Landing | 0.25 |
| Task 7 — Tables reference | 0.5 |
| Task 8 — Decline-the-phrase quiz (3 components) | 1.0 |
| Task 9 — Article-fill quiz (2 components) | 0.5 |
| Task 10 — Adjective-endings quiz (2 components) | 0.5 |
| Task 11 — Verify + deploy | 0.25 |
| Task 12 (stretch) — Cheatsheet chapter | 0.5 |
| **Total (v1 without cheatsheet)** | **~6 days** |
| **Total (v1 + cheatsheet)** | **~6.5 days** |

Slightly larger than the Prepositions module (which was ~4 days) — the bigger curation surface and the new 4-input table runner are the two extra costs.
