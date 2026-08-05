# Sprechen Teil 1 — Help-System Fixes (Design)

**Date:** 2026-08-05
**Status:** Approved (scope confirmed by the user after the two-agent review)
**Target version:** 1.17.01 (`kind: 'fix'`)
**Sources:** the post-ship reviews of 1.17.00 — one exam-fidelity/pedagogy review, one product/UX/state review — plus the controller's own pass. Findings converged independently on the two worst items.
**Depends on:** [the Teil 1 spec](2026-08-04-sprechen-teil1-design.md), [ADR-0014](../../adr/0014-teil1-continuous-rede-coverage-judged-not-measured.md), ADR-0012.

## Goal

Make the Teil 1 measurements tell the truth, stop the helps that mislead, and land the
highest-yield help improvements — all free/local, no new recurring AI cost. The release is a
fix, not a module: no new routes, no schema version bump, no new rubric.

## The three invariants still hold

No help is validated against · no help affects a score · no help costs a call except KI-Tipp.
Two review findings are fixed precisely because they *violated* these: the Hilfe-Protokoll
recorded helps never taken, and the KI-Tipp asserted an unreliable signal as fact.

---

## A · Measurements that must stop lying

**F1 — The spoken Rede is persisted continuously.** Today the only `saveRede` happens when
the mic closes; `onUnmounted` aborts the recognizer and discards the open segment, so a
four-minute take can be lost in full — defeating the stated purpose of `sprechenVortraege`.
Fix: `useSpeechRecognizer` gains an **optional** `onFinal` callback (additive — no existing
caller changes) firing on each committed final with the accumulated `{ text, spans, restarts }`;
the runner persists on every final. Worst-case loss becomes the current interim guess.
`onUnmounted` best-effort flushes before aborting, and the mic-denied path drains what was
already committed before downgrading.

**F2 — Redezeit gets a wall clock, and the hard limit fires on it.** Today `seconds`
accumulates only while the mic is open: pause the mic, the exam pauses, and the grader is
handed `4:00 · 0 lange Pausen` for a twelve-minute performance — the one criterion judged on
delivery evidence is scored on a gameable figure, and the mic-hint copy advertises the
exploit. Fix:
- `RedeRecord` gains `firstSpokenAt?: number` and `wallSeconds?: number` (wall time from the
  first mic open **while the runner is open** — closed-tab time is excluded; both persisted
  with the Rede).
- `hardLimitReached` takes `wallSeconds`. The Redezeit *bar* keeps measuring speaking time
  (that is the content budget); the rail shows both: `Redezeit 2:10 · Gesamt 3:40`.
- The grader's SPRECHDATEN block adds `Gesamtdauer` and `Pausenzeit` (= wall − spoken), so
  pausing turns from an invisible exploit into the most instructive number on the page.
- The mic-hint copy stops promising a free pause; in a hard-limit run it says the clock runs on.

**F3 — `canUseAi` gates setup.** The Teil 1 spec required it; the screen forgot it. Port
Teil 2's pattern: a persistent alert and the CTA disabled without a provider. A keyless
learner must not be able to deliver a Vortrag that can never be graded.

**F4 — The Nachfrage phase and the prep screen are persisted.** `saveNachfrage(id,
{ questionDe, answerDe: '' })` the moment the question arrives; the answer debounced into the
same record; on mount, an `in_progress` row with a `nachfrage` restores `phase = 'nachfrage'`
and the typed answer. No lost answers, no re-billed question calls on reload. And prep —
which the Teil 1 spec made a route precisely so it would survive a reload — actually does:
`plan` and `notes` are debounced into the sessionStorage stash as they are typed, so F5 no
longer blanks five keywords and the notes.

**F5 — The four unmatchable Vortragsmittel get explicit needles.** `redemittelNeedle` strips
`…` and slices 24 chars, so `vm-kontrast-1` ("Einerseits …, andererseits …") produces the
needle `einerseits andererseits` — a string no human sentence contains; the rubric's own
named construction can never light. Fix **without touching the shared algorithm**: `PhraseLike`
gains an optional `needle?: string`; the matcher prefers it; exactly four overrides, chosen to
match natural realizations:
`vm-kontrast-1 → 'andererseits'` · `vm-kontrast-2 → 'spricht dass'` ·
`vm-gliederung-2 → 'und zum schluss'` · `vm-beispiel-2 → 'als ich noch'`.
Teil 2's needles are byte-identical to before. Tests assert each override matches a natural
sentence, all needles (derived + overridden) stay distinct with none a substring of another,
and the min-length invariant is relaxed to ≥ 10 **for overrides only**, with the reason in
the test. `insertPhrase` inserts the **full phrase with its placeholders intact** — today it
inserts everything before the first `…`, which for `vm-kontrast-2` is the bare word „Für".

**F6 — The Hilfe-Protokoll becomes truthful.** Stuck-detection logs `'rettungsleine'` — a help
the learner never touched — and re-arms forever, so an idle learner accrues phantom entries;
`'drawer'` counts tab presses on an always-open drawer. Fix: new `HelpKind` `'stuck'`
(label „Stockung erkannt"), logged at most twice per run and never re-armed past that;
`'drawer'` logged on genuine consultation (Move-group change, and tab switch to a *different*
tab) — never on a no-op re-tap; the result page's minute timeline is bounded to the Rede's
own span. A descriptive record has one job.

## B · Helps that mislead

**F7 — The KI-Tipp stops asserting the keyword signal as coverage.** ADR-0014 exists because
keyword-said ≠ point-covered; the rail says `gesagt`, never `abgedeckt` — but the tip prompt
tells the model *„Noch nicht angesprochene Gliederungspunkte: …"* derived from `planSignals`,
so a learner who covered point 2 without saying their planned word gets a paid tip pointing
backwards. Fix: the model receives the Rede (last ~1200 chars) and the five point labels and
**judges coverage itself**; the keyword signals ride along only as an explicitly labelled,
unreliable hint (*„Hinweis, unzuverlässig: folgende geplante Stichwörter sind noch nicht
gefallen …"*). Same call. Additionally the prompt receives the Redezeit state (spoken and
wall time, words), so the tip can be pacing advice — *„3:10, zwei Punkte offen — kürze die
Situation ab"* — not only content advice.

**F8 — The prep tip stops contradicting the rubric.** *„Fünf halbe Punkte zählen weniger als
vier ganze — plane lieber ein Beispiel weniger"* coaches the learner into the exact penalty
`erfuellung` applies (*„Ein ausgelassener … Gliederungspunkt mindert die Punktzahl"*).
Replacement copy, same register: *„Alle fünf Punkte gehören hinein — ein ausgelassener Punkt
kostet mehr als ein knapper. Wenn die Zeit drängt, kürze bei Vor- und Nachteilen, aber lass
keinen Punkt weg."*

**F9 — The grader gets band anchors and a consistency check.** A "strenge, kalibrierte
Prüferin" persona calibrates nothing; an LLM asked for a free 0–25 integer regresses to the
middle. Fix: a Teil-1-local constant in `useVortragGrader.ts` (not in the shared rubric type)
with four written band anchors per criterion (≈ 24–25 / 18–19 / 12–13 / 5–6, phrased like the
Goethe grid's bands) embedded in the prompt, plus one hard rule: *„Pro nicht behandeltem
Gliederungspunkt mindestens 4 Punkte Abzug bei erfuellung."* And a validator rule: a response
where `coverage` shows ≤ 3 covered while `erfuellung` ≥ 20 is invalid (normal retry path) —
so „2 von 5 Punkten" can never render beside „Erfüllung 21/25".

**F10 — The Konnektoren-Palette gets syntactic frames.** Today it hands out bare words —
`trotzdem` (forces inversion) beside `denn` (forbids it) beside `nämlich` (cannot open a
sentence) — and tapping appends them into free text: the help manufactures the `word-order`
errors the same run's grader archives. Fix: new shape
`{ labelDe, stellungDe, konnektoren: { wort, frameDe }[] }`, grouped by the *Stellung* each
word forces; tapping inserts the **frame** (*„Trotzdem ist …"*, *„…, denn ich habe …"*),
`nämlich` shown mid-sentence only, `zunächst` moved to the opener group.

**F11 — Keyword hygiene in the planner.** ADR-0014's justification ("each keyword belongs to
exactly one point") is an assumption prep never enforces. Inline, non-blocking warnings when a
keyword duplicates another, is a substring of another (*„‚Sport' steckt in ‚Sportverein' —
beide Häkchen leuchten zusammen"*), or is shorter than 4 characters. Never blocks the CTA.

**F12 — The end of the Rede is confirmed and latched.** `finishRede` sets a synchronous
`finishing` latch at entry (a double-click today issues two Nachfrage calls) and asks for
confirmation below ~150 words, mirroring Teil 2's early-end warning. There is no route back
from the Nachfrage — the learner deserves one deliberate click.

**F13 — The mic-denied downgrade is recorded and stated.** Today `downgradeToTyped` mutates
`modality` in memory only: Dexie still says spoken, the grader gets the typed persona and the
typed kohaerenz hedge, the result prints a false „geschätzt, nicht gemessen" note, and
`spokenSeconds` is dropped. Fix: `SprechenVortrag` gains `downgradedAt?: number` (persisted);
**`modality` stays `'spoken'`** — the seconds are real and the spelling suppression must stay
on, since part of the text came from the recognizer; the input surface switches to typed; a
persistent alert replaces the toast; the result page and Run meta (`sprechenDowngraded`)
state it in one sentence.

**F14 — Runner exits.** A quiet „Vortrag verwerfen" (confirm → `abandonVortrag` → setup) in
the runner header and a second action on the grade-failed screen; and a resumed `submitted`
row shows an „Analyse starten" button instead of auto-firing a paid grade call on every visit.
Two adjacent one-liners ride along: `fetchKiTipp` increments/logs before assigning the tip,
and the argument bank loads on the resume-into-grading path too (the *Was* tab is empty there
today).

## C · Better and new helps

**F15 — Prüfungsmodus preset.** One control on the Prüfungskarte that sets: Hilfen aus,
Live-Checkliste aus, KI-Tipp aus, Zeitlimit hart (spoken), Vorbereitung 15 Min — with the
line *„Wie in der Prüfung: Aufgabenblatt, deine Notizen, vier Minuten — sonst nichts."* It is
a preset, not a fifth switch: it writes the four switches, which remain individually visible
and editable. And the header's word/clock display is **gated on the checklist switch** — today
„Live-Checkliste: Aus" hides the rail but leaves three counters visible, so the switch never
actually delivered a clock-free rehearsal.

**F16 — Konnektoren-Ausbeute on the result.** Local counting of distinct Konnektoren (from
the F10 data) in the Rede, shown per Stellung group with the cold groups named — *„Übergänge:
4 Signalwörter · ‚Gegenüberstellen' nie."* Zero AI, closes the loop on the palette, targets
the transition failure graders keep naming.

**F17 — Rettungsleine placement and voice.** Moved above the drawer (today the zero-cost help
is below the fold while the paid KI-Tipp sits above it — inverted pricing), given a speaker
button (the time-buying lines are exactly the ones that must be producible under pressure),
and raised visually when stuck-detection fires.

**F18 — The Nachfrage phase gets its missing helps.** The 🔊 button in the Nachfrage drawer
(the `nachfrage` Move group is by construction the one never practised in a Rede — and it is
the one group without the speaker today); a one-line strategy hint above the answer composer
(*„Nimm die Frage erst in eigenen Worten auf, dann antworte — zwei bis drei Sätze reichen."*);
the full Rede collapsed behind a „Vortrag anzeigen" disclosure so the question and the
composer are on screen; and the question generator rotates its job across runs — Vertiefung ·
konkretes Beispiel · Gegenposition · Transfer — with `validateNachfrage` additionally
rejecting yes/no-shaped openers (finite verb first). Same single call.

**F19 — SPRECHDATEN on the result.** Spoken runs show the learner what the grader saw:
Redezeit (gesprochen), Gesamtdauer, Pausenzeit, Wörter/Min against the 90 target, lange
Pausen. Today `kohaerenz` is partly docked on evidence the learner cannot see. The result
also renders `kiTippCount`, the four help switches as set, and — when present — the downgrade
note (F13).

**F20 — Vortragsthemen reauthored where premise-loaded.** Eight themes assert their own
conclusion (*„…warum X so wichtig ist"*), hollowing out *Vor- und Nachteile* and *Meinung*;
`vt-stadt-land` is a two-sided choice (a Teil 2 [Topic] by our own glossary) and
`vt-selbststaendig-oder-festangestellt` pre-empts point 3 in its task line. Reauthor to open
framings (ids and titles stay — history keys on `titleDe`; only `taskDe` changes), and add a
data test rejecting the premise-loading patterns (`warum … so wichtig`, `warum immer mehr`,
`warum … noch immer`, an either-or `oder` inside the task clause, and a literal
`Vor- und Nachteile` in `taskDe`).

**F21 — Aufwertungen: overlap and dosing.** Drop any Aufwertung whose anchored span
intersects a mistake span (the same words must never render red *and* clay); when mistakes
number more than 6, keep at most 2 Aufwertungen (style work belongs after accuracy); the
prompt's contradictory *„genau bis zu 5"* becomes *„höchstens fünf"*.

**F22 — Housekeeping.** TTS: `voice.cancel()` before speaking and `…` replaced by a comma so
prosody survives (30 of 35 phrases carry placeholders; some engines vocalize U+2026).
CONTEXT.md: the *Modality* entry still says a typed Rede is measured „against 445" — stale
since the 90 wpm rebase; fix to 360. The Füllbarkeits-Check's cryptic middle chip becomes
„drei Fachwörter?". A fourth Ausgrabung question: *„Und was zeigt das Beispiel?"* — the
anecdote must connect back to the point. The checklist rows become `<div>`s (today: five
focusable dead buttons). The Move nudge re-evaluates per ~40 words, not per keystroke. The
ten tag-banks' collocations are diversified away from the four shared frames (*eine … Rolle
spielen* is slot 1 in all ten). A hints-off run shows Teil 2's „Prüfungsbedingungen" 
reassurance line. Setup's resume banner no longer hides the whole page, and deleting a custom
Vortragsthema removes it from a drawn sheet.

## Out of scope (deliberately deferred, with reasons)

- **Typed drawer as gloss-only** (pedagogy suggestion 8): a real comparability concern —
  tap-to-insert feeds the criterion that rewards phrase variety — but it changes what the
  typed surface *is for*, which is a design decision, not a fix. Needs its own discussion.
- **„Nachfrage stellen" phase** (pedagogy 14): the one unexamined sub-skill, but a structural
  addition (new phase, new call) — not a `.01` release.
- **Per-sheet Gliederung variation** (pedagogy 10): the fixed five is a defensible scaffold;
  varying it is new content design.
- **Voice settings shared under `sprechenTeil2Setup`**: known, harmless, annoying to migrate.

## Testing

Every fix lands with its test. The non-negotiable regressions: Teil 2's matcher needles are
byte-identical (F5 uses overrides, not algorithm change); the Teil 2 runner/setup/result
tests pass untouched; Aufwertungen never reach `appendCorrections`; the grade pipeline still
records exactly one Run; `hardLimitReached` still returns false off-modality and off-switch.
New invariants: the four overridden needles match natural realizations; a stuck trigger never
logs a help the learner didn't take; a coverage/erfuellung contradiction never validates;
premise-loaded `taskDe` patterns are rejected by the data test.

## Release

`APP_VERSION = '1.17.01'`, changelog `kind: 'fix'`, package.json sync, merge to main, push,
deploy.
