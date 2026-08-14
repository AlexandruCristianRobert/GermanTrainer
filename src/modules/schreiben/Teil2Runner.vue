<script setup lang="ts">
//
// Schreiben Teil 2 — the halbformelle Nachricht itself. Structural twin of
// schreiben/Teil1Runner.vue: same mount contract, same 1s-debounced Dexie
// autosave, same rail meters, same drawer/nudge/KI-Tipp help surfaces, same
// runGrading() latch discipline. What the Forumsbeitrag runner does not have,
// and this one owes to the genre (CONTEXT.md → "Nachricht"):
//
//  1. TWO compose surfaces. `helps.rahmen` decides whether the learner writes
//     into four labeled slots (Betreff · Anrede · Text · Gruß & Name) or into
//     one free textarea — the exam condition. Nothing is ever prewritten: the
//     Anrede formula and its comma are the learner's own words either way
//     (CONTEXT.md → Rahmen-Gerüst), which is exactly what lets the Gerüst-Check
//     judge the same six things in both modes. `fullText` — the assembled
//     scaffold or the raw draft — is the single source every meter, check,
//     matcher, save and grade reads. There is no second notion of "the text".
//  2. The GERÜST-CHECK, six live frame dots under the Inhaltspunkt dots, under
//     the same checklist switch. Local, advisory, never a grading input.
//  3. The RADAR (own switch): push-warnings for du-Formen, Umgangssprache and
//     a Bitte/Beschwerde still missing its Konjunktiv II. Dismissible per
//     warning key for the sitting, and — deliberately — NEVER written to the
//     Hilfe-Protokoll: it is pushed at the learner, not reached for
//     (CONTEXT.md → Radar, Hilfe-Protokoll).
//  4. ANLASS-AWARE moves. The drawer leads with `movesForAnlass(...)` and the
//     Move nudge is restricted to that same set in BOTH its bank and its move
//     list — nudging „sich entschuldigen" into a Dank-Nachricht would coach the
//     genre wrong (CONTEXT.md → Move).
//  5. The Zeit-Phasen strip on the 25-minute countdown (planen/schreiben/
//     prüfen). Purely informational, like the countdown itself: the budget is
//     SOFT — past it the display flips to "+Überzeit", it never blocks and
//     never auto-submits. The 100-word floor is enforced the same soft way,
//     via a window.confirm on submit, never a disabled button.
//
// KI-Tipp renders whenever helps.kiTipp && canUseAi, independent of the
// helps.hints master switch — it is its own paid help. Its counter/log are
// billed only once the tip text itself has actually been generated, and
// `kiTipp.value` is assigned only after that billing write succeeds — a failed
// increment can never hand back a tip nobody paid for.
//
// The grade pipeline mirrors Teil1Runner's runGrading() exactly: a
// `runRecorded` guard wraps the one-time writes (Nachrichtenmittel yield, the
// archived corrections, the Run) so a retry after a LATER failure
// (sessionStorage/deleteNachricht) re-grades but never double-records. The
// result stash write, deleteNachricht and the navigate happen on every
// successful call — a retry must still be able to leave the screen.
// Aufwertungen are read into the stash and the meta, but NEVER into
// appendCorrections — they are not mistakes.
//
// ADR-0019: the Nachricht text is NEVER persisted anywhere but the Nachricht
// row while in progress. The result stash carries only DERIVED fields (word
// count, matched Nachrichtenmittel, the grade) — there is no `textDe` on
// NachrichtResultStash — and the Dexie row is deleted the moment a grade
// succeeds. A `submitted` row resumed after a reload (or a retry after a failed
// grade) waits for a deliberate "Analyse starten"/"Analyse erneut versuchen"
// click instead of auto-firing a paid grade call.

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { sentenceAround, type HelpKind } from '../../data/sprechen'
import { schreibenClock } from '../../data/schreiben'
import {
  NACHRICHT_STASH_KEY, NACHRICHT_MIN_WORDS, NACHRICHT_TARGET_WORDS, NACHRICHT_TIME_BUDGET_SECONDS,
  nachrichtWordBand, nachrichtPhase, assembleNachricht,
  type SchreibenNachricht, type NachrichtRunStash, type NachrichtSlots,
  type NachrichtBaukasten, type NachrichtPhase
} from '../../data/schreibenNachricht'
import { ANLASS_LABEL } from '../../data/schreibenAuftraege'
import {
  SCHREIBEN_NACHRICHTENMITTEL, NACHRICHT_MOVES, NACHRICHT_MOVE_LABEL,
  movesForAnlass, nachrichtenmittelForMove, RAHMEN_PAARE,
  type NachrichtMove, type RahmenPaar
} from '../../data/schreibenNachrichtenMittel'
import { resolveBaukasten } from '../../data/schreibenBaukasten'
import { geruestSignals, radarWarnungen, type GeruestKey, type RadarKey } from '../../composables/useNachrichtChecks'
import { matchRedemittel, pickMoveNudge } from '../../composables/useRedemittelMatch'
import { bumpRedemittelYield, lifetimeCounts } from '../../composables/useRedemittelYield'
import { loadCachedBaukasten } from '../../composables/useSchreibenBaukasten'
import {
  createNachricht, findActiveNachricht, saveNachrichtText, logNachrichtHelp,
  incrementNachrichtKiTipp, markNachrichtSubmitted, abandonNachricht, deleteNachricht
} from '../../composables/useSchreibenNachricht'
import { gradeNachricht, NACHRICHT_RESULT_KEY, type NachrichtResultStash } from '../../composables/useNachrichtGrader'
import { generateNachrichtKiTipp } from '../../composables/useNachrichtTipp'
import { countWords } from '../../composables/useSpeechRecognizer'
import { appendCorrections } from '../../composables/useSprechenArchive'
import { saveQuizRun, type SprechenErrorTag } from '../../composables/useQuizHistory'
import { resolveAiClient } from '../../composables/localClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const toast = useToast()
const { settings, canUseAi, load: loadSettings } = useSettings()

const nachricht = ref<SchreibenNachricht | null>(null)
const error = ref<string | null>(null)
const model = ref('')
const baukasten = ref<NachrichtBaukasten | null>(null)

// ── Compose surface ──────────────────────────────────────────────
// Exactly one of these two is live, decided by the frozen `helps.rahmen`.
// `fullText` is what everything else reads — there is no second text.
const slots = ref<NachrichtSlots>({ betreff: '', anrede: '', text: '', gruss: '' })
const textDraft = ref('')
/** The main body field in BOTH modes — the Text slot, or the free textarea. */
const textEl = ref<HTMLTextAreaElement | null>(null)

const rahmenOn = computed(() => nachricht.value?.helps.rahmen === true)
const fullText = computed(() => rahmenOn.value ? assembleNachricht(slots.value) : textDraft.value)

const tab = ref<'mittel' | 'baukasten'>('mittel')
const move = ref<NachrichtMove>('bezug')
const showOtherMoves = ref(false)
const nudgeDismissed = ref(false)
const nudgeLogged = ref(false)
const openGeruestHint = ref<GeruestKey | null>(null)

const kiBusy = ref(false)
const kiTipp = ref<string | null>(null)

const sending = ref(false)
const grading = ref(false)
const gradeFailed = ref(false)
/** Latches once the Run + archive + yield have been recorded — a retry after
 *  a LATER failure (sessionStorage/deleteNachricht) re-grades but must never
 *  double-record. Mirrors Teil1Runner's runRecorded guard. */
const runRecorded = ref(false)

/** Wall-clock seconds since the Nachricht started, display only — never gates
 *  submission (the budget is soft). Ticks once a second while mounted. */
const elapsedSeconds = ref(0)
let elapsedTimer: ReturnType<typeof setInterval> | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null

// Lifetime Nachrichtenmittel usage, read ONCE at mount — like Teil1Runner's
// own `lifetime` const, the ·neu marking must not flicker off as the learner
// uses phrases during THIS run.
const lifetime = lifetimeCounts(SCHREIBEN_NACHRICHTENMITTEL)

/** A `submitted` row (resumed from a reload, or retried after a failed
 *  grade in a past session) waits for a deliberate click instead of
 *  auto-billing a grade call on every visit. */
const awaitingGradeStart = computed(() => nachricht.value?.status === 'submitted' && !grading.value)

/** The plain "still writing" state — the only one where the composer,
 *  radar, nudge and drawer render. */
const writing = computed(() => !grading.value && !gradeFailed.value && !awaitingGradeStart.value)

const words = computed(() => countWords(fullText.value))
const wordBand = computed(() => nachrichtWordBand(words.value))
const overBudget = computed(() => elapsedSeconds.value > NACHRICHT_TIME_BUDGET_SECONDS)
const timerLabel = computed(() => overBudget.value
  ? `+${schreibenClock(elapsedSeconds.value - NACHRICHT_TIME_BUDGET_SECONDS)}`
  : schreibenClock(Math.max(0, NACHRICHT_TIME_BUDGET_SECONDS - elapsedSeconds.value)))

/** The 5' / 15' / 5' segments of `nachrichtPhase`, purely informational. The
 *  fourth phase ('ueberzeit') has no segment — it lights none of them. */
const PHASEN: readonly { key: NachrichtPhase; labelDe: string; spanDe: string }[] = [
  { key: 'planen', labelDe: 'planen', spanDe: '0–5' },
  { key: 'schreiben', labelDe: 'schreiben', spanDe: '5–20' },
  { key: 'pruefen', labelDe: 'prüfen', spanDe: '20–25' }
]
const phase = computed(() => nachrichtPhase(elapsedSeconds.value))

interface InhaltspunktSignal {
  index: number
  punkt: string
  keyword: string
  said: boolean
}

/** Same normalisation as the Redemittel matcher / Teil1Runner's planSignals,
 *  so all of them agree on what "written" means. */
function normalizeForMatch(s: string): string {
  return s.replace(/[.,;:!?…]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

/** One signal per Inhaltspunkt, in task-sheet order. A keywordless entry
 *  renders `said: false` — the rail shows a dash for it, not a false dot. */
const planSignals = computed<InhaltspunktSignal[]>(() => {
  const n = nachricht.value
  if (!n) return []
  const hay = normalizeForMatch(fullText.value)
  const byIndex = new Map(n.plan.map(p => [p.index, p.keyword ?? '']))
  return n.auftrag.inhaltspunkte.map((punkt, i) => {
    const keyword = (byIndex.get(i) ?? '').trim()
    const needle = normalizeForMatch(keyword)
    return {
      index: i,
      punkt,
      keyword,
      said: needle.length > 0 && hay.length > 0 && hay.includes(needle)
    }
  })
})

/** The six frame dots. Live off `fullText`, so they flip identically whether
 *  the frame came from the four slots or from one free textarea. */
const geruest = computed(() =>
  nachricht.value ? geruestSignals(fullText.value, nachricht.value.auftrag.empfaengerName) : []
)
const geruestOk = computed(() => geruest.value.filter(g => g.ok).length)

// ── Radar ────────────────────────────────────────────────────────
//
// Re-evaluated on the SAME 1s debounce as the autosave (`checkedText` is
// refreshed by the save timer), not per keystroke: a warning that blinks in
// and out mid-word is noise. Dismissal is per warning key and lasts the
// sitting — but only while the warning keeps firing: once a key stops firing
// its dismissal is dropped, so a du-Form typed again later warns again.

const checkedText = ref('')
const radarDismissed = ref(new Set<RadarKey>())

const radarAll = computed(() =>
  nachricht.value?.helps.radar
    ? radarWarnungen(checkedText.value, nachricht.value.auftrag.anlass)
    : []
)

watch(radarAll, list => {
  const live = new Set(list.map(w => w.key))
  for (const key of Array.from(radarDismissed.value)) {
    if (!live.has(key)) radarDismissed.value.delete(key)
  }
})

const radarWarnings = computed(() => radarAll.value.filter(w => !radarDismissed.value.has(w.key)))

/** Deliberately NOT logged — Radar warnings are pushed at the learner, never
 *  reached for, so they are not Hilfe-Protokoll entries (CONTEXT.md → Radar). */
function dismissRadar(key: RadarKey) {
  radarDismissed.value.add(key)
}

// ── Nachrichtenmittel ────────────────────────────────────────────

const usedIds = computed(() =>
  new Set(matchRedemittel([fullText.value], SCHREIBEN_NACHRICHTENMITTEL).map(r => r.id))
)

/** The Moves apt for THIS Anlass — the drawer leads with them and the nudge
 *  sees nothing else (CONTEXT.md → Move). */
const aptMoves = computed<NachrichtMove[]>(() =>
  nachricht.value ? movesForAnlass(nachricht.value.auftrag.anlass) : []
)
const otherMoves = computed(() => NACHRICHT_MOVES.filter(m => !aptMoves.value.includes(m)))
const aptBank = computed(() => SCHREIBEN_NACHRICHTENMITTEL.filter(p => aptMoves.value.includes(p.move)))

/** The „weitere" group is FORCED open while the selected Move lives inside it:
 *  collapsing it there would hide the active chip while its phrases stay listed
 *  below, leaving the drawer showing a selection with no visible selector. Its
 *  toggle hides for as long as that holds — picking an apt Move brings it back. */
const otherMovesForced = computed(() =>
  otherMoves.value.length > 0 && !aptMoves.value.includes(move.value)
)
const otherMovesOpen = computed(() =>
  otherMoves.value.length > 0 && (showOtherMoves.value || otherMovesForced.value)
)

const drawerPhrases = computed(() =>
  nachrichtenmittelForMove(move.value).map(r => ({ ...r, used: usedIds.value.has(r.id) }))
)

const freshMoves = computed(() => {
  const out = new Set<NachrichtMove>()
  for (const m of NACHRICHT_MOVES) {
    const total = SCHREIBEN_NACHRICHTENMITTEL
      .filter(r => r.move === m)
      .reduce((sum, r) => sum + (lifetime[r.id] ?? 0), 0)
    if (total === 0) out.add(m)
  }
  return out
})

/** Re-evaluates per ~40 words, not per keystroke: `pickMoveNudge` reads a
 *  FROZEN text snapshot, refreshed only when the 40-word band actually
 *  changes. Same frozen-text pattern as Teil1Runner's moveNudge. */
const nudgeBand = computed(() => Math.floor(words.value / 40))
const frozenNudgeText = ref('')
let lastNudgeBand = -1
watch(nudgeBand, band => {
  if (band === lastNudgeBand) return
  lastNudgeBand = band
  frozenNudgeText.value = fullText.value
}, { immediate: true })

const moveNudge = computed(() => {
  if (!nachricht.value?.helps.hints) return null
  if (nudgeDismissed.value) return null
  if (nudgeBand.value < 1) return null
  return pickMoveNudge([frozenNudgeText.value], lifetime, aptBank.value, aptMoves.value)
})

watch(moveNudge, val => {
  if (val && !nudgeLogged.value) {
    nudgeLogged.value = true
    logHelpAsync('nudge')
  }
})

// ── Autosave ─────────────────────────────────────────────────────
//
// One debounce for both surfaces: `fullText` is the assembled scaffold or the
// raw draft, and the slots ride along only when the scaffold is the live
// surface — a free-textarea row must never grow a `slots` field.

watch(fullText, val => {
  if (!nachricht.value) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const n = nachricht.value
    if (!n) return
    n.textDe = val
    checkedText.value = val
    if (rahmenOn.value) {
      const snapshot = { ...slots.value }
      n.slots = snapshot
      void saveNachrichtText(n.id, val, snapshot)
    } else {
      void saveNachrichtText(n.id, val)
    }
  }, 1000)
})

function tickElapsed() {
  if (!nachricht.value) return
  elapsedSeconds.value = Math.floor((Date.now() - nachricht.value.startedAt) / 1000)
}

function logHelpAsync(kind: HelpKind) {
  if (!nachricht.value) return
  const at = Date.now()
  nachricht.value.helpLog = [...nachricht.value.helpLog, { at, kind }]
  void logNachrichtHelp(nachricht.value.id, kind, at)
}

/** 'drawer' logs genuine consultation only: a tab switch to a DIFFERENT
 *  tab, never a no-op re-tap of the one already open. */
function selectTab(t: 'mittel' | 'baukasten') {
  const changed = t !== tab.value
  tab.value = t
  if (changed) logHelpAsync('drawer')
}

function selectMove(m: NachrichtMove) {
  const changed = m !== move.value
  move.value = m
  if (changed) logHelpAsync('drawer')
}

/** Writes into the body field of whichever surface is live, at the caret. */
function insertAtCaret(snippet: string, caretOffset = snippet.length) {
  const el = textEl.value
  const cur = rahmenOn.value ? slots.value.text : textDraft.value
  const write = (v: string) => {
    if (rahmenOn.value) slots.value.text = v
    else textDraft.value = v
  }
  if (!el) {
    write(cur ? `${cur} ${snippet}` : snippet)
    return
  }
  const at = el.selectionStart ?? cur.length
  write(`${cur.slice(0, at)}${snippet}${cur.slice(at)}`)
  requestAnimationFrame(() => {
    el.focus()
    const pos = at + caretOffset
    el.setSelectionRange(pos, pos)
  })
}

/** Inserts the FULL phrase, placeholder intact, at the caret. */
function insertPhrase(phraseDe: string) {
  insertAtCaret(phraseDe)
  logHelpAsync('phrase')
}

/**
 * A Rahmen-Paar is taken as a PAIR — an Anrede and a Grußformel of the same
 * register (CONTEXT.md → Nachrichtenmittel). With the scaffold on it fills its
 * two slots; without it, both lines go in at the caret with the caret parked
 * in the blank line between them, where the message body belongs.
 *
 * Exactly ONE blank line separates them: the frame alone must not green the
 * `absaetze` Gerüst dot, which wants two blank-line separations. That dot is
 * earned when a real body pushes the Gruß down, never by one helper click.
 */
function applyRahmenPaar(p: RahmenPaar) {
  if (rahmenOn.value) {
    slots.value.anrede = p.anredeDe
    slots.value.gruss = p.grussDe
  } else {
    const head = `${p.anredeDe}\n\n`
    insertAtCaret(`${head}${p.grussDe}`, head.length)
  }
  logHelpAsync('phrase')
}

/** The counter/log are billed only once the tip text has actually been
 *  generated: if `incrementNachrichtKiTipp` throws, `kiTipp.value` is never
 *  set, so a failed bookkeeping write can never hand back a tip that was
 *  never counted (same discipline as Teil1Runner's fetchKiTipp). */
async function fetchKiTipp() {
  if (!nachricht.value || kiBusy.value) return
  kiBusy.value = true
  try {
    const client = resolveAiClient(settings.value)
    const tip = await generateNachrichtKiTipp(client, model.value, nachricht.value)
    await incrementNachrichtKiTipp(nachricht.value.id)
    nachricht.value.kiTippCount += 1
    logHelpAsync('kitipp')
    kiTipp.value = tip
  } catch (err) {
    toast.error('KI-Tipp fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    kiBusy.value = false
  }
}

/** Flushes any pending debounce and persists the text immediately. */
async function commitText(): Promise<void> {
  const n = nachricht.value
  if (!n) return
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  const val = fullText.value
  n.textDe = val
  checkedText.value = val
  if (rahmenOn.value) {
    const snapshot = { ...slots.value }
    n.slots = snapshot
    await saveNachrichtText(n.id, val, snapshot)
  } else {
    await saveNachrichtText(n.id, val)
  }
}

/** 'Abgeben & bewerten': below the exam floor, a confirmation is required
 *  first — but it is advisory only, never a disabled button. */
async function submitNachricht() {
  if (!nachricht.value || sending.value || grading.value) return
  if (words.value < NACHRICHT_MIN_WORDS) {
    const warn = `Mit weniger als ${NACHRICHT_MIN_WORDS} Wörtern ist die Bewertung wenig aussagekräftig. Trotzdem abgeben?`
    if (!window.confirm(warn)) return
  }
  sending.value = true
  try {
    await commitText()
    await markNachrichtSubmitted(nachricht.value.id)
    nachricht.value.status = 'submitted'
    await runGrading()
  } finally {
    sending.value = false
  }
}

/** A quiet exit: the Nachricht row is deleted and nothing is recorded, exactly
 *  like Setup's own abandon action. Requires a deliberate confirmation. */
async function confirmAbandon() {
  if (!nachricht.value) return
  if (!window.confirm('Nachricht wirklich verwerfen? Der Fortschritt geht verloren.')) return
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  await abandonNachricht(nachricht.value.id)
  router.push({ name: 'schreiben-teil2' })
}

function countMistakes(mistakes: readonly { kind: SprechenErrorTag }[]): Partial<Record<SprechenErrorTag, number>> {
  const counts: Partial<Record<SprechenErrorTag, number>> = {}
  for (const m of mistakes) counts[m.kind] = (counts[m.kind] ?? 0) + 1
  return counts
}

async function runGrading() {
  const n = nachricht.value
  if (!n || grading.value) return
  grading.value = true
  gradeFailed.value = false
  try {
    const result = await gradeNachricht(resolveAiClient(settings.value), model.value, n)
    const finishedAt = Date.now()
    const matched = matchRedemittel([n.textDe], SCHREIBEN_NACHRICHTENMITTEL).map(p => p.id)

    if (!runRecorded.value) {
      bumpRedemittelYield(matched, finishedAt)
      saveQuizRun({
        type: 'schreiben-teil2',
        startedAt: new Date(n.startedAt).toISOString(),
        finishedAt: new Date(finishedAt).toISOString(),
        durationMs: finishedAt - n.startedAt,
        count: 100,
        correct: result.totalScore,
        meta: {
          topicTitle: n.auftrag.titleDe,
          sprechenScore: result.totalScore,
          maxScore: 100,
          passes: result.passes,
          sprechenPraedikat: result.praedikat,
          sprechenCriteria: result.criteria.map(c => ({ key: c.key, score: c.score, maxPoints: c.maxPoints })),
          sprechenModality: 'typed',
          sectionsCovered: result.coverage.filter(c => c.covered).length,
          wordCount: countWords(n.textDe),
          sprechenVortragsmittel: matched,
          kiTippCount: n.kiTippCount,
          // NachrichtHelps has no `hardLimit` (that concept is spoken-only, on
          // VortragHelps) — Schreiben never has one, so it is always false
          // here, same as Teil 1 reusing this same meta cluster.
          sprechenHelps: {
            hints: n.helps.hints, checklist: n.helps.checklist, kiTipp: n.helps.kiTipp, hardLimit: false
          },
          sprechenAufwertungen: result.aufwertungen,
          sprechenMistakeCounts: countMistakes(result.mistakes),
          sprechenStrengths: result.strengths,
          sprechenWeaknesses: result.weaknesses,
          sprechenOverallDe: result.overallDe,
          sprechenOverallEn: result.overallEn
        }
      })
      runRecorded.value = true

      // Deliberately non-fatal, same reasoning as Teil1Runner: the Run above is
      // already recorded, so throwing here would re-record it on retry.
      // Aufwertungen are NEVER included — not mistakes.
      try {
        await appendCorrections(result.mistakes.map(m => ({
          discussionId: n.id,
          topicTitle: n.auftrag.titleDe,
          modality: 'typed' as const,
          kind: m.kind,
          quote: m.quote,
          suggested: m.suggested,
          reasonDe: m.reasonDe,
          reasonEn: m.reasonEn,
          context: sentenceAround(n.textDe, m.spanStart),
          part: 2 as const,
          module: 'schreiben' as const
        })))
      } catch (err) {
        toast.error('Fehlerarchiv nicht aktualisiert', {
          description: err instanceof Error ? err.message : String(err)
        })
      }
    }

    const stash: NachrichtResultStash = {
      auftrag: n.auftrag,
      helps: n.helps,
      plan: n.plan,
      wordCount: countWords(n.textDe),
      kiTippCount: n.kiTippCount,
      helpLog: n.helpLog,
      nachrichtenmittel: matched,
      startedAt: n.startedAt,
      finishedAt,
      result
    }
    sessionStorage.setItem(NACHRICHT_RESULT_KEY, JSON.stringify(stash))
    await deleteNachricht(n.id)                      // ADR-0019: the Nachricht dies here
    router.push({ name: 'schreiben-teil2-result' })
  } catch (err) {
    gradeFailed.value = true                          // row stays 'submitted'; retry re-grades, latch prevents double-record
    toast.error('Analyse fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    grading.value = false
  }
}

async function loadBaukasten() {
  const n = nachricht.value
  if (!n) return
  const cached = await loadCachedBaukasten(n.auftrag.id)
  baukasten.value = resolveBaukasten(
    { id: n.auftrag.id, anlass: n.auftrag.anlass },
    cached ?? undefined
  ).bank
}

onMounted(async () => {
  await loadSettings()
  model.value = settings.value.model

  const raw = sessionStorage.getItem(NACHRICHT_STASH_KEY)
  if (raw) {
    sessionStorage.removeItem(NACHRICHT_STASH_KEY)
    try {
      const s = JSON.parse(raw) as NachrichtRunStash
      if (s.model) model.value = s.model
      nachricht.value = await createNachricht({ auftrag: s.auftrag, helps: s.helps, plan: s.plan })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to start.'
      return
    }
  } else {
    const active = await findActiveNachricht()
    if (!active) {
      error.value = 'Keine Nachricht gefunden. Geh zurück zur Auftragswahl.'
      return
    }
    nachricht.value = active
  }

  // Seed whichever surface is live. With the scaffold on, a resumed row hands
  // its slots back verbatim; the `textDe` fallback exists only for the case a
  // row somehow carries text but no slots — the body is never silently lost.
  textDraft.value = nachricht.value.textDe
  if (nachricht.value.helps.rahmen) {
    slots.value = nachricht.value.slots
      ? { ...nachricht.value.slots }
      : { betreff: '', anrede: '', text: nachricht.value.textDe, gruss: '' }
  }
  checkedText.value = fullText.value
  if (aptMoves.value.length > 0 && !aptMoves.value.includes(move.value)) move.value = aptMoves.value[0]

  tickElapsed()
  elapsedTimer = setInterval(tickElapsed, 1000)
  await loadBaukasten()
})

onUnmounted(() => {
  if (saveTimer) clearTimeout(saveTimer)
  if (elapsedTimer) clearInterval(elapsedTimer)
})

function backToSetup() { router.push({ name: 'schreiben-teil2' }) }
</script>

<template>
  <div v-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Hinweis</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="backToSetup">← Zur Auftragswahl</button>
  </div>

  <div v-else-if="!nachricht" class="page loading-state"><div class="micro-mark">Loading…</div></div>

  <div v-else class="page schreiben-run">
    <header class="run-head">
      <div>
        <div class="breadcrumb">Schreiben Teil 2</div>
        <h1 class="run-thesis">Nachricht<em>.</em></h1>
      </div>
      <div class="run-meta">
        <span v-if="nachricht.helps.checklist" class="quiz-counter">
          {{ words }} Wörter<template v-if="nachricht.helps.timer"> · <span :class="{ 'timer-over': overBudget }">{{ timerLabel }}</span></template>
        </span>
        <button
          v-if="writing" class="btn btn-quiet" type="button"
          :disabled="grading || sending || words === 0" @click="submitNachricht"
        >Abgeben &amp; bewerten</button>
        <button
          class="btn btn-ghost run-exit" type="button"
          :disabled="grading" @click="confirmAbandon"
        >Verwerfen</button>
      </div>
    </header>

    <div class="spr-run">
      <aside class="spr-rail">
        <div class="spr-rail-sec">
          <div class="spr-lbl">Aufgabenblatt</div>
          <div class="nf-sheet-h">
            <span class="nf-sheet-t">{{ nachricht.auftrag.titleDe }}</span>
            <span class="spr-flag">{{ ANLASS_LABEL[nachricht.auftrag.anlass].de }}</span>
          </div>
          <p class="spr-rail-forum">{{ nachricht.auftrag.situationDe }}</p>

          <div class="nf-empf">
            <span class="spr-lbl">Empfänger</span>
            <span class="nf-empf-n">{{ nachricht.auftrag.empfaengerName }}</span>
            <span class="nf-empf-r">{{ nachricht.auftrag.empfaengerRolleDe }}</span>
            <span class="nf-empf-h">Die Anrede muss diesen Namen nennen.</span>
          </div>

          <p class="spr-rail-stmt">{{ nachricht.auftrag.taskDe }}</p>
        </div>

        <div v-if="nachricht.helps.checklist" class="spr-rail-sec">
          <div class="spr-lbl">Live-Checkliste</div>
          <div class="spr-steps">
            <div v-for="s in planSignals" :key="s.index" class="spr-step" :class="{ done: s.said }">
              <span class="spr-step-n">{{ String(s.index + 1).padStart(2, '0') }}</span>
              <span>
                <span class="spr-step-t"><span class="spr-step-dot" :class="{ on: s.said }" />{{ s.punkt }}</span>
                <span class="spr-step-m">{{ s.keyword || '—' }}<template v-if="s.said"> · geschrieben</template></span>
              </span>
            </div>
          </div>
        </div>

        <div v-if="nachricht.helps.checklist" class="spr-rail-sec">
          <div class="spr-lbl">Rahmen · {{ geruestOk }} / {{ geruest.length }}</div>
          <div class="spr-steps">
            <button
              v-for="g in geruest" :key="g.key" type="button" class="spr-step nf-geruest"
              :class="{ done: g.ok }" :disabled="g.ok"
              @click="openGeruestHint = openGeruestHint === g.key ? null : g.key"
            >
              <span class="spr-step-n">{{ g.ok ? '✓' : '·' }}</span>
              <span>
                <span class="spr-step-t"><span class="spr-step-dot" :class="{ on: g.ok }" />{{ g.labelDe }}</span>
                <span v-if="!g.ok && openGeruestHint === g.key" class="nf-geruest-h">{{ g.hintDe }}</span>
              </span>
            </button>
          </div>
        </div>

        <div v-if="nachricht.helps.checklist" class="spr-rail-sec">
          <div class="spr-lbl">{{ words }} Wörter · mindestens {{ NACHRICHT_MIN_WORDS }}</div>
          <div class="spr-timebar">
            <span :style="{ width: `${Math.min(100, (words / NACHRICHT_TARGET_WORDS) * 100)}%` }" :class="wordBand === 'under' ? '' : wordBand" />
          </div>
          <div v-if="nachricht.helps.timer" class="spr-timebar-l">
            <span class="spr-num">Ziel {{ NACHRICHT_TARGET_WORDS }} Wörter</span>
            <span class="spr-num" :class="{ 'timer-over': overBudget }">
              {{ timerLabel }}<template v-if="overBudget"> über dem Budget</template><template v-else> übrig</template>
            </span>
          </div>
          <div v-if="nachricht.helps.timer" class="nf-phasen">
            <span
              v-for="p in PHASEN" :key="p.key" class="nf-phase"
              :class="{ on: phase === p.key }"
            >
              <b>{{ p.labelDe }}</b>
              <i>{{ p.spanDe }}′</i>
            </span>
          </div>
          <p v-if="nachricht.helps.timer && phase === 'ueberzeit'" class="nf-phase-note">
            Überzeit — in der Prüfung wäre jetzt Schluss.
          </p>
        </div>

        <div class="spr-rail-sec">
          <div class="spr-lbl">Nachrichtenmittel · {{ usedIds.size }} / {{ SCHREIBEN_NACHRICHTENMITTEL.length }}</div>
          <div class="spr-used">
            <span
              v-for="r in SCHREIBEN_NACHRICHTENMITTEL" :key="r.id" class="spr-used-dot"
              :class="{ on: usedIds.has(r.id) }" :title="r.phraseDe"
            />
          </div>
        </div>
      </aside>

      <div class="spr-run-main">
        <div v-if="grading" class="alert alert-info">
          <span class="alert-label">Auswertung</span>
          Die Nachricht wird gelesen — Inhaltspunkte geprüft, Rahmen und Register beurteilt, Fehler markiert, vier Kriterien bewertet. Einen Moment…
        </div>

        <div v-else-if="gradeFailed" class="alert alert-danger">
          <span class="alert-label">Analyse fehlgeschlagen</span>
          Die Nachricht ist gespeichert und kann erneut ausgewertet werden.
          <div class="nf-actions">
            <button class="btn btn-accent" type="button" @click="runGrading">Analyse erneut versuchen</button>
            <button class="btn btn-ghost" type="button" @click="confirmAbandon">Nachricht verwerfen</button>
          </div>
        </div>

        <div v-else-if="awaitingGradeStart" class="alert alert-info">
          <span class="alert-label">Bereit zur Auswertung</span>
          Deine Nachricht ist gespeichert.
          <div class="nf-actions">
            <button class="btn btn-accent" type="button" @click="runGrading">Analyse starten</button>
            <button class="btn btn-ghost" type="button" @click="confirmAbandon">Nachricht verwerfen</button>
          </div>
        </div>

        <template v-else>
          <!-- Rahmen-Gerüst: four labeled, EMPTY slots. Nothing is prewritten —
               the Anrede formula and its comma are the learner's own words. -->
          <div v-if="rahmenOn" class="spr-composer nf-frame">
            <label class="nf-slot">
              <span class="spr-lbl">Betreff</span>
              <input
                v-model="slots.betreff" type="text" spellcheck="false" class="input nf-line"
                placeholder="Worum geht es? Ein paar Wörter."
              >
            </label>
            <label class="nf-slot">
              <span class="spr-lbl">Anrede</span>
              <input
                v-model="slots.anrede" type="text" spellcheck="false" class="input nf-line"
                placeholder="Sehr geehrte(r) … ,"
              >
            </label>
            <label class="nf-slot nf-slot-body">
              <span class="spr-lbl">Text</span>
              <textarea
                ref="textEl" v-model="slots.text" autofocus spellcheck="false" class="nf-body"
                placeholder="Schreib deine Nachricht — ganze Sätze, durchgehend Sie-Register."
              />
            </label>
            <label class="nf-slot">
              <span class="spr-lbl">Gruß &amp; Name</span>
              <textarea
                v-model="slots.gruss" rows="2" spellcheck="false" class="nf-gruss"
                placeholder="Grußformel&#10;Dein Name"
              />
            </label>
            <div class="spr-composer-f">
              <span v-if="nachricht.helps.checklist" class="spr-count">{{ words }} Wörter</span>
            </div>
          </div>

          <!-- Rahmen off: the exam condition — the whole frame in one field. -->
          <div v-else class="spr-composer">
            <textarea
              ref="textEl" v-model="textDraft" autofocus spellcheck="false"
              placeholder="Schreib deine Nachricht — mit Betreff, Anrede, Text und Grußformel, wie in der Prüfung."
              class="nachricht-textarea"
            />
            <div class="spr-composer-f">
              <span v-if="nachricht.helps.checklist" class="spr-count">{{ words }} Wörter</span>
            </div>
          </div>

          <div v-if="nachricht.helps.radar && radarWarnings.length > 0" class="nf-radar">
            <div v-for="w in radarWarnings" :key="w.key" class="nf-radar-row">
              <span class="nf-radar-l">{{ w.labelDe }}</span>
              <div class="nf-radar-b">
                <p class="nf-radar-d">{{ w.detailDe }}</p>
                <div v-if="w.matches.length > 0" class="nf-radar-chips">
                  <span v-for="(m, i) in w.matches.slice(0, 3)" :key="`${w.key}-${i}`" class="nf-radar-chip">{{ m }}</span>
                </div>
              </div>
              <button class="spr-nudge-x" type="button" aria-label="Warnung ausblenden" @click="dismissRadar(w.key)">×</button>
            </div>
          </div>

          <div v-if="nachricht.helps.kiTipp && canUseAi" class="ki-standalone">
            <button class="btn btn-quiet" type="button" :disabled="kiBusy" @click="fetchKiTipp">
              {{ kiBusy ? '✦ KI-Tipp…' : '✦ KI-Tipp · 1 Call' }}
            </button>
            <p v-if="kiTipp" class="spr-kitipp">{{ kiTipp }}</p>
          </div>

          <template v-if="nachricht.helps.hints">
            <div v-if="moveNudge" class="spr-nudge">
              <span class="spr-nudge-l">Diesmal</span>
              <span class="spr-nudge-t">{{ NACHRICHT_MOVE_LABEL[moveNudge].de.toLowerCase() }}</span>
              <button class="spr-nudge-x" type="button" aria-label="Hinweis ausblenden" @click="nudgeDismissed = true">×</button>
            </div>

            <div class="spr-drawer">
              <div class="spr-drawer-h">
                <button class="spr-dtab" :class="{ on: tab === 'mittel' }" type="button" @click="selectTab('mittel')">
                  Wie<span class="spr-dtab-sub">Nachrichtenmittel</span>
                </button>
                <button class="spr-dtab" :class="{ on: tab === 'baukasten' }" type="button" @click="selectTab('baukasten')">
                  Was<span class="spr-dtab-sub">Baukasten</span>
                </button>
              </div>

              <div class="spr-drawer-b">
                <template v-if="tab === 'mittel'">
                  <div class="spr-moverow">
                    <button
                      v-for="m in aptMoves" :key="m" type="button" class="spr-move"
                      :class="{ on: move === m, fresh: freshMoves.has(m) }"
                      @click="selectMove(m)"
                    >{{ NACHRICHT_MOVE_LABEL[m].de }}</button>
                    <button
                      v-if="otherMoves.length > 0 && !otherMovesForced" type="button" class="spr-move nf-more"
                      @click="showOtherMoves = !showOtherMoves"
                    >{{ otherMovesOpen ? '− weitere' : `+ weitere (${otherMoves.length})` }}</button>
                  </div>
                  <div v-if="otherMovesOpen" class="spr-moverow nf-moverow-other">
                    <button
                      v-for="m in otherMoves" :key="m" type="button" class="spr-move"
                      :class="{ on: move === m, fresh: freshMoves.has(m) }"
                      @click="selectMove(m)"
                    >{{ NACHRICHT_MOVE_LABEL[m].de }}</button>
                  </div>
                  <p v-if="otherMovesOpen" class="nf-more-note">
                    Diese Schritte passen nicht zum Anlass „{{ ANLASS_LABEL[nachricht.auftrag.anlass].de }}" — nur nehmen, wenn du weißt, warum.
                  </p>

                  <ul class="spr-phrases">
                    <li v-for="p in drawerPhrases" :key="p.id" class="spr-phrase">
                      <button class="spr-phrase-t" :class="{ used: p.used }" type="button" @click="insertPhrase(p.phraseDe)">{{ p.phraseDe }}</button>
                      <span class="spr-phrase-en">{{ p.used ? 'schon benutzt' : p.noteEn }}</span>
                    </li>
                  </ul>

                  <div class="nf-rahmen">
                    <div class="spr-was-h">Rahmen · Anrede und Gruß gehören zusammen</div>
                    <ul class="spr-phrases">
                      <li v-for="p in RAHMEN_PAARE" :key="p.id" class="spr-phrase nf-paar">
                        <button class="spr-phrase-t" type="button" @click="applyRahmenPaar(p)">
                          {{ p.anredeDe }} <i class="nf-paar-sep">…</i> {{ p.grussDe }}
                        </button>
                        <span class="spr-phrase-en">{{ p.noteEn }}</span>
                      </li>
                    </ul>
                  </div>
                </template>

                <div v-else class="spr-was">
                  <div class="spr-was-h">Mögliche Gründe</div>
                  <div v-for="(a, i) in baukasten?.gruende ?? []" :key="`g${i}`" class="spr-was-i">
                    <div class="spr-was-c">{{ a.ideaDe }}</div>
                    <p class="spr-was-w">{{ a.noteEn }}</p>
                  </div>
                  <div class="spr-was-h">Lösungen &amp; Vorschläge</div>
                  <div v-for="(a, i) in baukasten?.loesungen ?? []" :key="`l${i}`" class="spr-was-i">
                    <div class="spr-was-c">{{ a.ideaDe }}</div>
                    <p class="spr-was-w">{{ a.noteEn }}</p>
                  </div>
                  <div class="spr-was-h">Textwortschatz</div>
                  <div class="nf-words">
                    <span v-for="(w, i) in baukasten?.words ?? []" :key="`w${i}`" class="nf-word">
                      <b>{{ w.de }}</b><i>{{ w.en }}</i>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </template>
          <div v-else class="alert alert-info exam-note">Prüfungsbedingungen — ohne Hilfsmittel.</div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.schreiben-run { max-width: 1080px; }
.run-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 12px; }
.run-thesis { font-family: var(--font-display); font-size: 24px; font-style: italic; line-height: 1.35; margin: 4px 0; }
.run-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex: 0 0 auto; }

.spr-rail-forum { font-size: 12.5px; font-style: italic; color: var(--mute); margin: 8px 0 0; }

.nf-sheet-h { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; margin-top: 8px; }
.nf-sheet-t { font-family: var(--font-display); font-size: 17px; font-weight: 500; letter-spacing: -.01em; }

/* Empfänger card — name and role stand on their own lines, in the nominative.
   Never spliced into a prepositional phrase: „an Ihr Abteilungsleiter" is what
   that would produce, and the card exists to model the Anrede, not to break it. */
.nf-empf { display: flex; flex-direction: column; gap: 2px; margin-top: 12px; padding: 10px 12px; background: var(--paper-deep); border-left: 2px solid var(--accent); }
.nf-empf-n { font-family: var(--font-display); font-size: 16px; font-weight: 500; letter-spacing: -.01em; }
.nf-empf-r { font-size: 13px; color: var(--ink-soft); }
.nf-empf-h { font-size: 12px; font-style: italic; color: var(--mute); margin-top: 4px; }

/* Live-Checkliste's one dot per row — a component-local twin of the shared
   .spr-used-dot, kept separate so it can never be confused (in markup or in
   a query) with the Nachrichtenmittel-yield dots in the same rail. */
.spr-step-dot { display: inline-block; width: 8px; height: 8px; border: 1px solid var(--hairline); margin-right: 8px; vertical-align: middle; }
.spr-step-dot.on { background: var(--accent); border-color: var(--accent); }

.nf-geruest { width: 100%; text-align: left; background: transparent; border-left: 0; border-right: 0; border-top: 0; font: inherit; color: var(--mute); cursor: pointer; }
/* A passing row has no hint to reveal (hintDe renders only while !ok), so it
   is inert — no pointer, no click, nothing to tap that does nothing. */
.nf-geruest:disabled { cursor: default; }
.nf-geruest.done { color: var(--ink-soft); }
.nf-geruest .spr-step-n { color: var(--mute); }
.nf-geruest.done .spr-step-n { color: var(--success); }
.nf-geruest-h { display: block; font-size: 12px; line-height: 1.5; color: var(--ink-soft); margin-top: 5px; text-wrap: pretty; }

.nf-phasen { display: flex; gap: 4px; margin-top: 10px; }
.nf-phase { flex: 1 1 0; display: flex; flex-direction: column; gap: 1px; padding: 5px 6px 4px; border-top: 2px solid var(--hairline); color: var(--mute); }
.nf-phase b { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; font-weight: 400; }
.nf-phase i { font-family: var(--font-mono); font-size: 9px; font-style: normal; opacity: .7; }
.nf-phase.on { border-top-color: var(--accent); color: var(--ink); }
.nf-phase-note { font-size: 12px; font-style: italic; color: var(--danger); margin: 8px 0 0; }

.timer-over { color: var(--danger); }

/* ── Compose surfaces ── */
.nachricht-textarea { width: 100%; min-height: 420px; background: transparent; border: 0; padding: 16px 18px; font-family: var(--font-body); font-size: 16.5px; line-height: 1.65; color: var(--ink); resize: vertical; }
.nachricht-textarea:focus { outline: 0; }
.nachricht-textarea::placeholder { color: var(--mute); font-style: italic; }

.nf-frame { display: flex; flex-direction: column; }
.nf-slot { display: flex; flex-direction: column; gap: 4px; padding: 12px 18px 10px; border-bottom: 1px dotted var(--hairline); }
.nf-slot-body { padding-bottom: 0; }
.nf-line { width: 100%; font-size: 16px; padding: 4px 0 6px; }
.nf-body { width: 100%; min-height: 300px; background: transparent; border: 0; padding: 6px 0 12px; font-family: var(--font-body); font-size: 16.5px; line-height: 1.65; color: var(--ink); resize: vertical; }
.nf-body:focus { outline: 0; }
.nf-body::placeholder, .nf-gruss::placeholder { color: var(--mute); font-style: italic; }
.nf-gruss { width: 100%; min-height: 0; background: transparent; border: 0; padding: 6px 0 4px; font-family: var(--font-body); font-size: 16px; line-height: 1.5; color: var(--ink); resize: vertical; }
.nf-gruss:focus { outline: 0; }

/* ── Radar ── */
.nf-radar { margin-top: 14px; display: flex; flex-direction: column; gap: 1px; }
.nf-radar-row { display: flex; align-items: flex-start; gap: 12px; padding: 10px 14px; background: var(--ochre-tint); border-left: 2px solid var(--ochre); }
.nf-radar-l { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: .18em; text-transform: uppercase; color: var(--ochre); flex: 0 0 auto; padding-top: 3px; }
.nf-radar-b { flex: 1 1 auto; min-width: 0; }
.nf-radar-d { font-size: 13.5px; line-height: 1.5; color: var(--ink-soft); margin: 0; text-wrap: pretty; }
.nf-radar-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 7px; }
.nf-radar-chip { font-family: var(--font-mono); font-size: 10.5px; padding: 2px 6px 1px; border: 1px solid color-mix(in srgb, var(--ochre) 40%, transparent); color: var(--ochre); }

/* ── Drawer extras ── */
.nf-more { font-style: italic; }
.nf-moverow-other { margin-top: 6px; }
.nf-more-note { font-size: 12px; font-style: italic; color: var(--mute); margin: 8px 0 0; text-wrap: pretty; }
.nf-rahmen { margin-top: 18px; padding-top: 4px; border-top: 1px solid var(--hairline); }
.nf-paar .spr-phrase-t { line-height: 1.4; }
.nf-paar-sep { font-style: normal; color: var(--mute); margin: 0 4px; }
.nf-words { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-top: 6px; }
.nf-word { display: flex; align-items: baseline; gap: 7px; }
.nf-word b { font-family: var(--font-display); font-size: 15px; font-weight: 500; letter-spacing: -.01em; }
.nf-word i { font-size: 12.5px; color: var(--mute); }

.ki-standalone { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-top: 16px; }

.exam-note { margin-top: 12px; }

.nf-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }

@media (max-width: 860px) {
  .run-head { flex-direction: column; }
  .nf-radar-row { flex-wrap: wrap; }
  .nf-radar-b { flex: 1 1 100%; }
}
</style>
