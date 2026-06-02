<script setup lang="ts">
import { ref, computed } from 'vue'
import SettingsApi from './SettingsApi.vue'
import SettingsDisplay from './SettingsDisplay.vue'
import SettingsPalette from './SettingsPalette.vue'
import SettingsData from './SettingsData.vue'

type TabId = 'api' | 'display' | 'palette' | 'data'

interface TabSpec {
  id: TabId
  numeral: string
  titleDe: string
  titleEn: string
  blurb: string
}

const TABS: TabSpec[] = [
  {
    id: 'api',
    numeral: 'I',
    titleDe: 'Schlüssel',
    titleEn: 'API · Gemini',
    blurb: 'Choose an AI provider — your Gemini API key, or local Claude when running in dev.'
  },
  {
    id: 'display',
    numeral: 'II',
    titleDe: 'Anzeige',
    titleEn: 'Display · Sizes',
    blurb: 'Type sizes for each quiz prompt. Each setting has its own live preview.'
  },
  {
    id: 'palette',
    numeral: 'III',
    titleDe: 'Farben',
    titleEn: 'Palette · Colors',
    blurb: 'Override design tokens per theme. Edit Light and Dark independently. Import and export as JSON.'
  },
  {
    id: 'data',
    numeral: 'IV',
    titleDe: 'Daten',
    titleEn: 'Data · Backup',
    blurb: 'Export every preference, quiz-setup choice, palette override, and the full quiz history as a single JSON file. Import that file on another device to bring it all back.'
  }
]

const activeTab = ref<TabId>('api')
const active = computed(() => TABS.find(t => t.id === activeTab.value) ?? TABS[0])
</script>

<template>
  <div class="page settings-page">
    <header class="section-header" style="margin-bottom: 32px;">
      <div>
        <div class="breadcrumb">Konfiguration · Einstellungen</div>
        <h1 class="section-title">Settings<em>.</em></h1>
        <p class="section-subtitle">
          API access, display sizes, and a custom palette. All stored on this device only.
        </p>
      </div>
    </header>

    <div class="settings-layout">
      <aside class="settings-rail">
        <div class="rail-label">Inhalt</div>
        <ol>
          <li v-for="t in TABS" :key="t.id">
            <button
              type="button"
              :class="{ active: activeTab === t.id }"
              @click="activeTab = t.id"
            >
              <span class="num">{{ t.numeral }}.</span>
              <span>
                {{ t.titleDe }}
                <span class="en">{{ t.titleEn }}</span>
              </span>
            </button>
          </li>
        </ol>
      </aside>

      <main class="settings-main">
        <div class="settings-tab-header">
          <span class="micro-mark">Kapitel {{ active.numeral }}</span>
          <h2 class="settings-tab-title">{{ active.titleDe }}<em>.</em></h2>
          <p class="settings-tab-blurb">{{ active.blurb }}</p>
          <hr class="settings-tab-rule" />
        </div>

        <SettingsApi v-if="activeTab === 'api'" />
        <SettingsDisplay v-else-if="activeTab === 'display'" />
        <SettingsPalette v-else-if="activeTab === 'palette'" />
        <SettingsData v-else-if="activeTab === 'data'" />
      </main>
    </div>
  </div>
</template>
