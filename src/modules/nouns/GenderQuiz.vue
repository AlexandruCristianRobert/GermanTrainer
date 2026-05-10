<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { NSpace, NButton, NText, NCard, NTag } from 'naive-ui'
import type { Noun } from '../../db/types'

const props = defineProps<{
  noun: Noun
  questionNumber: number
  totalQuestions: number
}>()

const emit = defineEmits<{
  (e: 'answered', correct: boolean, userAnswer: string): void
  (e: 'next'): void
}>()

const submitted = ref(false)
const userAnswer = ref<string | null>(null)
const isCorrect = ref<boolean | null>(null)
const nextButtonRef = ref<{ $el: HTMLElement } | null>(null)

const buttons: Array<'der' | 'die' | 'das'> = ['der', 'die', 'das']

function pick(g: 'der' | 'die' | 'das') {
  if (submitted.value) return
  userAnswer.value = g
  isCorrect.value = g === props.noun.gender
  submitted.value = true
  emit('answered', isCorrect.value, g)
  nextTick(() => nextButtonRef.value?.$el?.focus?.())
}

function next() {
  submitted.value = false
  userAnswer.value = null
  isCorrect.value = null
  emit('next')
}

const feedbackColor = computed(() =>
  isCorrect.value === null ? '' : isCorrect.value ? '#18a058' : '#d03050'
)
</script>

<template>
  <div class="quiz-shell">
    <n-card>
      <n-space vertical size="large" align="center">
        <n-text depth="3">Question {{ questionNumber }} of {{ totalQuestions }}</n-text>
        <div class="word-display">
          <div class="german-word">{{ noun.german }}</div>
          <div class="english-translation">{{ noun.english }}</div>
          <n-tag v-if="noun.group" size="small" :bordered="false" type="info" class="group-tag">
            {{ noun.group }}
          </n-tag>
        </div>
        <n-space size="medium" :wrap="true" justify="center">
          <n-button
            v-for="g in buttons"
            :key="g"
            size="large"
            :disabled="submitted"
            :type="submitted && g === noun.gender ? 'success' : (submitted && g === userAnswer && !isCorrect ? 'error' : 'default')"
            @click="pick(g)"
          >
            {{ g }}
          </n-button>
        </n-space>
        <n-text v-if="submitted" :style="{ color: feedbackColor }">
          {{ isCorrect ? '✅ Correct' : `❌ Correct: ${noun.gender}` }}
        </n-text>
        <n-button v-if="submitted" ref="nextButtonRef" type="primary" @click="next">Next</n-button>
      </n-space>
    </n-card>
  </div>
</template>

<style scoped>
.quiz-shell {
  max-width: 480px;
  margin: 0 auto;
}
.word-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 24px;
}
.german-word {
  font-size: 40px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.5px;
}
.english-translation {
  font-size: 16px;
  font-style: italic;
  opacity: 0.65;
}
.group-tag {
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 11px;
}
@media (max-width: 480px) {
  .german-word {
    font-size: 32px;
  }
  .word-display {
    padding: 12px 8px;
  }
}
</style>
