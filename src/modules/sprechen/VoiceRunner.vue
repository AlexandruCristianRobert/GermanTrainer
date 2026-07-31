<script setup lang="ts">
//
// Spoken Teil 2 — Diskussion. The typed runner is untouched; this is a sibling
// (CONTEXT.md → "Modality").
//
// Turn shape: the partner's reply is spoken aloud, and ONLY when the utterance
// has finished (plus the TTS tail delay) does the microphone unlock. Opening it
// earlier makes the recognizer transcribe the partner into the learner's own
// answer. Barge-in is impossible on the free browser APIs, so the flow stays
// strictly turn-based — which is what computePhase() already assumes.
//
// Space starts the turn; Space again ends AND sends it. There is no edit step:
// what the recognizer heard is what was said (a deliberate decision — it keeps
// the pressure where the exam puts it). Per-span confidence is recorded anyway,
// so the result page can show where the recognizer was unsure.

import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  VOICE_RUN_STASH_KEY, learnerTurnCount, sentenceAround, summarizeFluency,
  type SprechenDiscussion, type VoiceRunStash
} from '../../data/sprechen'
import { HINT_MOVES, MOVE_LABEL, phrasesForMove, type Move } from '../../data/sprechenRedemittel'
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
const tab = ref<'was' | 'wie' | null>('was')
const move = ref<Move>('partial')
const kiTipp = ref<string | null>(null)
const kiBusy = ref(false)
const partnerBusy = ref(false)
const partnerFailed = ref(false)
const grading = ref(false)
const gradeFailed = ref(false)
const error = ref<string | null>(null)
const model = ref('')
/** True from the start of endTurn() until the flushed turn is appended — gates
 *  a re-entrant Space/click from restarting the recognizer under an in-flight
 *  end() and wiping the buffer it is about to resolve from. */
const ending = ref(false)
/** True once saveQuizRun() has recorded the Run. A retry after runGrading()
 *  throws later (sessionStorage/deleteDiscussion) must re-grade but must NOT
 *  write a second Run or a second archive batch. */
const runRecorded = ref(false)

/** When the partner stopped speaking — the clock that reaction time runs from. */
let partnerDoneAt = 0

const learnerCount = computed(() => discussion.value ? learnerTurnCount(discussion.value) : 0)
const target = computed(() => discussion.value?.turnTarget ?? 6)

const mySide = computed<'pro' | 'contra'>(() =>
  discussion.value?.stance === 'pro' ? 'contra' : 'pro'
)

const myTurn = computed(() =>
  !!discussion.value &&
  !partnerBusy.value && !grading.value && !voice.speaking.value &&
  discussion.value.status === 'in_progress' &&
  discussion.value.turns.length > 0 &&
  discussion.value.turns[discussion.value.turns.length - 1].role === 'partner'
)

const mine = computed(() => {
  if (!bank.value) return []
  return mySide.value === 'pro' ? bank.value.pro : bank.value.contra
})

function sideDe(side: 'pro' | 'contra') { return side === 'pro' ? 'dafür' : 'dagegen' }

onMounted(async () => {
  await loadSettings()
  model.value = settings.value.model
  window.addEventListener('keydown', onKey)

  const raw = sessionStorage.getItem(VOICE_RUN_STASH_KEY)
  if (raw) {
    sessionStorage.removeItem(VOICE_RUN_STASH_KEY)
    try {
      const s = JSON.parse(raw) as VoiceRunStash
      notes.value = s.notes ?? ''
      if (s.model) model.value = s.model
      discussion.value = await createDiscussion(s.topic, s.turnTarget, s.stance, 'spoken', s.notes)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to start.'
      return
    }
  } else {
    const active = await findActiveDiscussion('spoken')
    if (!active) {
      error.value = 'No spoken discussion found. Go back to setup and start one.'
      return
    }
    discussion.value = active
    notes.value = active.notes ?? ''
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

/** Space toggles the floor — but never while typing in a field, and never on
 *  a key-repeat (holding Space down fires repeated keydowns; only the first
 *  should act, or a held key re-enters toggleMic() while end() is in flight). */
function onKey(e: KeyboardEvent) {
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

/** Fires the pending partner call, speaks it, then hands the floor back. */
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
    partnerBusy.value = false
    await voice.speak(reply)
    partnerDoneAt = Date.now()
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
    const el = document.querySelector('.proto-scroll')
    if (el) el.scrollTop = el.scrollHeight
  })
}

function backToSetup() { router.push({ name: 'sprechen-voice' }) }
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
        <div class="breadcrumb">Sprechen Teil 2 · gesprochen</div>
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

    <div class="run-grid">
      <aside class="run-rail">
        <div class="rail-sec">
          <div class="micro-mark">Deine Notizen</div>
          <p class="rail-notes" :class="{ none: !notes }">{{ notes || 'Keine Notizen aus der Vorbereitung.' }}</p>
        </div>
        <div class="rail-sec">
          <div class="micro-mark">Deine Argumente</div>
          <ul class="rail-angles">
            <li v-for="(a, i) in mine" :key="i">{{ a.claim }}</li>
          </ul>
        </div>
      </aside>

      <div class="run-main">
        <div class="proto-scroll">
          <div v-for="(t, i) in discussion.turns" :key="i" class="proto-turn" :class="t.role">
            <div class="proto-role">{{ t.role === 'learner' ? 'Du' : 'Partner' }}</div>
            <div class="proto-body">{{ t.textDe }}</div>
          </div>
          <div v-if="partnerBusy" class="proto-turn partner">
            <div class="proto-role">Partner</div>
            <div class="proto-body typing">···</div>
          </div>
          <div v-if="recognizer.listening.value" class="proto-turn learner live">
            <div class="proto-role">Du · jetzt</div>
            <div class="proto-body">{{ recognizer.liveText.value || '…' }}</div>
          </div>
        </div>

        <div v-if="recognizer.error.value?.kind === 'denied'" class="alert alert-danger">
          <span class="alert-label">Kein Mikrofonzugriff</span>
          Ohne Mikrofon läuft der gesprochene Test nicht. Erlaube den Zugriff in den
          Browser-Einstellungen, oder nimm den
          <router-link :to="{ name: 'sprechen-teil2' }">getippten Test</router-link>.
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
          <div class="mic-row">
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

          <div class="drawer">
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
.run-grid { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 28px; margin-top: 20px; }
.run-rail { border-right: 1px solid var(--hairline); padding-right: 20px; }
.rail-sec { margin-bottom: 26px; }
.rail-notes { font-size: 13.5px; line-height: 1.65; white-space: pre-wrap; margin: 8px 0 0; }
.rail-notes.none { color: var(--mute); font-style: italic; }
.rail-angles { list-style: none; padding: 0; margin: 8px 0 0; }
.rail-angles li {
  font-family: var(--font-display); font-size: 13.5px; line-height: 1.45;
  padding: 6px 0; border-bottom: 1px dotted var(--hairline);
}
.proto-scroll { max-height: 42vh; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; padding-right: 6px; }
.proto-turn { max-width: 88%; }
.proto-turn.partner { align-self: flex-start; }
.proto-turn.learner { align-self: flex-end; }
.proto-role {
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.2em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 3px;
}
.proto-turn.learner .proto-role { text-align: right; }
.proto-body {
  display: inline-block; padding: 10px 14px; border-radius: 6px;
  font-size: 15.5px; line-height: 1.55;
  background: var(--paper-deep); border: 1px solid var(--hairline);
}
.proto-turn.learner .proto-body { background: var(--accent-tint); border-color: transparent; }
.proto-turn.live .proto-body { border-style: dashed; border-color: var(--accent); color: var(--ink-soft); }
.typing { color: var(--mute); letter-spacing: 0.2em; }
.mic-row { display: flex; gap: 14px; align-items: center; margin: 20px 0 14px; flex-wrap: wrap; }
.mic-btn { min-width: 190px; justify-content: center; }
.mic-hint { color: var(--mute); font-size: 13px; font-style: italic; flex: 1 1 auto; }
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
  .run-grid { grid-template-columns: 1fr; }
  .run-rail { border-right: 0; border-bottom: 1px solid var(--hairline); padding: 0 0 16px; }
  .run-head { flex-direction: column; }
  .proto-turn { max-width: 100%; }
}
</style>
