<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loadHistory } from '../../composables/useQuizHistory'
import {
  computeRemaining,
  findActiveSession,
  createSession,
  abandonSession
} from '../../composables/useSimulatorC1'
import type { SimulatorSession } from '../../data/simulatorC1'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const toast = useToast()

const active = ref<SimulatorSession | null>(null)
const now = ref(Date.now())
let tick: number | undefined

onMounted(async () => {
  active.value = await findActiveSession()
  tick = window.setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => { window.clearInterval(tick) })

function format(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const remainingDisplay = computed(() => {
  if (!active.value) return null
  if (active.value.status !== 'in_progress') return null
  return format(computeRemaining(active.value, now.value))
})

const submittedDisplay = computed(() =>
  active.value?.status === 'submitted'
)

const recent = computed(() =>
  loadHistory()
    .filter(h => h.type === 'simulator-c1')
    .slice(0, 5)
)

async function start() {
  try {
    const s = await createSession()
    router.push({ name: 'simulator-run', params: { sessionId: s.id } })
  } catch (err) {
    toast.error('Cannot start exam', {
      description: err instanceof Error ? err.message : String(err)
    })
  }
}

function resume() {
  if (!active.value) return
  if (active.value.status === 'submitted') {
    router.push({ name: 'simulator-result', params: { sessionId: active.value.id } })
  } else {
    router.push({ name: 'simulator-run', params: { sessionId: active.value.id } })
  }
}

async function abandon() {
  if (!active.value) return
  const ok = confirm('Diesen Prüfungsversuch wirklich abbrechen? Bisher geschriebene Texte bleiben gespeichert, aber die Sitzung wird beendet.')
  if (!ok) return
  await abandonSession(active.value.id)
  active.value = null
  toast.success('Sitzung beendet')
}

function back() { router.push({ name: 'home' }) }
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel · Goethe C1 Schreiben</div>
        <h1 class="section-title">Mock exam<em>.</em></h1>
        <p class="section-subtitle">
          75 Minuten · Forumsbeitrag (~230 Wörter) + halbformelle E-Mail (~120 Wörter)
          · automatisch nach der Goethe-C1-Rubrik bewertet.
        </p>
      </div>
    </header>

    <div class="alert alert-info simulator-disclaimer">
      <span class="alert-label">Hinweis</span>
      Bewertungen sind indikativ und ersetzen keinen offiziellen Prüfer.
      Die 60/40-Gewichtung folgt der dokumentierten Goethe-Schreiben-Bewertung;
      offizielle Modellsätze bleiben die maßgebliche Vorbereitungsquelle.
    </div>

    <div v-if="active && active.status === 'in_progress'" class="card simulator-cta">
      <div class="simulator-cta-head">
        <h2>Resume exam</h2>
        <span class="simulator-time-left">Verbleibend: {{ remainingDisplay }}</span>
      </div>
      <p class="simulator-cta-desc">Du hast eine Prüfung in Bearbeitung. Klicke „Fortsetzen", um zurückzukehren — oder „Abbrechen", um diese Sitzung zu beenden.</p>
      <div class="simulator-cta-actions">
        <button class="btn btn-accent" type="button" @click="resume">Fortsetzen <span aria-hidden="true">→</span></button>
        <button class="btn btn-quiet" type="button" @click="abandon">Abbrechen</button>
      </div>
    </div>

    <div v-else-if="submittedDisplay" class="card simulator-cta">
      <div class="simulator-cta-head">
        <h2>Time's up</h2>
      </div>
      <p class="simulator-cta-desc">Diese Prüfung wurde abgegeben (Zeit abgelaufen oder du hast „Submit" geklickt). Klicke „Bewerten", um die Ergebnisse zu sehen, oder „Abbrechen", um sie zu verwerfen.</p>
      <div class="simulator-cta-actions">
        <button class="btn btn-accent" type="button" @click="resume">Bewerten <span aria-hidden="true">→</span></button>
        <button class="btn btn-quiet" type="button" @click="abandon">Abbrechen</button>
      </div>
    </div>

    <div v-else class="card simulator-cta">
      <div class="simulator-cta-head">
        <h2>Start a new exam</h2>
        <span class="simulator-cta-meta">75 Min · 2 Aufgaben · ≈ 2 große Bewertungsaufrufe</span>
      </div>
      <p class="simulator-cta-desc">Zwei zufällig ausgewählte Goethe-C1-Prompts (Forumsbeitrag + E-Mail) unter einem 75-Minuten-Timer. Auto-Abgabe bei Zeitablauf.</p>
      <div class="simulator-cta-actions">
        <button class="btn btn-accent" type="button" @click="start">Start <span aria-hidden="true">→</span></button>
      </div>
    </div>

    <section v-if="recent.length > 0" class="recent-runs">
      <h3 class="recent-runs-title">Recent exams</h3>
      <ul class="recent-runs-list">
        <li v-for="r in recent" :key="r.id">
          <span class="rr-date">{{ new Date(r.startedAt).toLocaleDateString() }}</span>
          <span class="rr-score">{{ r.meta.combinedScore ?? '—' }} / 100 · {{ r.meta.passes ? 'PASS' : 'FAIL' }}</span>
          <span class="rr-tasks">T1 {{ r.meta.task1Score ?? '—' }} · T2 {{ r.meta.task2Score ?? '—' }}</span>
          <span class="rr-duration">{{ format(r.durationMs) }}</span>
        </li>
      </ul>
    </section>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
    </div>
  </div>
</template>

<style scoped>
.simulator-disclaimer { margin-bottom: 24px; max-width: 720px; }

.simulator-cta {
  padding: 24px;
  max-width: 720px;
  margin: 16px 0 32px;
}
.simulator-cta-head {
  display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap;
}
.simulator-cta-head h2 {
  font-family: var(--font-display);
  font-size: 22px;
  margin: 0;
}
.simulator-time-left {
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.simulator-cta-meta {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--mute);
}
.simulator-cta-desc {
  font-family: var(--font-body);
  font-size: 14.5px;
  color: var(--ink-soft);
  margin: 12px 0 16px;
}
.simulator-cta-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.recent-runs { margin-top: 32px; max-width: 720px; }
.recent-runs-title {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 12px;
}
.recent-runs-list { list-style: none; padding: 0; margin: 0; }
.recent-runs-list li {
  display: flex; gap: 16px; align-items: baseline; flex-wrap: wrap;
  padding: 8px 0; border-bottom: 1px solid var(--hairline); font-size: 14px;
}
.rr-date { color: var(--mute); flex: 0 0 110px; font-variant-numeric: tabular-nums; }
.rr-score { font-family: var(--font-display); }
.rr-tasks { color: var(--ink-soft); font-family: var(--font-mono); font-size: 12px; }
.rr-duration { margin-left: auto; color: var(--mute); font-family: var(--font-mono); font-size: 12px; font-variant-numeric: tabular-nums; }

.setup-actions { display: flex; justify-content: flex-start; margin-top: 40px; }
</style>
