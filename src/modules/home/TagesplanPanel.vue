<script setup lang="ts">
// Tagesplan (ADR-0026): read-only "what asks for attention today" on Home.
// Renders nothing while loading, on error, and when no row has content —
// Home stays the quiet frontispiece unless something genuinely wants work.
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { buildTagesplan, type TagesplanRow } from '../../composables/useTagesplan'
import { loadHistory } from '../../composables/useQuizHistory'

const router = useRouter()
const rows = ref<TagesplanRow[]>([])

onMounted(async () => {
  try {
    rows.value = await buildTagesplan(loadHistory())
  } catch {
    rows.value = []   // fail-soft: Home must never break on a bad read
  }
})

function open(row: TagesplanRow) {
  router.push(row.query ? { name: row.route, query: row.query } : { name: row.route })
}

function onRowKey(e: KeyboardEvent, row: TagesplanRow) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    open(row)
  }
}
</script>

<template>
  <section v-if="rows.length > 0" class="tagesplan card">
    <div class="tp-head">
      <span class="micro-mark">Tagesplan · heute</span>
      <span class="micro-mark tp-count">{{ rows.length }} {{ rows.length === 1 ? 'Eintrag' : 'Einträge' }}</span>
    </div>
    <ul class="tp-rows">
      <li
        v-for="r in rows" :key="r.id"
        class="tp-row" role="button" tabindex="0"
        @click="open(r)" @keydown="onRowKey($event, r)"
      >
        <span class="tp-badge spr-num">{{ r.count }}</span>
        <span class="tp-body">
          <span class="tp-title">{{ r.title }}</span>
          <span class="tp-detail">{{ r.detail }}</span>
        </span>
        <span class="tp-cta" aria-hidden="true">→</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.tagesplan { margin: 0 0 40px; padding: 20px 24px; }
.tp-head { display: flex; justify-content: space-between; margin-bottom: 12px; }
.tp-rows { list-style: none; margin: 0; padding: 0; }
.tp-row {
  display: flex; align-items: baseline; gap: 14px;
  padding: 10px 4px; border-top: 1px dotted var(--hairline);
  cursor: pointer; transition: background .16s;
}
.tp-row:hover, .tp-row:focus-visible { background: var(--accent-wash); }
.tp-row:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.tp-badge {
  font-family: var(--font-display); font-size: 22px; font-weight: 500;
  min-width: 34px; text-align: right; font-variant-numeric: tabular-nums;
}
.tp-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.tp-title { font-weight: 600; }
.tp-detail { color: var(--mute); font-size: 13.5px; }
.tp-cta { color: var(--accent); }
@media (max-width: 720px) {
  .tagesplan { padding: 16px; }
}
</style>
