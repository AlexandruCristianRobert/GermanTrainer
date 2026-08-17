<script setup lang="ts">
// Schreiben Spickzettel — now both live Teile (mirrors SprechenCheatsheet.vue's
// Teil 1/Teil 2 part toggle mechanics). Teil 1 keeps its own pre-existing
// tab split by content kind (phrase bank vs. strategy tips); Teil 2 gets the
// same two-tab shape, built on the Nachrichtenmittel bank and its own Tipps.
import { ref } from 'vue'
import {
  SCHREIB_MOVES, SCHREIB_MOVE_LABEL, schreibmittelForMove, SCHREIBEN_SCHREIBMITTEL
} from '../../data/schreibenMittel'
import {
  NACHRICHT_MOVES, NACHRICHT_MOVE_LABEL, nachrichtenmittelForMove, SCHREIBEN_NACHRICHTENMITTEL,
  RAHMEN_PAARE
} from '../../data/schreibenNachrichtenMittel'
import { lifetimeCounts } from '../../composables/useRedemittelYield'
import { SCHREIBEN_TEIL1_TIPPS, SCHREIBEN_TEIL2_TIPPS } from '../../data/schreibenTipps'

type CheatsheetPart = 'teil1' | 'teil2'
// Teil 1 is the default — before this toggle existed the whole page WAS Teil
// 1, so a returning learner sees no change (mirrors SprechenCheatsheet.vue's
// same reasoning, applied to whichever part was here first).
const part = ref<CheatsheetPart>('teil1')

type CheatsheetTab = 'schreibmittel' | 'strategie'
const tab = ref<CheatsheetTab>('schreibmittel')

type Teil2Tab = 'nachrichtenmittel' | 'strategie'
const teil2Tab = ref<Teil2Tab>('nachrichtenmittel')

const moveNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
const tippNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI']

// Teil 2's Nachrichtenmittel tab opens with the Rahmen plate at 'I', so its
// eight Move plates pick up at 'II' (same pattern as SprechenCheatsheet.vue's
// vortragMoveNumerals picking up after that part's lead-in chapters).
const nachrichtMoveNumerals = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']

// Read the lifetime rollup once — it hits localStorage, not per row/render.
// Bank-filtered, so Sprechen's Redemittel/Vortragsmittel tallies (and each
// other Schreiben bank's) can never bleed into a given bank's dots.
const lifetime = lifetimeCounts(SCHREIBEN_SCHREIBMITTEL)
function everUsed(id: string): boolean {
  return (lifetime[id] ?? 0) > 0
}

const nmLifetime = lifetimeCounts(SCHREIBEN_NACHRICHTENMITTEL)
function everUsedNm(id: string): boolean {
  return (nmLifetime[id] ?? 0) > 0
}
</script>

<template>
  <div class="page">
    <header class="section-header cheatsheet-section-header">
      <div>
        <div class="breadcrumb">Spickzettel · Cheatsheet</div>
        <h1 class="section-title">Schreiben<em>.</em></h1>
        <p class="section-subtitle">
          Ein Schreibmittel oder Nachrichtenmittel pro Funktion reicht nicht — such dir für jeden
          Absatz des Forumsbeitrags oder jede Zeile der Nachricht das passende aus, statt immer
          dieselbe Wendung zu wiederholen.
        </p>
      </div>
      <router-link :to="{ name: 'schreiben' }" class="btn btn-ghost back-link">← Schreiben</router-link>
    </header>

    <div class="spr-part-toggle" role="tablist">
      <button
        type="button" class="spr-part-btn" data-part="teil1" role="tab"
        :class="{ active: part === 'teil1' }" :aria-selected="part === 'teil1'"
        @click="part = 'teil1'"
      >Teil 1 · Forumsbeitrag</button>
      <button
        type="button" class="spr-part-btn" data-part="teil2" role="tab"
        :class="{ active: part === 'teil2' }" :aria-selected="part === 'teil2'"
        @click="part = 'teil2'"
      >Teil 2 · Nachricht</button>
    </div>

    <template v-if="part === 'teil1'">
      <div class="spr-part-toggle schr-subtab" role="tablist">
        <button
          type="button" class="spr-part-btn" data-tab="schreibmittel" role="tab"
          :class="{ active: tab === 'schreibmittel' }" :aria-selected="tab === 'schreibmittel'"
          @click="tab = 'schreibmittel'"
        >Schreibmittel</button>
        <button
          type="button" class="spr-part-btn" data-tab="strategie" role="tab"
          :class="{ active: tab === 'strategie' }" :aria-selected="tab === 'strategie'"
          @click="tab = 'strategie'"
        >Strategie</button>
      </div>

      <template v-if="tab === 'schreibmittel'">
        <section v-for="(m, i) in SCHREIB_MOVES" :key="m" :id="`schr-move-${m}`" class="plate">
          <div class="plate-h">
            <span class="plate-n">{{ moveNumerals[i] }}</span>
            <h2 class="plate-t">{{ SCHREIB_MOVE_LABEL[m].de }}</h2>
            <span class="plate-de">{{ SCHREIB_MOVE_LABEL[m].en }}</span>
          </div>
          <div class="plate-b">
            <table class="mini-table">
              <thead>
                <tr><th>Schreibmittel</th><th>Bedeutung</th><th>Benutzt</th></tr>
              </thead>
              <tbody>
                <tr v-for="r in schreibmittelForMove(m)" :key="r.id">
                  <td class="t-de">{{ r.phraseDe }}</td>
                  <td class="t-it">{{ r.noteEn }}</td>
                  <td>
                    <span class="spr-usedot" :class="{ on: everUsed(r.id) }">{{ everUsed(r.id) ? '●' : '○' }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <template v-else>
        <p class="schr-muster-pointer">
          Die fünf Aufgabenmuster mit kommentierten Mustertexten →
          <router-link :to="{ name: 'schreiben-muster' }">Mustertexte</router-link>
        </p>

        <section v-for="(s, i) in SCHREIBEN_TEIL1_TIPPS" :key="s.id" :id="`schr-tipp-${s.id}`" class="plate">
          <div class="plate-h">
            <span class="plate-n">{{ tippNumerals[i] }}</span>
            <h2 class="plate-t">{{ s.titleDe }}</h2>
          </div>
          <div class="plate-b">
            <ul class="schr-tipplist">
              <li v-for="(item, idx) in s.items" :key="idx">
                {{ item.de }}
                <span v-if="item.en" class="schr-tipp-en">{{ item.en }}</span>
              </li>
            </ul>
          </div>
        </section>
      </template>
    </template>

    <template v-else>
      <div class="spr-part-toggle schr-subtab" role="tablist">
        <button
          type="button" class="spr-part-btn" data-tab="nachrichtenmittel" role="tab"
          :class="{ active: teil2Tab === 'nachrichtenmittel' }" :aria-selected="teil2Tab === 'nachrichtenmittel'"
          @click="teil2Tab = 'nachrichtenmittel'"
        >Nachrichtenmittel</button>
        <button
          type="button" class="spr-part-btn" data-tab="strategie" role="tab"
          :class="{ active: teil2Tab === 'strategie' }" :aria-selected="teil2Tab === 'strategie'"
          @click="teil2Tab = 'strategie'"
        >Strategie</button>
      </div>

      <template v-if="teil2Tab === 'nachrichtenmittel'">
        <section id="schr-rahmen" class="plate">
          <div class="plate-h">
            <span class="plate-n">I</span>
            <h2 class="plate-t">Rahmen der Nachricht</h2>
            <span class="plate-de">Anrede &amp; Grußformel</span>
          </div>
          <div class="plate-b">
            <!-- Two nowrap .t-de cells plus a note column can outrun the
                 phone-width .plate (overflow: hidden) — scroll this table
                 horizontally instead of letting a column go unreachable. -->
            <div class="rahmen-scroll">
              <table class="mini-table">
                <thead>
                  <tr><th>Anrede</th><th>Grußformel</th><th>Bedeutung</th></tr>
                </thead>
                <tbody>
                  <tr v-for="rp in RAHMEN_PAARE" :key="rp.id">
                    <td class="t-de">{{ rp.anredeDe }}</td>
                    <td class="t-de">{{ rp.grussDe }}</td>
                    <td class="t-it">{{ rp.noteEn }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section v-for="(m, i) in NACHRICHT_MOVES" :key="m" :id="`schr-nmove-${m}`" class="plate">
          <div class="plate-h">
            <span class="plate-n">{{ nachrichtMoveNumerals[i] }}</span>
            <h2 class="plate-t">{{ NACHRICHT_MOVE_LABEL[m].de }}</h2>
            <span class="plate-de">{{ NACHRICHT_MOVE_LABEL[m].en }}</span>
          </div>
          <div class="plate-b">
            <table class="mini-table">
              <thead>
                <tr><th>Nachrichtenmittel</th><th>Bedeutung</th><th>Benutzt</th></tr>
              </thead>
              <tbody>
                <tr v-for="r in nachrichtenmittelForMove(m)" :key="r.id">
                  <td class="t-de">{{ r.phraseDe }}</td>
                  <td class="t-it">{{ r.noteEn }}</td>
                  <td>
                    <span class="spr-usedot" :class="{ on: everUsedNm(r.id) }">{{ everUsedNm(r.id) ? '●' : '○' }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <template v-else>
        <p class="schr-muster-pointer">
          Die fünf Musternachrichten mit kommentierten Beispielen →
          <router-link :to="{ name: 'schreiben-muster-teil2' }">Musternachrichten</router-link>
        </p>

        <section v-for="(s, i) in SCHREIBEN_TEIL2_TIPPS" :key="s.id" :id="`schr-tipp2-${s.id}`" class="plate">
          <div class="plate-h">
            <span class="plate-n">{{ tippNumerals[i] }}</span>
            <h2 class="plate-t">{{ s.titleDe }}</h2>
          </div>
          <div class="plate-b">
            <ul class="schr-tipplist">
              <li v-for="(item, idx) in s.items" :key="idx">
                {{ item.de }}
                <span v-if="item.en" class="schr-tipp-en">{{ item.en }}</span>
              </li>
            </ul>
          </div>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
.page { max-width: 980px; }
.cheatsheet-section-header { margin-bottom: 48px; }
.back-link { text-decoration: none; border-bottom: 0; }

.spr-usedot { color: var(--mute); }
.spr-usedot.on { color: var(--accent); }

/* Cross-reference to the Mustertexte/Musternachrichten library, above each
   part's Strategie tab plates — quiet inline link, no dedicated "note" class
   exists in this file to reuse (SprechenCheatsheet.vue's .spr-note is scoped
   there, not shared). Shared by both parts' Strategie tabs. */
.schr-muster-pointer { font-size: 13.5px; font-style: italic; color: var(--mute); margin: 0 0 28px; }

/* Same small pill-shaped segmented control as SprechenCheatsheet.vue's Teil
   1 / Teil 2 toggle — scoped here for the same reason: no shared "segmented
   control" class exists anywhere in the app yet. Reused a second time, nested
   as .schr-subtab, for the content-kind tabs inside each part. */
.spr-part-toggle { display: inline-flex; margin-bottom: 40px; border: 1px solid var(--rule); border-radius: 999px; overflow: hidden; }
.spr-part-btn {
  font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.06em;
  padding: 9px 20px; background: var(--paper-card); color: var(--ink-soft);
  border: 0; cursor: pointer;
}
.spr-part-btn + .spr-part-btn { border-left: 1px solid var(--rule); }
.spr-part-btn.active { background: var(--accent-wash); color: var(--accent); font-weight: 600; }

/* The content-kind toggle nested under the Teil 1/Teil 2 part toggle — sized
   down one notch so the "which Teil" vs. "which tab within it" hierarchy
   stays legible at 390px instead of two identical-looking pill rows. */
.schr-subtab { margin-bottom: 32px; }
.schr-subtab .spr-part-btn { padding: 7px 16px; font-size: 11px; }

/* The Strategie tab's tip lists — SCHREIBEN_TEIL1_TIPPS items are plain
   { de, en? } pairs, so each list item optionally trails an italic English
   gloss inline rather than as its own block (unlike SprechenCheatsheet.vue's
   .spr-note, which annotates a whole plate, not a single list item). */
.schr-tipplist { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 10px; font-size: 15px; line-height: 1.6; }
.schr-tipp-en { font-style: italic; font-size: 13px; color: var(--mute); margin-left: 8px; }

/* The Rahmen table carries two nowrap .t-de columns plus a note column —
   wider than .plate's phone-width box, which clips overflow: without this,
   the note column goes unreachable instead of just scrolling into view. */
.rahmen-scroll { overflow-x: auto; }
</style>
