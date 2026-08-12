<script setup lang="ts">
// Schreiben Teil 1 Spickzettel — two tabs (mirrors SprechenCheatsheet.vue's
// tab mechanics, but the axis differs: Sprechen's tabs split by exam Teil,
// this module has only one live Teil, so its tabs split by content kind
// instead — the phrase bank vs. the strategy tips).
import { ref } from 'vue'
import {
  SCHREIB_MOVES, SCHREIB_MOVE_LABEL, schreibmittelForMove, SCHREIBEN_SCHREIBMITTEL
} from '../../data/schreibenMittel'
import { lifetimeCounts } from '../../composables/useRedemittelYield'
import { SCHREIBEN_TEIL1_TIPPS } from '../../data/schreibenTipps'

type CheatsheetTab = 'schreibmittel' | 'strategie'
const tab = ref<CheatsheetTab>('schreibmittel')

const moveNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
const tippNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI']

// Read the lifetime rollup once — it hits localStorage, not per row/render.
// Bank-filtered, so Sprechen's Redemittel/Vortragsmittel tallies can never
// bleed into this bank's dots.
const lifetime = lifetimeCounts(SCHREIBEN_SCHREIBMITTEL)
function everUsed(id: string): boolean {
  return (lifetime[id] ?? 0) > 0
}
</script>

<template>
  <div class="page">
    <header class="section-header cheatsheet-section-header">
      <div>
        <div class="breadcrumb">Spickzettel · Cheatsheet</div>
        <h1 class="section-title">Schreiben<em>.</em></h1>
        <p class="section-subtitle">
          Ein Schreibmittel pro Beitragsfunktion reicht nicht — such dir für jeden Absatz des
          Forumsbeitrags das passende aus, statt immer dieselbe Wendung zu wiederholen.
        </p>
      </div>
      <router-link :to="{ name: 'schreiben' }" class="btn btn-ghost back-link">← Schreiben</router-link>
    </header>

    <div class="spr-part-toggle" role="tablist">
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
  </div>
</template>

<style scoped>
.page { max-width: 980px; }
.cheatsheet-section-header { margin-bottom: 48px; }
.back-link { text-decoration: none; border-bottom: 0; }

.spr-usedot { color: var(--mute); }
.spr-usedot.on { color: var(--accent); }

/* Cross-reference to the Mustertexte library, above the Strategie tab's
   plates — quiet inline link, no dedicated "note" class exists in this file
   to reuse (SprechenCheatsheet.vue's .spr-note is scoped there, not shared). */
.schr-muster-pointer { font-size: 13.5px; font-style: italic; color: var(--mute); margin: 0 0 28px; }

/* Same small pill-shaped segmented control as SprechenCheatsheet.vue's Teil
   1 / Teil 2 toggle — scoped here for the same reason: no shared "segmented
   control" class exists anywhere in the app yet. */
.spr-part-toggle { display: inline-flex; margin-bottom: 40px; border: 1px solid var(--rule); border-radius: 999px; overflow: hidden; }
.spr-part-btn {
  font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.06em;
  padding: 9px 20px; background: var(--paper-card); color: var(--ink-soft);
  border: 0; cursor: pointer;
}
.spr-part-btn + .spr-part-btn { border-left: 1px solid var(--rule); }
.spr-part-btn.active { background: var(--accent-wash); color: var(--accent); font-weight: 600; }

/* The Strategie tab's tip lists — SCHREIBEN_TEIL1_TIPPS items are plain
   { de, en? } pairs, so each list item optionally trails an italic English
   gloss inline rather than as its own block (unlike SprechenCheatsheet.vue's
   .spr-note, which annotates a whole plate, not a single list item). */
.schr-tipplist { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 10px; font-size: 15px; line-height: 1.6; }
.schr-tipp-en { font-style: italic; font-size: 13px; color: var(--mute); margin-left: 8px; }
</style>
