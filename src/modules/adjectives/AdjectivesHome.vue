<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

interface ModuleCard {
  numeral: string
  route: string
  title: string
  de: string
  desc: string
  cta: string
}

const cards: ModuleCard[] = [
  {
    numeral: 'A',
    route: 'adjectives-manage',
    title: 'Manage adjectives',
    de: 'Verwalten',
    desc: 'Add, edit, or delete adjectives. Reset to the curated seed of ~250 entries.',
    cta: 'Open'
  },
  {
    numeral: 'B',
    route: 'adjectives-quiz',
    title: 'Quiz',
    de: 'Übung',
    desc: 'Pick groups, generate sentences with Gemini, type the inflected form. Requires an API key.',
    cta: 'Start'
  }
]

function go(target: string) { router.push({ name: target }) }
function onCardKey(e: KeyboardEvent, target: string) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(target) }
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel II · Adjektive</div>
        <h1 class="section-title">Adjectives<em>.</em></h1>
        <p class="section-subtitle">
          Fill-in-the-blank quiz on AI-generated German sentences. The point of the drill is
          <em>inflection</em> — case + gender endings, not just the dictionary form.
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
        @click="go(c.route)"
        @keydown="onCardKey($event, c.route)"
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

<style scoped>
.module-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
}
</style>
