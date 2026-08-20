<script setup lang="ts">
// Sentence module (Kapitel XII) — packed-sentence result surface.
// Transposes SnaResult from docs/design_handoff_sentence_module/sentence-a.jsx
// (Variant A · „Das Register") onto the real PackedItemSpec/GeneratedPackedCard
// data model. Styling is entirely global (src/styles/sentence.css) — no
// scoped styles here.
import { computed, ref } from 'vue'
import {
  aggregateOutcomes, rektShort, dacSolution, PACKED_CATS,
  type CardOutcome, type PackedCategory, type PackedVerdict,
  type GeneratedPackedCard, type PackedItemSpec, type PackedItemResult, type PackedHintBadge
} from '../../composables/usePackedSentenceQuiz'
import { CONN_PLACEMENT, isPair } from '../../data/connectors'
import GermanSolutionText from '../../components/GermanSolutionText.vue'

const props = defineProps<{ history: CardOutcome[]; direction: 'en-de' | 'de-en' }>()
const emit = defineEmits<{ (e: 'restart'): void; (e: 'practice', cards: GeneratedPackedCard[]): void }>()

const CAT_META: Record<PackedCategory, { de: string; color: string }> = {
  verb: { de: 'Verben', color: 'var(--sage)' },
  noun: { de: 'Nomen', color: 'var(--cobalt)' },
  prep: { de: 'Präpositionen', color: 'var(--ochre)' },
  dac: { de: 'Da-Komposita', color: 'var(--clay)' },
  conn: { de: 'Konnektoren', color: 'var(--ink-soft)' }
}

const okCards = computed(() => props.history.filter(h => h.verdict === 'ok').length)
const wrongCards = computed(() => props.history.filter(h => h.verdict !== 'ok'))
const agg = computed(() => aggregateOutcomes(props.history))
const itemsTotal = computed(() => PACKED_CATS.reduce((s, c) => s + agg.value.cat[c].n, 0))
const itemsOk = computed(() => PACKED_CATS.reduce((s, c) => s + agg.value.cat[c].ok, 0))
const catsWithItems = computed(() => PACKED_CATS.filter(c => agg.value.cat[c].n > 0))
const tagList = computed(() => Object.entries(agg.value.tags).sort((a, b) => b[1] - a[1]))
const domainLabels = computed(() =>
  [...new Set(props.history.map(h => h.card.domain?.label).filter((l): l is string => !!l))]
)

function barPct(c: PackedCategory): number {
  const b = agg.value.cat[c]
  return b.n === 0 ? 0 : (b.ok / b.n) * 100
}

const openIdx = ref<number | null>(null)
function toggleRow(i: number): void {
  openIdx.value = openIdx.value === i ? null : i
}

function verdictMark(v: PackedVerdict): string {
  return v === 'ok' ? '✓' : v === 'part' ? '◐' : '✗'
}

function itemResult(h: CardOutcome, key: string): PackedItemResult | null {
  return h.items?.find(r => r.key === key) ?? null
}

function itemOk(h: CardOutcome, key: string): boolean {
  return itemResult(h, key)?.correct ?? false
}

function itemTags(h: CardOutcome, key: string): string[] {
  const r = itemResult(h, key)
  if (!r || r.correct) return []
  return r.tags ?? []
}

function spanTextFor(card: GeneratedPackedCard, key: string): string {
  return card.spans.filter(s => s.key === key).map(s => s.en).join(' … ')
}

function itemSolution(it: PackedItemSpec): string {
  if (it.cat === 'verb' && it.verb) return it.verb.german
  if (it.cat === 'noun' && it.noun) return `${it.noun.article} ${it.noun.german}`
  if (it.cat === 'prep' && it.prep) return it.prep.german
  if (it.cat === 'dac' && it.colloc) return dacSolution(it.colloc)
  if (it.cat === 'conn' && it.conn) return it.conn.display
  return ''
}

function itemRekt(it: PackedItemSpec): string | null {
  return it.cat === 'verb' && it.verb ? rektShort(it.verb.case) : null
}

/** Clause + position badges for a connector item; a pair names each part,
 *  since its two halves can place differently (zwar HZ I/III … aber HZ 0). */
function connBadges(it: PackedItemSpec): PackedHintBadge[] {
  if (it.cat !== 'conn' || !it.conn) return []
  const named = isPair(it.conn)
  return it.conn.parts.flatMap(p => {
    const pl = CONN_PLACEMENT[p.behavior]
    return [
      { text: named ? `${p.text}: ${pl.clause}` : pl.clause, tone: pl.clause === 'NZ' ? 'nz' : 'hz' } as PackedHintBadge,
      { text: `Pos. ${pl.position}`, tone: 'pos' } as PackedHintBadge
    ]
  })
}

function practice(): void {
  emit('practice', wrongCards.value.map(h => h.card))
}
</script>

<template>
  <div class="sna-wrap">
    <div class="breadcrumb">Kapitel XII · Satz · Auswertung</div>
    <div class="sn-res-head">
      <div class="sn-res-score">{{ okCards }}<span class="denom"> / {{ history.length }}</span></div>
      <div class="sn-res-sub">
        {{ history.length === 1 ? 'Karte' : 'Karten' }} ganz richtig<template v-if="itemsTotal > 0"> · {{ itemsOk }} von {{ itemsTotal }} Items getroffen</template><template v-if="direction === 'de-en'"> · DE → EN, nur Bedeutung bewertet</template>
      </div>
      <p v-if="domainLabels.length > 0" class="micro-mark">
        Fachgebiet: {{ domainLabels.join(' · ') }}
      </p>
    </div>

    <div v-if="itemsTotal > 0" class="sn-res-sec">
      <span class="micro-mark">Nach Kategorie</span>
      <div class="sna-res-bars">
        <div v-for="c in catsWithItems" :key="c" class="sna-bar">
          <span class="sna-bar-l">{{ CAT_META[c].de }}</span>
          <span class="sna-bar-t"><span class="sna-bar-f" :style="{ width: barPct(c) + '%', background: CAT_META[c].color }"></span></span>
          <span class="sna-bar-v">{{ agg.cat[c].ok }} / {{ agg.cat[c].n }}</span>
        </div>
      </div>
    </div>

    <div v-if="tagList.length > 0" class="sn-res-sec">
      <span class="micro-mark">Fehlerbild</span>
      <div class="sna-tagdist">
        <span v-for="[t, n] in tagList" :key="t" class="sna-tagd"><b>{{ n }}×</b>{{ t }}</span>
      </div>
    </div>
    <div v-if="direction === 'de-en'" class="sn-res-sec">
      <span class="micro-mark">Fehlerbild</span>
      <p class="grading-hint">In DE → EN gibt es keine Fehler-Tags — bewertet wird nur die Bedeutung.</p>
    </div>

    <div class="sn-res-sec">
      <span class="micro-mark">Karten</span>
      <div>
        <div v-for="(h, i) in history" :key="i" class="sna-resrow">
          <button class="sna-resrow-h" type="button" @click="toggleRow(i)">
            <span class="sn-check" :class="h.verdict === 'ok' ? 'ok' : 'no'" :style="h.verdict === 'part' ? { color: 'var(--ochre)' } : undefined">{{ verdictMark(h.verdict) }}</span>
            <span class="sna-resrow-src">{{ direction === 'de-en' ? h.card.german : h.card.english }}</span>
            <span class="micro-mark">{{ openIdx === i ? 'schließen' : 'öffnen' }}</span>
          </button>
          <div v-if="openIdx === i" class="sna-resrow-b">
            <div class="a-l">Deine Antwort</div>
            <div class="a-t" style="font-style: italic">{{ h.answer }}</div>
            <div class="a-l">Referenz</div>
            <div class="a-t"><template v-if="direction === 'de-en'">{{ h.card.english }}</template><GermanSolutionText v-else :text="h.card.german" :idiom="h.card.idiom" /></div>
            <div v-if="h.items" style="margin-top: 10px">
              <div v-for="it in h.card.items" :key="it.key" class="sna-row">
                <span class="sn-check" :class="itemOk(h, it.key) ? 'ok' : 'no'">{{ itemOk(h, it.key) ? '✓' : '✗' }}</span>
                <span class="r-en">{{ spanTextFor(h.card, it.key) }}</span>
                <span class="r-sol">{{ itemSolution(it) }}</span>
                <span class="r-meta">
                  <span v-if="itemRekt(it)" class="sn-rekt">{{ itemRekt(it) }}</span>
                  <span v-for="b in connBadges(it)" :key="b.text" class="sn-badge" :class="b.tone">{{ b.text }}</span>
                  <span v-if="itemTags(h, it.key).length" class="sn-tags">
                    <span v-for="t in itemTags(h, it.key)" :key="t" class="sn-tag">{{ t }}</span>
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="emit('restart')">← Neue Runde</button>
      <button v-if="wrongCards.length > 0 && direction === 'en-de'" class="btn btn-accent" type="button" @click="practice">
        Fehler üben · {{ wrongCards.length }} {{ wrongCards.length === 1 ? 'Karte' : 'Karten' }} →
      </button>
    </div>
  </div>
</template>
