<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { AdjectiveQuestion } from '../../composables/useAdjectiveQuiz'

const props = defineProps<{
  question: AdjectiveQuestion
  questionNumber: number
  totalQuestions: number
}>()

const emit = defineEmits<{
  (e: 'answered', answer: string): void
  (e: 'next'): void
  (e: 'end-quiz'): void
}>()

const submitted = ref(false)
const input = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

function submit() {
  if (submitted.value) return
  if (!input.value.trim()) return
  submitted.value = true
  emit('answered', input.value)
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  submitted.value = false
  input.value = ''
  emit('next')
  nextTick(() => inputRef.value?.focus())
}

onMounted(() => nextTick(() => inputRef.value?.focus()))
watch(() => props.questionNumber, () => nextTick(() => inputRef.value?.focus()))

const isCorrect = computed(() => props.question.isCorrect === true)
</script>

<template>
  <div class="adj-stage">
    <div class="quiz-meta">
      <span class="quiz-counter">Frage {{ questionNumber }} · von {{ totalQuestions }}</span>
      <button class="btn btn-quiet" type="button" @click="emit('end-quiz')">End quiz</button>
    </div>

    <div class="prompt-card sentence-card">
      <span class="tag prompt-group">Adjective</span>
      <div class="sentence">{{ question.blanked }}</div>
      <div class="sentence-hint">({{ question.item.hint }})</div>
    </div>

    <form class="translation-input-wrap" @submit.prevent="submit">
      <input
        ref="inputRef"
        class="input"
        type="text"
        placeholder="Inflected adjective (e.g. schönen)"
        v-model="input"
        :readonly="submitted"
        autocomplete="off"
        spellcheck="false"
        :style="submitted ? {
          color: isCorrect ? 'var(--success)' : 'var(--danger)',
          borderBottomColor: isCorrect ? 'var(--success)' : 'var(--danger)'
        } : undefined"
      />
      <button v-if="!submitted" class="btn btn-accent" type="submit" :disabled="!input.trim()">
        Submit <span aria-hidden="true">→</span>
      </button>
    </form>

    <div class="feedback-line" :class="submitted ? (isCorrect ? 'correct' : 'wrong') : ''">
      <template v-if="!submitted"><span class="feedback-prompt">Type the inflected form. Press Enter to submit.</span></template>
      <template v-else-if="isCorrect">✓ Richtig — <strong>{{ question.item.adjective_inflected }}</strong></template>
      <template v-else>
        ✗ Korrekt — <strong>{{ question.item.adjective_inflected }}</strong>
        <span class="base-form"> (base: {{ question.item.adjective_base }})</span>
      </template>
    </div>

    <div v-if="submitted" class="full-sentence">
      <span class="micro-mark">Full sentence</span>
      <p class="full-text">{{ question.item.sentence }}</p>
    </div>

    <div class="quiz-actions">
      <span class="micro-mark">Press <span class="kbd">Enter</span> to {{ submitted ? 'advance' : 'submit' }}</span>
      <button
        v-if="submitted"
        ref="nextBtnRef"
        class="btn btn-accent"
        type="button"
        @click="next"
        @keyup.enter="next"
      >
        {{ questionNumber === totalQuestions ? 'Finish quiz' : 'Next' }}
        <span aria-hidden="true">→</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.adj-stage {
  max-width: 720px;
  margin: 0 auto;
}

.sentence-card {
  padding: 48px 24px 40px;
}
.sentence {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: var(--adjective-prompt-size, 28px);
  letter-spacing: -0.005em;
  line-height: 1.3;
  color: var(--ink);
}
.sentence-hint {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 18px;
  color: var(--ink-soft);
  margin-top: 14px;
}
@media (max-width: 720px) {
  .sentence { font-size: calc(var(--adjective-prompt-size, 28px) * 0.82); }
  .sentence-hint { font-size: 16px; }
}

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

.base-form {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--mute);
  font-style: normal;
  font-weight: 400;
}

.full-sentence {
  margin-top: 24px;
  padding: 16px 18px;
  background: var(--paper-deep);
  border-radius: 0 2px 2px 0;
  border-left: 3px solid var(--cobalt);
}
.full-text {
  margin: 6px 0 0 0;
  font-family: var(--font-body);
  font-size: 16px;
  font-style: italic;
  color: var(--ink);
}
</style>
