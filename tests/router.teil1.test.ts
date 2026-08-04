import { describe, it, expect } from 'vitest'
import { routes } from '../src/router'

describe('Teil 1 routes', () => {
  const names = (routes as Array<{ name?: string; path: string }>).map(r => r.name)

  it('registers all four stages', () => {
    expect(names).toContain('sprechen-teil1')
    expect(names).toContain('sprechen-teil1-prep')
    expect(names).toContain('sprechen-teil1-run')
    expect(names).toContain('sprechen-teil1-result')
  })

  it('keeps the hyphen-free head so NavShell derives the Sprechen tab', () => {
    for (const n of names.filter(n => n?.startsWith('sprechen'))) {
      expect(n!.split('-')[0]).toBe('sprechen')
    }
  })

  it('paths sit under /sprechen/teil1', () => {
    const byName = new Map((routes as any[]).map(r => [r.name, r.path]))
    expect(byName.get('sprechen-teil1')).toBe('/sprechen/teil1')
    expect(byName.get('sprechen-teil1-prep')).toBe('/sprechen/teil1/prep')
    expect(byName.get('sprechen-teil1-run')).toBe('/sprechen/teil1/run')
    expect(byName.get('sprechen-teil1-result')).toBe('/sprechen/teil1/result')
  })
})
