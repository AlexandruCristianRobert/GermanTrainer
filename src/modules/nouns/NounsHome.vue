<script setup lang="ts">
import { NSpace, NCard, NGrid, NGridItem, NButton } from 'naive-ui'
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <n-space vertical size="large">
    <h2>Nouns</h2>
    <n-grid :cols="2" :x-gap="16">
      <n-grid-item>
        <n-card title="Manage nouns" hoverable>
          <p>Add, edit, or delete nouns. Reset to defaults from the seed list.</p>
          <n-button @click="router.push('/nouns/manage')">Open</n-button>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="Quiz" hoverable>
          <p>Pick gender or translation mode and quiz yourself on N random nouns.</p>
          <n-button type="primary" @click="router.push('/nouns/quiz')">Start quiz</n-button>
        </n-card>
      </n-grid-item>
    </n-grid>
  </n-space>
</template>
