<script setup lang="ts">
import { useRouter } from 'vue-router'
import { DECL_CASES, CASE_LABEL_DE } from '../../data/declension'

const router = useRouter()

const DEFINITE = {
  nominative: ['der', 'die', 'das', 'die'],
  accusative: ['den', 'die', 'das', 'die'],
  dative:     ['dem', 'der', 'dem', 'den'],
  genitive:   ['des', 'der', 'des', 'der']
}

const INDEFINITE = {
  nominative: ['ein',   'eine',  'ein',   '—'],
  accusative: ['einen', 'eine',  'ein',   '—'],
  dative:     ['einem', 'einer', 'einem', '—'],
  genitive:   ['eines', 'einer', 'eines', '—']
}

const POSSESSIVE = {
  nominative: ['mein',   'meine',  'mein',   'meine'],
  accusative: ['meinen', 'meine',  'mein',   'meine'],
  dative:     ['meinem', 'meiner', 'meinem', 'meinen'],
  genitive:   ['meines', 'meiner', 'meines', 'meiner']
}

const WEAK = {
  nominative: ['-e',  '-e',  '-e',  '-en'],
  accusative: ['-en', '-e',  '-e',  '-en'],
  dative:     ['-en', '-en', '-en', '-en'],
  genitive:   ['-en', '-en', '-en', '-en']
}

const MIXED = {
  nominative: ['-er', '-e',  '-es', '-e'],
  accusative: ['-en', '-e',  '-es', '-e'],
  dative:     ['-en', '-en', '-en', '-en'],
  genitive:   ['-en', '-en', '-en', '-en']
}

const STRONG = {
  nominative: ['-er', '-e',  '-es', '-e'],
  accusative: ['-en', '-e',  '-es', '-e'],
  dative:     ['-em', '-er', '-em', '-en'],
  genitive:   ['-en', '-er', '-en', '-er']
}

const COL = ['masc.', 'fem.', 'neut.', 'plur.']

function back() { router.push({ name: 'declension' }) }
</script>

<template>
  <div class="page tables-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel V · Tabellen</div>
        <h1 class="section-title">Tables<em>.</em></h1>
        <p class="section-subtitle">The full declension reference — articles + adjective endings.</p>
      </div>
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
    </header>

    <section class="decl-table-block">
      <h2>Definite article</h2>
      <table class="decl-table">
        <thead><tr><th>Case</th><th v-for="c in COL" :key="c">{{ c }}</th></tr></thead>
        <tbody>
          <tr v-for="cs in DECL_CASES" :key="cs">
            <th>{{ CASE_LABEL_DE[cs] }}</th>
            <td v-for="(form, i) in DEFINITE[cs]" :key="i">{{ form }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="decl-table-block">
      <h2>Indefinite article</h2>
      <table class="decl-table">
        <thead><tr><th>Case</th><th v-for="c in COL" :key="c">{{ c }}</th></tr></thead>
        <tbody>
          <tr v-for="cs in DECL_CASES" :key="cs">
            <th>{{ CASE_LABEL_DE[cs] }}</th>
            <td v-for="(form, i) in INDEFINITE[cs]" :key="i">{{ form }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="decl-table-block">
      <h2>Possessive — <code>mein</code> as example (all of mein/dein/sein/ihr/unser/euer follow the same endings)</h2>
      <table class="decl-table">
        <thead><tr><th>Case</th><th v-for="c in COL" :key="c">{{ c }}</th></tr></thead>
        <tbody>
          <tr v-for="cs in DECL_CASES" :key="cs">
            <th>{{ CASE_LABEL_DE[cs] }}</th>
            <td v-for="(form, i) in POSSESSIVE[cs]" :key="i">{{ form }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="decl-table-block">
      <h2>Adjective endings — weak (after definite-style determiner)</h2>
      <table class="decl-table">
        <thead><tr><th>Case</th><th v-for="c in COL" :key="c">{{ c }}</th></tr></thead>
        <tbody>
          <tr v-for="cs in DECL_CASES" :key="cs">
            <th>{{ CASE_LABEL_DE[cs] }}</th>
            <td v-for="(form, i) in WEAK[cs]" :key="i">{{ form }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="decl-table-block">
      <h2>Adjective endings — mixed (after ein/kein/possessive)</h2>
      <table class="decl-table">
        <thead><tr><th>Case</th><th v-for="c in COL" :key="c">{{ c }}</th></tr></thead>
        <tbody>
          <tr v-for="cs in DECL_CASES" :key="cs">
            <th>{{ CASE_LABEL_DE[cs] }}</th>
            <td v-for="(form, i) in MIXED[cs]" :key="i">{{ form }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="decl-table-block">
      <h2>Adjective endings — strong (no determiner)</h2>
      <table class="decl-table">
        <thead><tr><th>Case</th><th v-for="c in COL" :key="c">{{ c }}</th></tr></thead>
        <tbody>
          <tr v-for="cs in DECL_CASES" :key="cs">
            <th>{{ CASE_LABEL_DE[cs] }}</th>
            <td v-for="(form, i) in STRONG[cs]" :key="i">{{ form }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.tables-page { max-width: 880px; }
.decl-table-block { margin: 36px 0; }
.decl-table-block h2 {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 20px;
  margin: 0 0 12px 0;
}
.decl-table-block h2 code {
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 400;
  background: var(--paper-deep);
  padding: 2px 6px;
  border-radius: 2px;
}
.decl-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-display);
  font-size: 17px;
}
.decl-table th, .decl-table td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px dotted var(--hairline);
}
.decl-table thead th {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
  border-bottom: 1px solid var(--rule);
}
.decl-table tbody th {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
  width: 110px;
}
@media (max-width: 600px) {
  .decl-table { font-size: 15px; }
  .decl-table th, .decl-table td { padding: 8px 10px; }
}
</style>
