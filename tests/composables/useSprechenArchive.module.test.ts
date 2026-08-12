import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db'
import {
  appendCorrections,
  listCorrections,
  openCorrections,
  countsByKind,
  clearArchive,
  type ArchivedCorrection
} from '../../src/composables/useSprechenArchive'

// ADR-0020: Schreiben corrections join the Sprechen archive tables via a
// `module` discriminator on new rows, defaulted to 'sprechen' on read —
// the exact pattern the existing optional `part` field already uses.
// fake-indexeddb is wired globally (tests/setup.ts), so this exercises the
// real write -> read defaulting round-trip through Dexie, same as
// tests/db/sprechenArchive.test.ts's "part on archived corrections" block.

describe('archive module discriminator (ADR-0020)', () => {
  beforeEach(async () => { await clearArchive() })

  const base = {
    discussionId: 'd-1', topicTitle: 'Ehrenamt', modality: 'typed' as const,
    kind: 'grammar' as const, quote: 'für die Wettkämpfe gefahren',
    suggested: 'zu den Wettkämpfen gefahren', reasonDe: 'Ziel: zu + Dativ.',
    reasonEn: 'Destination takes zu + dative.', context: 'Ich bin für die Wettkämpfe gefahren.'
  }

  it('stores the module it came from', async () => {
    await appendCorrections([{ ...base, module: 'schreiben', part: 1 }])
    const [row] = await listCorrections()
    expect(row.module).toBe('schreiben')
    expect(row.part).toBe(1)
  })

  it('reads a row stored without module as sprechen, without rewriting it (ADR-0012)', async () => {
    await db.sprechenCorrections.add({ ...base, id: 'legacy-mod-1', createdAt: Date.now() } as any)
    const [row] = await listCorrections()
    expect(row.module).toBe('sprechen')
    const raw = await db.sprechenCorrections.get('legacy-mod-1')
    expect((raw as any).module).toBeUndefined()
  })

  it('filters by module', async () => {
    await appendCorrections([
      { ...base, module: 'sprechen', quote: 'a' },
      { ...base, module: 'schreiben', quote: 'b' }
    ])
    expect(await listCorrections({ module: 'sprechen' })).toHaveLength(1)
    expect(await listCorrections({ module: 'schreiben' })).toHaveLength(1)
    expect(await listCorrections()).toHaveLength(2)
  })

  it('counts by kind per module', async () => {
    await appendCorrections([
      { ...base, module: 'sprechen', kind: 'grammar' },
      { ...base, module: 'schreiben', kind: 'grammar', quote: 'anders' }
    ])
    expect((await countsByKind(undefined, 'sprechen')).grammar).toBe(1)
    expect((await countsByKind()).grammar).toBe(2)
  })

  it('serves open corrections scoped to one module to the drill', async () => {
    await appendCorrections([
      { ...base, module: 'sprechen', quote: 'a' },
      { ...base, module: 'schreiben', quote: 'b' }
    ])
    expect(await openCorrections()).toHaveLength(2)
    expect(await openCorrections(undefined, undefined, 'schreiben')).toHaveLength(1)
  })

  it('rows without module default part unchanged (part ?? 2 still applies)', async () => {
    const [row]: ArchivedCorrection[] = await appendCorrections([{ ...base }])
    expect(row.part).toBeUndefined()
    const [read] = await listCorrections()
    expect(read.module).toBe('sprechen')
    expect(read.part).toBe(2)
  })
})
