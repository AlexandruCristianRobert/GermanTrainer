<script setup lang="ts">
//
// Schreiben Teil 1 — Mustertexte. A read-only, annotated library of the five
// Aufgabenmuster (see CONTEXT.md → "Aufgabenmuster", "Mustertext" and
// docs/superpowers/specs/2026-08-12-schreiben-mustertexte-design.md, Part 2
// "Viewer"). Never graded, never counted against a learner's own Beitrag —
// this is a worked example to read, not a drill to run.
//
// Three orthogonal pieces of local state: which pattern is showing
// (`activeId`, seeded from `?muster=` so Teil1Setup/Teil1Prep can deep-link
// straight into the model that matches a drawn Schreibthema), which of the
// three annotation layers are currently highlighted (`layersOn`, purely a
// display filter — never disables a span), and which single span is pinned
// into the note panel below the text (`pinned`, cleared on every pattern
// switch since a pinned note from a previous model would dangle).
import { computed, ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  SCHREIBEN_MUSTER, MUSTER_LAYER_LABEL,
  type MusterId, type MusterLayer, type MusterSegment
} from '../../data/schreibenMuster'
import { SCHREIBEN_THEMEN } from '../../data/schreibenThemen'

const route = useRoute()

const MUSTER_IDS = SCHREIBEN_MUSTER.map(m => m.id)
const LAYERS: MusterLayer[] = ['konnektor', 'mittel', 'struktur']

function isMusterId(v: unknown): v is MusterId {
  return typeof v === 'string' && (MUSTER_IDS as string[]).includes(v)
}

const initial = route.query.muster
const activeId = ref<MusterId>(isMusterId(initial) ? initial : 'abwaegen')

const model = computed(() => SCHREIBEN_MUSTER.find(m => m.id === activeId.value)!)
const thema = computed(() => SCHREIBEN_THEMEN.find(t => t.id === model.value.themaId) ?? null)

const layersOn = ref<Record<MusterLayer, boolean>>({ konnektor: true, mittel: true, struktur: true })

const layerCounts = computed<Record<MusterLayer, number>>(() => {
  const counts: Record<MusterLayer, number> = { konnektor: 0, mittel: 0, struktur: 0 }
  for (const seg of model.value.segments) if (seg.layer) counts[seg.layer]++
  return counts
})

// shallowRef, not ref: a plain `ref()` would deep-wrap the assigned segment
// in a reactive proxy (Vue's toReactive-on-set for object values), which
// breaks the template's `pinned === seg` identity check against the raw
// segment objects from SCHREIBEN_MUSTER. shallowRef keeps the exact
// reference, and MusterSegment is inert data with nothing to react to
// internally anyway.
const pinned = shallowRef<MusterSegment | null>(null)

// A pinned span belongs to exactly one model — switching patterns must not
// leave a stale note (or a stale `pinned` highlight) pointing at a segment
// object that no longer renders anywhere on the page.
watch(activeId, () => { pinned.value = null })

function selectMuster(id: MusterId) {
  activeId.value = id
}

function toggleLayer(layer: MusterLayer) {
  layersOn.value[layer] = !layersOn.value[layer]
}

function pin(seg: MusterSegment) {
  pinned.value = seg
}

function clearPinned() {
  pinned.value = null
}

// A `<button>`'s *used* display value is forced to inline-block by every
// browser no matter what CSS asks for (a long-standing quirk for form
// controls) — and inline-block establishes its own formatting context, which
// silently swallows whitespace right at the box's own edge. Every annotated
// segment's `t` carries its separating space at that exact edge (e.g.
// "diskutiert, ob "), so left uncorrected, the rendered word runs straight
// into the next segment ("obdie"). Fix: render only the trimmed core inside
// the button, and put the edge whitespace back as ordinary sibling text,
// where normal inline collapsing applies.
function leadingWs(t: string): string { return t.match(/^\s+/)?.[0] ?? '' }
function trailingWs(t: string): string { return t.match(/\s+$/)?.[0] ?? '' }
function core(t: string): string { return t.trim() }
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel · Schreiben · Mustertexte</div>
        <h1 class="section-title">Mustertexte<em>.</em></h1>
        <p class="section-subtitle">
          Fünf Aufgabenmuster, je ein vollständiger, echter Forumsbeitrag —
          Konnektoren, Schreibmittel und grammatische Strukturen markiert und
          erklärt. Nie bewertet, nie in eine eigene Note gezählt.
        </p>
      </div>
      <router-link :to="{ name: 'schreiben' }" class="btn btn-ghost back-link">← Schreiben</router-link>
    </header>

    <div class="muster-chip-row" role="tablist">
      <button
        v-for="m in SCHREIBEN_MUSTER" :key="m.id" type="button"
        class="muster-chip" :class="{ active: activeId === m.id }"
        role="tab" :aria-selected="activeId === m.id"
        @click="selectMuster(m.id)"
      >{{ m.titleDe }}</button>
    </div>

    <div class="muster-model-head">
      <h2 class="muster-model-title">{{ model.titleDe }}</h2>
      <p class="muster-model-signal">{{ model.signalDe }}</p>
    </div>

    <details v-if="thema" class="muster-thema">
      <summary>Aufgabenblatt: {{ thema.titleDe }}</summary>
      <ol class="muster-thema-glied">
        <li v-for="(p, i) in thema.inhaltspunkte" :key="i">{{ p }}</li>
      </ol>
    </details>

    <div class="muster-skeleton-wrap">
      <div class="micro-mark">Bauplan</div>
      <ol class="muster-skeleton">
        <li v-for="(line, i) in model.skeleton" :key="i">{{ line }}</li>
      </ol>
    </div>

    <div class="muster-layer-row">
      <button
        v-for="layer in LAYERS" :key="layer" type="button"
        class="muster-layer-btn" :class="[layer, { off: !layersOn[layer] }]"
        :aria-pressed="layersOn[layer]"
        @click="toggleLayer(layer)"
      >
        <span class="muster-layer-swatch" :class="layer" aria-hidden="true"></span>
        <span class="muster-layer-label">{{ MUSTER_LAYER_LABEL[layer].de }}</span>
        <span class="muster-layer-count">{{ layerCounts[layer] }}</span>
      </button>
    </div>

    <p class="muster-text" @keydown.esc="clearPinned">
      <template v-for="(seg, i) in model.segments" :key="i">
        <template v-if="seg.layer">{{ leadingWs(seg.t)
          }}<button
            type="button"
            class="muster-span"
            :class="[seg.layer, { dim: !layersOn[seg.layer], pinned: pinned === seg }]"
            :title="seg.noteDe"
            @click="pin(seg)"
          >{{ core(seg.t) }}</button>{{ trailingWs(seg.t) }}</template>
        <template v-else>{{ seg.t }}</template>
      </template>
    </p>

    <div class="muster-note" aria-live="polite">
      <template v-if="pinned">
        <div class="muster-note-layer">{{ MUSTER_LAYER_LABEL[pinned.layer!].de }}</div>
        <p class="muster-note-text">{{ pinned.noteDe }}</p>
      </template>
      <p v-else class="muster-note-empty">
        Tippe eine Markierung an, um zu sehen, warum sie hier funktioniert.
      </p>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 900px;

  /* Three layer colors, reusing the app's existing tuned info/warn/danger
     hues (CONTEXT.md tokens.css) rather than inventing new ones — each
     already ships a light + dark variant chosen for legibility, and each is
     already visually distinct from --accent (sage) so a highlighted span
     never gets mistaken for a plain link or the active chip. konnektor
     (bridges between clauses) reads as cobalt/blue, mittel (phrasings/moves)
     as ochre/amber, struktur (grammar) as clay/rust. */
  --muster-konnektor: var(--cobalt);
  --muster-konnektor-wash: var(--cobalt-tint);
  --muster-mittel: var(--ochre);
  --muster-mittel-wash: var(--ochre-tint);
  --muster-struktur: var(--clay);
  --muster-struktur-wash: var(--clay-tint);
}

.back-link { text-decoration: none; border-bottom: 0; }

.muster-chip-row { display: flex; flex-wrap: wrap; gap: 10px; margin: 32px 0 28px; }
.muster-chip {
  font-family: var(--font-body); font-size: 14.5px; padding: 9px 16px;
  border: 1px solid var(--hairline); border-radius: 2px; background: transparent;
  color: var(--ink-soft); cursor: pointer; transition: all .15s; line-height: 1.3;
}
.muster-chip:hover { border-color: var(--ink-soft); color: var(--ink); }
.muster-chip.active { background: var(--accent-tint); border-color: var(--accent); color: var(--ink); font-weight: 600; }

.muster-model-head { margin-bottom: 24px; }
.muster-model-title { font-size: 26px; }
.muster-model-signal { font-style: italic; color: var(--ink-soft); margin-top: 6px; font-size: 15px; }

.muster-thema {
  border: 1px solid var(--hairline); border-radius: 4px; padding: 14px 20px;
  margin-bottom: 24px; background: var(--paper-card);
}
.muster-thema summary { cursor: pointer; font-weight: 500; color: var(--ink); }
.muster-thema[open] summary { margin-bottom: 4px; }
.muster-thema-glied { margin: 12px 0 0; padding-left: 20px; color: var(--ink-soft); font-size: 15px; }
.muster-thema-glied li { margin-bottom: 6px; }

.muster-skeleton-wrap { margin-bottom: 28px; }
.muster-skeleton { margin: 10px 0 0; padding-left: 20px; }
.muster-skeleton li { margin-bottom: 6px; color: var(--ink-soft); font-size: 15px; }

.muster-layer-row { display: flex; gap: 10px; margin-bottom: 24px; flex-wrap: wrap; }
.muster-layer-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 14px; border: 1px solid var(--hairline); border-radius: 2px;
  background: var(--paper-card); cursor: pointer; font-family: var(--font-mono);
  font-size: 12px; letter-spacing: 0.04em; color: var(--ink); transition: all .15s;
}
.muster-layer-btn:hover { border-color: var(--ink-soft); }
.muster-layer-btn.off { color: var(--mute); }
.muster-layer-swatch { width: 11px; height: 11px; border-radius: 3px; flex: 0 0 auto; transition: opacity .15s; }
.muster-layer-swatch.konnektor { background: var(--muster-konnektor); }
.muster-layer-swatch.mittel { background: var(--muster-mittel); }
.muster-layer-swatch.struktur { background: var(--muster-struktur); }
.muster-layer-btn.off .muster-layer-swatch { opacity: .3; }
.muster-layer-count { font-variant-numeric: tabular-nums; color: var(--mute); }

.muster-text { font-size: 17px; line-height: 1.9; }

.muster-span {
  /* No display override here — see leadingWs()/trailingWs() in the script:
     every browser forces a <button>'s *used* display to inline-block no
     matter what CSS asks for, and inline-block silently swallows whitespace
     right at its own edge. The edge spaces are pulled out of the button's
     text content in the template instead, so they render as ordinary
     sibling text and never hit that boundary. */
  border: 0; background: transparent; padding: 1px 3px; margin: 0 -3px;
  font: inherit; color: inherit; cursor: pointer; border-radius: 2px;
  border-bottom: 2px solid transparent;
  transition: background-color .15s, border-color .15s, color .15s, outline-color .15s;
}
.muster-span.konnektor { background: var(--muster-konnektor-wash); border-bottom-color: var(--muster-konnektor); color: var(--muster-konnektor); }
.muster-span.mittel { background: var(--muster-mittel-wash); border-bottom-color: var(--muster-mittel); color: var(--muster-mittel); }
.muster-span.struktur { background: var(--muster-struktur-wash); border-bottom-color: var(--muster-struktur); color: var(--muster-struktur); }

/* dim = the layer is toggled off: no wash, no underline, reads as plain
   text — but the button stays clickable, so hover/title/pin still work. */
.muster-span.dim { background: transparent; border-bottom-color: transparent; color: inherit; }

.muster-span.pinned { outline-offset: 1px; }
.muster-span.pinned.konnektor { outline: 1.5px solid var(--muster-konnektor); background: color-mix(in oklab, var(--muster-konnektor) 30%, var(--muster-konnektor-wash)); }
.muster-span.pinned.mittel { outline: 1.5px solid var(--muster-mittel); background: color-mix(in oklab, var(--muster-mittel) 30%, var(--muster-mittel-wash)); }
.muster-span.pinned.struktur { outline: 1.5px solid var(--muster-struktur); background: color-mix(in oklab, var(--muster-struktur) 30%, var(--muster-struktur-wash)); }
.muster-span.pinned.dim { background: transparent; outline: none; }

.muster-note {
  margin-top: 28px; padding: 18px 22px; border-left: 3px solid var(--rule);
  background: var(--paper-deep); border-radius: 0 4px 4px 0; min-height: 68px;
}
.muster-note-layer {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 6px;
}
.muster-note-text { margin: 0; font-size: 15px; line-height: 1.55; color: var(--ink); }
.muster-note-empty { margin: 0; font-style: italic; color: var(--mute); }
</style>
