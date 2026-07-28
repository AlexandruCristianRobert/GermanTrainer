<script setup lang="ts">
import { ref, nextTick } from 'vue'
import '../verbs/cheatsheet/cheatsheet.css'
import ChapterNav, { type Chapter } from '../verbs/cheatsheet/ChapterNav.vue'
import Callout from '../verbs/cheatsheet/Callout.vue'
import SceneDiagram from './SceneDiagram.vue'
import {
  ADVERB_PAIRS, UNPAIRED_ADVERBS, PERSPECTIVE_PAIRS, QUESTION_WORDS, POINTER_WORDS,
  LEXICALIZED_VERBS, IDIOMS, hinForm, herForm,
  type SceneSpec,
} from '../../data/directionWords'

const chapters: Chapter[] = [
  { id: 'dw-rule',      numeral: 'I',   titleDe: 'Hin oder her?',       titleEn: 'The perspective rule' },
  { id: 'dw-pairs',     numeral: 'II',  titleDe: 'Die Paare',           titleEn: 'hinein/herein and friends' },
  { id: 'dw-register',  numeral: 'III', titleDe: 'Kurzformen',          titleEn: 'rein, raus — register' },
  { id: 'dw-questions', numeral: 'IV',  titleDe: 'Wo, wohin, woher',    titleEn: 'Questions and pointers' },
  { id: 'dw-lexical',   numeral: 'V',   titleDe: 'Verblasste Richtung', titleEn: 'Verbs where direction died' },
  { id: 'dw-idioms',    numeral: 'VI',  titleDe: 'Redewendungen',       titleEn: 'hin und her, hin und wieder' },
]

const searchQuery = ref('')

function onSelect(id: string) {
  nextTick(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

// Same staircase, flipped speaker — the whole rule in two pictures.
const sceneHer: SceneSpec = {
  archetype: 'stairs', speakerAt: 'top', motion: 'toward-speaker',
  description: 'You stand at the top of the stairs; someone climbs up toward you — herauf.',
}
const sceneHin: SceneSpec = {
  archetype: 'stairs', speakerAt: 'bottom', motion: 'away-from-speaker',
  description: 'You stand at the bottom of the stairs; someone climbs up away from you — hinauf.',
}
</script>

<template>
  <div class="page grammatik">
    <header class="section-header cheatsheet-section-header" data-print-hide>
      <div>
        <div class="breadcrumb">Spickzettel · Cheatsheet</div>
        <h1 class="section-title">Direction Words<em>.</em></h1>
        <p class="section-subtitle">
          hin & her — one rule about where you stand. The pairs, the shortcuts,
          the questions, and the verbs where the direction has faded.
        </p>
      </div>
      <router-link :to="{ name: 'directionwords' }" class="btn btn-ghost back-link">← Direction Words</router-link>
    </header>

    <div class="grammatik-layout">
      <ChapterNav
        :chapters="chapters"
        :search-query="searchQuery"
        @update:search-query="searchQuery = $event"
        @select="onSelect"
      />

      <main class="grammatik-main">
        <section id="dw-rule" class="chapter">
          <div class="chapter-numeral">I</div>
          <h2 class="chapter-title">Hin oder her?</h2>
          <p class="chapter-subtitle">
            One question decides everything: <strong>where does the speaker stand?</strong>
            Motion <strong>toward</strong> the speaker is <strong>her</strong>; motion
            <strong>away</strong> from the speaker is <strong>hin</strong>. The same climb up
            the same stairs takes a different word depending on who is talking.
          </p>
          <hr class="rule" />
          <div class="dw-scene-pair">
            <div>
              <SceneDiagram :scene="sceneHer" />
              <p class="dw-scene-caption"><strong>Komm herauf!</strong> — the speaker waits at the top.</p>
            </div>
            <div>
              <SceneDiagram :scene="sceneHin" />
              <p class="dw-scene-caption"><strong>Er geht hinauf.</strong> — the speaker stays at the bottom.</p>
            </div>
          </div>
          <div v-for="p in PERSPECTIVE_PAIRS" :key="p.her" class="dw-pair">
            <div class="dw-pair-cols">
              <div>
                <div class="dw-pair-label">her — toward the speaker</div>
                <p><strong>{{ p.her }}</strong> <em>({{ p.herNote }})</em></p>
              </div>
              <div>
                <div class="dw-pair-label">hin — away from the speaker</div>
                <p><strong>{{ p.hin }}</strong> <em>({{ p.hinNote }})</em></p>
              </div>
            </div>
          </div>
          <Callout kind="exception">
            <p>
              The classic transfer trap: English <em>"come here"</em> is
              <strong>Komm her!</strong> — never <em>*Komm hier!</em>
              <em>hier</em> is a place, <em>her</em> is a motion.
            </p>
          </Callout>
        </section>

        <section id="dw-pairs" class="chapter">
          <div class="chapter-numeral">II</div>
          <h2 class="chapter-title">Die Paare</h2>
          <p class="chapter-subtitle">
            hin/her + direction — every pair differs <strong>only</strong> in perspective.
            The right column is the spoken shortcut of Chapter III.
          </p>
          <hr class="rule" />
          <div class="dw-table-wrap">
            <table class="dw-table">
              <thead>
                <tr><th>Richtung</th><th>hin-</th><th>her-</th><th>Kurzform</th></tr>
              </thead>
              <tbody>
                <tr v-for="p in ADVERB_PAIRS" :key="p.element">
                  <td class="dw-gloss">{{ p.gloss }}</td>
                  <td class="dw-form">{{ hinForm(p.element) }}</td>
                  <td class="dw-form">{{ herForm(p.element) }}</td>
                  <td class="dw-form">{{ p.rForm ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h3 class="pattern-heading">Ohne Zwilling — no hin/her twin</h3>
          <ul class="dw-list">
            <li v-for="u in UNPAIRED_ADVERBS" :key="u.form">
              <strong>{{ u.form }}</strong> — {{ u.gloss }}
            </li>
          </ul>
        </section>

        <section id="dw-register" class="chapter">
          <div class="chapter-numeral">III</div>
          <h2 class="chapter-title">Kurzformen</h2>
          <p class="chapter-subtitle">
            Spoken German shortens the compounds to <strong>r-forms</strong> — and stops
            caring where the speaker stands: <em>rein</em> covers <em>hinein</em>
            <strong>and</strong> <em>herein</em>.
          </p>
          <hr class="rule" />
          <ul class="dw-list">
            <li v-for="p in ADVERB_PAIRS.filter(p => p.rForm !== null)" :key="p.element">
              <strong>{{ p.rForm }}</strong> = {{ hinForm(p.element) }} <em>oder</em> {{ herForm(p.element) }}
              — <em>Komm {{ p.rForm }}!</em>
            </li>
          </ul>
          <Callout kind="note">
            <p>
              🗣 <em>Komm rüber!</em> is everyday spoken German — in an essay, write
              <em>herüber</em>. The r-form is a register choice, never an error.
            </p>
          </Callout>
          <Callout kind="exception">
            <p>
              What <strong>is</strong> always wrong: gluing hin/her onto an r-form —
              <em>*hinrein</em>, <em>*herraus</em>. The r-form already replaced them.
            </p>
          </Callout>
        </section>

        <section id="dw-questions" class="chapter">
          <div class="chapter-numeral">IV</div>
          <h2 class="chapter-title">Wo, wohin, woher</h2>
          <p class="chapter-subtitle">
            German splits English <em>where</em> in three: place, goal, origin —
            and the moving two can split in speech: <em>Wo gehst du <strong>hin</strong>?</em>
          </p>
          <hr class="rule" />
          <div class="dw-table-wrap">
            <table class="dw-questions-table">
              <thead>
                <tr><th>Wort</th><th>fragt nach</th><th>Beispiel</th><th>Gesprochen</th></tr>
              </thead>
              <tbody>
                <tr v-for="q in QUESTION_WORDS" :key="q.word">
                  <td class="dw-form">{{ q.word }}</td>
                  <td class="dw-gloss">{{ q.asksDe }} · {{ q.asksEn }}</td>
                  <td>{{ q.example }}</td>
                  <td>{{ q.split ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h3 class="pattern-heading">Zeigewörter — pointers</h3>
          <ul class="dw-list">
            <li v-for="p in POINTER_WORDS" :key="p.word">
              <strong>{{ p.word }}</strong> — {{ p.gloss }} · <em>{{ p.example }}</em>
            </li>
          </ul>
          <Callout kind="exception">
            <p>
              Static vs. motion is a hard line: <em>*Wohin bist du?</em> and
              <em>*Wo gehst du?</em> (meaning a goal) are both wrong —
              <strong>sein</strong> takes <em>wo</em>, <strong>gehen</strong> takes <em>wohin</em>.
            </p>
          </Callout>
        </section>

        <section id="dw-lexical" class="chapter">
          <div class="chapter-numeral">V</div>
          <h2 class="chapter-title">Verblasste Richtung</h2>
          <p class="chapter-subtitle">
            In these verbs the hin-/her- prefix stopped meaning direction — they are
            <strong>vocabulary</strong>, and the perspective rule cannot decode them:
            <em>herstellen</em> is manufacturing, not fetching.
          </p>
          <hr class="rule" />
          <div v-for="v in LEXICALIZED_VERBS" :key="v.verb" class="dw-lex-row">
            <strong>{{ v.verb }}</strong> — {{ v.meaning }}
            <div class="dw-lex-example"><em>{{ v.example }}</em></div>
          </div>
        </section>

        <section id="dw-idioms" class="chapter">
          <div class="chapter-numeral">VI</div>
          <h2 class="chapter-title">Redewendungen</h2>
          <p class="chapter-subtitle">
            Fixed expressions — including the pair that names this module and the
            two time idioms (<em>lange her</em> looks back, <em>noch lange hin</em> looks ahead).
          </p>
          <hr class="rule" />
          <ul class="dw-list">
            <li v-for="i in IDIOMS" :key="i.idiom">
              <strong>{{ i.idiom }}</strong> — {{ i.meaning }} · <em>{{ i.example }}</em>
            </li>
          </ul>
          <Callout kind="note">
            <p>
              Near-miss alert: <strong>hin und her</strong> is <em>back and forth</em>;
              <strong>hin und wieder</strong> is <em>now and then</em>. Swapping them is
              a favourite C1 trap.
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

.dw-table-wrap { overflow-x: auto; }
.dw-table, .dw-questions-table { width: 100%; border-collapse: collapse; font-size: 15px; }
.dw-table th, .dw-questions-table th {
  text-align: left; font-family: var(--font-mono); font-size: 11px;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--mute);
  padding: 6px 12px 6px 0; border-bottom: 1px solid var(--rule);
}
.dw-table td, .dw-questions-table td { padding: 7px 12px 7px 0; border-bottom: 1px solid var(--hairline, var(--rule)); }
.dw-form { font-weight: 600; }
.dw-gloss { color: var(--ink-soft); font-size: 14px; }
.dw-list { padding-left: 18px; }
.dw-list li { margin: 6px 0; }
.dw-scene-pair {
  display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
  margin: 12px 0 20px;
}
.dw-scene-caption { margin: 6px 0 0; font-size: 14px; color: var(--ink-soft); }
.dw-pair { margin: 14px 0; }
.dw-pair-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.dw-pair-label {
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--mute);
}
.dw-pair-cols p { margin: 2px 0 0; }
.dw-lex-row { margin: 12px 0; }
.dw-lex-example { margin-top: 2px; color: var(--ink-soft); font-size: 14px; }
@media (max-width: 560px) {
  .dw-scene-pair, .dw-pair-cols { grid-template-columns: 1fr; gap: 10px; }
}
</style>
