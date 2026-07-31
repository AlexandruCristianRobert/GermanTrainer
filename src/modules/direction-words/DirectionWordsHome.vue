<script setup lang="ts">
import { useRouter } from 'vue-router'
import { loadHistory } from '../../composables/useQuizHistory'
import DwWeakPoints from '../../components/charts/DwWeakPoints.vue'
import { DW_FAMILIES } from '../../data/drillCatalogue'

const router = useRouter()

// One-shot read from history for the weak-points panel above the groups —
// this page isn't long-lived, so no reactivity is needed (dac home pattern).
const historyEntries = loadHistory()

// Drill cards arrive family by family — see src/data/drillCatalogue.ts.
const groups = DW_FAMILIES

function go(target: string) {
  router.push({ name: target })
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Modul · hin &amp; her</div>
        <h1 class="section-title">Direction Words<em>.</em></h1>
        <p class="section-subtitle">
          hinein or herein? It depends on where you stand. Study the cheatsheet first;
          the drills arrive family by family.
        </p>
      </div>
    </header>

    <DwWeakPoints :entries="historyEntries" />

    <template v-for="g in groups" :key="g.heading">
      <h2 class="group-heading">{{ g.heading }} · <span class="group-de">{{ g.de }}</span></h2>
      <div class="module-grid">
        <article
          v-for="c in g.cards"
          :key="c.code"
          class="card module-card interactive"
          role="button"
          tabindex="0"
          @click="go(c.route)"
          @keydown.enter.prevent="go(c.route)"
          @keydown.space.prevent="go(c.route)"
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
