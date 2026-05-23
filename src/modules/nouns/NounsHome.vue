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
    route: 'nouns-manage',
    title: 'Manage nouns',
    de: 'Verwalten',
    desc: 'Add, edit, or delete your noun deck. Reset to defaults restores the curated seed list.',
    cta: 'Open'
  },
  {
    numeral: 'B',
    route: 'nouns-quiz',
    title: 'Quiz',
    de: 'Übung',
    desc: 'Pick gender (der/die/das) or English translation mode, choose your groups, and quiz yourself on N random nouns.',
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
        <div class="breadcrumb">Kapitel I · Substantive</div>
        <h1 class="section-title">Nouns<em>.</em></h1>
        <p class="section-subtitle">
          German nouns have three genders — masculine, feminine, neuter — and the article
          has to be stored alongside the word. Quiz the gender or the translation.
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
