<script setup lang="ts">
import { useRouter } from 'vue-router'
import { loadHistory } from '../../composables/useQuizHistory'
import DacWeakPoints from '../../components/charts/DacWeakPoints.vue'
import { DAC_PHASES } from '../../data/drillCatalogue'

const router = useRouter()

// One-shot read from history for the weak-points panel above the groups —
// this page isn't long-lived, so no reactivity is needed (mirrors
// PrepositionsHome's weak-point snapshot).
const historyEntries = loadHistory()

// Drill cards arrive family by family — see src/data/drillCatalogue.ts.
const groups = DAC_PHASES

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
          Twenty drills from formation to free production, plus the cheatsheet.
        </p>
      </div>
    </header>

    <DacWeakPoints :entries="historyEntries" />

    <template v-for="g in groups" :key="g.heading">
      <h2 class="group-heading">{{ g.heading }} · <span class="group-de">{{ g.de }}</span></h2>
      <div class="module-grid">
        <article
          v-for="c in g.cards"
          :key="c.code"
          class="card module-card interactive"
          role="button"
          tabindex="0"
          @click="go(c.route, c.query)"
          @keydown.enter.prevent="go(c.route, c.query)"
          @keydown.space.prevent="go(c.route, c.query)"
        >
          <div class="module-numeral">{{ c.code }}</div>
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
