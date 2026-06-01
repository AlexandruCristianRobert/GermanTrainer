<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

interface Card {
  numeral: string
  route: string
  title: string
  de: string
  desc: string
  cta: string
}

const cards: Card[] = [
  {
    numeral: 'A', route: 'prepositions-list',
    title: 'Browse prepositions', de: 'Liste',
    desc: 'Searchable list of 37 prepositions with their case, examples, and CEFR level.',
    cta: 'Open'
  },
  {
    numeral: 'B', route: 'prepositions-case',
    title: 'Which case?', de: 'Kasus',
    desc: 'For each preposition, pick the case it governs — accusative, dative, genitive, or two-way.',
    cta: 'Start'
  },
  {
    numeral: 'C', route: 'prepositions-article',
    title: 'Article fill', de: 'Artikel einsetzen',
    desc: 'Fill in the article in a real sentence. Tests the case rule in context.',
    cta: 'Start'
  },
  {
    numeral: 'D', route: 'prepositions-twoway',
    title: 'Two-way decision', de: 'Wechsel · Akk. oder Dat.',
    desc: 'For the nine Wechselpräpositionen, decide whether the sentence uses accusative or dative.',
    cta: 'Start'
  },
  {
    numeral: 'E', route: 'prepositions-sentence',
    title: 'Sentence translation', de: 'Satzübersetzung · KI',
    desc: 'AI writes a sentence per random preposition using nouns from a theme you pick. Read the English, type the German.',
    cta: 'Start'
  }
]
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel IV · Präpositionen</div>
        <h1 class="section-title">Prepositions<em>.</em></h1>
        <p class="section-subtitle">
          German prepositions govern case — and the case is the difference between
          <em>auf dem Tisch</em> (on the table) and <em>auf den Tisch</em> (onto the table).
          Focused drills plus an AI-built sentence-translation test.
        </p>
      </div>
    </header>

    <div class="module-grid">
      <article
        v-for="c in cards"
        :key="c.route"
        class="card module-card interactive"
        role="button"
        tabindex="0"
        @click="router.push({ name: c.route })"
        @keydown.enter="router.push({ name: c.route })"
      >
        <div class="module-numeral">{{ c.numeral }}</div>
        <h2>{{ c.title }}</h2>
        <div class="module-de">{{ c.de }}</div>
        <p class="module-desc">{{ c.desc }}</p>
        <div class="module-cta">{{ c.cta }} <span aria-hidden="true">→</span></div>
      </article>
    </div>
  </div>
</template>
