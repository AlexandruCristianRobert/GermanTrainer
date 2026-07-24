<script setup lang="ts">
import { useRouter } from 'vue-router'
import { loadHistory } from '../../composables/useQuizHistory'
import DacWeakPoints from '../../components/charts/DacWeakPoints.vue'

const router = useRouter()

// One-shot read from history for the weak-points panel above the groups —
// this page isn't long-lived, so no reactivity is needed (mirrors
// PrepositionsHome's weak-point snapshot).
const historyEntries = loadHistory()

interface Card {
  numeral: string
  route: string
  title: string
  de: string
  desc: string
  query?: Record<string, string>
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
      {
        numeral: 'T2', route: 'dacompounds-match',
        title: 'Matching', de: 'Zuordnung',
        desc: 'Tap a word, then its da-compound — pair every collocation on the screen. Each screen mixes prepositions so no two right-side chips ever match.',
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
    heading: 'Case tests',
    de: 'Kasus',
    cards: [
      {
        numeral: 'T5', route: 'dacompounds-case',
        title: 'Case pick', de: 'Kasus',
        desc: 'A sentence already uses the da-compound — pick the case its underlying collocation governs: Akkusativ or Dativ.',
      },
      {
        numeral: 'T6', route: 'dacompounds-pronoun-case',
        title: 'Pronoun case', de: 'Pronomen',
        desc: 'The object is a PERSON, not a thing — no da-compound applies. Pick or type the correctly declined Präposition + Personalpronomen.',
      },
      {
        numeral: 'T7', route: 'dacompounds-article',
        title: 'Article fill', de: 'Artikel',
        desc: 'Two-way prepositions in verb objects mostly take Akkusativ — except a handful of Dativ verbs like arbeiten an. Type the full declined article.',
      },
    ],
  },
  {
    heading: 'People vs things',
    de: 'Sache oder Person',
    cards: [
      {
        numeral: 'T8', route: 'dacompounds-transform',
        title: 'Thing or person?', de: 'Sache oder Person',
        desc: 'A sentence uses a fixed-preposition collocation — replace the object: a THING becomes a da-compound, a PERSON becomes Präposition + Personalpronomen.',
      },
      {
        numeral: 'T9', route: 'dacompounds-wo-question',
        title: 'Wo-questions', de: 'W-Fragen',
        desc: 'A statement uses a collocation, its object left unflagged — decide for yourself: ask about a THING with a wo-compound, a PERSON with Präposition + wen/wem.',
      },
      {
        numeral: 'T10', route: 'dacompounds-dialogue',
        title: 'Dialogue', de: 'Dialog',
        desc: 'The full pairing: a wo-question opens (Worauf wartest du?) and the reply answers with the da-compound as Korrelat (Ich warte darauf, dass …). Both gaps, one card.',
      },
    ],
  },
  {
    heading: 'Korrelat & meaning',
    de: 'Korrelat',
    cards: [
      {
        numeral: 'T11', route: 'dacompounds-korrelat',
        title: 'Korrelat', de: 'darauf, dass …',
        desc: 'Before a dass-/ob-/w-/zu-clause: some verbs demand a da-compound, some make it optional, some forbid it outright. Pick the compound, or "kein Korrelat" when nothing belongs.',
      },
      {
        numeral: 'T12', route: 'dacompounds-paraphrase',
        title: 'Paraphrase', de: 'Umformung',
        desc: 'The same idea two ways: a noun-phrase sentence needs the bare preposition, its clause paraphrase needs the da-compound Korrelat. Fill both gaps — the card only counts once both are right.',
      },
      {
        numeral: 'T13', route: 'dacompounds-contrast',
        title: 'Meaning contrast', de: 'auf oder über?',
        desc: 'One verb, competing prepositions, different meanings: sich freuen auf (ahead) vs. über (at hand), leiden an vs. unter, bestehen auf vs. aus. The sentence forces exactly one reading.',
      },
    ],
  },
  {
    heading: 'Sentence translation',
    de: 'Übersetzen (KI)',
    cards: [
      {
        numeral: 'T14', route: 'dacompounds-sentence',
        title: 'Translate EN→DE', de: 'Satzübersetzung',
        desc: 'The AI writes an English sentence around one of your collocations and a theme noun — type the German. Both plain-preposition and da-compound constructions appear, with optional word hints.',
        query: { direction: 'en-de' },
      },
      {
        numeral: 'T15', route: 'dacompounds-sentence',
        title: 'Translate DE→EN', de: 'Rückübersetzung',
        desc: 'Now the German sentence comes first — decode the collocation and any da-compound, then type the English meaning. Graded on meaning only, no hints.',
        query: { direction: 'de-en' },
      },
    ],
  },
  {
    heading: 'Production',
    de: 'Produktion',
    cards: [
      {
        numeral: 'T16', route: 'dacompounds-assembly',
        title: 'Sentence assembly', de: 'Satzbau',
        desc: 'Tap pre-inflected tiles into the right order — a canonical order and, where genuinely idiomatic, a fronted variant both count (Für Briefmarken interessiert sich mein Vater is as right as the plain order).',
      },
      {
        numeral: 'T17', route: 'dacompounds-answer',
        title: 'Answer the question', de: 'Antworten (KI)',
        desc: 'The AI asks a natural German question about your theme (Freust du dich auf das Wochenende?) — type a free German answer. Mittelfeld and fronted compounds both count, graded on content and grammar together, word order included.',
      },
    ],
  },
  {
    heading: 'Advanced traps',
    de: 'Fallen (C1)',
    cards: [
      {
        numeral: 'T18', route: 'dacompounds-homograph',
        title: 'Homographs', de: 'damit oder damit?',
        desc: 'The same word, two readings: damit the purpose conjunction ("so that") vs. damit = mit + Sache ("with it"). Each sentence forces exactly one — pick the reading it demands.',
      },
      {
        numeral: 'T19', route: 'dacompounds-register',
        title: 'Register', de: 'gesprochen oder falsch?',
        desc: 'Judge one phrase raw: is it Standard German — fine in speech AND writing — merely colloquial and never written, or ungrammatical in every register?',
      },
      {
        numeral: 'T20', route: 'dacompounds-relative',
        title: 'Relative clauses', de: 'worüber oder über das?',
        desc: 'After a comma, the antecedent decides the link: alles/nichts demands the wo-form, a person forbids it, a concrete thing accepts both — über das or worüber.',
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

function go(target: string, query?: Record<string, string>) {
  router.push(query ? { name: target, query } : { name: target })
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

    <DacWeakPoints :entries="historyEntries" />

    <template v-for="g in groups" :key="g.heading">
      <h2 class="group-heading">{{ g.heading }} · <span class="group-de">{{ g.de }}</span></h2>
      <div class="module-grid">
        <article
          v-for="c in g.cards"
          :key="c.route"
          class="card module-card interactive"
          role="button"
          tabindex="0"
          @click="go(c.route, c.query)"
          @keydown.enter.prevent="go(c.route, c.query)"
          @keydown.space.prevent="go(c.route, c.query)"
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
