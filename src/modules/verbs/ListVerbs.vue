<script setup lang="ts">
import { computed, ref } from 'vue'
import { NSpace, NDataTable, NInput, NCheckboxGroup, NCheckbox } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { useVerbs } from '../../composables/useVerbs'
import { VERB_LEVELS, VERB_TYPES, VERB_CASES, type Verb, type VerbLevel, type VerbType, type VerbCase } from '../../data/verbs'

const { all } = useVerbs()

const search = ref('')
const selectedLevels = ref<VerbLevel[]>([...VERB_LEVELS])
const selectedTypes = ref<VerbType[]>([...VERB_TYPES])
const selectedCases = ref<VerbCase[]>([...VERB_CASES])

const rows = computed(() => {
  const s = search.value.trim().toLowerCase()
  return all().filter(v => {
    if (!selectedLevels.value.includes(v.level)) return false
    if (!selectedTypes.value.includes(v.type)) return false
    if (!selectedCases.value.includes(v.case)) return false
    if (s && !v.german.toLowerCase().includes(s) && !v.english.toLowerCase().includes(s)) return false
    return true
  })
})

const columns: DataTableColumns<Verb> = [
  { title: 'German', key: 'german' },
  { title: 'English', key: 'english' },
  { title: 'Level', key: 'level', width: 80 },
  { title: 'Type', key: 'type', width: 110 },
  { title: 'Case', key: 'case', width: 160 },
  { title: 'Aux', key: 'auxiliary', width: 80 }
]
</script>

<template>
  <n-space vertical size="large">
    <h2>Verbs</h2>
    <n-input v-model:value="search" placeholder="Search German or English…" clearable />
    <n-space :wrap="true" size="large">
      <div>
        <p><strong>Level</strong></p>
        <n-checkbox-group v-model:value="selectedLevels">
          <n-space>
            <n-checkbox v-for="l in VERB_LEVELS" :key="l" :value="l" :label="l" />
          </n-space>
        </n-checkbox-group>
      </div>
      <div>
        <p><strong>Type</strong></p>
        <n-checkbox-group v-model:value="selectedTypes">
          <n-space :wrap="true">
            <n-checkbox v-for="t in VERB_TYPES" :key="t" :value="t" :label="t" />
          </n-space>
        </n-checkbox-group>
      </div>
      <div>
        <p><strong>Case</strong></p>
        <n-checkbox-group v-model:value="selectedCases">
          <n-space :wrap="true">
            <n-checkbox v-for="c in VERB_CASES" :key="c" :value="c" :label="c" />
          </n-space>
        </n-checkbox-group>
      </div>
    </n-space>
    <n-data-table
      :columns="columns"
      :data="rows"
      :pagination="{ pageSize: 25 }"
      :bordered="false"
    />
  </n-space>
</template>
