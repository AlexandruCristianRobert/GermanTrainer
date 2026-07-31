<script setup lang="ts">
// Port of the React `LevelChip` component (drill-bits.jsx): a small level
// badge, gaining the ochre `.is-ai` treatment when the drill is AI-graded.

defineProps<{
  level: string
  ai?: boolean
}>()
</script>

<template>
  <span class="lvl-chip" :class="{ 'is-ai': ai }">{{ ai ? `KI · ${level}` : level }}</span>
</template>
