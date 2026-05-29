<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ChartCard from './ChartCard.vue'
import type { StatsBundle } from '../../composables/useQuizStats'
import type { QuizHistoryEntry } from '../../composables/useQuizHistory'
import { useSettings } from '../../composables/useSettings'
import { useLoading } from '../../composables/useLoading'
import { useToast } from '../../composables/useToast'
import { makeGeminiClient } from '../../composables/useClaude'
import {
  ASSESSMENT_MODULES,
  assessLevel,
  historySignature,
  loadCachedAssessment,
  persistAssessment,
  type AssessmentModule,
  type LevelAssessmentResult
} from '../../composables/useLevelAssessment'

const props = defineProps<{
  stats: StatsBundle
  historyEntries: QuizHistoryEntry[]
}>()

const { settings, hasApiKey, load: loadSettings } = useSettings()
const loading = useLoading()
const toast = useToast()

const result = ref<LevelAssessmentResult | null>(null)
const settingsLoaded = ref(false)

onMounted(async () => {
  result.value = loadCachedAssessment()
  await loadSettings()
  settingsLoaded.value = true
})

const hasEnoughRuns = computed(() => props.stats.totalRuns >= 3)

const currentSignature = computed(() => historySignature(props.historyEntries))

const isStale = computed(() =>
  result.value !== null && result.value.historySignature !== currentSignature.value
)

const generatedRel = computed(() => {
  if (!result.value) return ''
  return fmtRelTime(result.value.generatedAt)
})

const subtitle = computed(() => {
  if (!hasEnoughRuns.value) return 'Finish a few more quizzes first.'
  if (!result.value) return 'Have Gemini grade your history.'
  return `Generated · ${generatedRel.value}`
})

const ctaLabel = computed(() => (result.value ? 'Refresh assessment' : 'Assess my level'))

const levelTone = computed(() => {
  if (!result.value) return 'neutral'
  switch (result.value.cefrLevel) {
    case 'A1':
    case 'A2':
      return 'clay'
    case 'B1':
    case 'B2':
      return 'ochre'
    case 'C1':
    case 'C2':
      return 'sage'
    default:
      return 'neutral'
  }
})

const MODULE_LABELS: Record<AssessmentModule, { en: string; de: string }> = {
  nouns:        { en: 'Nouns',        de: 'Substantive' },
  adjectives:   { en: 'Adjectives',   de: 'Adjektive' },
  verbs:        { en: 'Verbs',        de: 'Verben' },
  prepositions: { en: 'Prepositions', de: 'Präpositionen' },
  declension:   { en: 'Declension',   de: 'Deklination' },
  konjunktiv:   { en: 'Konjunktiv I', de: 'Konjunktiv I' },
  passiv:       { en: 'Passiv',       de: 'Passiv' },
  writing:      { en: 'Writing',      de: 'Schreiben' }
}

const moduleRows = computed(() => {
  if (!result.value) return []
  return ASSESSMENT_MODULES.map(key => {
    const m = result.value!.perModule[key] ?? { score: 0, comment: '—' }
    return {
      key,
      labelEn: MODULE_LABELS[key].en,
      labelDe: MODULE_LABELS[key].de,
      score: m.score,
      comment: m.comment,
      tone: toneForScore(m.score)
    }
  })
})

function toneForScore(score: number): 'sage' | 'ochre' | 'clay' {
  if (score >= 80) return 'sage'
  if (score >= 50) return 'ochre'
  return 'clay'
}

function fmtRelTime(ts: number): string {
  if (!ts) return 'just now'
  const diffMs = Date.now() - ts
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

async function runAssessment(): Promise<void> {
  if (!hasApiKey.value) {
    toast.error('Gemini API key missing', { description: 'Add your key in Settings first.' })
    return
  }
  loading.show(
    'Assessing your level…',
    `Gemini is reviewing ${props.stats.totalRuns} run${props.stats.totalRuns === 1 ? '' : 's'}`
  )
  try {
    const client = makeGeminiClient(settings.value.geminiApiKey)
    const fresh = await assessLevel(client, settings.value.model, props.stats)
    fresh.historySignature = currentSignature.value
    persistAssessment(fresh)
    result.value = fresh
    toast.success('Level assessment ready', {
      description: `Gemini estimates ${fresh.cefrLevel} (${fresh.confidence} confidence).`
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    toast.error('AI assessment failed', { description: message })
  } finally {
    loading.hide()
  }
}
</script>

<template>
  <ChartCard
    mark="Niveau"
    title="AI Level Assessment"
    :subtitle="subtitle"
  >
    <!-- Empty state: not enough runs -->
    <div v-if="!hasEnoughRuns" class="chart-empty la-empty">
      Finish at least 3 quizzes and Gemini can estimate your CEFR level
      based on the actual numbers in your history.
    </div>

    <!-- Has runs but no API key -->
    <div v-else-if="settingsLoaded && !hasApiKey" class="alert alert-warning la-alert">
      <span class="alert-label">Required</span>
      Set your Gemini API key in
      <router-link :to="{ name: 'settings' }">Settings</router-link>
      to enable the AI level assessment.
    </div>

    <!-- Main body -->
    <div v-else class="la-body">
      <!-- Header row: level badge + CTA -->
      <div class="la-head">
        <div v-if="result" class="la-level-block">
          <div class="la-level-badge" :data-tone="levelTone">
            {{ result.cefrLevel }}
          </div>
          <div class="la-level-meta">
            <span class="tag" :class="`tag-${levelTone}`">{{ result.confidence }} confidence</span>
            <span v-if="result.modelUsed" class="la-model mono">{{ result.modelUsed }}</span>
            <span v-if="isStale" class="tag tag-ochre">stale · history changed</span>
          </div>
        </div>
        <div v-else class="la-level-block la-level-empty">
          <div class="la-level-badge" data-tone="neutral">—</div>
          <div class="la-level-meta">
            <span class="la-hint">No assessment yet. Press the button to grade your history.</span>
          </div>
        </div>

        <div class="la-actions">
          <button
            class="btn"
            :class="result ? 'btn-ghost' : 'btn-accent'"
            type="button"
            :disabled="settingsLoaded && !hasApiKey"
            @click="runAssessment"
          >
            {{ ctaLabel }}
          </button>
        </div>
      </div>

      <template v-if="result">
        <!-- German summary -->
        <p class="la-summary">{{ result.overallSummaryDe }}</p>

        <!-- 3-column lists -->
        <div class="la-lists">
          <div class="la-list">
            <div class="la-list-mark">Stärken · Strengths</div>
            <ul>
              <li v-for="(item, i) in result.strengths" :key="`s-${i}`">{{ item }}</li>
            </ul>
          </div>
          <div class="la-list">
            <div class="la-list-mark">Schwächen · Weaknesses</div>
            <ul>
              <li v-for="(item, i) in result.weaknesses" :key="`w-${i}`">{{ item }}</li>
            </ul>
          </div>
          <div class="la-list">
            <div class="la-list-mark">Nächste Schritte · Next steps</div>
            <ul>
              <li v-for="(item, i) in result.nextSteps" :key="`n-${i}`">{{ item }}</li>
            </ul>
          </div>
        </div>

        <!-- Per-module grid -->
        <div class="la-modules">
          <div
            v-for="row in moduleRows"
            :key="row.key"
            class="la-module"
            :data-tone="row.tone"
          >
            <div class="la-module-head">
              <div class="la-module-label">
                <div class="la-module-de">{{ row.labelDe }}</div>
                <div class="la-module-en">{{ row.labelEn }}</div>
              </div>
              <div class="la-module-score mono">{{ row.score }}</div>
            </div>
            <div class="la-bar">
              <div class="la-bar-fill" :style="{ width: `${Math.max(0, Math.min(100, row.score))}%` }"></div>
            </div>
            <div class="la-module-comment">{{ row.comment }}</div>
          </div>
        </div>
      </template>
    </div>
  </ChartCard>
</template>

<style scoped>
.la-empty {
  padding: 28px 20px;
}

.la-alert {
  margin-top: 4px;
}

.la-body {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Head row ── */
.la-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.la-level-block {
  display: flex;
  align-items: center;
  gap: 18px;
}
.la-level-empty .la-level-badge {
  opacity: 0.4;
}

.la-level-badge {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 56px;
  line-height: 1;
  letter-spacing: -0.02em;
  padding: 8px 18px;
  border-radius: 4px;
  background: var(--paper-deep);
  color: var(--ink);
  border: 1px solid var(--hairline);
}
.la-level-badge[data-tone='sage']  { color: var(--sage);  border-color: var(--sage-tint);  background: var(--sage-tint); }
.la-level-badge[data-tone='ochre'] { color: var(--ochre); border-color: var(--ochre-tint); background: var(--ochre-tint); }
.la-level-badge[data-tone='clay']  { color: var(--clay);  border-color: var(--clay-tint);  background: var(--clay-tint); }

.la-level-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}
.la-model {
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--mute);
}
.la-hint {
  font-style: italic;
  color: var(--mute);
  font-size: 13.5px;
  max-width: 280px;
}

.la-actions { display: flex; gap: 8px; }

/* ── Summary ── */
.la-summary {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 19px;
  line-height: 1.45;
  color: var(--ink);
  margin: 0;
  padding-left: 12px;
  border-left: 2px solid var(--accent);
}

/* ── 3-col lists ── */
.la-lists {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}
.la-list-mark {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 10px;
}
.la-list ul {
  margin: 0;
  padding: 0 0 0 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.la-list li {
  font-size: 14px;
  line-height: 1.45;
  color: var(--ink-soft);
}

/* ── Modules grid ── */
.la-modules {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.la-module {
  border: 1px solid var(--hairline);
  border-radius: 4px;
  padding: 12px 14px;
  background: var(--paper-card);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.la-module-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.la-module-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.la-module-de {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 14px;
  color: var(--ink);
  line-height: 1.1;
}
.la-module-en {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
}
.la-module-score {
  font-size: 18px;
  font-weight: 500;
  color: var(--ink);
}
.la-module[data-tone='sage']  .la-module-score { color: var(--sage); }
.la-module[data-tone='ochre'] .la-module-score { color: var(--ochre); }
.la-module[data-tone='clay']  .la-module-score { color: var(--clay); }

.la-bar {
  width: 100%;
  height: 4px;
  background: var(--paper-deep);
  border-radius: 2px;
  overflow: hidden;
}
.la-bar-fill {
  height: 100%;
  background: var(--mute);
  transition: width 250ms ease;
}
.la-module[data-tone='sage']  .la-bar-fill { background: var(--sage); }
.la-module[data-tone='ochre'] .la-bar-fill { background: var(--ochre); }
.la-module[data-tone='clay']  .la-bar-fill { background: var(--clay); }

.la-module-comment {
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--ink-soft);
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .la-modules { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .la-lists   { grid-template-columns: 1fr; gap: 18px; }
}
@media (max-width: 540px) {
  .la-modules { grid-template-columns: 1fr; }
  .la-head { flex-direction: column; align-items: flex-start; }
  .la-actions { width: 100%; }
  .la-actions .btn { width: 100%; }
  .la-level-badge { font-size: 44px; }
}
</style>
