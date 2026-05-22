<script setup lang="ts">
import { NCard, NSpace, NText, NButton, NList, NListItem, NTag } from 'naive-ui'

interface RecapItem {
  german: string
  expected: string
  userAnswer: string
  isCorrect: boolean
}

defineProps<{
  score: number
  total: number
  scoreLabel?: string
  recap: RecapItem[]
}>()

defineEmits<{ (e: 'restart'): void }>()
</script>

<template>
  <n-card>
    <n-space vertical size="large">
      <n-text style="font-size: 24px">{{ scoreLabel ?? `Score: ${score} / ${total}` }}</n-text>
      <n-list bordered>
        <n-list-item v-for="(r, i) in recap" :key="i">
          <n-space justify="space-between" align="center" style="width: 100%">
            <span>
              <strong>{{ r.german }}</strong> — correct: {{ r.expected }}
              — your answer: {{ r.userAnswer || '(none)' }}
            </span>
            <n-tag :type="r.isCorrect ? 'success' : 'error'">{{ r.isCorrect ? 'Correct' : 'Wrong' }}</n-tag>
          </n-space>
        </n-list-item>
      </n-list>
      <n-button type="primary" @click="$emit('restart')">Start another quiz</n-button>
    </n-space>
  </n-card>
</template>
