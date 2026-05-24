<script setup lang="ts">
import { useRouter } from 'vue-router'
import { APP_VERSION } from '../data/changelog'

defineProps<{ variant?: 'header' | 'drawer' }>()

const router = useRouter()
function open() { router.push({ name: 'version' }) }
</script>

<template>
  <button
    v-if="variant === 'drawer'"
    type="button"
    class="version-badge version-badge-drawer"
    :aria-label="`Version ${APP_VERSION} — view changelog`"
    @click="open"
  >
    <span class="vb-prefix">v</span>
    <span class="vb-num">{{ APP_VERSION }}</span>
    <span class="vb-arrow" aria-hidden="true">→</span>
  </button>
  <button
    v-else
    type="button"
    class="version-badge"
    :aria-label="`Version ${APP_VERSION} — view changelog`"
    :title="`Version ${APP_VERSION} — view changelog`"
    @click="open"
  >
    <span class="vb-prefix">v</span>
    <span class="vb-num">{{ APP_VERSION }}</span>
  </button>
</template>
