<script setup lang="ts">
import { useToast } from '../composables/useToast'

const toast = useToast()

function iconFor(variant: 'info' | 'success' | 'error'): string {
  if (variant === 'success') return '✓'
  if (variant === 'error') return '✗'
  return 'i'
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-stack" role="region" aria-label="Notifications">
      <TransitionGroup name="toast-slide">
        <div
          v-for="t in toast.items.value"
          :key="t.id"
          class="toast"
          :class="`toast-${t.variant}`"
          role="alert"
        >
          <div class="toast-icon" aria-hidden="true">{{ iconFor(t.variant) }}</div>
          <div class="toast-body">
            <div class="toast-title">{{ t.title }}</div>
            <div v-if="t.description" class="toast-description">{{ t.description }}</div>
          </div>
          <button
            type="button"
            class="toast-close"
            :aria-label="`Dismiss ${t.title}`"
            @click="toast.dismiss(t.id)"
          >×</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
  max-width: calc(100vw - 32px);
  width: 380px;
}

.toast {
  pointer-events: auto;
  display: grid;
  grid-template-columns: 28px 1fr auto;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px 14px 18px;
  background: var(--paper-card);
  border: 1px solid var(--hairline);
  border-radius: 4px;
  border-left-width: 4px;
  box-shadow: 0 12px 36px -16px rgba(20, 17, 10, 0.3);
}

.toast-info { border-left-color: var(--cobalt); }
.toast-success { border-left-color: var(--success); }
.toast-error { border-left-color: var(--danger); }

.toast-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 14px;
  line-height: 1;
  color: var(--paper);
  flex-shrink: 0;
  margin-top: 1px;
}
.toast-info .toast-icon { background: var(--cobalt); }
.toast-success .toast-icon { background: var(--success); }
.toast-error .toast-icon { background: var(--danger); }
[data-theme="dark"] .toast-info .toast-icon,
[data-theme="dark"] .toast-success .toast-icon,
[data-theme="dark"] .toast-error .toast-icon { color: #15130E; }

.toast-body { min-width: 0; }

.toast-title {
  font-family: var(--font-body);
  font-weight: 500;
  font-size: 14.5px;
  line-height: 1.35;
  color: var(--ink);
}
.toast-info .toast-title { color: var(--cobalt); }
.toast-success .toast-title { color: var(--success); }
.toast-error .toast-title { color: var(--danger); }

.toast-description {
  margin-top: 4px;
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13px;
  line-height: 1.45;
  color: var(--ink-soft);
  overflow-wrap: anywhere;
}

.toast-close {
  background: transparent;
  border: 0;
  font-family: var(--font-display);
  font-size: 22px;
  line-height: 1;
  color: var(--mute);
  cursor: pointer;
  padding: 0 4px;
  height: 24px;
  margin-top: 1px;
  transition: color .15s;
}
.toast-close:hover { color: var(--ink); }

/* Slide-in from the right; fade-out */
.toast-slide-enter-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}
.toast-slide-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}
.toast-slide-enter-from {
  transform: translateX(20px);
  opacity: 0;
}
.toast-slide-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .toast-slide-enter-active, .toast-slide-leave-active { transition: opacity 0.15s ease; }
  .toast-slide-enter-from, .toast-slide-leave-to { transform: none; }
}

@media (max-width: 480px) {
  .toast-stack {
    top: auto;
    bottom: 16px;
    right: 16px;
    left: 16px;
    width: auto;
  }
}
</style>
