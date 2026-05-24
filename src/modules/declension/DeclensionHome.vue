<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

interface Card { numeral: string; route: string; title: string; de: string; desc: string; cta: string }

const cards: Card[] = [
  { numeral: 'A', route: 'declension-tables', title: 'Tables reference', de: 'Tabellen',
    desc: 'Browse the canonical declension tables — definite, indefinite, possessive articles, and weak/mixed/strong adjective endings.',
    cta: 'Open' },
  { numeral: 'B', route: 'declension-table', title: 'Decline the phrase', de: 'Vier Fälle',
    desc: 'Given a noun phrase in the nominative, type all four case forms. The foundational drill of German grammar.',
    cta: 'Start' },
  { numeral: 'C', route: 'declension-article', title: 'Article in context', de: 'Artikel einsetzen',
    desc: 'Fill in the missing article in a real sentence. The case rule is given as a hint above.',
    cta: 'Start' },
  { numeral: 'D', route: 'declension-adj', title: 'Adjective endings', de: 'Adjektivendungen',
    desc: 'Produce the correct inflected adjective. Weak / mixed / strong inflection is named above each prompt.',
    cta: 'Start' }
]
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel V · Deklination</div>
        <h1 class="section-title">Declension<em>.</em></h1>
        <p class="section-subtitle">
          Four cases × three genders × the article ahead of the adjective — the system that
          turns vocabulary into actual sentences. Three drills, one rule each.
        </p>
      </div>
    </header>

    <div class="module-grid">
      <article v-for="c in cards" :key="c.route"
        class="card module-card interactive"
        role="button" tabindex="0"
        @click="router.push({ name: c.route })"
        @keydown.enter="router.push({ name: c.route })">
        <div class="module-numeral">{{ c.numeral }}</div>
        <h2>{{ c.title }}</h2>
        <div class="module-de">{{ c.de }}</div>
        <p class="module-desc">{{ c.desc }}</p>
        <div class="module-cta">{{ c.cta }} <span aria-hidden="true">→</span></div>
      </article>
    </div>
  </div>
</template>
