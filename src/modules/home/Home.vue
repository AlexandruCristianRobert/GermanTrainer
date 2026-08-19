<script setup lang="ts">
import { useRouter } from 'vue-router'
import TagesplanPanel from './TagesplanPanel.vue'

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
    route: 'konjunktiv',
    de: 'Konjunktiv I',
    title: 'Indirect speech',
    desc: 'Rewrite direct-speech quotes in reported speech using Konjunktiv I — with the K-II fallback for K-I/indicative collisions. B1 · B2 · C1.',
    meta: 'AI-generated · on demand'
  },
  {
    numeral: 'V',
    route: 'passiv',
    de: 'Passiv',
    title: 'Passiv transformations',
    desc: 'Rewrite active sentences as Vorgangs-, Zustandspassiv, sich-lassen, sein-zu, -bar-Adjektiv, or man-Konstruktion — one target form at a time.',
    meta: 'AI-generated · on demand'
  },
  {
    numeral: 'VI',
    route: 'writing',
    de: 'Schreiben',
    title: 'Writing tutor',
    desc: 'Goethe C1 / telc C1 rubric grading on a free-form German essay. Six task types, draft history, paragraph-upgrade suggestions, per-criterion feedback.',
    meta: 'AI-graded · on demand'
  },
  {
    numeral: 'VII',
    route: 'simulator-c1',
    de: 'Goethe C1 · Schreiben',
    title: 'Mock exam',
    desc: 'Sit a timed Goethe C1 Schreiben mock — Forumsbeitrag und formelle E-Mail in 75 Minuten, beide automatisch nach der offiziellen Rubrik bewertet.',
    meta: '75 min · 2 Aufgaben · AI-graded'
  },
  {
    numeral: 'VIII',
    route: 'dacompounds',
    de: 'Pronominaladverbien',
    title: 'Da-Compounds',
    desc: 'dafür, darauf, davon — build them, pick their case, spot when a person needs a pronoun instead.',
    meta: '20 drills · cheatsheet · weak points'
  },
  {
    numeral: 'IX',
    route: 'sprechen',
    de: 'Sprechen · Teil 2',
    title: 'Discussion',
    desc: 'Argue a controversial Topic with an AI partner in typed turns — Redemittel cheatsheet, layered hints, and a Goethe-B2 evaluation that marks every mistake.',
    meta: '100 topics · AI partner · B2-graded'
  },
  {
    numeral: 'X',
    route: 'directionwords',
    de: 'hin & her',
    title: 'Direction Words',
    desc: 'hinein or herein? The perspective rule with scene diagrams, the six hin/her pairs, rein/raus shortcuts, and the verbs where direction has faded.',
    meta: 'Cheatsheet live · drills arriving in phases'
  },
  {
    numeral: 'XI',
    route: 'settings',
    de: 'Einstellungen',
    title: 'Settings',
    desc: 'Set your Gemini API key and choose a model. Required for AI-driven modules.',
    meta: 'Local · stored in your browser'
  },
  {
    numeral: 'XII',
    route: 'sentence',
    de: 'Sätze',
    title: 'Sentence',
    desc: 'The packed card: verbs, nouns, prepositions, da-compounds and connectors in one AI-written sentence — you pick how many of each.',
    meta: 'AI-generated · budget of 8 items per card'
  },
  {
    numeral: 'XIII',
    route: 'dative',
    de: 'Dativ',
    title: 'Dative',
    desc: 'helfen, danken, gefallen — the verbs and adjectives that mark their person dative, the English pull that breaks them, and the inverted sentences.',
    meta: '13 drills · cheatsheet · item ledger'
  },
  {
    numeral: 'XIV',
    route: 'schreiben',
    de: 'Goethe B2 · Schreiben',
    title: 'Forumsbeitrag & Nachricht',
    desc: 'Teil 1 der B2-Prüfung trainieren: ein Schreibthema, vier Inhaltspunkte, mindestens 150 Wörter — mit Schreibplan, Redemittel-Drawer und Bewertung nach der offiziellen Rubrik. Teil 2: die halbformelle Nachricht mit Rahmen-Gerüst und Radar.',
    meta: 'Teil 1 & 2 live · AI-graded'
  },
  {
    numeral: 'XV',
    route: 'relativ',
    de: 'Relativsätze',
    title: 'Relative pronouns',
    desc: 'der, den, dem, dessen — the antecedent decides gender and number, the role inside the clause decides the case. Plus dessen/deren and prepositions that pull the pronoun with them.',
    meta: '120 items · offline · B1 · B2 · C1'
  },
  {
    numeral: 'XVI',
    route: 'ndekl',
    de: 'Schwache Substantive',
    title: 'N-Deklination',
    desc: 'den Kollegen, dem Studenten, des Namens — the weak masculines that take -(e)n everywhere but the Nominativ Singular, and the strong nouns learners over-inflect.',
    meta: '100 items · 40 weak nouns · offline'
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
        <div class="breadcrumb">Frontispiece · I/XVI</div>
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

    <TagesplanPanel />

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
