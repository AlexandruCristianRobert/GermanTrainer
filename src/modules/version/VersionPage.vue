<script setup lang="ts">
import { useRouter } from 'vue-router'
import { APP_VERSION, CHANGELOG } from '../../data/changelog'
import { usePagination } from '../../composables/usePagination'
import Pagination from '../../components/Pagination.vue'

const router = useRouter()
const [major, minor, patch] = APP_VERSION.split('.').map(s => parseInt(s, 10))

const pagination = usePagination(() => CHANGELOG, 10, 'version')

function home() { router.push({ name: 'home' }) }
</script>

<template>
  <div class="page version-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Über · About</div>
        <h1 class="section-title">Versionen<em>.</em></h1>
        <p class="section-subtitle">
          A running ledger of changes — modules added, polish, the occasional course-correction.
        </p>
      </div>
      <button type="button" class="btn btn-ghost" @click="home">← Home</button>
    </header>

    <article class="version-masthead">
      <div class="vm-label">Currently running</div>
      <div class="vm-num">
        <span class="vm-part vm-major">{{ major }}</span>
        <span class="vm-dot">.</span>
        <span class="vm-part vm-minor">{{ String(minor).padStart(2, '0') }}</span>
        <span class="vm-dot">.</span>
        <span class="vm-part vm-patch">{{ String(patch).padStart(2, '0') }}</span>
      </div>
    </article>

    <Pagination :pagination="pagination" label="releases" />

    <ol class="version-list">
      <li
        v-for="entry in pagination.slice.value"
        :key="entry.version"
        class="version-entry"
        :class="[`kind-${entry.kind}`, { 'is-current': entry.version === APP_VERSION }]"
      >
        <div class="ve-meta">
          <div class="ve-version">
            <span class="ve-v">v</span>
            <span class="ve-num">
              <template v-for="(part, i) in entry.version.split('.')" :key="i">
                <span v-if="i > 0" class="ve-dot">.</span>
                <span :class="i === 0 ? 've-major' : i === 1 ? 've-minor' : 've-patch'">{{ part }}</span>
              </template>
            </span>
          </div>
          <div class="ve-date">{{ entry.date }}</div>
          <div class="ve-kind">{{ entry.kind }}</div>
          <div v-if="entry.version === APP_VERSION" class="ve-current-mark">● now</div>
        </div>
        <div class="ve-body">
          <h3 class="ve-title">{{ entry.title }}</h3>
          <ul class="ve-notes">
            <li v-for="(n, j) in entry.notes" :key="j" v-html="n" />
          </ul>
        </div>
      </li>
    </ol>

    <Pagination v-if="pagination.totalPages.value > 1" :pagination="pagination" label="releases" />

    <div class="version-footer">
      <p>
        Each commit bumps the version: <code>X</code> for a major redesign,
        <code>YY</code> for a new module, <code>ZZ</code> for everything else.
        The summary lands here on the next deploy.
      </p>
    </div>
  </div>
</template>

<style scoped>
.version-page { max-width: 880px; }
</style>
