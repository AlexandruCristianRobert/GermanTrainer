<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../../db'
import type { WritingDraft, WritingPrompt, WritingTaskType } from '../../data/writingPrompts'
import { WRITING_TASK_LABEL, WRITING_TASK_BLURB } from '../../data/writingPrompts'
import { filterByTaskType, getPromptById } from '../../composables/useWritingPrompts'
import { useToast } from '../../composables/useToast'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const taskType = computed(() => (route.params.taskType as string | undefined) as WritingTaskType | undefined)
const promptId = computed(() => route.params.promptId as string | undefined)

// Two views in one component: list of prompts for a task type, or detail of one prompt.
const mode = computed<'list' | 'detail'>(() => promptId.value ? 'detail' : 'list')

const promptsInType = computed<WritingPrompt[]>(() =>
  taskType.value ? filterByTaskType(taskType.value) : []
)

const currentPrompt = computed<WritingPrompt | null>(() =>
  promptId.value ? getPromptById(promptId.value) : null
)

const drafts = ref<WritingDraft[]>([])

async function loadDrafts() {
  if (!promptId.value) {
    drafts.value = []
    return
  }
  const rows = await db.writingDrafts.where('promptId').equals(promptId.value).toArray()
  drafts.value = rows.sort((a, b) => b.createdAt - a.createdAt)
}

onMounted(loadDrafts)
watch(promptId, loadDrafts)

function newDraft() {
  if (!currentPrompt.value) return
  router.push({ name: 'writing-draft-new', params: { promptId: currentPrompt.value.id } })
}

function openDraft(d: WritingDraft) {
  router.push({
    name: 'writing-draft',
    params: { promptId: d.promptId, draftId: d.id }
  })
}

async function deleteDraft(d: WritingDraft) {
  const sure = confirm(`Delete draft from ${new Date(d.createdAt).toLocaleString()}?`)
  if (!sure) return
  await db.writingDrafts.delete(d.id)
  await loadDrafts()
  toast.success('Draft deleted')
}

function compareToPrevious(d: WritingDraft) {
  const graded = drafts.value.filter(x => x.id !== d.id && x.result)
  const previous = graded[0]
  if (!previous) {
    toast.info('No previous graded draft to compare to.')
    return
  }
  router.push({ name: 'writing-compare', params: { draftA: previous.id, draftB: d.id } })
}

function backToTaskList() { router.push({ name: 'writing' }) }
function backToTaskType() {
  if (currentPrompt.value) {
    router.push({ name: 'writing-task', params: { taskType: currentPrompt.value.type } })
  } else {
    backToTaskList()
  }
}
</script>

<template>
  <!-- List mode: prompts for a task type ───────────────────────── -->
  <div v-if="mode === 'list' && taskType" class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Schreiben · {{ WRITING_TASK_LABEL[taskType] }}</div>
        <h1 class="section-title">{{ WRITING_TASK_LABEL[taskType] }}<em>.</em></h1>
        <p class="section-subtitle">{{ WRITING_TASK_BLURB[taskType] }}</p>
      </div>
    </header>

    <ul class="prompt-list">
      <li v-for="p in promptsInType" :key="p.id" class="prompt-row card interactive"
        role="button" tabindex="0"
        @click="router.push({ name: 'writing-prompt', params: { promptId: p.id } })"
        @keydown.enter="router.push({ name: 'writing-prompt', params: { promptId: p.id } })"
      >
        <div class="prompt-row-title">{{ p.titleDe }}</div>
        <div class="prompt-row-meta">{{ p.targetWords.target }} Wörter · {{ p.suggestedMinutes }} min · {{ p.defaultRubric }}</div>
      </li>
    </ul>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="backToTaskList">← Back</button>
    </div>
  </div>

  <!-- Detail mode: one prompt + its draft history ────────────────── -->
  <div v-else-if="mode === 'detail' && currentPrompt" class="page detail-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Schreiben · {{ WRITING_TASK_LABEL[currentPrompt.type] }} · {{ currentPrompt.titleDe }}</div>
        <h1 class="section-title">{{ currentPrompt.titleDe }}<em>.</em></h1>
        <p class="section-subtitle">{{ WRITING_TASK_BLURB[currentPrompt.type] }} · Ziel {{ currentPrompt.targetWords.target }} Wörter</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-accent" type="button" @click="newDraft">Neuer Entwurf <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="prompt-card prompt-detail-card">
      <div class="prompt-detail-text">{{ currentPrompt.promptText }}</div>
      <div v-if="currentPrompt.promptContext" class="prompt-detail-context">
        <span class="prompt-detail-context-label">Kontext</span>
        <div class="prompt-detail-context-text">{{ currentPrompt.promptContext }}</div>
      </div>
      <div class="prompt-detail-meta">
        <span>{{ currentPrompt.targetWords.min }}–{{ currentPrompt.targetWords.max }} Wörter</span>
        <span>· {{ currentPrompt.suggestedMinutes }} Min</span>
        <span>· Rubrik: {{ currentPrompt.defaultRubric }}</span>
      </div>
    </div>

    <section class="drafts-section">
      <h3 class="drafts-title">Drafts ({{ drafts.length }})</h3>
      <div v-if="drafts.length === 0" class="micro-mark">No drafts yet. Click "Neuer Entwurf" to start.</div>
      <ul v-else class="draft-list">
        <li v-for="d in drafts" :key="d.id" class="draft-row card">
          <div class="draft-row-meta">
            <span>{{ new Date(d.createdAt).toLocaleString() }}</span>
            <span>· {{ d.wordCount }} Wörter</span>
            <span v-if="d.result">· {{ d.result.totalScore }} / 100 · {{ d.result.bandEstimate }}</span>
            <span v-if="d.result">· {{ d.rubric }}</span>
            <span v-else class="draft-row-unmarked">· nicht benotet</span>
          </div>
          <div class="draft-row-actions">
            <button class="btn btn-quiet" type="button" @click="openDraft(d)">{{ d.result ? 'Open' : 'Continue editing' }}</button>
            <button v-if="d.result" class="btn btn-quiet" type="button" @click="compareToPrevious(d)">Compare</button>
            <button class="btn btn-quiet" type="button" @click="deleteDraft(d)">Delete</button>
          </div>
        </li>
      </ul>
    </section>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="backToTaskType">← Back</button>
    </div>
  </div>

  <!-- Fallback / not-found ────────────────────────────────────────── -->
  <div v-else class="page">
    <div class="alert alert-danger">Unknown writing task or prompt.</div>
    <button class="btn btn-ghost" type="button" @click="backToTaskList">← Back</button>
  </div>
</template>

<style scoped>
.prompt-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; max-width: 720px; }
.prompt-row { padding: 14px 18px; cursor: pointer; }
.prompt-row-title { font-family: var(--font-display); font-size: 18px; }
.prompt-row-meta {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute); margin-top: 4px;
}
.detail-page { max-width: 880px; }
.prompt-detail-card { padding: 24px; margin: 16px 0 28px; }
.prompt-detail-text {
  font-family: var(--font-body); font-size: 16px; line-height: 1.55; color: var(--ink); white-space: pre-wrap;
}
.prompt-detail-context { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--hairline); }
.prompt-detail-context-label {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); display: block; margin-bottom: 8px;
}
.prompt-detail-context-text {
  font-family: var(--font-body); font-size: 14px; line-height: 1.55; color: var(--ink-soft); white-space: pre-wrap;
}
.prompt-detail-meta {
  margin-top: 14px;
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute);
  display: flex; gap: 8px; flex-wrap: wrap;
}
.drafts-section { margin: 24px 0; }
.drafts-title {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 12px;
}
.draft-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.draft-row { padding: 12px 16px; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.draft-row-meta { display: flex; gap: 6px; flex-wrap: wrap; font-size: 14px; }
.draft-row-unmarked { color: var(--mute); font-style: italic; }
.draft-row-actions { display: flex; gap: 6px; margin-left: auto; }
.setup-actions { display: flex; justify-content: flex-start; margin-top: 40px; }
</style>
