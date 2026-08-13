# Katalog · Tier 1 Pharma — Release 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Katalog mechanism (grouped Domains for one interview target) with Darstellungsform-aware card generation, plus the interview-critical content: eight pharma Domains, the HR-Runde Domain, and the section-1 extension of the three existing Domains.

**Architecture:** A `Katalog` (src/data/kataloge.ts) references Domain ids grouped in named sections; each `Domain` (src/data/domains.ts) gains a `form: Darstellungsform` that branches the packed-generation prompt (three register notes + three angle pools in usePackedSentenceQuiz.ts). New vocabulary seeds `nouns.seed.json` (new `Pharma` group + additions to `Work`/`Switzerland`/`Programming`) and reaches existing installs through Dexie `version(14)` + `topUpNounsFromSeed`. The Fachgebiet block in SentenceSetup.vue becomes a Katalog accordion.

**Tech Stack:** Vue 3 + TypeScript, Dexie, Vitest. Run tests with `npm run test`, typecheck with `npm run typecheck` (both from repo root; PowerShell).

**Spec:** CONTEXT.md (entries: Domain, Darstellungsform, Katalog), docs/adr/0021-darstellungsform-widens-targeted-cards.md, docs/adr/0022-katalog-references-domains-founding-domains-absorbed.md, docs/tier1-pharma-interview-topics.md (source topic map).

## Global Constraints

- Work on branch `feat/katalog-tier1-pharma` (already created by the orchestrator).
- **Never add a verb to `src/data/verbs.ts`** — verb levels are frequency batches (ADR-0009). Domain verb lists may only name verbs already in `verbs.ts`; before using any verb not in the "proven set" below, verify it: `Select-String -Path src\data\verbs.ts -Pattern 'german: "<verb>"'` — drop it if absent.
- **Proven verb set** (already CI-tested in domains.ts, safe without checking): erstellen, testen, prüfen, ändern, anpassen, ersetzen, verwenden, benutzen, beheben, erkennen, entfernen, schreiben, lesen, beschreiben, planen, vergleichen, speichern, laden, suchen, finden, übertragen, sichern, berechnen, erhöhen, senken, beschleunigen, verbinden, ausführen, bereitstellen, starten, installieren, einrichten, überwachen, verwalten, löschen, bauen, melden, scheitern, auftreten, reagieren, warten. Also grep-verified present: überprüfen, verhandeln, fragen, erklären, anbieten, herstellen, verbessern, erwarten, genehmigen, kontrollieren, liefern. Grep-verified ABSENT (never use): wiederherstellen, kündigen, validieren, dokumentieren.
- **Seed nouns: add-only.** Before adding any entry to `nouns.seed.json`, check `Select-String -Path src\data\nouns.seed.json -Pattern '"german": "<word>"'`. If the word exists, do NOT add it and do NOT change its group — just reference it from Domain lists. (Changing groups silently moves learners' nouns — ADR-0018/0022 accept this only for deliberate re-grouping, which Release 1 does not do.)
- Domain noun lists reference bare German words that must exist in the seed after Task 2 — `tests/data/domains.test.ts` enforces this in CI (≥25 nouns, ≥10 verbs, ≥6 scenes per Domain, all deduplicated).
- Domain ids are permanent shared property (ADR-0022): `dotnet`, `sql-server`, `docker` keep their ids; only labels/content change.
- UI copy is German in the register the app already uses; check rendering at ~390 px wide (phone-first).
- Commit after each task with a conventional message; never `--no-verify`.

---

### Task 1: Darstellungsform — data type and prompt branches

**Files:**
- Modify: `src/data/domains.ts` (interface + the three existing entries)
- Modify: `src/composables/usePackedSentenceQuiz.ts` (PackedDomainRef/Pool, notes, angle pools, prompt head, angle selection)
- Modify: `src/modules/sentence/SentenceSetup.vue:303-306` (pass `form` through to the pool)
- Test: `tests/composables/usePackedSentenceQuiz.domains.test.ts` (extend), `tests/data/domains.test.ts` (extend)

**Interfaces:**
- Consumes: existing `Domain`, `PackedDomainPool`, `PackedDomainRef`, `buildPackedGeneratePrompt`, `generatePackedBatch`.
- Produces: `export type Darstellungsform = 'erklaerend' | 'erzaehlend' | 'persoenlich'` and `Domain.form: Darstellungsform` in `src/data/domains.ts`; `PackedDomainPool.form` and `PackedDomainRef.form` (type `Darstellungsform`, type-only import); `export const PACKED_STORY_ANGLES`, `export const PACKED_PERSONAL_ANGLES` in usePackedSentenceQuiz.ts. Task 3 relies on `form` being required on every Domain; Task 4 relies on nothing new here.

- [ ] **Step 1: Write the failing tests**

Append to `tests/composables/usePackedSentenceQuiz.domains.test.ts` (imports at top of file already include most helpers; add what's missing):

```ts
import { describe, test, expect } from 'vitest'
import {
  buildPackedSpecs, buildPackedGeneratePrompt,
  PACKED_STORY_ANGLES, PACKED_PERSONAL_ANGLES,
  type PackedPools, type PackedCounts
} from '../../src/composables/usePackedSentenceQuiz'

describe('Darstellungsform', () => {
  const verbs = [{ german: 'prüfen', english: 'to check', level: 'B2.1' as const, case: 'accusative' as const }]
  const nounRef = { german: 'Validierung', english: 'validation', article: 'die' as const }
  function poolsWith(form: 'erklaerend' | 'erzaehlend' | 'persoenlich'): PackedPools {
    return {
      verbs, nouns: [], preps: [], collocs: [], conns: [],
      domains: [{ id: 'x', label: 'X', form, scenes: ['state your salary expectation'], nouns: [nounRef], verbs: ['prüfen'] }]
    }
  }
  const counts: PackedCounts = { verb: 1, noun: 1, prep: 0, dac: 0, conn: 0 }

  test('spec.domain carries the form', () => {
    const specs = buildPackedSpecs(poolsWith('persoenlich'), counts, 1, () => 0.5)
    expect(specs[0].domain?.form).toBe('persoenlich')
  })

  test('prompt head marks the form in German and appends only the matching note', () => {
    const specs = buildPackedSpecs(poolsWith('erzaehlend'), counts, 1, () => 0.5)
    const prompt = buildPackedGeneratePrompt(specs, 'B2', { angles: ['a'], seed: 's' })
    expect(prompt).toContain('(erzählend)')
    expect(prompt).toContain('STAR')
    expect(prompt).not.toContain('(persönlich)')
  })

  test('angle pools exist and are distinct', () => {
    expect(PACKED_STORY_ANGLES.length).toBeGreaterThanOrEqual(5)
    expect(PACKED_PERSONAL_ANGLES.length).toBeGreaterThanOrEqual(5)
    expect(new Set([...PACKED_STORY_ANGLES, ...PACKED_PERSONAL_ANGLES]).size)
      .toBe(PACKED_STORY_ANGLES.length + PACKED_PERSONAL_ANGLES.length)
  })
})
```

Append to `tests/data/domains.test.ts`:

```ts
  test('every Domain declares a Darstellungsform', () => {
    for (const d of DOMAINS) {
      expect(['erklaerend', 'erzaehlend', 'persoenlich']).toContain(d.form)
    }
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- usePackedSentenceQuiz.domains domains`
Expected: FAIL — `form` missing on Domain/PackedDomainPool, `PACKED_STORY_ANGLES` not exported.

- [ ] **Step 3: Implement in `src/data/domains.ts`**

Add above the `Domain` interface:

```ts
/** How a Domain's cards speak (CONTEXT.md → "Darstellungsform", ADR-0021):
 *  erklaerend = explain/contrast a concept (present tense, generic subject,
 *  no anecdote — the ADR-0018 register); erzaehlend = a 1–3-sentence STAR
 *  story fragment (first person, past tense); persoenlich = a first-person
 *  present-tense statement of the speaker's own position or circumstances. */
export type Darstellungsform = 'erklaerend' | 'erzaehlend' | 'persoenlich'
```

Add to the `Domain` interface after `label`:

```ts
  /** Declared once per Domain, never per card (ADR-0021). */
  form: Darstellungsform
```

Add `form: 'erklaerend',` to each of the three existing entries (after `label`).

- [ ] **Step 4: Implement in `src/composables/usePackedSentenceQuiz.ts`**

Add a type-only import (the file's "never imports the bank" rule concerns data, not types):

```ts
import type { Darstellungsform } from '../data/domains'
```

Extend both interfaces:

```ts
export interface PackedDomainRef { id: string; label: string; scene: string; form: Darstellungsform }
```

and add `form: Darstellungsform` to `PackedDomainPool` after `label`.

In `buildPackedSpecs`, where `spec.domain` is assigned:

```ts
      spec.domain = { id: dom.id, label: dom.label, scene, form: dom.form }
```

Replace the single `PACKED_DOMAIN_NOTE` with a shared vocabulary note plus one register note per form:

```ts
const PACKED_VOCAB_NOTE =
  ' The vocabulary is the German practitioners in that field actually use — established ' +
  'anglicisms where those are the normal words (der Container, das Repository, der Commit, ' +
  'der Audit-Trail) and the German term where that is (die Bereitstellung, die Abfrage, der ' +
  'Primärschlüssel, die Änderungskontrolle). A card without a Fachgebiet is an everyday scene as usual.'

const PACKED_FORM_NOTES: Record<Darstellungsform, string> = {
  erklaerend:
    '\nA card marked (erklärend) is not a scene from that job — it is the ANSWER to the ' +
    'explanation the card asks for, the way a practitioner would give it in a technical interview: ' +
    'say what the thing is, or how the two named things differ, and add a consequence for practice ' +
    'where one fits. General, definitional statements in the present tense (a generic subject, ' +
    'man, or the passive), no anecdote, no named colleague, no time of day, no story, no ' +
    'first-person account of a single incident.',
  erzaehlend:
    '\nA card marked (erzählend) is a short STAR-story fragment a behavioral interview asks for: ' +
    'first person singular, a past tense (Perfekt or Präteritum), ONE concrete plausible incident ' +
    'from that line of work — the situation, what the speaker did, and the result, in 1–3 ' +
    'sentences. No definitions, no generic subject; the speaker lived it.',
  persoenlich:
    '\nA card marked (persönlich) is a first-person present-tense statement of the speaker\'s own ' +
    'position or circumstances — the sentence a candidate actually says in an HR interview. ' +
    'Concrete invented specifics (a number, a date, a percentage) are welcome. No definitions, ' +
    'no story, no third person.'
}

const FORM_LABEL: Record<Darstellungsform, string> = {
  erklaerend: 'erklärend', erzaehlend: 'erzählend', persoenlich: 'persönlich'
}
```

Add the two new angle pools next to `PACKED_DOMAIN_ANGLES`:

```ts
/** Angles for erzählend cards — vary HOW the story is told. */
export const PACKED_STORY_ANGLES = [
  'tell it as one concrete incident with a result',
  'open with the situation, end with what you learned',
  'use the Perfekt throughout',
  'mention one number or date to ground the story',
  'let the outcome be a partial success with a lesson',
  'frame part of it as what a colleague asked and how you answered'
] as const

/** Angles for persönlich cards — vary HOW the statement is delivered. */
export const PACKED_PERSONAL_ANGLES = [
  'state it plainly, then add one condition or qualification',
  'give a concrete number and leave room to negotiate',
  'frame part of it as a polite question back',
  'add a short reason after the statement',
  'use a hedging adverb (grundsätzlich, voraussichtlich)',
  'mention a concrete date or timeframe'
] as const
```

In `buildPackedGeneratePrompt`, change the head line and the note assembly:

```ts
    const head = s.domain
      ? `#${s.index} — Fachgebiet: ${s.domain.label} (${FORM_LABEL[s.domain.form]}) · ${s.domain.scene} — required ingredients:`
      : `#${s.index} — required ingredients:`
```

```ts
  const formsPresent = [...new Set(specs.filter(s => s.domain).map(s => s.domain!.form))]
  const domainNote = formsPresent.length > 0
    ? formsPresent.map(f => PACKED_FORM_NOTES[f]).join('') + PACKED_VOCAB_NOTE
    : ''
```

In `generatePackedBatch`, replace the two-way angle-pool choice with a union of what the remaining specs need:

```ts
    const forms = new Set(remaining.filter(s => s.domain).map(s => s.domain!.form))
    const anglePool = [
      ...(remaining.some(s => !s.domain) ? PACKED_ANGLE_POOL : []),
      ...(forms.has('erklaerend') ? PACKED_DOMAIN_ANGLES : []),
      ...(forms.has('erzaehlend') ? PACKED_STORY_ANGLES : []),
      ...(forms.has('persoenlich') ? PACKED_PERSONAL_ANGLES : [])
    ]
```

- [ ] **Step 5: Pass `form` through SentenceSetup's pool mapping**

In `src/modules/sentence/SentenceSetup.vue` (~line 303), the `domainPools` mapping gains `form: d.form`:

```ts
  const domainPools: PackedDomainPool[] = activeDomains.value.map(d => ({
    id: d.id,
    label: d.label,
    form: d.form,
    scenes: d.scenes,
    nouns: domainNouns.value[d.id] ?? [],
    verbs: d.verbs
  }))
```

(Match the actual property list in the file — add `form`, change nothing else.)

- [ ] **Step 6: Run tests + typecheck**

Run: `npm run test -- usePackedSentenceQuiz domains` then `npm run typecheck`
Expected: PASS, no type errors. Fix any other call sites typecheck reveals (e.g. test fixtures constructing `PackedDomainPool` without `form` — add `form: 'erklaerend'`).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(sentence): Darstellungsform per Domain with form-branched generation prompt (ADR-0021)"
```

---

### Task 2: Pharma noun group, seed vocabulary, Dexie v14

**Files:**
- Modify: `src/db/types.ts` (NOUN_GROUPS)
- Modify: `src/data/nouns.seed.json` (append entries)
- Modify: `src/db/index.ts` (version 14)
- Test: `tests/data/nouns.seed.test.ts` (should pass as-is), `tests/db/types.test.ts` (update if it enumerates groups)

**Interfaces:**
- Consumes: `NOUN_GROUPS`, `topUpNounsFromSeed(tx)`, seed entry shape `{ german, gender, english, group }`.
- Produces: `'Pharma'` as a valid `NounGroup`; every German word Task 3's Domain lists reference exists in the seed. Task 3 depends on this task being merged first.

- [ ] **Step 1: Write the failing test**

Append to `tests/db/types.test.ts`:

```ts
  test('Pharma group exists and Other stays last', () => {
    expect(NOUN_GROUPS).toContain('Pharma')
    expect(NOUN_GROUPS[NOUN_GROUPS.length - 1]).toBe('Other')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- types`
Expected: FAIL — 'Pharma' not in NOUN_GROUPS.

- [ ] **Step 3: Add the group**

In `src/db/types.ts` insert `'Pharma',` between `'Programming',` and `'Other'`.

- [ ] **Step 4: Append seed entries**

For EVERY word below: first check existence (`Select-String -Path src\data\nouns.seed.json -Pattern '"german": "<word>"'`). Add only the missing ones, as `{ "german": ..., "gender": ..., "english": ..., "group": ... }` appended before the closing `]` of the JSON array. Never modify an existing entry.

Group `Pharma`:

| german | gender | english |
|---|---|---|
| Validierung | die | validation |
| Qualifizierung | die | qualification (IQ/OQ/PQ) |
| Anforderungsspezifikation | die | requirements specification |
| Rückverfolgbarkeit | die | traceability |
| Prüfpfad | der | audit trail |
| Audit-Trail | der | audit trail |
| Aufzeichnung | die | record |
| Signatur | die | signature |
| Zugriffskontrolle | die | access control |
| Rollenverwaltung | die | role management |
| Datenintegrität | die | data integrity |
| Änderungskontrolle | die | change control |
| Standardarbeitsanweisung | die | standard operating procedure (SOP) |
| Abweichung | die | deviation |
| Korrekturmaßnahme | die | corrective action (CAPA) |
| Qualitätssicherung | die | quality assurance |
| Audit | das | audit |
| Inspektion | die | inspection |
| Zulassung | die | marketing authorisation |
| Zulassungsverfahren | das | drug approval process |
| Zulassungsbehörde | die | regulatory authority |
| Behörde | die | (public) authority |
| Arzneimittel | das | medicinal product |
| Wirkstoff | der | active ingredient |
| Studie | die | study, clinical trial |
| Studienphase | die | trial phase |
| Charge | die | batch |
| Lieferkette | die | supply chain |
| Kühlkette | die | cold chain |
| Serialisierung | die | serialization |
| Arzneimittelsicherheit | die | pharmacovigilance |
| Marktzugang | der | market access |
| Laborinformationssystem | das | laboratory information system (LIMS) |
| Produktionsleitsystem | das | manufacturing execution system (MES) |
| Labor | das | laboratory |
| Dokumentenmanagement | das | document management |
| Berichtswesen | das | reporting |
| Datenlager | das | data warehouse |
| Probe | die | sample |
| Freigabe | die | release, sign-off |
| Dokumentation | die | documentation |
| Risikobewertung | die | risk assessment |
| Risiko | das | risk |
| Nachweis | der | documented proof |
| Vorschrift | die | regulation, rule |
| Richtlinie | die | guideline |
| Schulung | die | training (session) |
| Abnahme | die | acceptance, sign-off |
| Prüfplan | der | validation / test plan |
| Aufbewahrungsfrist | die | retention period |
| Datenaufbewahrung | die | data retention |
| Herstellung | die | manufacturing |
| Hersteller | der | manufacturer |
| Produktion | die | production |
| Manipulation | die | tampering |
| Wirksamkeit | die | efficacy |
| Nebenwirkung | die | side effect |
| Patientensicherheit | die | patient safety |
| Genehmigung | die | approval |
| Forschung | die | research |
| Softwarekategorie | die | software category (GAMP 5) |
| Medikament | das | medicine, drug |
| Patient | der | patient |

Group `Programming`:

| german | gender | english |
|---|---|---|
| Werttyp | der | value type |
| Referenztyp | der | reference type |
| Ausnahmebehandlung | die | exception handling |
| Nullreferenz | die | null reference |
| Archivierung | die | archiving |
| Ursachenanalyse | die | root cause analysis |
| Warnmeldung | die | alert |
| Vorfall | der | incident |

Group `Work`:

| german | gender | english |
|---|---|---|
| Gehaltsvorstellung | die | salary expectation |
| Kündigungsfrist | die | notice period |
| Eintrittstermin | der | start date |
| Verhandlung | die | negotiation |
| Vorstellungsgespräch | das | job interview |
| Rückfrage | die | follow-up question |
| Arbeitsvertrag | der | employment contract |
| Probezeit | die | probation period |
| Berufserfahrung | die | professional experience |
| Einarbeitung | die | onboarding |
| Weiterbildung | die | further training |
| Branchenwechsel | der | change of industry |
| Homeoffice | das | remote work |
| Präsenztag | der | on-site day |
| Bonus | der | bonus |
| Urlaubsanspruch | der | vacation entitlement |
| Erwartung | die | expectation |
| Umzug | der | move, relocation |
| Stelle | die | position, job |
| Vertrag | der | contract |
| Gehalt | das | salary |
| Bewerbung | die | (job) application |

Group `Switzerland`:

| german | gender | english |
|---|---|---|
| Aufenthaltsbewilligung | die | residence permit |
| Personenfreizügigkeit | die | free movement of persons |
| Arbeitspensum | das | workload percentage |
| Pensionskasse | die | pension fund |
| Monatslohn | der | monthly salary |

- [ ] **Step 5: Dexie version 14**

In `src/db/index.ts`, after the `version(13)` block, add (copy the exact `stores` map from version 13 verbatim):

```ts
    this.version(14).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt',
      simulatorSessions: '&id, status, startedAt',
      sprechenDiscussions: '&id, status, startedAt',
      sprechenCorrections: '&id, kind, createdAt, topicTitle',
      sprechenCorrectionEvents: '&id, correctionId, at',
      sprechenArgumentBanks: 'topicId',
      sprechenVortraege: '&id, status, startedAt',
      schreibenBeitraege: '&id, status, startedAt',
      schreibenArgumentBanks: 'themaId'
    }).upgrade(async tx => {
      // Top up the new Pharma group plus the Work/Switzerland/Programming
      // additions the Tier 1 Katalog's Domains reference (ADR-0022) — existing
      // users never re-run seedIfEmpty. Same top-up as version(12).
      await topUpNounsFromSeed(tx)
    })
```

- [ ] **Step 6: Run the full data/db test files + typecheck**

Run: `npm run test -- nouns.seed types` then `npm run typecheck`
Expected: PASS (seed test validates uniqueness/genders/groups — fix any entry it rejects; the check-first rule should have prevented duplicates).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(nouns): Pharma group + Tier 1 interview vocabulary, Dexie v14 top-up (ADR-0022)"
```

---

### Task 3: Domain content — extend the founding three, add nine new Domains

**Files:**
- Modify: `src/data/domains.ts`
- Test: `tests/data/domains.test.ts` (update assertions)

**Interfaces:**
- Consumes: `Darstellungsform` (Task 1), seed words (Task 2), proven verb set (Global Constraints).
- Produces: DOMAINS with exactly these ids: `dotnet`, `sql-server`, `docker`, `gxp`, `validierung`, `audit-trail`, `datenintegritaet`, `qualitaetsprozesse`, `behoerden`, `wertschoepfung`, `pharma-systeme`, `hr-runde`. Task 4's Katalog references exactly this id list.

- [ ] **Step 1: Update the test file first**

In `tests/data/domains.test.ts`:

Replace the shipped-Domains test:

```ts
  test('the shipped Domains are present', () => {
    expect(DOMAINS.map(d => d.id).sort()).toEqual([
      'audit-trail', 'behoerden', 'datenintegritaet', 'docker', 'dotnet', 'gxp',
      'hr-runde', 'pharma-systeme', 'qualitaetsprozesse', 'sql-server',
      'validierung', 'wertschoepfung'
    ])
  })
```

Replace the scene-register test with a form-aware one (erklärend explains, erzählend tells, persönlich states — ADR-0021):

```ts
  const FORM_PREFIX = { erklaerend: /^explain\b/, erzaehlend: /^tell\b/, persoenlich: /^state\b/ } as const
  test('every framing matches its Domain\'s Darstellungsform', () => {
    for (const d of DOMAINS) {
      for (const s of d.scenes) {
        expect(s, `${d.id}: "${s}"`).toMatch(FORM_PREFIX[d.form])
        expect(s.toLowerCase(), d.id).not.toContain('set it')
        expect(s.toLowerCase(), d.id).not.toContain('set the scene')
      }
    }
  })
```

Update the label assertions in 'lookup helpers' and 'the framings name the concepts…' to the new labels: `domainById('docker')?.label` is now `'DevOps & Betrieb'`. Add:

```ts
  test('interview-critical concepts are covered', () => {
    expect(domainById('validierung')!.scenes.join(' | ')).toContain('GAMP')
    expect(domainById('audit-trail')!.scenes.join(' | ')).toContain('audit trail')
    expect(domainById('hr-runde')!.scenes.join(' | ')).toContain('salary')
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- domains`
Expected: FAIL — new ids missing.

- [ ] **Step 3: Extend the founding three in `src/data/domains.ts`**

`dotnet`: label becomes `'C# & .NET'`; keep all existing scenes and append:

```ts
      'explain what deferred execution means in LINQ and when a query actually runs',
      'explain the difference between IQueryable and IEnumerable',
      'explain what generics buy you and what a constraint does',
      'explain what nullable reference types protect against',
      'explain where an exception should be caught and where it should only be logged'
```

Append to `dotnet.nouns`: `'Werttyp', 'Referenztyp', 'Ausnahmebehandlung', 'Nullreferenz', 'Abfrage'`.

`sql-server`: label becomes `'Datenzugriff & SQL'`; append scenes:

```ts
      'explain what change tracking in an ORM does and when it hurts performance',
      'explain what a schema migration is and what makes one risky',
      'explain when a stored procedure beats the ORM in an enterprise system',
      'explain how a reporting query over a large table stays fast',
      'explain what data archiving and retention mean and why regulations drive them'
```

Append to `sql-server.nouns`: `'Archivierung', 'Datenaufbewahrung', 'Aufbewahrungsfrist'`.

`docker`: label becomes `'DevOps & Betrieb'`; append scenes:

```ts
      'explain the stages of a CI/CD pipeline and what each one catches',
      'explain why dev, test and production environments must stay separate',
      'explain the difference between logging and monitoring, and what an alert should mean',
      'explain how a root cause analysis after an incident works',
      'explain what a managed cloud service takes off your plate and what it does not'
```

Append to `docker.nouns`: `'Vorfall', 'Ursachenanalyse', 'Warnmeldung'`.

- [ ] **Step 4: Add the nine new Domains**

Append to `DOMAINS` (all `form: 'erklaerend'` except `hr-runde`). Every verb below is in the proven/verified set — use the lists exactly as written; any further flavor verb must be grep-verified first (Global Constraints).

```ts
  {
    id: 'gxp',
    label: 'GxP-Grundlagen',
    form: 'erklaerend',
    scenes: [
      'explain what GMP — good manufacturing practice — regulates and who enforces it',
      'explain the difference between GMP, GCP and GLP',
      'explain what makes an IT system GxP-relevant and what follows from that',
      'explain why a GxP-relevant system changes how a developer works day to day',
      'explain what the "good practice" rules ultimately protect',
      'explain what an IT change in a GxP environment needs before it goes live',
      'explain why "it works" is not enough in a regulated system'
    ],
    nouns: [
      'Herstellung', 'Hersteller', 'Produktion', 'Charge', 'Labor', 'Studie',
      'Vorschrift', 'Richtlinie', 'Validierung', 'Qualitätssicherung', 'Dokumentation',
      'Aufzeichnung', 'Abweichung', 'Schulung', 'Freigabe', 'Nachweis', 'Risiko',
      'Risikobewertung', 'Patientensicherheit', 'Arzneimittel', 'Wirkstoff', 'Medikament',
      'Behörde', 'Inspektion', 'Audit', 'Standardarbeitsanweisung', 'Genehmigung', 'Prozess'
    ],
    verbs: [
      'herstellen', 'prüfen', 'überprüfen', 'kontrollieren', 'testen', 'sichern',
      'melden', 'beschreiben', 'planen', 'verwenden', 'ändern', 'erkennen',
      'vergleichen', 'einrichten'
    ]
  },
  {
    id: 'validierung',
    label: 'Validierung (CSV)',
    form: 'erklaerend',
    scenes: [
      'explain why software in pharma must be validated',
      'explain the GAMP 5 software categories and why the category decides the validation effort',
      'explain the difference between IQ, OQ and PQ',
      'explain what a user requirements specification is for',
      'explain what a traceability matrix connects and why an inspector asks for it',
      'explain what a risk-based validation approach changes in practice',
      'explain what revalidation after a change involves'
    ],
    nouns: [
      'Validierung', 'Qualifizierung', 'Anforderungsspezifikation', 'Rückverfolgbarkeit',
      'Prüfplan', 'Abnahme', 'Testfall', 'Dokumentation', 'Nachweis', 'Risikobewertung',
      'Risiko', 'Standardarbeitsanweisung', 'Freigabe', 'Abweichung', 'Änderungskontrolle',
      'Konfiguration', 'Anwendung', 'Umgebung', 'Migration', 'Schulung', 'Aufzeichnung',
      'Qualitätssicherung', 'Audit', 'Prozess', 'Version', 'Softwarekategorie'
    ],
    verbs: [
      'prüfen', 'überprüfen', 'testen', 'planen', 'beschreiben', 'ausführen',
      'sichern', 'ändern', 'vergleichen', 'erstellen', 'verwenden', 'melden'
    ]
  },
  {
    id: 'audit-trail',
    label: 'Audit-Trail & E-Signatur',
    form: 'erklaerend',
    scenes: [
      'explain what FDA 21 CFR Part 11 demands of an electronic record',
      'explain what EU Annex 11 covers',
      'explain what an audit trail must log and why it must be tamper-proof',
      'explain the difference between an electronic signature and a scanned one',
      'explain how access control and role management work in a validated system',
      'explain why a shared account is unacceptable in a GxP system'
    ],
    nouns: [
      'Prüfpfad', 'Audit-Trail', 'Signatur', 'Aufzeichnung', 'Zugriffskontrolle',
      'Rollenverwaltung', 'Zugriff', 'Protokollierung', 'Manipulation', 'Datenintegrität',
      'Vorschrift', 'Richtlinie', 'Nachweis', 'Dokumentation', 'Freigabe', 'Datenbank',
      'Anwendung', 'Konfiguration', 'Version', 'Änderungskontrolle', 'Aufbewahrungsfrist',
      'Datenaufbewahrung', 'Genehmigung', 'Audit', 'Inspektion', 'Prozess'
    ],
    verbs: [
      'speichern', 'prüfen', 'überprüfen', 'sichern', 'melden', 'ändern', 'löschen',
      'verwalten', 'überwachen', 'erkennen', 'verwenden', 'einrichten'
    ]
  },
  {
    id: 'datenintegritaet',
    label: 'Datenintegrität',
    form: 'erklaerend',
    scenes: [
      'explain the ALCOA+ principles and what "attributable" means for a developer',
      'explain how a system prevents silent edits of recorded data',
      'explain the difference between a backup and an archive',
      'explain what a restore test proves that a backup alone does not',
      'explain what disaster recovery means for a validated system',
      'explain why deleting data in a regulated system is itself a regulated action'
    ],
    nouns: [
      'Datenintegrität', 'Rückverfolgbarkeit', 'Aufzeichnung', 'Manipulation', 'Prüfpfad',
      'Sicherung', 'Wiederherstellung', 'Datenbank', 'Datensatz', 'Speicherung',
      'Archivierung', 'Datenaufbewahrung', 'Aufbewahrungsfrist', 'Zugriff',
      'Zugriffskontrolle', 'Protokollierung', 'Nachweis', 'Risiko', 'Risikobewertung',
      'Vorschrift', 'Dokumentation', 'Qualitätssicherung', 'Validierung', 'Datenlager',
      'Bericht', 'Auswertung'
    ],
    verbs: [
      'speichern', 'sichern', 'löschen', 'ändern', 'prüfen', 'überprüfen',
      'kontrollieren', 'übertragen', 'erkennen', 'melden', 'verwalten', 'laden'
    ]
  },
  {
    id: 'qualitaetsprozesse',
    label: 'Change Control & Qualität',
    form: 'erklaerend',
    scenes: [
      'explain how a change gets approved in pharma IT — change control step by step',
      'explain what an SOP is and why IT work follows one',
      'explain the difference between a deviation and a CAPA',
      'explain what a periodic review of a validated system checks',
      'explain how a developer works with QA day to day',
      'explain what an inspector asks the IT department during an audit'
    ],
    nouns: [
      'Änderungskontrolle', 'Standardarbeitsanweisung', 'Abweichung', 'Korrekturmaßnahme',
      'Qualitätssicherung', 'Audit', 'Inspektion', 'Freigabe', 'Genehmigung', 'Prüfplan',
      'Nachweis', 'Dokumentation', 'Schulung', 'Prozess', 'Risikobewertung', 'Risiko',
      'Vorschrift', 'Richtlinie', 'Aufzeichnung', 'Validierung', 'Version', 'Migration',
      'Umgebung', 'Anwendung', 'Bereitstellung', 'Wartung'
    ],
    verbs: [
      'prüfen', 'überprüfen', 'ändern', 'planen', 'melden', 'beschreiben', 'beheben',
      'verbessern', 'verwalten', 'vergleichen', 'testen', 'bereitstellen'
    ]
  },
  {
    id: 'behoerden',
    label: 'Behörden & Zulassung',
    form: 'erklaerend',
    scenes: [
      'explain what Swissmedic regulates and how it relates to EMA and FDA',
      'explain the drug approval process at a high level',
      'explain why one product needs separate submissions in different regions',
      'explain what a regulator inspects at a pharma company',
      'explain what a marketing authorisation is',
      'explain why regulatory deadlines dominate pharma project planning'
    ],
    nouns: [
      'Behörde', 'Zulassungsbehörde', 'Zulassung', 'Zulassungsverfahren', 'Genehmigung',
      'Arzneimittel', 'Wirkstoff', 'Medikament', 'Studie', 'Studienphase', 'Wirksamkeit',
      'Nebenwirkung', 'Patientensicherheit', 'Vorschrift', 'Richtlinie', 'Inspektion',
      'Audit', 'Nachweis', 'Dokumentation', 'Marktzugang', 'Forschung', 'Hersteller',
      'Herstellung', 'Charge', 'Risiko', 'Prozess'
    ],
    verbs: [
      'prüfen', 'überprüfen', 'genehmigen', 'melden', 'beschreiben', 'planen',
      'vergleichen', 'verwenden', 'suchen', 'finden', 'erkennen', 'testen'
    ]
  },
  {
    id: 'wertschoepfung',
    label: 'Pharma-Wertschöpfungskette',
    form: 'erklaerend',
    scenes: [
      'explain the path from drug discovery to market at a high level',
      'explain what the three clinical trial phases each establish',
      'explain what a batch is and why batch records matter',
      'explain what serialization solves in the pharma supply chain',
      'explain what a cold chain is and what breaks it',
      'explain what pharmacovigilance watches after a drug is launched'
    ],
    nouns: [
      'Forschung', 'Wirkstoff', 'Arzneimittel', 'Medikament', 'Studie', 'Studienphase',
      'Patient', 'Patientensicherheit', 'Wirksamkeit', 'Nebenwirkung', 'Herstellung',
      'Produktion', 'Charge', 'Hersteller', 'Lieferkette', 'Kühlkette', 'Serialisierung',
      'Arzneimittelsicherheit', 'Marktzugang', 'Zulassung', 'Labor', 'Probe',
      'Qualitätssicherung', 'Freigabe', 'Risiko', 'Behörde'
    ],
    verbs: [
      'herstellen', 'liefern', 'testen', 'prüfen', 'übertragen', 'melden', 'sichern',
      'suchen', 'finden', 'planen', 'beschreiben', 'vergleichen', 'starten', 'überwachen'
    ]
  },
  {
    id: 'pharma-systeme',
    label: 'Pharma-IT-Systeme',
    form: 'erklaerend',
    scenes: [
      'explain what a LIMS does in a laboratory',
      'explain what an MES does on the shop floor',
      'explain how ERP, MES and LIMS divide the work between them',
      'explain what a document management system holds in pharma and who uses it',
      'explain what clinical trial systems like a CTMS manage',
      'explain why pharma IT is a landscape of interfaces rather than one system'
    ],
    nouns: [
      'Laborinformationssystem', 'Produktionsleitsystem', 'Dokumentenmanagement',
      'Berichtswesen', 'Datenlager', 'Labor', 'Probe', 'Charge', 'Produktion',
      'Herstellung', 'Schnittstelle', 'Anwendung', 'Datenbank', 'Datensatz', 'Bericht',
      'Auswertung', 'Konfiguration', 'Version', 'Migration', 'Bereitstellung', 'Zugriff',
      'Rollenverwaltung', 'Validierung', 'Lieferkette', 'Aufzeichnung', 'Prozess'
    ],
    verbs: [
      'verbinden', 'übertragen', 'speichern', 'laden', 'verwalten', 'überwachen',
      'bereitstellen', 'einrichten', 'ausführen', 'prüfen', 'melden', 'suchen'
    ]
  },
  {
    id: 'hr-runde',
    label: 'HR-Runde & Vertrag',
    form: 'persoenlich',
    scenes: [
      'state your salary expectation and leave room to negotiate',
      'state your notice period and your earliest possible start date',
      'state your work-permit situation as an EU citizen — free movement, B permit',
      'state whether you would take an 80% or a 100% contract, and why',
      'state what you expect regarding the 13th month salary and the pension fund',
      'state how many home-office days you hope for and what on-site presence you accept',
      'state your vacation expectation under a Swiss contract',
      'state one question you would ask the interviewers at the end'
    ],
    nouns: [
      'Gehaltsvorstellung', 'Verhandlung', 'Kündigungsfrist', 'Eintrittstermin',
      'Arbeitsvertrag', 'Probezeit', 'Vorstellungsgespräch', 'Rückfrage',
      'Berufserfahrung', 'Einarbeitung', 'Weiterbildung', 'Branchenwechsel',
      'Homeoffice', 'Präsenztag', 'Bonus', 'Urlaubsanspruch', 'Monatslohn',
      'Pensionskasse', 'Arbeitspensum', 'Aufenthaltsbewilligung',
      'Personenfreizügigkeit', 'Erwartung', 'Umzug', 'Stelle', 'Vertrag', 'Gehalt'
    ],
    verbs: [
      'verhandeln', 'erwarten', 'anbieten', 'fragen', 'suchen', 'finden', 'planen',
      'starten', 'warten', 'melden', 'vergleichen', 'verwenden', 'lesen', 'schreiben'
    ]
  }
```

- [ ] **Step 5: Run the domains test**

Run: `npm run test -- domains`
Expected: PASS. If a noun fails resolution, the word is missing from Task 2's seed — add it to `nouns.seed.json` (same check-first rule) rather than dropping it from the Domain, unless it duplicates an existing seed word under a different spelling.

- [ ] **Step 6: Run the whole suite + typecheck**

Run: `npm run test` then `npm run typecheck`
Expected: PASS. `usePackedSentenceQuiz.domains.test.ts` fixtures may need `form: 'erklaerend'` added if Task 1 didn't already fix them.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(sentence): Tier 1 pharma Domains + HR-Runde, founding Domains absorbed (ADR-0022)"
```

---

### Task 4: Katalog data structure and accordion Fachgebiet UI

**Files:**
- Create: `src/data/kataloge.ts`
- Create: `tests/data/kataloge.test.ts`
- Modify: `src/modules/sentence/SentenceSetup.vue` (Fachgebiet block template + script + styles)

**Interfaces:**
- Consumes: `DOMAINS`, `domainById`, `domainsByIds` from `src/data/domains.ts`; the Domain ids fixed in Task 3.
- Produces: `export interface KatalogSection { title: string; domainIds: readonly string[] }`, `export interface Katalog { id: string; label: string; sections: readonly KatalogSection[] }`, `export const KATALOGE: Katalog[]` from `src/data/kataloge.ts`. Task 5 consumes nothing new.

- [ ] **Step 1: Write the failing test**

Create `tests/data/kataloge.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { KATALOGE } from '../../src/data/kataloge'
import { DOMAINS, domainById } from '../../src/data/domains'

describe('Katalog bank', () => {
  test('exactly one Katalog ships in Release 1', () => {
    expect(KATALOGE.length).toBe(1)
    expect(KATALOGE[0].id).toBe('tier1-pharma')
  })
  test('every referenced Domain id resolves', () => {
    for (const k of KATALOGE) {
      for (const sec of k.sections) {
        for (const id of sec.domainIds) {
          expect(domainById(id), `${k.id} / ${sec.title}: "${id}"`).toBeDefined()
        }
      }
    }
  })
  test('no Domain id repeats within a Katalog, no section is empty', () => {
    for (const k of KATALOGE) {
      const all = k.sections.flatMap(s => [...s.domainIds])
      expect(new Set(all).size).toBe(all.length)
      for (const sec of k.sections) expect(sec.domainIds.length, sec.title).toBeGreaterThan(0)
    }
  })
  test('every Domain lives in some Katalog — no ungrouped list (ADR-0022)', () => {
    const referenced = new Set(KATALOGE.flatMap(k => k.sections.flatMap(s => [...s.domainIds])))
    for (const d of DOMAINS) expect(referenced.has(d.id), d.id).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- kataloge`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/data/kataloge.ts`**

```ts
// src/data/kataloge.ts
//
// Katalog bank (CONTEXT.md → "Katalog", ADR-0022). A Katalog is a curated
// collection of Domains for one interview target. It REFERENCES Domain ids —
// never owns Domains — so future targets reuse them (the same reference
// discipline domains.ts applies to nouns and verbs). Sections are
// presentation only: not selectable, no data of their own.
// tests/data/kataloge.test.ts asserts every id resolves and every Domain is
// referenced by some Katalog.

export interface KatalogSection {
  /** German section heading shown in the accordion. */
  title: string
  /** References into DOMAINS — must resolve via domainById. */
  domainIds: readonly string[]
}

export interface Katalog {
  /** kebab id — stable forever once shipped. */
  id: string
  /** Header label. "Tier 1" stays inside a longer label so the English
   *  jargon never stands alone as a German word (das Tier). */
  label: string
  sections: readonly KatalogSection[]
}

export const KATALOGE: Katalog[] = [
  {
    id: 'tier1-pharma',
    label: 'Big Pharma IT (Tier 1)',
    sections: [
      { title: 'Technik & .NET', domainIds: ['dotnet', 'sql-server', 'docker'] },
      {
        title: 'Regulierte Industrie',
        domainIds: [
          'gxp', 'validierung', 'audit-trail', 'datenintegritaet',
          'qualitaetsprozesse', 'behoerden', 'wertschoepfung', 'pharma-systeme'
        ]
      },
      { title: 'HR-Gespräch', domainIds: ['hr-runde'] }
    ]
  }
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- kataloge`
Expected: PASS.

- [ ] **Step 5: Accordion UI in SentenceSetup.vue**

Script changes (top `<script setup>` section):

```ts
import { KATALOGE, type KatalogSection } from '../../data/kataloge'
```

Add near the other Fachgebiet refs:

```ts
// Accordion state for the Katalog sections — presentation only, not persisted.
const openSection = ref<string | null>(null)
function sectionSelectedCount(sec: KatalogSection): number {
  return sec.domainIds.filter(id => domains.value.includes(id)).length
}
```

Template: replace the flat chip row (`<div class="chip-row">…DOMAINS…</div>`, currently around line 387–390) with:

```html
        <div v-for="kat in KATALOGE" :key="kat.id" class="kat">
          <div class="kat-label">{{ kat.label }}</div>
          <div v-for="sec in kat.sections" :key="sec.title" class="kat-sec">
            <button class="kat-sec-h" type="button"
              @click="openSection = openSection === sec.title ? null : sec.title">
              <span class="kat-caret" :class="{ open: openSection === sec.title }">▸</span>
              <span class="kat-sec-t">{{ sec.title }}</span>
              <span v-if="sectionSelectedCount(sec) > 0" class="kat-sec-n">{{ sectionSelectedCount(sec) }} gewählt</span>
            </button>
            <div v-if="openSection === sec.title" class="chip-row kat-chips">
              <button v-for="d in domainsByIds([...sec.domainIds])" :key="d.id" class="chip"
                :class="{ selected: domains.includes(d.id) }"
                type="button" @click="domains = toggle(domains, d.id)">{{ d.label }}</button>
            </div>
          </div>
        </div>
```

Copy changes in the same block:
- Subtitle `welchen Begriff die Karte erklärt` → `worüber die Karten sprechen`.
- The `grading-hint` paragraph becomes:

```html
        <p class="grading-hint">
          Jede Karte spricht aus <em>genau einem</em> gewählten Fachgebiet — <em>erklärend</em> wie im
          Fachgespräch (<em>der Unterschied zwischen Funktion und Stored Procedure</em>), oder
          <em>persönlich</em> wie in der HR-Runde (<em>meine Gehaltsvorstellung, meine Kündigungsfrist</em>).
          Die Nomen kommen dann aus dem Fachgebiet statt aus den Themengruppen, und der Verbpool wird
          nicht mehr gefiltert.
        </p>
```

Styles (add to the component's style block, matching its existing conventions — check whether it is `scoped` and mimic neighboring `.sna-*` rules):

```css
.kat { display: flex; flex-direction: column; gap: 2px; }
.kat-label { font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; opacity: 0.65; margin: 2px 0 4px; }
.kat-sec { border-top: 1px solid var(--border, rgba(128,128,128,0.25)); }
.kat-sec-h { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 2px; background: none; border: none; cursor: pointer; font: inherit; color: inherit; text-align: left; }
.kat-caret { transition: transform 0.15s; font-size: 11px; opacity: 0.6; }
.kat-caret.open { transform: rotate(90deg); }
.kat-sec-t { flex: 1; font-weight: 500; }
.kat-sec-n { font-size: 12px; opacity: 0.7; }
.kat-chips { padding: 0 2px 10px; }
```

`DOMAINS` may drop out of the template imports — remove the now-unused import if the linter/typecheck flags it (it is still used by the settings-restore filter; check before removing).

- [ ] **Step 6: Run suite + typecheck + phone-width sanity**

Run: `npm run test` then `npm run typecheck`
Expected: PASS. Then `npm run dev` and load the Sentence setup at 390 px viewport (DevTools device toolbar): the Fachgebiet block must not overflow horizontally; sections collapse/expand; selecting chips updates the summary line and the Themengruppen/Niveau side effects exactly as before. Stop the dev server after checking.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(sentence): Tier-1-Pharma Katalog with accordion Fachgebiet picker (ADR-0022)"
```

---

### Task 5: Version, changelog, full verification

**Files:**
- Modify: `package.json` (version)
- Modify: `src/data/changelog.ts` (APP_VERSION + new entry)

**Interfaces:**
- Consumes: everything above.
- Produces: version `1.20.04` everywhere.

- [ ] **Step 1: Bump versions**

`package.json`: `"version": "1.20.04"`. `src/data/changelog.ts`: `APP_VERSION = '1.20.04'` and prepend:

```ts
  {
    version: '1.20.04', date: '2026-08-13', kind: 'polish',
    title: 'Sätze · Fachgebiete: Big Pharma IT (Tier 1)',
    notes: [
      '<strong>Ein Katalog fürs Pharma-Interview.</strong> Das Fachgebiet im Satz-Quiz ist jetzt ein Katalog mit Rubriken — <em>Technik & .NET</em>, <em>Regulierte Industrie</em>, <em>HR-Gespräch</em>. Acht neue Pharma-Fachgebiete von GxP über Computersystemvalidierung, Audit-Trail und Datenintegrität bis zur Wertschöpfungskette, dazu die HR-Runde mit Gehaltsvorstellung, Kündigungsfrist und Aufenthaltsbewilligung.',
      '<strong>Nicht alles ist eine Definition.</strong> Jedes Fachgebiet hat eine Darstellungsform: <em>erklärend</em> wie im Fachgespräch, <em>erzählend</em> als kurze STAR-Episode, <em>persönlich</em> wie in der HR-Runde — die Karten sprechen so, wie das Interview es verlangt.',
      '<strong>Neue Themengruppe Pharma.</strong> Rund 90 neue Nomen — <em>die Charge</em>, <em>der Prüfpfad</em>, <em>die Standardarbeitsanweisung</em> — stehen auch allen Nomen-Drills zur Verfügung; dazu Schweiz-Vokabular wie <em>das Arbeitspensum</em> und <em>die Pensionskasse</em>.',
      '<strong>Die drei bestehenden Fachgebiete sind gewachsen.</strong> <em>C# & .NET</em>, <em>Datenzugriff & SQL</em> und <em>DevOps & Betrieb</em> decken jetzt auch LINQ, Migrationen, CI/CD-Pipelines und Ursachenanalysen ab.'
    ]
  },
```

(Adjust the noun count in the third note to the real number of added seed entries.)

- [ ] **Step 2: Full verification**

Run: `npm run test` — expected: all green.
Run: `npm run build` — expected: clean build (this also typechecks).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: bump version to 1.20.04 + changelog entry"
```

Release (merge to main, `npm run deploy`, push) is handled by the orchestrator afterwards per the standing release protocol.
