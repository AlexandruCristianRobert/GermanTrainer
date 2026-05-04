<script setup lang="ts">
import { NCard, NSpace, NText, NButton, NList, NListItem, NTag } from 'naive-ui'
import type { NounQuestion, NounQuizMode } from '../../composables/useNounQuiz'

defineProps<{
  questions: NounQuestion[]
  score: number
  total: number
  mode: NounQuizMode
}>()

defineEmits<{ (e: 'restart'): void }>()
</script>

<template>
  <n-card>
    <n-space vertical size="large">
      <n-text style="font-size: 24px">Score: {{ score }} / {{ total }}</n-text>
      <n-list bordered>
        <n-list-item v-for="(q, i) in questions" :key="i">
          <n-space justify="space-between" align="center" style="width: 100%">
            <span>
              <strong>{{ q.noun.german }}</strong>
              — {{ mode === 'gender' ? `correct: ${q.noun.gender}` : `correct: ${q.noun.english}` }}
              — your answer: {{ q.userAnswer ?? '(none)' }}
            </span>
            <n-tag :type="q.isCorrect ? 'success' : 'error'">
              {{ q.isCorrect ? 'Correct' : 'Wrong' }}
            </n-tag>
          </n-space>
        </n-list-item>
      </n-list>
      <n-button type="primary" @click="$emit('restart')">Start another quiz</n-button>
    </n-space>
  </n-card>
</template>
