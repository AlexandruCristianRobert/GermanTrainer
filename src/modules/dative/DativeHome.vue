<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loadHistory } from '../../composables/useQuizHistory'
import { computeDrillMastery } from '../../composables/useDrillMastery'
import { ledgerSummary, shakyItems } from '../../composables/useDativeLedger'
import ProgressDial from '../../components/drill/ProgressDial.vue'
import MasteryDots from '../../components/drill/MasteryDots.vue'
import LevelChip from '../../components/drill/LevelChip.vue'
import MasteryBars from '../../components/drill/MasteryBars.vue'
import { DAT_FAMILIES, type DrillCard, type DrillFamily } from '../../data/drillCatalogue'

const router = useRouter()

// One-shot reads, matching the app's convention for pages that aren't
// long-lived — mastery and ledger are computed once at setup.
const historyEntries = loadHistory()
const masteryMap = computeDrillMastery(historyEntries)
const families = DAT_FAMILIES

interface CardMastery { band: number | null; attempts: number }

function cardMastery(card: DrillCard): CardMastery {
  if (card.level === 'Ref') return { band: null, attempts: 0 }
  const m = masteryMap[`dat-${card.code}`]
  return { band: m?.band ?? 0, attempts: m?.total ?? 0 }
}

function familyAvg(family: DrillFamily): number | null {
  const trackable = family.cards.filter(c => c.level !== 'Ref')
  if (!trackable.length) return null
  const sum = trackable.reduce((s, c) => s + (cardMastery(c).band ?? 0), 0)
  return Math.round(sum / trackable.length)
}

// Staged arrival: a card whose route is not registered yet (phases 3–4)
// renders as a disabled "Bald" row instead of navigating nowhere.
function shipped(card: DrillCard): boolean {
  return router.hasRoute(card.route)
}

// ─── item ledger meter — denominator DERIVED, never hard-coded ───────────
const summary = ledgerSummary()
const pct = summary.total > 0 ? Math.round((summary.secured / summary.total) * 100) : 0

// Chips come from useDativeLedger's shakyItems() — longest-unseen first, the
// same order and the same list the Tagesplan row names, so the words the plan
// promises are the words waiting here. Capped at 10 for the rail.
const shaky = shakyItems().slice(0, 10)

// Scroll-spy, same mechanics as DirectionWordsHome.
const active = ref(families[0]?.id ?? '')

function onScroll(): void {
  const tops = families
    .map(f => {
      const el = document.getElementById(`datfam-${f.id}`)
      return el ? { id: f.id, top: el.getBoundingClientRect().top } : null
    })
    .filter((t): t is { id: string; top: number } => t !== null)
  const above = tops.filter(t => t.top < 200)
  if (above.length) active.value = above[above.length - 1].id
  else if (tops.length) active.value = tops[0].id
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})

function scrollToFamily(id: string): void {
  const el = document.getElementById(`datfam-${id}`)
  if (!el) return
  const y = el.getBoundingClientRect().top + window.pageYOffset - 88
  window.scrollTo({ top: y, behavior: 'smooth' })
}

function go(card: DrillCard): void {
  if (!shipped(card)) return
  router.push(card.query ? { name: card.route, query: card.query } : { name: card.route })
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel XIII · Dativ</div>
        <h1 class="section-title">Dative<em>.</em></h1>
        <p class="section-subtitle">
          helfen, danken, gefallen — an affected person, marked on the verb.
          Ten families of drills, one ledger of words to secure.
        </p>
      </div>
    </header>

    <div class="dw-layout">
      <aside class="dw-rail">
        <div class="dw-prog">
          <ProgressDial :pct="pct" />
          <p class="dw-prog-txt">
            <strong>{{ summary.secured }} / {{ summary.total }}</strong> gesichert<br />
            {{ summary.shaky }} wackelig · {{ summary.fresh }} neu
          </p>
        </div>

        <nav class="dw-fams" aria-label="Drill families">
          <button
            v-for="f in families"
            :key="f.id"
            type="button"
            class="dw-fam"
            :class="{ active: active === f.id }"
            @click="scrollToFamily(f.id)"
          >
            <span class="dw-fam-n">{{ f.numeral }}</span>
            <span class="dw-fam-t">{{ f.heading }}</span>
            <MasteryDots :band="familyAvg(f)" />
          </button>
        </nav>

        <div v-if="shaky.length" class="dat-shaky">
          <div class="dat-shaky-l">Wackelig</div>
          <span v-for="k in shaky" :key="k" class="dat-shaky-item">{{ k }}</span>
        </div>

        <div class="dw-rail-foot">
          {{ summary.total }} Einträge im Verzeichnis<br />
          Ausgabe MMXXVI
        </div>
      </aside>

      <div class="dw-panels">
        <section
          v-for="f in families"
          :id="`datfam-${f.id}`"
          :key="f.id"
          class="dw-panel"
        >
          <div class="dw-panel-head">
            <span class="dw-panel-num">{{ f.numeral }}</span>
            <h2 class="dw-panel-t">{{ f.heading }}</h2>
            <span class="dw-panel-de">{{ f.de }}</span>
          </div>

          <p v-if="f.blurb" class="dw-desc">{{ f.blurb }}</p>

          <div class="dw-rows">
            <button
              v-for="c in f.cards"
              :key="c.code"
              type="button"
              class="dw-row"
              :class="{ 'dat-soon-row': !shipped(c) }"
              :disabled="!shipped(c)"
              @click="go(c)"
            >
              <span class="dw-code">{{ c.code }}</span>
              <span class="dw-main">
                <span class="dw-title">{{ c.title }}<span class="dw-title-de">{{ c.de }}</span></span>
                <span class="dw-desc">{{ c.desc }}</span>
              </span>
              <span class="dw-meta">
                <LevelChip :level="c.level" :ai="c.ai" />
                <span v-if="!shipped(c)" class="dat-soon">Bald</span>
                <MasteryBars v-else :band="cardMastery(c).band" :attempts="cardMastery(c).attempts" />
              </span>
              <span class="dw-arrow-cell"><span v-if="shipped(c)" class="drill-arrow">→</span></span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dat-soon-row { opacity: 0.55; cursor: default; }
.dat-soon {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--mute);
  border: 1px solid var(--rule);
  border-radius: 3px;
  padding: 2px 7px;
}
.dat-shaky { margin-top: 22px; }
.dat-shaky-l {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 8px;
}
.dat-shaky-item {
  display: inline-block;
  font-size: 13px;
  color: var(--ink-soft);
  border: 1px solid var(--hairline);
  border-radius: 3px;
  padding: 2px 8px;
  margin: 0 6px 6px 0;
}
</style>
