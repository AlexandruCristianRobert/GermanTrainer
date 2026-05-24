<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../../db'
import type { WritingDraft, WritingPrompt } from '../../data/writingPrompts'
import { getPromptById } from '../../composables/useWritingPrompts'
import {
  abandonSession,
  computeRemaining,
  resumeSession,
  submitAndGrade,
  type GradeFn
} from '../../composables/useSimulatorC1'
import type { SimulatorSession } from '../../data/simulatorC1'
import { useSettings } from '../../composables/useSettings'
import { makeGeminiClient } from '../../composables/useClaude'
import { useLoading } from '../../composables/useLoading'
import { useToast } from '../../composables/useToast'
import { gradeAndPersist, GraderError } from '../../composables/useWritingGrader'
import { RUBRICS } from '../../data/rubrics'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const loading = useLoading()
const { settings, hasApiKey, load: loadSettings } = useSettings()

const sessionId = computed(() => route.params.sessionId as string)
const session = ref<SimulatorSession | null>(null)
const prompt1 = ref<WritingPrompt | null>(null)
const prompt2 = ref<WritingPrompt | null>(null)
const draft1 = ref<WritingDraft | null>(null)
const draft2 = ref<WritingDraft | null>(null)

const text1 = ref('')
const text2 = ref('')
const activeTab = ref<1 | 2>(1)
const submitting = ref(false)
const submitError = ref<string | null>(null)

const initializing = ref(true)
const error = ref<string | null>(null)
const now = ref(Date.now())
let tick: number | undefined
let autosaveTimer: number | undefined

function countWords(s: string): number {
  const m = s.trim().match(/\S+/g)
  return m ? m.length : 0
}

const wordCount1 = computed(() => countWords(text1.value))
const wordCount2 = computed(() => countWords(text2.value))

function bandColor(count: number, target: WritingPrompt['targetWords'] | null): string {
  if (!target || target.min === 0) return 'ok'
  if (count < target.min * 0.9) return 'far-under'
  if (count < target.min) return 'under'
  if (count <= target.max) return 'ok'
  if (count <= target.max * 1.15) return 'over'
  return 'far-over'
}

const band1 = computed(() => bandColor(wordCount1.value, prompt1.value?.targetWords ?? null))
const band2 = computed(() => bandColor(wordCount2.value, prompt2.value?.targetWords ?? null))

const remaining = computed(() => {
  if (!session.value) return 0
  return computeRemaining(session.value, now.value)
})

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const timerDisplay = computed(() => formatTime(remaining.value))
const timerCritical = computed(() => remaining.value <= 5 * 60 * 1000)
const timeUp = computed(() => remaining.value === 0)
const sessionLocked = computed(() => !!session.value && session.value.status !== 'in_progress')

const canSubmit = computed(() => {
  if (!session.value || !prompt1.value || !prompt2.value || sessionLocked.value) return false
  const floor1 = Math.floor(prompt1.value.targetWords.min * 0.6)
  const floor2 = Math.floor(prompt2.value.targetWords.min * 0.6)
  return hasApiKey.value && wordCount1.value >= floor1 && wordCount2.value >= floor2 && !submitting.value
})

onMounted(async () => {
  await loadSettings()
  try {
    const s = await resumeSession(sessionId.value)
    if (!s) {
      error.value = 'Sitzung nicht gefunden.'
      return
    }
    session.value = s
    prompt1.value = getPromptById(s.task1PromptId)
    prompt2.value = getPromptById(s.task2PromptId)
    draft1.value = await db.writingDrafts.get(s.task1DraftId) ?? null
    draft2.value = await db.writingDrafts.get(s.task2DraftId) ?? null
    if (!prompt1.value || !prompt2.value || !draft1.value || !draft2.value) {
      error.value = 'Sitzungsdaten unvollständig.'
      return
    }
    text1.value = draft1.value.text
    text2.value = draft2.value.text

    // If the session is already submitted or graded, redirect.
    if (s.status === 'submitted' || s.status === 'graded') {
      router.replace({ name: 'simulator-result', params: { sessionId: s.id } })
      return
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ladefehler.'
  } finally {
    initializing.value = false
  }
  tick = window.setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => {
  if (tick !== undefined) window.clearInterval(tick)
  if (autosaveTimer !== undefined) window.clearTimeout(autosaveTimer)
})

function scheduleAutosave() {
  if (autosaveTimer !== undefined) window.clearTimeout(autosaveTimer)
  autosaveTimer = window.setTimeout(async () => {
    if (!draft1.value || !draft2.value) return
    const next1: WritingDraft = { ...draft1.value, text: text1.value, wordCount: wordCount1.value, updatedAt: Date.now() }
    const next2: WritingDraft = { ...draft2.value, text: text2.value, wordCount: wordCount2.value, updatedAt: Date.now() }
    await db.writingDrafts.put(next1)
    await db.writingDrafts.put(next2)
    draft1.value = next1
    draft2.value = next2
  }, 1000)
}

watch([text1, text2], scheduleAutosave)

// Auto-submit when the timer hits zero.
watch(timeUp, async (up) => {
  if (!up || !session.value || session.value.status !== 'in_progress' || submitting.value) return
  await doSubmit(true)
})

async function doSubmit(auto: boolean) {
  if (!session.value || !prompt1.value || !prompt2.value) return
  if (!hasApiKey.value) {
    toast.error('Gemini API key required', { description: 'Bitte API-Key in den Einstellungen setzen.' })
    return
  }
  if (!auto) {
    const ok = confirm('Beide Aufgaben einreichen und bewerten lassen? Nach dem Submit kannst du den Text nicht mehr ändern.')
    if (!ok) return
  }
  submitting.value = true
  submitError.value = null
  // Flush pending autosave so what we grade is what we saved.
  if (autosaveTimer !== undefined) {
    window.clearTimeout(autosaveTimer)
    autosaveTimer = undefined
  }
  if (draft1.value) {
    const pinned1: WritingDraft = { ...draft1.value, text: text1.value, wordCount: wordCount1.value, updatedAt: Date.now() }
    await db.writingDrafts.put(pinned1)
    draft1.value = pinned1
  }
  if (draft2.value) {
    const pinned2: WritingDraft = { ...draft2.value, text: text2.value, wordCount: wordCount2.value, updatedAt: Date.now() }
    await db.writingDrafts.put(pinned2)
    draft2.value = pinned2
  }

  const grader: GradeFn = async (draft) => {
    const promptForDraft = draft.id === session.value!.task1DraftId
      ? prompt1.value!
      : prompt2.value!
    const client = makeGeminiClient(settings.value.geminiApiKey)
    return await gradeAndPersist(client, settings.value.model, promptForDraft, draft, 'goethe-c1')
  }

  try {
    await loading.wrap(
      async () => submitAndGrade(session.value!.id, grader),
      {
        title: 'Bewerten…',
        subtitle: 'Gemini bewertet beide Aufgaben nacheinander gegen die Goethe-C1-Rubrik (≈ 30–90 Sekunden pro Aufgabe).'
      }
    )
    router.push({ name: 'simulator-result', params: { sessionId: session.value!.id } })
  } catch (err) {
    const msg = err instanceof GraderError
      ? `Bewertung fehlgeschlagen nach ${err.attempts} Versuchen.`
      : err instanceof Error ? err.message : 'Bewertung fehlgeschlagen.'
    submitError.value = msg
    toast.error('Bewertung fehlgeschlagen', { description: msg })
  } finally {
    submitting.value = false
  }
}

async function onAbandon() {
  if (!session.value) return
  const ok = confirm('Diesen Prüfungsversuch wirklich abbrechen?')
  if (!ok) return
  await abandonSession(session.value.id)
  router.push({ name: 'simulator-c1' })
}

function backHome() { router.push({ name: 'simulator-c1' }) }
</script>

<template>
  <div v-if="initializing" class="page loading-state"><div class="micro-mark">Loading…</div></div>
  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="backHome">← Back</button>
  </div>
  <div v-else-if="session && prompt1 && prompt2" class="page run-page">
    <header class="simulator-header">
      <div class="simulator-timer" :class="{ 'is-critical': timerCritical }">
        <span class="simulator-timer-label">Verbleibend</span>
        <span class="simulator-timer-value">{{ timerDisplay }}</span>
      </div>
      <div class="simulator-header-meta">
        <span>Goethe C1 · Schreiben</span>
      </div>
      <div class="simulator-header-actions">
        <button class="btn btn-quiet" type="button" @click="onAbandon">Abbrechen</button>
      </div>
    </header>

    <div class="alert alert-info simulator-disclaimer-small">
      <span class="alert-label">Hinweis</span>
      Bewertungen sind indikativ; offizielle Modellsätze bleiben die maßgebliche Quelle.
    </div>

    <div v-if="!hasApiKey" class="alert alert-warning">
      <span class="alert-label">Required</span>
      Setze deinen Gemini-API-Key unter <router-link :to="{ name: 'settings' }">Settings</router-link>, sonst kann die Bewertung am Ende nicht laufen.
    </div>

    <div class="simulator-tabs">
      <button type="button" class="simulator-tab" :class="{ active: activeTab === 1 }" @click="activeTab = 1">
        <span class="tab-label">Aufgabe 1 · Forumsbeitrag</span>
        <span class="tab-meta" :class="['band-' + band1]">{{ wordCount1 }} / {{ prompt1.targetWords.target }}</span>
      </button>
      <button type="button" class="simulator-tab" :class="{ active: activeTab === 2 }" @click="activeTab = 2">
        <span class="tab-label">Aufgabe 2 · formelle E-Mail</span>
        <span class="tab-meta" :class="['band-' + band2]">{{ wordCount2 }} / {{ prompt2.targetWords.target }}</span>
      </button>
    </div>

    <div v-show="activeTab === 1" class="simulator-task">
      <details class="prompt-zone" open>
        <summary>Aufgabenstellung 1</summary>
        <div class="prompt-zone-text">{{ prompt1.promptText }}</div>
        <div v-if="prompt1.promptContext" class="prompt-zone-context">{{ prompt1.promptContext }}</div>
      </details>
      <textarea
        class="editor-textarea"
        :class="['band-' + band1]"
        v-model="text1"
        :readonly="sessionLocked"
        rows="16"
        placeholder="Schreibe deinen Forumsbeitrag hier …"
        spellcheck="false"
        autocomplete="off"
      ></textarea>
      <div class="editor-meta">
        <span class="word-count" :class="['band-' + band1]">{{ wordCount1 }} Wörter</span>
        <span class="word-target">Ziel {{ prompt1.targetWords.min }}–{{ prompt1.targetWords.max }}</span>
      </div>
    </div>

    <div v-show="activeTab === 2" class="simulator-task">
      <details class="prompt-zone" open>
        <summary>Aufgabenstellung 2</summary>
        <div class="prompt-zone-text">{{ prompt2.promptText }}</div>
        <div v-if="prompt2.promptContext" class="prompt-zone-context">{{ prompt2.promptContext }}</div>
      </details>
      <textarea
        class="editor-textarea"
        :class="['band-' + band2]"
        v-model="text2"
        :readonly="sessionLocked"
        rows="16"
        placeholder="Schreibe deine E-Mail hier …"
        spellcheck="false"
        autocomplete="off"
      ></textarea>
      <div class="editor-meta">
        <span class="word-count" :class="['band-' + band2]">{{ wordCount2 }} Wörter</span>
        <span class="word-target">Ziel {{ prompt2.targetWords.min }}–{{ prompt2.targetWords.max }}</span>
      </div>
    </div>

    <div v-if="submitError" class="alert alert-danger"><span class="alert-label">Fehler</span>{{ submitError }}</div>

    <div class="simulator-actions">
      <span class="simulator-cost-hint">≈ 2 große Bewertungsaufrufe ({{ RUBRICS['goethe-c1'].labelDe }})</span>
      <button
        class="btn btn-accent btn-meta"
        type="button"
        :disabled="!canSubmit"
        @click="doSubmit(false)"
      >
        <span class="bm-main">{{ submitting ? 'Bewertet…' : 'Submit &amp; grade' }} <span v-if="!submitting" aria-hidden="true">→</span></span>
        <span class="bm-sub">T1 {{ wordCount1 }}w · T2 {{ wordCount2 }}w</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.run-page { max-width: 880px; }
.simulator-header {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 12px 16px;
  background: var(--paper-deep); border-radius: 4px; margin-bottom: 16px;
  position: sticky; top: 0; z-index: 1;
}
.simulator-timer { display: flex; flex-direction: column; gap: 2px; }
.simulator-timer-label {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute);
}
.simulator-timer-value {
  font-family: var(--font-mono); font-size: 28px; font-variant-numeric: tabular-nums; color: var(--accent);
}
.simulator-timer.is-critical .simulator-timer-value { color: var(--danger); }
.simulator-header-meta {
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute);
}
.simulator-disclaimer-small { margin-bottom: 16px; }

.simulator-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
.simulator-tab {
  flex: 1;
  background: transparent; border: 1px solid var(--rule); border-radius: 4px 4px 0 0;
  padding: 10px 14px; cursor: pointer;
  display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
  text-align: left;
}
.simulator-tab.active { background: var(--paper); border-bottom-color: transparent; }
.tab-label { font-family: var(--font-display); font-size: 16px; color: var(--ink); }
.tab-meta {
  font-family: var(--font-mono); font-size: 11px; font-variant-numeric: tabular-nums;
}
.tab-meta.band-ok { color: var(--success); }
.tab-meta.band-under, .tab-meta.band-over { color: var(--warn, #b58800); }
.tab-meta.band-far-under, .tab-meta.band-far-over { color: var(--danger); }

.simulator-task { margin-bottom: 16px; }

.prompt-zone {
  margin-bottom: 12px;
  padding: 14px 16px;
  background: var(--paper-deep);
  border-radius: 4px;
}
.prompt-zone summary {
  cursor: pointer;
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute);
}
.prompt-zone-text { margin-top: 10px; font-family: var(--font-body); font-size: 14px; line-height: 1.55; white-space: pre-wrap; }
.prompt-zone-context {
  margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--hairline);
  font-family: var(--font-body); font-style: italic; font-size: 13px; color: var(--ink-soft);
  white-space: pre-wrap;
}

.editor-textarea {
  width: 100%;
  padding: 16px 16px 32px;
  border: 1px solid var(--rule); border-radius: 4px;
  font-family: var(--font-body); font-size: 16px; line-height: 1.65; color: var(--ink);
  background: var(--paper); resize: vertical; outline: none;
}
.editor-textarea:focus { border-color: var(--accent); }
.editor-textarea[readonly] { background: var(--paper-deep); }

.editor-meta {
  margin-top: -28px; position: relative; right: 12px; text-align: right;
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute);
  display: flex; gap: 12px; justify-content: flex-end; pointer-events: none;
}
.word-count.band-ok { color: var(--success); }
.word-count.band-under, .word-count.band-over { color: var(--warn, #b58800); }
.word-count.band-far-under, .word-count.band-far-over { color: var(--danger); }
.word-target { color: var(--mute); }

.simulator-actions {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 24px; gap: 16px;
}
.simulator-cost-hint {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute);
}
@media (max-width: 720px) {
  .simulator-actions { flex-direction: column-reverse; align-items: stretch; }
}
</style>
