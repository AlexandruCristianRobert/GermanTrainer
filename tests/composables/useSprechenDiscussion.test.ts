import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../src/db'
import {
  abandonDiscussion, appendTurn, createDiscussion, deleteDiscussion,
  findActiveDiscussion, incrementKiTipp, markSubmitted
} from '../../src/composables/useSprechenDiscussion'

const TOPIC = {
  id: 'st-umwelt-tempolimit', titleDe: 'Tempolimit',
  statementDe: 'Brauchen wir ein generelles Tempolimit auf Autobahnen?',
  source: 'seed' as const
}

beforeEach(async () => { await db.sprechenDiscussions.clear() })

describe('Discussion lifecycle', () => {
  it('create → findActive returns it', async () => {
    const d = await createDiscussion(TOPIC, 6, 'contra')
    expect(d.status).toBe('in_progress')
    expect(d.turns).toEqual([])
    const active = await findActiveDiscussion()
    expect(active?.id).toBe(d.id)
  })

  it('appendTurn persists turns in order', async () => {
    const d = await createDiscussion(TOPIC, 6, 'pro')
    await appendTurn(d.id, { role: 'partner', textDe: 'Ich bin dafür.', at: 1 })
    await appendTurn(d.id, { role: 'learner', textDe: 'Ich bin dagegen.', at: 2 })
    const got = await db.sprechenDiscussions.get(d.id)
    expect(got?.turns.map(t => t.role)).toEqual(['partner', 'learner'])
  })

  it('markSubmitted sets status and endedAt; row stays findable for retry', async () => {
    const d = await createDiscussion(TOPIC, 6, 'pro')
    await markSubmitted(d.id)
    const got = await db.sprechenDiscussions.get(d.id)
    expect(got?.status).toBe('submitted')
    expect(typeof got?.endedAt).toBe('number')
    const active = await findActiveDiscussion()
    expect(active?.id).toBe(d.id)   // submitted = analysis retryable
  })

  it('abandonDiscussion deletes the row', async () => {
    const d = await createDiscussion(TOPIC, 8, 'contra')
    await abandonDiscussion(d.id)
    expect(await db.sprechenDiscussions.get(d.id)).toBeUndefined()
  })

  it('deleteDiscussion removes the row (post-grading cleanup)', async () => {
    const d = await createDiscussion(TOPIC, 10, 'pro')
    await deleteDiscussion(d.id)
    expect(await db.sprechenDiscussions.get(d.id)).toBeUndefined()
  })

  it('incrementKiTipp bumps the counter', async () => {
    const d = await createDiscussion(TOPIC, 6, 'pro')
    await incrementKiTipp(d.id)
    await incrementKiTipp(d.id)
    const got = await db.sprechenDiscussions.get(d.id)
    expect(got?.kiTippCount).toBe(2)
  })

  it('findActiveDiscussion returns the most recent when several exist', async () => {
    const a = await createDiscussion(TOPIC, 6, 'pro')
    await db.sprechenDiscussions.update(a.id, { startedAt: 1000 })
    const b = await createDiscussion(TOPIC, 6, 'pro')
    await db.sprechenDiscussions.update(b.id, { startedAt: 2000 })
    const active = await findActiveDiscussion()
    expect(active?.id).toBe(b.id)
  })
})

describe('findActiveDiscussion(modality) filter', () => {
  it('a spoken row is not returned when asking for typed', async () => {
    await createDiscussion(TOPIC, 6, 'pro', 'spoken')
    const active = await findActiveDiscussion('typed')
    expect(active).toBeNull()
  })

  it('a typed row is not returned when asking for spoken', async () => {
    await createDiscussion(TOPIC, 6, 'pro', 'typed')
    const active = await findActiveDiscussion('spoken')
    expect(active).toBeNull()
  })

  it('with no argument, returns the most recent regardless of modality', async () => {
    const typed = await createDiscussion(TOPIC, 6, 'pro', 'typed')
    await db.sprechenDiscussions.update(typed.id, { startedAt: 1000 })
    const spoken = await createDiscussion(TOPIC, 6, 'pro', 'spoken')
    await db.sprechenDiscussions.update(spoken.id, { startedAt: 2000 })
    const active = await findActiveDiscussion()
    expect(active?.id).toBe(spoken.id)
  })

  it('Teil2Runner resume scenario: a newer spoken row does not shadow an older typed one', async () => {
    // Regression for the bug where Teil2Runner.vue called findActiveDiscussion()
    // with no modality: Teil2Setup correctly offers the (older) typed row as
    // resumable, but the runner then re-fetched "the" active discussion and
    // got the (newer) spoken one instead, typing into a spoken discussion.
    const typedOlder = await createDiscussion(TOPIC, 6, 'pro', 'typed')
    await db.sprechenDiscussions.update(typedOlder.id, { startedAt: 1000 })
    const spokenNewer = await createDiscussion(TOPIC, 6, 'pro', 'spoken')
    await db.sprechenDiscussions.update(spokenNewer.id, { startedAt: 2000 })
    const active = await findActiveDiscussion('typed')
    expect(active?.id).toBe(typedOlder.id)
  })

  it('most-recent-wins holds within a modality, ignoring a newer row of the other modality', async () => {
    const spokenOlder = await createDiscussion(TOPIC, 6, 'pro', 'spoken')
    await db.sprechenDiscussions.update(spokenOlder.id, { startedAt: 1000 })
    const spokenNewer = await createDiscussion(TOPIC, 6, 'pro', 'spoken')
    await db.sprechenDiscussions.update(spokenNewer.id, { startedAt: 2000 })
    const typedNewest = await createDiscussion(TOPIC, 6, 'pro', 'typed')
    await db.sprechenDiscussions.update(typedNewest.id, { startedAt: 3000 })
    const active = await findActiveDiscussion('spoken')
    expect(active?.id).toBe(spokenNewer.id)
  })

  it('returns null when the table is empty', async () => {
    const active = await findActiveDiscussion('typed')
    expect(active).toBeNull()
  })
})
