import { describe, it, expect } from 'vitest'
import {
  newProgress, applyOutcome, isDue, GATE, GEFESTIGT_MIN_ELAPSED_DAYS
} from '../../src/composables/wortschatzScheduler'

const NOW = Date.parse('2026-08-21T10:00:00Z')
const DAY = 24 * 60 * 60 * 1000

describe('wortschatzScheduler', () => {
  it('newProgress starts at erkennen, due now, not gefestigt', () => {
    const p = newProgress('vk-x', NOW)
    expect(p.stufe).toBe('erkennen')
    expect(p.gefestigt).toBe(false)
    expect(p.gatePasses).toBe(0)
    expect(isDue(p, NOW)).toBe(true)
    expect(typeof p.fsrs.due).toBe('number')   // plain JSON, no Date
  })

  it('clean passes promote after the gate', () => {
    let p = newProgress('vk-x', NOW)
    p = applyOutcome(p, 'correct', NOW, 'erkennen')
    expect(p.stufe).toBe('erkennen')
    expect(p.gatePasses).toBe(1)
    p = applyOutcome(p, 'correct', NOW + DAY, 'erkennen')
    expect(p.stufe).toBe('luecke')             // GATE.erkennen = 2
    expect(p.gatePasses).toBe(0)
  })

  it('a miss demotes one rung, never below erkennen, and resets the gate', () => {
    let p = newProgress('vk-x', NOW)
    p = { ...p, stufe: 'abruf', gatePasses: 2 }
    p = applyOutcome(p, 'wrong', NOW, 'abruf')
    expect(p.stufe).toBe('luecke')
    expect(p.gatePasses).toBe(0)
    p = { ...p, stufe: 'erkennen' }
    p = applyOutcome(p, 'wrong', NOW, 'erkennen')
    expect(p.stufe).toBe('erkennen')
  })

  it('hint neither promotes nor demotes but reschedules', () => {
    let p = newProgress('vk-x', NOW)
    const before = p.fsrs.due
    p = applyOutcome(p, 'hint', NOW, 'erkennen')
    expect(p.stufe).toBe('erkennen')
    expect(p.gatePasses).toBe(0)
    expect(p.fsrs.due).toBeGreaterThan(before - 1) // rescheduled (Hard)
  })

  it('served-below-stage (offline fallback) rates FSRS but never promotes', () => {
    let p = newProgress('vk-x', NOW)
    p = { ...p, stufe: 'anwendung', gatePasses: 0 }
    p = applyOutcome(p, 'correct', NOW, 'abruf')  // served as Abruf
    expect(p.stufe).toBe('anwendung')
    expect(p.gatePasses).toBe(0)
    expect(p.gefestigt).toBe(false)
    // a wrong answer at the lower format still demotes:
    p = applyOutcome(p, 'wrong', NOW, 'abruf')
    expect(p.stufe).toBe('abruf')
  })

  it('gefestigt requires a clean anwendung pass ≥21 elapsed days', () => {
    let p = newProgress('vk-x', NOW)
    p = { ...p, stufe: 'anwendung', fsrs: { ...p.fsrs, last_review: NOW - 5 * DAY } }
    p = applyOutcome(p, 'correct', NOW, 'anwendung')
    expect(p.gefestigt).toBe(false)               // only 5 elapsed days
    p = { ...p, stufe: 'anwendung', gefestigt: false,
          fsrs: { ...p.fsrs, last_review: NOW - (GEFESTIGT_MIN_ELAPSED_DAYS + 1) * DAY } }
    p = applyOutcome(p, 'correct', NOW + DAY, 'anwendung')
    expect(p.gefestigt).toBe(true)
    expect(isDue(p, NOW + 400 * DAY)).toBe(false) // gefestigt leaves the queue for good
  })

  it('expanding schedule: a second Good schedules further out than the first', () => {
    let p = newProgress('vk-x', NOW)
    p = applyOutcome(p, 'correct', NOW, 'erkennen')
    const first = p.fsrs.due - NOW
    p = applyOutcome(p, 'correct', p.fsrs.due, 'erkennen')
    const second = p.fsrs.due - (NOW + first)
    expect(second).toBeGreaterThan(first)
    expect(GATE.luecke).toBe(3)
  })
})
