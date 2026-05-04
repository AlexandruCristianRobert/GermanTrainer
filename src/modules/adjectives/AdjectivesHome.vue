<script setup lang="ts">
import { NSpace, NCard, NGrid, NGridItem, NButton } from 'naive-ui'
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <n-space vertical size="large">
    <h2>Adjectives</h2>
    <n-grid :cols="2" :x-gap="16">
      <n-grid-item>
        <n-card title="Manage adjectives" hoverable>
          <p>Add, edit, or delete adjectives.</p>
          <n-button @click="router.push('/adjectives/manage')">Open</n-button>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="Quiz" hoverable>
          <p>AI-generated sentences with the adjective blanked out.</p>
          <n-button type="primary" @click="router.push('/adjectives/quiz')">Start quiz</n-button>
        </n-card>
      </n-grid-item>
    </n-grid>
  </n-space>
</template>
