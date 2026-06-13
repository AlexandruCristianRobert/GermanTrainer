<script setup lang="ts">
import { useRouteProgress } from '../composables/useRouteProgress'
const progress = useRouteProgress()
</script>

<template>
  <Teleport to="body">
    <Transition name="rp-fade">
      <div v-if="progress.visible.value" class="route-progress" role="status" aria-hidden="true">
        <div class="route-progress-bar" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.route-progress {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 3px;
  z-index: 900;
  overflow: hidden;
  background: transparent;
}
.route-progress-bar {
  height: 100%;
  width: 40%;
  background: var(--accent);
  border-radius: 0 2px 2px 0;
  animation: rp-trickle 1.1s ease-in-out infinite;
}
@keyframes rp-trickle {
  0%   { margin-left: -45%; width: 45%; }
  50%  { width: 60%; }
  100% { margin-left: 100%; width: 45%; }
}
.rp-fade-leave-active { transition: opacity 0.25s ease; }
.rp-fade-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .route-progress-bar { animation: none; width: 100%; opacity: 0.6; }
}
</style>
