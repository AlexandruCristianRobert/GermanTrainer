<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

export interface Chapter {
  id: string
  numeral: string
  titleDe: string
  titleEn: string
}

const props = defineProps<{
  chapters: Chapter[]
  searchQuery: string
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', value: string): void
  (e: 'select', id: string): void
}>()

const activeId = ref<string | null>(null)

function matchesQuery(c: Chapter, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  return c.titleDe.toLowerCase().includes(needle) ||
         c.titleEn.toLowerCase().includes(needle)
}

const items = computed(() =>
  props.chapters.map(c => ({
    ...c,
    dim: !matchesQuery(c, props.searchQuery)
  }))
)

function onSelect(id: string) {
  emit('select', id)
}

function onSearchInput(e: Event) {
  const v = (e.target as HTMLInputElement).value
  emit('update:searchQuery', v)
}

// IntersectionObserver scroll-spy
let observer: IntersectionObserver | null = null
onMounted(() => {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return
  observer = new IntersectionObserver(
    entries => {
      const visible = entries.filter(e => e.isIntersecting)
      if (visible.length > 0) {
        // pick the topmost visible
        visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        activeId.value = visible[0].target.id
      }
    },
    { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
  )
  for (const c of props.chapters) {
    const el = document.getElementById(c.id)
    if (el) observer.observe(el)
  }
})
onUnmounted(() => observer?.disconnect())
</script>

<template>
  <nav class="chapter-nav" data-print-hide>
    <div class="chapter-nav-head">INHALT</div>
    <label class="sr-only" for="chapter-search">Search chapters</label>
    <input
      id="chapter-search"
      class="chapter-nav-search"
      type="search"
      placeholder="Suche…"
      :value="searchQuery"
      @input="onSearchInput"
    />
    <ol class="chapter-nav-list">
      <li
        v-for="c in items"
        :key="c.id"
        class="chapter-nav-item"
        :class="{ active: c.id === activeId, dim: c.dim }"
        :aria-current="c.id === activeId ? 'location' : undefined"
        tabindex="0"
        role="link"
        @click="onSelect(c.id)"
        @keydown.enter.prevent="onSelect(c.id)"
        @keydown.space.prevent="onSelect(c.id)"
      >
        <span class="chapter-nav-numeral">{{ c.numeral.toLowerCase() }}.</span>
        <span class="chapter-nav-title-block">
          <span class="chapter-nav-title">{{ c.titleDe }}</span>
          <span class="chapter-nav-sub">{{ c.titleEn }}</span>
        </span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.chapter-nav {
  position: sticky;
  top: 24px;
  width: 240px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  font-size: 14px;
}

.chapter-nav::-webkit-scrollbar { width: 6px; }
.chapter-nav::-webkit-scrollbar-track { background: transparent; }
.chapter-nav::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--mute) 50%, transparent);
  border-radius: 3px;
}

.chapter-nav-head {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.2em;
  color: var(--mute);
  margin-bottom: 12px;
}

.chapter-nav-search {
  width: 100%;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--rule);
  padding: 6px 0;
  font-family: var(--font-body);
  font-style: italic;
  color: var(--ink);
  outline: none;
  margin-bottom: 18px;
  font-size: 14px;
}

.chapter-nav-search:focus { border-bottom-color: var(--accent); }
.chapter-nav-search::placeholder { color: var(--mute); font-style: italic; }

.chapter-nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.chapter-nav-item {
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: 8px;
  align-items: baseline;
  padding: 10px 0 10px 14px;
  border-left: 2px solid transparent;
  border-bottom: 1px dotted var(--hairline);
  cursor: pointer;
  color: var(--ink-soft);
  transition: opacity 200ms ease, border-color 280ms ease-out, color 200ms ease;
}

.chapter-nav-item:hover { color: var(--ink); }

.chapter-nav-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  color: var(--ink);
}

.chapter-nav-item.active {
  border-left-color: var(--accent);
  color: var(--ink);
}

.chapter-nav-item.dim { opacity: 0.32; }

.chapter-nav-title-block {
  display: flex;
  flex-direction: column;
  gap: 1px;
  line-height: 1.25;
}
.chapter-nav-sub {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 12.5px;
  color: var(--mute);
}

.chapter-nav-numeral {
  font-family: var(--font-mono);
  font-style: normal;
  font-size: 12px;
  color: var(--mute);
  flex: 0 0 28px;
  letter-spacing: 0.04em;
}

.chapter-nav-item.active .chapter-nav-numeral { color: var(--accent); }

.chapter-nav-title {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 15px;
  line-height: 1.25;
  color: var(--ink);
}

/* Tablet — compact pill bar (640–1023px) */
@media (min-width: 640px) and (max-width: 1023px) {
  .chapter-nav {
    position: sticky;
    top: 0;
    width: 100%;
    background: var(--paper);
    border-bottom: 1px solid var(--rule);
    padding: 12px 16px;
    z-index: 10;
    max-height: none;
    overflow: visible;
  }
  .chapter-nav-head { display: none; }
  .chapter-nav-search { margin-bottom: 12px; }
  .chapter-nav-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chapter-nav-item {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    border: 1px solid var(--rule);
    border-radius: 999px;
    padding: 6px 12px;
    min-height: 36px;
    border-left: 1px solid var(--rule);
  }
  .chapter-nav-item.active {
    background: var(--sage-tint);
    border-color: var(--sage);
    border-left-color: var(--sage);
  }
}

/* Mobile — horizontal pill scroll (< 640px) */
@media (max-width: 639px) {
  .chapter-nav {
    position: sticky;
    top: 0;
    width: 100%;
    background: var(--paper);
    border-bottom: 1px solid var(--rule);
    padding: 8px 0;
    z-index: 10;
    max-height: none;
    overflow: visible;
  }
  .chapter-nav-head { display: none; }
  .chapter-nav-search { margin-bottom: 8px; }
  .chapter-nav-list {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .chapter-nav-list::-webkit-scrollbar { display: none; }
  .chapter-nav-item {
    display: inline-flex;
    gap: 6px;
    flex-shrink: 0;
    padding: 8px 14px;
    border: 1px solid var(--rule);
    border-left: 1px solid var(--rule);
    border-radius: 999px;
    background: var(--paper);
    white-space: nowrap;
    min-height: 44px;
  }
  .chapter-nav-item.active {
    border-left-color: var(--rule);
    border-color: var(--sage);
    background: color-mix(in srgb, var(--sage) 10%, var(--paper));
  }
}
</style>
