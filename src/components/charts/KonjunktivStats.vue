<script setup lang="ts">
import { computed } from 'vue'
import ChartCard from './ChartCard.vue'
import type { QuizHistoryEntry } from '../../composables/useQuizHistory'

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

interface TopicRow {
  key: string
  label: string
  correct: number
  count: number
  runs: number
  accuracy: number
}

const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard']
const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard'
}

const TOPIC_KEYS = ['Politik', 'Wirtschaft', 'Wissenschaft', 'Sport', 'Kultur'] as const

const entries = computed(() => props.items.filter(it => it.type === 'konjunktiv-rewrite'))

const difficultyTiles = computed<DifficultyTile[]>(() => {
  const acc = new Map<Difficulty, { correct: number; count: number; runs: number }>()
  for (const d of DIFFICULTY_ORDER) acc.set(d, { correct: 0, count: 0, runs: 0 })
  for (const it of entries.value) {
    const d = it.meta.kiDifficulty
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

const topicRows = computed<TopicRow[]>(() => {
  const acc = new Map<string, { correct: number; count: number; runs: number }>()
  for (const t of TOPIC_KEYS) acc.set(t, { correct: 0, count: 0, runs: 0 })
  for (const it of entries.value) {
    const topics = it.meta.kiTopics ?? []
    for (const t of topics) {
      const cur = acc.get(t)
      if (!cur) continue
      cur.correct += it.correct ?? 0
      cur.count += it.count ?? 0
      cur.runs += 1
    }
  }
  return TOPIC_KEYS.map(t => {
    const c = acc.get(t)!
    return {
      key: t,
      label: t,
      correct: c.correct,
      count: c.count,
      runs: c.runs,
      accuracy: c.count > 0 ? c.correct / c.count : 0
    }
  }).filter(r => r.count > 0)
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
    mark="Indirekte Rede"
    title="Konjunktiv I performance"
    subtitle="Where you stand on K1 vs K2 fallback"
  >
    <div v-if="entries.length === 0" class="chart-empty">
      Run a Konjunktiv I quiz to see your performance here.
    </div>
    <template v-else>
      <div class="kjs-tiles">
        <div
          v-for="t in difficultyTiles"
          :key="t.key"
          class="kjs-tile"
        >
          <div class="kjs-tile-label">{{ t.label }}</div>
          <div
            class="kjs-tile-num"
            :style="{ color: t.count > 0 ? pctColor(t.accuracy) : 'var(--mute)' }"
          >{{ pctText(t.accuracy, t.count) }}</div>
          <div class="kjs-tile-foot">
            {{ t.runs }} {{ t.runs === 1 ? 'run' : 'runs' }} ·
            {{ t.correct }}/{{ t.count }}
          </div>
        </div>
      </div>

      <div class="kjs-section">
        <div class="kjs-section-head">Topic accuracy</div>
        <div v-if="topicRows.length === 0" class="kjs-empty-line">
          No tagged topics yet.
        </div>
        <div v-else class="kjs-bars">
          <div
            v-for="r in topicRows"
            :key="r.key"
            class="kjs-bar-row"
          >
            <div class="kjs-bar-label">{{ r.label }}</div>
            <div class="kjs-bar-track">
              <div
                class="kjs-bar-fill"
                :style="{
                  width: Math.round(r.accuracy * 100) + '%',
                  background: pctColor(r.accuracy)
                }"
              />
            </div>
            <div class="kjs-bar-num">
              <strong>{{ Math.round(r.accuracy * 100) }}%</strong>
              <span class="kjs-bar-tail">{{ r.correct }}/{{ r.count }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </ChartCard>
</template>

<style scoped>
.kjs-tiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}
.kjs-tile {
  background: var(--paper);
  border: 1px solid var(--hairline);
  border-radius: 3px;
  padding: 14px 16px;
}
.kjs-tile-label {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 6px;
}
.kjs-tile-num {
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 500;
  line-height: 1;
  margin-bottom: 6px;
}
.kjs-tile-foot {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-soft);
}

.kjs-section {
  border-top: 1px solid var(--hairline);
  padding-top: 18px;
}
.kjs-section-head {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 14px;
}
.kjs-empty-line {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 14px;
  color: var(--mute);
  padding: 8px 0;
}
.kjs-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.kjs-bar-row {
  display: grid;
  grid-template-columns: 140px 1fr 110px;
  align-items: center;
  gap: 14px;
}
.kjs-bar-label {
  font-family: var(--font-display);
  font-size: 14px;
  color: var(--ink);
}
.kjs-bar-track {
  position: relative;
  height: 10px;
  background: var(--hairline);
  border-radius: 2px;
  overflow: hidden;
}
.kjs-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 2px;
  transition: width 240ms ease-out;
}
.kjs-bar-num {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-soft);
  text-align: right;
}
.kjs-bar-num strong {
  color: var(--ink);
  margin-right: 6px;
}
.kjs-bar-tail {
  color: var(--mute);
}

@media (max-width: 600px) {
  .kjs-tiles {
    grid-template-columns: 1fr;
  }
  .kjs-bar-row {
    grid-template-columns: 100px 1fr 90px;
    gap: 8px;
  }
}
</style>
