<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { NSpace, NButton, NText, NCard, NInput } from 'naive-ui'
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
const input = ref('')
const isCorrect = ref<boolean | null>(null)
const inputRef = ref<InstanceType<typeof NInput> | null>(null)
const nextButtonRef = ref<{ $el: HTMLElement } | null>(null)

function check(answer: string, expected: string): boolean {
  const a = answer.trim().toLowerCase()
  if (a.length === 0) return false
  return expected.split('/').some(seg => seg.trim().toLowerCase() === a)
}

function submit() {
  if (submitted.value) return
  if (!input.value.trim()) return
  isCorrect.value = check(input.value, props.noun.english)
  submitted.value = true
  emit('answered', isCorrect.value, input.value)
  nextTick(() => nextButtonRef.value?.$el?.focus?.())
}

function next() {
  submitted.value = false
  input.value = ''
  isCorrect.value = null
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
  isCorrect.value === null ? '' : isCorrect.value ? '#18a058' : '#d03050'
)
</script>

<template>
  <n-card>
    <n-space vertical size="large" align="center">
      <n-text>Question {{ questionNumber }} of {{ totalQuestions }}</n-text>
      <n-text style="font-size: 32px">{{ noun.gender }} {{ noun.german }}</n-text>
      <n-input
        ref="inputRef"
        v-model:value="input"
        :disabled="submitted"
        placeholder="English meaning"
        style="width: 280px"
        @keyup.enter="submit"
      />
      <n-button v-if="!submitted" type="primary" :disabled="!input.trim()" @click="submit">Submit</n-button>
      <n-text v-if="submitted" :style="{ color: feedbackColor }">
        {{ isCorrect ? '✅ Correct' : `❌ Correct: ${noun.english}` }}
      </n-text>
      <n-button v-if="submitted" ref="nextButtonRef" type="primary" @click="next">Next</n-button>
    </n-space>
  </n-card>
</template>
