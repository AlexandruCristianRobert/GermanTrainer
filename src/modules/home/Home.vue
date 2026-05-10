<script setup lang="ts">
import { NCard, NGrid, NGridItem, NButton, NSpace, NText } from 'naive-ui'
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <n-space vertical size="large">
    <n-text style="font-size: 22px">Practice German vocabulary</n-text>
    <n-grid cols="1 768:2 1024:3" :x-gap="16" :y-gap="16">
      <n-grid-item>
        <n-card title="Nouns" hoverable>
          <p>Quiz the gender (der/die/das) or English translation of German nouns.</p>
          <n-button type="primary" @click="router.push('/nouns')">Open</n-button>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="Adjectives" hoverable>
          <p>Fill-in-the-blank quiz with AI-generated German sentences.</p>
          <n-button type="primary" @click="router.push('/adjectives')">Open</n-button>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="Settings" hoverable>
          <p>Set your Gemini API key and pick a model.</p>
          <n-button @click="router.push('/settings')">Open</n-button>
        </n-card>
      </n-grid-item>
    </n-grid>
  </n-space>
</template>
