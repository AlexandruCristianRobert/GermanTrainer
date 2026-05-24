<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTheme } from '../composables/useTheme'

const router = useRouter()
const route = useRoute()
const { resolved, toggle } = useTheme()

const drawerOpen = ref(false)

interface NavItem {
  route: string
  label: string
  de?: string
}

const items: NavItem[] = [
  { route: 'home', label: 'Home' },
  { route: 'nouns', label: 'Nouns', de: 'Substantive' },
  { route: 'adjectives', label: 'Adjectives', de: 'Adjektive' },
  { route: 'verbs', label: 'Verbs', de: 'Verben' },
  { route: 'prepositions', label: 'Prepositions', de: 'Präpositionen' },
  { route: 'declension', label: 'Declension', de: 'Deklination' },
  { route: 'history', label: 'History', de: 'Verlauf' },
  { route: 'settings', label: 'Settings', de: 'Einstellungen' }
]

const activeRoute = computed(() => {
  const name = (route.name as string) ?? 'home'
  // Strip subpath: 'nouns-quiz' / 'nouns-manage' / etc. map back to 'nouns'.
  const head = name.split('-')[0]
  return head || 'home'
})

function onSelect(target: string) {
  drawerOpen.value = false
  router.push({ name: target })
}

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

      <nav class="nav-links" aria-label="Primary">
        <button
          v-for="item in items"
          :key="item.route"
          class="nav-link"
          :class="{ active: activeRoute === item.route }"
          @click="onSelect(item.route)"
        >
          {{ item.label }}
        </button>
      </nav>

      <div class="nav-actions">
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
    <button
      v-for="item in items"
      :key="item.route"
      class="nav-link"
      :class="{ active: activeRoute === item.route }"
      @click="onSelect(item.route)"
    >
      {{ item.label }}
      <span v-if="item.de" class="drawer-de">{{ item.de }}</span>
    </button>
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
}

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
  transition: background .15s, color .15s, border-color .15s;
}
.icon-btn:hover { color: var(--ink); border-color: var(--ink-soft); }

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
