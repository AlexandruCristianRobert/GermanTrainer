<script setup lang="ts">
import { computed } from 'vue'
import ChartCard from './ChartCard.vue'
import EChart from '../EChart.vue'
import type { StatsBundle } from '../../composables/useQuizStats'
import type { PrepErrorTag } from '../../composables/useQuizHistory'

const props = defineProps<{ stats: StatsBundle }>()

interface Row {
  key: string
  rate: number // failure-rate percent
  wrong: number
  seen: number
}

const TAG_LABELS: Record<PrepErrorTag, string> = {
  case: 'case',
  noun: 'noun',
  preposition: 'preposition',
  typo: 'typo'
}

const hasData = computed(
  () =>
    props.stats.prepWeakPoints.weakPreps.length > 0 ||
    props.stats.prepWeakPoints.weakNouns.length > 0
)

const prepRows = computed<Row[]>(() =>
  props.stats.prepWeakPoints.weakPreps.slice(0, 8).map(p => ({
    key: p.german,
    rate: p.seen > 0 ? Math.round((100 * p.wrong) / p.seen) : 0,
    wrong: p.wrong,
    seen: p.seen
  }))
)

const nounRows = computed<Row[]>(() =>
  props.stats.prepWeakPoints.weakNouns.slice(0, 8).map(n => ({
    key: n.nounKey,
    rate: n.seen > 0 ? Math.round((100 * n.wrong) / n.seen) : 0,
    wrong: n.wrong,
    seen: n.seen
  }))
)

// Error-tag breakdown (busiest first), omitting zero counts.
const tagSummary = computed(() => {
  const counts = props.stats.prepWeakPoints.tagCounts
  return (Object.keys(counts) as PrepErrorTag[])
    .map(tag => ({ label: TAG_LABELS[tag], count: counts[tag] }))
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count)
})

function colorFor(rate: number): string {
  if (rate >= 50) return 'var(--danger)'
  if (rate >= 25) return 'var(--ochre)'
  return 'var(--success)'
}

function optionFor(rows: Row[]): Record<string, unknown> {
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ dataIndex: number; value: number; name: string }>) => {
        const p = params[0]
        const r = rows[p.dataIndex]
        return `<div style="font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute); margin-bottom: 4px;">${r.key}</div><strong>${Math.round(p.value)}%</strong> failed · ${r.wrong}/${r.seen}`
      }
    },
    grid: { left: 24, right: 48, top: 16, bottom: 16, containLabel: true },
    xAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { formatter: '{value}%' }
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map(r => r.key),
      axisTick: { show: false },
      axisLabel: { fontFamily: '"Source Serif 4", serif', fontSize: 13 }
    },
    series: [
      {
        type: 'bar',
        data: rows.map(r => ({
          value: r.rate,
          itemStyle: { color: colorFor(r.rate) }
        })),
        barWidth: '64%',
        label: {
          show: true,
          position: 'right',
          formatter: (p: { dataIndex: number }) => {
            const r = rows[p.dataIndex]
            return `${r.wrong}/${r.seen}`
          },
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10.5,
          color: 'var(--mute)'
        }
      }
    ]
  }
}

const prepOption = computed(() => optionFor(prepRows.value))
const nounOption = computed(() => optionFor(nounRows.value))
</script>

<template>
  <div v-if="!hasData">
    <ChartCard
      mark="Schwach"
      title="Weak points"
      subtitle="Prepositions and nouns you miss most in AI-graded sentence drills."
    >
      <div class="chart-empty">No preposition weak-point data yet.</div>
    </ChartCard>
  </div>
  <div v-else class="chart-grid-2">
    <ChartCard
      mark="Schwach"
      title="Weakest prepositions"
      subtitle="Failure rate in AI-graded sentence drills, worst first. Clay ≥50%, ochre 25–49%, sage below."
    >
      <div v-if="prepRows.length === 0" class="chart-empty">
        No preposition data yet.
      </div>
      <EChart
        v-else
        :option="prepOption"
        :height="`${Math.max(200, prepRows.length * 36 + 40)}px`"
        aria-label="Weakest prepositions"
      />
      <p v-if="tagSummary.length" class="tag-summary">
        Errors —
        <template v-for="(t, i) in tagSummary" :key="t.label">
          <span class="tag-pair">{{ t.label }} · {{ t.count }}</span><span v-if="i < tagSummary.length - 1" class="tag-sep"> | </span>
        </template>
      </p>
    </ChartCard>

    <ChartCard
      mark="Schwach"
      title="Weakest nouns"
      subtitle="Failure rate in AI-graded sentence drills, worst first. Clay ≥50%, ochre 25–49%, sage below."
    >
      <div v-if="nounRows.length === 0" class="chart-empty">
        No noun data yet.
      </div>
      <EChart
        v-else
        :option="nounOption"
        :height="`${Math.max(200, nounRows.length * 36 + 40)}px`"
        aria-label="Weakest nouns"
      />
    </ChartCard>
  </div>
</template>

<style scoped>
.tag-summary {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
  margin: 8px 0 0;
}
.tag-sep {
  color: var(--mute);
}
</style>
