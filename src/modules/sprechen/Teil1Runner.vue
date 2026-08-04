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
//
// The grade pipeline mirrors Teil2Runner's runGrading() exactly: a
// `runRecorded` guard wraps the one-time writes (Redemittel yield, archived
// corrections, the Run) so a retry after a later failure re-grades but never
// double-records; the result stash write, deleteVortrag and the navigate
// happen every successful call, same as Teil2 (a retry must still be able to
// leave the screen). Aufwertungen are read into the stash and the meta, but
// NEVER into appendCorrections — they are not mistakes.

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  TEIL1_STASH_KEY, sentenceAround,
  type HelpKind, type SprechenVortrag, type Teil1RunStash
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
  createVortrag, deleteVortrag, findActiveVortrag, incrementVortragKiTipp, logHelp,
  markVortragSubmitted, saveNachfrage, saveRede
} from '../../composables/useVortrag'
import { furthestReachedPunkt, outlinedMoves, planSignals } from '../../composables/useVortragCoverage'
import { hardLimitReached, redezeit } from '../../composables/useVortragTimer'
import { generateNachfrage, generateVortragKiTipp } from '../../composables/useVortragPartner'
import { gradeVortrag, VORTRAG_RESULT_KEY, type Teil1ResultStash } from '../../composables/useVortragGrader'
import { countWords, useSpeechRecognizer } from '../../composables/useSpeechRecognizer'
import { useSpeechVoice } from '../../composables/useSpeechVoice'
import { appendCorrections } from '../../composables/useSprechenArchive'
import { saveQuizRun, type SprechenErrorTag } from '../../composables/useQuizHistory'
import { resolveAiClient } from '../../composables/localClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const toast = useToast()
const { settings, canUseAi, load: loadSettings } = useSettings()
const recognizer = useSpeechRecognizer('de-DE')
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

const tickNow = ref(0)
let tickTimer: ReturnType<typeof setInterval> | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
let stuckTimer: ReturnType<typeof setTimeout> | null = null
let segmentStartAt = 0

const targetClock = vortragClock(VORTRAG_TARGET_WORDS)
// Lifetime Vortragsmittel usage, read ONCE at mount — like Teil2Runner's own
// `lifetime` const, the ·neu marking must not flicker off as the learner uses
// phrases during THIS run.
const lifetime = lifetimeCounts(SPRECHEN_VORTRAGSMITTEL)

const spoken = computed(() => v.value?.modality === 'spoken')

/** The authoritative Rede text for matching/coverage — committed text only.
 *  A spoken segment's still-open interim never lights a checklist dot or a
 *  Vortragsmittel dot; only what actually got committed does. */
const liveRedeText = computed(() => spoken.value ? (v.value?.rede.textDe ?? '') : redeDraft.value)

const liveSpokenSeconds = computed(() => {
  if (!v.value) return 0
  void tickNow.value
  const base = v.value.rede.seconds ?? 0
  if (!recognizer.listening.value) return base
  return base + Math.max(0, (Date.now() - segmentStartAt) / 1000)
})

const currentWords = computed(() => {
  if (!v.value) return 0
  if (!spoken.value) return countWords(redeDraft.value)
  void tickNow.value
  const live = recognizer.listening.value ? countWords(recognizer.liveText.value) : 0
  return countWords(v.value.rede.textDe) + live
})

const redeState = computed(() => redezeit({
  words: currentWords.value,
  seconds: spoken.value ? liveSpokenSeconds.value : undefined,
  modality: v.value?.modality ?? 'typed'
}))

const signals = computed(() => v.value ? planSignals(v.value.plan, liveRedeText.value) : [])
const furthest = computed(() => furthestReachedPunkt(signals.value))
const outlined = computed(() => outlinedMoves(furthest.value))

const usedIds = computed(() =>
  new Set(matchRedemittel([liveRedeText.value, nachfrageAnswer.value], SPRECHEN_VORTRAGSMITTEL).map(r => r.id))
)

const moveNudge = computed(() => {
  if (!v.value?.helps.hints) return null
  if (phase.value !== 'rede') return null
  if (nudgeDismissed.value) return null
  if (currentWords.value < 40) return null
  return pickMoveNudge([liveRedeText.value], lifetime, SPRECHEN_VORTRAGSMITTEL, VORTRAG_MOVES)
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

watch(phase, p => { if (p === 'nachfrage') move.value = 'nachfrage' })

watch(() => recognizer.listening.value, listening => {
  if (listening) {
    if (!tickTimer) tickTimer = setInterval(() => { tickNow.value = Date.now(); checkHardLimit() }, 400)
  } else if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
})

watch(() => recognizer.error.value, err => {
  if (err?.kind === 'denied') downgradeToTyped()
})

watch(redeDraft, val => {
  if (!v.value || spoken.value) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (!v.value) return
    v.value.rede = { ...v.value.rede, textDe: val }
    void saveRede(v.value.id, v.value.rede)
  }, 1000)
  armStuckTimer()
})

function armStuckTimer() {
  if (!v.value?.helps.hints) return
  if (spoken.value || phase.value !== 'rede') return
  if (stuckTimer) clearTimeout(stuckTimer)
  stuckTimer = setTimeout(() => triggerStuck(), 20000)
}

function stopStuckTimer() {
  if (stuckTimer) { clearTimeout(stuckTimer); stuckTimer = null }
}

/**
 * Stuck-Erkennung. Never spends a call by itself — it raises the
 * Rettungsleine (already visible whenever helps.hints is on) and, once per
 * run, offers the KI-Tipp by highlighting the button. The learner spends it.
 */
function triggerStuck() {
  if (!v.value?.helps.hints) return
  logHelpAsync('rettungsleine')
  if (v.value.helps.kiTipp && !kiOfferedOnce.value) {
    kiOfferedOnce.value = true
    kiTippSuggested.value = true
  }
  armStuckTimer()
}

function checkHardLimit() {
  if (!v.value || phase.value !== 'rede') return
  if (v.value.modality !== 'spoken' || !v.value.helps.hardLimit) return
  if (hardLimitHandled.value) return
  const elapsed = recognizer.listening.value ? (Date.now() - segmentStartAt) / 1000 : 0
  const seconds = (v.value.rede.seconds ?? 0) + elapsed
  if (hardLimitReached({ seconds, modality: 'spoken', hardLimit: true })) {
    hardLimitHandled.value = true
    void handleHardLimit()
  }
}

/** Commit the text first (recognizer.end() flushes pending finals before it
 *  actually stops), THEN treat the Rede as over. Never costs a half-said
 *  sentence. */
async function handleHardLimit() {
  hardLimitNotice.value = true
  await finishRede()
}

function downgradeToTyped() {
  if (!v.value || v.value.modality !== 'spoken') return
  v.value.modality = 'typed'
  redeDraft.value = v.value.rede.textDe
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

function selectTab(t: 'wie' | 'was') {
  tab.value = t
  logHelpAsync('drawer')
}

function insertPhrase(phraseDe: string) {
  if (spoken.value) return
  const stub = phraseDe.split('…')[0].trim()
  if (phase.value === 'nachfrage') {
    const el = nachfrageEl.value
    const cur = nachfrageAnswer.value
    if (!el) { nachfrageAnswer.value = cur ? `${cur} ${stub}` : stub } else {
      const at = el.selectionStart ?? cur.length
      nachfrageAnswer.value = `${cur.slice(0, at)}${stub}${cur.slice(at)}`
      requestAnimationFrame(() => { el.focus(); const pos = at + stub.length; el.setSelectionRange(pos, pos) })
    }
  } else {
    const el = redeEl.value
    const cur = redeDraft.value
    if (!el) { redeDraft.value = cur ? `${cur} ${stub}` : stub } else {
      const at = el.selectionStart ?? cur.length
      redeDraft.value = `${cur.slice(0, at)}${stub}${cur.slice(at)}`
      requestAnimationFrame(() => { el.focus(); const pos = at + stub.length; el.setSelectionRange(pos, pos) })
    }
  }
  logHelpAsync('phrase')
}

function speakPhrase(text: string) {
  void voice.speak(text)
  logHelpAsync('vorsprechen')
}

function nextLifeline() {
  lifelineIdx.value = (lifelineIdx.value + 1) % RETTUNGSLEINEN.length
  logHelpAsync('rettungsleine')
}

async function fetchKiTipp() {
  if (!v.value || kiBusy.value) return
  kiBusy.value = true
  try {
    const client = resolveAiClient(settings.value)
    const tip = await generateVortragKiTipp(client, model.value, v.value)
    kiTipp.value = tip
    await incrementVortragKiTipp(v.value.id)
    v.value.kiTippCount += 1
    kiTippSuggested.value = false
    logHelpAsync('kitipp')
  } catch (err) {
    toast.error('KI-Tipp fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    kiBusy.value = false
  }
}

/** Toggles the mic for whichever phase currently owns the composer. */
async function toggleMic() {
  if (ending.value) return
  if (recognizer.listening.value) {
    if (phase.value === 'rede') await endSpokenSegment()
    else await endNachfrageSegment()
  } else {
    segmentStartAt = Date.now()
    recognizer.start()
  }
}

/** One held-floor stretch of the Rede — appended to what came before,
 *  seconds/restarts/spans accumulated, saved to Dexie immediately. */
async function endSpokenSegment(): Promise<void> {
  const vv = v.value
  if (!vv || ending.value) return
  ending.value = true
  try {
    const result = await recognizer.end()
    const text = result.text.trim()
    const addedSeconds = Math.max(0, (result.endedAt - result.startedAt) / 1000)
    vv.rede = {
      textDe: text.length > 0 ? (vv.rede.textDe ? `${vv.rede.textDe} ${text}` : text) : vv.rede.textDe,
      seconds: (vv.rede.seconds ?? 0) + addedSeconds,
      restarts: (vv.rede.restarts ?? 0) + result.restarts,
      spans: [...(vv.rede.spans ?? []), ...result.spans]
    }
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
  if (!spoken.value) {
    v.value.rede = { ...v.value.rede, textDe: redeDraft.value }
  }
  await saveRede(v.value.id, v.value.rede)
}

/** 'Vortrag beenden' (or the hard limit): commit, move to the Nachfrage. */
async function finishRede() {
  if (!v.value || phase.value !== 'rede') return
  stopStuckTimer()
  if (spoken.value && recognizer.listening.value) await endSpokenSegment()
  await commitRede()
  phase.value = 'nachfrage'
  await requestNachfrage()
}

async function requestNachfrage() {
  if (!v.value) return
  nachfrageBusy.value = true
  nachfrageFailed.value = false
  try {
    const client = resolveAiClient(settings.value)
    const question = await generateNachfrage(client, model.value, v.value)
    v.value.nachfrage = { questionDe: question, answerDe: '' }
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
      result
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

  if (v.value.status === 'submitted') {
    phase.value = 'nachfrage'
    await runGrading()
    return
  }

  armStuckTimer()
  await loadBank()
})

onUnmounted(() => {
  stopStuckTimer()
  if (saveTimer) clearTimeout(saveTimer)
  if (tickTimer) clearInterval(tickTimer)
  recognizer.abort()
  voice.cancel()
})

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
        <span class="quiz-counter">{{ currentWords }} Wörter · {{ redeState.clock }}</span>
        <button
          v-if="phase === 'rede'" class="btn btn-quiet" type="button"
          :disabled="grading || currentWords === 0" @click="finishRede"
        >Vortrag beenden</button>
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
            <button
              v-for="s in signals" :key="s.key" type="button" class="spr-step spr-step-btn"
              :class="{ done: s.said, now: s.key === furthest }"
            >
              <span class="spr-step-n">{{ String(s.n).padStart(2, '0') }}</span>
              <span>
                <span class="spr-step-t"><span class="spr-step-dot" :class="{ on: s.said }" />{{ s.labelDe }}</span>
                <span class="spr-step-m">{{ s.keyword || '—' }}<template v-if="s.said"> · gesagt</template></span>
              </span>
            </button>
          </div>
        </div>

        <div v-if="v.helps.checklist" class="spr-rail-sec">
          <div class="spr-lbl">Redezeit · Ziel {{ targetClock }}</div>
          <div class="spr-timebar">
            <span :style="{ width: `${Math.min(100, redeState.pct * 100)}%` }" :class="redeState.band === 'under' ? '' : redeState.band" />
          </div>
          <div class="spr-timebar-l">
            <span class="spr-num">{{ redeState.words }} Wörter</span>
            <span class="spr-num">{{ redeState.clock }}</span>
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
          <div class="spr-turn learner">
            <div class="spr-turn-m">Vortrag</div>
            <div class="spr-turn-b">{{ v.rede.textDe }}</div>
          </div>
          <div v-if="nachfrageBusy" class="spr-turn partner">
            <div class="spr-turn-m">Partner</div>
            <div class="spr-turn-b spr-typing">···</div>
          </div>
          <div v-else-if="v.nachfrage" class="spr-turn partner">
            <div class="spr-turn-m">Nachfrage</div>
            <div class="spr-turn-b">{{ v.nachfrage.questionDe }}</div>
          </div>
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
          <button class="btn btn-accent" type="button" @click="runGrading">Analyse erneut versuchen</button>
        </div>

        <template v-else-if="phase === 'rede'">
          <div class="spr-composer">
            <textarea
              v-if="!spoken" ref="redeEl" v-model="redeDraft"
              placeholder="Halte deinen Vortrag — ganze Sätze, wie in der Prüfung."
              class="rede-textarea"
            />
            <div v-else class="rede-text" :class="{ empty: !v.rede.textDe }">
              {{ v.rede.textDe || 'Sprich deinen Vortrag…' }}<span
                v-if="recognizer.listening.value" class="rede-interim"
              > {{ recognizer.liveText.value }}</span>
            </div>
            <div class="spr-composer-f">
              <span class="spr-count">{{ currentWords }} Wörter</span>
              <div v-if="spoken" class="mic-row">
                <button
                  class="btn mic-btn" :class="recognizer.listening.value ? 'btn-danger' : 'btn-accent'"
                  type="button" :disabled="ending" @click="toggleMic"
                >{{ recognizer.listening.value ? '■ Pausieren' : (v.rede.textDe ? '● Weitersprechen' : '● Sprechen') }}</button>
                <span class="mic-hint">
                  <template v-if="ending">Wird verarbeitet…</template>
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
                      @click="move = m"
                    >{{ VORTRAG_MOVE_LABEL[m].de }}</button>
                  </div>
                  <ul class="spr-phrases">
                    <li v-for="p in drawerPhrases" :key="p.id" class="spr-phrase">
                      <button v-if="!spoken" class="spr-phrase-t" :class="{ used: p.used }" type="button" @click="insertPhrase(p.phraseDe)">{{ p.phraseDe }}</button>
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

            <p class="lifeline-caption">„Zeit gewinnen ist Prüfungsstoff, keine Ausrede."</p>
            <div class="spr-lifeline">
              <span class="spr-lifeline-t">{{ RETTUNGSLEINEN[lifelineIdx] }}</span>
              <button class="btn btn-quiet" type="button" @click="nextLifeline">Nächste</button>
            </div>
          </template>
        </template>

        <template v-else-if="phase === 'nachfrage'">
          <div v-if="nachfrageFailed" class="alert alert-warning">
            <span class="alert-label">Nachfrage fehlgeschlagen</span>
            Dein Vortrag ist gespeichert — nichts geht verloren.
            <div class="nf-actions">
              <button class="btn btn-accent" type="button" @click="requestNachfrage">Nochmal versuchen</button>
              <button v-if="nachfrageAttempts >= 2" class="btn btn-ghost" type="button" @click="skipNachfrage">Ohne Nachfrage abgeben</button>
            </div>
          </div>

          <div v-else-if="v.nachfrage" class="spr-composer">
            <textarea
              v-if="!spoken" ref="nachfrageEl" v-model="nachfrageAnswer"
              placeholder="Deine Antwort — bedanken, Position halten, kurz begründen."
            />
            <div v-else class="rede-text" :class="{ empty: !nachfrageAnswer }">
              {{ nachfrageAnswer || 'Antworte gesprochen…' }}<span
                v-if="recognizer.listening.value" class="rede-interim"
              > {{ recognizer.liveText.value }}</span>
            </div>
            <div class="spr-composer-f">
              <span class="spr-count">{{ countWords(nachfrageAnswer) }} Wörter · zwei bis drei Sätze reichen</span>
              <div v-if="spoken" class="mic-row">
                <button
                  class="btn mic-btn" :class="recognizer.listening.value ? 'btn-danger' : 'btn-accent'"
                  type="button" :disabled="ending" @click="toggleMic"
                >{{ recognizer.listening.value ? '■ Beenden' : '● Sprechen' }}</button>
              </div>
              <button class="btn btn-accent" type="button" :disabled="!nachfrageAnswer.trim() || sending" @click="submitVortrag">Abgeben →</button>
            </div>
          </div>

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
                    @click="move = m"
                  >{{ VORTRAG_MOVE_LABEL[m].de }}</button>
                </div>
                <ul class="spr-phrases">
                  <li v-for="p in drawerPhrases" :key="p.id" class="spr-phrase">
                    <button v-if="!spoken" class="spr-phrase-t" :class="{ used: p.used }" type="button" @click="insertPhrase(p.phraseDe)">{{ p.phraseDe }}</button>
                    <span v-else class="spr-phrase-t" :class="{ used: p.used }">{{ p.phraseDe }}</span>
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

.nf-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }

@media (max-width: 860px) {
  .run-head { flex-direction: column; }
}
</style>
