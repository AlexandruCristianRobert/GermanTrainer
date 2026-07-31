<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loadHistory } from '../../composables/useQuizHistory'
import { computeDrillMastery } from '../../composables/useDrillMastery'
import DacWeakPoints from '../../components/charts/DacWeakPoints.vue'
import DacFormation from './DacFormation.vue'
import LevelChip from '../../components/drill/LevelChip.vue'
import MasteryDots from '../../components/drill/MasteryDots.vue'
import { DAC_PHASES, type DrillCard } from '../../data/drillCatalogue'
import { NO_COMPOUND_PREPOSITIONS, THING_VS_PERSON, KORRELAT, daCompound } from '../../data/daCompounds'

const router = useRouter()

// One-shot read from history — this page isn't long-lived, so mastery is
// computed once at setup rather than kept reactive (mirrors DirectionWordsHome
// and the pre-existing DacHome convention).
const historyEntries = loadHistory()
const masteryMap = computeDrillMastery(historyEntries)

interface CardMastery { band: number | null; attempts: number }

// The cheatsheet ('A', level 'Ref') is not a graded drill — it never has a
// mastery entry, so it renders as "reference" rather than 0/5.
function cardMastery(card: DrillCard): CardMastery {
  if (card.level === 'Ref') return { band: null, attempts: 0 }
  const m = masteryMap[`dac-${card.code}`]
  return { band: m?.band ?? 0, attempts: m?.total ?? 0 }
}

const allCards: DrillCard[] = DAC_PHASES.flatMap(p => p.cards)
const trackedCards = allCards.filter(c => c.level !== 'Ref')
const earnedTotal = trackedCards.reduce((s, c) => s + (cardMastery(c).band ?? 0), 0)
const pct = trackedCards.length > 0 ? Math.round((earnedTotal / (trackedCards.length * 5)) * 100) : 0
const untouched = trackedCards.filter(c => cardMastery(c).attempts === 0).length

// Three weakest tracked drills, for the masthead bars.
const weakest = [...trackedCards]
  .sort((a, b) => {
    const diff = (cardMastery(a).band ?? 0) - (cardMastery(b).band ?? 0)
    if (diff !== 0) return diff
    return cardMastery(a).attempts - cardMastery(b).attempts
  })
  .slice(0, 3)

const query = ref('')
const sort = ref<'order' | 'weak'>('order')

function match(card: DrillCard): boolean {
  const q = query.value.trim().toLowerCase()
  if (!q) return true
  return `${card.title} ${card.de} ${card.desc} ${card.code}`.toLowerCase().includes(q)
}

const hits = computed(() => allCards.filter(match))

interface PhaseGroup { key: string; numeral: string; heading: string; de: string; cards: DrillCard[] }

const visiblePhases = computed<PhaseGroup[]>(() => {
  if (hits.value.length === 0) return []
  if (sort.value === 'weak') {
    const sorted = [...hits.value].sort((a, b) => {
      const am = cardMastery(a).band ?? 99
      const bm = cardMastery(b).band ?? 99
      if (am !== bm) return am - bm
      return cardMastery(a).attempts - cardMastery(b).attempts
    })
    return [{ key: 'weak', numeral: '≀', heading: 'Weakest first', de: 'Schwächste zuerst', cards: sorted }]
  }
  return DAC_PHASES
    .map(p => ({ key: p.id, numeral: p.numeral, heading: p.heading, de: p.de, cards: p.cards.filter(match) }))
    .filter(g => g.cards.length > 0)
})

function go(card: DrillCard): void {
  router.push(card.query ? { name: card.route, query: card.query } : { name: card.route })
}

function clearSearch(): void {
  query.value = ''
}

// Marginalia content — derived from the real daCompounds.ts, not hand-copied
// prose. THING_VS_PERSON[0] ('warten auf') happens to be the same pair the
// design's own hub hardcodes; KORRELAT's first obligatory/optional/excluded
// entries likewise match its examples verbatim.
const svp = THING_VS_PERSON[0]
const svpPrep = svp.base.split(' ').slice(1).join(' ')
const svpCompound = daCompound(svpPrep)

function boldTail(sentence: string, markerStart: string): { pre: string; mark: string; post: string } {
  const idx = sentence.indexOf(markerStart)
  if (idx === -1) return { pre: sentence, mark: '', post: '' }
  const end = sentence.endsWith('.') ? sentence.length - 1 : sentence.length
  return { pre: sentence.slice(0, idx), mark: sentence.slice(idx, end), post: sentence.slice(end) }
}

const thingSplit = boldTail(svp.thingA, svpCompound)
const personSplit = boldTail(svp.personA, svpPrep)

const korrelatMust = KORRELAT.obligatory[0]
const korrelatMay = KORRELAT.optional[0]
const korrelatNever = KORRELAT.excluded[0]

function goToCheatsheet(): void {
  router.push({ name: 'dacompounds-cheatsheet' })
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Modul · Pronominaladverbien</div>
        <h1 class="section-title">Da-Compounds<em>.</em></h1>
        <p class="section-subtitle">
          dafür, darauf, davon — one small word instead of preposition + pronoun.
          Twenty-one drills from formation to free production, plus the cheatsheet.
        </p>
      </div>
    </header>

    <div class="dac-masthead">
      <DacFormation />
      <div class="dac-mh-side">
        <div class="dac-mh-lbl">Beherrschung</div>
        <div class="dac-sum-num">{{ pct }}<span>%</span></div>
        <p class="dac-sum-txt">across {{ trackedCards.length }} tracked drills · {{ untouched }} never opened</p>
        <div class="dac-bars">
          <div v-for="d in weakest" :key="d.code" class="dac-bar">
            <span class="dac-bar-l">{{ d.code }} · {{ d.title }}</span>
            <span class="dac-bar-v">{{ cardMastery(d).band ?? 0 }}/5</span>
            <span class="dac-bar-t">
              <span
                class="dac-bar-f"
                :class="{ weak: (cardMastery(d).band ?? 0) <= 1 }"
                :style="{ width: ((cardMastery(d).band ?? 0) / 5 * 100) + '%' }"
              ></span>
            </span>
          </div>
        </div>
        <button type="button" class="btn btn-ghost" style="margin-top: 20px; width: 100%" @click="sort = 'weak'">
          Sort weakest first
        </button>
      </div>
    </div>

    <div class="dac-tools">
      <label class="dac-search">
        <span class="dac-search-ic" aria-hidden="true">⌕</span>
        <input
          v-model="query"
          type="text"
          placeholder="Find a drill — Korrelat, Kasus, Dialog, T14 …"
          autocomplete="off"
        />
      </label>
      <div class="dac-sort">
        <button type="button" :class="{ active: sort === 'order' }" @click="sort = 'order'">Lehrgang</button>
        <button type="button" :class="{ active: sort === 'weak' }" @click="sort = 'weak'">Schwächste</button>
      </div>
      <span class="dac-count">{{ hits.length }} von {{ allCards.length }}</span>
    </div>

    <div class="dac-body">
      <div class="dac-ledger">
        <div v-if="hits.length === 0" class="dac-empty">
          Nothing matches „{{ query }}“. <button type="button" @click="clearSearch">Clear the search</button>
        </div>

        <div v-for="g in visiblePhases" :key="g.key" class="dac-phase">
          <div class="dac-phase-gut"><div class="dac-phase-num">{{ g.numeral }}</div></div>
          <div class="dac-phase-rows">
            <div class="dac-phase-h">
              <span class="dac-phase-t">{{ g.heading }}</span>
              <span class="dac-phase-de">{{ g.de }}</span>
            </div>
            <button
              v-for="c in g.cards"
              :key="c.code"
              type="button"
              class="dac-lrow"
              @click="go(c)"
            >
              <span class="dac-num">{{ c.code }}</span>
              <span class="dac-lmain">
                <span class="dac-lt">{{ c.title }}<span class="dac-lde">{{ c.de }}</span></span>
                <span class="dac-ld">{{ c.desc }}</span>
              </span>
              <span class="dac-lvl"><LevelChip :level="c.level" :ai="c.ai" /></span>
              <MasteryDots :band="cardMastery(c).band" />
              <span class="drill-arrow">→</span>
            </button>
          </div>
        </div>
      </div>

      <aside class="dac-marg">
        <div class="dac-marg-s">
          <div class="dac-marg-l">Sache oder Person</div>
          <div class="dac-vs">
            <span class="dac-vs-k">Sache</span>
            <span class="dac-vs-v">{{ thingSplit.pre }}<b>{{ thingSplit.mark }}</b>{{ thingSplit.post }}</span>
            <span class="dac-vs-k">Person</span>
            <span class="dac-vs-v person">{{ personSplit.pre }}<b>{{ personSplit.mark }}</b>{{ personSplit.post }}</span>
          </div>
          <p style="margin: 12px 0 0; font-style: italic; font-size: 13px; color: var(--mute)">
            The signature rule of the topic. A person never collapses into a da-compound.
          </p>
        </div>

        <div class="dac-marg-s">
          <div class="dac-marg-l">Bildet kein Kompositum</div>
          <div class="dac-nolist">
            <span v-for="p in NO_COMPOUND_PREPOSITIONS" :key="p">{{ p }}</span>
          </div>
          <p style="margin: 11px 0 0; font-style: italic; font-size: 13px; color: var(--mute)">
            {{ NO_COMPOUND_PREPOSITIONS.length }} prepositions with no da-form and no wo-form. Drill T1 hides them among the real ones.
          </p>
        </div>

        <div class="dac-marg-s">
          <div class="dac-marg-l">Korrelat</div>
          <div class="dac-klist">
            <div class="dac-krow">
              <span class="dac-kmark must">●</span>
              <span class="dac-kv">{{ korrelatMust.expression }}<br /><em style="color: var(--mute)">obligatorisch</em></span>
            </div>
            <div class="dac-krow">
              <span class="dac-kmark may">◐</span>
              <span class="dac-kv">{{ korrelatMay.expression }}<br /><em style="color: var(--mute)">fakultativ</em></span>
            </div>
            <div class="dac-krow">
              <span class="dac-kmark never">○</span>
              <span class="dac-kv">{{ korrelatNever.expression }}<br /><em style="color: var(--mute)">ausgeschlossen</em></span>
            </div>
          </div>
          <button type="button" class="btn btn-quiet" style="margin-top: 14px; padding-left: 0" @click="goToCheatsheet">
            Full lists on the plate →
          </button>
        </div>

        <div class="dac-marg-s">
          <DacWeakPoints :entries="historyEntries" />
        </div>
      </aside>
    </div>
  </div>
</template>
