# Sentence · Fachgebiet (Domain) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the Sentence quiz target a subject-matter field — .NET, SQL Server, Docker — so generated cards are written *about* that field and drill its vocabulary.

**Architecture:** A new curated bank `src/data/domains.ts` holds each [Domain](../../../CONTEXT.md): a label, ~6 English scene lines, a list of bare German nouns and a list of German infinitives. Both word lists are **references**, never definitions — nouns resolve against the seeded Dexie noun store, verbs against `verbs.ts` — so plural write-back, word hints, weak points, levels and Rektion all keep working unchanged. Selecting Domains makes each card pick exactly one of them at spec-build time (all randomness up front, as the module already does), which replaces the noun pool for that card, prefers that Domain's verbs, and swaps the generic scene-setting angles for the Domain's own scene.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, Dexie 4, Vitest 4, vue-tsc.

## Global Constraints

- Read `CONTEXT.md` → **Domain**, **Packed card**, **Sentence quiz**, **Assigned theme noun** and `docs/adr/0018-domain-replaces-nouns-prefers-verbs.md` before starting. They are the spec; this plan implements them.
- Nouns are **replaced** by a Domain; verbs are only **preferred**. Under a Domain the verb pool is the **entire** 607-verb pool — no Niveau/Typ/Rektion filtering — and the Niveau chips stay live but set only the passage's Target CEFR. Do not "harmonise" these two rules.
- Domain word lists must resolve: every noun exists in `nouns.seed.json`, every verb exists in `verbs.ts`. A typo fails CI, never shrinks a Domain at runtime.
- UI copy is German (`Fachgebiet`, never `Thema`/`Themen` — those belong to the noun groups). Glossary terms in code comments use the CONTEXT.md spelling.
- Register: real dev German. Anglicisms where practitioners use them (*der Container*, *das Repository*, *der Commit*), German where they use German (*die Bereitstellung*, *die Abfrage*, *der Primärschlüssel*).
- Default state is **no Domain selected**, and that path must behave exactly as today — byte-for-byte the same pools and prompt.
- Verification commands: `npm test` (vitest), `npm run typecheck` (vue-tsc — plain `tsc` produces ~212 bogus `.vue` module errors and means nothing).
- Never run `git` from a subagent; the controller commits.

---

### Task 1: Seed the 29 missing Domain nouns

The three Domains reference 29 German nouns that are not yet in `nouns.seed.json`. Seed entries reach an existing install only through a Dexie version bump, so this task ships the data *and* the migration.

**Files:**
- Modify: `src/data/nouns.seed.json` (insert 29 entries in alphabetical position)
- Modify: `src/db/index.ts` (add `this.version(12)` after the existing `version(11)` block, around line 148)
- Test: `tests/data/nounsSeed.domains.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: 29 seed entries keyed by `german`, all with `"group": "Programming"`. Task 2's Domain lists reference them by exactly these strings.

- [ ] **Step 1: Write the failing test**

Create `tests/data/nounsSeed.domains.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import seed from '../../src/data/nouns.seed.json'

interface SeedNoun { german: string; gender: string; english: string; group: string }
const NOUNS = seed as SeedNoun[]

// The 29 words the .NET / SQL Server / Docker Domains needed that the seed
// did not already carry (ADR-0018 — Domain word lists are references into the
// store, so the store has to have them).
const DOMAIN_ADDITIONS: Record<string, string> = {
  Abbild: 'das', Orchestrierung: 'die', Virtualisierung: 'die', Mikrodienst: 'der',
  Neustart: 'der', Ausfall: 'der', Überwachung: 'die', Instanz: 'die',
  Speicher: 'der', Zugriff: 'der', Registrierung: 'die', Ressource: 'die',
  Auslastung: 'die', Sicht: 'die', Verbund: 'der', Auswertung: 'die',
  Sperre: 'die', Migration: 'die', Wiederherstellung: 'die', Speicherung: 'die',
  Verbindung: 'die', Filter: 'der', Sortierung: 'die', Ausführungsplan: 'der',
  Kennzahl: 'die', Eigenschaft: 'die', Dienst: 'der', Umsetzung: 'die',
  Wartung: 'die'
}

describe('nouns.seed.json — Domain additions', () => {
  test('every Domain addition is seeded with the right gender and group', () => {
    const byGerman = new Map(NOUNS.map(n => [n.german, n]))
    for (const [german, gender] of Object.entries(DOMAIN_ADDITIONS)) {
      const row = byGerman.get(german)
      expect(row, `${german} missing from nouns.seed.json`).toBeDefined()
      expect(row!.gender, german).toBe(gender)
      expect(row!.group, german).toBe('Programming')
      expect(row!.english.trim().length, german).toBeGreaterThan(0)
    }
  })
  test('the seed has no duplicate german keys', () => {
    const germans = NOUNS.map(n => n.german)
    expect(new Set(germans).size).toBe(germans.length)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/data/nounsSeed.domains.test.ts`
Expected: FAIL — `Abbild missing from nouns.seed.json`.

- [ ] **Step 3: Insert the 29 entries**

Run this script from the repo root (it inserts each entry at its alphabetical position and leaves every existing entry where it is, so the diff is exactly 29 additions):

```bash
node -e "
const fs=require('fs');
const p='src/data/nouns.seed.json';
const arr=JSON.parse(fs.readFileSync(p,'utf8'));
const add=[
 ['Abbild','das','image (container / disk image)'],
 ['Orchestrierung','die','orchestration'],
 ['Virtualisierung','die','virtualization'],
 ['Mikrodienst','der','microservice'],
 ['Neustart','der','restart / reboot'],
 ['Ausfall','der','outage / failure'],
 ['Überwachung','die','monitoring'],
 ['Instanz','die','instance'],
 ['Speicher','der','memory / storage'],
 ['Zugriff','der','access'],
 ['Registrierung','die','registry / registration'],
 ['Ressource','die','resource'],
 ['Auslastung','die','load / utilization'],
 ['Sicht','die','view (database) / perspective'],
 ['Verbund','der','join / composite'],
 ['Auswertung','die','evaluation / analysis'],
 ['Sperre','die','lock / block'],
 ['Migration','die','migration'],
 ['Wiederherstellung','die','restore / recovery'],
 ['Speicherung','die','storage (act of storing)'],
 ['Verbindung','die','connection'],
 ['Filter','der','filter'],
 ['Sortierung','die','sorting / sort order'],
 ['Ausführungsplan','der','execution plan'],
 ['Kennzahl','die','metric / key figure'],
 ['Eigenschaft','die','property / characteristic'],
 ['Dienst','der','service'],
 ['Umsetzung','die','implementation'],
 ['Wartung','die','maintenance']
];
const has=new Set(arr.map(n=>n.german));
const cmp=new Intl.Collator('de').compare;
for(const [german,gender,english] of add){
  if(has.has(german)){ console.log('skip (exists):',german); continue; }
  const row={german,gender,english,group:'Programming'};
  let i=arr.findIndex(n=>cmp(n.german,german)>0);
  if(i<0) i=arr.length;
  arr.splice(i,0,row);
}
fs.writeFileSync(p,JSON.stringify(arr,null,2)+'\n','utf8');
console.log('total',arr.length);
"
```

- [ ] **Step 4: Add the Dexie top-up migration**

In `src/db/index.ts`, immediately after the closing `})` of the `this.version(11).stores({...})` block and before the constructor's closing brace, add:

```ts
    this.version(12).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt',
      simulatorSessions: '&id, status, startedAt',
      sprechenDiscussions: '&id, status, startedAt',
      sprechenCorrections: '&id, kind, createdAt, topicTitle',
      sprechenCorrectionEvents: '&id, correctionId, at',
      sprechenArgumentBanks: 'topicId',
      sprechenVortraege: '&id, status, startedAt'
    }).upgrade(async tx => {
      // Top up the nouns the Sentence module's Fachgebiete reference
      // (ADR-0018 — a Domain's noun list is a reference into this store, so a
      // missing word would silently shrink the Domain). Same top-up as
      // version(8): add missing germans, re-group where the seed changed it,
      // leave user-added nouns untouched.
      await topUpNounsFromSeed(tx)
    })
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/data/nounsSeed.domains.test.ts tests/db`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

---

### Task 2: The Domain bank

**Files:**
- Create: `src/data/domains.ts`
- Test: `tests/data/domains.test.ts`

**Interfaces:**
- Consumes: the seeded nouns from Task 1; `verbs.ts` (unchanged).
- Produces:
  - `interface Domain { id: string; label: string; scenes: string[]; nouns: string[]; verbs: string[] }`
  - `const DOMAINS: Domain[]`
  - `function domainById(id: string): Domain | undefined`
  - `function domainsByIds(ids: readonly string[]): Domain[]` — preserves `DOMAINS` order, drops unknown ids.

- [ ] **Step 1: Write the failing test**

Create `tests/data/domains.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { DOMAINS, domainById, domainsByIds } from '../../src/data/domains'
import seed from '../../src/data/nouns.seed.json'
import { VERBS } from '../../src/data/verbs'

const SEEDED = new Set((seed as Array<{ german: string }>).map(n => n.german))
const VERB_INFINITIVES = new Set(VERBS.map(v => v.german))

describe('Domain bank', () => {
  test('ids and labels are unique and non-empty', () => {
    const ids = DOMAINS.map(d => d.id)
    const labels = DOMAINS.map(d => d.label)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(labels).size).toBe(labels.length)
    for (const d of DOMAINS) {
      expect(d.id).toMatch(/^[a-z0-9-]+$/)
      expect(d.label.trim().length).toBeGreaterThan(0)
    }
  })
  test('the three shipped Domains are present', () => {
    expect(DOMAINS.map(d => d.id).sort()).toEqual(['docker', 'dotnet', 'sql-server'])
  })
  test('every Domain noun resolves against the seeded store', () => {
    for (const d of DOMAINS) {
      for (const n of d.nouns) {
        expect(SEEDED.has(n), `${d.id}: "${n}" is not in nouns.seed.json`).toBe(true)
      }
    }
  })
  test('every Domain verb exists in verbs.ts', () => {
    for (const d of DOMAINS) {
      for (const v of d.verbs) {
        expect(VERB_INFINITIVES.has(v), `${d.id}: "${v}" is not in verbs.ts`).toBe(true)
      }
    }
  })
  test('word lists are deduplicated and big enough to carry a run', () => {
    for (const d of DOMAINS) {
      expect(new Set(d.nouns).size, d.id).toBe(d.nouns.length)
      expect(new Set(d.verbs).size, d.id).toBe(d.verbs.length)
      // PACKED_MAX.noun is 3 per card; a Domain needs a real bag behind it.
      expect(d.nouns.length, d.id).toBeGreaterThanOrEqual(25)
      expect(d.verbs.length, d.id).toBeGreaterThanOrEqual(10)
    }
  })
  test('every Domain has at least six distinct scenes', () => {
    for (const d of DOMAINS) {
      expect(d.scenes.length, d.id).toBeGreaterThanOrEqual(6)
      expect(new Set(d.scenes).size, d.id).toBe(d.scenes.length)
      for (const s of d.scenes) expect(s.trim().length).toBeGreaterThan(0)
    }
  })
  test('lookup helpers', () => {
    expect(domainById('docker')?.label).toBe('Docker')
    expect(domainById('nope')).toBeUndefined()
    expect(domainsByIds(['sql-server', 'nope', 'dotnet']).map(d => d.id)).toEqual(['dotnet', 'sql-server'])
    expect(domainsByIds([])).toEqual([])
  })
})
```

(`VERBS` is exported from `src/data/verbs.ts:139` as `readonly Verb[]`.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/data/domains.test.ts`
Expected: FAIL — cannot resolve `../../src/data/domains`.

- [ ] **Step 3: Write the Domain bank**

Create `src/data/domains.ts`:

```ts
// src/data/domains.ts
//
// Curated Domain (de "Fachgebiet") bank for the Sentence quiz
// (CONTEXT.md → "Domain", ADR-0018). A Domain is a subject-matter field a
// [Packed card] can be written in.
//
// Its word lists are REFERENCES, never definitions:
//   - `nouns` are bare German words resolved against the seeded noun store, so
//     plural write-back, word hints and weak points keep working unchanged.
//   - `verbs` are infinitives resolved against verbs.ts, so level, Typ and
//     Rektion are never invented per Domain.
// tests/data/domains.test.ts asserts every listed word resolves — a typo fails
// CI instead of silently shrinking a Domain at runtime.
//
// Register (ADR-0018): the field's real German. Anglicisms where practitioners
// use them (der Container, das Repository, der Commit), German where they use
// German (die Bereitstellung, die Abfrage, der Primärschlüssel).

export interface Domain {
  /** kebab id — persisted in setup settings and in run meta as packedDomains */
  id: string
  /** chip and card-badge label */
  label: string
  /** English scene lines; one is drawn per card and replaces the generic
   *  scene-setters in PACKED_SCENE_ANGLES. */
  scenes: string[]
  /** bare German nouns, no article — must exist in nouns.seed.json */
  nouns: string[]
  /** German infinitives — must exist in verbs.ts */
  verbs: string[]
}

export const DOMAINS: Domain[] = [
  {
    id: 'dotnet',
    label: '.NET',
    scenes: [
      'set it in a code review of a new service class',
      'set it while refactoring a class that has grown too large',
      'set it during a sprint planning about a new feature',
      'set it while a unit test suite keeps failing',
      'set it while onboarding a new colleague to the codebase',
      'set it while upgrading a package that broke the build'
    ],
    nouns: [
      'Klasse', 'Eigenschaft', 'Methode', 'Objekt', 'Schnittstellentyp', 'Vererbung',
      'Namensraum', 'Konstruktor', 'Ausnahme', 'Abhängigkeit', 'Paket', 'Modul',
      'Anwendung', 'Dienst', 'Konfiguration', 'Ereignis', 'Rückgabewert', 'Parameter',
      'Argument', 'Aufzählung', 'Generikum', 'Schleife', 'Bedingung', 'Variable',
      'Konstante', 'Zeichenkette', 'Testfall', 'Einheitstest', 'Quellcode', 'Sammlung',
      'Bibliothek', 'Zuweisung', 'Umsetzung', 'Wartung'
    ],
    verbs: [
      'erstellen', 'testen', 'prüfen', 'ändern', 'anpassen', 'ersetzen', 'verwenden',
      'benutzen', 'beheben', 'erkennen', 'entfernen', 'schreiben', 'lesen',
      'beschreiben', 'planen', 'vergleichen'
    ]
  },
  {
    id: 'sql-server',
    label: 'SQL Server',
    scenes: [
      'set it while a query in production has become slow',
      'set it during a database migration on a Friday evening',
      'set it while restoring a backup after a failure',
      'set it while designing a table for a new report',
      'set it while a transaction is blocking other users',
      'set it while going through an execution plan with a colleague'
    ],
    nouns: [
      'Abfrage', 'Spalte', 'Zeile', 'Datensatz', 'Primärschlüssel', 'Fremdschlüssel',
      'Transaktion', 'Index', 'Tabelle', 'Datenbank', 'Sicherung', 'Sicht', 'Verbund',
      'Auswertung', 'Bericht', 'Zugriff', 'Sperre', 'Migration', 'Wiederherstellung',
      'Latenz', 'Cache', 'Zwischenspeicher', 'Bedingung', 'Anweisung', 'Datentyp',
      'Speicherung', 'Verbindung', 'Filter', 'Sortierung', 'Ausführungsplan', 'Kennzahl'
    ],
    verbs: [
      'speichern', 'laden', 'suchen', 'finden', 'übertragen', 'sichern', 'vergleichen',
      'berechnen', 'erhöhen', 'senken', 'beschleunigen', 'prüfen', 'verbinden',
      'ändern', 'entfernen', 'ausführen'
    ]
  },
  {
    id: 'docker',
    label: 'Docker',
    scenes: [
      'set it during a deployment that failed late at night',
      'set it while a container keeps restarting',
      'set it while writing a configuration file for a new environment',
      'set it during a rollout to the production cluster',
      'set it while the monitoring dashboard shows an outage',
      'set it while a colleague cannot reach the service endpoint'
    ],
    nouns: [
      'Container', 'Abbild', 'Bereitstellung', 'Umgebung', 'Laufzeitumgebung',
      'Konfigurationsdatei', 'Netzwerk', 'Server', 'Pipeline', 'Build', 'Skript',
      'Protokollierung', 'Fehlermeldung', 'Version', 'Verzeichnis', 'Dateipfad',
      'Prozess', 'Schnittstelle', 'Endpunkt', 'Anfrage', 'Antwort', 'Orchestrierung',
      'Virtualisierung', 'Mikrodienst', 'Neustart', 'Ausfall', 'Überwachung',
      'Instanz', 'Speicher', 'Zugriff', 'Registrierung', 'Ressource', 'Auslastung'
    ],
    verbs: [
      'bereitstellen', 'ausführen', 'starten', 'installieren', 'einrichten', 'verbinden',
      'überwachen', 'verwalten', 'laden', 'löschen', 'bauen', 'melden', 'scheitern',
      'auftreten', 'reagieren', 'warten'
    ]
  }
]

export function domainById(id: string): Domain | undefined {
  return DOMAINS.find(d => d.id === id)
}

/** Resolve ids to Domains in DOMAINS order, dropping anything unknown — a
 *  persisted setting must never resurrect a Domain that has been removed. */
export function domainsByIds(ids: readonly string[]): Domain[] {
  const wanted = new Set(ids)
  return DOMAINS.filter(d => wanted.has(d.id))
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/data/domains.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

---

### Task 3: `useNouns.byGermanList`

The setup screen needs to turn a Domain's bare German words into real store rows (with gender and any learned plural).

**Files:**
- Modify: `src/composables/useNouns.ts`
- Test: `tests/composables/useNouns.test.ts` (exists — add a describe block; if it does not exist, create it following `tests/composables/useAdjectives.test.ts`)

**Interfaces:**
- Produces: `byGermanList(words: readonly string[]): Promise<Noun[]>` — returns rows for the words present in the store, order unspecified, `[]` for an empty input.

- [ ] **Step 1: Write the failing test**

Append to `tests/composables/useNouns.test.ts` inside the existing top-level `describe`, or as a new one:

```ts
describe('byGermanList', () => {
  test('returns only the rows that exist, and [] for an empty list', async () => {
    const { create, byGermanList } = useNouns()
    await create({ german: 'Container', gender: 'der', english: 'container', group: 'Programming' })
    await create({ german: 'Abfrage', gender: 'die', english: 'query', group: 'Programming' })

    const rows = await byGermanList(['Container', 'Abfrage', 'Gibtsnicht'])
    expect(rows.map(r => r.german).sort()).toEqual(['Abfrage', 'Container'])
    expect(await byGermanList([])).toEqual([])
  })
})
```

`tests/composables/useNouns.test.ts` already exists and already sets up `fake-indexeddb` and clears tables between tests — reuse its `beforeEach` and its import of `useNouns` rather than adding new setup.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/composables/useNouns.test.ts`
Expected: FAIL — `byGermanList is not a function`.

- [ ] **Step 3: Implement**

In `src/composables/useNouns.ts`, add after `sampleByGroups` (line 53):

```ts
  /** Store rows for an explicit list of German words — how a Domain's noun
   *  list (bare words, see data/domains.ts) becomes real nouns with gender and
   *  any learned plural. Words the store does not have are simply absent. */
  async function byGermanList(words: readonly string[]): Promise<Noun[]> {
    if (words.length === 0) return []
    return db.nouns.where('german').anyOf([...words]).toArray()
  }
```

Add `byGermanList` to the object the composable returns.

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/composables/useNouns.test.ts`
Expected: PASS.

---

### Task 4: Domain-aware spec building

Each card picks one Domain up front, and that decides its scene, its noun bag, and its first verb.

**Files:**
- Modify: `src/composables/usePackedSentenceQuiz.ts` (types near line 39–55, `makeBag`/`drawUnique` near 57–79, `buildPackedSpecs` near 85–109)
- Test: `tests/composables/usePackedSentenceQuiz.domains.test.ts` (create)

**Interfaces:**
- Consumes: `Domain` from Task 2 (only its shape — this file must NOT import `data/domains.ts`; the setup screen passes resolved pools in).
- Produces:
  - `interface PackedDomainRef { id: string; label: string; scene: string }`
  - `interface PackedDomainPool { id: string; label: string; scenes: readonly string[]; nouns: readonly NounRef[]; verbs: readonly string[] }`
  - `PackedCardSpec` gains `domain?: PackedDomainRef`
  - `PackedPools` gains `domains?: readonly PackedDomainPool[]`
  - `buildPackedSpecs(pools, counts, cards, rng?)` — unchanged signature.

- [ ] **Step 1: Write the failing test**

Create `tests/composables/usePackedSentenceQuiz.domains.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import {
  buildPackedSpecs,
  type PackedPools, type PackedCounts, type PackedDomainPool
} from '../../src/composables/usePackedSentenceQuiz'
import type { NounRef } from '../../src/composables/useSentenceQuiz'

const BASE: PackedPools = {
  verbs: [
    { german: 'bereitstellen', english: 'provide', level: 'B2.1', case: 'accusative' },
    { german: 'tanzen', english: 'dance', level: 'A1', case: 'none' },
    { german: 'kochen', english: 'cook', level: 'A1', case: 'accusative' },
    { german: 'speichern', english: 'save', level: 'B2.1', case: 'accusative' }
  ],
  nouns: [{ german: 'Zwiebel', article: 'die', english: 'onion' }] as NounRef[],
  preps: [],
  collocs: [],
  conns: []
}

const DOCKER: PackedDomainPool = {
  id: 'docker', label: 'Docker',
  scenes: ['set it during a failed deployment', 'set it while a container restarts'],
  nouns: [
    { german: 'Container', article: 'der', english: 'container' },
    { german: 'Bereitstellung', article: 'die', english: 'deployment' },
    { german: 'Abbild', article: 'das', english: 'image' }
  ] as NounRef[],
  verbs: ['bereitstellen']
}
const SQL: PackedDomainPool = {
  id: 'sql-server', label: 'SQL Server',
  scenes: ['set it while a query is slow'],
  nouns: [
    { german: 'Abfrage', article: 'die', english: 'query' },
    { german: 'Spalte', article: 'die', english: 'column' }
  ] as NounRef[],
  verbs: ['speichern']
}

const COUNTS: PackedCounts = { verb: 2, noun: 2, prep: 0, dac: 0, conn: 0 }

describe('buildPackedSpecs — Fachgebiete', () => {
  test('with no domains the specs are unchanged (no domain field)', () => {
    const specs = buildPackedSpecs(BASE, COUNTS, 3)
    for (const s of specs) expect(s.domain).toBeUndefined()
  })

  test('with no domains the nouns come from the generic pool', () => {
    const specs = buildPackedSpecs(BASE, { ...COUNTS, noun: 1 }, 3)
    for (const s of specs) {
      const noun = s.items.find(i => i.cat === 'noun')!.noun!
      expect(noun.german).toBe('Zwiebel')
    }
  })

  test('every card gets exactly one Domain, with one of that Domain\'s scenes', () => {
    const specs = buildPackedSpecs({ ...BASE, domains: [DOCKER, SQL] }, COUNTS, 6)
    for (const s of specs) {
      expect(s.domain).toBeDefined()
      const pool = [DOCKER, SQL].find(d => d.id === s.domain!.id)!
      expect(pool.scenes).toContain(s.domain!.scene)
      expect(s.domain!.label).toBe(pool.label)
    }
  })

  test('a card\'s nouns come only from its own Domain, never the generic pool', () => {
    const specs = buildPackedSpecs({ ...BASE, domains: [DOCKER, SQL] }, COUNTS, 6)
    for (const s of specs) {
      const pool = [DOCKER, SQL].find(d => d.id === s.domain!.id)!
      const allowed = new Set(pool.nouns.map(n => n.german))
      for (const it of s.items.filter(i => i.cat === 'noun')) {
        expect(allowed.has(it.noun!.german), `${s.domain!.id} got ${it.noun!.german}`).toBe(true)
      }
    }
  })

  test('both Domains are used across a run', () => {
    const specs = buildPackedSpecs({ ...BASE, domains: [DOCKER, SQL] }, COUNTS, 8)
    expect(new Set(specs.map(s => s.domain!.id)).size).toBe(2)
  })

  test('the first verb of each card is a Domain verb; the rest are free', () => {
    const specs = buildPackedSpecs({ ...BASE, domains: [DOCKER, SQL] }, COUNTS, 8)
    for (const s of specs) {
      const verbs = s.items.filter(i => i.cat === 'verb').map(i => i.verb!.german)
      expect(verbs).toHaveLength(2)
      const pool = [DOCKER, SQL].find(d => d.id === s.domain!.id)!
      expect(pool.verbs).toContain(verbs[0])
      expect(new Set(verbs).size).toBe(2)
    }
  })

  test('a Domain whose verbs are absent from the verb pool falls back cleanly', () => {
    const orphan: PackedDomainPool = { ...DOCKER, verbs: ['kompilieren'] }
    const specs = buildPackedSpecs({ ...BASE, domains: [orphan] }, COUNTS, 3)
    for (const s of specs) {
      const verbs = s.items.filter(i => i.cat === 'verb')
      expect(verbs).toHaveLength(2)
    }
  })

  test('a Domain with no nouns yields cards with no noun items rather than throwing', () => {
    const empty: PackedDomainPool = { ...DOCKER, nouns: [] }
    const specs = buildPackedSpecs({ ...BASE, domains: [empty] }, COUNTS, 2)
    for (const s of specs) {
      expect(s.items.filter(i => i.cat === 'noun')).toHaveLength(0)
      expect(s.domain!.id).toBe('docker')
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/composables/usePackedSentenceQuiz.domains.test.ts`
Expected: FAIL — `PackedDomainPool` is not exported.

- [ ] **Step 3: Add the types**

In `src/composables/usePackedSentenceQuiz.ts`, after `PackedCollocRef` (line 37) add:

```ts
/** The [Domain] (de "Fachgebiet") one card is written in, resolved at
 *  spec-build time — all randomness up front, as the rest of this file does.
 *  `scene` is the single scene line drawn for this card. */
export interface PackedDomainRef { id: string; label: string; scene: string }

/** One Domain's runtime pools, resolved by the setup screen from
 *  data/domains.ts plus the noun store. This file never imports the bank
 *  itself — it only consumes what it is handed. */
export interface PackedDomainPool {
  id: string
  label: string
  scenes: readonly string[]
  nouns: readonly NounRef[]
  /** German infinitives; matched against `PackedPools.verbs` by `german`. */
  verbs: readonly string[]
}
```

Change `PackedCardSpec` and `PackedPools`:

```ts
export interface PackedCardSpec { index: number; items: PackedItemSpec[]; domain?: PackedDomainRef }
export interface PackedPools {
  verbs: readonly PackedVerbRef[]
  nouns: readonly NounRef[]
  preps: readonly PackedPrepRef[]
  collocs: readonly PackedCollocRef[]
  conns: readonly Connector[]
  /** When non-empty every card is written in exactly one of these, and its
   *  nouns replace `nouns` for that card (ADR-0018). */
  domains?: readonly PackedDomainPool[]
}
```

- [ ] **Step 4: Add the fill-into-existing draw helper**

Replace `drawUnique` (lines 68–79) with:

```ts
/** Fill `out` up to `k` distinct items (by `key`) from a bag, keeping whatever
 *  is already in it — how a card takes its first verb from its Domain and the
 *  rest from the full pool. */
function drawUniqueInto<T>(out: T[], next: () => T | null, k: number, key: (t: T) => string): void {
  let guard = 0
  while (out.length < k && guard < k * 4 + 4) {
    guard++
    const t = next()
    if (t === null) break
    if (!out.some(x => key(x) === key(t))) out.push(t)
  }
}

/** Draw up to `k` distinct items (by `key`) from a bag. */
function drawUnique<T>(next: () => T | null, k: number, key: (t: T) => string): T[] {
  const out: T[] = []
  drawUniqueInto(out, next, k, key)
  return out
}
```

- [ ] **Step 5: Make `buildPackedSpecs` Domain-aware**

Replace the body of `buildPackedSpecs` (lines 85–109) with:

```ts
export function buildPackedSpecs(
  pools: PackedPools, counts: PackedCounts, cards: number, rng: () => number = Math.random
): PackedCardSpec[] {
  const nextVerb = makeBag(pools.verbs, rng)
  const nextNoun = makeBag(pools.nouns, rng)
  const nextPrep = makeBag(pools.preps, rng)
  const nextColloc = makeBag(pools.collocs, rng)
  const nextConn = makeBag(pools.conns, rng)

  // Fachgebiete (ADR-0018): one Domain per card from a rotating bag, and one
  // bag per Domain for its scenes, its nouns, and the verbs it prefers — so a
  // run spreads each Domain's vocabulary before repeating any of it.
  const domainPools = pools.domains ?? []
  const nextDomain = makeBag(domainPools, rng)
  const sceneBags = new Map(domainPools.map(d => [d.id, makeBag(d.scenes, rng)]))
  const nounBags = new Map(domainPools.map(d => [d.id, makeBag(d.nouns, rng)]))
  // A Domain's verbs are only PREFERRED: matched against the real verb pool so
  // level/Typ/Rektion are never invented here, and empty is fine — the card
  // then simply draws every verb from the full pool.
  const preferredBags = new Map(domainPools.map(d => {
    const wanted = new Set(d.verbs)
    return [d.id, makeBag(pools.verbs.filter(v => wanted.has(v.german)), rng)]
  }))

  const specs: PackedCardSpec[] = []
  for (let index = 0; index < cards; index++) {
    const items: PackedItemSpec[] = []
    const dom = nextDomain()

    const verbs: PackedVerbRef[] = []
    if (dom && counts.verb > 0) {
      // The first verb slot is on-theme; the rest are free (ADR-0018).
      drawUniqueInto(verbs, preferredBags.get(dom.id) ?? (() => null), 1, v => v.german)
    }
    drawUniqueInto(verbs, nextVerb, counts.verb, v => v.german)
    verbs.forEach((verb, i) => items.push({ key: `v${i + 1}`, cat: 'verb', verb }))

    const nounSource = dom ? (nounBags.get(dom.id) ?? (() => null)) : nextNoun
    drawUnique(nounSource, counts.noun, n => n.german)
      .forEach((noun, i) => items.push({ key: `n${i + 1}`, cat: 'noun', noun }))

    drawUnique(nextPrep, counts.prep, p => p.id)
      .forEach((prep, i) => items.push({ key: `p${i + 1}`, cat: 'prep', prep }))
    drawUnique(nextColloc, counts.dac, c => c.id)
      .forEach((colloc, i) => items.push({ key: `d${i + 1}`, cat: 'dac', colloc }))
    drawUnique(nextConn, counts.conn, c => c.id)
      .forEach((conn, i) => items.push({ key: `k${i + 1}`, cat: 'conn', conn }))

    const spec: PackedCardSpec = { index, items }
    if (dom) {
      const scene = (sceneBags.get(dom.id) ?? (() => null))() ?? dom.scenes[0] ?? ''
      spec.domain = { id: dom.id, label: dom.label, scene }
    }
    specs.push(spec)
  }
  return specs
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run tests/composables/usePackedSentenceQuiz.domains.test.ts tests/composables/usePackedSentenceQuiz.test.ts`
Expected: PASS — including every pre-existing packed test, unchanged.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

---

### Task 5: Domain in the generation prompt

**Files:**
- Modify: `src/composables/usePackedSentenceQuiz.ts` (`PACKED_ANGLE_POOL` near line 163, `buildPackedGeneratePrompt` near 277, `generatePackedBatch` near 386)
- Test: `tests/composables/usePackedSentenceQuiz.domains.test.ts` (append a describe block)

**Interfaces:**
- Consumes: `PackedCardSpec.domain` from Task 4.
- Produces: `PACKED_SCENE_ANGLES`, `PACKED_STRUCTURAL_ANGLES` (both `readonly string[]`); `PACKED_ANGLE_POOL` stays exported and is their concatenation.

- [ ] **Step 1: Write the failing test**

Append to `tests/composables/usePackedSentenceQuiz.domains.test.ts`:

```ts
import {
  buildPackedGeneratePrompt, PACKED_ANGLE_POOL, PACKED_SCENE_ANGLES, PACKED_STRUCTURAL_ANGLES,
  type PackedCardSpec
} from '../../src/composables/usePackedSentenceQuiz'

describe('buildPackedGeneratePrompt — Fachgebiete', () => {
  const plain: PackedCardSpec = {
    index: 0,
    items: [{ key: 'v1', cat: 'verb', verb: { german: 'tanzen', english: 'dance', level: 'A1', case: 'none' } }]
  }
  const themed: PackedCardSpec = {
    index: 1,
    items: [{ key: 'v1', cat: 'verb', verb: { german: 'bereitstellen', english: 'provide', level: 'B2.1', case: 'accusative' } }],
    domain: { id: 'docker', label: 'Docker', scene: 'set it during a failed deployment' }
  }
  const variation = { angles: ['use wir'], seed: 'abc' }

  test('the angle pool splits into scenes and structure without losing anything', () => {
    expect(PACKED_ANGLE_POOL).toEqual([...PACKED_SCENE_ANGLES, ...PACKED_STRUCTURAL_ANGLES])
    expect(PACKED_SCENE_ANGLES.length).toBeGreaterThanOrEqual(6)
    expect(PACKED_STRUCTURAL_ANGLES.length).toBeGreaterThanOrEqual(6)
  })

  test('a themed card names its Fachgebiet and its scene in its own block', () => {
    const p = buildPackedGeneratePrompt([themed], 'B1', variation)
    expect(p).toContain('#1 — Fachgebiet: Docker')
    expect(p).toContain('set it during a failed deployment')
  })

  test('a themed batch carries the register instruction exactly once', () => {
    const p = buildPackedGeneratePrompt([themed, { ...themed, index: 2 }], 'B1', variation)
    expect(p.split('der Container').length - 1).toBe(1)
  })

  test('a plain card is untouched and carries no Fachgebiet wording', () => {
    const p = buildPackedGeneratePrompt([plain], 'B1', variation)
    expect(p).toContain('#0 — required ingredients:')
    expect(p).not.toContain('Fachgebiet')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/composables/usePackedSentenceQuiz.domains.test.ts`
Expected: FAIL — `PACKED_SCENE_ANGLES` is not exported.

- [ ] **Step 3: Split the angle pool**

Replace `PACKED_ANGLE_POOL` (lines 163–169) with:

```ts
/** Scene-setters — WHERE the passage happens. A Domain replaces these with its
 *  own scenes (ADR-0018); they are never mixed. */
export const PACKED_SCENE_ANGLES = [
  'set the scene at the office', 'set it during a move to a new apartment',
  'set it on a weekend trip', 'set it in a kitchen',
  'set it at a train station', 'set it during bad weather'
] as const

/** Structural angles — HOW the passage is put together. Domain-neutral, so a
 *  themed batch keeps varying its person, mood and tense exactly as an
 *  untargeted one does. */
export const PACKED_STRUCTURAL_ANGLES = [
  'use a first-person plural subject (wir)', 'frame part of it as a question',
  'put one clause in the Perfekt (past)', 'use a polite request (Sie)',
  'open with an adverb of time', 'frame it as something overheard'
] as const

export const PACKED_ANGLE_POOL = [...PACKED_SCENE_ANGLES, ...PACKED_STRUCTURAL_ANGLES] as const
```

- [ ] **Step 4: Teach the prompt about Fachgebiete**

Replace `buildPackedGeneratePrompt` (lines 277–289) with:

```ts
const PACKED_DOMAIN_NOTE =
  '\nWhere a card names a Fachgebiet, write that card entirely inside that field: every sentence ' +
  'is about that work, and the vocabulary is the German practitioners in that field actually use — ' +
  'established anglicisms where those are the normal words (der Container, das Repository, der ' +
  'Commit) and the German term where that is (die Bereitstellung, die Abfrage, der Primärschlüssel). ' +
  'A card without a Fachgebiet is an everyday scene as usual.'

export function buildPackedGeneratePrompt(
  specs: readonly PackedCardSpec[], level: string, variation: { angles: string[]; seed: string }
): string {
  const blocks = specs.map(s => {
    const head = s.domain
      ? `#${s.index} — Fachgebiet: ${s.domain.label} · ${s.domain.scene} — required ingredients:`
      : `#${s.index} — required ingredients:`
    return `${head}\n${s.items.map(itemLine).join('\n')}`
  })
  const domainNote = specs.some(s => s.domain) ? PACKED_DOMAIN_NOTE : ''
  return (
    `Target CEFR level: ${level}.\n` +
    `Write one packed German passage (1–2 sentences, 3–4 only if unavoidable) and its English translation for each of the following ${specs.length} item(s):\n` +
    blocks.join('\n') +
    domainNote +
    `\nVary the framing across the batch — draw inspiration from these angles (do not echo them as text): ${variation.angles.join(' · ')}.` +
    `\nBatch variation seed: ${variation.seed}.` +
    `\nAlso return sentenceCount, spans (one per ingredient key, plus "pl" — bare plural, "" if none — for noun keys; two-part connectors get two entries with the same key) and extras (every other noun and finite verb in the English, with "en"/"de"/"kind", nouns also carrying "pl"), each "en" an exact substring of your English translation.`
  )
}
```

- [ ] **Step 5: Keep generic scenes out of a fully themed batch**

In `generatePackedBatch`, replace the `angles` line (line 386):

```ts
      const anglePool = remaining.some(s => !s.domain)
        ? [...PACKED_ANGLE_POOL]
        : [...PACKED_STRUCTURAL_ANGLES]
      const angles = shuffle(anglePool, Math.max(3, Math.min(6, remaining.length)), rng)
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run tests/composables`
Expected: PASS.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

---

### Task 6: Setup screen — the Fachgebiet block

**Files:**
- Modify: `src/modules/sentence/SentenceSetup.vue`
- Test: `tests/modules/sentence/SentenceSetup.test.ts`

**Interfaces:**
- Consumes: `DOMAINS`, `domainsByIds` (Task 2), `byGermanList` (Task 3), `PackedDomainPool` (Task 4).
- Produces: the stash written to `sessionStorage['gt:lastPackedSentenceQuiz']` gains `meta.domains: string[]`; `localStorage['sentenceSetup']` gains `domains?: string[]`.

- [ ] **Step 1: Extend the `useNouns` mock in the existing test file**

`tests/modules/sentence/SentenceSetup.test.ts:8` mocks `useNouns` with only `countsByGroup` and `sampleByGroups`. The component is about to destructure `byGermanList` from it, so the mock must grow first or every test in the file throws. Add the third method to the existing `vi.mock` factory:

```ts
vi.mock('../../../src/composables/useNouns', () => ({
  useNouns: () => ({
    countsByGroup: async () => ({
      Office: 4, Work: 0, Furniture: 3, House: 5, Rooms: 0,
      Family: 0, School: 0, 'Bank & Money': 0, Food: 0, Other: 0
    }),
    sampleByGroups: async () => [
      { id: 1, german: 'Küche', gender: 'die', english: 'kitchen', group: 'House', createdAt: 0 },
      { id: 2, german: 'Bericht', gender: 'der', english: 'report', group: 'Office', createdAt: 0 }
    ],
    // Resolves every requested word, so a Domain always has enough nouns to
    // clear the per-card empty-pool guard.
    byGermanList: async (words: readonly string[]) => words.map((german, i) => ({
      id: 100 + i, german, gender: 'der', english: german.toLowerCase(),
      group: 'Programming', createdAt: 0
    }))
  })
}))
```

- [ ] **Step 2: Write the failing tests**

Append to the same file. It uses `describe`/`it` (not `test`), and `mountSetup()` returns `{ wrapper, router }` — destructure it:

```ts
describe('Fachgebiet', () => {
  it('shows the block, and with no Domain the Themen chips stay live', async () => {
    const { wrapper } = await mountSetup()
    expect(wrapper.text()).toContain('Fachgebiet')
    const office = wrapper.findAll('button.chip').find(b => b.text().startsWith('Office'))!
    expect(office.attributes('disabled')).toBeUndefined()
  })

  it('selecting a Domain disables the Themen chips and explains the verb pool', async () => {
    const { wrapper } = await mountSetup()
    await wrapper.findAll('button.chip').find(b => b.text() === 'Docker')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Fachgebiet aktiv')
    const office = wrapper.findAll('button.chip').find(b => b.text().startsWith('Office'))!
    expect(office.attributes('disabled')).toBeDefined()
  })

  it('stashes the selected Domains and stamps every card with one', async () => {
    const { wrapper } = await mountSetup()
    await wrapper.findAll('button.chip').find(b => b.text() === 'Docker')!.trigger('click')
    await flushPromises()
    await wrapper.find('button.btn-accent').trigger('click')
    await flushPromises()
    const stash = JSON.parse(sessionStorage.getItem('gt:lastPackedSentenceQuiz')!)
    expect(stash.meta.domains).toEqual(['docker'])
    for (const spec of stash.specs) expect(spec.domain.id).toBe('docker')
  })
})
```

> `Office` is the probe for a live noun chip because the mock gives it a count of 4; `Programming` is absent from the mock's `countsByGroup`, so its chip is disabled for an unrelated reason and would prove nothing.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/modules/sentence/SentenceSetup.test.ts`
Expected: FAIL — no `Fachgebiet` text.

- [ ] **Step 4: Wire the script block**

In `src/modules/sentence/SentenceSetup.vue`:

Add imports:

```ts
import { DOMAINS, domainsByIds } from '../../data/domains'
import type { PackedDomainPool } from '../../composables/usePackedSentenceQuiz'
```

Destructure `byGermanList` from `useNouns()`:

```ts
const { sampleByGroups, countsByGroup, byGermanList } = useNouns()
```

Add state next to `nGroups` (line 63):

```ts
const domains = ref<string[]>([])
/** Resolved store rows per Domain — kept live so the summary and the empty-pool
 *  guard can speak before Start is pressed. */
const domainNouns = ref<Record<string, NounRef[]>>({})
```

Add `NounRef` to the existing `useSentenceQuiz` import:

```ts
import { nounToRef, type Direction, type NounRef } from '../../composables/useSentenceQuiz'
```

(`NounRef` is exported from `src/composables/useSentenceQuiz.ts:21`.)

Add the computed block after the noun-pool block (line 181):

```ts
// ── Fachgebiet (Domain, ADR-0018) ──
const activeDomains = computed(() => domainsByIds(domains.value))
const domainActive = computed(() => activeDomains.value.length > 0)
const domainSummary = computed(() => {
  if (!domainActive.value) return 'Kein Fachgebiet — Sätze wie bisher aus den Themengruppen'
  const n = activeDomains.value.reduce((s, d) => s + (domainNouns.value[d.id]?.length ?? 0), 0)
  return `${activeDomains.value.length} ${activeDomains.value.length === 1 ? 'Fachgebiet' : 'Fachgebiete'} · ${n} Nomen im Pool`
})

async function resolveDomainNouns(): Promise<void> {
  const out: Record<string, NounRef[]> = {}
  for (const d of activeDomains.value) {
    out[d.id] = (await byGermanList(d.nouns)).map(nounToRef)
  }
  domainNouns.value = out
}
watch(domains, resolveDomainNouns, { deep: true })
```

Call `await resolveDomainNouns()` at the end of the `onMounted` handler (after the stored settings are applied).

Extend persistence — in `interface Stored` add `domains?: string[]`; in `saveStored()` add `domains: [...domains.value]`; in `onMounted` add:

```ts
    if (Array.isArray(s.domains)) domains.value = s.domains.filter(id => DOMAINS.some(d => d.id === id))
```

Add `domains` to the `watch([...])` array on line 136.

Replace the noun empty-pool line (line 220) so it understands a Domain:

```ts
  noun: counts.value.noun > 0 && (domainActive.value
    ? activeDomains.value.some(d => (domainNouns.value[d.id]?.length ?? 0) < counts.value.noun)
    : nGroups.value.length === 0),
```

In `start()`, replace the `pools` construction and add the Domain pools:

```ts
  const domainPools: PackedDomainPool[] = activeDomains.value.map(d => ({
    id: d.id, label: d.label, scenes: d.scenes,
    nouns: domainNouns.value[d.id] ?? [],
    verbs: d.verbs
  }))

  const pools: PackedPools = {
    // A Fachgebiet unrestricts the verb pool entirely (ADR-0018): Niveau, Typ
    // and Rektion stop selecting verbs, and Niveau keeps only its second job —
    // the Target CEFR handed to the generator below.
    verbs: (domainActive.value
      ? filter({ levels: [...VERB_LEVELS], types: [...VERB_TYPES], cases: [...VERB_CASES] })
      : filter({ levels: vLevels.value, types: vTypes.value, cases: vCases.value })
    ).map(packedVerbToRef),
    nouns: domainActive.value ? [] : (await sampleByGroups([...nGroups.value], 100000)).map(nounToRef),
    preps: prepPool.value.map(p => ({ id: p.id, german: p.german, english: p.english, case: p.case })),
    collocs: COLLOCATIONS.map(c => ({ id: c.id, word: c.word, english: c.english, preposition: c.preposition, case: c.case })),
    conns: connPool.value,
    domains: domainPools
  }
```

Add `domains: [...domains.value]` to the stash's `meta` object.

- [ ] **Step 5: Add the template block**

Insert this immediately after the `v-if="!canUseAi"` alert and **before** the Verb block (line 306) — the control has to be read before the chips it disables:

```html
      <!-- Fachgebiet block (ADR-0018) — sits above the categories it governs -->
      <div class="sna-block">
        <div class="sna-block-h">
          <span :style="{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)', flex: 'none' }"></span>
          <span class="sna-name">Fachgebiet<span class="de">worüber die Karte handelt</span></span>
        </div>
        <div class="sna-sum">
          <span class="sna-sum-t">{{ domainSummary }}</span>
          <button v-if="domainActive" class="sna-flt" type="button" @click="domains = []">Zurücksetzen</button>
        </div>
        <div class="chip-row">
          <button v-for="d in DOMAINS" :key="d.id" class="chip" :class="{ selected: domains.includes(d.id) }"
            type="button" @click="domains = toggle(domains, d.id)">{{ d.label }}</button>
        </div>
        <p class="grading-hint">
          Jede Karte spielt in <em>genau einem</em> gewählten Fachgebiet. Die Nomen kommen dann aus
          dem Fachgebiet statt aus den Themengruppen, und der Verbpool wird nicht mehr gefiltert.
        </p>
      </div>
```

In the **Verb block**, disable Typ and Rektion while a Domain is on and explain Niveau's changed job. Add `:disabled="domainActive"` to both chip loops and to their All/None buttons, then replace the Rektion hint paragraph (line 359) with:

```html
            <p class="grading-hint">{{ domainActive
              ? 'Fachgebiet aktiv — Typ und Rektion filtern nicht mehr; jedes Verb ist möglich, die Fachverben kommen zuerst.'
              : '„Verb + Dativ" gezielt üben: nur Dativ anwählen.' }}</p>
```

Add under the Niveau chip row:

```html
            <p v-if="domainActive" class="grading-hint">
              Fachgebiet aktiv — das Niveau wählt keine Verben mehr aus, es setzt nur noch das Sprachniveau des Textes.
            </p>
```

In the **Noun block**, add `:disabled="domainActive || (nounCounts[g] ?? 0) === 0"` to the Themen chips, disable its All/None buttons with `:disabled="domainActive"`, and add under the chip row:

```html
            <p v-if="domainActive" class="grading-hint">
              Fachgebiet aktiv — die Nomen kommen aus dem Fachgebiet, die Themengruppen pausieren.
            </p>
```

Replace the noun empty-pool alert text so it is true under a Domain:

```html
        <div v-if="emptyPool.noun" class="alert alert-warning"><span class="alert-label">Leerer Pool</span>{{ domainActive
          ? `Nomen stehen auf ${counts.noun}, aber mindestens ein Fachgebiet hat weniger Wörter im Speicher. Seite neu laden — die Wortliste wird beim Start ergänzt.`
          : `Nomen stehen auf ${counts.noun}, aber keine Themengruppe ist gewählt.` }}</div>
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run tests/modules/sentence`
Expected: PASS.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

---

### Task 7: Runner badge and run meta

**Files:**
- Modify: `src/composables/useQuizHistory.ts` (packed meta block, near line 339–345)
- Modify: `src/modules/sentence/SentenceRunner.vue` (`StashMeta` near line 44, recording near line 387, manifest strip in the template)
- Modify: `src/modules/sentence/SentenceResult.vue`
- Test: `tests/modules/sentence/SentenceRunner.test.ts`, `tests/modules/sentence/SentenceResult.test.ts`

**Interfaces:**
- Consumes: `PackedCardSpec.domain` (Task 4), `meta.domains` from the stash (Task 6).
- Produces: `packedDomains?: string[]` on the run meta.

- [ ] **Step 1: Write the failing test**

Append to `tests/modules/sentence/SentenceResult.test.ts`. The file already has an `outcome(verdict)` factory (line 8) and uses `describe`/`it`; add a themed variant beside it rather than a new fixture:

```ts
function themedOutcome(label: string, id: string): CardOutcome {
  const base = outcome('ok')
  return { ...base, card: { ...base.card, domain: { id, label, scene: 'set it during a failed deployment' } } }
}

describe('SentenceResult · Fachgebiet', () => {
  it('names each Fachgebiet the run used, once', () => {
    const wrapper = mount(SentenceResult, {
      props: {
        direction: 'en-de',
        history: [themedOutcome('Docker', 'docker'), themedOutcome('Docker', 'docker'), themedOutcome('.NET', 'dotnet')]
      }
    })
    expect(wrapper.text()).toContain('Fachgebiet: Docker · .NET')
  })

  it('says nothing about Fachgebiete in an untargeted run', () => {
    const wrapper = mount(SentenceResult, {
      props: { direction: 'en-de', history: [outcome('ok'), outcome('no')] }
    })
    expect(wrapper.text()).not.toContain('Fachgebiet')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/modules/sentence/SentenceResult.test.ts`
Expected: FAIL — no Domain text rendered.

- [ ] **Step 3: Record the Domains**

In `src/composables/useQuizHistory.ts`, add below `packedHints` (line 342):

```ts
  /** Fachgebiet ids the run was targeted at (ADR-0018) — descriptive only:
   *  weak points and mastery are keyed by item exactly as in an untargeted run. */
  packedDomains?: string[]
```

In `src/modules/sentence/SentenceRunner.vue`, add `domains: string[]` to `interface StashMeta`, and add to the recorded `meta` object next to `packedHints`:

```ts
      packedDomains: metaInfo.value?.domains,
```

- [ ] **Step 4: Show the Domain on the card and on the result**

In `SentenceRunner.vue`, add near `manifestPartsList`:

```ts
const domainLabel = computed(() => current.value?.domain?.label ?? null)
```

and render it at the start of the manifest strip (find the element bound to `manifestPartsList` in the template and put this immediately before it):

```html
          <span v-if="domainLabel" class="micro-mark">{{ domainLabel }}</span>
```

In `SentenceResult.vue`, add:

```ts
const domainLabels = computed(() =>
  [...new Set(props.history.map(h => h.card.domain?.label).filter((l): l is string => !!l))]
)
```

and render it in the result header block:

```html
      <p v-if="domainLabels.length > 0" class="micro-mark">
        Fachgebiet: {{ domainLabels.join(' · ') }}
      </p>
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/modules/sentence`
Expected: PASS.

- [ ] **Step 6: Full suite + typecheck**

Run: `npm test`
Expected: PASS.
Run: `npm run typecheck`
Expected: no errors.

---

### Task 8: Manual verification in the running app

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server on a pinned port**

Run: `npm run dev -- --port 5199 --strictPort`
Open `http://localhost:5199/` (use `localhost`, not `127.0.0.1`).

- [ ] **Step 2: Verify the untargeted path is unchanged**

Open Kapitel XII · Satz · Einrichtung with no Fachgebiet selected. The Themen, Typ and Rektion chips are live. Start a 3-card run and confirm the cards read exactly as before.

- [ ] **Step 3: Verify a targeted run**

Select **Docker** and **SQL Server**. Confirm: the Themen chips grey out, the verb Typ/Rektion chips grey out, the Niveau chips stay live with the changed note, and the summary shows a noun count. Start a 5-card run.

Confirm on the cards: each card shows one Domain badge, its sentences are about that field, and the drilled nouns belong to that Domain. Confirm across the run that both Domains appear.

- [ ] **Step 4: Verify the record**

Finish the run and check the Result screen names both Fachgebiete, then open History and confirm the run is recorded as *Satz · Gepackt (KI)*.

- [ ] **Step 5: Confirm the Dexie migration on an existing profile**

In DevTools → Application → IndexedDB, confirm `GermanTrainerDb` is at version 12 and that `Abbild`, `Orchestrierung` and `Ausführungsplan` are present in `nouns`.

---

### Task 9: Release

**Files:**
- Modify: `src/data/changelog.ts`
- Modify: `package.json`

- [ ] **Step 1: Prepend the changelog entry**

In `src/data/changelog.ts`, set `APP_VERSION = '1.19.02'` and prepend to `CHANGELOG`:

```ts
  {
    version: '1.19.02', date: '2026-08-11', kind: 'polish',
    title: 'Satz · Fachgebiete',
    notes: [
      '<strong>Sätze über die eigene Arbeit.</strong> Kapitel XII kann jetzt auf ein <em>Fachgebiet</em> gerichtet werden — <em>.NET</em>, <em>SQL Server</em> oder <em>Docker</em>. Die KI schreibt die Karte dann in dieser Welt: ein fehlgeschlagenes Deployment, eine langsame Abfrage, ein Container, der immer wieder neu startet. Mehrere Fachgebiete gleichzeitig sind erlaubt — jede Karte spielt aber in genau einem, damit sie in sich stimmig bleibt.',
      '<strong>Die Nomen kommen aus dem Fachgebiet.</strong> Solange ein Fachgebiet gewählt ist, ersetzt seine Wortliste die Themengruppen: <em>der Container</em>, <em>das Abbild</em>, <em>die Bereitstellung</em>, <em>die Abfrage</em>, <em>der Primärschlüssel</em>, <em>die Vererbung</em>. 29 neue Wörter sind dafür in den Nomen-Speicher gewandert — sie stehen auch allen anderen Übungen zur Verfügung.',
      '<strong>Die Verben werden bevorzugt, nicht beschränkt.</strong> Ein Fachgebiet zieht seine Verben zuerst (<em>bereitstellen, ausführen, speichern, überwachen</em>), aber der Verbpool bleibt vollständig offen — keine Karte scheitert daran, dass ein passendes Verb fehlt. Das Niveau filtert dann keine Verben mehr; es bestimmt nur noch, wie schwer der Text selbst sein soll.',
      '<strong>Die Sprache ist die, die man im Job hört.</strong> Anglizismen, wo sie das normale Wort sind (<em>der Container</em>, <em>das Repository</em>, <em>der Commit</em>), Deutsch, wo Deutsch das normale Wort ist (<em>die Bereitstellung</em>, <em>die Abfrage</em>, <em>der Fremdschlüssel</em>).'
    ]
  },
```

- [ ] **Step 2: Bump `package.json`**

Set `"version": "1.19.02"`.

- [ ] **Step 3: Verify**

Run: `npm test` → PASS. Run: `npm run typecheck` → no errors. Run: `npm run build` → succeeds.

- [ ] **Step 4: Commit, merge, push, deploy**

Controller only (agents never run git), following the repo's release ritual: two commits (feature, then version bump), merge the branch to `main`, push, then `npm run deploy`.
