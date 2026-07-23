<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  filterPersonCaseItems, PERSON_CASE_PREPS, type PersonCaseMode,
} from '../../composables/useDaPersonCaseQuiz'
import {
  COLLOCATION_LEVELS, COLLOCATION_ROLES,
  type CollocationLevel, type CollocationRole,
} from '../../data/collocations'

const STORAGE_KEY = 'dacPronounCaseSetup'
const router = useRouter()

const levels = ref<CollocationLevel[]>(['B1', 'B2'])
const roles  = ref<CollocationRole[]>([...COLLOCATION_ROLES])
const preps  = ref<string[]>([...PERSON_CASE_PREPS])
const mode   = ref<PersonCaseMode>('pick')

type CountPreset = 10 | 15 | 20 | 'all'
const preset = ref<CountPreset>(10)

interface Stored {
  levels?: CollocationLevel[]
  roles?: CollocationRole[]
  preps?: string[]
  mode?: PersonCaseMode
  preset?: CountPreset
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (s.levels) levels.value = s.levels.filter(l => (COLLOCATION_LEVELS as readonly string[]).includes(l))
    if (s.roles)  roles.value  = s.roles.filter(r => (COLLOCATION_ROLES as readonly string[]).includes(r))
    if (s.preps)  preps.value  = s.preps.filter(p => PERSON_CASE_PREPS.includes(p))
    if (s.mode === 'pick' || s.mode === 'type') mode.value = s.mode
    if (s.preset !== undefined) preset.value = s.preset
  } catch { /* ignore */ }
}

function save() {
  try {
    const payload: Stored = {
      levels: levels.value, roles: roles.value, preps: preps.value,
      mode: mode.value, preset: preset.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

onMounted(load)
watch([levels, roles, preps, mode, preset], save, { deep: true })

const availableItems = computed(() =>
  filterPersonCaseItems({ levels: levels.value, roles: roles.value, preps: preps.value }).length
)

const effectiveCount = computed(() =>
  preset.value === 'all' ? availableItems.value : Math.min(preset.value, availableItems.value)
)

function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v)
  if (i >= 0) return set.filter((_, j) => j !== i)
  return [...set, v]
}

function start() {
  router.push({
    name: 'dacompounds-pronoun-case-run',
    query: {
      count: String(effectiveCount.value),
      levels: levels.value.join(','),
      roles: roles.value.join(','),
      preps: preps.value.join(','),
      mode: mode.value,
    }
  })
}
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Modul · Pronominaladverbien · Pronomen</div>
        <h1 class="section-title">Pronoun case<em>.</em></h1>
        <p class="section-subtitle">
          The object here is a PERSON, not a thing — so no da-compound applies. Use
          Präposition + Personalpronomen instead. The pronoun in brackets tells you who;
          pick or type the correctly declined case form.
        </p>
      </div>
    </header>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Level · {{ levels.length }} of {{ COLLOCATION_LEVELS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="levels = [...COLLOCATION_LEVELS]">All</button>
          <button class="btn btn-quiet" type="button" @click="levels = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="l in COLLOCATION_LEVELS" :key="l"
          class="chip" :class="{ selected: levels.includes(l) }"
          @click="levels = toggle(levels, l)"
        >{{ l }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Word type · {{ roles.length }} of {{ COLLOCATION_ROLES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="roles = [...COLLOCATION_ROLES]">All</button>
          <button class="btn btn-quiet" type="button" @click="roles = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="r in COLLOCATION_ROLES" :key="r"
          class="chip" :class="{ selected: roles.includes(r) }"
          @click="roles = toggle(roles, r)"
        >{{ r }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Preposition · {{ preps.length }} of {{ PERSON_CASE_PREPS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="preps = [...PERSON_CASE_PREPS]">All</button>
          <button class="btn btn-quiet" type="button" @click="preps = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="p in PERSON_CASE_PREPS" :key="p"
          class="chip" :class="{ selected: preps.includes(p) }"
          @click="preps = toggle(preps, p)"
        >{{ p }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Answer mode</div>
      <div class="segmented">
        <button :class="{ active: mode === 'pick' }" @click="mode = 'pick'">B1 · choose</button>
        <button :class="{ active: mode === 'type' }" @click="mode = 'type'">B2 · type it</button>
      </div>
      <p class="micro-mark grading-hint">
        {{ mode === 'pick'
          ? 'Pick the correctly declined preposition + pronoun.'
          : 'Type preposition + pronoun yourself — folded umlauts are accepted (ueber = über).' }}
      </p>
    </div>

    <div class="field">
      <div class="field-label">Number of cards</div>
      <div class="field-row count-row">
        <div class="segmented">
          <button :class="{ active: preset === 10 }" @click="preset = 10">10</button>
          <button :class="{ active: preset === 15 }" @click="preset = 15">15</button>
          <button :class="{ active: preset === 20 }" @click="preset = 20">20</button>
          <button :class="{ active: preset === 'all' }" @click="preset = 'all'">All · {{ availableItems }}</button>
        </div>
        <span class="micro-mark count-avail">{{ availableItems }} items match</span>
      </div>
    </div>

    <div v-if="availableItems === 0" class="alert alert-warning">
      <span class="alert-label">Warning</span>
      No items match the selected filters.
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="router.push({ name: 'dacompounds' })">← Back</button>
      <button
        class="btn btn-accent"
        type="button"
        :disabled="availableItems === 0"
        @click="start"
      >
        Start drill · {{ effectiveCount }} cards <span aria-hidden="true">→</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.setup-page { max-width: 720px; }

.field-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 10px;
  gap: 12px;
  flex-wrap: wrap;
}
.field-actions { display: flex; gap: 4px; }
.count-row { align-items: center; gap: 12px; }
.count-avail { margin-left: auto; }
.grading-hint { margin: 8px 0 0; }

.setup-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 40px;
  gap: 16px;
}

@media (max-width: 720px) {
  .setup-actions { flex-direction: column-reverse; align-items: stretch; }
  .setup-actions .btn { justify-content: center; }
}
</style>
