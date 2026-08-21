<script setup lang="ts">
// Task 9 — AnwendungCard: free production, AI-graded by the RUNNER (see
// task-9-brief.md). This card never grades anything itself — it only emits
// 'submit' with the typed sentence and displays whatever `grading`/`result`
// the runner hands back. A 5-word client-side floor keeps obviously
// unusable answers from round-tripping to the AI.
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { Vokabel } from '../../data/wortschatz'

const props = defineProps<{
  vokabel: Vokabel
  grading: boolean
  result: { correct: boolean; feedback: string; korrektur?: string } | null
}>()
const emit = defineEmits<{ (e: 'submit', sentence: string): void; (e: 'next'): void }>()

const sentence = ref('')
const submittedLocally = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

const wordCount = computed(() => sentence.value.trim().split(/\s+/).filter(Boolean).length)
const canSubmit = computed(() => wordCount.value >= 5 && !props.grading && !props.result && !submittedLocally.value)

function submit() {
  if (!canSubmit.value) return
  submittedLocally.value = true
  emit('submit', sentence.value.trim())
}

function next() {
  emit('next')
}

onMounted(() => {
  nextTick(() => textareaRef.value?.focus())
})

watch(
  () => props.result,
  (r) => {
    if (r) nextTick(() => nextBtnRef.value?.focus())
  }
)
</script>

<template>
  <div class="drill-stage">
    <div class="drill-prompt">
      <p class="drill-sentence is-compact">Schreiben Sie einen eigenen Satz mit „{{ vokabel.de }}“.</p>
    </div>

    <div v-if="grading" class="alert alert-info">
      <span class="alert-label">Bewertung</span>
      Dein Satz wird geprüft. Einen Moment…
    </div>

    <div v-else-if="result" class="drill-feedback">
      <p class="feedback-line" :class="result.correct ? 'correct' : 'wrong'">
        {{ result.correct ? 'Richtig verwendet.' : 'Noch nicht ganz.' }}
      </p>
      <div class="reveal" :class="{ 'is-wrong': !result.correct }">
        <p class="reveal-b">{{ result.feedback }}</p>
        <div v-if="!result.correct && result.korrektur" class="reveal-fix">
          <span class="reveal-l">Besser</span> {{ result.korrektur }}
        </div>
      </div>
      <button ref="nextBtnRef" type="button" class="btn btn-accent drill-advance" @keydown.enter.prevent="next" @click="next">
        Weiter <span aria-hidden="true">→</span>
      </button>
    </div>

    <template v-else>
      <div class="anw-composer">
        <textarea
          ref="textareaRef"
          v-model="sentence"
          class="input anw-textarea"
          placeholder="Schreib deinen eigenen Satz…"
          spellcheck="false"
        />
        <div class="anw-composer-f micro-mark">{{ wordCount }} Wörter · mindestens 5</div>
      </div>
      <button class="btn btn-accent" type="button" :disabled="!canSubmit" @click="submit">Absenden</button>
    </template>
  </div>
</template>

<style scoped>
.anw-composer { margin: 18px 0 8px; }
.anw-textarea {
  width: 100%;
  min-height: 120px;
  border: 1px solid var(--rule);
  border-radius: 4px;
  padding: 12px 14px;
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.55;
  resize: vertical;
}
.anw-composer-f { margin-top: 6px; text-align: right; }
</style>
