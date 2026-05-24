import {
  WRITING_PROMPTS,
  type WritingPrompt,
  type WritingTaskType
} from '../data/writingPrompts'

export function getAllPrompts(): WritingPrompt[] {
  return WRITING_PROMPTS
}

export function getPromptById(id: string): WritingPrompt | null {
  return WRITING_PROMPTS.find(p => p.id === id) ?? null
}

export function filterByTaskType(type: WritingTaskType): WritingPrompt[] {
  return WRITING_PROMPTS.filter(p => p.type === type)
}

export function filterByLevel(level: 'B2' | 'C1'): WritingPrompt[] {
  return WRITING_PROMPTS.filter(p => p.level === level)
}

export function useWritingPrompts() {
  return { getAllPrompts, getPromptById, filterByTaskType, filterByLevel }
}
