import { describe, test, expect } from 'vitest'
import {
  DA_DIALOGUE,
  dialogueAnswers,
  type DialogueItem,
} from '../../src/data/daDialogue'
import { COLLOCATIONS } from '../../src/data/collocations'
import { daCompound, woCompound } from '../../src/data/daCompounds'

const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

describe('DA_DIALOGUE invariants', () => {
  test('at least 40 items with unique ids and one item per collocation', () => {
    expect(DA_DIALOGUE.length).toBeGreaterThanOrEqual(40)
    expect(new Set(DA_DIALOGUE.map(i => i.id)).size).toBe(DA_DIALOGUE.length)
    expect(new Set(DA_DIALOGUE.map(i => i.collocationId)).size).toBe(DA_DIALOGUE.length)
  })

  test('ids follow the dl-<collocationId> convention', () => {
    const bad = DA_DIALOGUE.filter(i => i.id !== `dl-${i.collocationId}`)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every item joins a real collocation and matches its level', () => {
    const bad = DA_DIALOGUE.filter(
      i => !byId.has(i.collocationId) || byId.get(i.collocationId)!.level !== i.level,
    )
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('questionScaffold has exactly one gap, first, and is a question', () => {
    const bad = DA_DIALOGUE.filter(
      i =>
        (i.questionScaffold.match(/___/g) ?? []).length !== 1 ||
        !i.questionScaffold.startsWith('___ ') ||
        !i.questionScaffold.trim().endsWith('?'),
    )
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('answerScaffold has exactly one gap and continues with a clause (comma)', () => {
    const bad = DA_DIALOGUE.filter(
      i => (i.answerScaffold.match(/___/g) ?? []).length !== 1 || !i.answerScaffold.includes(','),
    )
    expect(bad.map(i => i.id)).toEqual([])
  })

  // Neither scaffold may leak its own derived answer.
  test('questionScaffold never contains its wo-answer; answerScaffold never contains its da-answer', () => {
    const bad = DA_DIALOGUE.filter(i => {
      const { wo, da } = dialogueAnswers(i)
      return (
        i.questionScaffold.toLowerCase().includes(wo.toLowerCase()) ||
        i.answerScaffold.toLowerCase().includes(da.toLowerCase())
      )
    })
    expect(bad.map(i => i.id)).toEqual([])
  })
})

describe('dialogueAnswers', () => {
  test('{ wo: capitalized wo-compound, da: da-compound } of the prep', () => {
    for (const item of DA_DIALOGUE) {
      const c = byId.get(item.collocationId)!
      expect(dialogueAnswers(item)).toEqual({
        wo: cap(woCompound(c.preposition)),
        da: daCompound(c.preposition),
      })
    }
  })

  test('spot check: warten-auf -> { wo: "Worauf", da: "darauf" }', () => {
    expect(
      dialogueAnswers({
        id: 'x', collocationId: 'warten-auf',
        questionScaffold: '___ ?', answerScaffold: 'Ich ___, dass', level: 'B1',
      }),
    ).toEqual({ wo: 'Worauf', da: 'darauf' })
  })

  test('spot check: sich-freuen-ueber -> { wo: "Worüber", da: "darüber" }', () => {
    expect(
      dialogueAnswers({
        id: 'x', collocationId: 'sich-freuen-ueber',
        questionScaffold: '___ ?', answerScaffold: 'Ich ___, dass', level: 'B1',
      }),
    ).toEqual({ wo: 'Worüber', da: 'darüber' })
  })

  test('throws on an unknown collocationId', () => {
    expect(() =>
      dialogueAnswers({
        id: 'x', collocationId: 'does-not-exist',
        questionScaffold: '___ ?', answerScaffold: 'Ich ___, dass', level: 'B1',
      } as DialogueItem),
    ).toThrow()
  })
})
