<script setup lang="ts">
// Task 9 — LueckeCard: typed cloze (see task-9-brief.md). Attempt state
// (hint/grade/rescue) lives in useVokabelAttempt; this component only wires
// its expected text (the cloze blank) and renders the reveal. Fix round 1,
// finding 1: `answered` fires from the „Weiter" button, never from
// finalize() itself, so the reveal always gets a render before the card
// can be advanced past.
import { computed, nextTick, ref, watch } from 'vue'
import { clozeParts, type KontextSatz, type Vokabel } from '../../data/wortschatz'
import { useVokabelAttempt } from './useVokabelAttempt'

const props = defineProps<{ vokabel: Vokabel; satz: KontextSatz }>()
const emit = defineEmits<{
  (e: 'answered', outcome: 'correct' | 'hint' | 'wrong', given: string): void
  (e: 'rescue-check', given: string, resolve: (ok: boolean) => void): void
}>()

const parts = computed(() => clozeParts(props.satz.de) ?? { before: props.satz.de, blank: '', after: '' })
const gapWidth = computed(() => `${Math.max(parts.value.blank.length, 6)}ch`)

const { given, revealedChars, pending, outcome, hintText, reasonLabel, hint, submit, inputRef } =
  useVokabelAttempt({
    vokabel: props.vokabel,
    expectedText: () => parts.value.blank,
    onRescueCheck: (g, resolve) => emit('rescue-check', g, resolve),
  })

const nextBtnRef = ref<HTMLButtonElement | null>(null)
watch(outcome, (o) => {
  if (o !== null) nextTick(() => nextBtnRef.value?.focus())
})

function advance() {
  if (outcome.value === null) return
  emit('answered', outcome.value, given.value)
}
</script>

<template>
  <div class="drill-stage">
    <div class="drill-prompt">
      <p class="drill-sentence is-compact">
        {{ parts.before }}<input
          ref="inputRef"
          v-model="given"
          class="input drill-gap-input"
          :class="{ ok: outcome === 'correct' || outcome === 'hint', err: outcome === 'wrong' }"
          :style="{ width: gapWidth }"
          type="text"
          :readonly="outcome !== null"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          @keydown.enter.prevent="submit"
        />{{ parts.after }}
      </p>
      <p class="drill-en">{{ satz.en }}</p>
    </div>

    <div v-if="outcome === null" class="type-row">
      <button
        class="btn btn-quiet"
        type="button"
        :disabled="pending || revealedChars >= 3"
        @click="hint"
      >Erster Buchstabe</button>
      <span v-if="revealedChars > 0" class="micro-mark">Hinweis: <span class="hint-chars">{{ hintText }}</span>…</span>
      <button class="btn btn-accent" type="button" :disabled="pending || !given.trim()" @click="submit">Prüfen</button>
    </div>
    <div v-if="pending" class="micro-mark">Wird geprüft…</div>

    <div v-if="outcome !== null" class="drill-feedback">
      <p class="feedback-line" :class="outcome === 'wrong' ? 'wrong' : 'correct'">
        <template v-if="outcome === 'correct'">Richtig.</template>
        <template v-else-if="outcome === 'hint'">Richtig — mit Hinweis.</template>
        <template v-else>Nicht ganz.</template>
      </p>
      <div class="reveal" :class="{ 'is-wrong': outcome === 'wrong' }">
        <div class="reveal-l">Lösung</div>
        <p class="reveal-b">{{ parts.before }}<strong>{{ parts.blank }}</strong>{{ parts.after }}</p>
        <span v-if="reasonLabel" class="tag tag-danger reason-chip">{{ reasonLabel }}</span>
      </div>
      <button ref="nextBtnRef" type="button" class="btn btn-accent drill-advance" @keydown.enter.prevent="advance" @click="advance">
        Weiter <span aria-hidden="true">→</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.drill-gap-input {
  display: inline-block;
  width: auto;
  min-width: 8em;
  max-width: 100%;
  font-family: var(--font-display);
  font-style: italic;
  font-size: inherit;
  border-bottom: 2px solid var(--accent);
  padding: 0 2px;
  color: var(--accent);
}
.drill-gap-input.ok { color: var(--success); border-bottom-color: var(--success); }
.drill-gap-input.err { color: var(--danger); border-bottom-color: var(--danger); }
.reason-chip { margin-top: 8px; display: inline-block; }
/* The hint characters are the payload of a German first-letter hint — case
   carries information (article vs. capitalized noun), so this must escape
   the surrounding .micro-mark's text-transform: uppercase. */
.hint-chars { text-transform: none; }
</style>
