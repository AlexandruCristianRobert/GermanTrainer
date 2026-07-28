import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SceneDiagram from '../../../src/modules/direction-words/SceneDiagram.vue'
import { SCENE_ARCHETYPES, SCENE_POSITIONS, type SceneSpec } from '../../../src/data/directionWords'

function spec(overrides: Partial<SceneSpec> = {}): SceneSpec {
  return {
    archetype: 'stairs',
    speakerAt: 'top',
    motion: 'toward-speaker',
    description: 'You stand at the top; someone climbs up toward you.',
    ...overrides,
  }
}

describe('SceneDiagram', () => {
  it('renders an accessible SVG for every archetype', () => {
    for (const archetype of SCENE_ARCHETYPES) {
      const s = spec({ archetype, speakerAt: SCENE_POSITIONS[archetype][0] })
      const wrapper = mount(SceneDiagram, { props: { scene: s } })
      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)
      expect(svg.attributes('role')).toBe('img')
      expect(svg.attributes('aria-label')).toBe(s.description)
      expect(wrapper.attributes('data-archetype')).toBe(archetype)
    }
  })

  it('points the arrow at the speaker when motion is toward-speaker', () => {
    const wrapper = mount(SceneDiagram, { props: { scene: spec() } })
    expect(wrapper.attributes('data-motion')).toBe('toward-speaker')
    expect(wrapper.attributes('data-arrow-to')).toBe('top')
  })

  it('points the arrow away from the speaker when motion is away-from-speaker', () => {
    const wrapper = mount(SceneDiagram, { props: { scene: spec({ motion: 'away-from-speaker' }) } })
    expect(wrapper.attributes('data-arrow-to')).toBe('bottom')
  })

  it('draws speaker, mover, and arrow', () => {
    const wrapper = mount(SceneDiagram, { props: { scene: spec() } })
    expect(wrapper.find('.dw-speaker').exists()).toBe(true)
    expect(wrapper.find('.dw-mover').exists()).toBe(true)
    expect(wrapper.find('.dw-arrow').exists()).toBe(true)
  })

  it('is theme-proof: currentColor only, no hardcoded hex colors', () => {
    for (const archetype of SCENE_ARCHETYPES) {
      const s = spec({ archetype, speakerAt: SCENE_POSITIONS[archetype][1] })
      const html = mount(SceneDiagram, { props: { scene: s } }).html()
      expect(html).toContain('currentColor')
      expect(html).not.toMatch(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/)
    }
  })
})
