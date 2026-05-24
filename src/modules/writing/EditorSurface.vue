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
import { gradeAndPersist, GraderError, upgradeParagraph } from '../../composables/useWritingGrader'
import type { GradeCriterion, InlineNote, ParagraphFeedback } from '../../data/rubrics'

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

// ── Review mode helpers ──────────────────────────────────────────

interface RenderSegment {
  text: string
  start: number
  end: number
  notes: InlineNote[]
}

function buildSegments(draftText: string, notes: InlineNote[]): RenderSegment[] {
  // Build a flat list of segments by splitting on note span boundaries.
  if (notes.length === 0) {
    return [{ text: draftText, start: 0, end: draftText.length, notes: [] }]
  }
  const boundaries = new Set<number>([0, draftText.length])
  for (const n of notes) {
    boundaries.add(n.spanStart)
    boundaries.add(n.spanEnd)
  }
  const sorted = Array.from(boundaries).sort((a, b) => a - b)
  const segments: RenderSegment[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i]
    const end = sorted[i + 1]
    if (end <= start) continue
    const overlapping = notes.filter(n => n.spanStart <= start && n.spanEnd >= end)
    segments.push({
      text: draftText.slice(start, end),
      start,
      end,
      notes: overlapping
    })
  }
  return segments
}

const reviewSegments = computed<RenderSegment[]>(() => {
  if (!draft.value?.result) return []
  return buildSegments(draft.value.text, draft.value.result.inlineNotes)
})

const criteria = computed<GradeCriterion[]>(() => draft.value?.result?.criteria ?? [])
const paragraphs = computed<ParagraphFeedback[]>(() => draft.value?.result?.paragraphFeedback ?? [])

// Track which evidence card is currently highlighted (for scroll-into-view).
const highlightedSpan = ref<{ start: number; end: number } | null>(null)
function focusEvidence(start: number, end: number) {
  if (start < 0) return
  highlightedSpan.value = { start, end }
  setTimeout(() => { highlightedSpan.value = null }, 1500)
}

function isHighlighted(seg: RenderSegment): boolean {
  if (!highlightedSpan.value) return false
  return seg.start >= highlightedSpan.value.start && seg.end <= highlightedSpan.value.end
}

// ── Paragraph upgrade ────────────────────────────────────────────

const upgradingIdx = ref<number | null>(null)

async function runParagraphUpgrade(idx: number) {
  if (upgradingIdx.value !== null) return
  if (!prompt.value || !draft.value || !draft.value.result) return
  upgradingIdx.value = idx
  try {
    // Slice the draft text into paragraphs by blank lines, in the same order
    // the grader was instructed to use.
    const paras = draft.value.text.split(/\n\s*\n+/).map(s => s.trim()).filter(s => s.length > 0)
    const paragraphText = paras[idx]
    if (!paragraphText) {
      toast.error('Paragraph not found in draft text.')
      return
    }
    const client = makeGeminiClient(settings.value.geminiApiKey)
    const { upgradedText } = await upgradeParagraph(
      client, settings.value.model, prompt.value, paragraphText, draft.value.rubric
    )
    // Persist the upgrade onto the draft.
    const nextFeedback = [...draft.value.result.paragraphFeedback]
    const existing = nextFeedback.find(p => p.paragraphIndex === idx)
    if (existing) {
      existing.upgradedText = upgradedText
      existing.upgradedAt = Date.now()
    } else {
      nextFeedback.push({ paragraphIndex: idx, summaryDe: '—', upgradedText, upgradedAt: Date.now() })
    }
    const next: WritingDraft = {
      ...draft.value,
      result: { ...draft.value.result, paragraphFeedback: nextFeedback },
      updatedAt: Date.now()
    }
    await db.writingDrafts.put(next)
    draft.value = next
  } catch (err) {
    toast.error('Paragraph upgrade failed', { description: err instanceof Error ? err.message : String(err) })
  } finally {
    upgradingIdx.value = null
  }
}

function paragraphTextAt(idx: number): string {
  if (!draft.value) return ''
  const paras = draft.value.text.split(/\n\s*\n+/).map(s => s.trim()).filter(s => s.length > 0)
  return paras[idx] ?? ''
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
        v-if="!isGraded"
        class="editor-textarea"
        :class="['band-' + bandColor]"
        v-model="text"
        placeholder="Schreibe deinen Text hier …"
        rows="20"
        spellcheck="false"
        autocomplete="off"
      ></textarea>
      <div v-else class="editor-rendered" role="article" aria-readonly="true">
        <template v-for="seg in reviewSegments" :key="seg.start">
          <span
            :class="[
              'rendered-seg',
              seg.notes.length > 0 ? 'has-note has-' + seg.notes[0].kind : '',
              isHighlighted(seg) ? 'is-highlight' : ''
            ]"
            :data-start="seg.start"
            :data-end="seg.end"
          >{{ seg.text }}</span>
        </template>
      </div>
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

    <section v-if="isGraded && draft?.result" class="review-section">
      <header class="review-header">
        <div class="review-score-block">
          <div class="review-total"><span class="review-total-num">{{ draft.result.totalScore }}</span><span class="review-total-denom"> / {{ RUBRICS[draft.result.rubric].totalMax }}</span></div>
          <div class="review-band" :class="`band-chip-${draft.result.bandEstimate.toLowerCase().replace('+','plus').replace('-','minus')}`">{{ draft.result.bandEstimate }}</div>
          <div class="review-pass" :class="draft.result.passes ? 'is-pass' : 'is-fail'">{{ draft.result.passes ? 'Bestanden' : 'Nicht bestanden' }}</div>
        </div>
        <div class="review-overall">
          <div class="review-overall-de">{{ draft.result.overallDe }}</div>
          <div class="review-overall-en">{{ draft.result.overallEn }}</div>
        </div>
      </header>

      <h3 class="review-section-title">Per criterion</h3>
      <ul class="criteria-list">
        <li v-for="c in criteria" :key="c.key" class="criterion-card card">
          <div class="criterion-head">
            <span class="criterion-label">{{ c.labelDe }}</span>
            <span class="criterion-score">{{ c.score }} / {{ c.maxPoints }}</span>
          </div>
          <div class="criterion-strengths"><strong>+</strong> {{ c.strengthsDe }}</div>
          <div class="criterion-weaknesses"><strong>−</strong> {{ c.weaknessesDe }}</div>
          <ul v-if="c.evidence.length > 0" class="criterion-evidence">
            <li v-for="(ev, ei) in c.evidence" :key="ei">
              <button
                type="button"
                class="evidence-quote"
                :class="{ 'is-unanchored': ev.spanStart < 0 }"
                @click="focusEvidence(ev.spanStart, ev.spanEnd)"
                :title="ev.spanStart < 0 ? 'Quote not located in draft' : 'Click to highlight'"
              >„{{ ev.quote }}"</button>
              <span class="evidence-comment">— {{ ev.commentDe }}</span>
            </li>
          </ul>
        </li>
      </ul>

      <h3 class="review-section-title">Per paragraph</h3>
      <ul class="paragraph-list">
        <li v-for="p in paragraphs" :key="p.paragraphIndex" class="paragraph-card card">
          <div class="paragraph-head">
            <span class="paragraph-label">Absatz {{ p.paragraphIndex + 1 }}</span>
            <button
              type="button"
              class="btn btn-quiet"
              :disabled="upgradingIdx === p.paragraphIndex"
              @click="runParagraphUpgrade(p.paragraphIndex)"
            >{{ upgradingIdx === p.paragraphIndex ? 'Verbessere…' : (p.upgradedText ? 'Erneut verbessern' : 'Upgrade this paragraph') }}</button>
          </div>
          <div class="paragraph-summary">{{ p.summaryDe }}</div>
          <details v-if="p.upgradedText" class="paragraph-upgrade" open>
            <summary>Vorschlag (C1-Register)</summary>
            <div class="paragraph-upgrade-row">
              <div class="paragraph-upgrade-cell">
                <div class="paragraph-upgrade-cell-label">Original</div>
                <div class="paragraph-upgrade-cell-text">{{ paragraphTextAt(p.paragraphIndex) }}</div>
              </div>
              <div class="paragraph-upgrade-cell">
                <div class="paragraph-upgrade-cell-label">Vorschlag</div>
                <div class="paragraph-upgrade-cell-text">{{ p.upgradedText }}</div>
              </div>
            </div>
          </details>
        </li>
      </ul>
    </section>
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

.editor-rendered {
  padding: 18px 18px 36px;
  border: 1px solid var(--rule);
  border-radius: 4px;
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.65;
  color: var(--ink);
  background: var(--paper-deep);
  min-height: 360px;
  white-space: pre-wrap;
}
.rendered-seg { transition: background-color .2s; }
.rendered-seg.has-note { border-bottom: 2px solid transparent; padding-bottom: 1px; }
.rendered-seg.has-fix     { border-bottom-color: var(--danger);          background: color-mix(in srgb, var(--danger) 8%, transparent); }
.rendered-seg.has-upgrade { border-bottom-color: var(--warn, #b58800);   background: color-mix(in srgb, var(--warn, #b58800) 8%, transparent); }
.rendered-seg.has-comment { border-bottom-color: var(--accent);          background: color-mix(in srgb, var(--accent) 8%, transparent); }
.rendered-seg.is-highlight { background: color-mix(in srgb, var(--accent) 25%, transparent); }

.review-section { margin-top: 32px; }
.review-header {
  display: flex; gap: 24px; padding: 18px; margin-bottom: 20px;
  background: var(--paper-deep); border-radius: 4px; border-left: 3px solid var(--accent);
  align-items: flex-start; flex-wrap: wrap;
}
.review-score-block { display: flex; gap: 16px; align-items: baseline; flex: 0 0 auto; }
.review-total { font-family: var(--font-display); }
.review-total-num { font-size: 36px; font-weight: 500; }
.review-total-denom { font-size: 16px; color: var(--mute); }
.review-band {
  font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.16em;
  text-transform: uppercase; padding: 4px 10px; border-radius: 3px;
  background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--accent);
}
.review-pass {
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.16em;
  text-transform: uppercase; padding: 4px 8px; border-radius: 3px;
}
.review-pass.is-pass { background: color-mix(in srgb, var(--success) 18%, transparent); color: var(--success); }
.review-pass.is-fail { background: color-mix(in srgb, var(--danger) 18%, transparent);  color: var(--danger); }
.review-overall { flex: 1; font-size: 14px; line-height: 1.55; min-width: 280px; }
.review-overall-de { color: var(--ink); }
.review-overall-en { color: var(--ink-soft); font-style: italic; margin-top: 6px; font-size: 13px; }

.review-section-title {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); margin: 24px 0 12px;
}

.criteria-list, .paragraph-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.criterion-card, .paragraph-card { padding: 16px 18px; }
.criterion-head, .paragraph-head {
  display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;
}
.criterion-label, .paragraph-label {
  font-family: var(--font-display); font-size: 16px;
}
.criterion-score { font-family: var(--font-mono); color: var(--accent); font-variant-numeric: tabular-nums; }
.criterion-strengths { font-size: 14px; line-height: 1.5; margin: 4px 0; }
.criterion-strengths strong { color: var(--success); margin-right: 4px; }
.criterion-weaknesses { font-size: 14px; line-height: 1.5; margin: 4px 0; }
.criterion-weaknesses strong { color: var(--danger); margin-right: 4px; }
.criterion-evidence { list-style: none; padding: 0; margin: 8px 0 0; display: grid; gap: 4px; font-size: 13px; }
.evidence-quote {
  background: none; border: 0; padding: 0;
  font-family: var(--font-body); font-style: italic; color: var(--accent);
  cursor: pointer;
}
.evidence-quote.is-unanchored { color: var(--mute); cursor: help; }
.evidence-comment { color: var(--ink-soft); margin-left: 4px; }

.paragraph-summary { font-size: 14px; line-height: 1.5; color: var(--ink-soft); }
.paragraph-upgrade { margin-top: 12px; }
.paragraph-upgrade summary {
  cursor: pointer;
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--mute);
}
.paragraph-upgrade-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
@media (max-width: 720px) {
  .paragraph-upgrade-row { grid-template-columns: 1fr; }
}
.paragraph-upgrade-cell { padding: 12px; background: var(--paper); border: 1px solid var(--hairline); border-radius: 4px; }
.paragraph-upgrade-cell-label {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 6px;
}
.paragraph-upgrade-cell-text { font-family: var(--font-body); font-size: 14px; line-height: 1.55; white-space: pre-wrap; }
</style>
