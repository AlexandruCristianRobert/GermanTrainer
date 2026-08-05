<script setup lang="ts">
//
// Sprechen Teil 1 — Vortrag. ONE continuous composer for the whole Rede, then
// one Nachfrage exchange, then the grade (ADR-0014: no five-section stepper,
// no per-point word count — the design prototype's Spr1Run composed section
// by section; we deliberately do not).
//
// Boot: a Teil1RunStash (from Teil1Prep) creates a fresh Vortrag row; absent
// that, an active row is resumed. The Rede is persisted to Dexie on a
// debounce while typed (1s after the last keystroke) and on every committed
// recognizer final while spoken — a dead tab never loses more than a second
// of typing or the sentence still in the recognizer's buffer.
//
// The rail's Live-Checkliste lights one dot per Gliederungspunkt from the
// learner's OWN Vortragsplan keyword (useVortragCoverage's planSignals) —
// never from PUNKT_MOVES, which only outlines the drawer (ADR-0014). Rows
// read "gesagt", never "abgedeckt": saying the planned word and covering the
// point are different claims, and only the grader's coverage (Task 10) makes
// the second one — that lives in the result page, not here.
//
// KI-Tipp renders whenever helps.kiTipp && canUseAi, independent of the
// helps.hints master switch — it is its own paid help, not one of the free
// local ones. Stuck-Erkennung only ever OFFERS it (a highlighted note beside
// the button); the learner still has to tap it themselves.
//
// The hard limit (spoken only) commits the in-flight segment through
// recognizer.end() — which flushes pending finals before it actually stops —
// before the Rede is considered over, so it can never cost the learner a
// half-spoken sentence. It has no meaning in a typed Rede and never fires
// there (useVortragTimer.hardLimitReached() itself returns false off-modality).
// It fires on the WALL clock (`wall`/`ensureWallClock`), not on spoken
// seconds: the clock runs whether the mic is open or paused, exactly like an
// examiner's — see CONTEXT.md → "Rede" and F2 in the help-fixes spec.
//
// A mic denial (F13) never mutates `modality` — a spoken Vortrag stays
// spoken forever, seconds and all; only the input surface (`typedSurface`)
// falls back to typed, a `downgraded` ref renders a persistent alert instead
// of only a toast, and the Run/stash both state it.
//
// The grade pipeline mirrors Teil2Runner's runGrading() exactly: a
// `runRecorded` guard wraps the one-time writes (Redemittel yield, archived
// corrections, the Run) so a retry after a later failure re-grades but never
// double-records; the result stash write, deleteVortrag and the navigate
// happen every successful call, same as Teil2 (a retry must still be able to
// leave the screen). Aufwertungen are read into the stash and the meta, but
// NEVER into appendCorrections — they are not mistakes. A `submitted` row
// resumed from a reload (or a skipped Nachfrage) never auto-fires this
// pipeline (F14) — it waits for a deliberate "Analyse starten" click.

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  TEIL1_STASH_KEY, sentenceAround,
  type HelpKind, type RedeRecord, type SpeechSpan, type SprechenVortrag, type Teil1RunStash
} from '../../data/sprechen'
import {
  RETTUNGSLEINEN, SPRECHEN_VORTRAGSMITTEL, VORTRAG_MOVES,
  VORTRAG_MOVE_LABEL, VORTRAG_TARGET_WORDS, vortragClock, type VortragMove
} from '../../data/sprechenVortragsmittel'
import { matchRedemittel, pickMoveNudge } from '../../composables/useRedemittelMatch'
import { bumpRedemittelYield, lifetimeCounts } from '../../composables/useRedemittelYield'
import { resolveArgumentBank, type ArgumentBank } from '../../data/sprechenArguments'
import { loadCachedBank } from '../../composables/useSprechenArguments'
import { SPRECHEN_VORTRAGSTHEMEN } from '../../data/sprechenVortragsthemen'
import {
  abandonVortrag, createVortrag, deleteVortrag, findActiveVortrag, incrementVortragKiTipp,
  logHelp, markDowngraded, markVortragSubmitted, saveNachfrage, saveRede
} from '../../composables/useVortrag'
import { furthestReachedPunkt, outlinedMoves, planSignals } from '../../composables/useVortragCoverage'
import { hardLimitReached, redezeit } from '../../composables/useVortragTimer'
import { generateNachfrage, generateVortragKiTipp } from '../../composables/useVortragPartner'
import { gradeVortrag, VORTRAG_RESULT_KEY, type Teil1ResultStash } from '../../composables/useVortragGrader'
import {
  countWords, useSpeechRecognizer, type CommittedSpeech, type SpeechTurnResult
} from '../../composables/useSpeechRecognizer'
import { useSpeechVoice } from '../../composables/useSpeechVoice'
import { appendCorrections } from '../../composables/useSprechenArchive'
import { saveQuizRun, type SprechenErrorTag } from '../../composables/useQuizHistory'
import { resolveAiClient } from '../../composables/localClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const toast = useToast()
const { settings, canUseAi, load: loadSettings } = useSettings()
// `onFinalCommit` is declared further down (function declarations hoist for
// the whole setup() body) — it only ever RUNS once the recognizer delivers a
// result, by which point every ref/let below is already initialised (F1).
const recognizer = useSpeechRecognizer('de-DE', onFinalCommit)
const voice = useSpeechVoice()

const v = ref<SprechenVortrag | null>(null)
const error = ref<string | null>(null)
const model = ref('')
const bank = ref<ArgumentBank | null>(null)

type Phase = 'rede' | 'nachfrage'
const phase = ref<Phase>('rede')

const redeDraft = ref('')          // typed composer v-model for the Rede
const nachfrageAnswer = ref('')    // the Nachfrage answer, typed or spoken
const redeEl = ref<HTMLTextAreaElement | null>(null)
const nachfrageEl = ref<HTMLTextAreaElement | null>(null)

const tab = ref<'wie' | 'was'>('wie')
const move = ref<VortragMove>('einstieg')
const nudgeDismissed = ref(false)
const nudgeLogged = ref(false)
const lifelineIdx = ref(0)

/** F6/F17 — stuck-detection state. `stuckCount` caps the automatic 'stuck'
 *  log at twice per run; `armStuckTimer` itself refuses to schedule once the
 *  cap is hit, so the timer is never re-armed past that (F6) no matter which
 *  caller asks. `lifelineRaised` is the visual "raise" F17 asks for — once a
 *  stuck trigger fires, the Rettungsleine stays visually raised for the run. */
const stuckCount = ref(0)
const lifelineRaised = ref(false)

const kiBusy = ref(false)
const kiTipp = ref<string | null>(null)
const kiOfferedOnce = ref(false)
const kiTippSuggested = ref(false)

const nachfrageBusy = ref(false)
const nachfrageFailed = ref(false)
const nachfrageAttempts = ref(0)
const sending = ref(false)

const ending = ref(false)
const hardLimitNotice = ref(false)
const hardLimitHandled = ref(false)

const grading = ref(false)
const gradeFailed = ref(false)
/** Latches once the Run + archive + yield have been recorded — a retry after
 *  a LATER failure (sessionStorage/deleteVortrag) re-grades but must never
 *  double-record. Mirrors Teil2Runner's runRecorded guard exactly. */
const runRecorded = ref(false)

/** F12 — set synchronously at `finishRede`'s very first line, before any
 *  `await`. A double-click (or the hard limit firing while a manual click is
 *  mid-flight) must issue exactly one `generateNachfrage` call; a boolean
 *  guarded only after an `await` would let the second synchronous call slip
 *  through before `phase` ever changes. */
const finishing = ref(false)

/** F13 — the mic died mid-Rede. `v.modality` is NEVER mutated (the seconds
 *  already recorded are real and the spelling-suppression a spoken grade
 *  gets must stay on) — only the INPUT SURFACE falls back to typed. Restored
 *  from `v.downgradedAt` on a resumed row. */
const downgraded = ref(false)

/** F2 — wall-clock seconds since the first mic open, ticking once per second
 *  while the Rede phase is open, mic paused or not — the hard limit models
 *  an examiner's clock, which runs while the learner thinks. Seeded from
 *  `v.rede.wallSeconds` at mount so a resumed row keeps counting instead of
 *  restarting from zero. */
const wall = ref(0)

const tickNow = ref(0)
let tickTimer: ReturnType<typeof setInterval> | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
let nachfrageSaveTimer: ReturnType<typeof setTimeout> | null = null
let stuckTimer: ReturnType<typeof setTimeout> | null = null
let wallTimer: ReturnType<typeof setInterval> | null = null
let wallTicks = 0
let segmentStartAt = 0
// Snapshot of `v.rede` taken the instant the CURRENT held-floor segment
// started. `onFinalCommit` and the teardown flush recompute the merge fresh
// from this fixed base every time, rather than reading the mutable `v.rede`
// mid-segment — that field is exactly what they are progressively updating,
// so reading it as a "base" would double-append the same words (F1).
let segmentBaseText = ''
let segmentBaseSeconds = 0
let segmentBaseRestarts = 0
let segmentBaseSpans: SpeechSpan[] = []

const targetClock = vortragClock(VORTRAG_TARGET_WORDS)
// Lifetime Vortragsmittel usage, read ONCE at mount — like Teil2Runner's own
// `lifetime` const, the ·neu marking must not flicker off as the learner uses
// phrases during THIS run.
const lifetime = lifetimeCounts(SPRECHEN_VORTRAGSMITTEL)

const spoken = computed(() => v.value?.modality === 'spoken')

/** F13 — `modality` stays 'spoken' forever once set, even after a mic-denied
 *  downgrade, so `spoken` alone can no longer answer "which surface is the
 *  learner typing into right now?". This does: true for a typed Vortrag from
 *  the start, OR a spoken one that has fallen back after a denial. */
const typedSurface = computed(() => !spoken.value || downgraded.value)

/** The authoritative Rede text for matching/coverage — committed text only.
 *  A spoken segment's still-open interim never lights a checklist dot or a
 *  Vortragsmittel dot; only what actually got committed does. */
const liveRedeText = computed(() => typedSurface.value ? redeDraft.value : (v.value?.rede.textDe ?? ''))

const liveSpokenSeconds = computed(() => {
  if (!v.value) return 0
  void tickNow.value
  const base = v.value.rede.seconds ?? 0
  if (!recognizer.listening.value) return base
  return base + Math.max(0, (Date.now() - segmentStartAt) / 1000)
})

const currentWords = computed(() => {
  if (!v.value) return 0
  if (typedSurface.value) return countWords(redeDraft.value)
  void tickNow.value
  const live = recognizer.listening.value ? countWords(recognizer.liveText.value) : 0
  return countWords(v.value.rede.textDe) + live
})

const redeState = computed(() => redezeit({
  words: currentWords.value,
  seconds: spoken.value ? liveSpokenSeconds.value : undefined,
  modality: v.value?.modality ?? 'typed'
}))

/** F2 — m:ss, floor-seconds. A tiny local formatter, same shape as the one
 *  `useVortragGrader.ts` keeps for its own prompt text — not worth sharing
 *  for one line. */
function clockFmt(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const wallClock = computed(() => clockFmt(wall.value))

/** F14 — a `submitted` row (resumed after a reload, or after skipping the
 *  Nachfrage) waits for a deliberate click instead of auto-billing a grade
 *  call on every visit. */
const awaitingGradeStart = computed(() => v.value?.status === 'submitted' && !grading.value)

const signals = computed(() => v.value ? planSignals(v.value.plan, liveRedeText.value) : [])
const furthest = computed(() => furthestReachedPunkt(signals.value))
const outlined = computed(() => outlinedMoves(furthest.value))

const usedIds = computed(() =>
  new Set(matchRedemittel([liveRedeText.value, nachfrageAnswer.value], SPRECHEN_VORTRAGSMITTEL).map(r => r.id))
)

/** F22 — "re-evaluates per ~40 words, not per keystroke": `pickMoveNudge`
 *  reads a FROZEN text snapshot, refreshed only when the 40-word band
 *  actually changes, never on every keystroke. Without this, `moveNudge`
 *  would recompute (and potentially flip) on every character typed, since it
 *  would otherwise read `liveRedeText` directly. */
const nudgeBand = computed(() => Math.floor(currentWords.value / 40))
const frozenNudgeText = ref('')
let lastNudgeBand = -1
watch(nudgeBand, band => {
  if (band === lastNudgeBand) return
  lastNudgeBand = band
  frozenNudgeText.value = liveRedeText.value
}, { immediate: true })

const moveNudge = computed(() => {
  if (!v.value?.helps.hints) return null
  if (phase.value !== 'rede') return null
  if (nudgeDismissed.value) return null
  if (nudgeBand.value < 1) return null
  return pickMoveNudge([frozenNudgeText.value], lifetime, SPRECHEN_VORTRAGSMITTEL, VORTRAG_MOVES)
})

const freshMoves = computed(() => {
  const out = new Set<VortragMove>()
  for (const m of VORTRAG_MOVES) {
    const total = SPRECHEN_VORTRAGSMITTEL
      .filter(r => r.move === m)
      .reduce((sum, r) => sum + (lifetime[r.id] ?? 0), 0)
    if (total === 0) out.add(m)
  }
  return out
})

const drawerPhrases = computed(() =>
  SPRECHEN_VORTRAGSMITTEL
    .filter(r => r.move === move.value)
    .map(r => ({ ...r, used: usedIds.value.has(r.id) }))
)

watch(moveNudge, val => {
  if (val && !nudgeLogged.value) {
    nudgeLogged.value = true
    logHelpAsync('nudge')
  }
})

watch(phase, p => {
  if (p !== 'nachfrage') return
  move.value = 'nachfrage'
  // F2 — the wall clock is a Rede-phase-only measure (the exam's timed
  // portion); leaving the Rede phase stops and persists it for good.
  stopWallClock()
  persistWallClock()
})

// Live word/second display only — NOT the hard limit, which the 1s wall
// clock (below) now drives regardless of whether the mic is listening (F2).
watch(() => recognizer.listening.value, listening => {
  if (listening) {
    if (!tickTimer) tickTimer = setInterval(() => { tickNow.value = Date.now() }, 400)
  } else if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
})

watch(() => recognizer.error.value, err => {
  if (err?.kind === 'denied') downgradeToTyped()
})

watch(redeDraft, val => {
  if (!v.value || !typedSurface.value) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (!v.value) return
    v.value.rede = { ...v.value.rede, textDe: val }
    void saveRede(v.value.id, v.value.rede)
  }, 1000)
  armStuckTimer()
})

/** F4 — the Nachfrage answer, typed or spoken-then-typed, is debounced into
 *  Dexie the same way the Rede composer is: no lost answer on a dead tab,
 *  and no re-billed question call on a reload (the question itself is saved
 *  the moment it arrives, in `requestNachfrage`). */
watch(nachfrageAnswer, val => {
  if (!v.value?.nachfrage) return
  if (nachfrageSaveTimer) clearTimeout(nachfrageSaveTimer)
  nachfrageSaveTimer = setTimeout(() => {
    if (!v.value?.nachfrage) return
    const rec = { questionDe: v.value.nachfrage.questionDe, answerDe: val }
    v.value.nachfrage = rec
    void saveNachfrage(v.value.id, rec)
  }, 1000)
})

/** F6 — refuses to schedule once `stuckCount` has hit its cap of 2, so the
 *  timer is genuinely "never re-armed past that" no matter which caller asks
 *  (a keystroke, a tab switch, a phrase tap, `triggerStuck`'s own re-arm…). */
function armStuckTimer() {
  if (!v.value?.helps.hints) return
  if (spoken.value || phase.value !== 'rede') return
  if (stuckCount.value >= 2) return
  if (stuckTimer) clearTimeout(stuckTimer)
  stuckTimer = setTimeout(() => triggerStuck(), 20000)
}

function stopStuckTimer() {
  if (stuckTimer) { clearTimeout(stuckTimer); stuckTimer = null }
}

/**
 * Stuck-Erkennung. Never spends a call by itself — it raises the
 * Rettungsleine (F17 — both visibly, via `lifelineRaised`, and it was already
 * visible whenever helps.hints is on) and, once per run, offers the KI-Tipp
 * by highlighting the button. The learner spends it.
 *
 * F6 — logs the descriptive 'stuck' kind, never 'rettungsleine': that kind is
 * reserved for the learner's OWN manual "Nächste" tap or a spoken lifeline —
 * a help the learner never touched must not be recorded as one they did.
 * Capped at twice per run so an idle learner cannot accrue phantom entries.
 */
function triggerStuck() {
  if (!v.value?.helps.hints) return
  if (stuckCount.value >= 2) return
  stuckCount.value += 1
  lifelineRaised.value = true
  logHelpAsync('stuck')
  if (v.value.helps.kiTipp && !kiOfferedOnce.value) {
    kiOfferedOnce.value = true
    kiTippSuggested.value = true
  }
  armStuckTimer()
}

/** F2 — reads the WALL clock, never the spoken-seconds content budget: a real
 *  examiner interrupts on wall time whether the learner was talking or
 *  thinking. Driven once a second by `ensureWallClock`'s interval below, so
 *  it fires exactly the same whether the mic is open or paused. */
function checkHardLimit() {
  if (!v.value || phase.value !== 'rede') return
  if (v.value.modality !== 'spoken' || !v.value.helps.hardLimit) return
  if (hardLimitHandled.value) return
  if (hardLimitReached({ wallSeconds: wall.value, modality: 'spoken', hardLimit: true })) {
    hardLimitHandled.value = true
    void handleHardLimit()
  }
}

/** Commit the text first (recognizer.end() flushes pending finals before it
 *  actually stops), THEN treat the Rede as over. Never costs a half-said
 *  sentence. The hard limit is a system action, not a learner decision — it
 *  always skips F12's under-150-words confirmation. */
async function handleHardLimit() {
  hardLimitNotice.value = true
  await finishRede({ skipConfirm: true })
}

/** F2 — starts the once-a-second wall-clock tick the moment the Rede phase
 *  has a `firstSpokenAt` to count from, mic paused or not. Idempotent: safe
 *  to call on every mic-open and on mount. */
function ensureWallClock() {
  if (wallTimer) return
  if (!v.value || phase.value !== 'rede' || !v.value.rede.firstSpokenAt) return
  wallTimer = setInterval(() => {
    wall.value += 1
    wallTicks++
    checkHardLimit()
    if (wallTicks % 5 === 0) persistWallClock()
  }, 1000)
}

function stopWallClock() {
  if (wallTimer) { clearInterval(wallTimer); wallTimer = null }
}

/** Persisted alongside the Rede every ~5 ticks and on every phase
 *  transition/unmount — never for a Vortrag the wall clock never started
 *  (typed, or spoken but the mic was never opened). */
function persistWallClock() {
  if (!v.value || !v.value.rede.firstSpokenAt) return
  v.value.rede = { ...v.value.rede, wallSeconds: wall.value }
  void saveRede(v.value.id, v.value.rede)
}

/** F13 — the mic died mid-Rede (or mid-Nachfrage). `v.modality` is NEVER
 *  touched: the seconds already recorded are real, and the spelling
 *  suppression a spoken grade gets must stay on since part of the text came
 *  from the recognizer. Only the input surface (`typedSurface`) falls back
 *  to typed, and a persistent alert states it — a toast alone can be
 *  missed, and this changes how the rest of the run behaves. */
function downgradeToTyped() {
  if (!v.value || v.value.modality !== 'spoken' || downgraded.value) return
  downgraded.value = true
  const at = Date.now()
  v.value.downgradedAt = at
  redeDraft.value = v.value.rede.textDe
  void markDowngraded(v.value.id, at)
  toast.error('Mikrofon nicht verfügbar', {
    description: 'Du kannst den Vortrag ab hier weiter tippen — nichts geht verloren.'
  })
}

function logHelpAsync(kind: HelpKind) {
  if (!v.value) return
  const at = Date.now()
  v.value.helpLog = [...v.value.helpLog, { at, kind }]
  void logHelp(v.value.id, kind, at)
}

/** F6 — 'drawer' logs genuine consultation only: a tab switch to a
 *  DIFFERENT tab, never a no-op re-tap of the one already open. Any tap
 *  still counts as interacting with the help surface, so it resets the
 *  stuck timer regardless. */
function selectTab(t: 'wie' | 'was') {
  const changed = t !== tab.value
  tab.value = t
  armStuckTimer()
  if (changed) logHelpAsync('drawer')
}

/** F6 — same genuine-change gating as `selectTab`, for the Move row. */
function selectMove(m: VortragMove) {
  const changed = m !== move.value
  move.value = m
  armStuckTimer()
  if (changed) logHelpAsync('drawer')
}

/** F5 — inserts the FULL phrase, placeholders intact (`Einerseits …,
 *  andererseits …`); the old stub-before-the-first-… insertion silently
 *  dropped everything after the first placeholder. */
function insertPhrase(phraseDe: string) {
  if (!typedSurface.value) return
  if (phase.value === 'nachfrage') {
    const el = nachfrageEl.value
    const cur = nachfrageAnswer.value
    if (!el) { nachfrageAnswer.value = cur ? `${cur} ${phraseDe}` : phraseDe } else {
      const at = el.selectionStart ?? cur.length
      nachfrageAnswer.value = `${cur.slice(0, at)}${phraseDe}${cur.slice(at)}`
      requestAnimationFrame(() => { el.focus(); const pos = at + phraseDe.length; el.setSelectionRange(pos, pos) })
    }
  } else {
    const el = redeEl.value
    const cur = redeDraft.value
    if (!el) { redeDraft.value = cur ? `${cur} ${phraseDe}` : phraseDe } else {
      const at = el.selectionStart ?? cur.length
      redeDraft.value = `${cur.slice(0, at)}${phraseDe}${cur.slice(at)}`
      requestAnimationFrame(() => { el.focus(); const pos = at + phraseDe.length; el.setSelectionRange(pos, pos) })
    }
  }
  armStuckTimer()
  logHelpAsync('phrase')
}

/** F22 — cancels any speech already in flight before starting the new one
 *  (two overlapping utterances is worse than none), and never hands the
 *  engine a literal "…": some engines vocalize U+2026, so it becomes a comma
 *  instead — the learner's own continuation is exactly what the ellipsis
 *  marked, so a pause-inducing comma reads naturally. A trailing one (most
 *  phrases end mid-placeholder) is dropped rather than left as a dangling
 *  comma. */
function speakPhrase(text: string) {
  voice.cancel()
  void voice.speak(text.replace(/\s*…\s*/g, ', ').replace(/, $/, ''))
  armStuckTimer()
  logHelpAsync('vorsprechen')
}

function nextLifeline() {
  lifelineIdx.value = (lifelineIdx.value + 1) % RETTUNGSLEINEN.length
  armStuckTimer()
  logHelpAsync('rettungsleine')
}

/** F14 — the counter/log are billed BEFORE the tip is assigned: if
 *  `incrementVortragKiTipp` throws, `kiTipp.value` is never set, so a failed
 *  bookkeeping write can never hand back a tip that was never counted. */
async function fetchKiTipp() {
  if (!v.value || kiBusy.value) return
  kiBusy.value = true
  try {
    const client = resolveAiClient(settings.value)
    const tip = await generateVortragKiTipp(client, model.value, v.value)
    await incrementVortragKiTipp(v.value.id)
    v.value.kiTippCount += 1
    logHelpAsync('kitipp')
    kiTipp.value = tip
    kiTippSuggested.value = false
  } catch (err) {
    toast.error('KI-Tipp fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    kiBusy.value = false
  }
}

/** F1 — fires on every committed final while the Rede phase owns the mic.
 *  Recomputes fresh from the FIXED segment-start snapshot (never from the
 *  mutable `v.rede`, which this very function is progressively updating) so
 *  repeated finals never double-append. Persists immediately: worst-case
 *  loss on a dead tab becomes the still-open interim guess, never a whole
 *  segment. Ignored during the Nachfrage phase — that answer's own debounce
 *  (F4) owns `nachfrageAnswer` instead. */
function onFinalCommit(c: CommittedSpeech) {
  if (phase.value !== 'rede') return
  const vv = v.value
  if (!vv) return
  const elapsed = Math.max(0, (Date.now() - segmentStartAt) / 1000)
  vv.rede = {
    ...vv.rede,
    textDe: segmentBaseText ? `${segmentBaseText} ${c.text}` : c.text,
    seconds: segmentBaseSeconds + elapsed,
    restarts: segmentBaseRestarts + c.restarts,
    spans: [...segmentBaseSpans, ...c.spans]
  }
  void saveRede(vv.id, vv.rede)
}

/** Shared by `endSpokenSegment` and the onUnmounted best-effort flush — both
 *  turn a `SpeechTurnResult` into the authoritative merged Rede, from the
 *  same fixed segment-start snapshot `onFinalCommit` already used. */
function mergeSegmentResult(rede: RedeRecord, result: SpeechTurnResult): RedeRecord {
  const text = result.text.trim()
  return {
    ...rede,
    textDe: segmentBaseText ? (text.length > 0 ? `${segmentBaseText} ${text}` : segmentBaseText) : text,
    seconds: segmentBaseSeconds + Math.max(0, (result.endedAt - result.startedAt) / 1000),
    restarts: segmentBaseRestarts + result.restarts,
    spans: [...segmentBaseSpans, ...result.spans]
  }
}

/** Toggles the mic for whichever phase currently owns the composer. Snapshots
 *  the pre-segment Rede for `onFinalCommit`/`mergeSegmentResult`, stamps
 *  `firstSpokenAt` on the very first Rede-phase mic open (F2), and starts the
 *  wall clock if it is not already running. */
async function toggleMic() {
  if (ending.value) return
  if (recognizer.listening.value) {
    if (phase.value === 'rede') await endSpokenSegment()
    else await endNachfrageSegment()
  } else {
    const vv = v.value
    segmentStartAt = Date.now()
    if (vv) {
      segmentBaseText = vv.rede.textDe
      segmentBaseSeconds = vv.rede.seconds ?? 0
      segmentBaseRestarts = vv.rede.restarts ?? 0
      segmentBaseSpans = vv.rede.spans ?? []
      if (phase.value === 'rede' && !vv.rede.firstSpokenAt) {
        vv.rede = { ...vv.rede, firstSpokenAt: Date.now() }
        void saveRede(vv.id, vv.rede)
      }
    }
    ensureWallClock()
    recognizer.start()
  }
}

/** One held-floor stretch of the Rede — merged onto the segment-start
 *  snapshot and saved to Dexie immediately. `onFinalCommit` already kept
 *  `v.rede` current through the segment; this recomputes once more from the
 *  authoritative `end()` result (precise elapsed time) rather than trusting
 *  whatever the last final happened to leave behind. */
async function endSpokenSegment(): Promise<void> {
  const vv = v.value
  if (!vv || ending.value) return
  ending.value = true
  try {
    const result = await recognizer.end()
    vv.rede = mergeSegmentResult(vv.rede, result)
    await saveRede(vv.id, vv.rede)
    // Spoken stuck-detection: the recognizer only restarts on a silence long
    // enough that it decided the utterance was over — two in one held stretch
    // is the same "gone quiet" signal the typed 20s timer approximates.
    if (result.restarts >= 2 && phase.value === 'rede') triggerStuck()
  } finally {
    ending.value = false
  }
}

async function endNachfrageSegment(): Promise<void> {
  if (ending.value) return
  ending.value = true
  try {
    const result = await recognizer.end()
    const text = result.text.trim()
    if (text.length > 0) {
      nachfrageAnswer.value = nachfrageAnswer.value ? `${nachfrageAnswer.value} ${text}` : text
    }
  } finally {
    ending.value = false
  }
}

/** Flushes any pending typed-save debounce and persists the Rede immediately. */
async function commitRede(): Promise<void> {
  if (!v.value) return
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  if (typedSurface.value) {
    v.value.rede = { ...v.value.rede, textDe: redeDraft.value }
  }
  await saveRede(v.value.id, v.value.rede)
}

/**
 * 'Vortrag beenden' (or the hard limit): commit, move to the Nachfrage.
 *
 * F12 — `finishing` latches SYNCHRONOUSLY at the very first line, before any
 * `await`, so a double-click (or a manual click racing the hard limit) can
 * never issue two `generateNachfrage` calls: the second synchronous
 * invocation sees the latch already set and returns immediately, long before
 * `phase` itself would have changed. Below ~150 words, a confirmation is
 * required first — mirrors Teil2Runner's early-end warning — UNLESS the
 * caller is the hard limit itself (`skipConfirm`), which is a system action,
 * not a learner decision.
 */
async function finishRede(opts: { skipConfirm?: boolean } = {}) {
  if (!v.value || phase.value !== 'rede') return
  if (finishing.value) return
  finishing.value = true
  try {
    if (!opts.skipConfirm && currentWords.value < 150) {
      const warn = 'Mit weniger als 150 Wörtern ist die Bewertung wenig aussagekräftig. Trotzdem beenden?'
      if (!window.confirm(warn)) return
    }
    stopStuckTimer()
    if (!typedSurface.value && recognizer.listening.value) await endSpokenSegment()
    await commitRede()
    stopWallClock()
    persistWallClock()
    phase.value = 'nachfrage'
    await requestNachfrage()
  } finally {
    finishing.value = false
  }
}

/** F4 — the question is persisted with an empty answer the MOMENT it
 *  arrives, not only once the learner has typed something: a dead tab right
 *  after the question renders must not force a re-billed regeneration. */
async function requestNachfrage() {
  if (!v.value) return
  nachfrageBusy.value = true
  nachfrageFailed.value = false
  try {
    const client = resolveAiClient(settings.value)
    const question = await generateNachfrage(client, model.value, v.value)
    const rec = { questionDe: question, answerDe: '' }
    v.value.nachfrage = rec
    await saveNachfrage(v.value.id, rec)
  } catch (err) {
    nachfrageAttempts.value += 1
    nachfrageFailed.value = true
    toast.error('Nachfrage fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    nachfrageBusy.value = false
  }
}

function skipNachfrage() {
  if (!v.value) return
  nachfrageFailed.value = false
  v.value.nachfrage = undefined
  void submitVortrag()
}

async function submitVortrag() {
  if (!v.value || sending.value || grading.value) return
  sending.value = true
  try {
    if (nachfrageSaveTimer) { clearTimeout(nachfrageSaveTimer); nachfrageSaveTimer = null }
    if (recognizer.listening.value) await endNachfrageSegment()
    if (v.value.nachfrage) {
      const rec = { questionDe: v.value.nachfrage.questionDe, answerDe: nachfrageAnswer.value.trim() }
      v.value.nachfrage = rec
      await saveNachfrage(v.value.id, rec)
    }
    await markVortragSubmitted(v.value.id)
    v.value.status = 'submitted'
    v.value.endedAt = Date.now()
    await runGrading()
  } finally {
    sending.value = false
  }
}

/** F14 — a quiet exit from either phase (or the grade-failed screen): the
 *  Vortrag row is deleted and nothing is recorded, exactly like Setup's own
 *  abandon action. Requires a deliberate confirmation — this discards real
 *  work. */
async function confirmAbandon() {
  if (!v.value) return
  if (!window.confirm('Vortrag wirklich verwerfen? Der Fortschritt geht verloren.')) return
  stopStuckTimer()
  stopWallClock()
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  if (nachfrageSaveTimer) { clearTimeout(nachfrageSaveTimer); nachfrageSaveTimer = null }
  recognizer.abort()
  await abandonVortrag(v.value.id)
  router.push({ name: 'sprechen-teil1' })
}

async function runGrading() {
  const vv = v.value
  if (!vv || grading.value) return
  grading.value = true
  gradeFailed.value = false
  try {
    const result = await gradeVortrag(resolveAiClient(settings.value), model.value, vv)
    const finishedAt = vv.endedAt ?? Date.now()

    if (!runRecorded.value) {
      const matched = matchRedemittel([vv.rede.textDe, vv.nachfrage?.answerDe ?? ''], SPRECHEN_VORTRAGSMITTEL)
        .map(r => r.id)
      bumpRedemittelYield(matched, finishedAt)

      const counts: Partial<Record<SprechenErrorTag, number>> = {}
      for (const m of result.mistakes) counts[m.kind] = (counts[m.kind] ?? 0) + 1

      saveQuizRun({
        type: 'sprechen-teil1',
        startedAt: new Date(vv.startedAt).toISOString(),
        finishedAt: new Date(finishedAt).toISOString(),
        durationMs: finishedAt - vv.startedAt,
        count: 100,
        correct: result.totalScore,
        meta: {
          topicTitle: vv.thema.titleDe,
          sprechenScore: result.totalScore,
          maxScore: 100,
          passes: result.passes,
          sprechenPraedikat: result.praedikat,
          sprechenCriteria: result.criteria.map(c => ({ key: c.key, score: c.score, maxPoints: c.maxPoints })),
          sprechenModality: vv.modality,
          sectionsCovered: result.coverage.filter(c => c.covered).length,
          wordCount: countWords(vv.rede.textDe),
          spokenSeconds: vv.modality === 'spoken' ? (vv.rede.seconds ?? 0) : undefined,
          sprechenWallSeconds: vv.modality === 'spoken' ? (vv.rede.wallSeconds ?? 0) : undefined,
          sprechenDowngraded: downgraded.value || !!vv.downgradedAt,
          sprechenVortragsmittel: matched,
          kiTippCount: vv.kiTippCount,
          sprechenHelps: vv.helps,
          sprechenAufwertungen: result.aufwertungen,
          sprechenMistakeCounts: counts,
          sprechenStrengths: result.strengths,
          sprechenWeaknesses: result.weaknesses,
          sprechenOverallDe: result.overallDe,
          sprechenOverallEn: result.overallEn
        }
      })
      runRecorded.value = true

      // Deliberately non-fatal, same reasoning as Teil2Runner: the Run above
      // is already recorded, so throwing here would re-record it on retry.
      // Aufwertungen are NEVER included — they are not mistakes.
      try {
        await appendCorrections(result.mistakes.map(m => ({
          discussionId: vv.id,
          topicTitle: vv.thema.titleDe,
          modality: vv.modality,
          kind: m.kind,
          quote: m.quote,
          suggested: m.suggested,
          reasonDe: m.reasonDe,
          reasonEn: m.reasonEn,
          context: sentenceAround(m.phase === 'rede' ? vv.rede.textDe : (vv.nachfrage?.answerDe ?? ''), m.spanStart),
          part: 1
        })))
      } catch (err) {
        toast.error('Fehlerarchiv nicht aktualisiert', {
          description: err instanceof Error ? err.message : String(err)
        })
      }
    }

    const stash: Teil1ResultStash = {
      thema: vv.thema,
      modality: vv.modality,
      helps: vv.helps,
      plan: vv.plan,
      rede: vv.rede,
      nachfrage: vv.nachfrage,
      kiTippCount: vv.kiTippCount,
      helpLog: vv.helpLog,
      vortragsmittel: matchRedemittel([vv.rede.textDe, vv.nachfrage?.answerDe ?? ''], SPRECHEN_VORTRAGSMITTEL)
        .map(r => r.id),
      startedAt: vv.startedAt,
      finishedAt,
      result,
      downgradedAt: vv.downgradedAt
    }
    sessionStorage.setItem(VORTRAG_RESULT_KEY, JSON.stringify(stash))
    await deleteVortrag(vv.id)
    router.push({ name: 'sprechen-teil1-result' })
  } catch (err) {
    gradeFailed.value = true
    toast.error('Analyse fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    grading.value = false
  }
}

async function loadBank() {
  if (!v.value) return
  const record = SPRECHEN_VORTRAGSTHEMEN.find(t => t.id === v.value!.thema.id)
  const cached = await loadCachedBank(v.value.thema.id)
  bank.value = resolveArgumentBank({ id: v.value.thema.id, tags: record?.tags ?? [] }, cached ?? undefined).bank
}

onMounted(async () => {
  await loadSettings()
  model.value = settings.value.model

  const raw = sessionStorage.getItem(TEIL1_STASH_KEY)
  if (raw) {
    sessionStorage.removeItem(TEIL1_STASH_KEY)
    try {
      const s = JSON.parse(raw) as Teil1RunStash
      if (s.model) model.value = s.model
      v.value = await createVortrag(s.thema, s.modality, s.helps, s.plan, s.notes)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to start.'
      return
    }
  } else {
    const active = await findActiveVortrag()
    if (!active) {
      error.value = 'Kein Vortrag gefunden. Geh zurück zur Themenwahl.'
      return
    }
    v.value = active
  }

  redeDraft.value = v.value.rede.textDe
  nachfrageAnswer.value = v.value.nachfrage?.answerDe ?? ''
  downgraded.value = !!v.value.downgradedAt
  wall.value = v.value.rede.wallSeconds ?? 0

  // F4 — restore the Nachfrage phase (and its answer, already assigned
  // above) without ever re-billing `generateNachfrage`: a question object
  // means it was already asked, and `submitted` always implies past the Rede
  // phase even when the Nachfrage itself was skipped.
  if (v.value.nachfrage || v.value.status === 'submitted') phase.value = 'nachfrage'

  // F14 — a `submitted` row waits for a deliberate "Analyse starten" click
  // (see `awaitingGradeStart`) instead of auto-firing a paid grade call on
  // every visit; `loadBank()` still runs on this path so the Was tab is
  // populated by the time the learner reaches it.
  if (v.value.status !== 'submitted') {
    armStuckTimer()
    ensureWallClock()
  }
  await loadBank()
})

onUnmounted(() => {
  stopStuckTimer()
  if (saveTimer) clearTimeout(saveTimer)
  if (nachfrageSaveTimer) clearTimeout(nachfrageSaveTimer)
  if (tickTimer) clearInterval(tickTimer)
  stopWallClock()
  persistWallClock()
  flushRecognizerOnTeardown()
  voice.cancel()
})

/** F1 — a dead tab (or an unrelated route change) must not silently drop the
 *  segment the recognizer is mid-way through. `abort()` discards it wholesale;
 *  ending the turn instead flushes any pending finals through the very same
 *  merge `endSpokenSegment` uses, so the worst loss is the still-open interim
 *  guess. Best-effort and fire-and-forget: nothing here can surface an error
 *  once the learner has already navigated away. */
function flushRecognizerOnTeardown() {
  if (recognizer.listening.value && phase.value === 'rede') {
    void recognizer.end().then(result => {
      const vv = v.value
      if (!vv) return
      vv.rede = mergeSegmentResult(vv.rede, result)
      void saveRede(vv.id, vv.rede)
    })
  } else {
    recognizer.abort()
  }
}

function backToSetup() { router.push({ name: 'sprechen-teil1' }) }
</script>

<template>
  <div v-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Hinweis</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="backToSetup">← Zur Themenwahl</button>
  </div>

  <div v-else-if="!v" class="page loading-state"><div class="micro-mark">Loading…</div></div>

  <div v-else class="page vortrag-run">
    <header class="run-head">
      <div>
        <div class="breadcrumb">Sprechen Teil 1 · {{ spoken ? 'gesprochen' : 'getippt' }}</div>
        <h1 class="run-thesis">Vortrag<em>.</em></h1>
      </div>
      <div class="run-meta">
        <span v-if="v.helps.checklist" class="quiz-counter">{{ currentWords }} Wörter · {{ redeState.clock }}</span>
        <button
          v-if="phase === 'rede'" class="btn btn-quiet" type="button"
          :disabled="grading || currentWords === 0" @click="finishRede()"
        >Vortrag beenden</button>
        <button
          v-if="phase === 'rede' || phase === 'nachfrage'" class="btn btn-ghost run-exit" type="button"
          :disabled="grading" @click="confirmAbandon()"
        >Vortrag verwerfen</button>
      </div>
    </header>

    <div class="spr-run">
      <aside class="spr-rail">
        <div class="spr-rail-sec">
          <div class="spr-lbl">Aufgabenblatt · {{ v.thema.titleDe }}</div>
          <p class="spr-rail-stmt">{{ v.thema.taskDe }}</p>
        </div>

        <div v-if="v.helps.checklist" class="spr-rail-sec">
          <div class="spr-lbl">Live-Checkliste</div>
          <div class="spr-steps">
            <div
              v-for="s in signals" :key="s.key" class="spr-step spr-step-btn"
              :class="{ done: s.said, now: s.key === furthest }"
            >
              <span class="spr-step-n">{{ String(s.n).padStart(2, '0') }}</span>
              <span>
                <span class="spr-step-t"><span class="spr-step-dot" :class="{ on: s.said }" />{{ s.labelDe }}</span>
                <span class="spr-step-m">{{ s.keyword || '—' }}<template v-if="s.said"> · gesagt</template></span>
              </span>
            </div>
          </div>
        </div>

        <div v-if="v.helps.checklist" class="spr-rail-sec">
          <div class="spr-lbl">Redezeit · Ziel {{ targetClock }}</div>
          <div class="spr-timebar">
            <span :style="{ width: `${Math.min(100, redeState.pct * 100)}%` }" :class="redeState.band === 'under' ? '' : redeState.band" />
          </div>
          <div class="spr-timebar-l">
            <span class="spr-num">{{ redeState.words }} Wörter</span>
            <span v-if="spoken" class="spr-num">
              Redezeit {{ redeState.clock }}<template v-if="v.rede.firstSpokenAt"> · Gesamt {{ wallClock }}</template>
            </span>
            <span v-else class="spr-num">{{ redeState.clock }}</span>
          </div>
        </div>

        <div class="spr-rail-sec">
          <div class="spr-lbl">Vortragsmittel · {{ usedIds.size }} / {{ SPRECHEN_VORTRAGSMITTEL.length }}</div>
          <div class="spr-used">
            <span
              v-for="r in SPRECHEN_VORTRAGSMITTEL" :key="r.id" class="spr-used-dot"
              :class="{ on: usedIds.has(r.id) }" :title="r.phraseDe"
            />
          </div>
        </div>

        <div v-if="v.notes" class="spr-rail-sec">
          <div class="spr-lbl">Notizen</div>
          <p class="spr-railnotes">{{ v.notes }}</p>
        </div>
      </aside>

      <div class="spr-run-main">
        <div v-if="phase === 'nachfrage'" class="spr-proto">
          <details class="spr-rede-replay">
            <summary>Vortrag anzeigen</summary>
            <div class="spr-turn learner">
              <div class="spr-turn-m">Vortrag</div>
              <div class="spr-turn-b">{{ v.rede.textDe }}</div>
            </div>
          </details>
          <div v-if="nachfrageBusy" class="spr-turn partner">
            <div class="spr-turn-m">Partner</div>
            <div class="spr-turn-b spr-typing">···</div>
          </div>
          <div v-else-if="v.nachfrage" class="spr-turn partner">
            <div class="spr-turn-m">Nachfrage</div>
            <div class="spr-turn-b">{{ v.nachfrage.questionDe }}</div>
          </div>
        </div>

        <div v-if="downgraded" class="alert alert-danger">
          <span class="alert-label">Mikrofon nicht verfügbar</span>
          Das Mikrofon ist ausgefallen oder wurde verweigert. Du tippst den Vortrag ab hier zu Ende — nichts ist
          verloren, die bisher gemessene Redezeit bleibt gültig.
        </div>

        <div v-if="hardLimitNotice" class="alert alert-info">
          <span class="alert-label">Zeit vorbei</span>
          Zeit vorbei — der Vortrag ist beendet. Deine Worte sind gespeichert; jetzt kommt die Nachfrage.
        </div>

        <div v-if="grading" class="alert alert-info">
          <span class="alert-label">Auswertung</span>
          Der Vortrag wird gelesen — Gliederungspunkte geprüft, Fehler markiert, vier Kriterien bewertet. Einen Moment…
        </div>
        <div v-else-if="gradeFailed" class="alert alert-danger">
          <span class="alert-label">Analyse fehlgeschlagen</span>
          Der Vortrag ist gespeichert und kann erneut ausgewertet werden.
          <div class="nf-actions">
            <button class="btn btn-accent" type="button" @click="runGrading">Analyse erneut versuchen</button>
            <button class="btn btn-ghost" type="button" @click="confirmAbandon()">Vortrag verwerfen</button>
          </div>
        </div>

        <template v-else-if="phase === 'rede'">
          <div class="spr-composer">
            <textarea
              v-if="typedSurface" ref="redeEl" v-model="redeDraft"
              placeholder="Halte deinen Vortrag — ganze Sätze, wie in der Prüfung."
              class="rede-textarea"
            />
            <div v-else class="rede-text" :class="{ empty: !v.rede.textDe }">
              {{ v.rede.textDe || 'Sprich deinen Vortrag…' }}<span
                v-if="recognizer.listening.value" class="rede-interim"
              > {{ recognizer.liveText.value }}</span>
            </div>
            <div class="spr-composer-f">
              <span v-if="v.helps.checklist" class="spr-count">{{ currentWords }} Wörter</span>
              <div v-if="!typedSurface" class="mic-row">
                <button
                  class="btn mic-btn" :class="recognizer.listening.value ? 'btn-danger' : 'btn-accent'"
                  type="button" :disabled="ending" @click="toggleMic"
                >{{ recognizer.listening.value ? '■ Pausieren' : (v.rede.textDe ? '● Weitersprechen' : '● Sprechen') }}</button>
                <span class="mic-hint">
                  <template v-if="ending">Wird verarbeitet…</template>
                  <template v-else-if="v.helps.hardLimit">
                    <template v-if="recognizer.listening.value">Knopf pausiert die Aufnahme — die Uhr läuft weiter, wie in der Prüfung.</template>
                    <template v-else>Knopf startet die Aufnahme — die Uhr läuft weiter, wie in der Prüfung.</template>
                  </template>
                  <template v-else-if="recognizer.listening.value">Knopf pausiert — du kannst jederzeit weitersprechen.</template>
                  <template v-else>Knopf startet die Aufnahme.</template>
                </span>
              </div>
            </div>
          </div>

          <div v-if="v.helps.kiTipp && canUseAi" class="ki-standalone">
            <button class="btn btn-quiet" type="button" :disabled="kiBusy" @click="fetchKiTipp">
              {{ kiBusy ? '✦ KI-Tipp…' : '✦ KI-Tipp · 1 Call' }}
            </button>
            <span v-if="kiTippSuggested && !kiTipp" class="ki-suggest">Wirkt festgefahren? Vielleicht hilft ein Tipp.</span>
            <p v-if="kiTipp" class="spr-kitipp">{{ kiTipp }}</p>
          </div>

          <template v-if="v.helps.hints">
            <div v-if="moveNudge" class="spr-nudge">
              <span class="spr-nudge-l">Diesmal</span>
              <span class="spr-nudge-t">{{ VORTRAG_MOVE_LABEL[moveNudge].de.toLowerCase() }}</span>
              <button class="spr-nudge-x" type="button" aria-label="Hinweis ausblenden" @click="nudgeDismissed = true">×</button>
            </div>

            <!-- F17: the Rettungsleine sits ABOVE the drawer — the zero-cost
                 help must never be below the fold while the paid KI-Tipp sits
                 above it. `raised` fires once stuck-detection has (F17). -->
            <p class="lifeline-caption">„Zeit gewinnen ist Prüfungsstoff, keine Ausrede."</p>
            <div class="spr-lifeline" :class="{ raised: lifelineRaised }">
              <span class="spr-lifeline-t">{{ RETTUNGSLEINEN[lifelineIdx] }}</span>
              <button class="btn btn-quiet" type="button" @click="nextLifeline">Nächste</button>
              <button
                v-if="voice.supported && voice.voices.value.length > 0" class="spr-phrase-hear"
                type="button" title="Anhören" @click="speakPhrase(RETTUNGSLEINEN[lifelineIdx])"
              >🔊</button>
            </div>

            <div class="spr-drawer">
              <div class="spr-drawer-h">
                <button class="spr-dtab" :class="{ on: tab === 'wie' }" type="button" @click="selectTab('wie')">
                  Wie<span class="spr-dtab-sub">Vortragsmittel</span>
                </button>
                <button class="spr-dtab" :class="{ on: tab === 'was' }" type="button" @click="selectTab('was')">
                  Was<span class="spr-dtab-sub">Argumente</span>
                </button>
              </div>

              <div class="spr-drawer-b">
                <template v-if="tab === 'wie'">
                  <div class="spr-moverow">
                    <button
                      v-for="m in VORTRAG_MOVES" :key="m" type="button" class="spr-move"
                      :class="{ on: move === m, fit: outlined.includes(m), fresh: freshMoves.has(m) }"
                      @click="selectMove(m)"
                    >{{ VORTRAG_MOVE_LABEL[m].de }}</button>
                  </div>
                  <ul class="spr-phrases">
                    <li v-for="p in drawerPhrases" :key="p.id" class="spr-phrase">
                      <button v-if="typedSurface" class="spr-phrase-t" :class="{ used: p.used }" type="button" @click="insertPhrase(p.phraseDe)">{{ p.phraseDe }}</button>
                      <span v-else class="spr-phrase-t" :class="{ used: p.used }">{{ p.phraseDe }}</span>
                      <button
                        v-if="voice.supported && voice.voices.value.length > 0" class="spr-phrase-hear"
                        type="button" title="Anhören" @click="speakPhrase(p.phraseDe)"
                      >🔊</button>
                      <span class="spr-phrase-en">{{ p.used ? 'schon benutzt' : p.noteEn }}</span>
                    </li>
                  </ul>
                </template>

                <div v-else class="spr-was">
                  <div class="spr-was-h">Dafür</div>
                  <div v-for="(a, i) in bank?.pro ?? []" :key="`p${i}`" class="spr-was-i">
                    <div class="spr-was-c">{{ a.claim }}</div>
                    <p class="spr-was-w">{{ a.why }}</p>
                  </div>
                  <div class="spr-was-h">Dagegen</div>
                  <div v-for="(a, i) in bank?.contra ?? []" :key="`c${i}`" class="spr-was-i">
                    <div class="spr-was-c">{{ a.claim }}</div>
                    <p class="spr-was-w">{{ a.why }}</p>
                  </div>
                </div>
              </div>
            </div>
          </template>
          <div v-else class="alert alert-info exam-note">Prüfungsbedingungen — ohne Hilfsmittel.</div>
        </template>

        <template v-else-if="phase === 'nachfrage'">
          <div v-if="awaitingGradeStart" class="alert alert-info">
            <span class="alert-label">Bereit zur Auswertung</span>
            Dein Vortrag und deine Antwort sind gespeichert.
            <button class="btn btn-accent" type="button" @click="runGrading">Analyse starten</button>
          </div>

          <div v-else-if="nachfrageFailed" class="alert alert-warning">
            <span class="alert-label">Nachfrage fehlgeschlagen</span>
            Dein Vortrag ist gespeichert — nichts geht verloren.
            <div class="nf-actions">
              <button class="btn btn-accent" type="button" @click="requestNachfrage">Nochmal versuchen</button>
              <button v-if="nachfrageAttempts >= 2" class="btn btn-ghost" type="button" @click="skipNachfrage">Ohne Nachfrage abgeben</button>
            </div>
          </div>

          <template v-else-if="v.nachfrage">
            <!-- F18: the nachfrage Move group is by construction the one
                 never practised in the Rede — a short strategy line above
                 the composer, not gated on helps.hints, since it is advice
                 about HOW to answer, not a phrase crutch. -->
            <p class="spr-nachfrage-strategy">
              Nimm die Frage erst in eigenen Worten auf, dann antworte — zwei bis drei Sätze reichen.
            </p>
            <div class="spr-composer">
              <textarea
                v-if="typedSurface" ref="nachfrageEl" v-model="nachfrageAnswer"
                placeholder="Deine Antwort — bedanken, Position halten, kurz begründen."
              />
              <div v-else class="rede-text" :class="{ empty: !nachfrageAnswer }">
                {{ nachfrageAnswer || 'Antworte gesprochen…' }}<span
                  v-if="recognizer.listening.value" class="rede-interim"
                > {{ recognizer.liveText.value }}</span>
              </div>
              <div class="spr-composer-f">
                <span class="spr-count">{{ countWords(nachfrageAnswer) }} Wörter · zwei bis drei Sätze reichen</span>
                <div v-if="!typedSurface" class="mic-row">
                  <button
                    class="btn mic-btn" :class="recognizer.listening.value ? 'btn-danger' : 'btn-accent'"
                    type="button" :disabled="ending" @click="toggleMic"
                  >{{ recognizer.listening.value ? '■ Beenden' : '● Sprechen' }}</button>
                </div>
                <button class="btn btn-accent" type="button" :disabled="!nachfrageAnswer.trim() || sending" @click="submitVortrag">Abgeben →</button>
              </div>
            </div>
          </template>

          <div v-if="v.helps.hints" class="spr-drawer">
            <div class="spr-drawer-h">
              <button class="spr-dtab" :class="{ on: tab === 'wie' }" type="button" @click="selectTab('wie')">
                Wie<span class="spr-dtab-sub">Vortragsmittel</span>
              </button>
              <button class="spr-dtab" :class="{ on: tab === 'was' }" type="button" @click="selectTab('was')">
                Was<span class="spr-dtab-sub">Argumente</span>
              </button>
            </div>
            <div class="spr-drawer-b">
              <template v-if="tab === 'wie'">
                <div class="spr-moverow">
                  <button
                    v-for="m in VORTRAG_MOVES" :key="m" type="button" class="spr-move"
                    :class="{ on: move === m, fresh: freshMoves.has(m) }"
                    @click="selectMove(m)"
                  >{{ VORTRAG_MOVE_LABEL[m].de }}</button>
                </div>
                <ul class="spr-phrases">
                  <li v-for="p in drawerPhrases" :key="p.id" class="spr-phrase">
                    <button v-if="typedSurface" class="spr-phrase-t" :class="{ used: p.used }" type="button" @click="insertPhrase(p.phraseDe)">{{ p.phraseDe }}</button>
                    <span v-else class="spr-phrase-t" :class="{ used: p.used }">{{ p.phraseDe }}</span>
                    <button
                      v-if="voice.supported && voice.voices.value.length > 0" class="spr-phrase-hear"
                      type="button" title="Anhören" @click="speakPhrase(p.phraseDe)"
                    >🔊</button>
                    <span class="spr-phrase-en">{{ p.used ? 'schon benutzt' : p.noteEn }}</span>
                  </li>
                </ul>
              </template>
              <div v-else class="spr-was">
                <div class="spr-was-h">Dafür</div>
                <div v-for="(a, i) in bank?.pro ?? []" :key="`np${i}`" class="spr-was-i">
                  <div class="spr-was-c">{{ a.claim }}</div>
                  <p class="spr-was-w">{{ a.why }}</p>
                </div>
                <div class="spr-was-h">Dagegen</div>
                <div v-for="(a, i) in bank?.contra ?? []" :key="`nc${i}`" class="spr-was-i">
                  <div class="spr-was-c">{{ a.claim }}</div>
                  <p class="spr-was-w">{{ a.why }}</p>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.vortrag-run { max-width: 1080px; }
.run-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 12px; }
.run-thesis { font-family: var(--font-display); font-size: 24px; font-style: italic; line-height: 1.35; margin: 4px 0; }
.run-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex: 0 0 auto; }

/* Live-Checkliste's one dot per row — a component-local twin of the shared
   .spr-used-dot, kept separate so it can never be confused (in markup or in
   a query) with the Vortragsmittel-yield dots in the same rail. */
.spr-step-dot { display: inline-block; width: 8px; height: 8px; border: 1px solid var(--hairline); margin-right: 8px; vertical-align: middle; }
.spr-step-dot.on { background: var(--accent); border-color: var(--accent); }

.rede-textarea { width: 100%; min-height: 280px; background: transparent; border: 0; padding: 16px 18px; font-family: var(--font-body); font-size: 16.5px; line-height: 1.65; color: var(--ink); resize: vertical; }
.rede-textarea:focus { outline: 0; }
.rede-textarea::placeholder { color: var(--mute); font-style: italic; }
.rede-text { min-height: 200px; padding: 16px 18px; font-size: 16.5px; line-height: 1.65; color: var(--ink); white-space: pre-wrap; }
.rede-text.empty { color: var(--mute); font-style: italic; }
.rede-interim { font-style: italic; color: var(--ink-soft); }

.mic-row { display: flex; gap: 14px; align-items: center; margin-left: auto; }
.mic-btn { min-width: 190px; justify-content: center; }
.mic-hint { color: var(--mute); font-size: 13px; font-style: italic; }

.spr-phrase-hear { background: transparent; border: 0; cursor: pointer; font-size: 13px; padding: 0 4px; color: var(--ink-soft); }
.spr-phrase-hear:hover { color: var(--accent); }

.ki-standalone { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-top: 16px; }
.ki-suggest { font-size: 13px; font-style: italic; color: var(--ochre); }

.lifeline-caption { font-size: 12.5px; font-style: italic; color: var(--mute); margin: 20px 0 0; }

/* F17 — visually raised once stuck-detection fires: the ochre rail thickens
   and picks up the same accent wash a learner turn already uses elsewhere,
   no new tokens. */
.spr-lifeline.raised { border-left-color: var(--accent); background: var(--accent-wash); }

/* F18 — the Rede replay collapses behind a native <details>; the marker is
   hidden in favour of the italic "Vortrag anzeigen" summary text itself. */
.spr-rede-replay { border-top: 1px solid var(--rule); }
.spr-rede-replay summary { cursor: pointer; font-size: 12.5px; font-style: italic; color: var(--mute); padding: 10px 0; list-style: none; }
.spr-rede-replay summary::-webkit-details-marker { display: none; }
.spr-rede-replay[open] summary { color: var(--ink-soft); }

.spr-nachfrage-strategy { font-size: 13px; font-style: italic; color: var(--mute); margin: 4px 0 12px; }

.exam-note { margin-top: 12px; }

.nf-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }

@media (max-width: 860px) {
  .run-head { flex-direction: column; }
}
</style>
