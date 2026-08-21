<script setup lang="ts">
// Task 9 — ErkennenCard: multiple choice, 4 English options (see
// task-9-brief.md). Presentational only — `options` comes pre-picked from
// the runner's pickErkennenOptions(v, pool).
import { computed, nextTick, onMounted, ref } from 'vue'
import { clozeParts, type Vokabel } from '../../data/wortschatz'

const props = defineProps<{ vokabel: Vokabel; options: string[] }>()
const emit = defineEmits<{ (e: 'answered', outcome: 'correct' | 'wrong'): void }>()

const selected = ref<string | null>(null)
const rootRef = ref<HTMLElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

const parts = computed(() => {
  const de = props.vokabel.saetze[0]?.de ?? ''
  return clozeParts(de) ?? { before: de, blank: '', after: '' }
})

const isCorrect = computed(() => selected.value !== null && selected.value === props.vokabel.en)

function pick(opt: string) {
  if (selected.value !== null) return
  selected.value = opt
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  if (selected.value === null) return
  emit('answered', isCorrect.value ? 'correct' : 'wrong')
}

onMounted(() => {
  nextTick(() => rootRef.value?.focus())
})
</script>

<template>
  <div ref="rootRef" class="drill-stage" tabindex="-1">
    <div class="drill-prompt">
      <p class="drill-sentence">{{ vokabel.de }}</p>
      <p class="drill-caption">{{ parts.before }}<strong>{{ parts.blank }}</strong>{{ parts.after }}</p>
    </div>

    <div class="choice-row quad">
      <button
        v-for="opt in options"
        :key="opt"
        type="button"
        class="choice"
        :class="{
          selected: selected === opt,
          correct: selected !== null && opt === vokabel.en,
          wrong: selected !== null && selected === opt && opt !== vokabel.en,
          disabled: selected !== null,
        }"
        :disabled="selected !== null"
        :aria-disabled="selected !== null"
        @click="pick(opt)"
      >{{ opt }}</button>
    </div>

    <div v-if="selected !== null" class="drill-feedback">
      <p class="feedback-line" :class="isCorrect ? 'correct' : 'wrong'">
        <template v-if="isCorrect">Richtig.</template>
        <template v-else>Nicht ganz — richtig: <strong>{{ vokabel.en }}</strong></template>
      </p>
      <button ref="nextBtnRef" type="button" class="btn btn-accent drill-advance" @keydown.enter.prevent="next" @click="next">
        Weiter <span aria-hidden="true">→</span>
      </button>
    </div>
  </div>
</template>
