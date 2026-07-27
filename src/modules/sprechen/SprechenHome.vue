<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { loadHistory } from '../../composables/useQuizHistory'

const router = useRouter()

const recent = computed(() =>
  loadHistory()
    .filter(h => h.type === 'sprechen-teil2')
    .slice(0, 5)
)

function go(name: string) { router.push({ name }) }
function back() { router.push({ name: 'home' }) }
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel · Sprechen</div>
        <h1 class="section-title">Sprechen<em>.</em></h1>
        <p class="section-subtitle">
          Goethe B2 speaking practice, typed. Teil 2: argue a controversial
          Topic with an AI partner, then get every mistake marked and a
          rubric-graded verdict. Aussprache stays out of scope — this trains
          argumentation, Redemittel, and reaction.
        </p>
      </div>
    </header>

    <div class="module-grid sprechen-grid">
      <article class="card module-card interactive" role="button" tabindex="0"
        @click="go('sprechen-cheatsheet')" @keydown.enter="go('sprechen-cheatsheet')">
        <div class="module-numeral">I</div>
        <h2>Cheatsheet</h2>
        <div class="module-de">Spickzettel · Redemittel</div>
        <p class="module-desc">
          Discussion phrases grouped by Move — agree, disagree, weigh up, ask
          back, give an example, conclude — plus how Teil 2 works.
        </p>
        <div class="module-cta">Open <span aria-hidden="true">→</span></div>
      </article>

      <article class="card module-card interactive" role="button" tabindex="0"
        @click="go('sprechen-teil2')" @keydown.enter="go('sprechen-teil2')">
        <div class="module-numeral">II</div>
        <h2>Diskussion</h2>
        <div class="module-de">Teil 2 · mit KI-Partner</div>
        <p class="module-desc">
          Pick or generate a Topic, choose your turn count, and argue your
          side. Afterwards: marked transcript, Prädikat, and per-criterion
          scores — the conversation itself is never stored.
        </p>
        <div class="module-cta">Start <span aria-hidden="true">→</span></div>
      </article>
    </div>

    <section v-if="recent.length > 0" class="recent-runs">
      <h3 class="recent-runs-title">Recent discussions</h3>
      <ul class="recent-runs-list">
        <li v-for="r in recent" :key="r.id">
          <span class="rr-date">{{ new Date(r.startedAt).toLocaleDateString() }}</span>
          <span class="rr-topic">{{ r.meta.topicTitle ?? '—' }}</span>
          <span class="rr-score">{{ r.correct }} / 100</span>
          <span class="rr-meta">{{ r.meta.sprechenPraedikat ?? '—' }}</span>
        </li>
      </ul>
    </section>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
    </div>
  </div>
</template>

<style scoped>
.sprechen-grid { margin-top: 12px; }
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
.rr-topic { font-family: var(--font-display); flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rr-score { font-variant-numeric: tabular-nums; }
.rr-meta { color: var(--mute); font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; }
.setup-actions { display: flex; justify-content: flex-start; margin-top: 40px; }
</style>
