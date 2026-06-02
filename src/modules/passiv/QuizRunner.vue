<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  TRANSFORMATION_EXAMPLES,
  TRANSFORMATION_LABELS,
  type PassivDifficulty,
  type PassivJudgeResult,
  type PassivQuestion,
  type TransformationType
} from '../../data/passiv'
import { judgePassiv } from '../../composables/usePassivQuiz'
import { resolveAiClient } from '../../composables/localClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

interface Stash {
  entries: PassivQuestion[]
  difficulty: PassivDifficulty
  focusTypes: TransformationType[]
}

interface QuestionState {
  entry: PassivQuestion
  userInput: string
  submitted: boolean
  judging: boolean
  judgement: PassivJudgeResult | null
  exampleOpen: boolean
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
    const raw = sessionStorage.getItem('gt:lastPassiv')
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
      judgement: null,
      exampleOpen: false
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
  const el = document.querySelector('.passiv-input') as HTMLInputElement | null
  el?.focus()
}

const current = computed(() => questions.value[currentIndex.value] ?? null)
const total = computed(() => questions.value.length)

async function submit() {
  const q = current.value
  if (!q || q.submitted || q.judging) return
  q.judging = true
  try {
    const client = resolveAiClient(settings.value)
    q.judgement = await judgePassiv(client, settings.value.model, q.entry, q.userInput)
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

  const perType: Record<string, { correct: number; total: number }> = {}
  for (const q of questions.value) {
    const t = q.entry.target as string
    perType[t] = perType[t] ?? { correct: 0, total: 0 }
    perType[t].total += 1
    if (q.judgement?.verdict === 'correct') perType[t].correct += 1
  }

  sessionStorage.setItem('gt:lastPassivResult', JSON.stringify({
    questions: questions.value.map(q => ({
      entry: q.entry,
      userInput: q.userInput,
      judgement: q.judgement
    })),
    correct,
    total: questions.value.length,
    difficulty: stash.value.difficulty,
    focusTypes: stash.value.focusTypes,
    perType,
    startedAt: startedAt.value,
    finishedAt
  }))
  router.push({ name: 'passiv-quiz-result' })
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

function endQuiz() { router.push({ name: 'passiv' }) }

const verdictLabel: Record<PassivJudgeResult['verdict'], string> = {
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
    <div class="quiz-card passiv-card">
      <div class="quiz-meta">
        <span class="quiz-counter">Satz {{ currentIndex + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </div>

      <div class="passiv-target-row">
        <span class="passiv-target-label">Form</span>
        <span class="passiv-target-tag">{{ TRANSFORMATION_LABELS[current.entry.target] }}</span>
        <button
          type="button"
          class="passiv-example-toggle"
          :aria-expanded="current.exampleOpen"
          @click="current.exampleOpen = !current.exampleOpen"
        >?</button>
      </div>
      <div v-if="current.exampleOpen" class="passiv-example">
        e.g. <span class="passiv-example-text">{{ TRANSFORMATION_EXAMPLES[current.entry.target] }}</span>
      </div>

      <div class="prompt-card">
        <div class="passiv-active">{{ current.entry.active }}</div>
        <div class="passiv-input-row" @keydown.enter="onEnter">
          <input
            class="passiv-input"
            :class="current.submitted && current.judgement ? (current.judgement.verdict === 'correct' ? 'passiv-input-right' : current.judgement.verdict === 'partially_correct' ? 'passiv-input-partial' : 'passiv-input-wrong') : ''"
            type="text"
            v-model="current.userInput"
            :readonly="current.submitted"
            autocomplete="off"
            spellcheck="false"
            placeholder="Type the rewrite…"
          />
        </div>
      </div>

      <div v-if="current.submitted && current.judgement" class="passiv-feedback">
        <div class="passiv-feedback-row">
          <span class="passiv-verdict" :class="`passiv-verdict-${current.judgement.verdict}`">
            {{ verdictLabel[current.judgement.verdict] }}
          </span>
          <span class="passiv-form-chip" :class="current.judgement.formCheck.matchesTarget ? 'passiv-form-ok' : 'passiv-form-bad'">
            used: {{ current.judgement.formCheck.usedType }} {{ current.judgement.formCheck.matchesTarget ? '✓' : '✗' }}
          </span>
        </div>
        <div class="passiv-expected">
          <span class="passiv-expected-label">Erwartet</span>
          <span class="passiv-expected-text">{{ current.judgement.expected }}</span>
        </div>
        <div v-if="current.judgement.acceptedVariants.length > 0" class="passiv-variants">
          <span class="passiv-variants-label">Auch akzeptiert</span>
          <ul>
            <li v-for="v in current.judgement.acceptedVariants" :key="v">{{ v }}</li>
          </ul>
        </div>
        <div class="passiv-rationale">{{ current.judgement.feedback }}</div>
        <div class="passiv-rationale-author">Source rationale: {{ current.entry.rationale }}</div>
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
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.passiv-card { max-width: 760px; margin: 0 auto; }
.passiv-target-row { display: flex; gap: 12px; align-items: center; margin: 8px 0 4px; }
.passiv-target-label {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute);
}
.passiv-target-tag {
  font-family: var(--font-display); font-size: 16px; color: var(--accent);
  padding: 4px 10px; border: 1px solid var(--accent); border-radius: 3px;
}
.passiv-example-toggle {
  background: transparent; border: 1px solid var(--rule);
  width: 22px; height: 22px; border-radius: 50%;
  color: var(--mute); cursor: pointer; line-height: 1;
}
.passiv-example {
  margin: 4px 0 12px; font-size: 13px; color: var(--mute);
  font-family: var(--font-body); font-style: italic;
}
.passiv-example-text { color: var(--ink-soft); }
.passiv-active {
  font-family: var(--font-display); font-style: italic;
  font-size: 22px; line-height: 1.5; color: var(--ink); margin-bottom: 18px;
}
.passiv-input-row { display: flex; }
.passiv-input {
  flex: 1; border: 0; border-bottom: 2px solid var(--rule);
  font-family: var(--font-display); font-size: 22px;
  color: var(--accent); padding: 6px 6px;
  background: transparent; outline: none;
  transition: border-color .15s, color .15s;
}
.passiv-input:focus { border-bottom-color: var(--accent); }
.passiv-input.passiv-input-right { color: var(--success); border-bottom-color: var(--success); }
.passiv-input.passiv-input-partial { color: var(--warn, #b58800); border-bottom-color: var(--warn, #b58800); }
.passiv-input.passiv-input-wrong { color: var(--danger); border-bottom-color: var(--danger); }
.passiv-feedback {
  margin: 20px 0; padding: 14px 18px;
  background: var(--paper-deep); border-radius: 4px;
  border-left: 3px solid var(--accent);
  display: flex; flex-direction: column; gap: 10px;
}
.passiv-feedback-row { display: flex; gap: 12px; align-items: center; }
.passiv-verdict {
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.18em;
  text-transform: uppercase; padding: 4px 8px; border-radius: 3px;
}
.passiv-verdict-correct { background: color-mix(in srgb, var(--success) 18%, transparent); color: var(--success); }
.passiv-verdict-partially_correct { background: color-mix(in srgb, var(--warn, #b58800) 18%, transparent); color: var(--warn, #b58800); }
.passiv-verdict-incorrect { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }
.passiv-form-chip { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--mute); }
.passiv-form-ok { color: var(--success); }
.passiv-form-bad { color: var(--danger); }
.passiv-expected, .passiv-variants { font-size: 14px; }
.passiv-expected-label, .passiv-variants-label {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--mute); display: block;
}
.passiv-expected-text { font-family: var(--font-display); }
.passiv-variants ul { margin: 4px 0 0 16px; padding: 0; }
.passiv-rationale { font-size: 14px; line-height: 1.5; }
.passiv-rationale-author {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute);
}
.ai-actions { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>
