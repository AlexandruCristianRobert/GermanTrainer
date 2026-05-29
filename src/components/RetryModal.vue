<script setup lang="ts">
import { onMounted, onBeforeUnmount, nextTick, ref } from 'vue'

// Shared "retry the ones you got wrong" modal. Auto-opens (focused) the moment
// it mounts if there are wrong answers, and is keyboard-driven: Enter retries,
// Esc dismisses to review. Each quiz result re-mounts it per round, so it
// re-offers after every retry round and disappears once nothing is wrong.
const props = defineProps<{
  wrongCount: number
  /** Plural noun for the modal title, e.g. "nouns", "prepositions", "sentences". */
  itemLabel?: string
}>()

const emit = defineEmits<{ (e: 'retry'): void; (e: 'dismiss'): void }>()

const open = ref(false)
const dialog = ref<HTMLElement | null>(null)

function retry(): void {
  if (!open.value) return
  open.value = false
  emit('retry')
}

function dismiss(): void {
  if (!open.value) return
  open.value = false
  emit('dismiss')
}

function onKey(e: KeyboardEvent): void {
  if (!open.value) return
  if (e.key === 'Enter') {
    e.preventDefault()
    retry()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    dismiss()
  }
}

onMounted(() => {
  if (props.wrongCount > 0) {
    open.value = true
    window.addEventListener('keydown', onKey)
    nextTick(() => dialog.value?.focus())
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div v-if="open" class="retry-modal-overlay" @click.self="dismiss">
    <div
      ref="dialog"
      class="retry-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="retry-modal-title"
      tabindex="-1"
    >
      <div class="retry-modal-eyebrow">Auswertung</div>
      <h2 id="retry-modal-title" class="retry-modal-title">
        {{ wrongCount }} {{ itemLabel || 'answers' }} to nail down
      </h2>
      <p class="retry-modal-text">
        Run a focused round on just the ones you missed — repeat until they're all in your bones.
      </p>
      <div class="retry-modal-actions">
        <button class="btn btn-accent" type="button" @click="retry">
          Retry {{ wrongCount }} wrong <span aria-hidden="true">→</span>
        </button>
        <button class="btn btn-ghost" type="button" @click="dismiss">Review instead</button>
      </div>
      <div class="retry-modal-hint">
        <span class="retry-kbd">Enter</span> retry · <span class="retry-kbd">Esc</span> review
      </div>
    </div>
  </div>
</template>

<style scoped>
.retry-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
}
.retry-modal {
  width: 100%;
  max-width: 440px;
  padding: 32px;
  text-align: center;
  background: var(--paper-card, var(--paper, #fff));
  border: 1px solid var(--rule);
  border-radius: 4px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
  outline: none;
}
.retry-modal:focus-visible { outline: 1px dotted var(--rule); outline-offset: 6px; }
.retry-modal-eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
}
.retry-modal-title {
  font-family: var(--font-display);
  font-size: 26px;
  line-height: 1.2;
  color: var(--ink);
  margin: 10px 0 8px;
}
.retry-modal-text {
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--ink-soft);
  margin: 0 0 24px;
}
.retry-modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
.retry-modal-hint {
  margin-top: 20px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--mute);
}
.retry-kbd {
  display: inline-block;
  padding: 1px 6px;
  font-size: 10px;
  color: var(--ink-soft);
  background: var(--paper);
  border: 1px solid var(--hairline, var(--rule));
  border-radius: 2px;
}

@media (max-width: 720px) {
  .retry-modal-actions { flex-direction: column; }
  .retry-modal-actions .btn { justify-content: center; }
}
</style>
