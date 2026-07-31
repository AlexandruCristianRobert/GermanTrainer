import { describe, expect, it } from 'vitest'
import { db } from '../../src/db'
import type { SprechenDiscussion } from '../../src/data/sprechen'

describe('sprechenDiscussions table (db version 9)', () => {
  it('stores and retrieves a Discussion row by id', async () => {
    const row: SprechenDiscussion = {
      id: 'disc-test-1',
      topic: { id: 'st-umwelt-tempolimit', titleDe: 'Tempolimit', statementDe: 'Brauchen wir ein generelles Tempolimit auf Autobahnen?', source: 'seed' },
      turnTarget: 6,
      stance: 'contra',
      status: 'in_progress',
      turns: [],
      kiTippCount: 0,
      startedAt: Date.now(),
      modality: 'typed'
    }
    await db.sprechenDiscussions.put(row)
    const got = await db.sprechenDiscussions.get('disc-test-1')
    expect(got?.topic.titleDe).toBe('Tempolimit')
    expect(got?.status).toBe('in_progress')
    await db.sprechenDiscussions.delete('disc-test-1')
  })
})
