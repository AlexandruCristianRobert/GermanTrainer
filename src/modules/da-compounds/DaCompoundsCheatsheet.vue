<script setup lang="ts">
import {
  DA_COMPOUND_PREPOSITIONS, NO_COMPOUND_PREPOSITIONS, THING_VS_PERSON, KORRELAT,
  daCompound, isVowelInitial,
} from '../../data/daCompounds'
</script>

<template>
  <div class="page">
    <header class="section-header cheatsheet-section-header">
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

    <section id="dac-formation" class="plate">
      <div class="plate-h">
        <span class="plate-n">I</span>
        <h2 class="plate-t">da(r) + preposition, wo(r) for questions</h2>
        <span class="plate-de">Bildung</span>
      </div>
      <div class="plate-b">
        <p>
          <strong>da + Präposition</strong> — and a linking <strong>-r-</strong> when the
          preposition starts with a vowel: da<em>r</em>auf, da<em>r</em>über. Questions
          about things use the same rule with <strong>wo(r)-</strong>.
        </p>
        <table class="mini-table">
          <thead>
            <tr><th>Präposition</th><th>da-</th><th>wo-</th><th>Sense</th></tr>
          </thead>
          <tbody>
            <tr v-for="e in DA_COMPOUND_PREPOSITIONS" :key="e.preposition">
              <td class="t-mono">{{ e.preposition }}</td>
              <td class="t-de">
                <template v-if="isVowelInitial(e.preposition)">da<span style="color: var(--accent)">r</span>{{ e.preposition }}</template>
                <template v-else>da{{ e.preposition }}</template>
              </td>
              <td class="t-de" style="color: var(--mute)">
                <template v-if="isVowelInitial(e.preposition)">wo<span style="color: var(--accent)">r</span>{{ e.preposition }}</template>
                <template v-else>wo{{ e.preposition }}</template>
              </td>
              <td class="t-it">{{ e.gloss }}</td>
            </tr>
          </tbody>
        </table>
        <p>
          Spelling traps: <em>*daauf</em>, <em>*darmit</em>, <em>*woauf</em> —
          the <strong>-r-</strong> exists only before a vowel, and never before a consonant.
        </p>
      </div>
    </section>

    <section id="dac-none" class="plate">
      <div class="plate-h">
        <span class="plate-n">II</span>
        <h2 class="plate-t">Prepositions that form no compound</h2>
        <span class="plate-de">Keine Bildung</span>
      </div>
      <div class="plate-b">
        <p>These prepositions form <strong>no</strong> da- or wo-compound.</p>
        <div class="dac-nolist">
          <span v-for="p in NO_COMPOUND_PREPOSITIONS" :key="p">{{ p }}</span>
        </div>
        <table class="mini-table">
          <tbody>
            <tr v-for="p in NO_COMPOUND_PREPOSITIONS" :key="p">
              <td class="t-mono">{{ p }}</td>
              <td class="t-it">*{{ daCompound(p) }} does not exist</td>
            </tr>
          </tbody>
        </table>
        <p>
          <strong>ohne</strong> and the genitive prepositions (<em>während, wegen, trotz, statt</em>)
          repeat the noun or use a pronoun instead: <em>ohne das Auto → ohne es</em>.
        </p>
      </div>
    </section>

    <section id="dac-person" class="plate">
      <div class="plate-h">
        <span class="plate-n">III</span>
        <h2 class="plate-t">Things take da-, people take pronouns</h2>
        <span class="plate-de">Sache oder Person?</span>
      </div>
      <div class="plate-b">
        <p>
          Da-compounds stand for <strong>things, abstracts, and whole clauses</strong> — never for
          people. A person keeps <strong>Präposition + Pronomen</strong>, and questions split the
          same way: <em>Worauf?</em> for things, <em>Auf wen?</em> for people.
        </p>
        <table class="mini-table">
          <thead>
            <tr><th>Kollokation</th><th>Sache → da-Form</th><th>Person → Pronomen</th></tr>
          </thead>
          <tbody>
            <tr v-for="pair in THING_VS_PERSON" :key="pair.base">
              <td class="t-de">{{ pair.base }}</td>
              <td class="t-ex">{{ pair.thingQ }}<br /><b style="color: var(--accent)">{{ pair.thingA }}</b></td>
              <td class="t-ex">{{ pair.personQ }}<br /><b style="color: var(--clay)">{{ pair.personA }}</b></td>
            </tr>
          </tbody>
        </table>
        <p>
          A da-compound can also point at a whole previous sentence:
          <em>Sie hat die Prüfung bestanden. <strong>Damit</strong> hat niemand gerechnet.</em>
        </p>
      </div>
    </section>

    <section id="dac-korrelat" class="plate">
      <div class="plate-h">
        <span class="plate-n">IV</span>
        <h2 class="plate-t">Pointing at a dass-clause</h2>
        <span class="plate-de">Korrelat</span>
      </div>
      <div class="plate-b">
        <p>
          The da-compound can announce a following <em>dass</em>-/<em>ob</em>-clause or
          <em>zu</em>-infinitive: <em>Ich freue mich <strong>darauf</strong>, dich zu sehen.</em>
          Whether it must, may, or must not appear depends on the verb.
        </p>
        <div class="k-cols">
          <div class="k-col">
            <div class="k-h must"><span>●</span> obligatorisch</div>
            <div class="k-e" v-for="e in KORRELAT.obligatory" :key="e.expression">
              <div class="k-x">{{ e.expression }}</div>
              <div class="k-ex">{{ e.example }}</div>
            </div>
          </div>
          <div class="k-col">
            <div class="k-h may"><span>◐</span> fakultativ</div>
            <div class="k-e" v-for="e in KORRELAT.optional" :key="e.expression">
              <div class="k-x">{{ e.expression }}</div>
              <div class="k-ex">{{ e.example }}</div>
            </div>
          </div>
          <div class="k-col">
            <div class="k-h never"><span>○</span> ausgeschlossen</div>
            <div class="k-e" v-for="e in KORRELAT.excluded" :key="e.expression">
              <div class="k-x">{{ e.expression }}</div>
              <div class="k-ex">{{ e.example }}</div>
            </div>
          </div>
        </div>
        <p>
          Overusing the Korrelat is a real error: <em>*Ich weiß darüber, dass …</em> —
          <strong>wissen</strong>, <strong>glauben</strong>, <strong>sagen</strong> take a plain
          <em>dass</em>-clause.
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page { max-width: 980px; }
.cheatsheet-section-header { margin-bottom: 48px; }
.back-link { text-decoration: none; border-bottom: 0; }
</style>
