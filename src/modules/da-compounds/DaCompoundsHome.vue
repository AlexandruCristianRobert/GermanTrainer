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

// Drill cards arrive family by family (spec §7 phases); Phase 1 ships the reference.
const groups: Group[] = [
  {
    heading: 'Formation basics',
    de: 'Bildung',
    cards: [
      {
        numeral: 'T1', route: 'dacompounds-formation',
        title: 'da- or dar-?', de: 'Bildung',
        desc: 'Speed round: da-, dar-, or no compound at all — including the trap prepositions (*darohne).',
      },
    ],
  },
  {
    heading: 'Compound recall',
    de: 'Einsetzen',
    cards: [
      {
        numeral: 'T3', route: 'dacompounds-substitution',
        title: 'Gap-fill', de: 'Lückentext',
        desc: 'A context sentence uses a fixed-preposition collocation; fill the gap in the follow-up with the right da-compound — pick from options or type it yourself.',
      },
      {
        numeral: 'T4', route: 'dacompounds-neighbors',
        title: 'Near neighbors', de: 'Verwechslungsgefahr',
        desc: 'Same gap-fill, harder options: choose the right da-compound among its near-neighbor prepositions — the mix-ups that actually happen in speech.',
      },
    ],
  },
  {
    heading: 'Reference',
    de: 'Nachschlagen',
    cards: [
      {
        numeral: 'A', route: 'dacompounds-cheatsheet',
        title: 'Cheatsheet', de: 'Spickzettel',
        desc: 'The formation table (da/dar, wo/wor), prepositions that form no compound, the things-vs-people rule, and the Korrelat verb lists.',
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
        <div class="breadcrumb">Modul · Pronominaladverbien</div>
        <h1 class="section-title">Da-Compounds<em>.</em></h1>
        <p class="section-subtitle">
          dafür, darauf, davon — one small word instead of preposition + pronoun.
          Study the cheatsheet first; the drills arrive family by family.
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
