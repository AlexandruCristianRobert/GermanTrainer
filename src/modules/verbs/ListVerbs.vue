<script setup lang="ts">
import { computed, ref } from 'vue'
import { useVerbs } from '../../composables/useVerbs'
import { VERB_LEVELS, VERB_TYPES, VERB_CASES, type Verb, type VerbLevel, type VerbType, type VerbCase } from '../../data/verbs'

const { all } = useVerbs()

const search = ref('')
const selectedLevels = ref<VerbLevel[]>([...VERB_LEVELS])
const selectedTypes = ref<VerbType[]>([...VERB_TYPES])
const selectedCases = ref<VerbCase[]>([...VERB_CASES])

function caseTagClass(c: VerbCase): string {
  if (c === 'dative' || c === 'dative+accusative') return 'tag-clay'
  if (c === 'accusative') return 'tag-cobalt'
  if (c === 'reflexive') return 'tag-accent'
  if (c === 'genitive') return 'tag-ochre'
  return ''
}
function typeTagClass(t: string): string {
  if (t === 'irregular') return 'tag-clay'
  if (t === 'separable') return 'tag-cobalt'
  if (t === 'modal') return 'tag-ochre'
  if (t === 'mixed') return 'tag-accent'
  return ''
}

function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v)
  if (i >= 0) return set.filter((_, j) => j !== i)
  return [...set, v]
}

const filtered = computed<Verb[]>(() => {
  const q = search.value.trim().toLowerCase()
  const ls = new Set(selectedLevels.value)
  const ts = new Set(selectedTypes.value)
  const cs = new Set(selectedCases.value)
  return all().filter(v => {
    if (!ls.has(v.level)) return false
    if (!ts.has(v.type)) return false
    if (!cs.has(v.case)) return false
    if (!q) return true
    return v.german.toLowerCase().includes(q) || v.english.toLowerCase().includes(q)
  })
})
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel III · Liste</div>
        <h1 class="section-title">Browse<em>.</em></h1>
        <p class="section-subtitle">
          Every verb in the deck, with its level, irregularity, the case it governs, and which auxiliary it takes.
        </p>
      </div>
      <div class="browse-meta">
        <div class="micro-mark">Total</div>
        <div class="meta-value">{{ all().length }} verbs</div>
      </div>
    </header>

    <div class="filters">
      <div class="filter-block">
        <div class="field-label">Level · {{ selectedLevels.length }} of {{ VERB_LEVELS.length }}</div>
        <div class="chip-row">
          <button
            v-for="l in VERB_LEVELS"
            :key="l"
            class="chip"
            :class="{ selected: selectedLevels.includes(l) }"
            @click="selectedLevels = toggle(selectedLevels, l)"
          >{{ l }}</button>
        </div>
      </div>
      <div class="filter-block">
        <div class="field-label">Type · {{ selectedTypes.length }} of {{ VERB_TYPES.length }}</div>
        <div class="chip-row">
          <button
            v-for="t in VERB_TYPES"
            :key="t"
            class="chip"
            :class="{ selected: selectedTypes.includes(t) }"
            @click="selectedTypes = toggle(selectedTypes, t)"
          >{{ t }}</button>
        </div>
      </div>
      <div class="filter-block">
        <div class="field-label">Object case · {{ selectedCases.length }} of {{ VERB_CASES.length }}</div>
        <div class="chip-row">
          <button
            v-for="c in VERB_CASES"
            :key="c"
            class="chip"
            :class="{ selected: selectedCases.includes(c) }"
            @click="selectedCases = toggle(selectedCases, c)"
          >{{ c }}</button>
        </div>
      </div>
    </div>

    <div class="toolbar">
      <input
        class="input search-input"
        type="search"
        placeholder="Search German or English…"
        v-model="search"
      />
      <span class="micro-mark">{{ filtered.length }} of {{ all().length }} verbs</span>
    </div>

    <table class="data-table desktop-only">
      <thead>
        <tr>
          <th style="width: 22%">German</th>
          <th style="width: 28%">English</th>
          <th style="width: 8%">Level</th>
          <th style="width: 14%">Type</th>
          <th style="width: 18%">Case</th>
          <th style="width: 10%">Aux</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="v in filtered" :key="v.german">
          <td class="german-cell">{{ v.german }}</td>
          <td class="english-cell">{{ v.english }}</td>
          <td><span class="tag">{{ v.level }}</span></td>
          <td><span class="tag" :class="typeTagClass(v.type)">{{ v.type }}</span></td>
          <td><span class="tag" :class="caseTagClass(v.case)">{{ v.case }}</span></td>
          <td><span class="tag">{{ v.auxiliary }}</span></td>
        </tr>
        <tr v-if="filtered.length === 0">
          <td colspan="6" class="empty-row">No verbs match these filters.</td>
        </tr>
      </tbody>
    </table>

    <div class="mobile-list mobile-only">
      <div v-for="v in filtered" :key="v.german" class="browse-card">
        <div class="german-cell">{{ v.german }}</div>
        <div class="english-cell">{{ v.english }}</div>
        <div class="browse-card-tags">
          <span class="tag">{{ v.level }}</span>
          <span class="tag" :class="typeTagClass(v.type)">{{ v.type }}</span>
          <span class="tag" :class="caseTagClass(v.case)">{{ v.case }}</span>
          <span class="tag">aux {{ v.auxiliary }}</span>
        </div>
      </div>
      <div v-if="filtered.length === 0" class="empty-row">No verbs match these filters.</div>
    </div>
  </div>
</template>

<style scoped>
.browse-meta { text-align: right; }
.meta-value {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 22px;
  letter-spacing: -0.01em;
  color: var(--ink);
}

.filters {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-bottom: 32px;
}
.filter-block { display: flex; flex-direction: column; gap: 8px; }

.german-cell {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 19px;
  color: var(--ink);
}
.english-cell { color: var(--ink-soft); }

.empty-row {
  text-align: center;
  padding: 40px;
  color: var(--mute);
  font-style: italic;
}

.mobile-only { display: none; }
.desktop-only { display: table; width: 100%; }

@media (max-width: 720px) {
  .mobile-only { display: block; }
  .desktop-only { display: none; }
  .browse-meta { text-align: left; }
}

.mobile-list { display: flex; flex-direction: column; gap: 0; }
.browse-card {
  padding: 14px 0;
  border-bottom: 1px dotted var(--hairline);
}
.browse-card-tags {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}
</style>
