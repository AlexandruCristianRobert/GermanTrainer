<script setup lang="ts">
import { computed } from 'vue'
import { otherPosition, type SceneSpec, type ScenePosition } from '../../data/directionWords'

const props = defineProps<{ scene: SceneSpec }>()

interface Pt { x: number; y: number }

interface Geometry {
  paths: string[]                                  // stroke-only background line art
  anchors: Partial<Record<ScenePosition, Pt>>      // figure foot points for the two positions
}

// viewBox is 0 0 220 130 for every archetype. Figures are ~33 units tall.
const GEOMETRIES: Record<SceneSpec['archetype'], Geometry> = {
  stairs: {
    paths: ['M10 118 H210', 'M40 118 V104 H70 V90 H100 V76 H130 V62 H160 V48 H190'],
    anchors: { bottom: { x: 24, y: 118 }, top: { x: 196, y: 48 } },
  },
  hill: {
    paths: ['M10 118 Q110 10 210 118'],
    anchors: { bottom: { x: 20, y: 118 }, top: { x: 110, y: 64 } },
  },
  doorway: {
    paths: ['M10 118 H210', 'M118 118 V20 H210', 'M130 118 V44 H164 V118'],
    anchors: { outside: { x: 60, y: 118 }, inside: { x: 190, y: 118 } },
  },
  window: {
    paths: ['M10 118 H210', 'M128 118 V16', 'M140 96 H196 V44 H140 Z'],
    anchors: { outside: { x: 60, y: 118 }, inside: { x: 168, y: 112 } },
  },
  room: {
    paths: ['M10 118 H210', 'M120 118 V30 H206 V118', 'M120 30 H92'],
    anchors: { outside: { x: 52, y: 118 }, inside: { x: 164, y: 118 } },
  },
  street: {
    paths: ['M10 72 H210', 'M10 104 H210', 'M60 78 V98 M80 78 V98 M100 78 V98 M120 78 V98 M140 78 V98 M160 78 V98'],
    anchors: { near: { x: 40, y: 124 }, far: { x: 170, y: 66 } },
  },
}

const geometry = computed(() => GEOMETRIES[props.scene.archetype])

const speakerPos = computed(() => props.scene.speakerAt)
const moverPos = computed(() => otherPosition(props.scene.archetype, props.scene.speakerAt))

const speakerPt = computed<Pt>(() => geometry.value.anchors[speakerPos.value]!)
const farPt = computed<Pt>(() => geometry.value.anchors[moverPos.value]!)

// The mover walks mid-path between the two anchors.
const moverPt = computed<Pt>(() => ({
  x: (speakerPt.value.x + farPt.value.x) / 2,
  y: (speakerPt.value.y + farPt.value.y) / 2,
}))

// her = motion toward the speaker; hin = away from the speaker.
const arrowTo = computed<ScenePosition>(() =>
  props.scene.motion === 'toward-speaker' ? speakerPos.value : moverPos.value
)

function raised(p: Pt): Pt {
  return { x: p.x, y: p.y - 44 }
}

function inset(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

const arrow = computed(() => {
  const from = raised(arrowTo.value === speakerPos.value ? farPt.value : speakerPt.value)
  const to = raised(arrowTo.value === speakerPos.value ? speakerPt.value : farPt.value)
  return { from: inset(from, to, 0.15), to: inset(from, to, 0.85) }
})
</script>

<template>
  <figure
    class="scene-diagram"
    :data-archetype="scene.archetype"
    :data-motion="scene.motion"
    :data-arrow-to="arrowTo"
  >
    <svg viewBox="0 0 220 130" role="img" :aria-label="scene.description">
      <title>{{ scene.description }}</title>
      <defs>
        <marker id="dw-arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill="currentColor" />
        </marker>
      </defs>

      <g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path v-for="(d, i) in geometry.paths" :key="i" :d="d" />

        <!-- Speaker: solid figure with speech marks -->
        <g class="dw-speaker" :transform="`translate(${speakerPt.x}, ${speakerPt.y})`">
          <circle cx="0" cy="-26" r="5" fill="currentColor" />
          <line x1="0" y1="-21" x2="0" y2="-8" />
          <line x1="0" y1="-8" x2="-5" y2="0" />
          <line x1="0" y1="-8" x2="5" y2="0" />
          <path d="M9 -30 q4 4 0 8" />
          <path d="M13 -33 q7 7 0 14" />
        </g>

        <!-- Mover: hollow figure mid-path -->
        <g class="dw-mover" :transform="`translate(${moverPt.x}, ${moverPt.y})`">
          <circle cx="0" cy="-26" r="5" />
          <line x1="0" y1="-21" x2="0" y2="-8" />
          <line x1="0" y1="-8" x2="-6" y2="0" />
          <line x1="0" y1="-8" x2="6" y2="-1" />
        </g>

        <!-- Motion arrow -->
        <line
          class="dw-arrow"
          :x1="arrow.from.x" :y1="arrow.from.y"
          :x2="arrow.to.x" :y2="arrow.to.y"
          stroke-width="2"
          marker-end="url(#dw-arrowhead)"
        />
      </g>
    </svg>
  </figure>
</template>

<style scoped>
.scene-diagram {
  margin: 0;
  color: var(--ink);
}
.scene-diagram svg {
  display: block;
  width: 100%;
  max-width: 340px;
  height: auto;
}
.dw-arrow { opacity: 0.85; }
</style>
