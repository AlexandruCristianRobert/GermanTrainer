<script setup lang="ts">
// Task 9 — AbrufCard: cued production of the full canonical form (see
// task-9-brief.md). Same attempt state machine as LueckeCard, shared via
// useVokabelAttempt; the expected text here is the canonical v.de itself.
// Rektion is revealed only after the verdict, never before — showing it
// upfront would give the governance away. Fix round 1, finding 1: `answered`
// fires from „Weiter", not from finalize().
import { computed, nextTick, ref, watch } from 'vue'
import type { Vokabel } from '../../data/wortschatz'
import { useVokabelAttempt } from './useVokabelAttempt'

const props = defineProps<{ vokabel: Vokabel }>()
const emit = defineEmits<{
  (e: 'answered', outcome: 'correct' | 'hint' | 'wrong', given: string): void
  (e: 'rescue-check', given: string, resolve: (ok: boolean) => void): void
}>()

const kindLabel = computed(() => (props.vokabel.kind === 'einzelwort' ? 'Einzelwort' : 'Wortverbindung'))
const isArticleNoun = computed(() => /^(der|die|das)\s/.test(props.vokabel.de))

const { given, revealedChars, pending, outcome, hintText, reasonLabel, hint, submit, inputRef } =
  useVokabelAttempt({
    vokabel: props.vokabel,
    expectedText: () => props.vokabel.de,
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
      <div class="micro-mark">{{ kindLabel }}<template v-if="isArticleNoun"> · Nomen: mit Artikel</template></div>
      <p class="drill-sentence">{{ vokabel.en }}</p>
    </div>

    <div class="type-row">
      <input
        ref="inputRef"
        v-model="given"
        class="input type-input"
        :class="{ ok: outcome === 'correct' || outcome === 'hint', err: outcome === 'wrong' }"
        type="text"
        placeholder="Auf Deutsch"
        :readonly="outcome !== null"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        @keydown.enter.prevent="submit"
      />
      <button v-if="outcome === null" class="btn btn-accent" type="button" :disabled="pending || !given.trim()" @click="submit">Prüfen</button>
    </div>
    <div v-if="outcome === null" class="type-row">
      <button
        class="btn btn-quiet"
        type="button"
        :disabled="pending || revealedChars >= 3"
        @click="hint"
      >Erster Buchstabe</button>
      <span v-if="revealedChars > 0" class="micro-mark">Hinweis: <span class="hint-chars">{{ hintText }}</span>…</span>
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
        <p class="reveal-t">{{ vokabel.de }}</p>
        <p v-if="vokabel.rektion" class="reveal-b"><span class="micro-mark">Rektion</span> {{ vokabel.rektion }}</p>
        <span v-if="reasonLabel" class="tag tag-danger reason-chip">{{ reasonLabel }}</span>
      </div>
      <button ref="nextBtnRef" type="button" class="btn btn-accent drill-advance" @keydown.enter.prevent="advance" @click="advance">
        Weiter <span aria-hidden="true">→</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.reason-chip { margin-top: 8px; display: inline-block; }
.hint-chars { text-transform: none; }
.reveal-b .micro-mark { margin-right: 6px; }
</style>
