<script setup lang="ts">
import SceneDiagram from './SceneDiagram.vue'
import {
  ADVERB_PAIRS, UNPAIRED_ADVERBS, PERSPECTIVE_PAIRS, QUESTION_WORDS, POINTER_WORDS,
  LEXICALIZED_VERBS, IDIOMS, hinForm, herForm,
  type SceneSpec,
} from '../../data/directionWords'

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
  <div class="page">
    <header class="section-header cheatsheet-section-header">
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

    <section id="dw-rule" class="plate">
      <div class="plate-h">
        <span class="plate-n">I</span>
        <h2 class="plate-t">The perspective rule</h2>
        <span class="plate-de">Hin oder her?</span>
      </div>
      <div class="plate-b">
        <p>
          One question decides everything: <strong>where does the speaker stand?</strong>
          Motion <strong>toward</strong> the speaker is <strong>her</strong>; motion
          <strong>away</strong> from the speaker is <strong>hin</strong>. The same climb up
          the same stairs takes a different word depending on who is talking.
        </p>
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
        <div class="persp-pairs">
          <div class="pp-col">
            <div class="pp-h her">her</div>
            <div v-for="p in PERSPECTIVE_PAIRS" :key="p.her" class="pp-item">
              <div class="pp-s">{{ p.her }}</div>
              <div class="pp-n">{{ p.herNote }}</div>
            </div>
          </div>
          <div class="pp-col">
            <div class="pp-h hin">hin</div>
            <div v-for="p in PERSPECTIVE_PAIRS" :key="p.hin" class="pp-item">
              <div class="pp-s">{{ p.hin }}</div>
              <div class="pp-n">{{ p.hinNote }}</div>
            </div>
          </div>
        </div>
        <p>
          The classic transfer trap: English <em>"come here"</em> is
          <strong>Komm her!</strong> — never <em>*Komm hier!</em>
          <em>hier</em> is a place, <em>her</em> is a motion.
        </p>
      </div>
    </section>

    <section id="dw-pairs" class="plate">
      <div class="plate-h">
        <span class="plate-n">II</span>
        <h2 class="plate-t">hinein/herein and friends</h2>
        <span class="plate-de">Die Paare</span>
      </div>
      <div class="plate-b">
        <p>
          hin/her + direction — every pair differs <strong>only</strong> in perspective.
          The right column is the spoken shortcut of Chapter III.
        </p>
        <table class="mini-table">
          <thead>
            <tr>
              <th>Richtung</th>
              <th style="color: var(--clay)">hin-</th>
              <th style="color: var(--cobalt)">her-</th>
              <th>Kurzform</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in ADVERB_PAIRS" :key="p.element">
              <td class="t-it">{{ p.gloss }}</td>
              <td class="t-de">{{ hinForm(p.element) }}</td>
              <td class="t-de">{{ herForm(p.element) }}</td>
              <td class="t-mono">{{ p.rForm ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
        <h3 class="micro-mark">Ohne Zwilling — no hin/her twin</h3>
        <table class="mini-table">
          <tbody>
            <tr v-for="u in UNPAIRED_ADVERBS" :key="u.form">
              <td class="t-de">{{ u.form }}</td>
              <td class="t-it">{{ u.gloss }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="dw-register" class="plate">
      <div class="plate-h">
        <span class="plate-n">III</span>
        <h2 class="plate-t">rein, raus — register</h2>
        <span class="plate-de">Kurzformen</span>
      </div>
      <div class="plate-b">
        <p>
          Spoken German shortens the compounds to <strong>r-forms</strong> — and stops
          caring where the speaker stands: <em>rein</em> covers <em>hinein</em>
          <strong>and</strong> <em>herein</em>.
        </p>
        <table class="mini-table">
          <thead>
            <tr><th>R-Form</th><th>= hin-/her-</th><th>Beispiel</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in ADVERB_PAIRS.filter(p => p.rForm !== null)" :key="p.element">
              <td class="t-de">{{ p.rForm }}</td>
              <td class="t-mono">{{ hinForm(p.element) }} <span class="t-it">oder</span> {{ herForm(p.element) }}</td>
              <td class="t-ex">Komm {{ p.rForm }}!</td>
            </tr>
          </tbody>
        </table>
        <p>
          🗣 <em>Komm rüber!</em> is everyday spoken German — in an essay, write
          <em>herüber</em>. The r-form is a register choice, never an error.
        </p>
        <p>
          What <strong>is</strong> always wrong: gluing hin/her onto an r-form —
          <em>*hinrein</em>, <em>*herraus</em>. The r-form already replaced them.
        </p>
      </div>
    </section>

    <section id="dw-questions" class="plate">
      <div class="plate-h">
        <span class="plate-n">IV</span>
        <h2 class="plate-t">Questions and pointers</h2>
        <span class="plate-de">Wo, wohin, woher</span>
      </div>
      <div class="plate-b">
        <p>
          German splits English <em>where</em> in three: place, goal, origin —
          and the moving two can split in speech: <em>Wo gehst du <strong>hin</strong>?</em>
        </p>
        <table class="mini-table">
          <thead>
            <tr><th>Wort</th><th>fragt nach</th><th>Beispiel</th><th>Gesprochen</th></tr>
          </thead>
          <tbody>
            <tr v-for="q in QUESTION_WORDS" :key="q.word">
              <td class="t-de">{{ q.word }}</td>
              <td class="t-mono">{{ q.asksDe }} <span class="t-it">· {{ q.asksEn }}</span></td>
              <td class="t-ex">{{ q.example }}</td>
              <td class="t-mono">{{ q.split ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
        <h3 class="micro-mark">Zeigewörter — pointers</h3>
        <table class="mini-table">
          <tbody>
            <tr v-for="p in POINTER_WORDS" :key="p.word">
              <td class="t-de">{{ p.word }}</td>
              <td class="t-it">{{ p.gloss }}</td>
              <td class="t-ex">{{ p.example }}</td>
            </tr>
          </tbody>
        </table>
        <p>
          Static vs. motion is a hard line: <em>*Wohin bist du?</em> and
          <em>*Wo gehst du?</em> (meaning a goal) are both wrong —
          <strong>sein</strong> takes <em>wo</em>, <strong>gehen</strong> takes <em>wohin</em>.
        </p>
      </div>
    </section>

    <section id="dw-lexical" class="plate">
      <div class="plate-h">
        <span class="plate-n">V</span>
        <h2 class="plate-t">Verbs where direction died</h2>
        <span class="plate-de">Verblasste Richtung</span>
      </div>
      <div class="plate-b">
        <p>
          In these verbs the hin-/her- prefix stopped meaning direction — they are
          <strong>vocabulary</strong>, and the perspective rule cannot decode them:
          <em>herstellen</em> is manufacturing, not fetching.
        </p>
        <table class="mini-table">
          <tbody>
            <tr v-for="v in LEXICALIZED_VERBS" :key="v.verb">
              <td class="t-de">{{ v.verb }}</td>
              <td class="t-it">{{ v.meaning }}</td>
              <td class="t-ex">{{ v.example }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="dw-idioms" class="plate">
      <div class="plate-h">
        <span class="plate-n">VI</span>
        <h2 class="plate-t">hin und her, hin und wieder</h2>
        <span class="plate-de">Redewendungen</span>
      </div>
      <div class="plate-b">
        <p>
          Fixed expressions — including the pair that names this module and the
          two time idioms (<em>lange her</em> looks back, <em>noch lange hin</em> looks ahead).
        </p>
        <table class="mini-table">
          <tbody>
            <tr v-for="i in IDIOMS" :key="i.idiom">
              <td class="t-de">{{ i.idiom }}</td>
              <td class="t-it">{{ i.meaning }}</td>
              <td class="t-ex">{{ i.example }}</td>
            </tr>
          </tbody>
        </table>
        <p>
          Near-miss alert: <strong>hin und her</strong> is <em>back and forth</em>;
          <strong>hin und wieder</strong> is <em>now and then</em>. Swapping them is
          a favourite C1 trap.
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page { max-width: 980px; }
.cheatsheet-section-header { margin-bottom: 48px; }
.back-link { text-decoration: none; border-bottom: 0; }

.dw-scene-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin: 4px 0 22px;
}
.dw-scene-caption { margin: 6px 0 0; font-size: 14px; color: var(--ink-soft); }

@media (max-width: 560px) {
  .dw-scene-pair { grid-template-columns: 1fr; gap: 10px; }
}
</style>
