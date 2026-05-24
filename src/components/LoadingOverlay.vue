<script setup lang="ts">
import { useLoading } from '../composables/useLoading'

const loading = useLoading()
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="loading.active.value" class="loading-overlay" role="status" aria-live="polite">
        <div class="loading-card">
          <div class="loading-spinner" aria-hidden="true">
            <div class="loading-dot loading-dot-1" />
            <div class="loading-dot loading-dot-2" />
            <div class="loading-dot loading-dot-3" />
          </div>
          <div class="loading-text">
            <h2 class="loading-title">{{ loading.state.value?.title }}<em>.</em></h2>
            <p v-if="loading.state.value?.subtitle" class="loading-subtitle">
              {{ loading.state.value.subtitle }}
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  background: color-mix(in oklab, var(--paper) 80%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 24px;
}

.loading-card {
  background: var(--paper-card);
  border: 1px solid var(--hairline);
  border-radius: 4px;
  padding: 36px 40px;
  max-width: 420px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 60px -28px rgba(20, 17, 10, 0.35);
}

.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
  height: 16px;
}

.loading-dot {
  width: 10px;
  height: 10px;
  background: var(--accent);
  border-radius: 50%;
  animation: loading-pulse 1.2s ease-in-out infinite;
}
.loading-dot-2 { animation-delay: 0.18s; }
.loading-dot-3 { animation-delay: 0.36s; }

@keyframes loading-pulse {
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
  40% { opacity: 1; transform: scale(1); }
}

.loading-text { color: var(--ink); }

.loading-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 22px;
  letter-spacing: -0.005em;
  margin: 0 0 8px 0;
  color: var(--ink);
}
.loading-title em {
  color: var(--accent);
  font-style: italic;
  font-weight: 400;
}

.loading-subtitle {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 14.5px;
  line-height: 1.5;
  color: var(--ink-soft);
  margin: 0;
  max-width: 320px;
  margin-left: auto;
  margin-right: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .loading-dot { animation: none; opacity: 0.7; }
  .fade-enter-active, .fade-leave-active { transition: none; }
}

@media (max-width: 480px) {
  .loading-card { padding: 28px 24px; }
  .loading-title { font-size: 19px; }
}
</style>
