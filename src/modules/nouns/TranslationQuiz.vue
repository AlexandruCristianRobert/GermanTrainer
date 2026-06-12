<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { Noun } from '../../db/types'
import type { NounQuestion } from '../../composables/useNounQuiz'
import QuizProgress from '../../components/QuizProgress.vue'

interface Marginalia { label: string; quote: string; body: string }

const TRANSLATION_MARGINALIA: Marginalia[] = [
  {
    label: 'NOTIZ',
    quote: 'Slash-separated alternatives are all accepted.',
    body: 'When a noun has multiple English meanings — "table / desk" or "house / home" — you can type either side of the slash. Whitespace and case are ignored.'
  },
  {
    label: 'BEACHTE',
    quote: 'Type the bare noun, not "the".',
    body: 'For Tisch type "table", not "the table". The English article isn\'t part of the answer.'
  },
  {
    label: 'TIPP',
    quote: 'Familiar root, unfamiliar gender — that\'s the trap.',
    body: 'Translation is easy once the noun is memorised. The hard part is recalling der/die/das on demand — try the Gender mode for that.'
  }
]

const props = defineProps<{
  noun: Noun
  questionNumber: number
  totalQuestions: number
  history?: NounQuestion[]
}>()

const emit = defineEmits<{
  (e: 'answered', correct: boolean, userAnswer: string): void
  (e: 'next'): void
  (e: 'end-quiz'): void
}>()

const correctSoFar = computed(() => {
  const h = props.history ?? []
  const here = submitted.value && isCorrect.value === true ? 1 : 0
  return h.filter(q => q.isCorrect).length + here
})
const wrongSoFar = computed(() => {
  const h = props.history ?? []
  const here = submitted.value && isCorrect.value === false ? 1 : 0
  return h.filter(q => !q.isCorrect).length + here
})

const pips = computed(() => {
  const out: string[] = []
  const i = props.questionNumber - 1
  const h = props.history ?? []
  for (let n = 0; n < props.totalQuestions; n++) {
    if (n < h.length) {
      out.push(h[n].isCorrect ? 'done' : 'wrong')
    } else if (n === i && submitted.value) {
      out.push(isCorrect.value === true ? 'done' : 'wrong')
    } else if (n === i) {
      out.push('current')
    } else {
      out.push('')
    }
  }
  return out
})

const submitted = ref(false)
const input = ref('')
const isCorrect = ref<boolean | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)
const margIdx = ref(Math.floor(Math.random() * TRANSLATION_MARGINALIA.length))

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function check(answer: string, expected: string): boolean {
  const a = normalize(answer)
  if (!a) return false
  return expected.split('/').some(seg => normalize(seg) === a)
}

function submit() {
  if (submitted.value || !input.value.trim()) return
  isCorrect.value = check(input.value, props.noun.english)
  submitted.value = true
  emit('answered', isCorrect.value, input.value)
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  margIdx.value = (margIdx.value + 1) % TRANSLATION_MARGINALIA.length
  submitted.value = false
  input.value = ''
  isCorrect.value = null
  emit('next')
  nextTick(() => inputRef.value?.focus())
}

onMounted(() => nextTick(() => inputRef.value?.focus()))
watch(() => props.questionNumber, () => nextTick(() => inputRef.value?.focus()))

const marg = computed(() => TRANSLATION_MARGINALIA[margIdx.value])
</script>

<template>
  <div class="quiz-stage">
    <div>
      <div class="quiz-meta">
        <span class="quiz-counter">Frage {{ questionNumber }} · von {{ totalQuestions }}</span>
        <button class="btn btn-quiet" type="button" @click="emit('end-quiz')">End quiz</button>
      </div>

      <QuizProgress
        :correct="correctSoFar"
        :wrong="wrongSoFar"
        :total="totalQuestions"
        :current-index="questionNumber - 1"
        :aria-value-now="questionNumber"
      >
        <div v-for="(cls, i) in pips" :key="i" class="pip" :class="cls" />
      </QuizProgress>

      <div class="prompt-card">
        <span class="tag prompt-group">{{ noun.group }}</span>
        <div class="prompt-german" :style="{ fontSize: 'var(--noun-prompt-size, 92px)' }">
          <span class="prompt-gender">{{ noun.gender }}</span> {{ noun.german }}
        </div>
      </div>

      <form class="translation-input-wrap" @submit.prevent="submit">
        <input
          ref="inputRef"
          class="input"
          type="text"
          placeholder="English meaning"
          v-model="input"
          :readonly="submitted"
          autocomplete="off"
          spellcheck="false"
          :style="submitted ? {
            color: isCorrect ? 'var(--success)' : 'var(--danger)',
            borderBottomColor: isCorrect ? 'var(--success)' : 'var(--danger)'
          } : undefined"
        />
        <button
          v-if="!submitted"
          class="btn btn-accent"
          type="submit"
          :disabled="!input.trim()"
        >
          Submit <span aria-hidden="true">→</span>
        </button>
      </form>

      <div class="feedback-line" :class="submitted ? (isCorrect ? 'correct' : 'wrong') : ''">
        <template v-if="!submitted"><span class="feedback-prompt">Type the English meaning. Press Enter to submit.</span></template>
        <template v-else-if="isCorrect">✓ Richtig.</template>
        <template v-else>✗ Korrekt — <strong>{{ noun.english }}</strong></template>
      </div>

      <div class="quiz-actions">
        <span class="micro-mark">Press <span class="kbd">Enter</span> to {{ submitted ? 'advance' : 'submit' }}</span>
        <button
          v-if="submitted"
          ref="nextBtnRef"
          class="btn btn-accent"
          type="button"
          @click="next"
        >
          {{ questionNumber === totalQuestions ? 'Finish quiz' : 'Next' }}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>

    <aside class="marginalia">
      <div class="marg-section">
        <div class="marg-label">{{ marg.label }}</div>
        <p class="marg-quote">{{ marg.quote }}</p>
        <p class="marg-body">{{ marg.body }}</p>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.prompt-group {
  position: absolute;
  top: 16px;
  left: 0;
  font-size: 10px;
}

.prompt-gender {
  color: var(--mute);
  font-style: italic;
  font-weight: 400;
  font-size: 0.5em;
  vertical-align: 0.32em;
  margin-right: 4px;
}

.feedback-prompt {
  color: var(--mute);
  font-style: italic;
}

.marg-body { margin: 0; }
</style>
