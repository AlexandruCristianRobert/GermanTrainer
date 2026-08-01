<script setup lang="ts">
// Paired typed/spoken criterion bars. The design showed a single bar set for
// "the last run"; CONTEXT.md → Modality says the point of one shared rubric is
// that "how much worse am I when I have to speak?" is answerable, so both
// Modalities are shown side by side. LATEST per Modality, not best or mean.
import { computed } from 'vue'
import { SPRECHEN_B2_TEIL2 } from '../../data/rubrics'

export interface CriterionScore { key: string; score: number; maxPoints: number }

const props = defineProps<{
  typed?: CriterionScore[] | null
  spoken?: CriterionScore[] | null
}>()

// The rubric drives the rows, not the data — so a run recorded before a
// rubric change, or a hallucinated extra criterion, cannot add a row.
const rows = computed(() =>
  SPRECHEN_B2_TEIL2.criteria.map(def => ({
    key: def.key,
    labelDe: def.labelDe,
    descriptorDe: def.descriptorDe,
    maxPoints: def.maxPoints,
    typed: props.typed?.find(c => c.key === def.key) ?? null,
    spoken: props.spoken?.find(c => c.key === def.key) ?? null
  }))
)

const both = computed(() => !!props.typed?.length && !!props.spoken?.length)
const sum = (cs?: CriterionScore[] | null) => (cs ?? []).reduce((s, c) => s + c.score, 0)
const delta = computed(() => sum(props.spoken) - sum(props.typed))

function pct(c: CriterionScore | null, max: number): string {
  return c ? `${Math.max(0, Math.min(100, (c.score / max) * 100))}%` : '0%'
}
</script>

<template>
  <div>
    <div class="spr-crits">
      <div v-for="r in rows" :key="r.key" class="spr-crit-row">
        <div class="spr-crit-name" :title="r.descriptorDe">{{ r.labelDe }}</div>
        <div class="spr-crit-max spr-num">
          {{ r.typed ? r.typed.score : (r.spoken ? r.spoken.score : '—') }}/{{ r.maxPoints }}
        </div>
        <div class="spr-crit-bar">
          <span v-if="r.typed" class="spr-crit-fill" :style="{ width: pct(r.typed, r.maxPoints) }" />
        </div>
        <div v-if="both" class="spr-crit-bar">
          <span v-if="r.spoken" class="spr-crit-fill" :style="{ width: pct(r.spoken, r.maxPoints) }" />
        </div>
      </div>
    </div>
    <p class="spr-pass">
      Vier Kriterien à 25 Punkte, Bestehensgrenze <b>60</b>.
      <template v-if="both">
        Getippt und gesprochen teilen dieselbe Skala —
        <b>Δ gesprochen {{ delta > 0 ? '+' : '−' }}{{ Math.abs(delta) }}</b>.
      </template>
      <template v-else>
        Getippt und gesprochen teilen dieselbe Skala, damit die Werte vergleichbar bleiben.
      </template>
    </p>
  </div>
</template>
