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
  background: var(--sage-tint);
  padding: 0 3px;
  border-radius: 2px;
  margin: 0 1px;
  cursor: help;
  animation: pulse 0.5s ease-out 0.4s 1 both;
  display: inline-block;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .vowel-shift { animation: none; }
}
</style>
