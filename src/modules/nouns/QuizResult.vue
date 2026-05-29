<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, nextTick, ref } from 'vue'
import { wrongNouns, type NounQuestion, type NounQuizMode } from '../../composables/useNounQuiz'
import { usePagination } from '../../composables/usePagination'
import Pagination from '../../components/Pagination.vue'

const props = defineProps<{
  questions: NounQuestion[]
  score: number
  total: number
  mode: NounQuizMode
}>()

const pagination = usePagination(() => props.questions, 25)

const emit = defineEmits<{ (e: 'restart'): void; (e: 'retry-wrong'): void }>()

const pct = computed(() => props.total === 0 ? 0 : Math.round((props.score / props.total) * 100))
// Derive from wrongNouns (isCorrect === false) so the "Retry N wrong" label and the
// set retryWrong() actually rebuilds share one source of truth (unanswered ≠ wrong).
const wrongCount = computed(() => wrongNouns(props.questions).length)

const summary = computed(() => {
  if (pct.value >= 80) return 'Stark. Most of these are in your bones now.'
  if (pct.value >= 50) return 'Solid. A couple weak spots to revisit.'
  return 'Keep at it — the gendered articles are the slowest to internalise.'
})

const youLabel = computed(() => props.mode === 'gender' ? 'DU · YOU' : 'DU · YOU')
const correctLabel = computed(() => props.mode === 'gender' ? 'RICHTIG' : 'EXPECTED')

function expectedAnswer(q: NounQuestion): string {
  return props.mode === 'gender' ? q.noun.gender : q.noun.english
}

// Wrong-answers modal: pops instantly when the result page loads with misses,
// grabs focus, and is keyboard-driven — Enter retries the missed nouns, Esc
// dismisses to review the list. (Shown once per round; an all-correct round
// has wrongCount === 0 and never opens it.)
const showRetryModal = ref(false)
const retryDialog = ref<HTMLElement | null>(null)

function startRetry(): void {
  if (!showRetryModal.value) return
  showRetryModal.value = false
  emit('retry-wrong')
}

function dismissModal(): void {
  showRetryModal.value = false
}

function onModalKey(e: KeyboardEvent): void {
  if (!showRetryModal.value) return
  if (e.key === 'Enter') {
    e.preventDefault()
    startRetry()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    dismissModal()
  }
}

onMounted(() => {
  if (wrongCount.value > 0) {
    showRetryModal.value = true
    window.addEventListener('keydown', onModalKey)
    nextTick(() => retryDialog.value?.focus())
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onModalKey)
})
</script>

<template>
  <div class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Ergebnis</div>
        <div class="result-score">
          {{ score }}<span class="denom"> / {{ total }}</span>
        </div>
        <p class="section-subtitle">{{ summary }}</p>
      </div>
      <div class="result-actions">
        <button
          v-if="wrongCount > 0"
          class="btn btn-accent"
          type="button"
          @click="$emit('retry-wrong')"
        >
          Retry {{ wrongCount }} wrong <span aria-hidden="true">→</span>
        </button>
        <span v-else class="all-correct-banner">Alles richtig! 🎉</span>
        <button class="btn btn-ghost" type="button" @click="$emit('restart')">Setup another</button>
      </div>
    </header>

    <div class="verb-result-summary">
      <div class="vrs-cell is-correct">
        <div class="vrs-num">{{ score }}</div>
        <div class="vrs-label">Richtig · correct</div>
      </div>
      <div class="vrs-cell is-wrong">
        <div class="vrs-num">{{ wrongCount }}</div>
        <div class="vrs-label">Falsch · missed</div>
      </div>
      <div class="vrs-cell">
        <div class="vrs-num">{{ pct }}<span class="vrs-pct-suffix">%</span></div>
        <div class="vrs-label">Quote · score</div>
      </div>
    </div>

    <Pagination :pagination="pagination" label="rows" :hide-page-size-below="25" />

    <div class="verb-result-list">
      <div
        v-for="(q, i) in pagination.slice.value"
        :key="i"
        class="verb-result-card"
        :class="q.isCorrect ? 'is-correct' : 'is-wrong'"
      >
        <div class="verb-result-num"># {{ String(pagination.start.value + i + 1).padStart(2, '0') }}</div>
        <div class="verb-result-prompt">
          <div class="vrp-german">
            <span class="prompt-gender-inline">{{ q.noun.gender }}</span> {{ q.noun.german }}
          </div>
          <div class="vrp-meta">
            <span>{{ q.noun.english }}</span><span class="vrp-dot">·</span>
            <span>{{ q.noun.group }}</span>
          </div>
        </div>

        <div class="verb-result-answers">
          <div class="verb-result-line">
            <span class="vrl-label">{{ youLabel }}</span>
            <span class="vrl-value">
              <span
                v-if="q.userAnswer"
                class="vr-stamp"
                :class="q.isCorrect ? 'vr-stamp-right' : 'vr-stamp-wrong'"
              >{{ q.userAnswer }}</span>
              <span v-else class="vr-stamp vr-stamp-empty">—</span>
            </span>
          </div>
          <div v-if="!q.isCorrect" class="verb-result-line">
            <span class="vrl-label">{{ correctLabel }}</span>
            <span class="vrl-value">
              <span class="vr-stamp vr-stamp-right">{{ expectedAnswer(q) }}</span>
            </span>
          </div>
        </div>

        <div class="verb-result-mark">{{ q.isCorrect ? '✓' : '✗' }}</div>
      </div>
    </div>

    <div v-if="showRetryModal" class="retry-modal-overlay" @click.self="dismissModal">
      <div
        ref="retryDialog"
        class="retry-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="retry-modal-title"
        tabindex="-1"
      >
        <div class="retry-modal-eyebrow">Auswertung</div>
        <h2 id="retry-modal-title" class="retry-modal-title">
          {{ wrongCount }} {{ wrongCount === 1 ? 'noun' : 'nouns' }} to nail down
        </h2>
        <p class="retry-modal-text">
          Run a focused round on just the ones you missed — repeat until they're all in your bones.
        </p>
        <div class="retry-modal-actions">
          <button class="btn btn-accent" type="button" @click="startRetry">
            Retry {{ wrongCount }} wrong <span aria-hidden="true">→</span>
          </button>
          <button class="btn btn-ghost" type="button" @click="dismissModal">Review instead</button>
        </div>
        <div class="retry-modal-hint">
          <span class="retry-kbd">Enter</span> retry · <span class="retry-kbd">Esc</span> review
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.prompt-gender-inline {
  color: var(--mute);
  font-style: italic;
  font-weight: 400;
  margin-right: 2px;
}

.vrs-pct-suffix { font-size: 18px; color: var(--mute); margin-left: 2px; }

.all-correct-banner {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 18px;
  color: var(--success);
  align-self: center;
}

/* ── Wrong-answers modal ───────────────────────────────── */
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
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }
  .retry-modal-actions { flex-direction: column; }
  .retry-modal-actions .btn { justify-content: center; }
}
</style>
