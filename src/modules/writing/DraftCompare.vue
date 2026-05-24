<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../../db'
import type { WritingDraft } from '../../data/writingPrompts'
import { getPromptById } from '../../composables/useWritingPrompts'
import { RUBRICS } from '../../data/rubrics'

const route = useRoute()
const router = useRouter()

const draftA = ref<WritingDraft | null>(null)
const draftB = ref<WritingDraft | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const [a, b] = await Promise.all([
      db.writingDrafts.get(route.params.draftA as string),
      db.writingDrafts.get(route.params.draftB as string)
    ])
    if (!a || !b) {
      error.value = 'One or both drafts not found.'
      return
    }
    if (a.promptId !== b.promptId) {
      error.value = 'Drafts belong to different prompts.'
      return
    }
    draftA.value = a
    draftB.value = b
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

const prompt = computed(() => draftA.value ? getPromptById(draftA.value.promptId) : null)

interface CriterionDelta {
  key: string
  labelDe: string
  scoreA: number
  scoreB: number
  delta: number
  maxPoints: number
}

const criterionDeltas = computed<CriterionDelta[]>(() => {
  if (!draftA.value?.result || !draftB.value?.result) return []
  const rubricKeys = RUBRICS[draftA.value.result.rubric].criteria.map(c => c.key)
  return rubricKeys.map(key => {
    const a = draftA.value!.result!.criteria.find(c => c.key === key)
    const b = draftB.value!.result!.criteria.find(c => c.key === key)
    return {
      key,
      labelDe: a?.labelDe ?? key,
      scoreA: a?.score ?? 0,
      scoreB: b?.score ?? 0,
      delta: (b?.score ?? 0) - (a?.score ?? 0),
      maxPoints: a?.maxPoints ?? 0
    }
  })
})

const totalDelta = computed(() => {
  if (!draftA.value?.result || !draftB.value?.result) return 0
  return draftB.value.result.totalScore - draftA.value.result.totalScore
})

const wordDelta = computed(() => {
  if (!draftA.value || !draftB.value) return 0
  return draftB.value.wordCount - draftA.value.wordCount
})

function deltaClass(delta: number): string {
  if (delta > 0) return 'is-positive'
  if (delta < 0) return 'is-negative'
  return 'is-neutral'
}

function back() {
  if (draftA.value) {
    router.push({ name: 'writing-prompt', params: { promptId: draftA.value.promptId } })
  } else {
    router.push({ name: 'writing' })
  }
}
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>
  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="back">← Back</button>
  </div>
  <div v-else-if="draftA && draftB && draftA.result && draftB.result" class="page compare-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Schreiben · {{ prompt?.titleDe ?? '…' }} · Vergleich</div>
        <h1 class="section-title">Compare drafts<em>.</em></h1>
        <p class="section-subtitle">
          A · {{ new Date(draftA.createdAt).toLocaleString() }} → B · {{ new Date(draftB.createdAt).toLocaleString() }}
        </p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      </div>
    </header>

    <div class="compare-summary card">
      <div class="compare-cell">
        <div class="compare-cell-label">Total score</div>
        <div class="compare-cell-row">
          <span>{{ draftA.result.totalScore }}</span>
          <span class="arrow">→</span>
          <span>{{ draftB.result.totalScore }}</span>
          <span class="delta" :class="deltaClass(totalDelta)">{{ totalDelta >= 0 ? '+' : '' }}{{ totalDelta }}</span>
        </div>
      </div>
      <div class="compare-cell">
        <div class="compare-cell-label">Band</div>
        <div class="compare-cell-row">
          <span>{{ draftA.result.bandEstimate }}</span>
          <span class="arrow">→</span>
          <span>{{ draftB.result.bandEstimate }}</span>
        </div>
      </div>
      <div class="compare-cell">
        <div class="compare-cell-label">Word count</div>
        <div class="compare-cell-row">
          <span>{{ draftA.wordCount }}</span>
          <span class="arrow">→</span>
          <span>{{ draftB.wordCount }}</span>
          <span class="delta" :class="deltaClass(wordDelta)">{{ wordDelta >= 0 ? '+' : '' }}{{ wordDelta }}</span>
        </div>
      </div>
    </div>

    <h3 class="compare-section-title">Per criterion</h3>
    <ul class="compare-criteria">
      <li v-for="cd in criterionDeltas" :key="cd.key" class="compare-criterion-row">
        <span class="cc-label">{{ cd.labelDe }}</span>
        <span class="cc-scores">{{ cd.scoreA }} / {{ cd.maxPoints }} → {{ cd.scoreB }} / {{ cd.maxPoints }}</span>
        <span class="cc-delta" :class="deltaClass(cd.delta)">{{ cd.delta >= 0 ? '+' : '' }}{{ cd.delta }}</span>
      </li>
    </ul>

    <h3 class="compare-section-title">Overall summaries</h3>
    <div class="compare-overall-stack">
      <div class="compare-overall-card card">
        <div class="compare-overall-label">A · {{ new Date(draftA.createdAt).toLocaleDateString() }}</div>
        <div class="compare-overall-text">{{ draftA.result.overallDe }}</div>
      </div>
      <div class="compare-overall-card card">
        <div class="compare-overall-label">B · {{ new Date(draftB.createdAt).toLocaleDateString() }}</div>
        <div class="compare-overall-text">{{ draftB.result.overallDe }}</div>
      </div>
    </div>
  </div>
  <div v-else class="page">
    <div class="alert alert-warning">
      <span class="alert-label">Not comparable</span>
      Both drafts must be graded to compare them.
    </div>
    <button class="btn btn-ghost" type="button" @click="back">← Back</button>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.compare-page { max-width: 880px; }
.compare-summary {
  display: flex; gap: 24px; padding: 18px;
  background: var(--paper-deep); margin: 16px 0 28px;
  flex-wrap: wrap;
}
.compare-cell { flex: 1 1 200px; }
.compare-cell-label {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 6px;
}
.compare-cell-row {
  display: flex; gap: 10px; align-items: baseline;
  font-family: var(--font-display); font-size: 22px;
}
.compare-cell-row .arrow { color: var(--mute); }
.delta {
  font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.14em;
  padding: 2px 8px; border-radius: 3px; margin-left: auto;
}
.delta.is-positive { background: color-mix(in srgb, var(--success) 18%, transparent); color: var(--success); }
.delta.is-negative { background: color-mix(in srgb, var(--danger) 18%, transparent);  color: var(--danger); }
.delta.is-neutral  { background: color-mix(in srgb, var(--mute) 18%, transparent);   color: var(--mute); }

.compare-section-title {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); margin: 24px 0 12px;
}

.compare-criteria { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
.compare-criterion-row {
  display: flex; gap: 16px; align-items: baseline;
  padding: 8px 0; border-bottom: 1px solid var(--hairline); font-size: 14px;
}
.cc-label { font-family: var(--font-display); flex: 0 0 220px; }
.cc-scores { font-family: var(--font-mono); font-variant-numeric: tabular-nums; color: var(--mute); }
.cc-delta {
  font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.14em;
  padding: 2px 8px; border-radius: 3px; margin-left: auto;
}
.cc-delta.is-positive { background: color-mix(in srgb, var(--success) 18%, transparent); color: var(--success); }
.cc-delta.is-negative { background: color-mix(in srgb, var(--danger) 18%, transparent);  color: var(--danger); }
.cc-delta.is-neutral  { color: var(--mute); }

.compare-overall-stack { display: grid; gap: 12px; }
.compare-overall-card { padding: 16px 18px; }
.compare-overall-label {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 8px;
}
.compare-overall-text { font-size: 14px; line-height: 1.55; }
</style>
