<script setup lang="ts">
//
// Sprechen Teil 1 — Vorbereitung: the Gliederung planner.
//
// This is where the run is won or lost. The exam hands the learner an
// Aufgabenblatt with five Gliederungspunkte already printed on it; the one
// thing the learner brings is a single keyword per point. Those five
// keywords ARE the Vortragsplan — they come back in the runner as the live
// Gliederungs-Checkliste (useVortragCoverage.planSignals), so what gets typed
// into `.spr-plan-in` here is not a note, it is the coverage signal itself.
//
// Everything else on this screen — the Erfahrungs-Ausgrabung, the
// Konnektoren-Palette, the Argumentenspeicher, the Wortschatz — carries over
// from Teil 2's Vorbereitung (see Teil2Prep.vue): the countdown with
// Pause/Stopp, the bank resolution with an honest scopeLabel, the regenerate
// button with its ai-cost-note, and the stash round-trip.
//
// Word targets and clocks always come from GLIEDERUNGSPUNKTE / vortragClock —
// never a hardcoded number (Global Constraints).

import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { TEIL1_STASH_KEY, type Teil1RunStash, type VortragPlanEntry } from '../../data/sprechen'
import {
  GLIEDERUNGSPUNKTE, VORTRAG_TARGET_WORDS, vortragClock, KONNEKTOREN,
  type GliederungKey
} from '../../data/sprechenVortragsmittel'
import { emptyPlan } from '../../composables/useVortragCoverage'
import { resolveArgumentBank, type ArgumentBank } from '../../data/sprechenArguments'
import { generateArgumentBank, loadCachedBank, saveCachedBank } from '../../composables/useSprechenArguments'
import { allThemen } from '../../composables/useVortragsthemen'
import { resolveAiClient } from '../../composables/localClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const toast = useToast()
const { settings, canUseAi, load: loadSettings } = useSettings()

const stash = ref<Teil1RunStash | null>(null)
const bank = ref<ArgumentBank | null>(null)
const scope = ref<string>('')
const plan = ref<VortragPlanEntry[]>(emptyPlan())
const notes = ref('')
const left = ref(0)
const running = ref(true)
const regenerating = ref(false)
let tick: number | undefined

const modalityWord = computed(() => stash.value?.modality === 'typed' ? 'getippt' : 'gesprochen')

const filledCount = computed(() => plan.value.filter(p => p.keyword.trim().length > 0).length)

const targetClock = computed(() => vortragClock(VORTRAG_TARGET_WORDS))

const clock = computed(() => {
  const m = Math.floor(left.value / 60)
  const s = left.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

// Only 'cached' is AI-generated (a fresh Gemini call, saved to Dexie) — 'topic'
// and every TopicTag scope are hand-authored data bundled into the app
// itself, never generated and never cached. This label sits right beside the
// AI-cost note, so it must not claim a bundled bank was AI output.
const scopeLabel = computed(() => {
  if (scope.value === 'cached') return 'themenspezifisch · von der KI erzeugt, dann gecacht'
  if (scope.value === 'topic') return 'themenspezifisch · mitgeliefert, ohne KI'
  return `Feld ${scope.value} · mitgeliefert, ohne KI`
})

const notesPlaceholder = computed(() => {
  const pro = bank.value?.pro[0]?.claim ?? ''
  const contra = bank.value?.contra[0]?.claim ?? ''
  return `Zahlen, Namen, ein Beispiel — z. B.\n· ${pro}\n· Gegenseite: ${contra}`
})

// A subtitle that names what the notes are FOR — a typed learner is about to
// write the Rede itself, a spoken learner is about to hold it — otherwise
// identical wording to the design source.
const prepSubtitle = computed(() => stash.value?.modality === 'typed'
  ? 'Kein Manuskript — ein Gerüst. Ein Stichwort pro Gliederungspunkt reicht; genau das steht später neben dir, während du den Vortrag schreibst.'
  : 'Kein Manuskript — ein Gerüst. Ein Stichwort pro Gliederungspunkt reicht; genau das steht später neben dir, während du den Vortrag hältst.'
)

function keywordFor(key: GliederungKey): string {
  return plan.value.find(p => p.key === key)?.keyword ?? ''
}

function setKeyword(key: GliederungKey, value: string) {
  const entry = plan.value.find(p => p.key === key)
  if (entry) entry.keyword = value
  else plan.value = [...plan.value, { key, keyword: value }]
}

function appendKonnektor(word: string) {
  notes.value = notes.value.length > 0 ? `${notes.value} ${word}` : word
}

onMounted(async () => {
  await loadSettings()
  const raw = sessionStorage.getItem(TEIL1_STASH_KEY)
  if (!raw) return
  try {
    const s = JSON.parse(raw) as Teil1RunStash
    stash.value = s
    plan.value = s.plan && s.plan.length > 0 ? s.plan : emptyPlan()
    notes.value = s.notes ?? ''
    left.value = s.prepSeconds > 0 ? s.prepSeconds : 180

    // A cached AI bank beats the authored one; the tag bank is the floor —
    // every Vortragsthema resolves to content with zero AI calls, exactly
    // like Teil 2's Topics (resolveArgumentBank is shared, unmodified code).
    const record = allThemen().find(t => t.id === s.thema.id)
    const cached = await loadCachedBank(s.thema.id)
    const resolved = resolveArgumentBank(
      { id: s.thema.id, tags: record?.tags ?? [] },
      cached ?? undefined
    )
    bank.value = resolved.bank
    scope.value = resolved.scope
  } catch { /* leave stash null — the guard below renders */ }

  tick = window.setInterval(() => {
    if (running.value && left.value > 0) left.value -= 1
  }, 1000)
})

onUnmounted(() => { if (tick !== undefined) window.clearInterval(tick) })

// Expiry of the countdown never forces the start — the CTA below carries no
// :disabled tied to `left`, and a finished plan is never required either.
function go() {
  if (!stash.value) return
  const next: Teil1RunStash = { ...stash.value, plan: plan.value, notes: notes.value }
  sessionStorage.setItem(TEIL1_STASH_KEY, JSON.stringify(next))
  router.push({ name: 'sprechen-teil1-run' })
}

async function regenerateBank() {
  const s = stash.value
  if (!s || !canUseAi.value || regenerating.value) return
  regenerating.value = true
  try {
    const client = resolveAiClient(settings.value)
    const fresh = await generateArgumentBank(
      client, settings.value.model,
      { titleDe: s.thema.titleDe, statementDe: s.thema.taskDe }
    )
    await saveCachedBank(s.thema.id, fresh)
    bank.value = fresh
    scope.value = 'cached'
    toast.success('Neuer Argumentenspeicher generiert')
  } catch (err) {
    // Keep whatever bank was showing (authored or tag fallback) — a failed
    // regeneration must never blank the prep screen.
    toast.error('Generierung fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    regenerating.value = false
  }
}

function backToSetup() { router.push({ name: 'sprechen-teil1' }) }
</script>

<template>
  <div v-if="!stash" class="page">
    <div class="alert alert-info">
      <span class="alert-label">Hinweis</span>
      Kein Thema gewählt — die Vorbereitung braucht ein Aufgabenblatt.
    </div>
    <button class="btn btn-ghost" type="button" @click="backToSetup">← Themenwahl</button>
  </div>

  <div v-else class="page prep-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Sprechen Teil 1 · {{ modalityWord }} · Etappe 02</div>
        <h1 class="section-title">Vorbereitung<em>.</em></h1>
        <p class="section-subtitle">{{ prepSubtitle }}</p>
      </div>
    </header>

    <div class="spr-prep-mast">
      <div>
        <div class="spr-lbl">Aufgabenblatt · {{ stash.thema.titleDe }}</div>
        <p class="spr-prep-stmt">{{ stash.thema.taskDe }}</p>
        <div class="spr-sides">
          <span>Fünf Punkte</span><b>{{ filledCount }} geplant</b>
          <span style="opacity: 0.5">·</span>
          <span>Ziel</span><b>{{ targetClock }}</b>
          <span style="opacity: 0.5">·</span>
          <span>Modus</span><b>{{ modalityWord }}</b>
        </div>
      </div>
      <div class="spr-timer">
        <div class="spr-lbl">Vorbereitungszeit</div>
        <div class="spr-timer-num" :class="{ low: left <= 20 }">{{ clock }}</div>
        <div class="spr-timer-ctl">
          <button class="btn btn-quiet" type="button" @click="running = !running">
            {{ running ? 'Pause' : 'Weiter' }}
          </button>
          <button class="btn btn-quiet" type="button" @click="running = false; left = 0">Stopp</button>
        </div>
        <div v-if="left === 0" class="micro-mark" style="margin-top: 8px; color: var(--clay)">Zeit vorbei — starten geht weiter</div>
      </div>
    </div>

    <div class="spr-block-h" style="margin-top: 42px; margin-bottom: 18px">
      <h2 class="spr-block-t">Gliederung</h2>
      <span class="spr-block-n">Ein Stichwort pro Punkt · wird im Vortrag mitgezählt</span>
    </div>

    <div class="spr-plan">
      <template v-for="point in GLIEDERUNGSPUNKTE" :key="point.key">
        <div v-if="point.key !== 'erfahrung'" class="spr-plan-row" :class="{ on: keywordFor(point.key).trim().length > 0 }">
          <div class="spr-plan-n">{{ String(point.n).padStart(2, '0') }}</div>
          <div class="spr-plan-l">
            <div class="spr-plan-t">{{ point.labelDe }}</div>
            <div class="spr-plan-h">{{ point.hintDe }}</div>
            <div class="spr-plan-w">~{{ point.words }} Wörter · {{ vortragClock(point.words) }}</div>
          </div>
          <input
            class="spr-plan-in"
            :value="keywordFor(point.key)"
            placeholder="Stichwort …"
            @input="setKeyword(point.key, ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div v-else class="spr-erfahrung-wrap">
          <div class="spr-plan-row" :class="{ on: keywordFor(point.key).trim().length > 0 }">
            <div class="spr-plan-n">{{ String(point.n).padStart(2, '0') }}</div>
            <div class="spr-plan-l">
              <div class="spr-plan-t">{{ point.labelDe }}</div>
              <div class="spr-plan-h">{{ point.hintDe }}</div>
              <div class="spr-plan-w">~{{ point.words }} Wörter · {{ vortragClock(point.words) }}</div>
            </div>
            <input
              class="spr-plan-in"
              :value="keywordFor(point.key)"
              placeholder="Stichwort …"
              @input="setKeyword(point.key, ($event.target as HTMLInputElement).value)"
            />
          </div>
          <aside class="spr-ausgrabung">
            <div class="spr-lbl">Beispiel ausgraben</div>
            <ul>
              <li>Wann hattest du damit zu tun?</li>
              <li>Was hast du gemacht?</li>
              <li>Was kam dabei heraus?</li>
            </ul>
          </aside>
        </div>
      </template>
    </div>

    <div class="spr-block-h" style="margin-top: 46px; margin-bottom: 18px">
      <h2 class="spr-block-t">Konnektoren</h2>
      <span class="spr-block-n">Signalwörter — genau die Stellen, an denen ein Vortrag sonst abbricht.</span>
    </div>
    <div v-for="group in KONNEKTOREN" :key="group.labelDe" class="spr-konnekt-group">
      <div class="spr-lbl">{{ group.labelDe }}</div>
      <div class="spr-tagrow">
        <button
          v-for="word in group.words"
          :key="word"
          class="spr-tag"
          type="button"
          @click="appendKonnektor(word)"
        >{{ word }}</button>
      </div>
    </div>

    <template v-if="bank">
      <div class="spr-block-h" style="margin-top: 46px; margin-bottom: 4px">
        <h2 class="spr-block-t">Argumentenspeicher</h2>
        <span class="spr-block-n">{{ scopeLabel }}</span>
        <button
          class="btn btn-quiet regen-btn"
          type="button"
          :disabled="!canUseAi || regenerating"
          @click="regenerateBank"
        >{{ regenerating ? 'Generiere…' : 'Argumente neu generieren' }}</button>
      </div>
      <p class="ai-cost-note">Ersetzt die angezeigten Argumente mit frisch generierten (1 Call).</p>
      <p class="spr-argnote">Beide Seiten gehören in denselben Punkt: Vor- und Nachteile.</p>

      <div class="spr-angles" style="margin-top: 16px">
        <section class="spr-acol mine">
          <div class="spr-acol-h">
            <span class="spr-acol-t">Dafür spricht</span>
            <span class="spr-lbl">{{ bank.pro.length }} Winkel</span>
          </div>
          <div v-for="(a, i) in bank.pro" :key="i" class="spr-angle">
            <div class="spr-angle-c"><b>{{ String(i + 1).padStart(2, '0') }}</b><span>{{ a.claim }}</span></div>
            <p class="spr-angle-w">{{ a.why }}</p>
          </div>
        </section>
        <section class="spr-acol theirs">
          <div class="spr-acol-h">
            <span class="spr-acol-t">Dagegen spricht</span>
            <span class="spr-lbl">{{ bank.contra.length }} Winkel</span>
          </div>
          <div v-for="(a, i) in bank.contra" :key="i" class="spr-angle">
            <div class="spr-angle-c"><b>{{ String(i + 1).padStart(2, '0') }}</b><span>{{ a.claim }}</span></div>
            <p class="spr-angle-w">{{ a.why }}</p>
          </div>
        </section>
      </div>

      <div class="spr-wordstrip">
        <div class="spr-lbl">Wortschatz zum Thema · {{ bank.words.length }} Wörter, die die Prüferin hören will</div>
        <div class="spr-words">
          <div v-for="w in bank.words" :key="w.de" class="spr-word">
            <div class="spr-word-de">{{ w.de }}</div>
            <div class="spr-word-en">{{ w.en }}</div>
          </div>
        </div>
      </div>

      <div v-if="bank.phrases && bank.phrases.length > 0" class="spr-wordstrip spr-phrasestrip">
        <div class="spr-lbl">Wortverbindungen · {{ bank.phrases.length }} feste Kombinationen zum Thema</div>
        <div class="spr-words">
          <div v-for="w in bank.phrases" :key="w.de" class="spr-word">
            <div class="spr-word-de">{{ w.de }}</div>
            <div class="spr-word-en">{{ w.en }}</div>
          </div>
        </div>
      </div>
    </template>

    <div class="spr-notes-wrap">
      <div>
        <div class="spr-lbl" style="margin-bottom: 10px">Freie Notizen · bleiben im Vortrag sichtbar</div>
        <textarea
          v-model="notes"
          class="spr-notes"
          rows="5"
          :placeholder="notesPlaceholder"
        />
      </div>
      <div>
        <div class="spr-lbl" style="margin-bottom: 10px">Vor dem Start</div>
        <p class="spr-tip">
          Der Vortrag wird nach Gliederung bewertet, nicht nach Umfang. Fünf halbe Punkte
          zählen weniger als vier ganze — plane lieber ein Beispiel weniger und sprich es zu Ende.
        </p>
      </div>
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="backToSetup">← Thema wechseln</button>
      <button class="btn btn-accent btn-meta" type="button" @click="go">
        <span class="bm-main">Vortrag halten <span aria-hidden="true">→</span></span>
        <span class="bm-sub">{{ filledCount }} von 5 Punkten geplant</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.prep-page { max-width: 900px; }
.regen-btn { text-transform: none; letter-spacing: normal; font-family: var(--font-body); font-size: 13px; }
.ai-cost-note {
  margin: 8px 0 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  color: var(--mute);
  text-transform: uppercase;
}
.spr-argnote { font-size: 13px; font-style: italic; color: var(--mute); margin: 4px 0 0; }
.spr-tip { font-size: 13.5px; line-height: 1.7; color: var(--ink-soft); margin: 0; }

.spr-konnekt-group { margin-top: 16px; }
.spr-konnekt-group:first-of-type { margin-top: 0; }

.spr-erfahrung-wrap { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 20px; align-items: start; }
.spr-ausgrabung { padding: 14px 16px; margin-top: 15px; background: var(--paper-deep); border-left: 2px solid var(--accent); }
.spr-ausgrabung ul { margin: 8px 0 0; padding-left: 18px; font-size: 13px; line-height: 1.7; color: var(--ink-soft); }
.spr-ausgrabung li { margin-bottom: 4px; }

.spr-phrasestrip { margin-top: 0; border-top: 0; padding-top: 0; }

@media (max-width: 720px) {
  .spr-erfahrung-wrap { grid-template-columns: minmax(0, 1fr); }
}
</style>
