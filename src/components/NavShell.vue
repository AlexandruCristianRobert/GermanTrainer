<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTheme } from '../composables/useTheme'
import { NAV_GROUPS, NAV_SINGLES, NAV_SETTINGS, navMatches, type NavGroup, type NavLeaf } from '../data/nav'
import VersionBadge from './VersionBadge.vue'

const router = useRouter()
const route = useRoute()
const { resolved, toggle } = useTheme()

const drawerOpen = ref(false)
const openGroup = ref<string | null>(null)
const navEl = ref<HTMLElement | null>(null)

const routeName = computed(() => String(route.name ?? 'home'))

function leafActive(leaf: NavLeaf): boolean { return navMatches(routeName.value, leaf) }
function groupActive(g: NavGroup): boolean { return g.items.some(leafActive) }
function toggleGroup(id: string) { openGroup.value = openGroup.value === id ? null : id }

function closeGroup(focusTrigger = false) {
  const id = openGroup.value
  if (!id) return
  openGroup.value = null
  if (focusTrigger && navEl.value) {
    navEl.value.querySelector<HTMLElement>(`[data-group="${id}"]`)?.focus()
  }
}

function onSelect(target: string) {
  openGroup.value = null
  drawerOpen.value = false
  router.push({ name: target })
}

function onDocPointerDown(e: PointerEvent) {
  if (!openGroup.value || !navEl.value) return
  if (e.target instanceof Node && !navEl.value.contains(e.target)) openGroup.value = null
}

// Route navigation (including within-group selections) always closes an open panel.
watch(() => route.fullPath, () => { openGroup.value = null })

onMounted(() => document.addEventListener('pointerdown', onDocPointerDown))
onUnmounted(() => document.removeEventListener('pointerdown', onDocPointerDown))

const isDark = computed(() => resolved.value === 'dark')
const themeAriaLabel = computed(() =>
  isDark.value ? 'Switch to light theme' : 'Switch to dark theme'
)
</script>

<template>
  <header class="nav" data-print-hide>
    <div class="nav-inner">
      <a
        class="nav-mark"
        href="#"
        @click.prevent="onSelect('home')"
      >
        <span class="mark-title">Grammatik</span>
        <span class="mark-sub">Atelier · German Trainer</span>
      </a>

      <nav ref="navEl" class="nav-links" aria-label="Primary" @keydown.escape="closeGroup(true)">
        <div
          v-for="g in NAV_GROUPS"
          :key="g.id"
          class="nav-group"
        >
          <button
            type="button"
            class="nav-link nav-trigger"
            :class="{ active: groupActive(g) }"
            :data-group="g.id"
            aria-haspopup="menu"
            :aria-expanded="openGroup === g.id"
            @click="toggleGroup(g.id)"
          >
            {{ g.label }}<span class="nav-chevron" aria-hidden="true">▾</span>
          </button>
          <div v-if="openGroup === g.id" class="nav-panel" role="menu">
            <button
              v-for="leaf in g.items"
              :key="leaf.route"
              type="button"
              class="nav-link"
              role="menuitem"
              :class="{ active: leafActive(leaf) }"
              @click="onSelect(leaf.route)"
            >
              {{ leaf.label }}
            </button>
          </div>
        </div>

        <button
          v-for="leaf in NAV_SINGLES"
          :key="leaf.route"
          type="button"
          class="nav-link"
          :class="{ active: leafActive(leaf) }"
          @click="onSelect(leaf.route)"
        >
          {{ leaf.label }}
        </button>
      </nav>

      <div class="nav-actions">
        <VersionBadge variant="header" />
        <button
          class="icon-btn"
          :class="{ active: leafActive(NAV_SETTINGS) }"
          aria-label="Settings"
          @click="onSelect(NAV_SETTINGS.route)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button
          class="icon-btn"
          :aria-label="themeAriaLabel"
          @click="toggle"
        >
          <svg
            v-if="!isDark"
            width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor"
            stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <svg
            v-else
            width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor"
            stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        </button>
        <button
          class="icon-btn nav-burger"
          aria-label="Open menu"
          @click="drawerOpen = true"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      </div>
    </div>
  </header>

  <div
    class="drawer-backdrop"
    :class="{ open: drawerOpen }"
    @click="drawerOpen = false"
  />
  <aside
    class="drawer"
    :class="{ open: drawerOpen }"
    aria-label="Mobile navigation"
  >
    <div class="drawer-mark">
      <div class="mark-title">Grammatik</div>
      <div class="mark-sub">Atelier · German Trainer</div>
    </div>

    <template v-for="g in NAV_GROUPS" :key="g.id">
      <div class="drawer-group-label">{{ g.label }}</div>
      <button
        v-for="leaf in g.items"
        :key="leaf.route"
        class="nav-link"
        :class="{ active: leafActive(leaf) }"
        @click="onSelect(leaf.route)"
      >
        {{ leaf.label }}
        <span v-if="leaf.de" class="drawer-de">{{ leaf.de }}</span>
      </button>
    </template>

    <button
      v-for="leaf in NAV_SINGLES"
      :key="leaf.route"
      class="nav-link"
      :class="{ active: leafActive(leaf) }"
      @click="onSelect(leaf.route)"
    >
      {{ leaf.label }}
      <span v-if="leaf.de" class="drawer-de">{{ leaf.de }}</span>
    </button>

    <button
      class="nav-link"
      :class="{ active: leafActive(NAV_SETTINGS) }"
      @click="onSelect(NAV_SETTINGS.route)"
    >
      {{ NAV_SETTINGS.label }}
      <span v-if="NAV_SETTINGS.de" class="drawer-de">{{ NAV_SETTINGS.de }}</span>
    </button>

    <VersionBadge variant="drawer" />
  </aside>

  <div class="app-shell">
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in oklab, var(--paper) 88%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--hairline);
}

.nav-inner {
  max-width: 1240px;
  margin: 0 auto;
  padding: 18px 48px;
  display: flex;
  align-items: center;
  gap: 32px;
}

@media (max-width: 720px) {
  .nav-inner { padding: 14px 20px; gap: 16px; }
}

.nav-mark {
  display: flex;
  flex-direction: column;
  line-height: 1;
  text-decoration: none;
  color: inherit;
  border-bottom: 0;
}
.nav-mark .mark-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-style: italic;
  font-size: 22px;
  letter-spacing: -0.01em;
  color: var(--ink);
}
.nav-mark .mark-sub {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--mute);
  margin-top: 3px;
}

.nav-links {
  display: flex;
  gap: 4px;
  margin-left: auto;
  align-items: center;
}

.nav-group { position: relative; }

.nav-link {
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--ink-soft);
  background: none;
  border: 0;
  padding: 8px 14px;
  cursor: pointer;
  position: relative;
  border-radius: 2px;
}
.nav-link:hover { color: var(--ink); }
.nav-link.active { color: var(--ink); }
.nav-link.active::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 2px;
  height: 2px;
  background: var(--accent);
}

.nav-trigger { display: inline-flex; align-items: center; }
.nav-chevron {
  font-size: 10px;
  margin-left: 4px;
  color: var(--mute);
}

.nav-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 200px;
  background: var(--paper);
  border: 1px solid var(--hairline);
  border-radius: 2px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, .10);
  padding: 6px;
  z-index: 60;
  display: flex;
  flex-direction: column;
}
.nav-panel .nav-link {
  text-align: left;
  width: 100%;
}
.nav-panel .nav-link.active::after { display: none; }
.nav-panel .nav-link.active { color: var(--accent); }

.nav-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.icon-btn {
  background: none;
  border: 1px solid var(--hairline);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--ink-soft);
  transition: background .15s, color .15s, border-color .15s, box-shadow .15s;
}
.icon-btn:hover { color: var(--ink); border-color: var(--ink-soft); }
.icon-btn.active {
  color: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--accent) 35%, transparent);
}

.nav-burger { display: none; }

@media (max-width: 720px) {
  .nav-links { display: none; }
  .nav-burger { display: inline-flex; }
  .nav-mark .mark-title { font-size: 18px; }
  .nav-mark .mark-sub { font-size: 8.5px; }
}

/* Mobile drawer */
.drawer-backdrop {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.32);
  z-index: 90;
  opacity: 0; pointer-events: none;
  transition: opacity .2s;
}
.drawer-backdrop.open { opacity: 1; pointer-events: auto; }

.drawer {
  position: fixed;
  top: 0; left: 0; bottom: 0;
  width: 280px; max-width: 80vw;
  background: var(--paper);
  border-right: 1px solid var(--hairline);
  z-index: 100;
  transform: translateX(-100%);
  transition: transform .26s ease;
  padding: 24px 20px;
  display: flex; flex-direction: column; gap: 4px;
  overflow-y: auto;
}
.drawer.open { transform: translateX(0); }
.drawer .drawer-mark { margin-bottom: 24px; }
.drawer .drawer-mark .mark-title {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 22px;
  font-weight: 600;
  color: var(--ink);
}
.drawer .drawer-mark .mark-sub {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--mute);
  margin-top: 3px;
}
.drawer-group-label {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: .28em;
  text-transform: uppercase;
  color: var(--mute);
  margin: 14px 0 2px;
}
.drawer .nav-link {
  text-align: left;
  font-size: 17px;
  padding: 12px 8px;
  border-bottom: 1px dotted var(--hairline);
  border-radius: 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.drawer .nav-link.active::after { display: none; }
.drawer .nav-link.active { color: var(--accent); }
.drawer .drawer-de {
  font-family: var(--font-display);
  font-style: italic;
  color: var(--mute);
  font-size: 14px;
}

.app-shell {
  position: relative;
  z-index: 1;
}
</style>
