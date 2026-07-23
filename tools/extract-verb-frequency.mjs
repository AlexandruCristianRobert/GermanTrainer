// Derives tools/data/verb-frequency.csv — the top 5000 German main-verb lemmas
// by corpus frequency — from UD German-HDT (CC BY-SA 4.0). See ADR-0009.
//
// Method: count tokens whose STTS tag (XPOS) starts with "VV" (main verbs;
// auxiliaries VA* and modals VM* are excluded — all already in the pool).
// Separated separable prefixes (XPOS "PTKVZ") are re-attached to their head
// verb's lemma before counting, so "fängt … an" counts as "anfangen".
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = 'https://raw.githubusercontent.com/UniversalDependencies/UD_German-HDT/master/'
const FILES = [
  'de_hdt-ud-dev.conllu',
  'de_hdt-ud-test.conllu',
  'de_hdt-ud-train-a-1.conllu',
  'de_hdt-ud-train-a-2.conllu',
  'de_hdt-ud-train-b-1.conllu',
  'de_hdt-ud-train-b-2.conllu',
]

async function fetchText(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

const counts = new Map()

function processSentence(tokens) {
  const prtByHead = new Map()
  for (const t of tokens) {
    if (t.xpos === 'PTKVZ' && t.head !== '0') prtByHead.set(t.head, t.form.toLowerCase())
  }
  for (const t of tokens) {
    if (!t.xpos.startsWith('VV')) continue
    let lemma = t.lemma.toLowerCase()
    const prefix = prtByHead.get(t.id)
    if (prefix) lemma = prefix + lemma
    // German infinitive shape only — drops tagger junk, numbers, foreign words.
    if (!/^[a-zäöüß]+n$/.test(lemma)) continue
    counts.set(lemma, (counts.get(lemma) ?? 0) + 1)
  }
}

for (const name of FILES) {
  const text = await fetchText(BASE + name)
  let tokens = []
  for (const line of text.split('\n')) {
    if (line === '') {
      if (tokens.length) processSentence(tokens)
      tokens = []
      continue
    }
    if (line.startsWith('#')) continue
    const cols = line.split('\t')
    if (cols.length < 8 || cols[0].includes('-') || cols[0].includes('.')) continue
    tokens.push({ id: cols[0], form: cols[1], lemma: cols[2], xpos: cols[4], head: cols[6] })
  }
  if (tokens.length) processSentence(tokens)
  console.log(`${name}: processed`)
}

const ranked = [...counts.entries()]
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'))
  .slice(0, 5000)

const header = [
  '# German main-verb lemma frequency ranking (top 5000).',
  '# Source: UD German-HDT (Universal Dependencies release of the Hamburg',
  '#   Dependency Treebank), https://github.com/UniversalDependencies/UD_German-HDT',
  '#   License: CC BY-SA 4.0 — this derived list is likewise CC BY-SA 4.0.',
  '# Method: XPOS VV* tokens; PTKVZ separable prefixes re-attached to head lemma;',
  '#   lemmas lowercased and restricted to /^[a-zäöüß]+n$/. See docs/adr/0009.',
  '# Extracted: 2026-07-23 by tools/extract-verb-frequency.mjs.',
  'rank,lemma,freq',
]
mkdirSync(new URL('./data/', import.meta.url), { recursive: true })
writeFileSync(
  new URL('./data/verb-frequency.csv', import.meta.url),
  header.join('\n') + '\n' + ranked.map(([l, f], i) => `${i + 1},${l},${f}`).join('\n') + '\n',
)
console.log(`wrote ${ranked.length} lemmas`)
