<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NModal, NForm, NFormItem, NInput, NSelect, NButton, NSpace } from 'naive-ui'

type FieldType = 'text' | 'gender' | 'select'
interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: Array<{ label: string; value: string }>
}

const props = defineProps<{
  show: boolean
  title: string
  fields: FieldDef[]
  initial: Record<string, string>
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'submit', value: Record<string, string>): void
}>()

const form = ref<Record<string, string>>({ ...props.initial })

watch(() => props.show, (v) => { if (v) form.value = { ...props.initial } })

const genderOptions = [
  { label: 'der', value: 'der' },
  { label: 'die', value: 'die' },
  { label: 'das', value: 'das' }
]

const canSubmit = computed(() =>
  props.fields.every(f => (form.value[f.key] ?? '').trim().length > 0)
)

function close() { emit('update:show', false) }
function submit() { if (canSubmit.value) emit('submit', { ...form.value }) }
</script>

<template>
  <n-modal :show="show" @update:show="emit('update:show', $event)" preset="card" :title="title" style="max-width: 480px">
    <n-form label-placement="top">
      <n-form-item v-for="f in fields" :key="f.key" :label="f.label">
        <n-select
          v-if="f.type === 'gender'"
          v-model:value="form[f.key]"
          :options="genderOptions"
        />
        <n-select
          v-else-if="f.type === 'select'"
          v-model:value="form[f.key]"
          :options="f.options ?? []"
          filterable
        />
        <n-input v-else v-model:value="form[f.key]" />
      </n-form-item>
      <n-space>
        <n-button @click="close">Cancel</n-button>
        <n-button type="primary" :disabled="!canSubmit" @click="submit">Save</n-button>
      </n-space>
    </n-form>
  </n-modal>
</template>
