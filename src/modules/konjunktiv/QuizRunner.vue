<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { KiDifficulty, KiJudgeResult, KiQuestion, KiTopic } from '../../data/konjunktiv'
import { judgeKi } from '../../composables/useKonjunktivQuiz'
import { resolveAiClient } from '../../composables/localClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

interface Stash {
  entries: KiQuestion[]
  difficulty: KiDifficulty
  topics: KiTopic[]
}

interface QuestionState {
  entry: KiQuestion
  userInput: string
  submitted: boolean
  judging: boolean
  judgement: KiJudgeResult | null
}

const router = useRouter()
const toast = useToast()
const { settings, load: loadSettings } = useSettings()

const loading = ref(true)
const error = ref<string | null>(null)
const stash = ref<Stash | null>(null)
const questions = ref<QuestionState[]>([])
const currentIndex = ref(0)
const startedAt = ref(0)

onMounted(async () => {
  await loadSettings()
  try {
    const raw = sessionStorage.getItem('gt:lastKonjunktiv')
    if (!raw) {
      error.value = 'No session data found. Go back to Setup and run Generate.'
      return
    }
    const s = JSON.parse(raw) as Stash
    if (!Array.isArray(s.entries) || s.entries.length === 0) {
      error.value = 'Session contained no entries.'
      return
    }
    stash.value = s
    questions.value = s.entries.map(e => ({
      entry: e,
      userInput: '',
      submitted: false,
      judging: false,
      judgement: null
    }))
    startedAt.value = Date.now()
    nextTick(focusInput)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

function focusInput() {
  const el = document.querySelector('.ki-input') as HTMLInputElement | null
  el?.focus()
}

const current = computed(() => questions.value[currentIndex.value] ?? null)
const finished = computed(() => questions.value.length > 0 && currentIndex.value >= questions.value.length)
const total = computed(() => questions.value.length)

async function submit() {
  const q = current.value
  if (!q || q.submitted || q.judging) return
  q.judging = true
  try {
    const client = resolveAiClient(settings.value)
    q.judgement = await judgeKi(client, settings.value.model, q.entry, q.userInput)
    q.submitted = true
  } catch (err) {
    toast.error('Grading failed', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    q.judging = false
  }
}

function next() {
  if (currentIndex.value + 1 >= questions.value.length) {
    finalize()
    return
  }
  currentIndex.value += 1
  nextTick(focusInput)
}

function finalize() {
  if (!stash.value) return
  const correct = questions.value.filter(q => q.judgement?.verdict === 'correct').length
  const finishedAt = Date.now()
  sessionStorage.setItem('gt:lastKonjunktivResult', JSON.stringify({
    questions: questions.value.map(q => ({
      entry: q.entry,
      userInput: q.userInput,
      judgement: q.judgement
    })),
    correct,
    total: questions.value.length,
    difficulty: stash.value.difficulty,
    topics: stash.value.topics,
    startedAt: startedAt.value,
    finishedAt
  }))
  router.push({ name: 'konjunktiv-quiz-result' })
}

function onEnter(e: KeyboardEvent) {
  e.preventDefault()
  const q = current.value
  if (!q) return
  if (!q.submitted) {
    if (q.userInput.trim().length > 0 && !q.judging) submit()
  } else {
    next()
  }
}

function endQuiz() { router.push({ name: 'konjunktiv' }) }

const verdictLabel: Record<KiJudgeResult['verdict'], string> = {
  correct: 'Richtig',
  partially_correct: 'Teilweise',
  incorrect: 'Falsch'
}
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="endQuiz">← Back to setup</button>
  </div>

  <div v-else-if="current" class="page">
    <div class="quiz-card ki-card">
      <div class="quiz-meta">
        <span class="quiz-counter">Zitat {{ currentIndex + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </div>

      <div class="ki-prompt-meta">
        <span class="ki-prompt-difficulty">{{ stash?.difficulty }}</span>
        <span class="ki-prompt-mood">Erwartet: {{ current.entry.expectedMood }}</span>
      </div>

      <div class="prompt-card">
        <div class="ki-source">{{ current.entry.source }}</div>
        <div class="ki-rewrite" @keydown.enter="onEnter">
          <span class="ki-stem">{{ current.entry.reportingClause }}</span>
          <input
            class="ki-input"
            :class="current.submitted && current.judgement ? (current.judgement.verdict === 'correct' ? 'ki-input-right' : current.judgement.verdict === 'partially_correct' ? 'ki-input-partial' : 'ki-input-wrong') : ''"
            type="text"
            v-model="current.userInput"
            :readonly="current.submitted"
            autocomplete="off"
            spellcheck="false"
            placeholder="…sie + Konjunktiv I/II"
          />
        </div>
      </div>

      <div v-if="current.submitted && current.judgement" class="ki-feedback">
        <div class="ki-feedback-row">
          <span class="ki-verdict" :class="`ki-verdict-${current.judgement.verdict}`">
            {{ verdictLabel[current.judgement.verdict] }}
          </span>
          <span class="ki-mood-chip" :class="current.judgement.moodCheck.ok ? 'ki-mood-ok' : 'ki-mood-bad'">
            mood: {{ current.judgement.moodCheck.used }} {{ current.judgement.moodCheck.ok ? '✓' : '✗' }}
          </span>
        </div>
        <div class="ki-expected">
          <span class="ki-expected-label">Erwartet</span>
          <span class="ki-expected-text">{{ current.judgement.expected }}</span>
        </div>
        <div v-if="current.judgement.acceptedVariants.length > 0" class="ki-variants">
          <span class="ki-variants-label">Auch akzeptiert</span>
          <ul>
            <li v-for="v in current.judgement.acceptedVariants" :key="v">{{ v }}</li>
          </ul>
        </div>
        <div class="ki-rationale">{{ current.judgement.feedback }}</div>
        <div class="ki-rationale-author">Source rationale: {{ current.entry.rationale }}</div>
      </div>

      <div class="ai-actions">
        <button
          v-if="!current.submitted"
          type="button"
          class="btn btn-accent"
          @click="submit"
          :disabled="current.userInput.trim().length === 0 || current.judging"
        >{{ current.judging ? 'Grading…' : 'Grade' }}</button>
        <button
          v-else
          type="button"
          class="btn btn-accent"
          @click="next"
        >{{ currentIndex + 1 >= total ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span></button>
      </div>
    </div>
  </div>

  <div v-else-if="finished" class="page loading-state"><div class="micro-mark">Wrapping up…</div></div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.ki-card { max-width: 760px; margin: 0 auto; }
.ki-prompt-meta {
  display: flex;
  gap: 18px;
  justify-content: center;
  margin: 8px 0 16px;
}
.ki-prompt-difficulty, .ki-prompt-mood {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
}
.ki-prompt-difficulty { color: var(--accent); }
.ki-source {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 22px;
  line-height: 1.5;
  color: var(--ink);
  margin-bottom: 24px;
}
.ki-rewrite {
  font-family: var(--font-display);
  font-size: 22px;
  line-height: 1.6;
  color: var(--ink);
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
}
.ki-stem { white-space: pre; }
.ki-input {
  flex: 1 1 240px;
  min-width: 200px;
  border: 0;
  border-bottom: 2px solid var(--rule);
  font-family: var(--font-display);
  font-size: inherit;
  color: var(--accent);
  padding: 2px 6px;
  background: transparent;
  outline: none;
  transition: border-color .15s, color .15s;
}
.ki-input:focus { border-bottom-color: var(--accent); }
.ki-input.ki-input-right { color: var(--success); border-bottom-color: var(--success); }
.ki-input.ki-input-partial { color: var(--warn, #b58800); border-bottom-color: var(--warn, #b58800); }
.ki-input.ki-input-wrong { color: var(--danger); border-bottom-color: var(--danger); }
.ki-feedback {
  margin: 20px 0;
  padding: 14px 18px;
  background: var(--paper-deep);
  border-radius: 4px;
  border-left: 3px solid var(--accent);
  display: flex; flex-direction: column; gap: 10px;
}
.ki-feedback-row { display: flex; gap: 12px; align-items: center; }
.ki-verdict {
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.18em;
  text-transform: uppercase; padding: 4px 8px; border-radius: 3px;
}
.ki-verdict-correct { background: color-mix(in srgb, var(--success) 18%, transparent); color: var(--success); }
.ki-verdict-partially_correct { background: color-mix(in srgb, var(--warn, #b58800) 18%, transparent); color: var(--warn, #b58800); }
.ki-verdict-incorrect { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }
.ki-mood-chip { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--mute); }
.ki-mood-ok { color: var(--success); }
.ki-mood-bad { color: var(--danger); }
.ki-expected, .ki-variants { font-size: 14px; }
.ki-expected-label, .ki-variants-label {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--mute); display: block;
}
.ki-expected-text { font-family: var(--font-display); }
.ki-variants ul { margin: 4px 0 0 16px; padding: 0; }
.ki-rationale { font-size: 14px; line-height: 1.5; }
.ki-rationale-author {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute);
}
.ai-actions { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>
