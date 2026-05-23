<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

interface ModuleCard {
  numeral: string
  route: string
  de: string
  title: string
  desc: string
  meta: string
}

const modules: ModuleCard[] = [
  {
    numeral: 'I',
    route: 'nouns',
    de: 'Substantive',
    title: 'Nouns',
    desc: 'Drill der/die/das or English translation across twenty themed groups — around 1,400 words from Möbel to Wetter.',
    meta: '1,407 entries · 20 groups'
  },
  {
    numeral: 'II',
    route: 'adjectives',
    de: 'Adjektive',
    title: 'Adjectives',
    desc: 'AI-generated German sentences with one word missing. Type the inflected form to match the case and gender.',
    meta: '~250 adjectives · 11 groups'
  },
  {
    numeral: 'III',
    route: 'verbs',
    de: 'Verben',
    title: 'Verbs',
    desc: 'Translation drill, full-tense conjugation across all fifteen tenses, plus a twelve-chapter grammar cheatsheet.',
    meta: '378 verbs · 15 tenses'
  },
  {
    numeral: 'IV',
    route: 'settings',
    de: 'Einstellungen',
    title: 'Settings',
    desc: 'Set your Gemini API key and choose a model. Required only for the Adjectives quiz.',
    meta: 'Local · stored in your browser'
  }
]

function go(target: string) { router.push({ name: target }) }

function onCardKey(e: KeyboardEvent, target: string) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    go(target)
  }
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Frontispiece · I/IV</div>
        <h1 class="section-title">Üben<em>.</em></h1>
        <p class="section-subtitle">
          A small workbook for German vocabulary and grammar — three drills,
          a long-form cheatsheet, and a quiet place to come back to.
        </p>
      </div>
      <div class="niveau-block">
        <div class="micro-mark niveau-mark">Niveau</div>
        <div class="niveau-value">A1 — B2</div>
      </div>
    </header>

    <div class="module-grid">
      <article
        v-for="m in modules"
        :key="m.route"
        class="card module-card interactive"
        role="button"
        tabindex="0"
        @click="go(m.route)"
        @keydown="onCardKey($event, m.route)"
      >
        <div class="module-numeral">{{ m.numeral }}</div>
        <h2>{{ m.title }}</h2>
        <div class="module-de">{{ m.de }}</div>
        <p class="module-desc">{{ m.desc }}</p>
        <div class="module-meta">{{ m.meta }}</div>
        <div class="module-cta">
          Open <span aria-hidden="true">→</span>
        </div>
      </article>
    </div>

    <footer class="home-footer">
      <span class="micro-mark">Local first · no account · A single-user atelier</span>
      <span class="micro-mark">Ausgabe MMXXVI · Berlin</span>
    </footer>
  </div>
</template>

<style scoped>
.niveau-block { text-align: right; }
.niveau-mark { margin-bottom: 6px; }
.niveau-value {
  font-family: var(--font-display);
  font-size: 24px;
  font-style: italic;
  letter-spacing: -0.01em;
  color: var(--ink);
}

.module-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
}

.home-footer {
  margin-top: 96px;
  padding-top: 24px;
  border-top: 1px solid var(--hairline);
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 720px) {
  .niveau-block { text-align: left; }
  .home-footer { margin-top: 56px; }
}
</style>
