<script setup lang="ts">
import { NLayout, NLayoutHeader, NLayoutContent, NMenu, NSpace, NText } from 'naive-ui'
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'

const router = useRouter()
const route = useRoute()

const items = [
  { label: 'Home', key: 'home' },
  { label: 'Nouns', key: 'nouns' },
  { label: 'Adjectives', key: 'adjectives' },
  { label: 'Settings', key: 'settings' }
]

const activeKey = computed(() => (route.name as string) ?? 'home')

function onSelect(key: string) {
  router.push({ name: key })
}
</script>

<template>
  <n-layout style="height: 100vh">
    <n-layout-header bordered style="padding: 12px 24px">
      <n-space justify="space-between" align="center">
        <n-text strong style="font-size: 18px">German Trainer</n-text>
        <n-menu
          mode="horizontal"
          :options="items"
          :value="activeKey"
          @update:value="onSelect"
        />
      </n-space>
    </n-layout-header>
    <n-layout-content content-style="padding: 24px">
      <router-view />
    </n-layout-content>
  </n-layout>
</template>
