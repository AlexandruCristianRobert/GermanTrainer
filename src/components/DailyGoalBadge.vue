<script setup lang="ts">
// Fixed corner badge for the daily Fachgebiet goal (see useDailyDomainGoal).
// Mounted once in App.vue so it is visible on every page; sits BELOW the
// mobile drawer (z-index 80 < backdrop 90 / drawer 100) so the drawer covers
// it. Clicking it jumps to the sentence setup.
import { useRouter } from 'vue-router'
import { useDailyDomainGoal, DAILY_DOMAIN_GOAL_TARGET } from '../composables/useDailyDomainGoal'

const router = useRouter()
const { count, done } = useDailyDomainGoal()

function go() {
  router.push({ name: 'sentence' })
}
</script>

<template>
  <button
    type="button"
    class="goal-badge"
    :class="{ done }"
    data-print-hide
    :aria-label="`Fachgebiete heute: ${count} von ${DAILY_DOMAIN_GOAL_TARGET}`"
    @click="go"
  >
    <span class="goal-label">Fachgebiete · heute</span>
    <span class="goal-count">
      <span v-if="done" class="goal-check" aria-hidden="true">✓</span>
      {{ count }} / {{ DAILY_DOMAIN_GOAL_TARGET }}
    </span>
  </button>
</template>

<style scoped>
.goal-badge {
  position: fixed;
  right: calc(10px + env(safe-area-inset-right, 0px));
  bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  z-index: 80; /* below the drawer backdrop (90) and drawer (100) */
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  padding: 6px 12px;
  max-height: 44px;
  background: color-mix(in oklab, var(--paper) 88%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--hairline);
  border-radius: 999px;
  cursor: pointer;
  line-height: 1;
  transition: border-color .15s, color .15s;
}
.goal-badge:hover { border-color: var(--ink-soft); }

.goal-label {
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
  white-space: nowrap;
}

.goal-count {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--ink-soft);
  white-space: nowrap;
}

.goal-badge.done { border-color: color-mix(in oklab, var(--success) 55%, transparent); }
.goal-badge.done .goal-count { color: var(--success); }
.goal-badge.done .goal-check { color: var(--success); }
</style>
