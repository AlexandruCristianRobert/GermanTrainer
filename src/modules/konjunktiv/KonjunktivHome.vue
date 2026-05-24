<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { loadHistory } from '../../composables/useQuizHistory'

const router = useRouter()

const recent = computed(() =>
  loadHistory()
    .filter(h => h.type === 'konjunktiv-rewrite')
    .slice(0, 5)
)

function formatPct(correct: number, count: number) {
  if (count === 0) return '—'
  return `${Math.round((correct / count) * 100)}%`
}

function startSession() { router.push({ name: 'konjunktiv-quiz' }) }
function back() { router.push({ name: 'home' }) }
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel · Konjunktiv I</div>
        <h1 class="section-title">Indirect speech<em>.</em></h1>
        <p class="section-subtitle">
          Rewrite direct-speech quotes as reported speech using Konjunktiv I — with
          the K-II fallback when the K-I form coincides with the indicative.
          The dominant register marker in news, academic writing, and the Goethe
          and telc productive tasks.
        </p>
      </div>
    </header>

    <div class="card module-card konjunktiv-cta interactive"
      role="button" tabindex="0"
      @click="startSession" @keydown.enter="startSession">
      <div class="module-numeral">→</div>
      <h2>Start a session</h2>
      <div class="module-de">Sitzung beginnen</div>
      <p class="module-desc">
        Pick a difficulty (B1 · B2 · C1), topic mix, and number of quotes.
        Each quote is judged by Gemini against the canonical Konjunktiv I rewrite.
      </p>
      <div class="module-cta">Open <span aria-hidden="true">→</span></div>
    </div>

    <section v-if="recent.length > 0" class="recent-runs">
      <h3 class="recent-runs-title">Recent runs</h3>
      <ul class="recent-runs-list">
        <li v-for="r in recent" :key="r.id">
          <span class="rr-date">{{ new Date(r.startedAt).toLocaleDateString() }}</span>
          <span class="rr-score">{{ r.correct }} / {{ r.count }} · {{ formatPct(r.correct, r.count) }}</span>
          <span class="rr-meta">{{ r.meta.kiDifficulty ?? '—' }}</span>
        </li>
      </ul>
    </section>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
    </div>
  </div>
</template>

<style scoped>
.konjunktiv-cta { max-width: 720px; margin: 12px 0 32px; }
.recent-runs { margin-top: 32px; max-width: 720px; }
.recent-runs-title {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 12px;
}
.recent-runs-list { list-style: none; padding: 0; margin: 0; }
.recent-runs-list li {
  display: flex;
  gap: 16px;
  align-items: baseline;
  padding: 8px 0;
  border-bottom: 1px solid var(--hairline);
  font-size: 14px;
}
.rr-date { color: var(--mute); flex: 0 0 110px; font-variant-numeric: tabular-nums; }
.rr-score { font-family: var(--font-display); }
.rr-meta { color: var(--mute); margin-left: auto; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; }
.setup-actions { display: flex; justify-content: flex-start; margin-top: 40px; }
</style>
