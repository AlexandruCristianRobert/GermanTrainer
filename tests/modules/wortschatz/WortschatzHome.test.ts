import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import WortschatzHome from '../../../src/modules/wortschatz/WortschatzHome.vue'
import { db } from '../../../src/db'

beforeEach(async () => { await db.wortschatzProgress.clear(); await db.wortschatzCustom.clear() })

describe('WortschatzHome', () => {
  it('renders one card per Themenfeld with a Lernen link and shows the due count', async () => {
    const w = mount(WortschatzHome, { global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } } })
    // Three flushes: the real Dexie/fake-indexeddb round trip through
    // loadSettings() + feldSummaries()/dueVokabelCount() (each themselves
    // chaining allVokabeln()/readAllProgress()) needs more than the single
    // macrotask tick @vue/test-utils' flushPromises() drains per call.
    await flushPromises()
    await flushPromises()
    await flushPromises()
    expect(w.text()).toContain('Umwelt')
    expect(w.text()).toContain('Familie')
    expect(w.findAll('[data-testid="feld-card"]')).toHaveLength(10)
    expect(w.find('[data-testid="wiederholen-cta"]').exists()).toBe(true)
  })
})
