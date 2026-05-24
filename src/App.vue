<script setup lang="ts">
import { computed } from 'vue'
import { NConfigProvider, NMessageProvider, NDialogProvider, darkTheme } from 'naive-ui'
import NavShell from './components/NavShell.vue'
import LoadingOverlay from './components/LoadingOverlay.vue'
import ToastStack from './components/ToastStack.vue'
import { useTheme } from './composables/useTheme'

const { resolved } = useTheme()
const theme = computed(() => resolved.value === 'dark' ? darkTheme : null)
</script>

<template>
  <div class="paper-grain" aria-hidden="true" />
  <n-config-provider :theme="theme">
    <n-message-provider>
      <n-dialog-provider>
        <NavShell />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
  <LoadingOverlay />
  <ToastStack />
</template>
