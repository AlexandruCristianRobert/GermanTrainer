<!-- src/components/schreiben/NachbessernPanel.vue -->
<script setup lang="ts">
// Nachbessern (CONTEXT.md → "Nachbessern", ADR-0024): the one guided
// revision pass over the just-graded text. Deliberately part-agnostic —
// props are { text, corrections } and nothing else — so a later
// Forumsbeitrag adoption is wiring, not rework. Writes NOTHING: no store,
// no emit but 'done'. The draft lives and dies in this component.
import { computed, ref } from 'vue'
import type { NachrichtMistake } from '../../composables/useNachrichtGrader'
import { korrekturStatus, type KorrekturStatus } from '../../composables/useNachbessern'

const props = defineProps<{ text: string; mistakes: NachrichtMistake[] }>()
const emit = defineEmits<{ done: [] }>()

const draft = ref(props.text)

const STATUS_LABEL: Record<KorrekturStatus, string> = {
  offen: 'offen', geaendert: 'geändert', behoben: 'behoben'
}

const rows = computed(() =>
  props.mistakes.map((m, i) => ({
    m, i, status: korrekturStatus(draft.value, m.quote, m.suggested)
  }))
)
const behobenCount = computed(() => rows.value.filter(r => r.status === 'behoben').length)
const hasAmber = computed(() => rows.value.some(r => r.status === 'geaendert'))
</script>

<template>
  <div class="nb">
    <p class="nb-note">
      Arbeite die Korrekturen in deinen Text ein — lokal geprüft, nichts wird gespeichert.
      Verlässt du die Seite, ist der Text weg.
    </p>
    <textarea v-model="draft" class="nb-text" spellcheck="false" />
    <div class="nb-rows">
      <div v-for="r in rows" :key="r.i" class="nb-row">
        <span class="nb-status" :class="r.status">{{ STATUS_LABEL[r.status] }}</span>
        <span class="nb-quote">{{ r.m.quote }}</span>
        <span class="nb-arrow" aria-hidden="true">→</span>
        <span class="nb-suggested">{{ r.m.suggested || '(streichen)' }}</span>
      </div>
    </div>
    <p v-if="hasAmber" class="nb-amber-note">
      Geändert — ob die neue Fassung stimmt, kann nur die nächste Bewertung sagen.
    </p>
    <div class="nb-foot">
      <span class="nb-count">{{ behobenCount }} / {{ rows.length }} behoben</span>
      <button class="btn btn-ghost nb-done" type="button" @click="emit('done')">
        Fertig — Text verwerfen
      </button>
    </div>
  </div>
</template>

<style scoped>
.nb { margin-top: 16px; display: flex; flex-direction: column; gap: 12px; }
.nb-note { font-size: 13px; font-style: italic; color: var(--mute); margin: 0; }
.nb-text {
  width: 100%; min-height: 260px; background: var(--paper-deep); border: 0;
  padding: 14px 16px; font-family: var(--font-body); font-size: 16px;
  line-height: 1.6; color: var(--ink); resize: vertical;
}
.nb-text:focus { outline: 0; }
.nb-rows { display: flex; flex-direction: column; gap: 6px; }
.nb-row { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; font-size: 14px; }
.nb-status {
  font-family: var(--font-mono); font-size: 9.5px; letter-spacing: .14em;
  text-transform: uppercase; padding: 2px 7px 1px; border: 1px solid var(--hairline);
  color: var(--mute); flex: 0 0 auto;
}
.nb-status.behoben { color: var(--success); border-color: var(--success); }
.nb-status.geaendert { color: var(--ochre); border-color: var(--ochre); }
.nb-quote { color: var(--danger); text-decoration: line-through; }
.nb-arrow { color: var(--mute); }
.nb-suggested { color: var(--success); }
.nb-amber-note { font-size: 12.5px; font-style: italic; color: var(--ochre); margin: 0; }
.nb-foot { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.nb-count { font-family: var(--font-mono); font-size: 11px; color: var(--mute); }
</style>
