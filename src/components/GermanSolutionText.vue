<script setup lang="ts">
// Shared renderer for a German sentence that may carry an idiom annotation
// (ADR-0001: no inline markup in sentence strings — `text` is rendered
// verbatim, split only at render time). Without `idiom` this is plain text;
// with it, the idiom's verbatim spans are underlined and carry a popover
// with the dictionary form + English gloss, using the same `.sn-i`/`.sn-pop`
// classes and hover/focus/tap-reveal triad as the word-hint spans in
// SentenceRunner.vue — styled entirely by the global src/styles/sentence.css.
import { computed, ref } from 'vue'
import { buildHintSegments, type HintInput } from '../composables/useSentenceQuiz'
import type { IdiomInfo } from '../composables/useIdiomHighlight'

const props = defineProps<{ text: string; idiom?: IdiomInfo }>()

const revealedKeys = ref<Set<number>>(new Set())

// buildHintSegments' HintInput carries a `kind` and a `reveal`, neither of
// which this component actually uses: every matched segment renders as
// data-cat="idiom" regardless (below), and the popover reads idiom.form /
// idiom.gloss straight off the prop rather than off the segment. Both are
// set to inert placeholders purely to satisfy the shared function's type.
const segments = computed(() => {
  if (!props.idiom) return [{ text: props.text }]
  const hints: HintInput[] = props.idiom.spans.map(surface => ({ surface, kind: 'verb', reveal: '' }))
  return buildHintSegments(props.text, hints)
})

function toggleRevealed(i: number) {
  const next = new Set(revealedKeys.value)
  if (next.has(i)) next.delete(i); else next.add(i)
  revealedKeys.value = next
}

/** Keeps a span's popover inside the viewport — same pattern as
 *  SentenceRunner's clampPop(): measured while still invisible
 *  (visibility:hidden keeps layout), shifted back via --pop-dx. */
function clampPop(e: Event) {
  const host = e.currentTarget as HTMLElement | null
  const pop = host?.querySelector<HTMLElement>('.sn-pop')
  if (!pop) return
  pop.style.removeProperty('--pop-dx')
  const r = pop.getBoundingClientRect()
  if (r.width === 0) return
  const inset = 8
  let dx = 0
  if (r.left < inset) dx = inset - r.left
  else if (r.right > window.innerWidth - inset) dx = window.innerWidth - inset - r.right
  if (dx !== 0) pop.style.setProperty('--pop-dx', `${dx}px`)
}

function revealSpan(i: number, e: Event) {
  toggleRevealed(i)
  clampPop(e)
}
</script>

<template>
  <span v-if="!idiom">{{ text }}</span>
  <span v-else>
    <template v-for="(seg, i) in segments" :key="i">
      <span
        v-if="seg.hint"
        class="sn-i has-pop"
        data-cat="idiom"
        tabindex="0"
        :class="{ revealed: revealedKeys.has(i) }"
        @mouseenter="clampPop($event)"
        @focusin="clampPop($event)"
        @click="revealSpan(i, $event)"
        @keydown.enter.prevent="revealSpan(i, $event)"
        @keydown.space.prevent="revealSpan(i, $event)"
      >{{ seg.text }}<span class="sn-pop"><span class="sn-pop-l"><span class="sn-pop-w"><em>{{ idiom.form }}</em> — {{ idiom.gloss }}</span></span></span></span>
      <template v-else>{{ seg.text }}</template>
    </template>
  </span>
</template>
