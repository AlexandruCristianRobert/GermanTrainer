<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { TableQuestion } from '../../composables/useDeclensionQuiz'
import type { DeclCase } from '../../data/declension'
import { usePagination } from '../../composables/usePagination'
import Pagination from '../../components/Pagination.vue'

const CASE_SHORT: Record<DeclCase, string> = {
  nominative: 'NOM.',
  accusative: 'AKK.',
  dative: 'DAT.',
  genitive: 'GEN.'
}

interface Stashed {
  questions: TableQuestion[]
  totalRows: number
  correctRows: number
  totalEntries: number
}

const router = useRouter()
const data = ref<Stashed | null>(null)

onMounted(() => {
  try {
    const raw = sessionStorage.getItem('gt:lastDeclTable')
    if (raw) data.value = JSON.parse(raw) as Stashed
  } catch { /* ignore */ }
})

const pct = computed(() => {
  const d = data.value
  if (!d || d.totalRows === 0) return 0
  return Math.round((d.correctRows / d.totalRows) * 100)
})

const summary = computed(() => {
  if (pct.value >= 80) return 'Stark. The four-case grid is clicking.'
  if (pct.value >= 50) return 'Solid. The genitive and dative still want another pass.'
  return 'Keep practising — drill the tables in /declension/tables and try again.'
})

const pagination = usePagination(() => data.value?.questions ?? [], 25)

function restart() { router.push({ name: 'declension-table' }) }
function home() { router.push({ name: 'declension' }) }
</script>

<template>
  <div v-if="!data" class="page">
    <div class="alert alert-info">
      <span class="alert-label">No result</span>
      Nothing to show — finish a decline-the-phrase quiz to land here with your score.
    </div>
    <button class="btn btn-accent" type="button" @click="restart">Start a new quiz <span aria-hidden="true">→</span></button>
  </div>

  <div v-else class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Vier Fälle</div>
        <div class="result-score">
          {{ data.correctRows }}<span class="denom"> / {{ data.totalRows }}</span>
        </div>
        <p class="section-subtitle">{{ summary }}</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" @click="home">← Declension</button>
        <button class="btn btn-accent" type="button" @click="restart">
          Start another <span aria-hidden="true">→</span>
        </button>
      </div>
    </header>

    <Pagination :pagination="pagination" label="rows" :hide-page-size-below="25" />

    <div class="decl-result-list">
      <div
        v-for="(q, i) in pagination.slice.value"
        :key="i"
        class="decl-result-card"
        :class="q.correctCount === q.totalCount ? 'is-correct' : 'is-wrong'"
      >
        <div class="decl-result-num"># {{ String(pagination.start.value + i + 1).padStart(2, '0') }}</div>
        <div class="decl-result-prompt">
          <div class="drp-german">{{ q.entry.forms.nominative }}</div>
          <div class="drp-meta">{{ q.entry.gender }} · {{ q.entry.determiner }}</div>
        </div>

        <div class="decl-result-rows">
          <div
            v-for="(row, ri) in q.rows"
            :key="ri"
            class="decl-result-line"
          >
            <span class="drl-label">{{ CASE_SHORT[row.case] }}</span>
            <span class="drl-value">
              <span
                v-if="row.userAnswer"
                class="vr-stamp"
                :class="row.isCorrect ? 'vr-stamp-right' : 'vr-stamp-wrong'"
              >{{ row.userAnswer }}</span>
              <span v-else class="vr-stamp vr-stamp-empty">—</span>
              <span v-if="!row.isCorrect" class="drl-expected">
                <span class="vr-stamp vr-stamp-right">{{ row.expected }}</span>
              </span>
            </span>
          </div>
        </div>

        <div class="decl-result-score">
          <span class="tag" :class="q.correctCount === q.totalCount ? 'tag-success' : 'tag-danger'">
            {{ q.correctCount }} / {{ q.totalCount }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.decl-result-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 24px;
}

.decl-result-card {
  display: grid;
  grid-template-columns: 60px 220px 1fr auto;
  gap: 18px;
  align-items: start;
  padding: 18px 20px;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper-card);
}
.decl-result-card.is-wrong { border-left: 3px solid var(--danger); }
.decl-result-card.is-correct { border-left: 3px solid var(--success); }

.decl-result-num {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--mute);
  padding-top: 4px;
}

.drp-german {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 22px;
  line-height: 1.2;
}
.drp-meta {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--mute);
  margin-top: 4px;
}

.decl-result-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.decl-result-line {
  display: grid;
  grid-template-columns: 60px 1fr;
  align-items: baseline;
  gap: 12px;
}
.drl-label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--ink-soft);
}
.drl-value {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
}
.drl-expected { display: inline-flex; align-items: baseline; }

.decl-result-score { padding-top: 4px; }
.tag-success { background: var(--success-tint); color: var(--success); }
.tag-danger { background: var(--danger-tint); color: var(--danger); }

@media (max-width: 720px) {
  .decl-result-card {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .decl-result-num { padding-top: 0; }
  .decl-result-score { justify-self: start; }
}
</style>
