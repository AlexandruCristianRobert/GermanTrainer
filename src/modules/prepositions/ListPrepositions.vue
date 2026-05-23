<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PREPOSITIONS, type PrepCase } from '../../data/prepositions'

const router = useRouter()
const search = ref('')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return PREPOSITIONS
  return PREPOSITIONS.filter(p =>
    p.german.toLowerCase().includes(q) ||
    p.english.toLowerCase().includes(q) ||
    p.case.toLowerCase().includes(q) ||
    p.level.toLowerCase().includes(q)
  )
})

function caseTagClass(c: PrepCase): string {
  if (c === 'accusative') return 'tag-cobalt'
  if (c === 'dative') return 'tag-clay'
  if (c === 'genitive') return 'tag-ochre'
  if (c === 'two-way') return 'tag-accent'
  return ''
}

function back() { router.push({ name: 'prepositions' }) }
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel IV · Liste</div>
        <h1 class="section-title">Browse<em>.</em></h1>
        <p class="section-subtitle">
          All 37 prepositions with their governed case and example sentences.
        </p>
      </div>
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
    </header>

    <div class="toolbar">
      <input
        class="input search-input"
        placeholder="Search prepositions, English, case…"
        v-model="search"
      />
      <span class="micro-mark">{{ filtered.length }} of {{ PREPOSITIONS.length }}</span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 14%">Preposition</th>
          <th style="width: 22%">English</th>
          <th style="width: 14%">Case</th>
          <th style="width: 8%">Level</th>
          <th style="width: 42%">First example</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in filtered" :key="p.id">
          <td>
            <span class="prep-word">{{ p.german }}</span>
          </td>
          <td class="prep-en">{{ p.english }}</td>
          <td>
            <span class="tag" :class="caseTagClass(p.case)">{{ p.case }}</span>
          </td>
          <td>
            <span class="tag">{{ p.level }}</span>
          </td>
          <td class="prep-example">
            <div class="prep-example-sentence">{{ p.examples[0]?.sentence }}</div>
            <div class="prep-example-gloss">{{ p.examples[0]?.gloss }}</div>
          </td>
        </tr>
        <tr v-if="filtered.length === 0">
          <td colspan="5" class="prep-empty">No prepositions match.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.prep-word {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 19px;
}
.prep-en {
  color: var(--ink-soft);
}
.prep-example-sentence {
  font-family: var(--font-display);
  font-size: 14px;
}
.prep-example-gloss {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 12px;
  color: var(--mute);
  margin-top: 2px;
}
.prep-empty {
  text-align: center;
  padding: 40px;
  color: var(--mute);
  font-style: italic;
}
</style>
