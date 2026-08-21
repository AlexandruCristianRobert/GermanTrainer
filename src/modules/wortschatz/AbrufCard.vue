<script setup lang="ts">
// Task 9 — AbrufCard: cued production of the full canonical form (see
// task-9-brief.md). Same local-grade → rescue-check → verdict flow as
// LueckeCard, but the expected answer is the canonical v.de itself (no
// context sentence). Rektion is revealed only after the verdict, never
// before — showing it upfront would give the governance away.
import { computed, nextTick, onMounted, ref } from 'vue'
import type { Vokabel } from '../../data/wortschatz'
import { gradeVokabelAnswer, type WrongReason } from '../../composables/wortschatzGrading'

const props = defineProps<{ vokabel: Vokabel }>()
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

const kindLabel = computed(() => (props.vokabel.kind === 'einzelwort' ? 'Einzelwort' : 'Wortverbindung'))
const isArticleNoun = computed(() => /^(der|die|das)\s/.test(props.vokabel.de))
const hinted = computed(() => revealedChars.value > 0)
const hintText = computed(() => props.vokabel.de.slice(0, revealedChars.value))
const reasonLabel = computed(() => (reason.value ? REASON_LABEL[reason.value] : undefined))

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
  const grade = gradeVokabelAnswer(props.vokabel, props.vokabel.de, g)
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
      <span v-if="revealedChars > 0" class="micro-mark">Hinweis: {{ hintText }}…</span>
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
        <p v-if="vokabel.rektion" class="reveal-b">Rektion: {{ vokabel.rektion }}</p>
        <span v-if="reasonLabel" class="tag tag-danger reason-chip">{{ reasonLabel }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reason-chip { margin-top: 8px; display: inline-block; }
</style>
