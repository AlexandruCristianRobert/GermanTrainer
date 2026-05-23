<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Noun, Gender } from '../../db/types'
import type { NounQuestion } from '../../composables/useNounQuiz'

interface Marginalia { label: string; quote: string; body: string }

const GENDER_MARGINALIA: Marginalia[] = [
  {
    label: 'BEACHTE',
    quote: 'Die meisten Wörter auf -e sind feminin.',
    body: 'Most nouns ending in -e are feminine: die Lampe, die Tür, die Schule, die Sonne, die Wolke. A handful of exceptions — der Name, das Auge — have to be memorised.'
  },
  {
    label: 'REGEL',
    quote: 'Diminutives in -chen and -lein are always neuter.',
    body: 'das Mädchen ("girl") looks like it should be feminine but isn\'t — the -chen ending overrides natural gender. Same with das Fräulein.'
  },
  {
    label: 'TIPP',
    quote: 'Learn the article with the noun, never alone.',
    body: 'German nouns are stored in memory as "der Tisch", not "Tisch". The article is part of the word. When you make a flashcard, never write the bare form.'
  },
  {
    label: 'BEACHTE',
    quote: 'Days, months, seasons, weather — almost always masculine.',
    body: 'der Montag, der Januar, der Sommer, der Regen. Time-of-day too: der Morgen, der Abend. (Exception: die Nacht.)'
  },
  {
    label: 'REGEL',
    quote: 'Endings -ung, -heit, -keit, -schaft, -ion, -tät — feminine.',
    body: 'die Wohnung, die Freiheit, die Möglichkeit, die Freundschaft, die Information, die Universität. A strong pattern that catches most abstract nouns.'
  }
]

const props = defineProps<{
  noun: Noun
  questionNumber: number
  totalQuestions: number
  history: NounQuestion[]
}>()

const emit = defineEmits<{
  (e: 'answered', correct: boolean, userAnswer: string): void
  (e: 'next'): void
  (e: 'end-quiz'): void
}>()

const picked = ref<Gender | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)
const margIdx = ref(Math.floor(Math.random() * GENDER_MARGINALIA.length))

function pick(g: Gender) {
  if (picked.value) return
  picked.value = g
  emit('answered', g === props.noun.gender, g)
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  margIdx.value = (margIdx.value + 1) % GENDER_MARGINALIA.length
  picked.value = null
  emit('next')
}

watch(() => props.questionNumber, () => { picked.value = null })

// Keyboard shortcuts: 1 = der, 2 = die, 3 = das. Ignored once an article is picked,
// when modifier keys are held, and on auto-repeat (held-down).
function onKey(e: KeyboardEvent) {
  if (picked.value) return
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (e.repeat) return
  if (e.key === '1') pick('der')
  else if (e.key === '2') pick('die')
  else if (e.key === '3') pick('das')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const isCorrect = computed(() => picked.value === props.noun.gender)

const marg = computed(() => GENDER_MARGINALIA[margIdx.value])

const pips = computed(() => {
  const out: string[] = []
  const i = props.questionNumber - 1
  for (let n = 0; n < props.totalQuestions; n++) {
    if (n < props.history.length) {
      out.push(props.history[n].isCorrect ? 'done' : 'wrong')
    } else if (n === i && picked.value) {
      out.push(isCorrect.value ? 'done' : 'wrong')
    } else if (n === i) {
      out.push('current')
    } else {
      out.push('')
    }
  }
  return out
})

const correctSoFar = computed(() => props.history.filter(h => h.isCorrect).length)
const remaining = computed(() => props.totalQuestions - props.questionNumber + (picked.value ? 0 : 1) - 1)

const buttons: Array<{ value: Gender; label: string }> = [
  { value: 'der', label: 'masculine' },
  { value: 'die', label: 'feminine' },
  { value: 'das', label: 'neuter' }
]

function btnClass(g: Gender): string {
  if (!picked.value) return ''
  if (g === props.noun.gender) return 'correct'
  if (g === picked.value) return 'wrong'
  return 'dim'
}
</script>

<template>
  <div class="quiz-stage">
    <div>
      <div class="quiz-meta">
        <span class="quiz-counter">Frage {{ questionNumber }} · von {{ totalQuestions }}</span>
        <button class="btn btn-quiet" type="button" @click="emit('end-quiz')">End quiz</button>
      </div>

      <div class="quiz-progress-bar" role="progressbar" :aria-valuenow="questionNumber" :aria-valuemin="1" :aria-valuemax="totalQuestions">
        <div v-for="(cls, i) in pips" :key="i" class="pip" :class="cls" />
      </div>

      <div class="prompt-card">
        <span class="tag prompt-group">{{ noun.group }}</span>
        <div class="prompt-german">{{ noun.german }}</div>
        <div class="prompt-english">{{ noun.english }}</div>
      </div>

      <div class="gender-row">
        <button
          v-for="b in buttons"
          :key="b.value"
          class="gender-btn"
          :class="btnClass(b.value)"
          :aria-disabled="picked !== null"
          :style="picked !== null ? 'pointer-events: none' : undefined"
          @click="pick(b.value)"
        >
          {{ b.value }}
          <span class="sub">{{ b.label }}</span>
        </button>
      </div>

      <div class="keyboard-hints" v-if="!picked">
        <span class="micro-mark">Or press <span class="kbd">1</span> <span class="kbd">2</span> <span class="kbd">3</span></span>
      </div>

      <div class="feedback-line" :class="picked ? (isCorrect ? 'correct' : 'wrong') : ''">
        <template v-if="!picked"><span class="feedback-prompt">Pick an article.</span></template>
        <template v-else-if="isCorrect">✓ Richtig.</template>
        <template v-else>✗ Richtig wäre — <strong>{{ noun.gender }}</strong> {{ noun.german }}.</template>
      </div>

      <div class="quiz-actions">
        <span class="micro-mark">Press <span class="kbd">Enter</span> to advance</span>
        <button
          ref="nextBtnRef"
          class="btn btn-accent"
          type="button"
          :disabled="!picked"
          @click="next"
          @keyup.enter="next"
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

      <div class="marg-section">
        <div class="marg-label">Score so far</div>
        <p class="score-line">
          {{ correctSoFar }}<span class="score-denom"> / {{ history.length || '0' }}</span>
        </p>
        <p class="score-sub">answered · {{ remaining }} remaining</p>
      </div>

      <div class="marg-section">
        <div class="marg-label">Legend</div>
        <div class="legend">
          <div><span class="tag tag-cobalt">der</span> <em>masculine</em></div>
          <div><span class="tag tag-clay">die</span> <em>feminine</em></div>
          <div><span class="tag tag-ochre">das</span> <em>neuter</em></div>
        </div>
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

.feedback-prompt {
  color: var(--mute);
  font-style: italic;
}

.gender-btn.dim { opacity: 0.35; }

.keyboard-hints {
  margin-top: 18px;
  text-align: center;
}
.keyboard-hints .kbd { margin: 0 2px; }

.score-line {
  margin: 0;
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 500;
  letter-spacing: -0.01em;
}
.score-denom { color: var(--mute); }
.score-sub {
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--mute);
  margin: 4px 0 0 0;
  letter-spacing: 0.06em;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}
.marg-body { margin: 0; }
</style>
