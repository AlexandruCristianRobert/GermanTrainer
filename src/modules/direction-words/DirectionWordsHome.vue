<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

interface Card {
  numeral: string
  route: string
  title: string
  de: string
  desc: string
}

interface Group {
  heading: string
  de: string
  cards: Card[]
}

// Drill cards arrive family by family (spec §7 phases).
const groups: Group[] = [
  {
    heading: 'The perspective rule',
    de: 'Hin oder her?',
    cards: [
      {
        numeral: 'T1', route: 'directionwords-hinher',
        title: 'Hin or her?', de: 'Die Grundregel',
        desc: 'A scene diagram shows where you stand; pick hin or her — and don\'t fall for the hier button.',
      },
    ],
  },
  {
    heading: 'Compound pairs',
    de: 'Die Paare',
    cards: [
      {
        numeral: 'T2', route: 'directionwords-compounds',
        title: 'Compound gap-fill', de: 'Zusammensetzungen',
        desc: 'hinauf or herauf? The scene decides. Four options crossing both axes — or type it yourself at B2.',
      },
    ],
  },
  {
    heading: 'Questions & pointers',
    de: 'Wo, wohin, woher',
    cards: [
      {
        numeral: 'T3', route: 'directionwords-questions',
        title: 'Wo, wohin or woher?', de: 'Fragewörter',
        desc: 'Three ways to ask "where" — plus the pointers (dahin, dorthin) and the spoken splits (Wo gehst du hin?).',
      },
    ],
  },
  {
    heading: 'Register',
    de: 'Kurzformen',
    cards: [
      {
        numeral: 'T4', route: 'directionwords-register',
        title: 'R-forms & register', de: 'rein, raus, rüber',
        desc: 'Standard, spoken-only, or plain wrong? Judge rüber and friends — and learn why *hinrein never was a word.',
      },
    ],
  },
  {
    heading: 'Production',
    de: 'Satzbau',
    cards: [
      {
        numeral: 'T5', route: 'directionwords-assembly',
        title: 'Sentence assembly', de: 'Satzbau',
        desc: 'Tap the tiles into order — the direction word lands at the clause end, and idiomatic frontings count too.',
      },
      {
        numeral: 'T6', route: 'directionwords-sentence',
        title: 'Sentence translation (AI)', de: 'Satz (KI)',
        desc: 'The AI writes the scene in English — where the speaker stands is in the words. You write the German; wrong-side compounds get called out as perspective errors.',
      },
    ],
  },
  {
    heading: 'Reference',
    de: 'Nachschlagen',
    cards: [
      {
        numeral: 'A', route: 'directionwords-cheatsheet',
        title: 'Cheatsheet', de: 'Spickzettel',
        desc: 'The perspective rule in two pictures, the six hin/her pairs with their rein/raus shortcuts, wo/wohin/woher, the verbs where direction has faded, and the idioms.',
      },
    ],
  },
]

function go(target: string) {
  router.push({ name: target })
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Modul · hin &amp; her</div>
        <h1 class="section-title">Direction Words<em>.</em></h1>
        <p class="section-subtitle">
          hinein or herein? It depends on where you stand. Study the cheatsheet first;
          the drills arrive family by family.
        </p>
      </div>
    </header>

    <template v-for="g in groups" :key="g.heading">
      <h2 class="group-heading">{{ g.heading }} · <span class="group-de">{{ g.de }}</span></h2>
      <div class="module-grid">
        <article
          v-for="c in g.cards"
          :key="c.route"
          class="card module-card interactive"
          role="button"
          tabindex="0"
          @click="go(c.route)"
          @keydown.enter.prevent="go(c.route)"
          @keydown.space.prevent="go(c.route)"
        >
          <div class="module-numeral">{{ c.numeral }}</div>
          <h2>{{ c.title }}</h2>
          <div class="module-de">{{ c.de }}</div>
          <p class="module-desc">{{ c.desc }}</p>
          <div class="module-cta">Open <span aria-hidden="true">→</span></div>
        </article>
      </div>
    </template>
  </div>
</template>

<style scoped>
.module-card:focus-visible { outline: 1px dotted var(--rule); outline-offset: 4px; }
.group-heading {
  margin: 28px 0 14px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
}
.group-de { font-style: italic; text-transform: none; letter-spacing: 0.04em; }
</style>
