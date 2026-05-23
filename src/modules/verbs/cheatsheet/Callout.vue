<script setup lang="ts">
import { computed } from 'vue'

type Kind = 'note' | 'exception' | 'example'

const props = defineProps<{
  kind: Kind
  label?: string
}>()

const DEFAULT_LABELS: Record<Kind, string> = {
  note: 'BEACHTE',
  exception: 'AUSNAHME',
  example: 'BEISPIELE'
}

const resolvedLabel = computed(() => props.label ?? DEFAULT_LABELS[props.kind])
</script>

<template>
  <aside class="callout" :class="`callout--${kind}`">
    <div class="callout-label">{{ resolvedLabel }}</div>
    <div class="callout-body">
      <slot />
    </div>
  </aside>
</template>

<style scoped>
.callout {
  --accent: var(--mute);
  border-left: 4px solid var(--accent);
  padding: 12px 0 12px 18px;
  margin: 18px 0;
  background: linear-gradient(to right, color-mix(in srgb, var(--accent) 6%, transparent), transparent 60%);
}

.callout--note      { --accent: var(--ochre); }
.callout--exception { --accent: var(--clay); }
.callout--example   { --accent: var(--cobalt); }

.callout-label {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.18em;
  color: var(--accent);
  margin-bottom: 6px;
}

.callout-body {
  font-size: 15px;
  line-height: 1.6;
  color: var(--ink-soft);
}

.callout-body :deep(p:last-child) { margin-bottom: 0; }
.callout-body :deep(em),
.callout--example .callout-body { font-style: italic; }
</style>
