<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loadHistory } from '../../composables/useQuizHistory'
import { computeDrillMastery } from '../../composables/useDrillMastery'
import DwWeakPoints from '../../components/charts/DwWeakPoints.vue'
import DwPerspectiveStudy from './DwPerspectiveStudy.vue'
import ProgressDial from '../../components/drill/ProgressDial.vue'
import MasteryDots from '../../components/drill/MasteryDots.vue'
import LevelChip from '../../components/drill/LevelChip.vue'
import MasteryBars from '../../components/drill/MasteryBars.vue'
import { DW_FAMILIES, type DrillCard, type DrillFamily } from '../../data/drillCatalogue'
import { ADVERB_PAIRS, hinForm, herForm } from '../../data/directionWords'

const router = useRouter()

// One-shot read from history, matching the app's convention for pages that
// aren't long-lived — mastery is computed once at setup, not kept reactive.
const historyEntries = loadHistory()
const masteryMap = computeDrillMastery(historyEntries)

const families = DW_FAMILIES

interface CardMastery { band: number | null; attempts: number }

// The cheatsheet ('A', level 'Ref') is not a graded drill — it never has a
// mastery entry, so it renders as "reference" rather than 0/5.
function cardMastery(card: DrillCard): CardMastery {
  if (card.level === 'Ref') return { band: null, attempts: 0 }
  const m = masteryMap[`dw-${card.code}`]
  return { band: m?.band ?? 0, attempts: m?.total ?? 0 }
}

function familyAvg(family: DrillFamily): number | null {
  const trackable = family.cards.filter(c => c.level !== 'Ref')
  if (!trackable.length) return null
  const sum = trackable.reduce((s, c) => s + (cardMastery(c).band ?? 0), 0)
  return Math.round(sum / trackable.length)
}

const trackableCards = families.flatMap(f => f.cards).filter(c => c.level !== 'Ref')
const totalDrills = trackableCards.length
const earned = trackableCards.reduce((s, c) => s + (cardMastery(c).band ?? 0), 0)
const possible = totalDrills * 5
const pct = possible > 0 ? Math.round((earned / possible) * 100) : 0
const begun = trackableCards.filter(c => cardMastery(c).attempts > 0).length

// The six hin/her twins, with the her/hin forms derived from the real
// ADVERB_PAIRS (element + rForm + gloss) via the module's own helpers —
// never a second, hand-copied her/hin table.
const pairsRows = ADVERB_PAIRS.map(p => ({
  element: p.element,
  her: herForm(p.element),
  hin: hinForm(p.element),
  rForm: p.rForm,
  gloss: p.gloss,
}))

// Scroll-spy: the active rail family tracks the last panel whose top has
// scrolled past a small threshold.
const active = ref(families[0]?.id ?? '')

function onScroll(): void {
  const tops = families
    .map(f => {
      const el = document.getElementById(`dwfam-${f.id}`)
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
  const el = document.getElementById(`dwfam-${id}`)
  if (!el) return
  const y = el.getBoundingClientRect().top + window.pageYOffset - 88
  window.scrollTo({ top: y, behavior: 'smooth' })
}

function go(card: DrillCard): void {
  router.push(card.query ? { name: card.route, query: card.query } : { name: card.route })
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Modul · hin &amp; her</div>
        <h1 class="section-title">Direction Words<em>.</em></h1>
        <p class="section-subtitle">
          hinein or herein? It depends on where you stand. One rule, six pairs,
          and drills that keep testing the same instinct from new angles.
        </p>
      </div>
    </header>

    <div class="dw-layout">
      <aside class="dw-rail">
        <DwPerspectiveStudy />

        <div class="dw-prog">
          <ProgressDial :pct="pct" />
          <p class="dw-prog-txt">
            <strong>{{ begun }} of {{ totalDrills }}</strong> drills begun.<br />
            Track your mastery family by family.
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

        <DwWeakPoints :entries="historyEntries" />

        <div class="dw-rail-foot">
          {{ totalDrills }} Übungen · {{ pairsRows.length }} Paare<br />
          Ausgabe MMXXVI
        </div>
      </aside>

      <div class="dw-panels">
        <section
          v-for="f in families"
          :id="`dwfam-${f.id}`"
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
              @click="go(c)"
            >
              <span class="dw-code">{{ c.code }}</span>
              <span class="dw-main">
                <span class="dw-title">{{ c.title }}<span class="dw-title-de">{{ c.de }}</span></span>
                <span class="dw-desc">{{ c.desc }}</span>
              </span>
              <span class="dw-meta">
                <LevelChip :level="c.level" :ai="c.ai" />
                <MasteryBars :band="cardMastery(c).band" :attempts="cardMastery(c).attempts" />
              </span>
              <span class="dw-arrow-cell"><span class="drill-arrow">→</span></span>
            </button>
          </div>

          <div v-if="f.id === 'pairs'" class="dw-axis">
            <div class="dw-axis-head">
              <div class="ah-her">← her · toward the speaker</div>
              <div>Element</div>
              <div class="ah-hin">hin · away from the speaker →</div>
              <div>R-Form</div>
            </div>
            <div v-for="p in pairsRows" :key="p.element" class="dw-axis-row">
              <div class="dw-af her">{{ p.her }}</div>
              <div class="dw-ae">-{{ p.element }}</div>
              <div class="dw-af hin">{{ p.hin }}</div>
              <div class="dw-ar" :class="{ none: !p.rForm }">{{ p.rForm || '—' }}</div>
              <div class="dw-axis-gloss">{{ p.gloss }}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
