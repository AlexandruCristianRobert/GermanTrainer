<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { SprechenDiscussion, TurnTarget } from '../../data/sprechen'
import { learnerTurnCount } from '../../data/sprechen'
import { HINT_MOVES, MOVE_LABEL, phrasesForMove, type Move } from '../../data/sprechenRedemittel'
import {
  appendTurn, createDiscussion, deleteDiscussion, findActiveDiscussion,
  incrementKiTipp, markSubmitted
} from '../../composables/useSprechenDiscussion'
import {
  computePhase, generateKiTipp, generatePartnerTurn
} from '../../composables/useSprechenPartner'
import {
  SPRECHEN_RESULT_KEY, gradeDiscussion, type SprechenResultStash
} from '../../composables/useSprechenGrader'
import { saveQuizRun, type SprechenErrorTag } from '../../composables/useQuizHistory'
import { resolveAiClient } from '../../composables/localClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

interface RunStash {
  topic: SprechenDiscussion['topic']
  turnTarget: TurnTarget
  stance: 'pro' | 'contra'
  hintsOn: boolean
  model: string
}

const router = useRouter()
const toast = useToast()
const { settings, load: loadSettings } = useSettings()

const discussion = ref<SprechenDiscussion | null>(null)
const input = ref('')
const hintsOn = ref(true)
const activeMove = ref<Move | null>(null)
const kiTipp = ref<string | null>(null)
const kiTippBusy = ref(false)
const sending = ref(false)
const partnerBusy = ref(false)
const partnerFailed = ref(false)
const grading = ref(false)
const gradeFailed = ref(false)
const error = ref<string | null>(null)
const model = ref('')

const learnerCount = computed(() => discussion.value ? learnerTurnCount(discussion.value) : 0)
const target = computed(() => discussion.value?.turnTarget ?? 6)
const myTurn = computed(() =>
  !!discussion.value && !partnerBusy.value && !grading.value &&
  discussion.value.status === 'in_progress' &&
  (discussion.value.turns.length === 0
    ? false
    : discussion.value.turns[discussion.value.turns.length - 1].role === 'partner')
)

onMounted(async () => {
  await loadSettings()
  model.value = settings.value.model
  const raw = sessionStorage.getItem('gt:lastSprechenTeil2')
  if (raw) {
    sessionStorage.removeItem('gt:lastSprechenTeil2')
    try {
      const s = JSON.parse(raw) as RunStash
      hintsOn.value = s.hintsOn
      if (s.model) model.value = s.model
      discussion.value = await createDiscussion(s.topic, s.turnTarget, s.stance)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to start.'
      return
    }
  } else {
    discussion.value = await findActiveDiscussion('typed')
    if (!discussion.value) {
      error.value = 'No discussion found. Go back to setup and start one.'
      return
    }
  }
  if (discussion.value.status === 'submitted') {
    await runGrading()
    return
  }
  await ensurePartnerTurn()
})

/** Fires the pending partner call: opening, reply, or closing (then grading). */
async function ensurePartnerTurn() {
  const d = discussion.value
  if (!d || partnerBusy.value || d.status !== 'in_progress') return
  const last = d.turns[d.turns.length - 1]
  if (d.turns.length > 0 && last.role === 'partner') return   // learner's turn
  const phase = computePhase(d)
  partnerBusy.value = true
  partnerFailed.value = false
  try {
    const client = resolveAiClient(settings.value)
    const reply = await generatePartnerTurn(client, model.value, d, phase)
    const turn = { role: 'partner' as const, textDe: reply, at: Date.now() }
    await appendTurn(d.id, turn)
    d.turns = [...d.turns, turn]
    scrollToEnd()
    if (phase === 'closing') await finish()
  } catch (err) {
    partnerFailed.value = true   // transcript is already safe in Dexie
    toast.error('Partner antwortet nicht', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    partnerBusy.value = false
  }
}

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
    activeMove.value = null
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
    const client = resolveAiClient(settings.value)
    const result = await gradeDiscussion(client, model.value, d)
    const finishedAt = d.endedAt ?? Date.now()

    // 1. Record the summary Run (must succeed before the row is deleted).
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
        passes: result.passes
      }
    })

    // 2. Stash the full analysis for the one-time result page.
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

    // 3. Delete the ephemeral row — the conversation is gone by design.
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
  if (!d || kiTippBusy.value) return
  kiTippBusy.value = true
  try {
    const client = resolveAiClient(settings.value)
    kiTipp.value = await generateKiTipp(client, model.value, d)
    await incrementKiTipp(d.id)
    d.kiTippCount += 1
  } catch (err) {
    toast.error('KI-Tipp fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    kiTippBusy.value = false
  }
}

function toggleMove(m: Move) { activeMove.value = activeMove.value === m ? null : m }

function scrollToEnd() {
  void nextTick(() => {
    const el = document.querySelector('.chat-scroll')
    if (el) el.scrollTop = el.scrollHeight
  })
}

function onEnter(e: KeyboardEvent) {
  if (e.shiftKey) return          // Shift+Enter = newline
  e.preventDefault()
  void send()
}

function backToSetup() { router.push({ name: 'sprechen-teil2' }) }
</script>

<template>
  <div v-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="backToSetup">← Back to setup</button>
  </div>

  <div v-else-if="!discussion" class="page loading-state"><div class="micro-mark">Loading…</div></div>

  <div v-else class="page discussion-page">
    <header class="discussion-head">
      <div>
        <div class="breadcrumb">Sprechen Teil 2 · Diskussion</div>
        <h1 class="discussion-topic">{{ discussion.topic.statementDe }}</h1>
        <div class="micro-mark">Partner: {{ discussion.stance === 'pro' ? 'dafür' : 'dagegen' }}</div>
      </div>
      <div class="discussion-meta">
        <span class="quiz-counter">Beitrag {{ Math.min(learnerCount + 1, target) }} · von {{ target }}</span>
        <button class="btn btn-quiet" type="button" :disabled="grading" @click="endEarly">Diskussion beenden</button>
      </div>
    </header>

    <div class="quiz-meter" role="progressbar" :aria-valuenow="learnerCount" :aria-valuemin="0" :aria-valuemax="target">
      <div class="quiz-meter-track">
        <div class="quiz-meter-fill quiz-meter-fill-done" :style="{ width: `${(learnerCount / target) * 100}%` }" />
      </div>
    </div>

    <div class="chat-scroll">
      <div v-for="(t, i) in discussion.turns" :key="i"
        class="chat-turn" :class="t.role === 'learner' ? 'chat-learner' : 'chat-partner'">
        <div class="chat-role">{{ t.role === 'learner' ? 'Du' : 'Partner' }}</div>
        <div class="chat-text">{{ t.textDe }}</div>
      </div>
      <div v-if="partnerBusy" class="chat-turn chat-partner">
        <div class="chat-role">Partner</div>
        <div class="chat-text chat-typing">…</div>
      </div>
    </div>

    <div v-if="partnerFailed && !grading" class="alert alert-warning">
      <span class="alert-label">Partner antwortet nicht</span>
      Dein Gespräch ist gespeichert — nichts geht verloren.
      <button class="btn btn-accent" type="button" @click="ensurePartnerTurn">Nochmal senden</button>
    </div>

    <div v-if="grading" class="alert alert-info">
      <span class="alert-label">Auswertung</span>
      Die Diskussion wird analysiert — jeden Fehler markieren dauert einen Moment…
    </div>
    <div v-else-if="gradeFailed" class="alert alert-danger">
      <span class="alert-label">Analyse fehlgeschlagen</span>
      Die Diskussion ist gespeichert und kann erneut ausgewertet werden.
      <button class="btn btn-accent" type="button" @click="runGrading">Analyse erneut versuchen</button>
    </div>

    <template v-else-if="discussion.status === 'in_progress'">
      <div v-if="hintsOn && myTurn" class="hint-panel">
        <div class="hint-chips chip-row">
          <button v-for="m in HINT_MOVES" :key="m" type="button"
            class="chip" :class="{ selected: activeMove === m }" @click="toggleMove(m)">
            {{ MOVE_LABEL[m].de }}
          </button>
          <button class="chip chip-ki" type="button" :disabled="kiTippBusy" @click="fetchKiTipp">
            {{ kiTippBusy ? 'KI-Tipp…' : '✦ KI-Tipp' }}
          </button>
        </div>
        <ul v-if="activeMove" class="hint-phrases">
          <li v-for="r in phrasesForMove(activeMove).slice(0, 3)" :key="r.id">{{ r.phraseDe }}</li>
        </ul>
        <p v-if="kiTipp" class="hint-kitipp">{{ kiTipp }}</p>
      </div>

      <div class="chat-input-row">
        <textarea
          v-model="input"
          class="input chat-input"
          rows="3"
          :disabled="!myTurn || sending"
          :placeholder="myTurn ? 'Dein Beitrag auf Deutsch… (Enter senden, Shift+Enter neue Zeile)' : 'Der Partner ist am Zug…'"
          @keydown.enter="onEnter"
        />
        <button class="btn btn-accent" type="button"
          :disabled="!myTurn || sending || input.trim().length === 0" @click="send">Senden</button>
      </div>
      <div class="hint-toggle-row">
        <button class="btn btn-quiet" type="button" @click="hintsOn = !hintsOn">
          Hints {{ hintsOn ? 'ausblenden' : 'einblenden' }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.discussion-page { max-width: 760px; }
.discussion-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 12px; }
.discussion-topic { font-family: var(--font-display); font-size: 24px; font-style: italic; line-height: 1.35; margin: 4px 0; }
.discussion-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex: 0 0 auto; }
.chat-scroll { max-height: 46vh; overflow-y: auto; margin: 20px 0; display: flex; flex-direction: column; gap: 14px; padding-right: 6px; }
.chat-turn { max-width: 85%; }
.chat-partner { align-self: flex-start; }
.chat-learner { align-self: flex-end; text-align: right; }
.chat-role {
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.2em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 3px;
}
.chat-text {
  display: inline-block; padding: 10px 14px; border-radius: 6px;
  font-size: 15.5px; line-height: 1.55; text-align: left;
  background: var(--paper-deep); border: 1px solid var(--hairline);
}
.chat-learner .chat-text { background: var(--accent-tint); border-color: transparent; }
.chat-typing { color: var(--mute); letter-spacing: 0.2em; }
.hint-panel { margin: 8px 0 14px; }
.chip-ki { color: var(--accent); }
.hint-phrases { list-style: none; margin: 10px 0 0; padding: 0; }
.hint-phrases li {
  font-family: var(--font-display); font-style: italic; font-size: 15px;
  padding: 4px 0; border-bottom: 1px dotted var(--hairline);
}
.hint-kitipp {
  margin: 10px 0 0; padding: 10px 14px; font-size: 14px; line-height: 1.5;
  background: var(--paper-deep); border-left: 3px solid var(--accent); border-radius: 4px;
}
.chat-input-row { display: flex; gap: 10px; align-items: flex-end; }
.chat-input { flex: 1 1 auto; resize: vertical; }
.hint-toggle-row { margin-top: 8px; display: flex; justify-content: flex-end; }
@media (max-width: 720px) {
  .discussion-head { flex-direction: column; }
  .discussion-meta { flex-direction: row; align-items: center; justify-content: space-between; width: 100%; }
  .chat-turn { max-width: 100%; }
}
</style>
