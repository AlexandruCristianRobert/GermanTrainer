<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  loadHistory,
  clearHistory,
  type QuizHistoryEntry,
  type QuizHistoryType
} from '../../composables/useQuizHistory'
import { computeStats } from '../../composables/useQuizStats'
import { getPromptById } from '../../composables/useWritingPrompts'
import { usePagination } from '../../composables/usePagination'
import Pagination from '../../components/Pagination.vue'
import MotivationStrip from '../../components/charts/MotivationStrip.vue'
import ActivityCalendar from '../../components/charts/ActivityCalendar.vue'
import AccuracyTrend from '../../components/charts/AccuracyTrend.vue'
import CumulativeProgress from '../../components/charts/CumulativeProgress.vue'
import SpeedTrend from '../../components/charts/SpeedTrend.vue'
import TypeDistribution from '../../components/charts/TypeDistribution.vue'
import TypeAccuracyRadar from '../../components/charts/TypeAccuracyRadar.vue'
import TypeBreakdown from '../../components/charts/TypeBreakdown.vue'
import MetaAccuracyBar from '../../components/charts/MetaAccuracyBar.vue'
import DurationHistogram from '../../components/charts/DurationHistogram.vue'
import CountVsAccuracyScatter from '../../components/charts/CountVsAccuracyScatter.vue'
import ScoreTrendChart from '../../components/charts/ScoreTrendChart.vue'
import RunCountByType from '../../components/charts/RunCountByType.vue'
import LevelAssessmentPanel from '../../components/charts/LevelAssessmentPanel.vue'
import KonjunktivStats from '../../components/charts/KonjunktivStats.vue'
import PrepWeakPoints from '../../components/charts/PrepWeakPoints.vue'
import VerbWeakPoints from '../../components/charts/VerbWeakPoints.vue'
import DacWeakPoints from '../../components/charts/DacWeakPoints.vue'
import PassivStats from '../../components/charts/PassivStats.vue'
import WritingStats from '../../components/charts/WritingStats.vue'
import SimulatorStats from '../../components/charts/SimulatorStats.vue'

const router = useRouter()

const items = ref<QuizHistoryEntry[]>(loadHistory())
const filter = ref<QuizHistoryType | 'all'>('all')

const stats = computed(() => computeStats(items.value))

interface TypeMeta { label: string; de: string; module: string }
const QUIZ_TYPES: Record<QuizHistoryType, TypeMeta> = {
  'noun-gender':      { label: 'Noun gender',        de: 'Substantiv · der/die/das', module: 'Nouns' },
  'noun-translation': { label: 'Noun translation',   de: 'Substantiv · Übersetzung', module: 'Nouns' },
  'adjective':        { label: 'Adjective sentence', de: 'Adjektiv · Lückentext',    module: 'Adjectives' },
  'verb-translation': { label: 'Verb translation',   de: 'Verb · Übersetzung',       module: 'Verbs' },
  'verb-conjugation': { label: 'Verb conjugation',   de: 'Verb · Konjugation',       module: 'Verbs' },
  'verb-stammformen':     { label: 'Verb · principal parts', de: 'Verb · Stammformen',  module: 'Verbs' },
  'verb-case-government': { label: 'Verb · case government', de: 'Verb · Rektion',      module: 'Verbs' },
  'prep-case':        { label: 'Preposition · case', de: 'Präposition · Kasus',      module: 'Prepositions' },
  'prep-article':     { label: 'Preposition · article', de: 'Präposition · Artikel', module: 'Prepositions' },
  'prep-two-way':     { label: 'Preposition · two-way', de: 'Präposition · Wechsel', module: 'Prepositions' },
  'prep-collocations':    { label: 'Preposition · fixed',    de: 'Feste Präpositionen', module: 'Prepositions' },
  'dac-formation':    { label: 'Da-compounds · formation', de: 'Da-Compounds · Bildung', module: 'Da-Compounds' },
  'dac-match':        { label: 'Da-compounds · matching', de: 'Da-Compounds · Zuordnung', module: 'Da-Compounds' },
  'dac-substitution': { label: 'Da-compounds · gap-fill', de: 'Da-Compounds · Lückentext', module: 'Da-Compounds' },
  'dac-neighbors':    { label: 'Da-compounds · near neighbors', de: 'Da-Compounds · Verwechslung', module: 'Da-Compounds' },
  'dac-case':         { label: 'Da-compounds · case', de: 'Da-Compounds · Kasus', module: 'Da-Compounds' },
  'dac-pronoun-case': { label: 'Da-compounds · pronoun case', de: 'Da-Compounds · Pronomen-Kasus', module: 'Da-Compounds' },
  'dac-article':      { label: 'Da-compounds · article fill', de: 'Da-Compounds · Artikel', module: 'Da-Compounds' },
  'dac-transform':    { label: 'Da-compounds · thing or person', de: 'Da-Compounds · Sache oder Person', module: 'Da-Compounds' },
  'dac-wo-question':  { label: 'Da-compounds · wo-questions', de: 'Da-Compounds · W-Fragen', module: 'Da-Compounds' },
  'dac-dialogue':     { label: 'Da-compounds · dialogue', de: 'Da-Compounds · Dialog', module: 'Da-Compounds' },
  'dac-korrelat':     { label: 'Da-compounds · Korrelat', de: 'Da-Compounds · Korrelat', module: 'Da-Compounds' },
  'dac-paraphrase':   { label: 'Da-compounds · paraphrase', de: 'Da-Compounds · Umformung', module: 'Da-Compounds' },
  'dac-contrast':     { label: 'Da-compounds · meaning contrast', de: 'Da-Compounds · Bedeutungskontrast', module: 'Da-Compounds' },
  'dac-sentence':     { label: 'Da-compounds · sentence (AI)', de: 'Da-Compounds · Satz (KI)', module: 'Da-Compounds' },
  'dac-assembly':     { label: 'Da-compounds · assembly', de: 'Da-Compounds · Satzbau', module: 'Da-Compounds' },
  'dac-answer':       { label: 'Da-compounds · answer (AI)', de: 'Da-Compounds · Antworten (KI)', module: 'Da-Compounds' },
  'prep-sentence':    { label: 'Preposition · sentence (AI)', de: 'Präposition · Satz (KI)', module: 'Prepositions' },
  'prep-remedial':    { label: 'Preposition · remedial', de: 'Präposition · Schwachstellen', module: 'Prepositions' },
  'verb-sentence':  { label: 'Verb · sentence (AI)', de: 'Verb · Satz (KI)', module: 'Verbs' },
  'verb-remedial':  { label: 'Verb · remedial', de: 'Verb · Schwachstellen', module: 'Verbs' },
  'decl-table':     { label: 'Declension · table', de: 'Deklination · Tabelle', module: 'Declension' },
  'decl-article':   { label: 'Declension · article', de: 'Deklination · Artikel', module: 'Declension' },
  'decl-adjective': { label: 'Declension · adj. ending', de: 'Deklination · Endung', module: 'Declension' },
  'decl-pronoun':           { label: 'Declension · pronouns', de: 'Deklination · Pronomen', module: 'Declension' },
  'decl-case-recognition':  { label: 'Declension · case ID', de: 'Deklination · Kasus erkennen', module: 'Declension' },
  'decl-article-ai': { label: 'Declension · article (AI)', de: 'Deklination · Artikel (KI)', module: 'Declension' },
  'konjunktiv-rewrite': { label: 'Konjunktiv I — indirect speech', de: 'Konjunktiv I · Indirekte Rede', module: 'Grammatik' },
  'passiv-transform':   { label: 'Passiv transformation',          de: 'Passiv · Transformation',     module: 'Grammatik' },
  'writing-grade':      { label: 'Writing — graded essay',         de: 'Schreiben · benoteter Aufsatz', module: 'Schreiben' },
  'simulator-c1':       { label: 'Goethe C1 — mock exam',          de: 'Goethe C1 · Prüfungssimulation', module: 'Schreiben' }
}

const typeOrder: QuizHistoryType[] = [
  'noun-gender', 'noun-translation', 'adjective',
  'verb-translation', 'verb-conjugation',
  'verb-stammformen', 'verb-case-government',
  'verb-sentence', 'verb-remedial',
  'prep-case', 'prep-article', 'prep-two-way',
  'prep-collocations',
  'dac-formation', 'dac-match', 'dac-substitution', 'dac-neighbors',
  'dac-case', 'dac-pronoun-case', 'dac-article',
  'dac-transform', 'dac-wo-question', 'dac-dialogue',
  'dac-korrelat', 'dac-paraphrase', 'dac-contrast',
  'dac-sentence',
  'dac-assembly', 'dac-answer',
  'prep-sentence', 'prep-remedial',
  'decl-table', 'decl-article', 'decl-adjective',
  'decl-pronoun', 'decl-case-recognition',
  'decl-article-ai',
  'konjunktiv-rewrite',
  'passiv-transform',
  'writing-grade',
  'simulator-c1'
]

const filtered = computed(() =>
  filter.value === 'all' ? items.value : items.value.filter(it => it.type === filter.value)
)

const pagination = usePagination(() => filtered.value, 25, 'history')

const totalRuns = computed(() => items.value.length)
const totalQuestions = computed(() => items.value.reduce((s, it) => s + (it.count || 0), 0))
const totalCorrect = computed(() => items.value.reduce((s, it) => s + (it.correct || 0), 0))
const overallPct = computed(() =>
  totalQuestions.value > 0 ? Math.round(100 * totalCorrect.value / totalQuestions.value) : 0
)

// ── Secondary stat row (Update 4) ────────────────────────────────
const perRunScores = computed(() =>
  items.value.map(it => (it.count > 0 ? Math.round((100 * it.correct) / it.count) : 0))
)
const avgPct = computed(() => {
  const arr = perRunScores.value
  if (arr.length === 0) return 0
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
})
const bestPct = computed(() =>
  perRunScores.value.length === 0 ? 0 : Math.max(...perRunScores.value)
)
const totalDurMs = computed(() =>
  items.value.reduce((s, it) => s + (it.durationMs || 0), 0)
)
const avgDurMs = computed(() =>
  items.value.length === 0 ? 0 : totalDurMs.value / items.value.length
)
const streakDays = computed(() => stats.value.currentStreakDays)
const days30Active = computed(() => {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  const set = new Set<string>()
  for (const it of items.value) {
    const ts = Date.parse(it.startedAt)
    if (Number.isFinite(ts) && ts >= cutoff) {
      const d = new Date(ts)
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
    }
  }
  return set.size
})
const topTypeLabel = computed(() => {
  const counts = new Map<QuizHistoryType, number>()
  for (const it of items.value) {
    counts.set(it.type, (counts.get(it.type) ?? 0) + 1)
  }
  let best: QuizHistoryType | null = null
  let bestCount = 0
  for (const [t, c] of counts.entries()) {
    if (c > bestCount) {
      best = t
      bestCount = c
    }
  }
  return best ? QUIZ_TYPES[best].label : '—'
})

function typeCounts(t: QuizHistoryType): number {
  return items.value.filter(it => it.type === t).length
}

function onClear() {
  if (!window.confirm('Delete all quiz history? This cannot be undone.')) return
  clearHistory()
  items.value = []
  filter.value = 'all'
}

function fmtRelTime(ts: string): string {
  const d = new Date(ts)
  const diffMs = Date.now() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function fmtDuration(ms: number): string {
  if (!ms || ms < 0) return '—'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const ss = s % 60
  if (m === 0) return `${s}s`
  return `${m}m ${ss}s`
}

function fmtTimeOfDay(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleString(undefined, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

function pctClass(pct: number): 'success' | 'ochre' | 'danger' {
  if (pct >= 80) return 'success'
  if (pct >= 50) return 'ochre'
  return 'danger'
}

function pct(it: QuizHistoryEntry): number {
  return it.count > 0 ? Math.round(100 * it.correct / it.count) : 0
}

function summariseMeta(it: QuizHistoryEntry): string {
  const m = it.meta ?? {}
  if (it.type === 'simulator-c1') {
    const parts: string[] = []
    if (typeof m.task1Score === 'number') parts.push(`T1: ${m.task1Score}`)
    if (typeof m.task2Score === 'number') parts.push(`T2: ${m.task2Score}`)
    if (typeof m.combinedScore === 'number') parts.push(`Σ ${m.combinedScore}`)
    if (m.passes !== undefined) parts.push(m.passes ? 'PASS' : 'FAIL')
    return parts.join(' · ')
  }
  if (it.type === 'writing-grade') {
    const parts: string[] = []
    const title = m.promptId ? (getPromptById(m.promptId)?.titleDe ?? m.promptId) : null
    if (title) parts.push(title)
    if (m.rubric) parts.push(m.rubric)
    if (m.wordCount != null) parts.push(`${m.wordCount} Wörter`)
    return parts.length ? parts.join(' · ') : '—'
  }
  const parts: string[] = []
  if (m.mode) parts.push(m.mode)
  if (m.groups && m.groups.length) parts.push(`${m.groups.length} group${m.groups.length === 1 ? '' : 's'}`)
  if (m.levels && m.levels.length) parts.push(m.levels.join('/'))
  if (m.types && m.types.length && m.types.length < 5) parts.push(m.types.join(', '))
  if (m.roles?.length) parts.push(m.roles.join(', '))
  if (m.tenses && m.tenses.length) parts.push(`${m.tenses.length} tense${m.tenses.length === 1 ? '' : 's'}`)
  return parts.length ? parts.join(' · ') : '—'
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Verlauf · Quiz history</div>
        <h1 class="section-title">History<em>.</em></h1>
        <p class="section-subtitle">
          Every quiz you've finished, with its score, length, and time.
          Stored locally — only on this device.
        </p>
      </div>
      <div v-if="items.length > 0" class="hist-actions">
        <button class="btn btn-ghost btn-danger" type="button" @click="onClear">Clear history</button>
      </div>
    </header>

    <div class="stat-strip">
      <div class="stat">
        <div class="stat-num">{{ totalRuns }}</div>
        <div class="stat-label">total runs</div>
      </div>
      <div class="stat">
        <div class="stat-num">{{ totalQuestions }}</div>
        <div class="stat-label">questions answered</div>
      </div>
      <div class="stat">
        <div class="stat-num">{{ totalCorrect }}</div>
        <div class="stat-label">correct</div>
      </div>
      <div class="stat">
        <div class="stat-num">
          {{ overallPct }}<span class="stat-num-suffix">%</span>
        </div>
        <div class="stat-label">overall</div>
      </div>
    </div>

    <!-- ── Update 4: secondary aggregate strip + editorial chart row ── -->
    <template v-if="items.length > 0">
      <div class="stat-strip stat-strip-secondary">
        <div class="stat">
          <div class="stat-num">{{ avgPct }}<span class="stat-num-suffix">%</span></div>
          <div class="stat-label">avg score</div>
        </div>
        <div class="stat">
          <div class="stat-num">{{ bestPct }}<span class="stat-num-suffix">%</span></div>
          <div class="stat-label">best run</div>
        </div>
        <div class="stat">
          <div class="stat-num">{{ streakDays }}</div>
          <div class="stat-label">day streak</div>
        </div>
        <div class="stat">
          <div class="stat-num">{{ days30Active }}<span class="stat-num-suffix">/30</span></div>
          <div class="stat-label">days active</div>
        </div>
        <div class="stat">
          <div class="stat-num">{{ fmtDuration(avgDurMs) }}</div>
          <div class="stat-label">avg duration</div>
        </div>
        <div class="stat stat-wide">
          <div class="stat-num">{{ topTypeLabel }}</div>
          <div class="stat-label">most practiced</div>
        </div>
      </div>

      <div class="chart-panel chart-panel-wide">
        <div class="chart-panel-title">
          <span class="chart-numeral">I</span>
          <div>
            <div class="chart-panel-de">Fortschritt</div>
            <div class="chart-panel-en">Score over time</div>
          </div>
        </div>
        <ScoreTrendChart :items="items" />
      </div>

      <div class="chart-panel chart-panel-wide">
        <div class="chart-panel-title">
          <span class="chart-numeral">II</span>
          <div>
            <div class="chart-panel-de">Verteilung</div>
            <div class="chart-panel-en">By quiz type</div>
          </div>
        </div>
        <RunCountByType :items="items" />
      </div>

      <LevelAssessmentPanel :stats="stats" :history-entries="items" />

      <div class="charts-section-mark">Statistiken · Charts</div>

      <MotivationStrip :stats="stats" />

      <ActivityCalendar :stats="stats" />

      <div class="chart-grid-2">
        <AccuracyTrend :stats="stats" />
        <CumulativeProgress :stats="stats" />
      </div>

      <div class="chart-grid-2">
        <TypeDistribution :stats="stats" />
        <TypeAccuracyRadar :stats="stats" />
      </div>

      <TypeBreakdown :stats="stats" />

      <div class="chart-grid-2">
        <MetaAccuracyBar
          mark="Niveau"
          title="Accuracy by CEFR level"
          subtitle="Verb runs grouped by level. Sage ≥80%, ochre 50–79%, clay below."
          :data="stats.accuracyByLevel"
          empty-message="No verb runs with level filters yet."
        />
        <MetaAccuracyBar
          mark="Verbtyp"
          title="Accuracy by verb type"
          subtitle="Regular vs irregular vs separable vs modal vs mixed."
          :data="stats.accuracyByVerbType"
          empty-message="No verb runs with type filters yet."
        />
      </div>

      <div class="chart-grid-2">
        <MetaAccuracyBar
          mark="Kasus"
          title="Accuracy by case"
          subtitle="Nominative / accusative / dative / genitive."
          :data="stats.accuracyByCase"
          empty-message="No verb runs with case filters yet."
        />
        <MetaAccuracyBar
          mark="Tempus"
          title="Accuracy by tense"
          subtitle="Across the conjugation quizzes."
          :data="stats.accuracyByTense"
          empty-message="No conjugation runs yet."
        />
      </div>

      <MetaAccuracyBar
        mark="Gruppe"
        title="Accuracy by group"
        subtitle="Noun and adjective groups, sorted by accuracy. Top 8 best + bottom 8 worst when you have many."
        :data="stats.accuracyByGroup"
        empty-message="No runs with group filters yet."
        :top-n="8"
      />

      <div class="chart-grid-2">
        <DurationHistogram :stats="stats" />
        <SpeedTrend :stats="stats" />
      </div>

      <CountVsAccuracyScatter :stats="stats" />

      <div class="charts-section-mark">Module · Per-module breakdown</div>

      <PrepWeakPoints
        v-if="stats.runsByType['prep-sentence'] + stats.runsByType['prep-remedial'] > 0"
        :stats="stats"
      />
      <VerbWeakPoints :entries="items" />
      <DacWeakPoints :entries="items" />
      <KonjunktivStats :items="items" />
      <PassivStats :items="items" />
      <WritingStats :items="items" />
      <SimulatorStats :items="items" />

      <div class="charts-section-mark">Verlauf · Sessions</div>
    </template>

    <div v-if="items.length > 0" class="toolbar history-toolbar">
      <div class="segmented">
        <button :class="{ active: filter === 'all' }" @click="filter = 'all'">All · {{ items.length }}</button>
        <template v-for="t in typeOrder" :key="t">
          <button
            v-if="typeCounts(t) > 0"
            :class="{ active: filter === t }"
            @click="filter = t"
          >
            {{ QUIZ_TYPES[t].label }} · {{ typeCounts(t) }}
          </button>
        </template>
      </div>
    </div>

    <Pagination v-if="items.length > 0" :pagination="pagination" label="runs" />

    <div v-if="items.length === 0" class="empty-state">
      <div class="empty-mark">∅</div>
      <h3>No quizzes yet.</h3>
      <p>Finish a quiz and it'll show up here.</p>
      <button class="btn btn-accent" type="button" @click="router.push({ name: 'home' })">
        Back to home <span aria-hidden="true">→</span>
      </button>
    </div>

    <table v-else class="data-table history-table desktop-only">
      <thead>
        <tr>
          <th style="width: 24%">Quiz</th>
          <th style="width: 20%">Started</th>
          <th style="width: 12%">Duration</th>
          <th style="width: 12%">Questions</th>
          <th style="width: 18%">Score</th>
          <th style="width: 14%">Filters</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="it in pagination.slice.value" :key="it.id">
          <td>
            <div class="hist-quiz-label">{{ QUIZ_TYPES[it.type]?.label ?? it.type }}</div>
            <div class="hist-quiz-de">{{ QUIZ_TYPES[it.type]?.de ?? '' }}</div>
          </td>
          <td>
            <div>{{ fmtRelTime(it.startedAt) }}</div>
            <div class="hist-stamp">{{ fmtTimeOfDay(it.startedAt) }}</div>
          </td>
          <td>
            <span class="mono hist-dur">{{ fmtDuration(it.durationMs) }}</span>
          </td>
          <td>
            <span class="mono">{{ it.count }}</span>
            <span class="hist-asked">asked</span>
          </td>
          <td>
            <div v-if="it.type === 'writing-grade' || it.type === 'simulator-c1'" class="hist-score-row">
              <template v-if="it.type === 'writing-grade'">
                <span class="hist-score">
                  {{ it.meta.totalScore }}<span class="hist-score-denom">/100</span>
                </span>
                <span v-if="it.meta.bandEstimate" class="tag history-pct history-pct-success">{{ it.meta.bandEstimate }}</span>
              </template>
              <template v-else>
                <span class="hist-score">
                  {{ it.meta.combinedScore }}<span class="hist-score-denom">/100</span>
                </span>
                <span class="tag history-pct" :class="it.meta.passes ? 'history-pct-success' : 'history-pct-danger'">{{ it.meta.passes ? 'PASS' : 'FAIL' }}</span>
              </template>
            </div>
            <div v-else class="hist-score-row">
              <span class="hist-score">
                {{ it.correct }}<span class="hist-score-denom">/{{ it.count }}</span>
              </span>
              <span class="tag history-pct" :class="`history-pct-${pctClass(pct(it))}`">{{ pct(it) }}%</span>
            </div>
          </td>
          <td>
            <div class="hist-meta">{{ summariseMeta(it) }}</div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Mobile card list -->
    <div v-if="items.length > 0" class="mobile-list mobile-only">
      <div v-for="it in pagination.slice.value" :key="it.id" class="hist-card">
        <div class="hist-card-top">
          <div>
            <div class="hist-quiz-label">{{ QUIZ_TYPES[it.type]?.label ?? it.type }}</div>
            <div class="hist-quiz-de">{{ QUIZ_TYPES[it.type]?.de ?? '' }}</div>
          </div>
          <div v-if="it.type === 'writing-grade' || it.type === 'simulator-c1'" class="hist-score-row">
            <template v-if="it.type === 'writing-grade'">
              <span class="hist-score">
                {{ it.meta.totalScore }}<span class="hist-score-denom">/100</span>
              </span>
              <span v-if="it.meta.bandEstimate" class="tag history-pct history-pct-success">{{ it.meta.bandEstimate }}</span>
            </template>
            <template v-else>
              <span class="hist-score">
                {{ it.meta.combinedScore }}<span class="hist-score-denom">/100</span>
              </span>
              <span class="tag history-pct" :class="it.meta.passes ? 'history-pct-success' : 'history-pct-danger'">{{ it.meta.passes ? 'PASS' : 'FAIL' }}</span>
            </template>
          </div>
          <div v-else class="hist-score-row">
            <span class="hist-score">
              {{ it.correct }}<span class="hist-score-denom">/{{ it.count }}</span>
            </span>
            <span class="tag history-pct" :class="`history-pct-${pctClass(pct(it))}`">{{ pct(it) }}%</span>
          </div>
        </div>
        <div class="hist-card-meta">
          <span>{{ fmtRelTime(it.startedAt) }}</span>
          <span>·</span>
          <span class="mono">{{ fmtDuration(it.durationMs) }}</span>
          <span>·</span>
          <span class="mono">{{ it.count }} q</span>
        </div>
        <div class="hist-card-filters">{{ summariseMeta(it) }}</div>
      </div>
    </div>

    <Pagination v-if="items.length > 0" :pagination="pagination" label="runs" />
  </div>
</template>

<style scoped>
.hist-actions { text-align: right; }
.history-toolbar { margin-top: 32px; }

.hist-quiz-label {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 18px;
  color: var(--ink);
}
.hist-quiz-de {
  font-family: var(--font-display);
  font-style: italic;
  color: var(--mute);
  font-size: 13px;
  margin-top: 2px;
}

.hist-stamp {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--mute);
  margin-top: 2px;
}

.hist-dur { color: var(--ink-soft); }

.hist-asked {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--mute);
  margin-left: 4px;
  font-size: 13px;
}

.hist-score-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.hist-score {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 500;
}
.hist-score-denom { color: var(--mute); }

.hist-meta {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-soft);
  line-height: 1.5;
}

/* Mobile cards */
.mobile-only { display: none; }
.desktop-only { display: table; width: 100%; }

@media (max-width: 720px) {
  .mobile-only { display: flex; flex-direction: column; gap: 0; margin-top: 16px; }
  .desktop-only { display: none; }
}

.hist-card {
  padding: 14px 0;
  border-bottom: 1px dotted var(--hairline);
}
.hist-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.hist-card-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
  color: var(--ink-soft);
  font-size: 13px;
}
.hist-card-filters {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-soft);
  margin-top: 4px;
  letter-spacing: 0.04em;
}

/* Wide hero panels — Fortschritt + Verteilung sit full-width above
   the editorial chart grid below, so the score-over-time line has
   room to breathe (was previously cramped in a 3-col row). */
.chart-panel-wide {
  margin-top: 24px;
}
.chart-panel-wide:first-of-type {
  margin-top: 32px;
}
</style>
