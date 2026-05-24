<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../../db'
import type { WritingDraft, WritingPrompt } from '../../data/writingPrompts'
import { getPromptById } from '../../composables/useWritingPrompts'
import {
  computeReport,
  resumeSession,
  submitAndGrade,
  type GradeFn
} from '../../composables/useSimulatorC1'
import type { SimulatorSession } from '../../data/simulatorC1'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { useSettings } from '../../composables/useSettings'
import { makeGeminiClient } from '../../composables/useClaude'
import { useLoading } from '../../composables/useLoading'
import { useToast } from '../../composables/useToast'
import { gradeAndPersist } from '../../composables/useWritingGrader'
import { type WritingGradeResult } from '../../data/rubrics'

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
const initializing = ref(true)
const error = ref<string | null>(null)
const retrying = ref(false)
const expanded = ref<{ t1: boolean; t2: boolean }>({ t1: false, t2: false })

const report = computed(() => {
  if (!session.value || !draft1.value || !draft2.value) return null
  return computeReport(session.value, draft1.value, draft2.value)
})

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const timeTaken = computed(() => {
  if (!session.value || !session.value.submittedAt) return null
  return session.value.submittedAt - session.value.startedAt
})

const ungradedTasks = computed(() => {
  const missing: number[] = []
  if (draft1.value && !draft1.value.result) missing.push(1)
  if (draft2.value && !draft2.value.result) missing.push(2)
  return missing
})

async function load() {
  initializing.value = true
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
    await maybeSaveHistory()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ladefehler.'
  } finally {
    initializing.value = false
  }
}

async function tryGradeMissing() {
  if (!session.value || !prompt1.value || !prompt2.value) return
  if (!hasApiKey.value) {
    toast.error('Gemini API key required', { description: 'Bitte API-Key in den Einstellungen setzen.' })
    return
  }
  retrying.value = true
  try {
    const grader: GradeFn = async (draft) => {
      const p = draft.id === session.value!.task1DraftId ? prompt1.value! : prompt2.value!
      const client = makeGeminiClient(settings.value.geminiApiKey)
      return await gradeAndPersist(client, settings.value.model, p, draft, 'goethe-c1', { recordHistory: false })
    }
    await loading.wrap(
      async () => submitAndGrade(session.value!.id, grader),
      { title: 'Bewerten…', subtitle: 'Fehlende Aufgabe(n) werden bewertet.' }
    )
    await load()
  } catch (err) {
    toast.error('Bewertung fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    retrying.value = false
  }
}

onMounted(async () => {
  await loadSettings()
  await load()
})

// Persist history exactly once, when both tasks are graded. Called from
// load() and from tryGradeMissing() after a successful regrade.
async function maybeSaveHistory() {
  if (!session.value || !report.value || session.value.status !== 'graded') return
  if (report.value.task1Score === null || report.value.task2Score === null) return
  if (session.value.historySavedAt !== undefined) return  // already saved on a previous mount

  const dur = (session.value.submittedAt ?? Date.now()) - session.value.startedAt
  saveQuizRun({
    type: 'simulator-c1',
    startedAt: new Date(session.value.startedAt).toISOString(),
    finishedAt: new Date(session.value.gradedAt ?? Date.now()).toISOString(),
    durationMs: dur,
    count: 1,
    correct: report.value.passes ? 1 : 0,
    meta: {
      sessionId: session.value.id,
      task1Score: report.value.task1Score,
      task2Score: report.value.task2Score,
      combinedScore: report.value.combinedScore ?? undefined,
      passes: report.value.passes
    }
  })

  const updated = { ...session.value, historySavedAt: Date.now() }
  await db.simulatorSessions.put(updated)
  session.value = updated
}

function back() { router.push({ name: 'simulator-c1' }) }
function newRun() { router.push({ name: 'simulator-c1' }) }

function paragraphTextAt(draft: WritingDraft | null, idx: number): string {
  if (!draft) return ''
  const paras = draft.text.split(/\n\s*\n+/).map(s => s.trim()).filter(s => s.length > 0)
  return paras[idx] ?? ''
}
</script>

<template>
  <div v-if="initializing" class="page loading-state"><div class="micro-mark">Loading…</div></div>
  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="back">← Back</button>
  </div>
  <div v-else-if="session && prompt1 && prompt2 && draft1 && draft2 && report" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Goethe C1</div>
        <div class="result-score">
          <span class="result-score-num">{{ report.combinedScore ?? '—' }}</span><span class="result-score-denom"> / 100</span>
        </div>
        <p class="section-subtitle">
          <span v-if="timeTaken !== null">Bearbeitungszeit: {{ formatTime(timeTaken) }} · </span>
          Goethe-C1-Gewichtung 60/40 (Forumsbeitrag/E-Mail).
        </p>
      </div>
      <div class="result-actions">
        <span class="result-pass-chip" :class="report.passes ? 'is-pass' : 'is-fail'">{{ report.passes ? 'BESTANDEN' : 'NICHT BESTANDEN' }}</span>
      </div>
    </header>

    <div class="alert alert-info simulator-disclaimer-small">
      <span class="alert-label">Hinweis</span>
      Bewertungen sind indikativ. Übe ergänzend mit dem offiziellen Modellsatz.
    </div>

    <div class="result-task-chips">
      <div class="task-chip">
        <span class="task-chip-label">Aufgabe 1 · Forumsbeitrag</span>
        <span class="task-chip-score">{{ report.task1Score ?? '—' }} / 100 · {{ report.task1Band ?? '—' }}</span>
      </div>
      <div class="task-chip">
        <span class="task-chip-label">Aufgabe 2 · formelle E-Mail</span>
        <span class="task-chip-score">{{ report.task2Score ?? '—' }} / 100 · {{ report.task2Band ?? '—' }}</span>
      </div>
    </div>

    <div v-if="ungradedTasks.length > 0" class="alert alert-warning">
      <span class="alert-label">Unvollständig</span>
      Aufgabe {{ ungradedTasks.join(' & ') }} wurde nicht erfolgreich bewertet.
      <button class="btn btn-quiet" type="button" :disabled="retrying" @click="tryGradeMissing">{{ retrying ? 'Bewerte…' : 'Erneut bewerten' }}</button>
    </div>

    <!-- Per-task panels -->
    <section class="result-tasks">
      <article v-for="taskNum in [1, 2] as const" :key="taskNum" class="result-task-card card">
        <header class="result-task-head" role="button" tabindex="0"
          @click="taskNum === 1 ? expanded.t1 = !expanded.t1 : expanded.t2 = !expanded.t2"
          @keydown.enter="taskNum === 1 ? expanded.t1 = !expanded.t1 : expanded.t2 = !expanded.t2"
        >
          <div>
            <h3 class="result-task-title">
              Aufgabe {{ taskNum }} · {{ taskNum === 1 ? prompt1.titleDe : prompt2.titleDe }}
            </h3>
            <div class="result-task-meta">
              Score: {{ (taskNum === 1 ? report.task1Score : report.task2Score) ?? '—' }} / 100 ·
              Band: {{ (taskNum === 1 ? report.task1Band : report.task2Band) ?? '—' }} ·
              {{ (taskNum === 1 ? draft1.wordCount : draft2.wordCount) }} Wörter
            </div>
          </div>
          <span class="result-task-toggle">{{ (taskNum === 1 ? expanded.t1 : expanded.t2) ? '−' : '+' }}</span>
        </header>

        <div v-if="(taskNum === 1 ? expanded.t1 : expanded.t2) && (taskNum === 1 ? draft1.result : draft2.result)" class="result-task-body">
          <!-- Score block -->
          <div class="result-task-overall">
            <div class="result-task-overall-de">{{ (taskNum === 1 ? draft1.result : draft2.result)!.overallDe }}</div>
            <div class="result-task-overall-en">{{ (taskNum === 1 ? draft1.result : draft2.result)!.overallEn }}</div>
          </div>

          <!-- Criteria -->
          <h4 class="result-task-section-title">Per criterion</h4>
          <ul class="criteria-list">
            <li v-for="c in ((taskNum === 1 ? draft1.result : draft2.result) as WritingGradeResult).criteria" :key="c.key" class="criterion-card">
              <div class="criterion-head">
                <span class="criterion-label">{{ c.labelDe }}</span>
                <span class="criterion-score">{{ c.score }} / {{ c.maxPoints }}</span>
              </div>
              <div class="criterion-strengths"><strong>+</strong> {{ c.strengthsDe }}</div>
              <div class="criterion-weaknesses"><strong>−</strong> {{ c.weaknessesDe }}</div>
            </li>
          </ul>

          <!-- Paragraph feedback -->
          <h4 class="result-task-section-title">Per paragraph</h4>
          <ul class="paragraph-list">
            <li v-for="p in ((taskNum === 1 ? draft1.result : draft2.result) as WritingGradeResult).paragraphFeedback" :key="p.paragraphIndex" class="paragraph-card">
              <div class="paragraph-head">
                <span class="paragraph-label">Absatz {{ p.paragraphIndex + 1 }}</span>
              </div>
              <div class="paragraph-summary">{{ p.summaryDe }}</div>
              <details v-if="p.upgradedText" class="paragraph-upgrade">
                <summary>Vorschlag (C1-Register)</summary>
                <div class="paragraph-upgrade-row">
                  <div class="paragraph-upgrade-cell">
                    <div class="paragraph-upgrade-cell-label">Original</div>
                    <div class="paragraph-upgrade-cell-text">{{ paragraphTextAt(taskNum === 1 ? draft1 : draft2, p.paragraphIndex) }}</div>
                  </div>
                  <div class="paragraph-upgrade-cell">
                    <div class="paragraph-upgrade-cell-label">Vorschlag</div>
                    <div class="paragraph-upgrade-cell-text">{{ p.upgradedText }}</div>
                  </div>
                </div>
              </details>
            </li>
          </ul>
        </div>
      </article>
    </section>

    <div class="result-page-actions">
      <button class="btn btn-ghost" type="button" @click="back">Home</button>
      <button class="btn btn-accent" type="button" @click="newRun">Neue Prüfung starten <span aria-hidden="true">→</span></button>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-score { display: flex; align-items: baseline; gap: 4px; margin-bottom: 4px; }
.result-score-num { font-family: var(--font-display); font-size: 56px; font-weight: 500; color: var(--ink); }
.result-score-denom { font-family: var(--font-display); font-size: 18px; color: var(--mute); }
.result-pass-chip {
  font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.22em;
  text-transform: uppercase; padding: 6px 12px; border-radius: 3px;
}
.result-pass-chip.is-pass { background: color-mix(in srgb, var(--success) 18%, transparent); color: var(--success); }
.result-pass-chip.is-fail { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }

.simulator-disclaimer-small { margin: 16px 0 20px; }

.result-task-chips {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;
}
@media (max-width: 720px) { .result-task-chips { grid-template-columns: 1fr; } }
.task-chip {
  padding: 14px 16px; background: var(--paper-deep); border-radius: 4px;
  display: flex; flex-direction: column; gap: 6px;
}
.task-chip-label { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--mute); }
.task-chip-score { font-family: var(--font-display); font-size: 20px; color: var(--ink); }

.result-tasks { margin-top: 20px; display: grid; gap: 12px; }
.result-task-card { padding: 0; overflow: hidden; }
.result-task-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; cursor: pointer; user-select: none;
}
.result-task-title { font-family: var(--font-display); font-size: 17px; margin: 0; }
.result-task-meta { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--mute); margin-top: 4px; }
.result-task-toggle { font-family: var(--font-mono); font-size: 20px; color: var(--accent); }

.result-task-body { padding: 0 18px 18px; border-top: 1px solid var(--hairline); }
.result-task-overall { margin-top: 14px; }
.result-task-overall-de { font-size: 14px; line-height: 1.55; }
.result-task-overall-en { font-size: 13px; color: var(--ink-soft); font-style: italic; margin-top: 6px; }
.result-task-section-title {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); margin: 20px 0 10px;
}

.criteria-list, .paragraph-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.criterion-card, .paragraph-card { padding: 12px 14px; background: var(--paper-deep); border-radius: 4px; }
.criterion-head, .paragraph-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
.criterion-label, .paragraph-label { font-family: var(--font-display); font-size: 15px; }
.criterion-score { font-family: var(--font-mono); color: var(--accent); font-variant-numeric: tabular-nums; }
.criterion-strengths, .criterion-weaknesses { font-size: 13.5px; line-height: 1.5; margin: 4px 0; }
.criterion-strengths strong { color: var(--success); margin-right: 4px; }
.criterion-weaknesses strong { color: var(--danger); margin-right: 4px; }
.paragraph-summary { font-size: 13.5px; line-height: 1.5; color: var(--ink-soft); }

.paragraph-upgrade { margin-top: 8px; }
.paragraph-upgrade summary {
  cursor: pointer;
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--mute);
}
.paragraph-upgrade-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
@media (max-width: 720px) { .paragraph-upgrade-row { grid-template-columns: 1fr; } }
.paragraph-upgrade-cell { padding: 10px; background: var(--paper); border: 1px solid var(--hairline); border-radius: 4px; }
.paragraph-upgrade-cell-label { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--mute); margin-bottom: 4px; }
.paragraph-upgrade-cell-text { font-family: var(--font-body); font-size: 13.5px; line-height: 1.55; white-space: pre-wrap; }

.result-page-actions { display: flex; justify-content: space-between; gap: 12px; margin-top: 32px; }
</style>
