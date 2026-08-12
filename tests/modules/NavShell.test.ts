import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'

const push = vi.fn()

// useRoute() in real vue-router returns one reactive object shared across the
// app; NavShell reads route.name/route.fullPath off it. Tests mutate this
// object directly (it's the same proxy NavShell holds) to move the "current
// route" and observe active-state / close-on-navigate behavior.
const mockRoute = reactive({ name: 'home' as string, fullPath: '/' })

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => mockRoute
}))

import NavShell from '../../src/components/NavShell.vue'

function triggerFor(w: ReturnType<typeof mount>, label: string) {
  const t = w.findAll('.nav-trigger').find(b => b.text().includes(label))
  if (!t) throw new Error(`no trigger found for ${label}`)
  return t
}

beforeEach(() => {
  push.mockClear()
  mockRoute.name = 'home'
  mockRoute.fullPath = '/'
})

describe('NavShell', () => {
  it('renders the four category triggers plus Sätze/History, and no flat module links at top level', () => {
    const w = mount(NavShell)
    const links = w.find('.nav-links')
    for (const label of ['Wörter', 'Verben', 'Kleine Wörter', 'Prüfung', 'Sätze', 'History']) {
      expect(links.text()).toContain(label)
    }
    // Module leaves only exist inside a panel, which is closed by default —
    // so their labels must not appear at the top level at all.
    expect(links.text()).not.toContain('Nouns')
    expect(w.findAll('.nav-panel')).toHaveLength(0)
  })

  it('opens the Verben panel on click, and closes it when a second trigger opens', async () => {
    const w = mount(NavShell)
    const verben = triggerFor(w, 'Verben')
    expect(verben.attributes('aria-haspopup')).toBe('menu')
    expect(verben.attributes('aria-expanded')).toBe('false')

    await verben.trigger('click')
    expect(verben.attributes('aria-expanded')).toBe('true')
    expect(w.findAll('.nav-panel')).toHaveLength(1)
    const panel = w.get('.nav-panel')
    expect(panel.attributes('role')).toBe('menu')
    const panelText = panel.text()
    for (const label of ['Dativ', 'Konjunktiv I', 'Passiv', 'Verbs']) {
      expect(panelText).toContain(label)
    }

    const woerter = triggerFor(w, 'Wörter')
    await woerter.trigger('click')
    expect(w.findAll('.nav-panel')).toHaveLength(1)
    expect(verben.attributes('aria-expanded')).toBe('false')
    expect(woerter.attributes('aria-expanded')).toBe('true')
  })

  it('clicking Dativ inside the Verben panel navigates and closes the panel', async () => {
    const w = mount(NavShell)
    await triggerFor(w, 'Verben').trigger('click')
    const panel = w.get('.nav-panel')
    const dativ = panel.findAll('[role="menuitem"]').find(b => b.text() === 'Dativ')
    expect(dativ).toBeTruthy()
    await dativ!.trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'dative' })
    expect(w.findAll('.nav-panel')).toHaveLength(0)
  })

  it('marks the Prüfung trigger active when the current route is inside it', () => {
    mockRoute.name = 'schreiben-teil1-run'
    const w = mount(NavShell)
    expect(triggerFor(w, 'Prüfung').classes()).toContain('active')
    expect(triggerFor(w, 'Verben').classes()).not.toContain('active')
  })

  it('closes an open panel on Escape', async () => {
    const w = mount(NavShell)
    await triggerFor(w, 'Verben').trigger('click')
    expect(w.findAll('.nav-panel')).toHaveLength(1)
    await w.find('.nav-links').trigger('keydown', { key: 'Escape' })
    expect(w.findAll('.nav-panel')).toHaveLength(0)
  })

  it('closes an open panel on outside pointerdown', async () => {
    const w = mount(NavShell, { attachTo: document.body })
    await triggerFor(w, 'Verben').trigger('click')
    expect(w.findAll('.nav-panel')).toHaveLength(1)
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await flushPromises()
    expect(w.findAll('.nav-panel')).toHaveLength(0)
    w.unmount()
  })

  it('closes an open panel when the route changes', async () => {
    const w = mount(NavShell)
    await triggerFor(w, 'Verben').trigger('click')
    expect(w.findAll('.nav-panel')).toHaveLength(1)
    mockRoute.fullPath = '/dative'
    await flushPromises()
    expect(w.findAll('.nav-panel')).toHaveLength(0)
  })

  it('renders a Settings gear icon-button in nav-actions that tracks the active route', () => {
    mockRoute.name = 'settings'
    const w = mount(NavShell)
    const gear = w.find('[aria-label="Settings"]')
    expect(gear.exists()).toBe(true)
    expect(gear.classes()).toContain('active')
  })

  it('renders drawer group headers with de subtitles', () => {
    const w = mount(NavShell)
    const drawer = w.find('.drawer')
    const headers = drawer.findAll('.drawer-group-label').map(h => h.text())
    expect(headers).toEqual(['Wörter', 'Verben', 'Kleine Wörter', 'Prüfung'])
    expect(drawer.text()).toContain('Substantive')
    expect(drawer.text()).toContain('Dativverben')
  })
})
