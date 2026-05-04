<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { NCard, NSpace, NText, NInput, NButton } from 'naive-ui'
import type { AdjectiveQuestion } from '../../composables/useAdjectiveQuiz'

const props = defineProps<{
  question: AdjectiveQuestion
  questionNumber: number
  totalQuestions: number
}>()

const emit = defineEmits<{
  (e: 'answered', answer: string): void
  (e: 'next'): void
}>()

const submitted = ref(false)
const input = ref('')
const inputRef = ref<InstanceType<typeof NInput> | null>(null)
const nextButtonRef = ref<{ $el: HTMLElement } | null>(null)

function submit() {
  if (submitted.value) return
  if (!input.value.trim()) return
  submitted.value = true
  emit('answered', input.value)
  nextTick(() => nextButtonRef.value?.$el?.focus?.())
}

function next() {
  submitted.value = false
  input.value = ''
  emit('next')
  nextTick(() => inputRef.value?.focus())
}

onMounted(() => {
  nextTick(() => inputRef.value?.focus())
})

watch(() => props.questionNumber, () => {
  nextTick(() => inputRef.value?.focus())
})

const feedbackColor = computed(() =>
  !submitted.value ? '' : props.question.isCorrect ? '#18a058' : '#d03050'
)
</script>

<template>
  <n-card>
    <n-space vertical size="large">
      <n-text>Question {{ questionNumber }} of {{ totalQuestions }}</n-text>
      <n-text style="font-size: 22px">{{ question.blanked }}</n-text>
      <n-text depth="3" italic>({{ question.item.hint }})</n-text>
      <n-input
        ref="inputRef"
        v-model:value="input"
        :disabled="submitted"
        placeholder="adjective"
        style="width: 280px"
        @keyup.enter="submit"
      />
      <n-button v-if="!submitted" type="primary" :disabled="!input.trim()" @click="submit">Submit</n-button>
      <n-text v-if="submitted" :style="{ color: feedbackColor }">
        {{ question.isCorrect
          ? '✅ Correct'
          : `❌ Correct: ${question.item.adjective_inflected} (base: ${question.item.adjective_base})` }}
      </n-text>
      <n-text v-if="submitted" depth="3">Full sentence: {{ question.item.sentence }}</n-text>
      <n-button v-if="submitted" ref="nextButtonRef" type="primary" @click="next">Next</n-button>
    </n-space>
  </n-card>
</template>
