// Daily Fachgebiet goal — 100 graded Fachgebiet sentence cards per day.
//
//   const goal = useDailyDomainGoal()
//   goal.recordCard()          // after a Fachgebiet card is graded
//   goal.count.value           // 0..n, resets on the LOCAL calendar day change
//   goal.done.value            // count >= DAILY_DOMAIN_GOAL_TARGET
//
// Tracks EFFORT, not proficiency: every graded Fachgebiet card counts — both
// directions, main AND practice rounds. Quiz history is untouched by this.
// The counter is rendered app-wide by <DailyGoalBadge /> in App.vue.

import { computed, ref, type ComputedRef, type Ref } from 'vue'

export const DAILY_DOMAIN_GOAL_TARGET = 100

const STORAGE_KEY = 'gt:dailyDomainGoal'

interface StoredGoal {
  /** LOCAL calendar date, 'YYYY-MM-DD' (not UTC). */
  date: string
  count: number
}

/** Today's LOCAL calendar date as 'YYYY-MM-DD' — deliberately not toISOString(),
 *  which would flip to the next day at UTC midnight, not the learner's. */
function localToday(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseStored(raw: string | null): StoredGoal | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw)
    if (
      v && typeof v === 'object' &&
      typeof v.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.date) &&
      typeof v.count === 'number' && Number.isFinite(v.count) && v.count >= 0
    ) {
      return { date: v.date, count: Math.floor(v.count) }
    }
  } catch { /* malformed JSON → defaults below */ }
  return null
}

function readStored(): StoredGoal {
  let stored: StoredGoal | null = null
  try {
    stored = parseStored(localStorage.getItem(STORAGE_KEY))
  } catch { /* storage unavailable (private mode) → defaults */ }
  return stored ?? { date: localToday(), count: 0 }
}

// Module-level singletons — every useDailyDomainGoal() call shares this state.
const initial = readStored()
const date = ref(initial.date)
const count = ref(initial.count)

const done = computed(() => count.value >= DAILY_DOMAIN_GOAL_TARGET)

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: date.value, count: count.value }))
  } catch { /* private mode / quota — the in-memory counter still works */ }
}

/** If the stored day is over, reset to 0 for today. Called on init, on every
 *  recordCard, and when the tab regains focus/visibility — a tab left open
 *  overnight must show 0/100 in the morning, not yesterday's count. */
function checkRollover() {
  const today = localToday()
  if (date.value !== today) {
    date.value = today
    count.value = 0
    persist()
  }
}

/** One graded Fachgebiet card. Rolls the day over first, then increments. */
function recordCard() {
  checkRollover()
  count.value++
  persist()
}

/** Cross-tab sync: adopt the newer value another tab persisted. */
function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return
  const incoming = parseStored(e.newValue)
  if (!incoming) return
  if (incoming.date > date.value) {
    // The other tab already rolled over to a newer day.
    date.value = incoming.date
    count.value = incoming.count
  } else if (incoming.date === date.value) {
    // Same day — counts only ever go up, so the larger one is the newer one.
    count.value = Math.max(count.value, incoming.count)
  }
  checkRollover()
}

// Rollover on init + wake-up hooks, registered once at module scope (the state
// is a module singleton, so component lifecycles must not own these).
checkRollover()
if (typeof window !== 'undefined') {
  window.addEventListener('focus', checkRollover)
  window.addEventListener('storage', onStorage)
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', checkRollover)
}

export interface DailyDomainGoalApi {
  /** Graded Fachgebiet cards today (local calendar day). */
  count: Ref<number>
  /** count >= DAILY_DOMAIN_GOAL_TARGET */
  done: ComputedRef<boolean>
  target: number
  recordCard: () => void
  checkRollover: () => void
}

export function useDailyDomainGoal(): DailyDomainGoalApi {
  return { count, done, target: DAILY_DOMAIN_GOAL_TARGET, recordCard, checkRollover }
}
