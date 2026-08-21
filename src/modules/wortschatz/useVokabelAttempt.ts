// Task 9 fix round 1, finding 3 — shared attempt logic for LueckeCard and
// AbrufCard: both are "type the expected German text, get graded locally,
// escalate a local miss to the runner via rescue-check" cards that differ
// only in what the expected text is (a cloze blank vs. the canonical v.de).
// This composable owns the input/hint/grade/rescue state machine; it does
// NOT emit 'answered' itself (finding 1) — it only settles `outcome`, so the
// reveal can render before the card advances. The consuming SFC watches
// `outcome` and emits 'answered' from its own „Weiter" button.
import { computed, nextTick, onMounted, ref } from 'vue'
import { gradeVokabelAnswer, type WrongReason } from '../../composables/wortschatzGrading'
import type { Vokabel } from '../../data/wortschatz'

export type AttemptOutcome = 'correct' | 'hint' | 'wrong'

const REASON_LABEL: Record<WrongReason, string | undefined> = {
  article: 'Artikel',
  preposition: 'Präposition',
  ending: 'Endung',
  word: undefined,
  empty: undefined,
}

/** Strip a leading article so a first-letter hint reveals the head word (e.g.
 * "die Verpackung" → "V…", not the already-obvious "D…"). */
function stripLeadingArticle(s: string): string {
  return s.replace(/^(der|die|das|ein|eine|einen|einem|einer|eines|den|dem|des)\s+/i, '')
}

export interface UseVokabelAttemptOptions {
  vokabel: Vokabel
  /** The text `given` must match — a cloze blank (Lücke) or the canonical v.de (Abruf). */
  expectedText: () => string
  /** Called on a local miss; the runner resolves online-AI rescue or an immediate false. */
  onRescueCheck: (given: string, resolve: (ok: boolean) => void) => void
}

export function useVokabelAttempt(opts: UseVokabelAttemptOptions) {
  const given = ref('')
  const revealedChars = ref(0)
  const pending = ref(false)
  const outcome = ref<AttemptOutcome | null>(null)
  const reason = ref<WrongReason | undefined>(undefined)
  const inputRef = ref<HTMLInputElement | null>(null)

  const hinted = computed(() => revealedChars.value > 0)
  const hintSource = computed(() => stripLeadingArticle(opts.expectedText()))
  const hintText = computed(() => hintSource.value.slice(0, revealedChars.value))
  const reasonLabel = computed(() => (reason.value ? REASON_LABEL[reason.value] : undefined))

  function hint() {
    if (outcome.value !== null || pending.value || revealedChars.value >= 3) return
    revealedChars.value++
  }

  function finalize(o: AttemptOutcome, r?: WrongReason) {
    if (outcome.value !== null) return // idempotent — settle once
    outcome.value = o
    reason.value = o === 'wrong' ? r : undefined
  }

  function submit() {
    if (outcome.value !== null || pending.value || !given.value.trim()) return
    const g = given.value
    const grade = gradeVokabelAnswer(opts.vokabel, opts.expectedText(), g)
    if (grade.correct) {
      finalize(hinted.value ? 'hint' : 'correct')
      return
    }
    pending.value = true
    opts.onRescueCheck(g, (ok: boolean) => {
      pending.value = false
      if (outcome.value !== null) return // guard: a resolve can't fire twice
      if (ok) finalize(hinted.value ? 'hint' : 'correct')
      else finalize('wrong', grade.reason)
    })
  }

  onMounted(() => {
    nextTick(() => inputRef.value?.focus())
  })

  return { given, revealedChars, pending, outcome, hinted, hintText, reasonLabel, hint, submit, inputRef }
}
