<script setup lang="ts">
interface Row {
  person: string
  form: string
}

defineProps<{
  verb: string
  rows: Row[]
  caption?: string
}>()
</script>

<template>
  <figure class="conj-table">
    <figcaption class="conj-caption">
      <span class="conj-caption-label">{{ caption ?? 'KONJUGATION' }}</span>
      <span class="conj-caption-verb">{{ verb }}</span>
    </figcaption>
    <div class="conj-rows">
      <div v-for="(r, i) in rows" :key="i" class="conj-row">
        <span class="conj-person">{{ r.person }}</span>
        <span class="conj-form" v-html="r.form" />
      </div>
    </div>
  </figure>
</template>

<style scoped>
.conj-table {
  margin: 22px 0;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: color-mix(in srgb, var(--paper-deep) 60%, var(--paper) 40%);
  position: relative;
}

.conj-caption {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 16px 8px;
  border-bottom: 1px solid var(--mute);
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.15em;
  color: var(--ink-soft);
}

.conj-caption-label { color: var(--mute); }
.conj-caption-verb {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 16px;
  letter-spacing: 0;
  color: var(--ink);
}

.conj-rows { padding: 10px 16px 14px; }

.conj-row {
  display: grid;
  grid-template-columns: 60px 1fr;
  align-items: baseline;
  padding: 4px 0;
  transition: background-color 150ms ease;
  border-radius: 1px;
}

.conj-row:hover { background: var(--paper-deep); }

.conj-person {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--ink-soft);
  font-size: 14px;
}

.conj-form {
  font-family: var(--font-mono);
  font-size: 14.5px;
  color: var(--ink);
  line-height: 1.55;
}
</style>
