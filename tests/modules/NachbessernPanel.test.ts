import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NachbessernPanel from '../../src/components/schreiben/NachbessernPanel.vue'
import type { NachrichtMistake } from '../../src/composables/useNachrichtGrader'

const mistakes: NachrichtMistake[] = [
  { quote: 'danke dir', suggested: 'danke Ihnen', kind: 'register', reasonDe: 'Sie-Register', reasonEn: 'formal register', spanStart: 10 },
  { quote: 'Verstandnis', suggested: 'Verständnis', kind: 'spelling', reasonDe: 'Umlaut', reasonEn: 'umlaut', spanStart: 40 }
]

const text = 'Sehr geehrte Frau Kling,\n\nich danke dir für Ihr Verstandnis.\n\nMit freundlichen Grüßen\nAnna'

describe('NachbessernPanel', () => {
  it('starts with every correction offen and flips to behoben as the learner edits', async () => {
    const w = mount(NachbessernPanel, { props: { text, mistakes } })
    expect(w.findAll('.nb-status.offen')).toHaveLength(2)
    await w.find('textarea').setValue(text.replace('danke dir', 'danke Ihnen').replace('Verstandnis', 'Verständnis'))
    expect(w.findAll('.nb-status.behoben')).toHaveLength(2)
  })
  it('shows the honest amber copy for a differently-fixed span', async () => {
    const w = mount(NachbessernPanel, { props: { text, mistakes } })
    await w.find('textarea').setValue(text.replace('danke dir', 'bin dankbar'))
    expect(w.find('.nb-status.geaendert').exists()).toBe(true)
    expect(w.text()).toContain('kann nur die nächste Bewertung sagen')
  })
  it('emits done from the finish button and never writes anywhere', async () => {
    const w = mount(NachbessernPanel, { props: { text, mistakes } })
    await w.find('.nb-done').trigger('click')
    expect(w.emitted('done')).toHaveLength(1)
  })
})
