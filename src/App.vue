<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider } from 'naive-ui'
import NavShell from './components/NavShell.vue'
</script>

<template>
  <n-config-provider>
    <n-message-provider>
      <n-dialog-provider>
        <NavShell />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>
