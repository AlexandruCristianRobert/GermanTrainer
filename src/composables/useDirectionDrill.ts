import { computed, ref } from 'vue'
import { shuffle, type Rng } from '../data/pool'
import { checkText } from './drillGrading'
import {
  ADVERB_PAIRS, hinForm,
  type PerspectiveItem, type SceneSpec, type DirectionLevel,
} from '../data/directionWords'
import {
  HIN_HER_ITEMS, COMPOUND_ITEMS, QUESTION_ITEMS, type QuestionWordItem,
} from '../data/directionItems'

export interface DirectionQuestion {
  key: string
  prompt: string
  answers: string[]
  options: string[]
  translation: string
  scene: SceneSpec | null
  revealNote: string | null
  sourceIndex: number
  picked: string | null
  typed: string | null
  isCorrect: boolean | null
}

const HIER_NOTE = 'hier ist ein Ort, keine Bewegung — die Bewegung zum Sprecher heißt her.'

export function buildHinHerQuestions(items: PerspectiveItem[]): DirectionQuestion[] {
  return items.map((item, sourceIndex) => ({
    key: item.id,
    prompt: item.sentence,
    answers: item.answers,
    options: item.hierTrap ? ['hin', 'her', 'hier'] : ['hin', 'her'],
    translation: item.translation,
    scene: item.scene,
    revealNote: item.hierTrap ? HIER_NOTE : null,
    sourceIndex,
    picked: null, typed: null, isCorrect: null,
  }))
}

// hinunter/hinab and herunter/herab stage the same scene — 'unter' and 'ab' are
// synonymous compounds on every same-side pairing. Keep them off each other's
// distractor pool (a twin is never a wrong answer) and accept the twin compound
// as a typed alternative in the builder, without touching the data invariant
// that each item.answers has exactly one canonical entry.
const VERTICAL_TWIN: Record<string, string> = { unter: 'ab', ab: 'unter' }

export function buildCompoundQuestions(items: PerspectiveItem[], rng: Rng = Math.random): DirectionQuestion[] {
  const elements = ADVERB_PAIRS.map(p => p.element)
  return items.map((item, sourceIndex) => {
    const el = item.pair!
    const answer = item.answers[0]
    const side = answer === hinForm(el) ? 'hin' : 'her'
    const otherSide = side === 'hin' ? 'her' : 'hin'
    const [e2, e3] = shuffle(elements.filter(e => e !== el && e !== VERTICAL_TWIN[el]), 2, rng)
    const options = shuffle([answer, otherSide + el, side + e2, otherSide + e3], 4, rng)
    const rForm = ADVERB_PAIRS.find(p => p.element === el)!.rForm
    const twin = VERTICAL_TWIN[el]
    const answers = twin ? [answer, side + twin] : item.answers
    return {
      key: item.id,
      prompt: item.sentence,
      answers,
      options,
      translation: item.translation,
      scene: item.scene,
      revealNote: rForm ? `Gesprochene Kurzform: ${rForm}` : null,
      sourceIndex,
      picked: null, typed: null, isCorrect: null,
    }
  })
}

export function buildQuestionWordQuestions(items: QuestionWordItem[]): DirectionQuestion[] {
  return items.map((item, sourceIndex) => ({
    key: item.id,
    prompt: item.sentence,
    answers: item.answers,
    options: item.options,
    translation: item.translation,
    scene: null,
    revealNote: item.note ?? null,
    sourceIndex,
    picked: null, typed: null, isCorrect: null,
  }))
}

export function useDirectionDrill(qs: DirectionQuestion[]) {
  const questions = ref<DirectionQuestion[]>(qs)
  const currentIndex = ref(0)
  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  const wrongIndexes = computed(() =>
    questions.value.filter(q => q.isCorrect === false).map(q => q.sourceIndex))

  function pickOption(option: string) {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    q.picked = option
    q.isCorrect = q.answers.includes(option)
  }

  function submitText(input: string) {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    q.typed = input
    q.isCorrect = checkText(input, q.answers[0], q.answers.slice(1))
  }

  function advance() {
    if (currentIndex.value < questions.value.length) currentIndex.value++
  }

  return { questions, currentIndex, current, finished, pickOption, submitText, advance, score, total, wrongIndexes }
}

export function filterHinHerItems(f: { levels: DirectionLevel[] }): PerspectiveItem[] {
  return HIN_HER_ITEMS.filter(i => f.levels.includes(i.level))
}

export function filterCompoundItems(f: { levels: DirectionLevel[]; pairs: string[] }): PerspectiveItem[] {
  return COMPOUND_ITEMS.filter(i => f.levels.includes(i.level) && f.pairs.includes(i.pair!))
}

export function filterQuestionItems(f: { levels: DirectionLevel[] }): QuestionWordItem[] {
  return QUESTION_ITEMS.filter(i => f.levels.includes(i.level))
}
