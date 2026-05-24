<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  WRITING_TASK_TYPES,
  WRITING_TASK_LABEL,
  WRITING_TASK_BLURB
} from '../../data/writingPrompts'
import { filterByTaskType, getPromptById } from '../../composables/useWritingPrompts'
import { loadHistory } from '../../composables/useQuizHistory'

const router = useRouter()

const recent = computed(() =>
  loadHistory()
    .filter(h => h.type === 'writing-grade')
    .slice(0, 5)
)

function promptTitleById(id: string | undefined): string {
  if (!id) return '—'
  const p = getPromptById(id)
  return p?.titleDe ?? id
}

function back() { router.push({ name: 'home' }) }
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel · Schreiben</div>
        <h1 class="section-title">Writing tutor<em>.</em></h1>
        <p class="section-subtitle">
          Six task types, Goethe C1 and telc C1 rubric grading on demand.
          Draft as long as you need, then ask Gemini to score against the
          official-style criteria with inline notes.
        </p>
      </div>
    </header>

    <div class="alert alert-info writing-disclaimer">
      <span class="alert-label">Hinweis</span>
      Bewertungen sind indikativ und ersetzen keinen offiziellen Prüfer.
      Übe ergänzend mit dem offiziellen Modellsatz.
    </div>

    <section class="writing-grid">
      <article
        v-for="t in WRITING_TASK_TYPES"
        :key="t"
        class="card writing-tile interactive"
        role="button" tabindex="0"
        @click="router.push({ name: 'writing-task', params: { taskType: t } })"
        @keydown.enter="router.push({ name: 'writing-task', params: { taskType: t } })"
      >
        <h2 class="writing-tile-title">{{ WRITING_TASK_LABEL[t] }}</h2>
        <p class="writing-tile-blurb">{{ WRITING_TASK_BLURB[t] }}</p>
        <div class="writing-tile-meta">{{ filterByTaskType(t).length }} prompts</div>
      </article>
    </section>

    <section v-if="recent.length > 0" class="recent-runs">
      <h3 class="recent-runs-title">Recent graded drafts</h3>
      <ul class="recent-runs-list">
        <li v-for="r in recent" :key="r.id">
          <span class="rr-date">{{ new Date(r.startedAt).toLocaleDateString() }}</span>
          <span class="rr-title">{{ promptTitleById(r.meta.promptId) }}</span>
          <span class="rr-score">{{ r.meta.totalScore }} / 100 · {{ r.meta.bandEstimate }}</span>
          <span class="rr-meta">{{ r.meta.rubric }}</span>
        </li>
      </ul>
    </section>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
    </div>
  </div>
</template>

<style scoped>
.writing-disclaimer { margin-bottom: 28px; max-width: 720px; }
.writing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  max-width: 880px;
}
.writing-tile {
  padding: 20px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.writing-tile-title {
  font-family: var(--font-display);
  font-size: 20px;
  margin: 0;
}
.writing-tile-blurb {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--ink-soft);
  margin: 0;
}
.writing-tile-meta {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--mute);
  margin-top: auto;
  padding-top: 8px;
}
.recent-runs { margin-top: 36px; max-width: 880px; }
.recent-runs-title {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 12px;
}
.recent-runs-list { list-style: none; padding: 0; margin: 0; }
.recent-runs-list li {
  display: flex; gap: 16px; align-items: baseline;
  padding: 8px 0; border-bottom: 1px solid var(--hairline); font-size: 14px;
}
.rr-date { color: var(--mute); flex: 0 0 110px; font-variant-numeric: tabular-nums; }
.rr-title { font-family: var(--font-display); flex: 1; }
.rr-score { font-family: var(--font-display); flex: 0 0 140px; text-align: right; }
.rr-meta { color: var(--mute); flex: 0 0 90px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; text-align: right; }
.setup-actions { display: flex; justify-content: flex-start; margin-top: 40px; }
</style>
