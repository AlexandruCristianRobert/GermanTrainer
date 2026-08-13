# Katalog · Tier 1 Pharma — Release 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Tier 1 Pharma Katalog: eleven new Domains (five technical `erklaerend`, four behavioral `erzaehlend`, Arbeitsweise `erklaerend`, Motivation `persoenlich`), their seed vocabulary, and the Katalog's three new sections.

**Architecture:** Pure content on Release 1's mechanism — no new types, no prompt changes, no UI changes beyond one hint-copy update. New nouns seed `nouns.seed.json` (mostly `Programming` and `Work`) and reach existing installs via Dexie `version(15)` + `topUpNounsFromSeed`. Domains join `DOMAINS` (src/data/domains.ts); Katalog sections grow in `src/data/kataloge.ts`. The `erzaehlend` prompt branch shipped in Release 1 gets its first real Domains here.

**Tech Stack:** Vue 3 + TypeScript, Dexie, Vitest. `npm run test -- <filter>`, `npm run typecheck`, `npm run build` from repo root (Windows PowerShell).

**Spec:** CONTEXT.md (Domain, Darstellungsform, Katalog), docs/adr/0021, docs/adr/0022, docs/tier1-pharma-interview-topics.md (sections 1.2, 1.4–1.6, 1.8, 3.1–3.4, 4, 5), and Release 1's plan (docs/superpowers/plans/2026-08-13-katalog-tier1-pharma-release-1.md) for conventions.

## Global Constraints

- Work on branch `feat/katalog-tier1-pharma-r2` (created by the orchestrator from main).
- **Never add a verb to `src/data/verbs.ts`** (ADR-0009). Every verb list below uses only verbs already CI-proven in domains.ts or grep-verified during Release 1: erstellen, testen, prüfen, überprüfen, ändern, anpassen, ersetzen, verwenden, benutzen, beheben, erkennen, entfernen, schreiben, lesen, beschreiben, planen, vergleichen, speichern, laden, suchen, finden, übertragen, sichern, berechnen, erhöhen, senken, beschleunigen, verbinden, ausführen, bereitstellen, starten, installieren, einrichten, überwachen, verwalten, löschen, bauen, melden, scheitern, auftreten, reagieren, warten, verhandeln, fragen, erklären, anbieten, herstellen, verbessern, erwarten, genehmigen, kontrollieren, liefern. Use the lists verbatim; any other verb requires a grep of `verbs.ts` first (`german: "<verb>"`). Known ABSENT: wiederherstellen, kündigen, validieren, dokumentieren, arbeiten (unverified — do not use).
- **Seed nouns: add-only, check-first.** Before adding any entry to `nouns.seed.json`, grep for `"german": "<word>"`. Exists under ANY group → skip, never modify. Add missing entries before the array's closing `]`, matching the existing 4-key format and UTF-8 encoding (umlauts literal, never \uXXXX).
- Scene register per Darstellungsform (CI-enforced by tests/data/domains.test.ts): `erklaerend` scenes start `explain`, `erzaehlend` start `tell`, `persoenlich` start `state`; never contain "set it"/"set the scene".
- Per-Domain floors (CI-enforced): ≥25 nouns, ≥10 verbs, ≥6 scenes, all deduplicated within the Domain.
- `tests/data/kataloge.test.ts` asserts EVERY Domain is referenced by some Katalog — any task that adds Domains must extend `kataloge.ts` in the same commit, or the suite goes red.
- Domain ids are permanent once shipped; existing ids never change.
- Commit per task, conventional messages, never `--no-verify`; end commit messages with the Co-Authored-By line for Claude Fable 5.

---

### Task 1: Release 2 seed vocabulary + Dexie v15

**Files:**
- Modify: `src/data/nouns.seed.json` (append; check-first)
- Modify: `src/db/index.ts` (version 15)

**Interfaces:**
- Consumes: `topUpNounsFromSeed(tx)`, existing seed format, `NOUN_GROUPS` (already contains `Pharma`; no group changes this release).
- Produces: every German word Tasks 2–3 reference resolves in the seed. Tasks 2–3 depend on this task.

- [ ] **Step 1: Add the seed entries (check-first for every word)**

Group `Programming`:

| german | gender | english |
|---|---|---|
| Thread | der | thread |
| Deadlock | der | deadlock |
| Threadsicherheit | die | thread safety |
| Nebenläufigkeit | die | concurrency |
| Hintergrundprozess | der | background process |
| Abbruch | der | cancellation, abort |
| Warteschlange | die | queue |
| Authentifizierung | die | authentication |
| Berechtigung | die | authorization, permission |
| Datenaustausch | der | data exchange |
| Abwärtskompatibilität | die | backward compatibility |
| Integration | die | integration |
| Übertragung | die | transmission, transfer |
| Integrationstest | der | integration test |
| Testabdeckung | die | test coverage |
| Codeüberprüfung | die | code review |
| Umstrukturierung | die | refactoring |
| Altcode | der | legacy code |
| Programmierstandard | der | coding standard |
| Codequalität | die | code quality |
| Schichtenarchitektur | die | layered architecture |
| Entwurfsmuster | das | design pattern |
| Monolith | der | monolith |
| Wartbarkeit | die | maintainability |
| Architekturentscheidung | die | architecture decision |
| Architektur | die | architecture |
| Komponente | die | component |
| Modernisierung | die | modernization |
| Ablösung | die | phased replacement |
| Altsystem | das | legacy system |
| Fehlersuche | die | debugging |
| Automatisierung | die | automation |
| Werkzeug | das | tool |
| Funktion | die | function |

Group `Work`:

| german | gender | english |
|---|---|---|
| Kommunikation | die | communication |
| Missverständnis | das | misunderstanding |
| Anforderung | die | requirement |
| Dienstleister | der | service provider |
| Lieferant | der | vendor, supplier |
| Besprechung | die | meeting |
| Rückmeldung | die | feedback, reply |
| Feedback | das | feedback |
| Alternative | die | alternative |
| Fachbegriff | der | technical term |
| Zusammenarbeit | die | collaboration |
| Zeitzone | die | time zone |
| Wissenstransfer | der | knowledge transfer |
| Übergabe | die | handover |
| Verantwortung | die | responsibility |
| Team | das | team |
| Kollege | der | colleague |
| Meinungsverschiedenheit | die | disagreement |
| Kritik | die | criticism |
| Misserfolg | der | failure |
| Lektion | die | lesson |
| Konflikt | der | conflict |
| Kompromiss | der | compromise |
| Termindruck | der | deadline pressure |
| Druck | der | pressure |
| Frist | die | deadline |
| Verzögerung | die | delay |
| Priorität | die | priority |
| Priorisierung | die | prioritization |
| Eigenverantwortung | die | ownership |
| Produktionsvorfall | der | production incident |
| Prozessverbesserung | die | process improvement |
| Verbesserung | die | improvement |
| Initiative | die | initiative |
| Sprint | der | sprint |
| Arbeitsweise | die | way of working |
| Aufwandsschätzung | die | effort estimate |
| Schätzung | die | estimate |
| Retrospektive | die | retrospective |
| Rolle | die | role |
| Planung | die | planning |
| Fortschritt | der | progress |
| Hindernis | das | impediment |
| Motivation | die | motivation |
| Nutzen | der | benefit |
| Produktportfolio | das | product portfolio |
| Schwerpunkt | der | focus, emphasis |
| Auswanderung | die | emigration |
| Entwicklung | die | development |
| Ziel | das | goal |
| Unternehmen | das | company |
| Produkt | das | product |
| Beitrag | der | contribution |
| Projekt | das | project |
| Lösung | die | solution |
| Problem | das | problem |
| Entscheidung | die | decision |
| Fehler | der | mistake, error |
| Termin | der | appointment, deadline |
| Änderung | die | change |
| Aufgabe | die | task |

Many common words here (Projekt, Problem, Lösung, Team, Ziel, Fehler, Termin, Aufgabe, …) very likely already exist — the check-first rule decides; skip silently and record in the report which were skipped.

- [ ] **Step 2: Dexie version 15**

In `src/db/index.ts`, after the `version(14)` block, add `version(15)` with the IDENTICAL `stores` map (copy from version 14 verbatim) and:

```ts
    }).upgrade(async tx => {
      // Top up the Release 2 vocabulary (behavioral/Arbeitsweise/Motivation Work
      // nouns + the remaining technical Programming nouns) the Tier 1 Katalog's
      // new Domains reference (ADR-0022). Same top-up as version(14).
      await topUpNounsFromSeed(tx)
    })
```

- [ ] **Step 3: Verify**

Run: `npm run test -- nouns.seed types db` then `npm run typecheck`
Expected: PASS (seed test validates format/uniqueness).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(nouns): Release 2 Tier 1 vocabulary (behavioral + remaining technical), Dexie v15 top-up (ADR-0022)"
```

---

### Task 2: Five technical Domains (1.2, 1.4, 1.5, 1.6, 1.8)

**Files:**
- Modify: `src/data/domains.ts` (append five Domains)
- Modify: `src/data/kataloge.ts` (extend the 'Technik & .NET' section — same commit, or kataloge.test goes red)
- Test: `tests/data/domains.test.ts` (id-list update)

**Interfaces:**
- Consumes: `Darstellungsform`, Task 1's seed words, the proven verb set.
- Produces: Domain ids `async`, `web-integration`, `testing`, `architektur`, `legacy`. Task 3 extends the id list further.

- [ ] **Step 1: Update the shipped-ids test first**

In `tests/data/domains.test.ts`, replace the id array in 'the shipped Domains are present' with:

```ts
    expect(DOMAINS.map(d => d.id).sort()).toEqual([
      'architektur', 'async', 'audit-trail', 'behoerden', 'datenintegritaet',
      'docker', 'dotnet', 'gxp', 'hr-runde', 'legacy', 'pharma-systeme',
      'qualitaetsprozesse', 'sql-server', 'testing', 'validierung',
      'web-integration', 'wertschoepfung'
    ])
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- domains`
Expected: FAIL — five ids missing.

- [ ] **Step 3: Append the five Domains to `DOMAINS`**

All `form: 'erklaerend'`. Use exactly:

```ts
  {
    id: 'async',
    label: 'Async & Nebenläufigkeit',
    form: 'erklaerend',
    scenes: [
      'explain what async/await does and what it does not do',
      'explain how a classic async deadlock arises (.Result, .Wait) and how to avoid it',
      'explain the difference between a Task and a Thread',
      'explain what a CancellationToken is for and what a graceful shutdown involves',
      'explain what thread safety means and what a lock costs',
      'explain when a concurrent collection beats a lock',
      'explain how a background job differs from a request handler'
    ],
    nouns: [
      'Thread', 'Deadlock', 'Threadsicherheit', 'Nebenläufigkeit', 'Hintergrundprozess',
      'Abbruch', 'Warteschlange', 'Sperre', 'Prozess', 'Aufgabe', 'Ausnahme',
      'Ausnahmebehandlung', 'Methode', 'Rückgabewert', 'Anfrage', 'Antwort',
      'Ressource', 'Auslastung', 'Server', 'Dienst', 'Ereignis', 'Fehlermeldung',
      'Neustart', 'Ausfall', 'Überwachung', 'Speicher'
    ],
    verbs: [
      'starten', 'warten', 'ausführen', 'beschleunigen', 'verbinden', 'prüfen',
      'melden', 'reagieren', 'scheitern', 'auftreten', 'überwachen', 'beheben'
    ]
  },
  {
    id: 'web-integration',
    label: 'Web-APIs & Integration',
    form: 'erklaerend',
    scenes: [
      'explain what makes an API RESTful and why consumers care',
      'explain the difference between authentication and authorization',
      'explain what OAuth2 solves at a high level',
      'explain what a message queue decouples and what it costs',
      'explain why enterprises still use file interfaces next to APIs',
      'explain what API versioning protects and what backward compatibility demands',
      'explain what interfacing with an ERP system like SAP typically involves'
    ],
    nouns: [
      'Schnittstelle', 'Endpunkt', 'Anfrage', 'Antwort', 'Warteschlange',
      'Authentifizierung', 'Berechtigung', 'Zugriff', 'Zugriffskontrolle',
      'Rollenverwaltung', 'Datenaustausch', 'Abwärtskompatibilität', 'Integration',
      'Übertragung', 'Version', 'Netzwerk', 'Server', 'Dienst', 'Konfiguration',
      'Anwendung', 'Fehlermeldung', 'Verbindung', 'Protokollierung', 'Datenbank',
      'Prozess', 'Ereignis'
    ],
    verbs: [
      'verbinden', 'übertragen', 'prüfen', 'sichern', 'melden', 'bereitstellen',
      'einrichten', 'verwenden', 'ändern', 'erstellen', 'ausführen', 'laden', 'speichern'
    ]
  },
  {
    id: 'testing',
    label: 'Testing & Codequalität',
    form: 'erklaerend',
    scenes: [
      'explain the difference between a unit test and an integration test',
      'explain what test coverage measures and what it does not',
      'explain what a mock replaces and when mocking goes too far',
      'explain how you give useful feedback in a code review',
      'explain how to refactor legacy code without breaking it',
      'explain what static analysis catches that reviews miss',
      'explain why coding standards matter more in a team than alone'
    ],
    nouns: [
      'Testfall', 'Einheitstest', 'Integrationstest', 'Testabdeckung',
      'Codeüberprüfung', 'Umstrukturierung', 'Altcode', 'Programmierstandard',
      'Codequalität', 'Quellcode', 'Feedback', 'Rückmeldung', 'Fehler',
      'Fehlermeldung', 'Wartbarkeit', 'Wartung', 'Verbesserung', 'Funktion',
      'Methode', 'Klasse', 'Zeichenkette', 'Sammlung', 'Bibliothek', 'Modul',
      'Paket', 'Werkzeug'
    ],
    verbs: [
      'testen', 'prüfen', 'überprüfen', 'verbessern', 'ändern', 'beheben',
      'erkennen', 'schreiben', 'lesen', 'beschreiben', 'vergleichen', 'ersetzen', 'anpassen'
    ]
  },
  {
    id: 'architektur',
    label: 'Architektur & Design',
    form: 'erklaerend',
    scenes: [
      'explain what a layered architecture separates and why',
      'explain the repository pattern and what it hides',
      'explain the difference between the strategy and the factory pattern',
      'explain when a monolith beats microservices in enterprise IT',
      'explain what designing for maintainability means in practice',
      'explain why architecture decisions should be written down and how',
      'explain what separation of concerns buys you when requirements change'
    ],
    nouns: [
      'Schichtenarchitektur', 'Entwurfsmuster', 'Monolith', 'Mikrodienst',
      'Wartbarkeit', 'Architekturentscheidung', 'Architektur', 'Komponente',
      'Abhängigkeit', 'Schnittstelle', 'Modul', 'Paket', 'Bibliothek', 'Klasse',
      'Dienst', 'Anwendung', 'Datenbank', 'Dokumentation', 'Umsetzung', 'Wartung',
      'Entscheidung', 'Anforderung', 'Verantwortung', 'Konfiguration', 'Prozess', 'Ereignis'
    ],
    verbs: [
      'planen', 'beschreiben', 'vergleichen', 'ersetzen', 'anpassen', 'erstellen',
      'verwenden', 'verbinden', 'prüfen', 'ändern', 'verwalten', 'bauen'
    ]
  },
  {
    id: 'legacy',
    label: 'Legacy & Modernisierung',
    form: 'erklaerend',
    scenes: [
      'explain how a migration from .NET Framework to modern .NET is approached',
      'explain your first steps when taking over an undocumented system',
      'explain the strangler pattern — replacing a system piece by piece',
      'explain what a risk assessment before touching a running system covers',
      'explain why a rewrite from scratch usually fails and what to do instead',
      'explain how to build a safety net of tests around code nobody understands'
    ],
    nouns: [
      'Modernisierung', 'Ablösung', 'Altsystem', 'Altcode', 'Risikobewertung',
      'Risiko', 'Migration', 'Dokumentation', 'Umstrukturierung', 'Testfall',
      'Einheitstest', 'Abhängigkeit', 'Quellcode', 'Version', 'Wartung',
      'Wartbarkeit', 'Anwendung', 'Datenbank', 'Schnittstelle', 'Ausfall',
      'Fehlermeldung', 'Neustart', 'Sicherung', 'Wiederherstellung', 'Fehlersuche'
    ],
    verbs: [
      'ersetzen', 'ändern', 'prüfen', 'testen', 'sichern', 'planen', 'beschreiben',
      'erkennen', 'beheben', 'verwalten', 'anpassen', 'entfernen'
    ]
  }
```

- [ ] **Step 4: Extend the Katalog's Technik section (same commit)**

In `src/data/kataloge.ts`, replace the 'Technik & .NET' section's `domainIds` with:

```ts
      { title: 'Technik & .NET', domainIds: ['dotnet', 'async', 'sql-server', 'web-integration', 'testing', 'architektur', 'docker', 'legacy'] },
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npm run test -- domains kataloge` then full `npm run test` and `npm run typecheck`
Expected: PASS. A noun failing resolution means a typo in the Domain list or a Task-1 gap — fix the typo, or add the missing seed word (check-first rule).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(sentence): five technical Tier 1 Domains — Async, Web-APIs, Testing, Architektur, Legacy (ADR-0022)"
```

---

### Task 3: Behavioral, Arbeitsweise, and Motivation Domains + new Katalog sections

**Files:**
- Modify: `src/data/domains.ts` (append six Domains)
- Modify: `src/data/kataloge.ts` (three new sections)
- Modify: `src/modules/sentence/SentenceSetup.vue` (grading-hint copy gains erzählend)
- Test: `tests/data/domains.test.ts` (id list to 23 + forms-coverage test)

**Interfaces:**
- Consumes: everything above; the `erzaehlend` prompt branch (shipped in Release 1, unused until now).
- Produces: Domain ids `kommunikation`, `teamarbeit`, `konflikt`, `eigenverantwortung`, `arbeitsweise`, `motivation`; the full 23-Domain Katalog.

- [ ] **Step 1: Update tests first**

Id array in 'the shipped Domains are present' becomes:

```ts
    expect(DOMAINS.map(d => d.id).sort()).toEqual([
      'arbeitsweise', 'architektur', 'async', 'audit-trail', 'behoerden',
      'datenintegritaet', 'docker', 'dotnet', 'eigenverantwortung', 'gxp',
      'hr-runde', 'kommunikation', 'konflikt', 'legacy', 'motivation',
      'pharma-systeme', 'qualitaetsprozesse', 'sql-server', 'teamarbeit',
      'testing', 'validierung', 'web-integration', 'wertschoepfung'
    ])
```

Append a forms-coverage test:

```ts
  test('all three Darstellungsformen ship (ADR-0021)', () => {
    expect(new Set(DOMAINS.map(d => d.form)))
      .toEqual(new Set(['erklaerend', 'erzaehlend', 'persoenlich']))
  })
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- domains`
Expected: FAIL — six ids missing (forms test may already pass via hr-runde only if erzaehlend missing — it must FAIL until erzaehlend ships).

- [ ] **Step 3: Append the six Domains**

```ts
  {
    id: 'kommunikation',
    label: 'Stakeholder & Kommunikation',
    form: 'erzaehlend',
    scenes: [
      'tell about a time you explained a technical problem to a non-technical colleague',
      'tell about gathering requirements from business users who did not know what they wanted',
      'tell about a time you said no to a stakeholder and offered an alternative',
      'tell about working with an external vendor that tested your patience',
      'tell about a misunderstanding that better communication would have prevented',
      'tell about a time you had to deliver bad news about a project'
    ],
    nouns: [
      'Kommunikation', 'Missverständnis', 'Anforderung', 'Dienstleister', 'Lieferant',
      'Besprechung', 'Rückmeldung', 'Feedback', 'Alternative', 'Fachbegriff',
      'Zusammenarbeit', 'Erwartung', 'Lösung', 'Problem', 'Projekt', 'Termin',
      'Entscheidung', 'Kritik', 'Kompromiss', 'Verantwortung', 'Kollege', 'Team',
      'Rückfrage', 'Verhandlung', 'Verzögerung'
    ],
    verbs: [
      'erklären', 'beschreiben', 'fragen', 'vergleichen', 'planen', 'melden',
      'verhandeln', 'finden', 'suchen', 'verwenden', 'anbieten', 'erwarten', 'verbessern'
    ]
  },
  {
    id: 'teamarbeit',
    label: 'Globale Teamarbeit',
    form: 'erzaehlend',
    scenes: [
      'tell about working in a cross-functional international team',
      'tell about collaborating across time zones and what asynchronous communication changed',
      'tell about a cultural difference that surprised you in a global company',
      'tell about a knowledge transfer you ran for colleagues',
      'tell about onboarding a new team member remotely',
      'tell about a time remote collaboration broke down and how it was fixed'
    ],
    nouns: [
      'Team', 'Zeitzone', 'Zusammenarbeit', 'Wissenstransfer', 'Übergabe',
      'Verantwortung', 'Kollege', 'Besprechung', 'Kommunikation', 'Missverständnis',
      'Einarbeitung', 'Homeoffice', 'Präsenztag', 'Dokumentation', 'Aufgabe',
      'Projekt', 'Rolle', 'Planung', 'Fortschritt', 'Rückmeldung', 'Erwartung',
      'Weiterbildung', 'Termin', 'Verzögerung', 'Lösung'
    ],
    verbs: [
      'planen', 'beschreiben', 'erklären', 'fragen', 'melden', 'verbinden',
      'verwalten', 'verwenden', 'vergleichen', 'finden', 'suchen', 'schreiben'
    ]
  },
  {
    id: 'konflikt',
    label: 'Konflikt & Druck',
    form: 'erzaehlend',
    scenes: [
      'tell about disagreeing with a technical decision and how you handled it',
      'tell about receiving critical feedback on your code and what you did with it',
      'tell about a project that failed or was cancelled and what you learned',
      'tell about delivering under a tight deadline and what you deprioritized',
      'tell about a conflict in the team that you helped resolve',
      'tell about a time you were wrong in a technical argument and admitted it'
    ],
    nouns: [
      'Meinungsverschiedenheit', 'Kritik', 'Misserfolg', 'Lektion', 'Konflikt',
      'Kompromiss', 'Termindruck', 'Druck', 'Frist', 'Verzögerung', 'Priorität',
      'Entscheidung', 'Feedback', 'Rückmeldung', 'Fehler', 'Lösung', 'Problem',
      'Projekt', 'Team', 'Kollege', 'Verantwortung', 'Erwartung', 'Besprechung',
      'Kommunikation', 'Aufgabe'
    ],
    verbs: [
      'verhandeln', 'erklären', 'fragen', 'vergleichen', 'melden', 'beheben',
      'erkennen', 'verbessern', 'planen', 'finden', 'beschreiben', 'erwarten'
    ]
  },
  {
    id: 'eigenverantwortung',
    label: 'Ownership & Problemlösung',
    form: 'erzaehlend',
    scenes: [
      'tell about your first week with an inherited system that had no tests and no documentation',
      'tell about debugging a production incident under time pressure',
      'tell about prioritizing when everything was urgent at once',
      'tell about a slow manual process you automated',
      'tell about a problem you fixed before anyone noticed it',
      'tell about the proudest improvement you shipped on your own initiative'
    ],
    nouns: [
      'Eigenverantwortung', 'Fehlersuche', 'Produktionsvorfall', 'Vorfall',
      'Priorisierung', 'Priorität', 'Automatisierung', 'Prozessverbesserung',
      'Verbesserung', 'Initiative', 'Einarbeitung', 'Ursachenanalyse', 'Altsystem',
      'Dokumentation', 'Testfall', 'Fehlermeldung', 'Überwachung', 'Neustart',
      'Ausfall', 'Skript', 'Werkzeug', 'Termindruck', 'Lösung', 'Prozess', 'Aufgabe'
    ],
    verbs: [
      'beheben', 'erkennen', 'prüfen', 'testen', 'ändern', 'verbessern', 'planen',
      'melden', 'ausführen', 'starten', 'überwachen', 'sichern'
    ]
  },
  {
    id: 'arbeitsweise',
    label: 'Agile & ITIL',
    form: 'erklaerend',
    scenes: [
      'explain what stays agile and what changes in a regulated environment',
      'explain the Scrum roles and ceremonies and your place in them',
      'explain what SAFe adds on top of Scrum and why large pharma uses it',
      'explain a Definition of Done that includes validation documents',
      'explain the ITIL distinction between an incident, a problem and a change',
      'explain how you estimate work and communicate delays early'
    ],
    nouns: [
      'Arbeitsweise', 'Sprint', 'Retrospektive', 'Rolle', 'Planung',
      'Aufwandsschätzung', 'Schätzung', 'Verzögerung', 'Vorfall', 'Problem',
      'Änderung', 'Besprechung', 'Team', 'Priorisierung', 'Priorität',
      'Anforderung', 'Aufgabe', 'Validierung', 'Dokumentation', 'Freigabe',
      'Prozess', 'Termin', 'Fortschritt', 'Hindernis', 'Abnahme'
    ],
    verbs: [
      'planen', 'vergleichen', 'beschreiben', 'erklären', 'melden', 'prüfen',
      'verwalten', 'erwarten', 'verhandeln', 'anpassen', 'verwenden', 'starten'
    ]
  },
  {
    id: 'motivation',
    label: 'Motivation & Firmenwahl',
    form: 'persoenlich',
    scenes: [
      'state why you want pharma rather than banking or a startup',
      'state why this specific company attracts you — pipeline, products, recent news',
      'state why this specific team and what they build appeals to you',
      'state what patient impact means to you as an internal IT developer',
      'state your five-year direction — technical expert or lead',
      'state your relocation story — why Switzerland, why now'
    ],
    nouns: [
      'Motivation', 'Branchenwechsel', 'Produktportfolio', 'Nutzen', 'Patient',
      'Entwicklung', 'Ziel', 'Auswanderung', 'Umzug', 'Berufserfahrung', 'Stelle',
      'Unternehmen', 'Produkt', 'Forschung', 'Arzneimittel', 'Beitrag',
      'Schwerpunkt', 'Weiterbildung', 'Team', 'Projekt', 'Erwartung',
      'Verantwortung', 'Wirkstoff', 'Patientensicherheit', 'Marktzugang'
    ],
    verbs: [
      'erwarten', 'suchen', 'finden', 'planen', 'vergleichen', 'erklären',
      'anbieten', 'verwenden', 'lesen', 'schreiben', 'starten', 'fragen'
    ]
  }
```

- [ ] **Step 4: Add the three Katalog sections (same commit)**

In `src/data/kataloge.ts`, the sections array becomes (Technik and Regulierte Industrie unchanged from Task 2):

```ts
      { title: 'Technik & .NET', domainIds: ['dotnet', 'async', 'sql-server', 'web-integration', 'testing', 'architektur', 'docker', 'legacy'] },
      {
        title: 'Regulierte Industrie',
        domainIds: [
          'gxp', 'validierung', 'audit-trail', 'datenintegritaet',
          'qualitaetsprozesse', 'behoerden', 'wertschoepfung', 'pharma-systeme'
        ]
      },
      { title: 'Verhaltensfragen', domainIds: ['kommunikation', 'teamarbeit', 'konflikt', 'eigenverantwortung'] },
      { title: 'Arbeitsweise', domainIds: ['arbeitsweise'] },
      { title: 'Motivation', domainIds: ['motivation'] },
      { title: 'HR-Gespräch', domainIds: ['hr-runde'] }
```

- [ ] **Step 5: Update the Fachgebiet hint copy**

In `src/modules/sentence/SentenceSetup.vue`, the grading-hint paragraph under the Fachgebiet block becomes:

```html
        <p class="grading-hint">
          Jede Karte spricht aus <em>genau einem</em> gewählten Fachgebiet — <em>erklärend</em> wie im
          Fachgespräch (<em>der Unterschied zwischen Funktion und Stored Procedure</em>),
          <em>erzählend</em> als kurze STAR-Episode (<em>Ich habe damals ein Altsystem übernommen …</em>),
          oder <em>persönlich</em> wie in der HR-Runde (<em>meine Gehaltsvorstellung, meine Kündigungsfrist</em>).
          Die Nomen kommen dann aus dem Fachgebiet statt aus den Themengruppen, und der Verbpool wird
          nicht mehr gefiltert.
        </p>
```

- [ ] **Step 6: Run tests + typecheck**

Run: `npm run test -- domains kataloge SentenceSetup` then full `npm run test` and `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(sentence): behavioral (erzählend), Arbeitsweise and Motivation Domains complete the Tier 1 Katalog (ADR-0021/0022)"
```

---

### Task 4: Version, changelog, full verification

**Files:**
- Modify: `package.json` (1.20.05)
- Modify: `src/data/changelog.ts` (APP_VERSION + entry)

- [ ] **Step 1: Bump versions**

`package.json` → `"version": "1.20.05"`; `changelog.ts` → `APP_VERSION = '1.20.05'` and prepend:

```ts
  {
    version: '1.20.05', date: '2026-08-13', kind: 'polish',
    title: 'Sätze · Fachgebiete: Tier 1 komplett',
    notes: [
      '<strong>Der Big-Pharma-Katalog ist vollständig.</strong> Elf neue Fachgebiete: <em>Async & Nebenläufigkeit</em>, <em>Web-APIs & Integration</em>, <em>Testing & Codequalität</em>, <em>Architektur & Design</em> und <em>Legacy & Modernisierung</em> vervollständigen die Technik-Rubrik; dazu <em>Agile & ITIL</em> und <em>Motivation & Firmenwahl</em>.',
      '<strong>Verhaltensfragen erzählen jetzt.</strong> Vier Fachgebiete — <em>Stakeholder & Kommunikation</em>, <em>Globale Teamarbeit</em>, <em>Konflikt & Druck</em>, <em>Ownership & Problemlösung</em> — nutzen die erzählende Darstellungsform: kurze STAR-Episoden in der ersten Person, Perfekt und Präteritum inklusive. So übt man die Sätze, aus denen Interview-Geschichten bestehen.',
      '<strong>Neues Vokabular für Beruf und Bewerbung.</strong> Wörter wie <em>die Meinungsverschiedenheit</em>, <em>der Termindruck</em>, <em>der Wissenstransfer</em> und <em>die Aufwandsschätzung</em> stehen jetzt in den Themengruppen Work und Programming — auch für alle Nomen-Drills.'
    ]
  },
```

(Adjust the vocabulary claim if the real added-word count from Task 1 makes "Wörter wie" misleading — it should stay accurate as phrased since it names examples, not counts. If any named example word was skipped as already-existing, swap in one that was actually added.)

- [ ] **Step 2: Full verification**

Run: `npm run test` (all green except the known ThemeToggle flake — verify in isolation if it fires) and `npm run build` (clean). Do NOT commit `dist/index.html` if the build regenerates it — `git checkout -- dist/index.html`.

- [ ] **Step 3: Commit**

```bash
git add package.json src/data/changelog.ts
git commit -m "chore: bump version to 1.20.05 + changelog entry"
```

Release (merge to main, deploy, dist-index commit, push) is handled by the orchestrator afterwards.
