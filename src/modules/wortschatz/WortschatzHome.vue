<script setup lang="ts">
// Wortschatz hub — B2 Themenwortschatz (CONTEXT.md → "Themenfeld", "Vokabel").
// Mirrors SchreibenHome.vue's page shell (header + section-header) but the
// body is a single grid of Themenfeld cards rather than exam-part tiles —
// there is no "Teil" split here, just ten Themenfelder each carrying their
// own Lernen/Wiederholen state. A top CTA card surfaces the cross-Themenfeld
// due count (dueVokabelCount) since "was ist fällig" is a whole-module
// question, not a per-Themenfeld one.
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSettings } from '../../composables/useSettings'
import { resolveAiClient } from '../../composables/localClaude'
import { useToast } from '../../composables/useToast'
import {
  feldSummaries, dueVokabelCount, addCustomVokabeln, allVokabeln,
  type FeldSummary
} from '../../composables/useWortschatzProgress'
import { generateVokabeln } from '../../composables/useWortschatzAi'
import type { Themenfeld } from '../../data/wortschatz'

const router = useRouter()
const { settings, canUseAi, load: loadSettings } = useSettings()
const toast = useToast()

const summaries = ref<FeldSummary[]>([])
const dueCount = ref(0)
const generatingFeld = ref<Themenfeld | null>(null)

async function refresh(): Promise<void> {
  const now = Date.now()
  const [s, due] = await Promise.all([feldSummaries(now), dueVokabelCount(now)])
  summaries.value = s
  dueCount.value = due
}

onMounted(() => {
  void loadSettings()
  // Fire-and-forget: a failed initial read leaves the grid empty rather than
  // crashing the page — there is no per-Themenfeld state worth blocking on.
  void refresh().catch(err => {
    toast.error('Wortschatz konnte nicht geladen werden', {
      description: err instanceof Error ? err.message : String(err)
    })
  })
})

function goWiederholen(): void {
  if (dueCount.value === 0) return
  router.push({ name: 'wortschatz-wiederholen-run' })
}

function goLernen(s: FeldSummary): void {
  if (s.neu === 0) return
  router.push({ name: 'wortschatz-lernen-run', query: { feld: s.feld } })
}

async function generateMore(feld: Themenfeld): Promise<void> {
  if (!canUseAi.value || generatingFeld.value !== null) return
  generatingFeld.value = feld
  try {
    const existing = (await allVokabeln()).filter(v => v.feld === feld).map(v => v.de)
    const client = resolveAiClient(settings.value)
    const fresh = await generateVokabeln(client, settings.value.model, feld, existing)
    const withIds = fresh.map((v, i) => ({
      ...v,
      id: `vk-custom-${Date.now()}-${i}`,
      source: 'custom' as const
    }))
    await addCustomVokabeln(withIds)
    await refresh()
    toast.success(`${withIds.length} neue Vokabeln für „${feld}"`)
  } catch (err) {
    toast.error('Vokabelgenerierung fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    generatingFeld.value = null
  }
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel · Goethe B2 · Wortschatz</div>
        <h1 class="section-title">Wortschatz<em>.</em></h1>
        <p class="section-subtitle">
          B2 · Produktiver Themenwortschatz
        </p>
      </div>
    </header>

    <div class="card wz-cta" data-testid="wiederholen-cta">
      <div class="wz-cta-text">
        <div class="wz-cta-count">{{ dueCount }}</div>
        <div class="wz-cta-label">{{ dueCount === 1 ? 'Vokabel fällig' : 'Vokabeln fällig' }}</div>
      </div>
      <button
        class="btn btn-accent"
        type="button"
        :disabled="dueCount === 0"
        @click="goWiederholen"
      >
        {{ dueCount === 0 ? 'Nichts fällig' : 'Wiederholen' }}
      </button>
    </div>

    <div class="wz-grid">
      <div
        v-for="s in summaries"
        :key="s.feld"
        class="card wz-card"
        data-testid="feld-card"
      >
        <h2 class="wz-card-t">{{ s.feld }}</h2>
        <p class="wz-meter">
          {{ s.gefestigt }} gefestigt · {{ s.inArbeit }} in Arbeit · {{ s.neu }} neu
        </p>
        <span v-if="s.faellig > 0" class="tag tag-accent">{{ s.faellig }} fällig</span>
        <div class="wz-card-actions">
          <button
            class="btn btn-ghost"
            type="button"
            :disabled="s.neu === 0"
            @click="goLernen(s)"
          >
            Lernen
          </button>
          <button
            v-if="canUseAi"
            class="btn btn-quiet"
            type="button"
            :disabled="generatingFeld !== null"
            @click="generateMore(s.feld)"
          >
            {{ generatingFeld === s.feld ? 'Generiere…' : 'Mehr Vokabeln (KI)' }}
          </button>
        </div>
      </div>
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="router.push({ name: 'home' })">← Back</button>
    </div>
  </div>
</template>

<style scoped>
.wz-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 32px;
}
.wz-cta-count {
  font-family: var(--font-display);
  font-size: 40px;
  font-weight: 500;
  line-height: 1;
}
.wz-cta-label {
  color: var(--ink-soft);
  font-size: 15px;
  margin-top: 4px;
}
.wz-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
@media (max-width: 720px) {
  .wz-grid { grid-template-columns: 1fr; }
}
.wz-card { display: flex; flex-direction: column; gap: 10px; }
.wz-card-t { font-size: 24px; font-weight: 600; margin: 0; }
.wz-meter { color: var(--ink-soft); font-size: 14px; margin: 0; }
.wz-card-actions { display: flex; gap: 10px; margin-top: auto; flex-wrap: wrap; }
</style>
