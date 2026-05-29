<script setup lang="ts">
import { computed } from 'vue'
import ChartCard from './ChartCard.vue'
import type { QuizHistoryEntry } from '../../composables/useQuizHistory'
import {
  TRANSFORMATION_LABELS,
  TRANSFORMATION_TYPES,
  type TransformationType
} from '../../data/passiv'

const props = defineProps<{ items: QuizHistoryEntry[] }>()

type Difficulty = 'easy' | 'medium' | 'hard'

interface DifficultyTile {
  key: Difficulty
  label: string
  correct: number
  count: number
  runs: number
  accuracy: number
}

interface TypeRow {
  key: TransformationType
  label: string
  correct: number
  total: number
  accuracy: number
}

const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard']
const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy · B1',
  medium: 'Medium · B2',
  hard: 'Hard · C1'
}

const entries = computed(() => props.items.filter(it => it.type === 'passiv-transform'))

const difficultyTiles = computed<DifficultyTile[]>(() => {
  const acc = new Map<Difficulty, { correct: number; count: number; runs: number }>()
  for (const d of DIFFICULTY_ORDER) acc.set(d, { correct: 0, count: 0, runs: 0 })
  for (const it of entries.value) {
    const d = it.meta.passivDifficulty
    if (!d) continue
    const cur = acc.get(d)
    if (!cur) continue
    cur.correct += it.correct ?? 0
    cur.count += it.count ?? 0
    cur.runs += 1
  }
  return DIFFICULTY_ORDER.map(d => {
    const c = acc.get(d)!
    return {
      key: d,
      label: DIFFICULTY_LABEL[d],
      correct: c.correct,
      count: c.count,
      runs: c.runs,
      accuracy: c.count > 0 ? c.correct / c.count : 0
    }
  })
})

const typeRows = computed<TypeRow[]>(() => {
  const acc = new Map<TransformationType, { correct: number; total: number }>()
  for (const t of TRANSFORMATION_TYPES) acc.set(t, { correct: 0, total: 0 })
  for (const it of entries.value) {
    const perType = it.meta.passivPerTypeCorrect
    if (!perType) continue
    for (const t of TRANSFORMATION_TYPES) {
      const bucket = perType[t]
      if (!bucket) continue
      const cur = acc.get(t)!
      cur.correct += bucket.correct ?? 0
      cur.total += bucket.total ?? 0
    }
  }
  return TRANSFORMATION_TYPES.map(t => {
    const c = acc.get(t)!
    return {
      key: t,
      label: TRANSFORMATION_LABELS[t],
      correct: c.correct,
      total: c.total,
      accuracy: c.total > 0 ? c.correct / c.total : 0
    }
  }).filter(r => r.total > 0)
})

function pctColor(accuracy: number): string {
  if (accuracy >= 0.8) return 'var(--sage)'
  if (accuracy >= 0.5) return 'var(--ochre)'
  return 'var(--clay)'
}

function pctText(accuracy: number, count: number): string {
  if (count === 0) return '—'
  return `${Math.round(accuracy * 100)}%`
}
</script>

<template>
  <ChartCard
    mark="Passiv"
    title="Transformation accuracy"
    subtitle="Which constructions hold you back"
  >
    <div v-if="entries.length === 0" class="chart-empty">
      Run a Passiv transformation drill to see your accuracy here.
    </div>
    <template v-else>
      <div class="pas-tiles">
        <div
          v-for="t in difficultyTiles"
          :key="t.key"
          class="pas-tile"
        >
          <div class="pas-tile-label">{{ t.label }}</div>
          <div
            class="pas-tile-num"
            :style="{ color: t.count > 0 ? pctColor(t.accuracy) : 'var(--mute)' }"
          >{{ pctText(t.accuracy, t.count) }}</div>
          <div class="pas-tile-foot">
            {{ t.runs }} {{ t.runs === 1 ? 'run' : 'runs' }} ·
            {{ t.correct }}/{{ t.count }}
          </div>
        </div>
      </div>

      <div class="pas-section">
        <div class="pas-section-head">Per construction</div>
        <div v-if="typeRows.length === 0" class="pas-empty-line">
          No per-type breakdown recorded yet.
        </div>
        <div v-else class="pas-bars">
          <div
            v-for="r in typeRows"
            :key="r.key"
            class="pas-bar-row"
          >
            <div class="pas-bar-label">{{ r.label }}</div>
            <div class="pas-bar-track">
              <div
                class="pas-bar-fill"
                :style="{
                  width: Math.round(r.accuracy * 100) + '%',
                  background: pctColor(r.accuracy)
                }"
              />
            </div>
            <div class="pas-bar-num">
              <strong>{{ Math.round(r.accuracy * 100) }}%</strong>
              <span class="pas-bar-tail">{{ r.correct }}/{{ r.total }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </ChartCard>
</template>

<style scoped>
.pas-tiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}
.pas-tile {
  background: var(--paper);
  border: 1px solid var(--hairline);
  border-radius: 3px;
  padding: 14px 16px;
}
.pas-tile-label {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 6px;
}
.pas-tile-num {
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 500;
  line-height: 1;
  margin-bottom: 6px;
}
.pas-tile-foot {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-soft);
}

.pas-section {
  border-top: 1px solid var(--hairline);
  padding-top: 18px;
}
.pas-section-head {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 14px;
}
.pas-empty-line {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 14px;
  color: var(--mute);
  padding: 8px 0;
}
.pas-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pas-bar-row {
  display: grid;
  grid-template-columns: minmax(180px, 260px) 1fr 110px;
  align-items: center;
  gap: 14px;
}
.pas-bar-label {
  font-family: var(--font-display);
  font-size: 14px;
  color: var(--ink);
  line-height: 1.25;
}
.pas-bar-track {
  position: relative;
  height: 10px;
  background: var(--hairline);
  border-radius: 2px;
  overflow: hidden;
}
.pas-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 2px;
  transition: width 240ms ease-out;
}
.pas-bar-num {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-soft);
  text-align: right;
}
.pas-bar-num strong {
  color: var(--ink);
  margin-right: 6px;
}
.pas-bar-tail {
  color: var(--mute);
}

@media (max-width: 720px) {
  .pas-tiles {
    grid-template-columns: 1fr;
  }
  .pas-bar-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  .pas-bar-num {
    text-align: left;
  }
}
</style>
