# Stream all AI quizzes (ramped batches) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Every count-based AI quiz generates progressively in a ramped batch schedule (verb: 1→2→5→10…; others: 5→10…), opening on the first batch and streaming the rest — for all counts.

**Architecture:** Extend `useProgressiveGenerator` with `planRampBatches`. Extract the runner-side streaming state that only `VerbSentenceRunner` has today into a shared `useStreamingQuiz` composable. Each AI quiz's Setup stashes sampled **specs** (+ AI params) instead of generated items; its Runner adopts `useStreamingQuiz` and supplies a `runBatch(specs)`. See ADR-0008.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vitest, Gemini/local-Claude AI client.

---

## Status

- [x] **Task 1 — `planRampBatches`** (DONE, shipped): `src/composables/useProgressiveGenerator.ts` + tests. Ramp of leading sizes then even chunks.
- [x] **Task 2 — verb quiz on the ramp** (DONE, shipped): `VerbSentenceRunner.vue` swaps `planBatches(specs,1,5)` → `planRampBatches(specs,[1,2,5],10)`.

## Task 3: Extract `useStreamingQuiz` (shared runner-side streaming)

**Files:**
- Create: `src/composables/useStreamingQuiz.ts`
- Test: `tests/composables/useStreamingQuiz.test.ts`
- Reference: `src/modules/verbs/VerbSentenceRunner.vue:82-120` (the pattern to generalise)

The composable owns: the arrival-order `deck`, `generationDone`, `awaitingNext` (learner outran generation), a `ready` flag, and kicks off `generateProgressively` from a plan. Generic over the spec type `S` and item type `R`.

- [ ] **Step 1: Failing test** — a fake `runBatch` resolving batches; assert the first batch surfaces before later ones, `deck` fills in arrival order, `generationDone` flips at the end, and `awaitingNext` resolves when a later batch arrives.
- [ ] **Step 2: Implement** — signature:
```ts
export function useStreamingQuiz<S, R>(opts: {
  specs: S[]
  firstSizes: number[]      // [1,2,5] or [5]
  batchSize: number         // 10
  runBatch: (batch: S[]) => Promise<R[]>
  concurrency?: number      // default 4
  onFirst?: () => void      // e.g. chime + focus
}): { deck: Ref<R[]>; ready: ComputedRef<boolean>; generationDone: Ref<boolean>; error: Ref<string|null>; start: () => void }
```
Internals mirror `VerbSentenceRunner`'s `onMounted` block, using `planRampBatches`.
- [ ] **Step 3: Tests pass; commit.**

## Tasks 4–10: migrate each quiz (one per subagent, ≤5 at a time)

Each migration follows the SAME shape — do NOT change grading, history, weak-points or hints:

1. **Setup**: replace the single `generateSentences(...)` call + `loading.wrap` with: sample the N **specs** locally, stash `{ specs, ...aiParams, ...settings }` in `sessionStorage`, and navigate immediately (no overlay).
2. **Runner**: on mount, read the stash, call `useStreamingQuiz({ specs, firstSizes:[5], batchSize:10, runBatch: batch => <the quiz's existing batch AI call> })`, open on the first batch, consume `deck` as the learner advances, show a "preparing next…" state when they outrun it, and an end-of-run "Generated X of N" note.
3. **Tests**: unit-test the runner with a **mocked** `runBatch` — opens on first batch, consumes deck, grades, saves history once.

| Task | Quiz | Setup | Runner | Composable | firstSizes |
|------|------|-------|--------|------------|-----------|
| 4 | Prep sentence | `prepositions/SentenceQuizSetup.vue` | `prepositions/SentenceQuizRunner.vue` | `useSentenceQuiz` | `[5]` |
| 5 | Adjective sentence | `adjectives/QuizSetup.vue` | `adjectives/QuizRunner.vue` | (adjective gen) | `[5]` |
| 6 | Prep remedial | `prepositions/RemedialSetup.vue` | `prepositions/RemedialRunner.vue` | `usePrepRemedial`/`useSentenceQuiz` | `[5]` |
| 7 | Verb remedial | `verbs/VerbRemedialSetup.vue` | `verbs/VerbSentenceRunner.vue` (shared) | `useVerbSentenceQuiz` | `[5]` |
| 8 | Declension article-AI | `declension/ArticleQuizSetup.vue` | `declension/ArticleAIQuizRunner.vue` | `useDeclensionAI` | `[5]` |
| 9 | Konjunktiv | `konjunktiv/QuizSetup.vue` | `konjunktiv/QuizRunner.vue` | `useKonjunktivQuiz` | `[5]` |
| 10 | Passiv | `passiv/QuizSetup.vue` | `passiv/QuizRunner.vue` | `usePassivQuiz` | `[5]` |

**Per-quiz risk gate:** if a quiz's generation does NOT decompose into independent per-item batches (its AI call needs the whole set at once), do NOT force it — leave it single-call and record the exception in ADR-0008's consequences. Verify by reading the quiz's generate function before migrating.

## Task 11: integrate, verify, release

- [ ] `npm run typecheck` clean; `npm test` green (ThemeToggle timeout flake is pre-existing/unrelated).
- [ ] Bump `changelog.ts` APP_VERSION + entry and `package.json`; merge to main; push; `npm run deploy`.

## Self-review notes

- The AI call per quiz is unchanged — migration only moves *where* it runs (setup→runner) and *how it's sliced* (batches). Grading/history/hints stay put.
- Live AI runtime behaviour can't be unit-tested; runner tests mock `runBatch`. A live smoke-test per migrated quiz is the real acceptance check.
