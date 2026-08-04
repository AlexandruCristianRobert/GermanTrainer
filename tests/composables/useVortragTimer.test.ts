import { describe, it, expect } from 'vitest'
import { redezeit, hardLimitReached } from '../../src/composables/useVortragTimer'

describe('redezeit', () => {
  it('measures a typed Rede in words against 360', () => {
    const s = redezeit({ words: 180, modality: 'typed' })
    expect(s.words).toBe(180)
    expect(s.pct).toBeCloseTo(0.5, 5)
    expect(s.band).toBe('under')
    expect(s.clock).toBe('2:00')
  })

  it('measures a spoken Rede on the clock against 4:00', () => {
    const s = redezeit({ words: 180, seconds: 228, modality: 'spoken' })
    expect(s.seconds).toBe(228)
    expect(s.pct).toBeCloseTo(228 / 240, 5)
    expect(s.band).toBe('ok')
  })

  it('enters the band at 88% and leaves it past 110%', () => {
    expect(redezeit({ words: 316, modality: 'typed' }).band).toBe('under')  // 316/360 = 87.78% → under (< 88%)
    expect(redezeit({ words: 317, modality: 'typed' }).band).toBe('ok')
    expect(redezeit({ words: 315, modality: 'typed' }).band).toBe('under')    // 87.5%
    expect(redezeit({ words: 396, modality: 'typed' }).band).toBe('ok')       // 110.0%
    expect(redezeit({ words: 400, modality: 'typed' }).band).toBe('over')     // 111.1%
  })

  it('falls back to the word proxy when a spoken run has no clock yet', () => {
    const s = redezeit({ words: 90, modality: 'spoken' })
    expect(s.pct).toBeCloseTo(0.25, 5)
  })

  it('never returns a negative or NaN pct', () => {
    expect(redezeit({ words: 0, modality: 'typed' }).pct).toBe(0)
    expect(redezeit({ words: 0, seconds: 0, modality: 'spoken' }).pct).toBe(0)
  })
})

describe('hardLimitReached', () => {
  it('is false unless the switch is on', () => {
    expect(hardLimitReached({ seconds: 999, modality: 'spoken', hardLimit: false })).toBe(false)
  })

  it('fires at 4:00 in a spoken Rede', () => {
    expect(hardLimitReached({ seconds: 239, modality: 'spoken', hardLimit: true })).toBe(false)
    expect(hardLimitReached({ seconds: 240, modality: 'spoken', hardLimit: true })).toBe(true)
  })

  it('never fires in a typed Rede — the switch does not exist there', () => {
    expect(hardLimitReached({ seconds: 9999, modality: 'typed', hardLimit: true })).toBe(false)
  })
})
