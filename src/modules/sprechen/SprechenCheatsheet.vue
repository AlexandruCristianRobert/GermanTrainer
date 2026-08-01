<script setup lang="ts">
import { MOVES, MOVE_LABEL, phrasesForMove } from '../../data/sprechenRedemittel'
import { lifetimeCounts } from '../../composables/useRedemittelYield'

// Roman numerals continue after plate I (Strategie) — one per Move group.
const moveNumerals = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']

// The four-step shape of a good discussion turn. Names must match the
// "Argumentation & Interaktion" matrix on the result screen (Task 11) —
// see CONTEXT.md → "Move" and the matrix column headers in Teil2Result.vue.
const BAUPLAN = [
  { step: 'These', ex: 'Meiner Meinung nach ist das ein wichtiges Thema.' },
  { step: 'Begründung', ex: '…, weil es unseren Alltag direkt betrifft.' },
  { step: 'Beispiel', ex: 'Ein gutes Beispiel dafür ist …' },
  { step: 'Rückfrage', ex: 'Wie sehen Sie das?' }
] as const

// Read the lifetime rollup once — it hits localStorage, not per row/render.
const lifetime = lifetimeCounts()
function everUsed(id: string): boolean {
  return (lifetime[id] ?? 0) > 0
}
</script>

<template>
  <div class="page">
    <header class="section-header cheatsheet-section-header">
      <div>
        <div class="breadcrumb">Spickzettel · Cheatsheet</div>
        <h1 class="section-title">Sprechen<em>.</em></h1>
        <p class="section-subtitle">
          Stock phrases win discussions. Reach for the right Move, not the
          perfect sentence.
        </p>
      </div>
      <router-link :to="{ name: 'sprechen' }" class="btn btn-ghost back-link">← Sprechen</router-link>
    </header>

    <section id="spr-strategie" class="plate">
      <div class="plate-h">
        <span class="plate-n">I</span>
        <h2 class="plate-t">Wie Teil 2 funktioniert</h2>
        <span class="plate-de">Strategie</span>
      </div>
      <div class="plate-b">
        <p>
          You and a partner discuss a controversial statement for about five
          minutes. Take a position early, react to your partner's arguments
          instead of monologuing, concede good points before countering, and
          close with a short summary. Graders reward <em>interaction</em>:
          agreeing, disagreeing, weighing up, and asking back all count.
        </p>
        <table class="mini-table">
          <thead>
            <tr><th>Baustein</th><th>Beispiel</th></tr>
          </thead>
          <tbody>
            <tr v-for="b in BAUPLAN" :key="b.step">
              <td class="t-de">{{ b.step }}</td>
              <td class="t-ex">{{ b.ex }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-for="(m, i) in MOVES" :key="m" :id="`spr-move-${m}`" class="plate">
      <div class="plate-h">
        <span class="plate-n">{{ moveNumerals[i] }}</span>
        <h2 class="plate-t">{{ MOVE_LABEL[m].en }}</h2>
        <span class="plate-de">{{ MOVE_LABEL[m].de }}</span>
      </div>
      <div class="plate-b">
        <table class="mini-table">
          <thead>
            <tr><th>Redemittel</th><th>Bedeutung</th><th>Benutzt</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in phrasesForMove(m)" :key="r.id">
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
  </div>
</template>

<style scoped>
.page { max-width: 980px; }
.cheatsheet-section-header { margin-bottom: 48px; }
.back-link { text-decoration: none; border-bottom: 0; }

.spr-usedot { color: var(--mute); }
.spr-usedot.on { color: var(--accent); }
</style>
