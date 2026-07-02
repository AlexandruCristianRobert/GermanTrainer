<script setup lang="ts">
import { nextTick, ref } from 'vue'
// Shared cheatsheet chrome — reuse the verb Cheatsheet's global styles + primitives.
import '../verbs/cheatsheet/cheatsheet.css'
import ChapterNav, { type Chapter } from '../verbs/cheatsheet/ChapterNav.vue'
import Callout from '../verbs/cheatsheet/Callout.vue'
import {
  PREP_CHEATSHEET, collocation,
  type CheatChapter, type CheatGroup,
} from '../../data/prepCheatsheet'
import type { CollocationCase } from '../../data/collocations'

const chapters: Chapter[] = PREP_CHEATSHEET.map(ch => ({
  id: ch.id,
  numeral: ch.numeral,
  titleDe: ch.prep,
  titleEn: ch.coreIdea,
}))

const searchQuery = ref('')

function onSelect(id: string) {
  if (typeof document === 'undefined') return
  const el = document.getElementById(id)
  if (!el) return
  nextTick(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

function caseName(c: CollocationCase): string {
  return c === 'accusative' ? 'Akkusativ' : 'Dativ'
}

// Resolve a group's featured ids into collocations (dropping any that go missing).
function items(group: CheatGroup) {
  return group.ids.map(collocation).filter((c): c is NonNullable<typeof c> => Boolean(c))
}

// One illustrative sentence per group — the first featured collocation's example.
function sentence(group: CheatGroup): string | null {
  return items(group)[0]?.example ?? null
}

// Show the case per group only when the chapter actually splits across cases.
function showsCase(ch: CheatChapter): boolean {
  return ch.groups.length > 1
}
</script>

<template>
  <div class="page grammatik">
    <header class="section-header cheatsheet-section-header" data-print-hide>
      <div>
        <div class="breadcrumb">Kapitel IV · Präpositionen · Cheatsheet</div>
        <h1 class="section-title">Feste Präpositionen<em>.</em></h1>
        <p class="section-subtitle">
          A Spickzettel for the fixed prepositions — grouped by preposition, each with the
          core idea it carries and a few examples to anchor it. Meaning hooks, not rules.
        </p>
      </div>
      <div>
        <router-link :to="{ name: 'prepositions' }" class="btn btn-ghost back-link">← Präpositionen</router-link>
      </div>
    </header>

    <div class="grammatik-layout">
      <ChapterNav
        :chapters="chapters"
        :search-query="searchQuery"
        @update:search-query="searchQuery = $event"
        @select="onSelect"
      />

      <main class="grammatik-main">
        <section
          v-for="ch in PREP_CHEATSHEET"
          :id="ch.id"
          :key="ch.id"
          class="chapter"
        >
          <div class="chapter-numeral">{{ ch.numeral }}</div>
          <h2 class="chapter-title prep-title">{{ ch.prep }}</h2>
          <p class="chapter-subtitle">{{ ch.coreIdea }}</p>
          <hr class="rule" />

          <div
            v-for="group in ch.groups"
            :key="group.case"
            class="prep-group"
          >
            <h3 v-if="showsCase(ch)" class="pattern-heading">
              {{ ch.prep }} + {{ caseName(group.case) }}
            </h3>
            <p v-if="group.idea" class="group-idea">{{ group.idea }}</p>

            <ul class="colloc-list">
              <li v-for="c in items(group)" :key="c.id" class="colloc-row">
                <span class="colloc-term">{{ c.word }} <span class="colloc-prep">{{ c.preposition }}</span></span>
                <span class="colloc-gloss">{{ c.english }}</span>
              </li>
            </ul>

            <p v-if="sentence(group)" class="example-sentence">» {{ sentence(group) }}</p>
          </div>

          <Callout v-if="ch.hook" :kind="ch.hook.kind">
            <p v-html="ch.hook.html"></p>
          </Callout>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.cheatsheet-section-header { margin-bottom: 48px; }
.back-link { text-decoration: none; border-bottom: 0; }

.grammatik-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 64px;
  max-width: 1160px;
  margin: 0 auto;
  align-items: start;
}
.grammatik-main { max-width: 720px; }

.chapter {
  position: relative;
  margin: 0 0 88px 0;
  scroll-margin-top: 96px;
  animation: chapter-in 400ms ease-out both;
}
.chapter:first-of-type { margin-top: 0; }

@keyframes chapter-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.chapter-numeral {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  line-height: 1;
  color: var(--accent);
  margin-bottom: 14px;
}
.chapter-numeral::before { content: 'Kapitel '; color: var(--mute); }

.chapter-title { font-size: 44px; font-weight: 600; line-height: 1.1; margin-bottom: 4px; }
.prep-title { font-style: italic; color: var(--accent); }
.chapter-subtitle { font-size: 18px; font-style: italic; color: var(--ink-soft); margin: 0; }

.prep-group { margin-bottom: 8px; }

.pattern-heading {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  margin: 22px 0 2px 0;
  color: var(--accent);
}
.group-idea {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 15px;
  color: var(--ink-soft);
  margin: 0 0 10px 0;
}

.colloc-list {
  list-style: none;
  margin: 12px 0 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 28px;
}
.colloc-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: 5px 0;
  border-bottom: 1px dotted var(--hairline);
}
.colloc-term {
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--ink);
}
.colloc-prep {
  color: var(--accent);
  font-weight: 600;
}
.colloc-gloss {
  font-family: var(--font-body);
  font-size: 13px;
  font-style: italic;
  color: var(--mute);
  text-align: right;
  white-space: nowrap;
}

.example-sentence {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 16px;
  color: var(--ink-soft);
  margin: 14px 0 0 0;
}

/* Tablet — 640–1023px */
@media (max-width: 1023px) {
  .grammatik-layout { grid-template-columns: 1fr; gap: 24px; }
  .chapter-title { font-size: 36px; }
}

/* Mobile — < 640px */
@media (max-width: 639px) {
  .chapter { margin: 0 0 56px 0; }
  .chapter-title { font-size: 30px; }
  .chapter-subtitle { font-size: 16px; }
  .colloc-list { grid-template-columns: 1fr; gap: 0; }
  .colloc-gloss { white-space: normal; }
}
</style>
