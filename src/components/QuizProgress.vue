<script setup lang="ts">
import { computed } from 'vue'

// Renders pips at total ≤ 25; switches to a continuous meter for longer
// quizzes where individual pips would shrink to invisibility.

const props = defineProps<{
  /** Number of correct answers so far. */
  correct: number
  /** Number of wrong answers so far. */
  wrong: number
  /** Total questions in the run. */
  total: number
  /** 0-based index of the current question (the one the user is on now). */
  currentIndex: number
  /** ARIA-progressbar metadata is helpful for screen readers. */
  ariaValueNow?: number
}>()

const answered = computed(() => props.correct + props.wrong)
const remaining = computed(() => Math.max(0, props.total - answered.value))

const useMeter = computed(() => props.total > 25)

// ── Continuous meter ─────────────────────────────────────────────
const correctPct = computed(() => (props.correct / props.total) * 100)
const wrongPct = computed(() => (props.wrong / props.total) * 100)
const cursorPct = computed(() => Math.min(100, (answered.value / props.total) * 100))

// ── Pip mode ─────────────────────────────────────────────────────
interface PipState { cls: string }

const pips = computed<PipState[]>(() => {
  const out: PipState[] = []
  for (let i = 0; i < props.total; i++) {
    let cls = ''
    if (i < props.correct + props.wrong) {
      // Note: we don't know which earlier ones were correct/wrong on a per-pip
      // basis without history; the caller decides. We approximate by colouring
      // the first `correct` as done and the next `wrong` as wrong, which is
      // close enough for the small-N pip view. Callers that need per-pip
      // colouring pass history through historyPip via the slot — see below.
      cls = i < props.correct ? 'done' : 'wrong'
    } else if (i === props.currentIndex) {
      cls = 'current'
    }
    out.push({ cls })
  }
  return out
})
</script>

<template>
  <!-- Continuous meter — for runs with too many questions to render as pips. -->
  <div
    v-if="useMeter"
    class="quiz-meter"
    role="progressbar"
    :aria-valuenow="ariaValueNow ?? answered"
    :aria-valuemin="0"
    :aria-valuemax="total"
  >
    <div class="quiz-meter-track">
      <div class="quiz-meter-fill quiz-meter-fill-done" :style="{ width: correctPct + '%' }" />
      <div class="quiz-meter-fill quiz-meter-fill-wrong" :style="{ width: wrongPct + '%' }" />
      <div
        v-if="answered < total"
        class="quiz-meter-cursor"
        :style="{ left: cursorPct + '%' }"
      />
    </div>
    <div class="quiz-meter-legend">
      <span>
        <strong style="color: var(--ink); font-family: var(--font-mono); font-weight: 500;">{{ answered }}</strong>
        <span style="color: var(--mute);"> / {{ total }}</span>
      </span>
      <span class="qml-counts">
        <span class="qml-correct">✓ {{ correct }}</span>
        <span class="qml-wrong">✗ {{ wrong }}</span>
        <span>· {{ remaining }} remaining</span>
      </span>
    </div>
  </div>

  <!-- Pip bar — only renders for short runs. Caller must supply historyPip via
       the slot for per-pip correctness coloring. -->
  <div
    v-else
    class="quiz-progress-bar"
    role="progressbar"
    :aria-valuenow="ariaValueNow ?? answered"
    :aria-valuemin="0"
    :aria-valuemax="total"
  >
    <slot>
      <div v-for="(p, i) in pips" :key="i" class="pip" :class="p.cls" />
    </slot>
  </div>
</template>
