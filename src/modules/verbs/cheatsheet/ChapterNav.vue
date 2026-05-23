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
        @click="onSelect(c.id)"
      >
        <span class="chapter-nav-numeral">{{ c.numeral }}</span>
        <span class="chapter-nav-title">{{ c.titleDe }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.chapter-nav {
  position: sticky;
  top: 96px;
  width: 240px;
  font-size: 14px;
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

.chapter-nav-search:focus { border-bottom-color: var(--sage); }
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
  padding: 8px 12px;
  border-left: 2px solid transparent;
  cursor: pointer;
  color: var(--ink-soft);
  transition: opacity 200ms ease, border-color 280ms ease-out, color 200ms ease;
}

.chapter-nav-item:hover { color: var(--ink); }

.chapter-nav-item.active {
  border-left-color: var(--sage);
  color: var(--ink);
}

.chapter-nav-item.dim { opacity: 0.3; }

.chapter-nav-numeral {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 16px;
  color: var(--ink-soft);
}

.chapter-nav-item.active .chapter-nav-numeral { color: var(--sage); }

.chapter-nav-title {
  font-family: var(--font-body);
  line-height: 1.3;
}

/* Mobile: horizontal pill bar */
@media (max-width: 767px) {
  .chapter-nav {
    position: sticky;
    top: 0;
    width: 100%;
    background: var(--paper);
    border-bottom: 1px solid var(--rule);
    padding: 8px 0;
    z-index: 10;
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
