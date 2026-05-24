<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../../db'
import type { WritingDraft, WritingPrompt, RubricSystem } from '../../data/writingPrompts'
import { getPromptById } from '../../composables/useWritingPrompts'
import { RUBRICS } from '../../data/rubrics'
import { useSettings } from '../../composables/useSettings'
import { makeGeminiClient } from '../../composables/useClaude'
import { useLoading } from '../../composables/useLoading'
import { useToast } from '../../composables/useToast'
import { gradeAndPersist, GraderError } from '../../composables/useWritingGrader'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const loading = useLoading()
const { settings, hasApiKey, load: loadSettings } = useSettings()

const promptId = computed(() => route.params.promptId as string)
const draftIdParam = computed(() => route.params.draftId as string | undefined)

const prompt = ref<WritingPrompt | null>(null)
const draft = ref<WritingDraft | null>(null)
const rubricSystem = ref<RubricSystem>('goethe-c1')
const initializing = ref(true)
const grading = ref(false)
const gradeError = ref<string | null>(null)

const text = ref('')

// Word count: count contiguous non-whitespace blocks.
function countWords(s: string): number {
  const m = s.trim().match(/\S+/g)
  return m ? m.length : 0
}

const wordCount = computed(() => countWords(text.value))

const targetBand = computed(() => prompt.value?.targetWords ?? { min: 0, target: 0, max: 0 })

type BandColor = 'under' | 'ok' | 'over' | 'far-under' | 'far-over'
const bandColor = computed<BandColor>(() => {
  const w = wordCount.value
  const t = targetBand.value
  if (t.min === 0) return 'ok'
  if (w < t.min * 0.9) return 'far-under'
  if (w < t.min) return 'under'
  if (w <= t.max) return 'ok'
  if (w <= t.max * 1.15) return 'over'
  return 'far-over'
})

const canGrade = computed(() =>
  hasApiKey.value && wordCount.value >= Math.floor((targetBand.value.min || 1) * 0.6) && !grading.value && !draft.value?.result
)

const isGraded = computed(() => !!draft.value?.result)

// Autosave debounce.
let autosaveTimer: number | undefined
function scheduleAutosave() {
  if (autosaveTimer !== undefined) window.clearTimeout(autosaveTimer)
  autosaveTimer = window.setTimeout(async () => {
    if (!draft.value || !prompt.value) return
    // If the draft is graded and the user edited the text, clear the grade.
    const editedAfterGrade = isGraded.value && text.value !== draft.value.text
    const next: WritingDraft = {
      ...draft.value,
      text: text.value,
      wordCount: wordCount.value,
      updatedAt: Date.now(),
      ...(editedAfterGrade ? { result: undefined, gradedAt: undefined, graderModel: undefined } : {})
    }
    await db.writingDrafts.put(next)
    draft.value = next
  }, 1000)
}

watch(text, scheduleAutosave)
watch(rubricSystem, scheduleAutosave)   // persists the chosen rubric pre-grade

onMounted(async () => {
  await loadSettings()
  prompt.value = getPromptById(promptId.value)
  if (!prompt.value) {
    initializing.value = false
    return
  }
  rubricSystem.value = prompt.value.defaultRubric

  if (draftIdParam.value) {
    const existing = await db.writingDrafts.get(draftIdParam.value)
    if (existing && existing.promptId === promptId.value) {
      draft.value = existing
      text.value = existing.text
      rubricSystem.value = existing.rubric
    }
  } else {
    const now = Date.now()
    const fresh: WritingDraft = {
      id: crypto.randomUUID(),
      promptId: promptId.value,
      rubric: prompt.value.defaultRubric,
      text: '',
      wordCount: 0,
      createdAt: now,
      updatedAt: now
    }
    await db.writingDrafts.put(fresh)
    draft.value = fresh
    // Replace the URL so refresh resumes this draft instead of creating another.
    router.replace({ name: 'writing-draft', params: { promptId: prompt.value.id, draftId: fresh.id } })
  }
  initializing.value = false
})

onUnmounted(() => {
  if (autosaveTimer !== undefined) window.clearTimeout(autosaveTimer)
})

async function gradeNow() {
  if (!prompt.value || !draft.value) return
  if (!hasApiKey.value) {
    toast.error('Gemini API key required', { description: 'Set your API key in Settings before grading.' })
    return
  }
  grading.value = true
  gradeError.value = null
  // Flush pending autosave so the draft text on Dexie matches what we grade.
  if (autosaveTimer !== undefined) {
    window.clearTimeout(autosaveTimer)
    autosaveTimer = undefined
  }
  const pinned: WritingDraft = {
    ...draft.value,
    text: text.value,
    wordCount: wordCount.value,
    updatedAt: Date.now()
  }
  await db.writingDrafts.put(pinned)
  draft.value = pinned

  try {
    const updated = await loading.wrap(
      async () => {
        const client = makeGeminiClient(settings.value.geminiApiKey)
        return await gradeAndPersist(client, settings.value.model, prompt.value!, pinned, rubricSystem.value)
      },
      {
        title: 'Grading',
        subtitle: 'Asking Gemini to score against ' + RUBRICS[rubricSystem.value].labelDe + '. This usually takes 30–90 seconds.'
      }
    )
    draft.value = updated
    toast.success(`Graded · ${updated.result?.totalScore} / 100 · ${updated.result?.bandEstimate}`)
  } catch (err) {
    const msg = err instanceof GraderError
      ? `Grading failed after ${err.attempts} attempts. Try again or simplify the draft.`
      : err instanceof Error ? err.message : 'Grading failed.'
    gradeError.value = msg
    toast.error('Grading failed', { description: msg })
  } finally {
    grading.value = false
  }
}

function backToPrompt() {
  router.push({ name: 'writing-prompt', params: { promptId: promptId.value } })
}
</script>

<template>
  <div v-if="initializing" class="page loading-state"><div class="micro-mark">Loading…</div></div>
  <div v-else-if="!prompt" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>Unknown prompt.</div>
    <button class="btn btn-ghost" type="button" @click="router.push({ name: 'writing' })">← Back</button>
  </div>
  <div v-else class="page editor-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Schreiben · {{ prompt.titleDe }}</div>
        <h1 class="section-title">Writing<em>.</em></h1>
        <p class="section-subtitle">Ziel {{ prompt.targetWords.target }} Wörter · {{ prompt.suggestedMinutes }} min · Rubrik {{ rubricSystem }}</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" @click="backToPrompt">← Back</button>
      </div>
    </header>

    <div class="alert alert-info writing-disclaimer-small">
      <span class="alert-label">Hinweis</span>
      Bewertungen sind indikativ und ersetzen keinen offiziellen Prüfer.
      Übe ergänzend mit dem offiziellen Modellsatz.
    </div>

    <details class="prompt-zone" open>
      <summary>Aufgabenstellung anzeigen</summary>
      <div class="prompt-zone-text">{{ prompt.promptText }}</div>
      <div v-if="prompt.promptContext" class="prompt-zone-context">{{ prompt.promptContext }}</div>
    </details>

    <div class="field rubric-field">
      <div class="field-label">Rubrik</div>
      <div class="segmented" :class="{ 'is-locked': isGraded }">
        <button type="button" :class="{ active: rubricSystem === 'goethe-c1' }"
          :disabled="isGraded"
          @click="rubricSystem = 'goethe-c1'">Goethe C1</button>
        <button type="button" :class="{ active: rubricSystem === 'telc-c1' }"
          :disabled="isGraded"
          @click="rubricSystem = 'telc-c1'">telc C1</button>
      </div>
    </div>

    <div v-if="!hasApiKey" class="alert alert-warning">
      <span class="alert-label">Required</span>
      Set your Gemini API key in <router-link :to="{ name: 'settings' }">Settings</router-link> before grading. Drafting still works.
    </div>

    <div class="editor-wrapper" :data-band="bandColor">
      <textarea
        class="editor-textarea"
        :class="['band-' + bandColor]"
        v-model="text"
        :readonly="isGraded"
        placeholder="Schreibe deinen Text hier …"
        rows="20"
        spellcheck="false"
        autocomplete="off"
      ></textarea>
      <div class="editor-meta">
        <span class="word-count" :class="['band-' + bandColor]">{{ wordCount }} Wörter</span>
        <span class="word-target">Ziel {{ targetBand.min }}–{{ targetBand.max }}</span>
      </div>
    </div>

    <div v-if="gradeError" class="alert alert-danger">
      <span class="alert-label">Grading failed</span>{{ gradeError }}
    </div>

    <div class="editor-actions">
      <span class="editor-cost-hint">≈ 1 großer Bewertungsaufruf</span>
      <button
        class="btn btn-accent btn-meta"
        type="button"
        :disabled="!canGrade"
        @click="gradeNow"
      >
        <span class="bm-main">{{ grading ? 'Grading…' : (isGraded ? 'Bereits benotet' : 'Grade me') }} <span v-if="!grading && !isGraded" aria-hidden="true">→</span></span>
        <span class="bm-sub">{{ rubricSystem === 'goethe-c1' ? 'Goethe C1' : 'telc C1' }} · {{ wordCount }} Wörter</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.editor-page { max-width: 880px; }
.writing-disclaimer-small { margin-bottom: 20px; }

.prompt-zone {
  margin: 0 0 20px;
  padding: 16px;
  background: var(--paper-deep);
  border-radius: 4px;
}
.prompt-zone summary {
  cursor: pointer;
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute);
}
.prompt-zone-text {
  margin-top: 12px;
  font-family: var(--font-body); font-size: 14.5px; line-height: 1.55;
  white-space: pre-wrap;
}
.prompt-zone-context {
  margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--hairline);
  font-family: var(--font-body); font-style: italic; font-size: 13px; color: var(--ink-soft);
  white-space: pre-wrap;
}

.rubric-field { margin-bottom: 16px; }
.rubric-field .segmented.is-locked { opacity: 0.6; }

.editor-wrapper { position: relative; margin: 8px 0 20px; }
.editor-textarea {
  width: 100%;
  min-height: 360px;
  padding: 18px 18px 36px;
  border: 1px solid var(--rule);
  border-radius: 4px;
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.65;
  color: var(--ink);
  background: var(--paper);
  resize: vertical;
  transition: border-color .15s;
  outline: none;
}
.editor-textarea:focus { border-color: var(--accent); }
.editor-textarea[readonly] { background: var(--paper-deep); }

.editor-meta {
  position: absolute; right: 12px; bottom: 10px;
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute);
  display: flex; gap: 12px;
  pointer-events: none;
}
.word-count { font-variant-numeric: tabular-nums; }
.word-count.band-ok { color: var(--success); }
.word-count.band-under { color: var(--warn, #b58800); }
.word-count.band-over { color: var(--warn, #b58800); }
.word-count.band-far-under, .word-count.band-far-over { color: var(--danger); }
.word-target { color: var(--mute); }

.editor-actions {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 20px; gap: 16px;
}
.editor-cost-hint {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute);
}
@media (max-width: 720px) {
  .editor-actions { flex-direction: column-reverse; align-items: stretch; }
}
</style>
