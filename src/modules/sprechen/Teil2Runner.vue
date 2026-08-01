<script setup lang="ts">
//
// Sprechen Teil 2 — Diskussion. ONE runner for both Modalities (CONTEXT.md →
// "Modality"): rail, protocol transcript, drawer, KI-Tipp, progress meter,
// end-early, grading, archive write, result stash and routing are all shared.
// The only thing that switches on `discussion.modality` is the composer at
// the bottom — a textarea+send for `typed`, a mic button for `spoken` — and
// the few behaviours that only make sense for spoken delivery (partner TTS,
// live interim text, fluency capture, "Partner wiederholen").
//
// Turn shape (spoken): the partner's reply is spoken aloud, and ONLY when the
// utterance has finished (plus the TTS tail delay) does the microphone
// unlock. Opening it earlier makes the recognizer transcribe the partner into
// the learner's own answer. Barge-in is impossible on the free browser APIs,
// so the flow stays strictly turn-based — which is what computePhase()
// already assumes.
//
// Space starts the turn; Space again ends AND sends it. There is no edit
// step: what the recognizer heard is what was said. Per-span confidence is
// recorded anyway, so the result page can show where the recognizer was
// unsure. Space is bound ONLY while the Discussion is spoken — see onKey().

import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  TEIL2_STASH_KEY, learnerTurnCount, sentenceAround, summarizeFluency,
  type SprechenDiscussion, type Teil2RunStash
} from '../../data/sprechen'
import {
  HINT_MOVES, MOVE_LABEL, phrasesForMove, SPRECHEN_REDEMITTEL, type Move
} from '../../data/sprechenRedemittel'
import { matchRedemittel, movePerTurn } from '../../composables/useRedemittelMatch'
import { resolveArgumentBank, type ArgumentBank } from '../../data/sprechenArguments'
import { loadCachedBank } from '../../composables/useSprechenArguments'
import { SPRECHEN_TOPICS } from '../../data/sprechenTopics'
import {
  appendTurn, createDiscussion, deleteDiscussion, findActiveDiscussion,
  incrementKiTipp, markSubmitted
} from '../../composables/useSprechenDiscussion'
import { computePhase, generateKiTipp, generatePartnerTurn } from '../../composables/useSprechenPartner'
import {
  SPRECHEN_RESULT_KEY, gradeDiscussion, type SprechenResultStash
} from '../../composables/useSprechenGrader'
import { useSpeechRecognizer, countWords } from '../../composables/useSpeechRecognizer'
import { useSpeechVoice } from '../../composables/useSpeechVoice'
import { appendCorrections } from '../../composables/useSprechenArchive'
import { saveQuizRun, type SprechenErrorTag } from '../../composables/useQuizHistory'
import { resolveAiClient } from '../../composables/localClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const toast = useToast()
const { settings, load: loadSettings } = useSettings()
const recognizer = useSpeechRecognizer('de-DE')
const voice = useSpeechVoice()

const discussion = ref<SprechenDiscussion | null>(null)
const bank = ref<ArgumentBank | null>(null)
const notes = ref('')
const hintsOn = ref(true)
const input = ref('')            // typed composer only
const tab = ref<'was' | 'wie' | null>('was')
const move = ref<Move>('partial')
const kiTipp = ref<string | null>(null)
const kiBusy = ref(false)
const partnerBusy = ref(false)
const partnerFailed = ref(false)
const grading = ref(false)
const gradeFailed = ref(false)
const sending = ref(false)       // typed composer's send-in-flight guard
const error = ref<string | null>(null)
const model = ref('')
/** True from the start of endTurn() until the flushed turn is appended — gates
 *  a re-entrant Space/click from restarting the recognizer under an in-flight
 *  end() and wiping the buffer it is about to resolve from. */
const ending = ref(false)
/** True once saveQuizRun() has recorded the Run. A retry after runGrading()
 *  throws later (sessionStorage/deleteDiscussion) must re-grade but must NOT
 *  write a second Run or a second archive batch. Modality-agnostic: this used
 *  to guard the spoken path only — the typed path had no such guard — and
 *  now protects both. */
const runRecorded = ref(false)

/** When the partner stopped speaking — the clock that reaction time runs from.
 *  Only meaningful in a spoken Discussion. */
let partnerDoneAt = 0

const learnerCount = computed(() => discussion.value ? learnerTurnCount(discussion.value) : 0)
const target = computed(() => discussion.value?.turnTarget ?? 6)
const spoken = computed(() => discussion.value?.modality === 'spoken')

const mySide = computed<'pro' | 'contra'>(() =>
  discussion.value?.stance === 'pro' ? 'contra' : 'pro'
)

const myTurn = computed(() => {
  const d = discussion.value
  if (!d || partnerBusy.value || grading.value) return false
  // voice.speaking only ever becomes true in a spoken Discussion, but the
  // check is scoped explicitly anyway so typed's myTurn never depends on it.
  if (d.modality === 'spoken' && voice.speaking.value) return false
  if (d.status !== 'in_progress') return false
  if (d.turns.length === 0) return false
  return d.turns[d.turns.length - 1].role === 'partner'
})

const mine = computed(() => {
  if (!bank.value) return []
  return mySide.value === 'pro' ? bank.value.pro : bank.value.contra
})

/** Every learner turn's own text — the rail's raw material for the Redemittel
 *  yield and the per-turn Move labels. Spoken or typed, a turn is just text
 *  once it lands on the Discussion (see DiscussionTurn). */
const learnerTexts = computed(
  () => (discussion.value?.turns ?? []).filter(t => t.role === 'learner').map(t => t.textDe)
)

/** Live yield for the rail's 42-dot grid. */
const usedIds = computed(() => new Set(matchRedemittel(learnerTexts.value).map(r => r.id)))

/** L1–Ln stepper: one entry per planned turn, labelled with the Move it used. */
const steps = computed(() => {
  const moves = movePerTurn(learnerTexts.value)
  return Array.from({ length: target.value }, (_, i) => {
    const done = i < learnerCount.value
    return {
      n: `L${i + 1}`,
      done,
      now: i === learnerCount.value,
      // A completed turn that matched no Redemittel shows an em dash, never a blank.
      label: done ? (moves[i] ? MOVE_LABEL[moves[i]!].de : '—') : ''
    }
  })
})

/** Spoken Modality only — the one measure typed runs cannot produce. */
const liveWpm = computed(() => {
  const spokenTurns = (discussion.value?.turns ?? []).filter(t => t.role === 'learner' && t.speech)
  if (spokenTurns.length === 0) return null
  const words = spokenTurns.reduce((s, t) => s + (t.speech?.words ?? 0), 0)
  const ms = spokenTurns.reduce((s, t) => s + (t.speech?.spokenMs ?? 0), 0)
  if (ms <= 0) return null
  return Math.round(words / (ms / 60000))
})

/** The composer's B2-length warning applies to both Modalities. Spoken has no
 *  textarea to count, so this reuses the SAME countWords() the recognizer's
 *  own TurnSpeech.words already relies on (see endTurn()) — no second counter. */
const wordCount = computed(() => spoken.value ? countWords(recognizer.liveText.value) : countWords(input.value))

/** Mirrors send()'s own guard — only for disabling the button. send() still
 *  re-checks every one of these conditions synchronously before it does anything. */
const canSend = computed(() => myTurn.value && !sending.value && input.value.trim().length > 0)

const composerPlaceholder = computed(() => myTurn.value
  ? 'Dein Beitrag auf Deutsch… (Enter senden, Shift+Enter neue Zeile)'
  : 'Der Partner ist am Zug…'
)

function sideDe(side: 'pro' | 'contra') { return side === 'pro' ? 'dafür' : 'dagegen' }

onMounted(async () => {
  await loadSettings()
  model.value = settings.value.model

  const raw = sessionStorage.getItem(TEIL2_STASH_KEY)
  if (raw) {
    sessionStorage.removeItem(TEIL2_STASH_KEY)
    try {
      const s = JSON.parse(raw) as Teil2RunStash
      notes.value = s.notes ?? ''
      hintsOn.value = s.hintsOn
      if (s.model) model.value = s.model
      discussion.value = await createDiscussion(s.topic, s.turnTarget, s.stance, s.modality, s.notes)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to start.'
      return
    }
  } else {
    // One runner serves both Modalities, so resuming must accept whatever the
    // stored row says — no modality filter here.
    const active = await findActiveDiscussion()
    if (!active) {
      error.value = 'No discussion found. Go back to setup and start one.'
      return
    }
    discussion.value = active
    notes.value = active.notes ?? ''
  }

  // Space is only ever meaningful in a spoken Discussion — bound here, torn
  // down in onUnmounted. Modality is fixed at creation, so this never needs
  // to react to a later change.
  if (discussion.value.modality === 'spoken') {
    window.addEventListener('keydown', onKey)
  }

  await loadBank()

  if (discussion.value.status === 'submitted') {
    await runGrading()
    return
  }
  await ensurePartnerTurn()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  recognizer.abort()
  voice.cancel()
})

async function loadBank() {
  const d = discussion.value
  if (!d) return
  const record = SPRECHEN_TOPICS.find(t => t.id === d.topic.id)
  const cached = await loadCachedBank(d.topic.id)
  bank.value = resolveArgumentBank(
    { id: d.topic.id, tags: record?.tags ?? [] },
    cached ?? undefined
  ).bank
}

/** Space toggles the floor — but ONLY in a spoken Discussion, never while
 *  typing in a field, and never on a key-repeat (holding Space down fires
 *  repeated keydowns; only the first should act, or a held key re-enters
 *  toggleMic() while end() is in flight). */
function onKey(e: KeyboardEvent) {
  if (!spoken.value) return
  if (e.code !== 'Space') return
  if (e.repeat) return
  const el = e.target as HTMLElement | null
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
  if (!myTurn.value && !recognizer.listening.value) return
  e.preventDefault()
  void toggleMic()
}

async function toggleMic() {
  if (ending.value) return
  if (recognizer.listening.value) {
    await endTurn()
  } else if (myTurn.value) {
    recognizer.start()
  }
}

/** Fires the pending partner call, speaks it (spoken only), then hands the floor back. */
async function ensurePartnerTurn() {
  const d = discussion.value
  if (!d || partnerBusy.value || d.status !== 'in_progress') return
  const last = d.turns[d.turns.length - 1]
  if (d.turns.length > 0 && last.role === 'partner') return
  const phase = computePhase(d)
  partnerBusy.value = true
  partnerFailed.value = false
  try {
    const reply = await generatePartnerTurn(resolveAiClient(settings.value), model.value, d, phase)
    const turn = { role: 'partner' as const, textDe: reply, at: Date.now() }
    await appendTurn(d.id, turn)
    d.turns = [...d.turns, turn]
    scrollToEnd()
    if (d.modality === 'spoken') {
      partnerBusy.value = false
      await voice.speak(reply)
      partnerDoneAt = Date.now()
    }
    if (phase === 'closing') await finish()
  } catch (err) {
    partnerFailed.value = true
    toast.error('Partner antwortet nicht', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    partnerBusy.value = false
  }
}

/** Spoken composer: Space (or the mic button) ends the turn and flushes the recognizer. */
async function endTurn() {
  const d = discussion.value
  if (!d) return
  ending.value = true
  try {
    const result = await recognizer.end()
    const text = result.text.trim()
    if (text.length === 0) {
      toast.error('Nichts verstanden', { description: 'Nochmal — Leertaste startet die Aufnahme.' })
      return
    }
    const turn = {
      role: 'learner' as const,
      textDe: text,
      at: result.endedAt,
      speech: {
        spokenMs: Math.max(0, result.endedAt - result.startedAt),
        reactionMs: partnerDoneAt > 0 ? Math.max(0, result.startedAt - partnerDoneAt) : 0,
        restarts: result.restarts,
        words: countWords(text)
      },
      spans: result.spans
    }
    await appendTurn(d.id, turn)
    d.turns = [...d.turns, turn]
    kiTipp.value = null
    scrollToEnd()
    await ensurePartnerTurn()
  } finally {
    ending.value = false
  }
}

/** Typed composer: Enter (or the Senden button) sends. Shift+Enter is a newline. */
async function send() {
  const d = discussion.value
  const text = input.value.trim()
  if (!d || !myTurn.value || sending.value || text.length === 0) return
  sending.value = true
  try {
    const turn = { role: 'learner' as const, textDe: text, at: Date.now() }
    await appendTurn(d.id, turn)
    d.turns = [...d.turns, turn]
    input.value = ''
    kiTipp.value = null
    scrollToEnd()
  } finally {
    sending.value = false
  }
  await ensurePartnerTurn()
}

async function endEarly() {
  const d = discussion.value
  if (!d || grading.value) return
  const warn = learnerCount.value < 3
    ? 'Mit weniger als 3 Beiträgen ist die Bewertung wenig aussagekräftig. Trotzdem beenden?'
    : 'Diskussion beenden und auswerten?'
  if (!window.confirm(warn)) return
  recognizer.abort()
  voice.cancel()
  await finish()
}

async function finish() {
  const d = discussion.value
  if (!d) return
  if (d.status === 'in_progress') {
    await markSubmitted(d.id)
    d.status = 'submitted'
    d.endedAt = Date.now()
  }
  await runGrading()
}

async function runGrading() {
  const d = discussion.value
  if (!d || grading.value) return
  grading.value = true
  gradeFailed.value = false
  try {
    const result = await gradeDiscussion(resolveAiClient(settings.value), model.value, d)
    const finishedAt = d.endedAt ?? Date.now()
    const fluency = summarizeFluency(d.turns)

    // A retry (gradeFailed → "Analyse erneut versuchen") re-grades from scratch
    // — that just costs another AI call — but must NOT record a second Run or
    // archive batch: saveQuizRun cannot throw (safeWrite swallows), so once it
    // has run, runRecorded latches and both writes below are skipped on retry.
    if (!runRecorded.value) {
      const counts: Partial<Record<SprechenErrorTag, number>> = {}
      for (const m of result.mistakes) counts[m.kind] = (counts[m.kind] ?? 0) + 1

      saveQuizRun({
        type: 'sprechen-teil2',
        startedAt: new Date(d.startedAt).toISOString(),
        finishedAt: new Date(finishedAt).toISOString(),
        durationMs: finishedAt - d.startedAt,
        count: 100,
        correct: result.totalScore,
        meta: {
          topicTitle: d.topic.titleDe,
          turnTarget: d.turnTarget,
          learnerTurns: learnerTurnCount(d),
          sprechenModality: d.modality,
          sprechenScore: result.totalScore,
          sprechenPraedikat: result.praedikat,
          sprechenCriteria: result.criteria.map(c => ({ key: c.key, score: c.score, maxPoints: c.maxPoints })),
          sprechenMistakeCounts: counts,
          kiTippCount: d.kiTippCount,
          sprechenStrengths: result.strengths,
          sprechenWeaknesses: result.weaknesses,
          sprechenOverallDe: result.overallDe,
          sprechenOverallEn: result.overallEn,
          sprechenWpm: fluency?.wordsPerMinute,
          sprechenAvgReactionMs: fluency?.avgReactionMs,
          sprechenSpokenMs: fluency?.totalSpokenMs,
          sprechenPauses: fluency?.pauses,
          passes: result.passes
        }
      })
      runRecorded.value = true

      // Corrections outlive the conversation (ADR-0012). Archived unfiltered:
      // a mistake the recognizer invented is archived like any other.
      //
      // Deliberately non-fatal: the Run above is already recorded, so throwing
      // here would drop us into the retry path and record it a SECOND time. A
      // lost archive write costs the learner some drill material; a double Run
      // corrupts their history.
      try {
        const learnerTurns = d.turns.filter(t => t.role === 'learner')
        await appendCorrections(result.mistakes.map(m => ({
          discussionId: d.id,
          topicTitle: d.topic.titleDe,
          modality: d.modality,
          kind: m.kind,
          quote: m.quote,
          suggested: m.suggested,
          reasonDe: m.reasonDe,
          reasonEn: m.reasonEn,
          context: sentenceAround(learnerTurns[m.turnIndex]?.textDe ?? '', m.spanStart)
        })))
      } catch (err) {
        toast.error('Fehlerarchiv nicht aktualisiert', {
          description: err instanceof Error ? err.message : String(err)
        })
      }
    }

    const stash: SprechenResultStash = {
      topic: d.topic,
      stance: d.stance,
      turnTarget: d.turnTarget,
      turns: d.turns,
      kiTippCount: d.kiTippCount,
      startedAt: d.startedAt,
      finishedAt,
      result
    }
    sessionStorage.setItem(SPRECHEN_RESULT_KEY, JSON.stringify(stash))
    await deleteDiscussion(d.id)
    router.push({ name: 'sprechen-teil2-result' })
  } catch (err) {
    gradeFailed.value = true
    toast.error('Analyse fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    grading.value = false
  }
}

async function fetchKiTipp() {
  const d = discussion.value
  if (!d || kiBusy.value) return
  kiBusy.value = true
  try {
    kiTipp.value = await generateKiTipp(resolveAiClient(settings.value), model.value, d)
    await incrementKiTipp(d.id)
    d.kiTippCount += 1
  } catch (err) {
    toast.error('KI-Tipp fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    kiBusy.value = false
  }
}

function repeatPartner() {
  const d = discussion.value
  if (!d) return
  const last = [...d.turns].reverse().find(t => t.role === 'partner')
  if (last) void voice.speak(last.textDe)
}

function scrollToEnd() {
  void nextTick(() => {
    const el = document.querySelector('.spr-proto')
    if (el) el.scrollTop = el.scrollHeight
  })
}

function backToSetup() { router.push({ name: 'sprechen-teil2' }) }
</script>

<template>
  <div v-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="backToSetup">← Back to setup</button>
  </div>

  <div v-else-if="!discussion" class="page loading-state"><div class="micro-mark">Loading…</div></div>

  <div v-else class="page voice-run">
    <header class="run-head">
      <div>
        <div class="breadcrumb">Sprechen Teil 2 · {{ spoken ? 'gesprochen' : 'getippt' }}</div>
        <h1 class="run-thesis">{{ discussion.topic.statementDe }}</h1>
        <div class="micro-mark">
          Du {{ sideDe(mySide) }} · Partner {{ sideDe(discussion.stance) }}
        </div>
      </div>
      <div class="run-meta">
        <span class="quiz-counter">Beitrag {{ Math.min(learnerCount + 1, target) }} · von {{ target }}</span>
        <button class="btn btn-quiet" type="button" :disabled="grading" @click="endEarly">Diskussion beenden</button>
      </div>
    </header>

    <div class="quiz-meter" role="progressbar" :aria-valuenow="learnerCount" :aria-valuemin="0" :aria-valuemax="target">
      <div class="quiz-meter-track">
        <div class="quiz-meter-fill quiz-meter-fill-done" :style="{ width: `${(learnerCount / target) * 100}%` }" />
      </div>
    </div>

    <div class="spr-run">
      <aside class="spr-rail">
        <div class="spr-rail-sec">
          <div class="spr-lbl">These</div>
          <p class="spr-rail-stmt">{{ discussion.topic.statementDe }}</p>
        </div>

        <div class="spr-rail-sec">
          <div class="spr-lbl">Deine Beiträge</div>
          <div class="spr-steps">
            <div v-for="s in steps" :key="s.n" class="spr-step" :class="{ done: s.done, now: s.now }">
              <span class="spr-step-n">{{ s.n }}</span>
              <span class="spr-step-m">{{ s.label }}</span>
            </div>
          </div>
        </div>

        <div v-if="liveWpm !== null" class="spr-rail-sec">
          <div class="spr-lbl">Tempo</div>
          <div class="spr-rail-wpm spr-num">{{ liveWpm }} <span class="spr-lbl">WpM</span></div>
        </div>

        <div class="spr-rail-sec">
          <div class="spr-lbl">Redemittel · {{ usedIds.size }} / 42</div>
          <div class="spr-used">
            <span
              v-for="r in SPRECHEN_REDEMITTEL" :key="r.id" class="spr-used-dot"
              :class="{ on: usedIds.has(r.id) }" :title="r.phraseDe"
            />
          </div>
        </div>

        <div class="spr-rail-sec">
          <div class="spr-lbl">Notizen</div>
          <p class="spr-railnotes" :class="{ none: !notes }">{{ notes || 'Keine Notizen aus der Vorbereitung.' }}</p>
        </div>
      </aside>

      <div class="run-main">
        <div class="spr-proto">
          <div v-for="(t, i) in discussion.turns" :key="i" class="spr-turn" :class="t.role">
            <div class="spr-turn-m">{{ t.role === 'learner' ? 'Du' : 'Partner' }}</div>
            <div class="spr-turn-b">{{ t.textDe }}</div>
          </div>
          <div v-if="partnerBusy" class="spr-turn partner">
            <div class="spr-turn-m">Partner</div>
            <div class="spr-turn-b spr-typing">···</div>
          </div>
          <div v-if="spoken && recognizer.listening.value" class="spr-turn learner live">
            <div class="spr-turn-m">Du · jetzt</div>
            <div class="spr-turn-b">{{ recognizer.liveText.value || '…' }}</div>
          </div>
        </div>

        <div v-if="spoken && recognizer.error.value?.kind === 'denied'" class="alert alert-danger">
          <span class="alert-label">Kein Mikrofonzugriff</span>
          Ohne Mikrofon läuft der gesprochene Test nicht. Erlaube den Zugriff in den
          Browser-Einstellungen, oder starte den Test getippt neu über
          <router-link :to="{ name: 'sprechen-teil2' }">die Einrichtung</router-link>.
        </div>

        <div v-if="partnerFailed && !grading" class="alert alert-warning">
          <span class="alert-label">Partner antwortet nicht</span>
          Dein Gespräch ist gespeichert — nichts geht verloren.
          <button class="btn btn-accent" type="button" @click="ensurePartnerTurn">Nochmal senden</button>
        </div>

        <div v-if="grading" class="alert alert-info">
          <span class="alert-label">Auswertung</span>
          Die Diskussion wird analysiert — Fehler markieren und Sprechdaten auswerten dauert einen Moment…
        </div>
        <div v-else-if="gradeFailed" class="alert alert-danger">
          <span class="alert-label">Analyse fehlgeschlagen</span>
          Die Diskussion ist gespeichert und kann erneut ausgewertet werden.
          <button class="btn btn-accent" type="button" @click="runGrading">Analyse erneut versuchen</button>
        </div>

        <template v-else-if="discussion.status === 'in_progress'">
          <!-- Move nudge + hint drawer land here in Task 9 -->

          <div class="spr-composer">
            <textarea
              v-if="!spoken"
              v-model="input"
              :placeholder="composerPlaceholder"
              @keydown.enter.exact.prevent="send"
            />
            <div class="spr-composer-f">
              <span class="spr-count" :class="{ short: wordCount > 0 && wordCount < 25 }">
                {{ wordCount }} Wörter<template v-if="wordCount > 0 && wordCount < 25"> · für einen B2-Beitrag noch knapp</template>
              </span>
              <span class="spr-count">Beitrag {{ Math.min(learnerCount + 1, target) }} / {{ target }}</span>

              <div v-if="spoken" class="mic-row">
                <button
                  class="btn mic-btn"
                  :class="(recognizer.listening.value || ending) ? 'btn-danger' : 'btn-accent'"
                  type="button"
                  :disabled="(!myTurn && !recognizer.listening.value) || ending"
                  @click="toggleMic"
                >
                  {{ (recognizer.listening.value || ending) ? '■ Beitrag beenden' : '● Sprechen' }}
                </button>
                <span class="mic-hint">
                  <template v-if="ending">Wird verarbeitet…</template>
                  <template v-else-if="recognizer.listening.value">Leertaste beendet — und schickt ab.</template>
                  <template v-else-if="voice.speaking.value">Der Partner spricht…</template>
                  <template v-else-if="myTurn">Leertaste oder Knopf startet die Aufnahme.</template>
                  <template v-else>Der Partner ist am Zug…</template>
                </span>
                <button class="btn btn-quiet" type="button" :disabled="voice.speaking.value || recognizer.listening.value" @click="repeatPartner">
                  ↻ Partner wiederholen
                </button>
              </div>
              <button v-else class="btn btn-accent" type="button" :disabled="!canSend" @click="send">
                Senden <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          <div v-if="hintsOn" class="drawer">
            <div class="drawer-head">
              <button class="dtab" :class="{ on: tab === 'was' }" @click="tab = tab === 'was' ? null : 'was'">
                Was<span class="dtab-sub">Argumente</span>
              </button>
              <button class="dtab" :class="{ on: tab === 'wie' }" @click="tab = tab === 'wie' ? null : 'wie'">
                Wie<span class="dtab-sub">Redemittel</span>
              </button>
              <button class="dtab ki" :disabled="kiBusy" @click="fetchKiTipp">
                {{ kiBusy ? '✦ KI-Tipp…' : '✦ KI-Tipp · 1 Call' }}
              </button>
            </div>

            <div v-if="tab === 'was'" class="drawer-body">
              <div v-for="(a, i) in mine" :key="i" class="was-item">
                <div class="was-claim">{{ a.claim }}</div>
                <p class="was-why">{{ a.why }}</p>
              </div>
            </div>

            <div v-if="tab === 'wie'" class="drawer-body">
              <div class="chip-row">
                <button v-for="m in HINT_MOVES" :key="m" type="button"
                  class="chip" :class="{ selected: move === m }" @click="move = m">
                  {{ MOVE_LABEL[m].de }}
                </button>
              </div>
              <ul class="phrases">
                <li v-for="r in phrasesForMove(move)" :key="r.id">
                  <span class="phrase-de">{{ r.phraseDe }}</span>
                  <span class="phrase-en">{{ r.noteEn }}</span>
                </li>
              </ul>
            </div>

            <div v-if="kiTipp" class="drawer-body"><p class="kitipp">{{ kiTipp }}</p></div>
          </div>
          <div v-else class="alert alert-info exam-note">
            <span class="alert-label">Prüfungsbedingungen</span>
            Ohne Hilfsmittel — wie in der echten Prüfung.
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.voice-run { max-width: 1080px; }
.run-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 12px; }
.run-thesis { font-family: var(--font-display); font-size: 24px; font-style: italic; line-height: 1.35; margin: 4px 0; }
.run-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex: 0 0 auto; }

/* Rail-only stat — Task 1's shared sheet owns the rail sections but has no
   dedicated class for this one numeric readout. */
.spr-rail-wpm { font-family: var(--font-display); font-size: 26px; font-weight: 500; letter-spacing: -0.02em; margin-top: 6px; display: flex; align-items: baseline; gap: 8px; }

/* The live-listening row is a turn IN PROGRESS, not yet a committed protocol
   entry — set off from committed turns without a bubble/border, matching the
   ruled-protocol look. */
.spr-turn.live .spr-turn-b { font-style: italic; color: var(--ink-soft); }

/* Composer: the ONLY part of the shared chrome that forks on modality. */
.mic-row { display: flex; gap: 14px; align-items: center; margin: 20px 0 14px; flex-wrap: wrap; }
.mic-btn { min-width: 190px; justify-content: center; }
.mic-hint { color: var(--mute); font-size: 13px; font-style: italic; flex: 1 1 auto; }
/* Mirrors .spr-composer-f .btn's right alignment for the Senden button — the
   mic-row wrapper itself carries no .btn class, so it needs its own rule. */
.spr-composer-f .mic-row { margin-left: auto; }

.exam-note { margin-top: 8px; }
.drawer { border-top: 1px solid var(--hairline); }
.drawer-head { display: flex; gap: 4px; }
.dtab {
  background: none; border: 0; border-bottom: 2px solid transparent; cursor: pointer;
  padding: 10px 14px; font: inherit; font-size: 14px; color: var(--mute);
  display: flex; gap: 8px; align-items: baseline;
}
.dtab.on { color: var(--ink); border-bottom-color: var(--accent); }
.dtab.ki { margin-left: auto; color: var(--accent); }
.dtab-sub {
  font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.16em;
  text-transform: uppercase; opacity: 0.7;
}
.drawer-body { padding: 14px 2px; }
.was-item { margin-bottom: 12px; }
.was-claim { font-family: var(--font-display); font-size: 15.5px; }
.was-why { margin: 3px 0 0; font-size: 13px; line-height: 1.5; color: var(--ink-soft); }
.phrases { list-style: none; padding: 0; margin: 12px 0 0; }
.phrases li {
  display: flex; justify-content: space-between; gap: 16px; align-items: baseline;
  padding: 6px 0; border-bottom: 1px solid var(--hairline);
}
.phrase-de { font-family: var(--font-display); font-size: 15px; }
.phrase-en { color: var(--mute); font-size: 12px; font-style: italic; text-align: right; flex: 0 0 auto; }
.kitipp {
  margin: 0; padding: 10px 14px; font-size: 14px; line-height: 1.5;
  background: var(--paper-deep); border-left: 3px solid var(--accent); border-radius: 4px;
}
@media (max-width: 860px) {
  .run-head { flex-direction: column; }
}
</style>
