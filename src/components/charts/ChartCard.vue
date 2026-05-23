<script setup lang="ts">
defineProps<{
  mark?: string
  title: string
  subtitle?: string
  rightSlotLabel?: string
}>()
</script>

<template>
  <section class="chart-card">
    <header class="chart-card-head">
      <div class="chart-card-head-text">
        <div v-if="mark" class="chart-card-mark">{{ mark }}</div>
        <h3 class="chart-card-title">{{ title }}</h3>
        <p v-if="subtitle" class="chart-card-sub">{{ subtitle }}</p>
      </div>
      <slot name="right" />
    </header>
    <slot />
  </section>
</template>
