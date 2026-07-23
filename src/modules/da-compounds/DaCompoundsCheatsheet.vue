<script setup lang="ts">
import { ref, nextTick } from 'vue'
import '../verbs/cheatsheet/cheatsheet.css'
import ChapterNav, { type Chapter } from '../verbs/cheatsheet/ChapterNav.vue'
import Callout from '../verbs/cheatsheet/Callout.vue'
import {
  DA_COMPOUND_PREPOSITIONS, NO_COMPOUND_PREPOSITIONS, THING_VS_PERSON, KORRELAT,
  daCompound, woCompound, isVowelInitial,
} from '../../data/daCompounds'

const chapters: Chapter[] = [
  { id: 'dac-formation', numeral: 'I',   titleDe: 'Bildung',          titleEn: 'da(r) + preposition, wo(r) for questions' },
  { id: 'dac-none',      numeral: 'II',  titleDe: 'Keine Bildung',    titleEn: 'Prepositions that form no compound' },
  { id: 'dac-person',    numeral: 'III', titleDe: 'Sache oder Person?', titleEn: 'Things take da-, people take pronouns' },
  { id: 'dac-korrelat',  numeral: 'IV',  titleDe: 'Korrelat',         titleEn: 'Pointing at a dass-clause' },
]

const searchQuery = ref('')

function onSelect(id: string) {
  nextTick(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
</script>

<template>
  <div class="page grammatik">
    <header class="section-header cheatsheet-section-header" data-print-hide>
      <div>
        <div class="breadcrumb">Spickzettel · Cheatsheet</div>
        <h1 class="section-title">Da-Compounds<em>.</em></h1>
        <p class="section-subtitle">
          dafür, darauf, davon — the pronoun the preposition swallowed. Formation,
          the things-vs-people rule, and the Korrelat.
        </p>
      </div>
      <router-link :to="{ name: 'dacompounds' }" class="btn btn-ghost back-link">← Da-Compounds</router-link>
    </header>

    <div class="grammatik-layout">
      <ChapterNav
        :chapters="chapters"
        :search-query="searchQuery"
        @update:search-query="searchQuery = $event"
        @select="onSelect"
      />

      <main class="grammatik-main">
        <section id="dac-formation" class="chapter">
          <div class="chapter-numeral">I</div>
          <h2 class="chapter-title">Bildung</h2>
          <p class="chapter-subtitle">
            <strong>da + Präposition</strong> — and a linking <strong>-r-</strong> when the
            preposition starts with a vowel: da<em>r</em>auf, da<em>r</em>über. Questions
            about things use the same rule with <strong>wo(r)-</strong>.
          </p>
          <hr class="rule" />
          <div class="dac-table-wrap">
            <table class="dac-table">
              <thead>
                <tr><th>Präposition</th><th>da-</th><th>wo-</th><th>Sense</th></tr>
              </thead>
              <tbody>
                <tr v-for="e in DA_COMPOUND_PREPOSITIONS" :key="e.preposition">
                  <td class="dac-prep">{{ e.preposition }}</td>
                  <td :class="{ 'dac-r': isVowelInitial(e.preposition) }">{{ daCompound(e.preposition) }}</td>
                  <td :class="{ 'dac-r': isVowelInitial(e.preposition) }">{{ woCompound(e.preposition) }}</td>
                  <td class="dac-gloss">{{ e.gloss }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Callout kind="note">
            <p>
              Spelling traps: <em>*daauf</em>, <em>*darmit</em>, <em>*woauf</em> —
              the <strong>-r-</strong> exists only before a vowel, and never before a consonant.
            </p>
          </Callout>
        </section>

        <section id="dac-none" class="chapter">
          <div class="chapter-numeral">II</div>
          <h2 class="chapter-title">Keine Bildung</h2>
          <p class="chapter-subtitle">These prepositions form <strong>no</strong> da- or wo-compound.</p>
          <hr class="rule" />
          <ul class="dac-none-list">
            <li v-for="p in NO_COMPOUND_PREPOSITIONS" :key="p">
              <strong>{{ p }}</strong> — <em>*{{ daCompound(p) }}</em> does not exist
            </li>
          </ul>
          <Callout kind="exception">
            <p>
              <strong>ohne</strong> and the genitive prepositions (<em>während, wegen, trotz, statt</em>)
              repeat the noun or use a pronoun instead: <em>ohne das Auto → ohne es</em>.
            </p>
          </Callout>
        </section>

        <section id="dac-person" class="chapter">
          <div class="chapter-numeral">III</div>
          <h2 class="chapter-title">Sache oder Person?</h2>
          <p class="chapter-subtitle">
            Da-compounds stand for <strong>things, abstracts, and whole clauses</strong> — never for
            people. A person keeps <strong>Präposition + Pronomen</strong>, and questions split the
            same way: <em>Worauf?</em> for things, <em>Auf wen?</em> for people.
          </p>
          <hr class="rule" />
          <div v-for="pair in THING_VS_PERSON" :key="pair.base" class="dac-pair">
            <div class="dac-pair-base">{{ pair.base }}</div>
            <div class="dac-pair-cols">
              <div>
                <div class="dac-pair-label">Sache</div>
                <p>{{ pair.thingQ }} → <strong>{{ pair.thingA }}</strong></p>
              </div>
              <div>
                <div class="dac-pair-label">Person</div>
                <p>{{ pair.personQ }} → <strong>{{ pair.personA }}</strong></p>
              </div>
            </div>
          </div>
          <Callout kind="note">
            <p>
              A da-compound can also point at a whole previous sentence:
              <em>Sie hat die Prüfung bestanden. <strong>Damit</strong> hat niemand gerechnet.</em>
            </p>
          </Callout>
        </section>

        <section id="dac-korrelat" class="chapter">
          <div class="chapter-numeral">IV</div>
          <h2 class="chapter-title">Korrelat</h2>
          <p class="chapter-subtitle">
            The da-compound can announce a following <em>dass</em>-/<em>ob</em>-clause or
            <em>zu</em>-infinitive: <em>Ich freue mich <strong>darauf</strong>, dich zu sehen.</em>
            Whether it must, may, or must not appear depends on the verb.
          </p>
          <hr class="rule" />
          <h3 class="pattern-heading">Obligatorisch — the compound must appear</h3>
          <ul class="dac-korrelat-list">
            <li v-for="e in KORRELAT.obligatory" :key="e.expression">
              <strong>{{ e.expression }}</strong> — <em>{{ e.example }}</em>
            </li>
          </ul>
          <h3 class="pattern-heading">Fakultativ — with or without</h3>
          <ul class="dac-korrelat-list">
            <li v-for="e in KORRELAT.optional" :key="e.expression">
              <strong>{{ e.expression }}</strong> — <em>{{ e.example }}</em>
            </li>
          </ul>
          <h3 class="pattern-heading">Ausgeschlossen — plain dass, no compound</h3>
          <ul class="dac-korrelat-list">
            <li v-for="e in KORRELAT.excluded" :key="e.expression">
              <strong>{{ e.expression }}</strong> — <em>{{ e.example }}</em>
            </li>
          </ul>
          <Callout kind="exception">
            <p>
              Overusing the Korrelat is a real error: <em>*Ich weiß darüber, dass …</em> —
              <strong>wissen</strong>, <strong>glauben</strong>, <strong>sagen</strong> take a plain
              <em>dass</em>-clause.
            </p>
          </Callout>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.cheatsheet-section-header { margin-bottom: 48px; }
.back-link { text-decoration: none; border-bottom: 0; }

.grammatik-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 64px;
  max-width: 1160px;
  margin: 0 auto;
  align-items: start;
}
.grammatik-main { max-width: 720px; min-width: 0; }

.chapter {
  position: relative;
  margin: 0 0 88px 0;
  scroll-margin-top: 96px;
  animation: chapter-in 400ms ease-out both;
}
.chapter:first-of-type { margin-top: 0; }

@keyframes chapter-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.chapter-numeral {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  line-height: 1;
  color: var(--accent);
  margin-bottom: 14px;
}
.chapter-numeral::before { content: 'Kapitel '; color: var(--mute); }

.chapter-title { font-size: 44px; font-weight: 600; line-height: 1.1; margin-bottom: 4px; }
.chapter-subtitle { font-size: 18px; font-style: italic; color: var(--ink-soft); margin: 0; }

.pattern-heading {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  margin: 22px 0 2px 0;
  color: var(--accent);
}

/* Tablet — 640–1023px */
@media (max-width: 1023px) {
  .grammatik-layout { grid-template-columns: 1fr; gap: 24px; }
  .chapter-title { font-size: 36px; }
}

/* Mobile — < 640px */
@media (max-width: 639px) {
  .chapter { margin: 0 0 56px 0; }
  .chapter-title { font-size: 30px; }
  .chapter-subtitle { font-size: 16px; }
}

.dac-table-wrap { overflow-x: auto; }
.dac-table { width: 100%; border-collapse: collapse; font-size: 15px; }
.dac-table th {
  text-align: left; font-family: var(--font-mono); font-size: 11px;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--mute);
  padding: 6px 12px 6px 0; border-bottom: 1px solid var(--rule);
}
.dac-table td { padding: 7px 12px 7px 0; border-bottom: 1px solid var(--hairline, var(--rule)); }
.dac-prep { font-weight: 600; }
.dac-r { font-style: italic; }
.dac-gloss { color: var(--ink-soft); font-size: 14px; }
.dac-none-list, .dac-korrelat-list { padding-left: 18px; }
.dac-none-list li, .dac-korrelat-list li { margin: 6px 0; }
.dac-pair { margin: 18px 0; }
.dac-pair-base {
  font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 4px;
}
.dac-pair-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.dac-pair-label { font-size: 12px; font-style: italic; color: var(--mute); }
.dac-pair-cols p { margin: 2px 0 0; }
@media (max-width: 560px) {
  .dac-pair-cols { grid-template-columns: 1fr; gap: 8px; }
}
</style>
