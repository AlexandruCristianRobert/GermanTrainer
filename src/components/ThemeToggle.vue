<script setup lang="ts">
import { computed } from 'vue'
import { NButton } from 'naive-ui'
import { useTheme } from '../composables/useTheme'

const { resolved, toggle } = useTheme()
const isDark = computed(() => resolved.value === 'dark')
const label = computed(() =>
  isDark.value ? 'Switch to light theme' : 'Switch to dark theme'
)
</script>

<template>
  <n-button
    quaternary
    circle
    :aria-label="label"
    class="theme-toggle"
    @click="toggle"
  >
    <span class="theme-toggle-icon" :class="{ 'is-dark': isDark }">
      <span class="icon-sun" aria-hidden="true">☀</span>
      <span class="icon-moon" aria-hidden="true">☾</span>
    </span>
  </n-button>
</template>

<style scoped>
.theme-toggle-icon {
  position: relative;
  display: inline-block;
  width: 18px;
  height: 18px;
  font-size: 16px;
  line-height: 1;
  transition: transform 300ms ease-out;
}
.theme-toggle-icon.is-dark { transform: rotate(270deg); }

.icon-sun, .icon-moon {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  transition: opacity 200ms ease;
}
.icon-sun  { opacity: 1; }
.icon-moon { opacity: 0; transform: rotate(-270deg); }
.theme-toggle-icon.is-dark .icon-sun  { opacity: 0; }
.theme-toggle-icon.is-dark .icon-moon { opacity: 1; }

@media (prefers-reduced-motion: reduce) {
  .theme-toggle-icon { transition: none; }
  .icon-sun, .icon-moon { transition: none; }
}
</style>
