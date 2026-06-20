<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

interface ModuleCard {
  numeral: string
  route: string
  title: string
  de: string
  desc: string
}

const cards: ModuleCard[] = [
  { numeral: 'A', route: 'verbs-list',         title: 'Browse verbs',        de: 'Liste',          desc: 'Searchable list of all 378 A1/A2/B1/B2 verbs with type, case, and auxiliary.' },
  { numeral: 'B', route: 'verbs-translation',  title: 'Translation quiz',    de: 'Übersetzen',     desc: 'Type the English meaning of a German verb. "to" is optional.' },
  { numeral: 'C', route: 'verbs-sentence',     title: 'Sentence quiz',       de: 'Satz (KI)',      desc: 'AI writes English sentences with your verbs + nouns; you translate to German and the AI grades you.' },
  { numeral: 'D', route: 'verbs-remedial',     title: 'Practise weak verbs', de: 'Schwachstellen', desc: 'A sentence drill focused on the verbs and nouns you get wrong most often.' },
  { numeral: 'E', route: 'verbs-conjugation',  title: 'Conjugation quiz',    de: 'Konjugation',    desc: 'Fill in all six forms across the tenses you pick — from Präsens to Passiv.' },
  { numeral: 'F', route: 'verbs-cheatsheet',   title: 'Cheatsheet',          de: 'Grammatik',      desc: 'Twelve chapters of conjugation rules, exceptions, and example sentences.' },
  { numeral: 'G', route: 'verbs-stammformen',  title: 'Principal parts',      de: 'Stammformen',    desc: "Recall a verb's Präteritum, Partizip II and auxiliary (haben/sein) as one linked set — the strong/irregular verbs worth memorising." },
  { numeral: 'H', route: 'verbs-case-government', title: 'Case government', de: 'Rektion', desc: 'For each verb, identify the case it governs — accusative, dative, both, genitive, reflexive, or no object.' }
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
        <div class="breadcrumb">Kapitel III · Verben</div>
        <h1 class="section-title">Verbs<em>.</em></h1>
        <p class="section-subtitle">
          Translate verbs, drill all fifteen tenses one verb at a time, and consult the long-form cheatsheet
          whenever you forget which auxiliary <em>laufen</em> takes in the Perfekt.
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
        <div class="module-cta">Open <span aria-hidden="true">→</span></div>
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
