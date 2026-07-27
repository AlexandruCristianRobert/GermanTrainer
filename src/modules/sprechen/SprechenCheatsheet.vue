<script setup lang="ts">
import { computed, ref } from 'vue'
import { MOVES, MOVE_LABEL, phrasesForMove } from '../../data/sprechenRedemittel'

type TabId = 'teil2'

interface TabSpec {
  id: TabId
  numeral: string
  titleDe: string
  titleEn: string
  blurb: string
}

// Single tab for now — Teil 1 (Vortrag) slots in as a sibling later.
const TABS: TabSpec[] = [
  {
    id: 'teil2',
    numeral: 'II',
    titleDe: 'Diskussion',
    titleEn: 'Teil 2 · Discussion',
    blurb: 'Redemittel for arguing a Topic: state, agree, disagree, weigh up, ask back, exemplify, conclude — and how the exam part works.'
  }
]

const activeTab = ref<TabId>('teil2')
const active = computed(() => TABS.find(t => t.id === activeTab.value) ?? TABS[0])

const moveNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
</script>

<template>
  <div class="page settings-page">
    <header class="section-header" style="margin-bottom: 32px;">
      <div>
        <div class="breadcrumb">Spickzettel · Cheatsheet</div>
        <h1 class="section-title">Sprechen<em>.</em></h1>
        <p class="section-subtitle">
          Stock phrases win discussions. Reach for the right Move, not the
          perfect sentence.
        </p>
      </div>
      <router-link :to="{ name: 'sprechen' }" class="btn btn-ghost">← Sprechen</router-link>
    </header>

    <div class="settings-layout">
      <aside class="settings-rail">
        <div class="rail-label">Teile</div>
        <ol>
          <li v-for="t in TABS" :key="t.id">
            <button type="button" :class="{ active: activeTab === t.id }" @click="activeTab = t.id">
              <span class="num">{{ t.numeral }}.</span>
              <span>{{ t.titleDe }} <span class="en">{{ t.titleEn }}</span></span>
            </button>
          </li>
        </ol>
      </aside>

      <main class="settings-main">
        <div class="settings-tab-header">
          <span class="micro-mark">Teil {{ active.numeral }}</span>
          <h2 class="settings-tab-title">{{ active.titleDe }}<em>.</em></h2>
          <p class="settings-tab-blurb">{{ active.blurb }}</p>
          <hr class="settings-tab-rule" />
        </div>

        <template v-if="activeTab === 'teil2'">
          <section class="rm-strategy">
            <h3 class="rm-heading">Strategie · how Teil 2 works</h3>
            <p>
              You and a partner discuss a controversial statement for about five
              minutes. Take a position early, react to your partner's arguments
              instead of monologuing, concede good points before countering, and
              close with a short summary. Graders reward <em>interaction</em>:
              agreeing, disagreeing, weighing up, and asking back all count.
            </p>
          </section>

          <section v-for="(m, i) in MOVES" :key="m" class="rm-group">
            <h3 class="rm-heading">
              <span class="rm-numeral">{{ moveNumerals[i] }}.</span>
              {{ MOVE_LABEL[m].de }}
              <span class="rm-en">{{ MOVE_LABEL[m].en }}</span>
            </h3>
            <ul class="rm-list">
              <li v-for="r in phrasesForMove(m)" :key="r.id">
                <span class="rm-phrase">{{ r.phraseDe }}</span>
                <span class="rm-note">{{ r.noteEn }}</span>
              </li>
            </ul>
          </section>
        </template>
      </main>
    </div>
  </div>
</template>

<style scoped>
.rm-strategy { max-width: 640px; margin-bottom: 36px; }
.rm-strategy p { font-size: 15px; line-height: 1.65; color: var(--ink-soft); }
.rm-group { margin-bottom: 36px; }
.rm-heading {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 10px 0;
}
.rm-numeral { color: var(--accent); margin-right: 6px; }
.rm-en {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
  margin-left: 10px;
}
.rm-list { list-style: none; padding: 0; margin: 0; max-width: 640px; }
.rm-list li {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: baseline;
  padding: 7px 0;
  border-bottom: 1px solid var(--hairline);
}
.rm-phrase { font-family: var(--font-display); font-size: 16px; }
.rm-note { color: var(--mute); font-size: 12.5px; font-style: italic; text-align: right; flex: 0 0 auto; max-width: 45%; }
@media (max-width: 560px) {
  .rm-list li { flex-direction: column; gap: 2px; }
  .rm-note { text-align: left; max-width: 100%; }
}
</style>
