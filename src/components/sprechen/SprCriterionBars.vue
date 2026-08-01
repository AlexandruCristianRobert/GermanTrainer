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

const both = computed(() => !!props.typed?.length && !!props.spoken?.length)

// The rubric drives the rows, not the data — so a run recorded before a
// rubric change, or a hallucinated extra criterion, cannot add a row.
const rows = computed(() =>
  SPRECHEN_B2_TEIL2.criteria.map(def => {
    const typed = props.typed?.find(c => c.key === def.key) ?? null
    const spoken = props.spoken?.find(c => c.key === def.key) ?? null
    return {
      key: def.key,
      labelDe: def.labelDe,
      descriptorDe: def.descriptorDe,
      maxPoints: def.maxPoints,
      typed,
      spoken,
      // Whichever Modality the learner HAS is the primary bar. Gating the
      // first bar on `typed` alone would show a spoken-only learner correct
      // numbers over a blank track.
      primary: typed ?? spoken,
      secondary: typed && spoken ? spoken : null
    }
  })
)

const sum = (cs?: CriterionScore[] | null) => (cs ?? []).reduce((s, c) => s + c.score, 0)
const delta = computed(() => sum(props.spoken) - sum(props.typed))
const deltaLabel = computed(() =>
  delta.value === 0 ? '±0' : delta.value > 0 ? `+${delta.value}` : `−${Math.abs(delta.value)}`
)

function pct(c: CriterionScore | null, max: number): string {
  return c ? `${Math.max(0, Math.min(100, (c.score / max) * 100))}%` : '0%'
}
</script>

<template>
  <div>
    <div class="spr-crits">
      <div v-for="r in rows" :key="r.key" class="spr-crit-row">
        <div class="spr-crit-name" :title="r.descriptorDe">{{ r.labelDe }}</div>
        <div class="spr-crit-max spr-num" :title="r.secondary ? 'getippt · gesprochen' : undefined">
          <template v-if="r.secondary">{{ r.typed!.score }}·{{ r.secondary.score }}</template>
          <template v-else-if="r.primary">{{ r.primary.score }}/{{ r.maxPoints }}</template>
          <template v-else>—/{{ r.maxPoints }}</template>
        </div>
        <div class="spr-crit-bar">
          <span v-if="r.primary" class="spr-crit-fill" :style="{ width: pct(r.primary, r.maxPoints) }" />
        </div>
        <div v-if="r.secondary" class="spr-crit-bar">
          <span class="spr-crit-fill" :style="{ width: pct(r.secondary, r.maxPoints) }" />
        </div>
      </div>
    </div>
    <p class="spr-pass">
      {{ rows.length }} Kriterien, zusammen {{ SPRECHEN_B2_TEIL2.totalMax }} Punkte ·
      Bestehensgrenze <b>{{ SPRECHEN_B2_TEIL2.passingScore }}</b>.
      <template v-if="both">
        Getippt und gesprochen teilen dieselbe Skala —
        <b>Δ gesprochen {{ deltaLabel }}</b>.
      </template>
      <template v-else>
        Getippt und gesprochen teilen dieselbe Skala, damit die Werte vergleichbar bleiben.
      </template>
    </p>
  </div>
</template>
