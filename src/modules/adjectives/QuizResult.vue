<script setup lang="ts">
import { NCard, NSpace, NText, NButton, NList, NListItem, NTag } from 'naive-ui'
import type { AdjectiveQuestion } from '../../composables/useAdjectiveQuiz'

defineProps<{
  questions: AdjectiveQuestion[]
  score: number
  total: number
}>()

defineEmits<{ (e: 'restart'): void }>()
</script>

<template>
  <n-card>
    <n-space vertical size="large">
      <n-text style="font-size: 24px">Score: {{ score }} / {{ total }}</n-text>
      <n-list bordered>
        <n-list-item v-for="(q, i) in questions" :key="i">
          <n-space vertical style="width: 100%">
            <n-space justify="space-between">
              <strong>{{ q.item.sentence }}</strong>
              <n-tag :type="q.isCorrect ? 'success' : 'error'">
                {{ q.isCorrect ? 'Correct' : 'Wrong' }}
              </n-tag>
            </n-space>
            <n-text depth="3">
              Your answer: {{ q.userAnswer ?? '(none)' }} —
              correct: <strong>{{ q.item.adjective_inflected }}</strong> (base: {{ q.item.adjective_base }})
            </n-text>
          </n-space>
        </n-list-item>
      </n-list>
      <n-button type="primary" @click="$emit('restart')">Start another quiz</n-button>
    </n-space>
  </n-card>
</template>
