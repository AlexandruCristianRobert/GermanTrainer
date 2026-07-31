<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  DA_COMPOUND_PREPOSITIONS,
  NO_COMPOUND_PREPOSITIONS,
  canFormCompound,
  isVowelInitial,
  daCompound,
  woCompound,
} from '../../data/daCompounds'

// Port of the React `DacFormation` (da-compounds.jsx): the masthead's live
// da + [r] + prep = compound formula, recomputing across every real
// preposition in src/data/daCompounds.ts plus the traps that form none.
//
// NOTE: the design source's own trap list (`DAC_TRAPS`) only names four
// prepositions (ohne, seit, außer, wegen). The real NO_COMPOUND_PREPOSITIONS
// in daCompounds.ts has eight (it also carries gegenüber, während, trotz,
// statt). Per the migration brief, the real data wins over the design's
// thinner mirror, so all eight render as trap buttons here.

const prep = ref('auf')

const trap = computed(() => !canFormCompound(prep.value))
const vowel = computed(() => isVowelInitial(prep.value))

const formedDa = computed(() => daCompound(prep.value))
const formedWo = computed(() => woCompound(prep.value))

// The starred trap forms, for the crossed-out "no compound" display — same
// da/wo + (r) + prep concatenation the compound would use if it existed.
const trapDa = computed(() => 'da' + (vowel.value ? 'r' : '') + prep.value)
const trapWo = computed(() => 'wo' + (vowel.value ? 'r' : '') + prep.value)

function select(p: string): void {
  prep.value = p
}
</script>

<template>
  <div class="dac-mh-main">
    <div class="dac-mh-lbl">Bildung · the whole rule in one line</div>

    <div class="dac-formula">
      <span class="f-stem">da</span>
      <span class="f-eq">+</span>
      <span class="f-r" :class="{ off: !vowel }">r</span>
      <span class="f-eq">+</span>
      <span class="f-prep">{{ prep }}</span>
      <span class="f-eq">=</span>
      <span v-if="trap" class="f-x">{{ trapDa }}</span>
      <span v-else class="f-out">{{ formedDa }}</span>
    </div>

    <div class="dac-wo">
      <b>wo</b><i>{{ vowel ? 'r' : '' }}</i><b>{{ prep }}</b> →
      <span v-if="trap" :style="{ textDecoration: 'line-through', color: 'var(--clay)' }">{{ trapWo }}</span>
      <b v-else style="color: var(--ink)">{{ formedWo }}</b>
      <span style="font-style: italic; font-size: 14px"> — the question twin, same rule</span>
    </div>

    <p class="dac-rule">
      <template v-if="trap">
        „{{ prep }}“ forms no compound at all. There is no *{{ trapDa }} and no *{{ trapWo }} —
        you keep the preposition and add a demonstrative: <strong>{{ prep }} das</strong>.
      </template>
      <template v-else-if="vowel">
        „{{ prep }}“ begins with a vowel, so the linking <strong>-r-</strong> appears. And a
        da-compound only ever stands in for a <strong>thing</strong> — never a person.
      </template>
      <template v-else>
        „{{ prep }}“ begins with a consonant, so no linking <strong>-r-</strong>. And a
        da-compound only ever stands in for a <strong>thing</strong> — never a person.
      </template>
    </p>

    <div class="dac-preps">
      <button
        v-for="p in DA_COMPOUND_PREPOSITIONS"
        :key="p.preposition"
        type="button"
        class="dac-prep"
        :class="{ active: prep === p.preposition }"
        @click="select(p.preposition)"
      >{{ p.preposition }}</button>
      <button
        v-for="p in NO_COMPOUND_PREPOSITIONS"
        :key="p"
        type="button"
        class="dac-prep trap"
        :class="{ active: prep === p }"
        @click="select(p)"
      >{{ p }}</button>
    </div>
  </div>
</template>
