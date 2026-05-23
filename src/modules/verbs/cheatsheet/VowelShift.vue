<script setup lang="ts">
defineProps<{ from?: string }>()
</script>

<template>
  <span class="vowel-shift" :title="from">
    <slot />
  </span>
</template>

<style scoped>
.vowel-shift {
  color: var(--sage);
  font-weight: 600;
  border-bottom: 1px dotted var(--sage);
  cursor: help;
  animation: pulse 0.5s ease-out 0.4s 1 both;
  display: inline-block;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
</style>
