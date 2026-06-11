<script setup lang="ts">
import { useRouter } from 'vue-router'
import { loadHistory } from '../../composables/useQuizHistory'
import { computeWeakPoints } from '../../composables/usePrepRemedial'

const router = useRouter()

// Weak-point snapshot for the panel above the module grid. This page isn't
// long-lived, so a one-shot read from history is fine (no reactivity needed).
const weak = computeWeakPoints(loadHistory())
const topPreps = weak.weakPreps.slice(0, 4)
const topNouns = weak.weakNouns.slice(0, 4)
const hasWeak = topPreps.length > 0 || topNouns.length > 0

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

    <section class="card weak-panel">
      <div class="weak-head">
        <div class="weak-mark">Schwachstellen</div>
        <h2 class="weak-title">Your weak points</h2>
      </div>

      <template v-if="hasWeak">
        <div class="weak-cols">
          <div v-if="topPreps.length" class="weak-col">
            <div class="weak-col-label">Prepositions</div>
            <ul class="weak-list">
              <li v-for="p in topPreps" :key="p.prepId">
                <span class="weak-term">{{ p.german }}</span>
                <span class="weak-ratio mono">{{ p.wrong }}/{{ p.seen }}</span>
              </li>
            </ul>
          </div>
          <div v-if="topNouns.length" class="weak-col">
            <div class="weak-col-label">Nouns</div>
            <ul class="weak-list">
              <li v-for="n in topNouns" :key="n.nounKey">
                <span class="weak-term">{{ n.nounKey }}</span>
                <span class="weak-ratio mono">{{ n.wrong }}/{{ n.seen }}</span>
              </li>
            </ul>
          </div>
        </div>
        <button
          class="btn btn-accent weak-cta"
          type="button"
          @click="router.push({ name: 'prepositions-remedial' })"
        >
          Practice these <span aria-hidden="true">→</span>
        </button>
      </template>

      <p v-else class="weak-empty">
        Do a few EN→DE sentence quizzes with AI grading to surface your weak
        prepositions and nouns.
      </p>
    </section>

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

<style scoped>
.weak-panel {
  margin-bottom: 24px;
}
.weak-head {
  margin-bottom: 16px;
}
.weak-mark {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 4px;
}
.weak-title {
  margin: 0;
}
.weak-cols {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  margin-bottom: 20px;
}
.weak-col {
  flex: 1 1 200px;
  min-width: 0;
}
.weak-col-label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 8px;
}
.weak-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.weak-list li {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px dotted var(--hairline);
}
.weak-term {
  font-family: var(--font-display);
  font-size: 17px;
  color: var(--ink);
}
.weak-ratio {
  font-size: 12px;
  color: var(--danger);
}
.weak-cta {
  margin-top: 4px;
}
.weak-empty {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--mute);
  margin: 0;
}
</style>
