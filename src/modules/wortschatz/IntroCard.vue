<script setup lang="ts">
// Task 9 — IntroCard: guess-before-reveal (pretesting effect). Purely
// presentational (props/emits only, see task-9-brief.md) — no store, no
// router, no AI. Phase 1 asks for a free guess; Phase 2 (after „Aufdecken",
// even on an empty skip) reveals the canonical form, both context sentences,
// and — display only, nothing emitted — whether the guess was right.
import { computed, nextTick, onMounted, ref } from 'vue'
import { clozeParts, type Vokabel } from '../../data/wortschatz'
import { gradeVokabelAnswer } from '../../composables/wortschatzGrading'

const props = defineProps<{ vokabel: Vokabel }>()
const emit = defineEmits<{ (e: 'done'): void }>()

const guess = ref('')
const revealed = ref(false)
const guessInputRef = ref<HTMLInputElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

const kindLabel = computed(() => (props.vokabel.kind === 'einzelwort' ? 'Einzelwort' : 'Wortverbindung'))

const guessed = computed(() => guess.value.trim() !== '')
const guessCorrect = computed(() =>
  guessed.value ? gradeVokabelAnswer(props.vokabel, props.vokabel.de, guess.value).correct : false
)

function partsOf(satzDe: string) {
  return clozeParts(satzDe) ?? { before: satzDe, blank: '', after: '' }
}

const revealSaetze = computed(() =>
  props.vokabel.saetze.map(s => ({ ...partsOf(s.de), en: s.en }))
)

function reveal() {
  if (revealed.value) return
  revealed.value = true
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  emit('done')
}

onMounted(() => {
  nextTick(() => guessInputRef.value?.focus())
})
</script>

<template>
  <div class="drill-stage">
    <div class="drill-prompt">
      <div class="micro-mark">{{ vokabel.feld }} · {{ kindLabel }}</div>
      <p class="drill-sentence">{{ vokabel.en }}</p>
    </div>

    <template v-if="!revealed">
      <div class="type-row">
        <input
          ref="guessInputRef"
          v-model="guess"
          class="input type-input"
          type="text"
          placeholder="Deine Vermutung auf Deutsch"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          @keydown.enter.prevent="reveal"
        />
        <button class="btn btn-accent" type="button" @click="reveal">Aufdecken</button>
      </div>
      <div class="drill-hint micro-mark">
        Rate frei — auch eine falsche Vermutung hilft mehr als nichts. <span class="kbd">Enter</span> zum Aufdecken
      </div>
    </template>

    <template v-else>
      <div class="drill-feedback">
        <p v-if="guessed" class="feedback-line" :class="guessCorrect ? 'correct' : 'wrong'">
          Deine Vermutung „{{ guess }}“ war {{ guessCorrect ? 'richtig' : 'nicht ganz richtig' }}.
        </p>
        <div class="reveal">
          <div class="reveal-l">Antwort</div>
          <p class="reveal-t">
            {{ vokabel.de }}
            <span v-if="vokabel.plural" class="micro-mark">· Plural: {{ vokabel.plural }}</span>
            <span v-if="vokabel.rektion" class="micro-mark">· {{ vokabel.rektion }}</span>
          </p>
          <div v-for="(s, i) in revealSaetze" :key="i" class="intro-context">
            <p class="reveal-b">{{ s.before }}<strong>{{ s.blank }}</strong>{{ s.after }}</p>
            <p class="drill-en">{{ s.en }}</p>
          </div>
        </div>
        <button ref="nextBtnRef" type="button" class="btn btn-accent drill-advance" @keydown.enter.prevent="next" @click="next">
          Weiter <span aria-hidden="true">→</span>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.intro-context + .intro-context { margin-top: 12px; }
</style>
