<script setup lang="ts">
import { ref } from 'vue'
import { MOVES, MOVE_LABEL, phrasesForMove } from '../../data/sprechenRedemittel'
import { lifetimeCounts } from '../../composables/useRedemittelYield'
import {
  VORTRAG_MOVES, VORTRAG_MOVE_LABEL, vortragsmittelForMove, SPRECHEN_VORTRAGSMITTEL,
  GLIEDERUNGSPUNKTE, vortragClock
} from '../../data/sprechenVortragsmittel'
import { SPRECHEN_B2_TEIL1 } from '../../data/rubrics'

// Roman numerals continue after plate I (Strategie) — one per Move group.
const moveNumerals = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']

// Teil 1 has three chapters ahead of its Move plates (Strategie, Bauplan,
// Rubrik), so its Move numerals pick up at IV instead of II.
const vortragMoveNumerals = ['IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

type CheatsheetPart = 'teil1' | 'teil2'
// Teil 2 is the default so a returning learner sees no change (Global
// Constraints, and CONTEXT.md → "Vortrag": Teil 1 is the newer part).
const part = ref<CheatsheetPart>('teil2')

// The four-step shape of a good discussion turn. The result screen's
// "Argumentation & Interaktion" matrix (Teil2Result.vue) does NOT reuse these
// four names for its columns — its fourth column is "Reaktion" (grader field
// `reacts`: did this turn engage the partner's last point?), and a Rückfrage
// is counted separately again as `interaction.askedBack`. The note below the
// table spells out that relationship so the two screens still read as one story.
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

// Bank-filtered, so Teil 2's tallies can never bleed into Teil 1's dots.
const vortragLifetime = lifetimeCounts(SPRECHEN_VORTRAGSMITTEL)
function everUsedVortrag(id: string): boolean {
  return (vortragLifetime[id] ?? 0) > 0
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

    <div class="spr-part-toggle" role="tablist">
      <button
        type="button" class="spr-part-btn" data-part="teil1" role="tab"
        :class="{ active: part === 'teil1' }" :aria-selected="part === 'teil1'"
        @click="part = 'teil1'"
      >Teil 1 · Vortrag</button>
      <button
        type="button" class="spr-part-btn" data-part="teil2" role="tab"
        :class="{ active: part === 'teil2' }" :aria-selected="part === 'teil2'"
        @click="part = 'teil2'"
      >Teil 2 · Diskussion</button>
    </div>

    <template v-if="part === 'teil2'">
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
          <p class="spr-note">
            In der Auswertung erscheint der vierte Punkt als <em>Reaktion</em> — also
            ob du auf den letzten Punkt des Partners eingehst. Eine Rückfrage ist der
            direkteste Weg dahin und wird zusätzlich einzeln gezählt.
          </p>
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
    </template>

    <template v-else>
      <section id="spr-strategie-teil1" class="plate">
        <div class="plate-h">
          <span class="plate-n">I</span>
          <h2 class="plate-t">Wie Teil 1 funktioniert</h2>
          <span class="plate-de">Strategie</span>
        </div>
        <div class="plate-b">
          <p>
            Du wählst eines von zwei Aufgabenblättern — nimm das Thema, zu dem dir
            wirklich zu allen fünf Punkten etwas einfällt, nicht das inhaltlich
            reizvollere. Notiere in der Vorbereitungszeit zu jedem Gliederungspunkt
            genau <em>ein</em> Stichwort statt ganzer Sätze, sonst liest du am Ende
            ab, statt zu sprechen. Kündige deinen Aufbau am Anfang an und halte dich
            dann auch daran, damit der Vortrag als Ganzes erkennbar bleibt. Und wenn
            dir mitten im Satz die Worte fehlen: Überbrücke die Lücke auf Deutsch
            statt zu schweigen — mit einer Rettungsleine wie „Da muss ich kurz
            überlegen …“.
          </p>
          <p class="spr-note">
            Die Nachfrage am Ende zählt zur ersten Bewertungskategorie — sie muss
            inhaltlich beantwortet werden, nicht nur höflich quittiert.
          </p>
        </div>
      </section>

      <section id="spr-bauplan-teil1" class="plate">
        <div class="plate-h">
          <span class="plate-n">II</span>
          <h2 class="plate-t">Gliederung</h2>
          <span class="plate-de">Bauplan</span>
        </div>
        <div class="plate-b">
          <div class="vortrag-bauplan">
            <template v-for="(p, i) in GLIEDERUNGSPUNKTE" :key="p.key">
              <div class="bauplan-step">
                <span class="bauplan-n">{{ p.n }}</span>
                <span class="bauplan-label">{{ p.labelDe }}</span>
                <span class="bauplan-hint">{{ p.hintDe }}</span>
                <span class="bauplan-meta">{{ p.words }} Wörter · {{ vortragClock(p.words) }}</span>
              </div>
              <span v-if="i < GLIEDERUNGSPUNKTE.length - 1" class="bauplan-arrow" aria-hidden="true">→</span>
            </template>
          </div>
        </div>
      </section>

      <section id="spr-rubrik-teil1" class="plate">
        <div class="plate-h">
          <span class="plate-n">III</span>
          <h2 class="plate-t">Bewertung</h2>
          <span class="plate-de">Rubrik</span>
        </div>
        <div class="plate-b">
          <table class="mini-table">
            <thead>
              <tr><th>Kriterium</th><th>Punkte</th></tr>
            </thead>
            <tbody>
              <tr v-for="c in SPRECHEN_B2_TEIL1.criteria" :key="c.key">
                <td class="t-de">{{ c.labelDe }}</td>
                <td class="t-ex">{{ c.maxPoints }}</td>
              </tr>
            </tbody>
          </table>
          <p class="spr-note">
            {{ SPRECHEN_B2_TEIL1.criteria.length }} Kriterien, zusammen
            {{ SPRECHEN_B2_TEIL1.totalMax }} Punkte · Bestehensgrenze
            <b>{{ SPRECHEN_B2_TEIL1.passingScore }}</b>.
          </p>
        </div>
      </section>

      <section v-for="(m, i) in VORTRAG_MOVES" :key="m" :id="`spr-vmove-${m}`" class="plate">
        <div class="plate-h">
          <span class="plate-n">{{ vortragMoveNumerals[i] }}</span>
          <h2 class="plate-t">{{ VORTRAG_MOVE_LABEL[m].en }}</h2>
          <span class="plate-de">{{ VORTRAG_MOVE_LABEL[m].de }}</span>
        </div>
        <div class="plate-b">
          <table class="mini-table">
            <thead>
              <tr><th>Vortragsmittel</th><th>Bedeutung</th><th>Benutzt</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in vortragsmittelForMove(m)" :key="r.id">
                <td class="t-de">{{ r.phraseDe }}</td>
                <td class="t-it">{{ r.noteEn }}</td>
                <td>
                  <span class="spr-usedot" :class="{ on: everUsedVortrag(r.id) }">{{ everUsedVortrag(r.id) ? '●' : '○' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
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

/* Neither reference cheatsheet (DirectionWords/DaCompounds) has a dedicated
   small-note class — their .plate-b asides are plain <p> tags. This one
   annotation needs a lighter, italic treatment than a regular paragraph, so
   one scoped rule is added here rather than reusing an unrelated global
   (e.g. .reveal-note belongs to the drill-runner reveal-panel family). */
.spr-note { font-style: italic; font-size: 13.5px; line-height: 1.6; color: var(--mute); margin: 12px 0 0; }

/* Teil 1 / Teil 2 part control — a small pill-shaped segmented control, the
   same visual family as the plate headers (--rule border, --accent-wash for
   the selected state) but there is no existing shared "segmented control"
   class anywhere in the app to reuse, so it is scoped here. */
.spr-part-toggle { display: inline-flex; margin-bottom: 40px; border: 1px solid var(--rule); border-radius: 999px; overflow: hidden; }
.spr-part-btn {
  font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.06em;
  padding: 9px 20px; background: var(--paper-card); color: var(--ink-soft);
  border: 0; cursor: pointer;
}
.spr-part-btn + .spr-part-btn { border-left: 1px solid var(--rule); }
.spr-part-btn.active { background: var(--accent-wash); color: var(--accent); font-weight: 600; }

/* The Bauplan mast: five Gliederungspunkte in a row, joined by arrows, each
   carrying its own hint/word-count/clock straight from GLIEDERUNGSPUNKTE. */
.vortrag-bauplan { display: flex; flex-wrap: wrap; align-items: stretch; gap: 6px; }
.bauplan-step {
  flex: 1 1 150px; display: flex; flex-direction: column; gap: 5px;
  padding: 12px 14px; background: var(--paper-deep); border: 1px solid var(--hairline);
}
.bauplan-n { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.14em; color: var(--accent); }
.bauplan-label { font-family: var(--font-display); font-size: 16px; font-weight: 500; letter-spacing: -0.01em; }
.bauplan-hint { font-size: 13px; line-height: 1.4; color: var(--ink-soft); }
.bauplan-meta { font-family: var(--font-mono); font-size: 11px; color: var(--mute); }
.bauplan-arrow { display: flex; align-items: center; justify-content: center; color: var(--mute); font-size: 16px; padding: 0 1px; }
</style>
