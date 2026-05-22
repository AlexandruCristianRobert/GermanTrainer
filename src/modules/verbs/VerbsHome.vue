<script setup lang="ts">
import { NSpace, NCard, NGrid, NGridItem, NButton } from 'naive-ui'
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <n-space vertical size="large">
    <h2>Verbs</h2>
    <n-grid cols="1 768:2" :x-gap="16" :y-gap="16">
      <n-grid-item>
        <n-card title="Browse verbs" hoverable>
          <p>Searchable list of all A1/A2 verbs with type, case, and auxiliary info.</p>
          <n-button @click="router.push('/verbs/list')">Open</n-button>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="Translation quiz" hoverable>
          <p>Type the English meaning of a German verb. "to" is optional.</p>
          <n-button type="primary" @click="router.push('/verbs/translation')">Start</n-button>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="Conjugation quiz" hoverable>
          <p>Fill in conjugations across the tenses you pick — from Präsens to Passiv.</p>
          <n-button type="primary" @click="router.push('/verbs/conjugation')">Start</n-button>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="Cheatsheet" hoverable>
          <p>Conjugation rules, common exceptions, and the dative-verb list.</p>
          <n-button @click="router.push('/verbs/cheatsheet')">Open</n-button>
        </n-card>
      </n-grid-item>
    </n-grid>
  </n-space>
</template>
