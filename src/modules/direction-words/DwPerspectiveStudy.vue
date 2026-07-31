<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SceneDiagram from './SceneDiagram.vue'
import {
  otherPosition,
  type SceneArchetype,
  type ScenePosition,
  type SceneSpec,
} from '../../data/directionWords'

// Port of the React `DwPerspectiveStudy` (direction-words.jsx): the rail's
// live teaching widget. Pick one of the six directional elements, flip your
// standpoint, and watch the her/hin compound and its gloss recompute —
// her = toward the speaker, hin = away from the speaker. This is the
// module's core teaching idea, so the recomputation has to be correct, not
// decorative.

interface StudyConfig {
  archetype: SceneArchetype
  herAt: ScenePosition
  event: string
}

// DW_STUDY — read verbatim (archetype/herAt/event) from the design's
// direction-words.jsx.
const DW_STUDY: Record<string, StudyConfig> = {
  ein: { archetype: 'doorway', herAt: 'inside', event: 'Someone walks in through the door.' },
  aus: { archetype: 'room', herAt: 'outside', event: 'Someone walks out of the room.' },
  auf: { archetype: 'stairs', herAt: 'top', event: 'Someone climbs the stairs.' },
  unter: { archetype: 'stairs', herAt: 'bottom', event: 'Someone comes down the stairs.' },
  über: { archetype: 'street', herAt: 'far', event: 'Someone crosses the road.' },
  ab: { archetype: 'hill', herAt: 'bottom', event: 'Someone comes down off the hill.' },
}

const ELEMENTS = Object.keys(DW_STUDY)

// German place words per scene position — a flat Record<ScenePosition, string>
// keyed on SceneDiagram's own ScenePosition union (not a per-archetype table
// like the design's SCENE_PLACE) so this can never drift from what
// SceneDiagram actually supports: a position means the same word everywhere.
const PLACE_WORDS: Record<ScenePosition, string> = {
  top: 'oben',
  bottom: 'unten',
  inside: 'drinnen',
  outside: 'draußen',
  near: 'hier',
  far: 'dort',
}

const element = ref<string>(ELEMENTS[0])
const cfg = computed(() => DW_STUDY[element.value])
const speakerAt = ref<ScenePosition>(cfg.value.herAt)

// Keep the speaker on a position this archetype actually has when the
// element changes underneath it.
watch(element, () => {
  speakerAt.value = DW_STUDY[element.value].herAt
})

const isHer = computed(() => speakerAt.value === cfg.value.herAt)
const prefix = computed(() => (isHer.value ? 'her' : 'hin'))
const otherAt = computed(() => otherPosition(cfg.value.archetype, speakerAt.value))
const place = computed(() => PLACE_WORDS[speakerAt.value])
const otherPlace = computed(() => PLACE_WORDS[otherAt.value])

const scene = computed<SceneSpec>(() => ({
  archetype: cfg.value.archetype,
  speakerAt: speakerAt.value,
  motion: isHer.value ? 'toward-speaker' : 'away-from-speaker',
  description: `${cfg.value.event} You are standing ${place.value}.`,
}))

function selectElement(el: string): void {
  element.value = el
}

function flip(): void {
  speakerAt.value = otherAt.value
}
</script>

<template>
  <div class="dw-study">
    <div class="dw-study-head">
      <span class="micro-mark">Perspektive</span>
      <span class="micro-mark" :style="{ color: isHer ? 'var(--cobalt)' : 'var(--clay)' }">
        {{ isHer ? 'toward you' : 'away from you' }}
      </span>
    </div>
    <div class="dw-study-body">
      <SceneDiagram :scene="scene" />
      <button type="button" class="dw-flip" @click="flip">
        <span>Stell dich {{ otherPlace }} hin</span>
        <span aria-hidden="true">⇄</span>
      </button>
      <div class="dw-elems">
        <button
          v-for="el in ELEMENTS"
          :key="el"
          type="button"
          class="dw-elem"
          :class="{ active: el === element }"
          @click="selectElement(el)"
        >-{{ el }}</button>
      </div>
    </div>
    <div class="dw-study-out">
      <span class="dw-word"><span class="dw-pfx">{{ prefix }}</span>{{ element }}</span>
      <span class="dw-gloss">
        {{ cfg.event }} You are standing <strong>{{ place }}</strong> — so the motion runs
        {{ isHer ? 'toward' : 'away from' }} you.
      </span>
    </div>
  </div>
</template>
