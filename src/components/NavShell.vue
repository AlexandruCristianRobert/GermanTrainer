<script setup lang="ts">
import { computed, ref } from 'vue'
import { NLayout, NLayoutHeader, NLayoutContent, NMenu, NSpace, NText, NButton, NDrawer } from 'naive-ui'
import { useRouter, useRoute } from 'vue-router'
import { useBreakpoint } from '../composables/useBreakpoint'

const router = useRouter()
const route = useRoute()
const { isMobile } = useBreakpoint()

const drawerOpen = ref(false)

const items = [
  { label: 'Home', key: 'home' },
  { label: 'Nouns', key: 'nouns' },
  { label: 'Adjectives', key: 'adjectives' },
  { label: 'Settings', key: 'settings' }
]

const activeKey = computed(() => (route.name as string) ?? 'home')

function onSelect(key: string) {
  router.push({ name: key })
  drawerOpen.value = false
}

const headerStyle = computed(() =>
  isMobile.value ? 'padding: 12px 16px' : 'padding: 12px 24px'
)
const titleStyle = computed(() =>
  isMobile.value ? 'font-size: 16px' : 'font-size: 18px'
)
const contentStyle = computed(() =>
  isMobile.value ? 'padding: 12px' : 'padding: 24px'
)
</script>

<template>
  <n-layout style="height: 100vh">
    <n-layout-header bordered :style="headerStyle">
      <n-space justify="space-between" align="center" :wrap="false">
        <n-space align="center" :size="8" :wrap="false">
          <n-button
            v-if="isMobile"
            quaternary
            size="small"
            aria-label="Open menu"
            @click="drawerOpen = true"
          >
            ☰
          </n-button>
          <n-text strong :style="titleStyle">German Trainer</n-text>
        </n-space>
        <n-menu
          v-if="!isMobile"
          mode="horizontal"
          :options="items"
          :value="activeKey"
          @update:value="onSelect"
        />
      </n-space>
    </n-layout-header>
    <n-layout-content :content-style="contentStyle">
      <router-view />
    </n-layout-content>
    <n-drawer v-model:show="drawerOpen" :width="260" placement="left">
      <n-menu
        mode="vertical"
        :options="items"
        :value="activeKey"
        @update:value="onSelect"
      />
    </n-drawer>
  </n-layout>
</template>
