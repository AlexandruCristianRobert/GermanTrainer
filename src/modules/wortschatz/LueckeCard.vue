<script setup lang="ts">
// Task 9 — LueckeCard: typed cloze (see task-9-brief.md). Local grading via
// gradeVokabelAnswer; a local miss emits 'rescue-check' and awaits the
// RUNNER's resolve (online AI rescue or immediate false) before settling the
// final verdict. „Erster Buchstabe" reveals one more character per press
// (max 3); any reveal caps a subsequent correct at outcome 'hint'.
import { computed, nextTick, onMounted, ref } from 'vue'
import { clozeParts, type KontextSatz, type Vokabel } from '../../data/wortschatz'
import { gradeVokabelAnswer, type WrongReason } from '../../composables/wortschatzGrading'

const props = defineProps<{ vokabel: Vokabel; satz: KontextSatz }>()
const emit = defineEmits<{
  (e: 'answered', outcome: 'correct' | 'hint' | 'wrong', given: string): void
  (e: 'rescue-check', given: string, resolve: (ok: boolean) => void): void
}>()

const REASON_LABEL: Record<string, string> = {
  article: 'Artikel',
  preposition: 'Präposition',
  ending: 'Endung',
}

const given = ref('')
const revealedChars = ref(0)
const pending = ref(false)
const outcome = ref<'correct' | 'hint' | 'wrong' | null>(null)
const reason = ref<WrongReason | undefined>(undefined)
const inputRef = ref<HTMLInputElement | null>(null)

const parts = computed(() => clozeParts(props.satz.de) ?? { before: props.satz.de, blank: '', after: '' })
const hinted = computed(() => revealedChars.value > 0)
const hintText = computed(() => parts.value.blank.slice(0, revealedChars.value))
const reasonLabel = computed(() => (reason.value ? REASON_LABEL[reason.value] : undefined))
/** Inline gap width, sized to the expected answer so short and long blanks both read well. */
const gapWidth = computed(() => `${Math.max(parts.value.blank.length, 6)}ch`)

function hint() {
  if (outcome.value !== null || pending.value || revealedChars.value >= 3) return
  revealedChars.value++
}

function finalize(o: 'correct' | 'hint' | 'wrong', g: string, r?: WrongReason) {
  outcome.value = o
  reason.value = o === 'wrong' ? r : undefined
  emit('answered', o, g)
}

function submit() {
  if (outcome.value !== null || pending.value || !given.value.trim()) return
  const g = given.value
  const grade = gradeVokabelAnswer(props.vokabel, parts.value.blank, g)
  if (grade.correct) {
    finalize(hinted.value ? 'hint' : 'correct', g)
    return
  }
  pending.value = true
  emit('rescue-check', g, (ok: boolean) => {
    pending.value = false
    if (ok) finalize(hinted.value ? 'hint' : 'correct', g)
    else finalize('wrong', g, grade.reason)
  })
}

onMounted(() => {
  nextTick(() => inputRef.value?.focus())
})
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
      <span v-if="revealedChars > 0" class="micro-mark">Hinweis: {{ hintText }}…</span>
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
</style>
