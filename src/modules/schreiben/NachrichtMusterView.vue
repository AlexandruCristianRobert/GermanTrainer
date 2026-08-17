<script setup lang="ts">
//
// Schreiben Teil 2 — Musternachrichten. A read-only, annotated library of the
// five Schreibanlässe (see CONTEXT.md → "Musternachricht", "Schreibanlass",
// "Nachrichtenmittel"). Mirrors MusterView.vue (Teil 1's Mustertexte) section
// for section, adapted to Task 10's data: a Musternachricht answers a
// Schreibauftrag rather than a Schreibthema, and carries a FOURTH annotation
// layer — `hoeflichkeit` — beside the three Teil 1 already has. Never graded,
// never counted against a learner's own Nachricht — a worked example to read,
// not a drill to run.
//
// Three orthogonal pieces of local state, exactly as in MusterView.vue: which
// Musternachricht is showing (`activeId`, seeded from `?muster=` so
// Teil2Setup/Teil2Prep can deep-link straight into the model matching a drawn
// Schreibanlass), which of the four annotation layers are highlighted
// (`layersOn`, a display filter only), and which single span is pinned into
// the note panel (`pinned`, cleared on every model switch).
import { computed, ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  SCHREIBEN_MUSTER_NACHRICHTEN, NACHRICHT_MUSTER_TITLE, NACHRICHT_MUSTER_LAYER_LABEL,
  type NachrichtMusterLayer, type NachrichtMusterSegment
} from '../../data/schreibenMusterNachrichten'
import { SCHREIBEN_AUFTRAEGE, type SchreibAnlass } from '../../data/schreibenAuftraege'

const route = useRoute()

const ANLASS_IDS = SCHREIBEN_MUSTER_NACHRICHTEN.map(m => m.id)
const LAYERS: NachrichtMusterLayer[] = ['konnektor', 'mittel', 'struktur', 'hoeflichkeit']

function isAnlassId(v: unknown): v is SchreibAnlass {
  return typeof v === 'string' && (ANLASS_IDS as string[]).includes(v)
}

const initial = route.query.muster
const activeId = ref<SchreibAnlass>(isAnlassId(initial) ? initial : SCHREIBEN_MUSTER_NACHRICHTEN[0].id)

const model = computed(() => SCHREIBEN_MUSTER_NACHRICHTEN.find(m => m.id === activeId.value)!)
// The flagship Auftrag this text answers — SCHREIBEN_AUFTRAEGE, not
// allAuftraege(): a Musternachricht's auftragId always names a seed.
const auftrag = computed(() => SCHREIBEN_AUFTRAEGE.find(a => a.id === model.value.auftragId) ?? null)

const layersOn = ref<Record<NachrichtMusterLayer, boolean>>({
  konnektor: true, mittel: true, struktur: true, hoeflichkeit: true
})

const layerCounts = computed<Record<NachrichtMusterLayer, number>>(() => {
  const counts: Record<NachrichtMusterLayer, number> = { konnektor: 0, mittel: 0, struktur: 0, hoeflichkeit: 0 }
  for (const seg of model.value.segments) if (seg.layer) counts[seg.layer]++
  return counts
})

// shallowRef, not ref — see MusterView.vue's identical comment: a plain
// ref() would deep-wrap the assigned segment and break the template's
// `pinned === seg` identity check against the raw segment objects.
const pinned = shallowRef<NachrichtMusterSegment | null>(null)

watch(activeId, () => { pinned.value = null })

function selectMuster(id: SchreibAnlass) {
  activeId.value = id
}

function toggleLayer(layer: NachrichtMusterLayer) {
  layersOn.value[layer] = !layersOn.value[layer]
}

function pin(seg: NachrichtMusterSegment) {
  pinned.value = seg
}

function clearPinned() {
  pinned.value = null
}

// Identical fix to MusterView.vue's leadingWs()/trailingWs()/core(): a
// <button>'s used display is forced to inline-block, which swallows
// whitespace at its own edge. The edge space is pulled out of the button's
// text content and rendered as ordinary sibling text instead.
function leadingWs(t: string): string { return t.match(/^\s+/)?.[0] ?? '' }
function trailingWs(t: string): string { return t.match(/\s+$/)?.[0] ?? '' }
function core(t: string): string { return t.trim() }
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel · Schreiben · Teil 2 · Musternachrichten</div>
        <h1 class="section-title">Musternachrichten<em>.</em></h1>
        <p class="section-subtitle">
          Fünf Schreibanlässe, je eine vollständige, echte Nachricht — Konnektoren,
          Nachrichtenmittel, grammatische Strukturen und Höflichkeit markiert und erklärt.
          Nie bewertet, nie in eine eigene Note gezählt.
        </p>
      </div>
      <router-link :to="{ name: 'schreiben' }" class="btn btn-ghost back-link">← Schreiben</router-link>
    </header>

    <div class="muster-chip-row" role="tablist">
      <button
        v-for="m in SCHREIBEN_MUSTER_NACHRICHTEN" :key="m.id" type="button"
        class="muster-chip" :class="{ active: activeId === m.id }"
        role="tab" :aria-selected="activeId === m.id"
        @click="selectMuster(m.id)"
      >{{ NACHRICHT_MUSTER_TITLE[m.id] }}</button>
    </div>

    <div class="muster-model-head">
      <h2 class="muster-model-title">{{ model.titleDe }}</h2>
      <p class="muster-model-signal">{{ model.signalDe }}</p>
    </div>

    <details v-if="auftrag" class="muster-thema">
      <summary>Aufgabenblatt: {{ auftrag.titleDe }}</summary>
      <p class="muster-thema-situation">{{ auftrag.situationDe }}</p>
      <p class="muster-thema-empfaenger">
        <strong>Empfänger:</strong> {{ auftrag.empfaengerName }} · {{ auftrag.empfaengerRolleDe }}
      </p>
      <p class="muster-thema-task">{{ auftrag.taskDe }}</p>
      <ol class="muster-thema-glied">
        <li v-for="(p, i) in auftrag.inhaltspunkte" :key="i">{{ p }}</li>
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
        <span class="muster-layer-label">{{ NACHRICHT_MUSTER_LAYER_LABEL[layer].de }}</span>
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
        <div class="muster-note-layer">{{ NACHRICHT_MUSTER_LAYER_LABEL[pinned.layer!].de }}</div>
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

  /* Three layer colors reused verbatim from MusterView.vue's tuned tokens
     (konnektor=cobalt/blue, mittel=ochre/amber, struktur=clay/rust). The
     fourth, `hoeflichkeit`, is this genre's own core skill (Konjunktiv-II
     request frames, softeners, Anrede/Gruß) and gets its own warm hue —
     a berry/wine red, clearly apart from clay's orange-red and ochre's gold —
     with a light/dark pair tuned the same way tokens.css tunes its own hues. */
  --muster-konnektor: var(--cobalt);
  --muster-konnektor-wash: var(--cobalt-tint);
  --muster-mittel: var(--ochre);
  --muster-mittel-wash: var(--ochre-tint);
  --muster-struktur: var(--clay);
  --muster-struktur-wash: var(--clay-tint);
  --muster-hoeflichkeit: #8B3557;
  --muster-hoeflichkeit-wash: rgba(139, 53, 87, 0.18);
}
[data-theme="dark"] .page {
  --muster-hoeflichkeit: #E08FB3;
  --muster-hoeflichkeit-wash: rgba(224, 143, 179, 0.22);
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
.muster-thema-situation, .muster-thema-task {
  margin: 10px 0 0; color: var(--ink-soft); font-size: 15px; line-height: 1.5;
}
.muster-thema-empfaenger { margin: 8px 0 0; font-size: 13.5px; color: var(--mute); }
.muster-thema-empfaenger strong { color: var(--ink-soft); font-weight: 600; }
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
.muster-layer-swatch.hoeflichkeit { background: var(--muster-hoeflichkeit); }
.muster-layer-btn.off .muster-layer-swatch { opacity: .3; }
.muster-layer-count { font-variant-numeric: tabular-nums; color: var(--mute); }

/* pre-wrap: segments carry literal \n / \n\n line breaks (Betreff, Anrede,
   Gruß) — this must render as an actual message layout, not a paragraph
   where the breaks collapse away. Spans still wrap normally at their own
   internal spaces, so nothing overflows at narrow widths. */
.muster-text { font-size: 17px; line-height: 1.9; white-space: pre-wrap; overflow-wrap: break-word; }

.muster-span {
  /* No display override — see leadingWs()/trailingWs() in the script. */
  border: 0; background: transparent; padding: 1px 3px; margin: 0 -3px;
  font: inherit; color: inherit; cursor: pointer; border-radius: 2px;
  border-bottom: 2px solid transparent;
  transition: background-color .15s, border-color .15s, color .15s, outline-color .15s;
}
.muster-span.konnektor { background: var(--muster-konnektor-wash); border-bottom-color: var(--muster-konnektor); color: var(--muster-konnektor); }
.muster-span.mittel { background: var(--muster-mittel-wash); border-bottom-color: var(--muster-mittel); color: var(--muster-mittel); }
.muster-span.struktur { background: var(--muster-struktur-wash); border-bottom-color: var(--muster-struktur); color: var(--muster-struktur); }
.muster-span.hoeflichkeit { background: var(--muster-hoeflichkeit-wash); border-bottom-color: var(--muster-hoeflichkeit); color: var(--muster-hoeflichkeit); }

/* dim = the layer is toggled off: no wash, no underline, reads as plain
   text — but the button stays clickable, so hover/title/pin still work. */
.muster-span.dim { background: transparent; border-bottom-color: transparent; color: inherit; }

.muster-span.pinned { outline-offset: 1px; }
.muster-span.pinned.konnektor { outline: 1.5px solid var(--muster-konnektor); background: color-mix(in oklab, var(--muster-konnektor) 30%, var(--muster-konnektor-wash)); }
.muster-span.pinned.mittel { outline: 1.5px solid var(--muster-mittel); background: color-mix(in oklab, var(--muster-mittel) 30%, var(--muster-mittel-wash)); }
.muster-span.pinned.struktur { outline: 1.5px solid var(--muster-struktur); background: color-mix(in oklab, var(--muster-struktur) 30%, var(--muster-struktur-wash)); }
.muster-span.pinned.hoeflichkeit { outline: 1.5px solid var(--muster-hoeflichkeit); background: color-mix(in oklab, var(--muster-hoeflichkeit) 30%, var(--muster-hoeflichkeit-wash)); }
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
