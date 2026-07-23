// Picks the 200 highest-ranked lemmas from tools/data/verb-frequency.csv that
// are not already in src/data/verbs.ts (comparing "sich "-stripped infinitives)
// and writes them, one per line in rank order, to tools/data/b2-2-selected.txt.
import { readFileSync, writeFileSync } from 'node:fs'

const verbsTs = readFileSync(new URL('../src/data/verbs.ts', import.meta.url), 'utf8')
const existing = new Set(
  [...verbsTs.matchAll(/german: "([^"]+)"/g)].map(m =>
    m[1].replace(/^sich /, '').toLowerCase(),
  ),
)
if (existing.size < 300) throw new Error(`only parsed ${existing.size} existing verbs — regex broken?`)

const csv = readFileSync(new URL('./data/verb-frequency.csv', import.meta.url), 'utf8')
const selected = []
for (const line of csv.split('\n')) {
  if (!line.trim() || line.startsWith('#') || line.startsWith('rank,')) continue
  const lemma = line.split(',')[1]
  if (existing.has(lemma)) continue
  selected.push(lemma)
  if (selected.length === 200) break
}
if (selected.length !== 200) throw new Error(`only ${selected.length} candidates found`)
writeFileSync(new URL('./data/b2-2-selected.txt', import.meta.url), selected.join('\n') + '\n')
console.log('wrote 200 candidates; first 10:', selected.slice(0, 10).join(', '))
