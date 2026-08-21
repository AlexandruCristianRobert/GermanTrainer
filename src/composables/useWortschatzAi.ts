// AI composable for the Wortschatz module (see CONTEXT.md → "Vokabel",
// "Wortverbindung", "Wiederholsitzung"). Four independent AI calls, no Dexie
// access here — caching is the caller's job (the Wortschatz store):
//
//   generateVokabeln   — expand a Themenfeld with new custom Vokabeln
//   generateExtraSaetze — three fresh context sentences for one Vokabel
//   judgeRescue        — Wiederholsitzung's online rescue: is a local MISS
//                         actually an acceptable form of THIS item (a synonym
//                         is not, in [Präzise]'s spirit)?
//   gradeAnwendung     — grade the learner's own sentence at the Anwendung rung
//
// Structure mirrors useSchreibenArguments.ts exactly: a local GeminiClient
// interface, prompt builders that spell out the exact JSON envelope in prose
// (the local-claude dev bridge drops responseSchema silently — never rely on
// it), the same retry-loop shape, and strict validators that drop bad items
// rather than accept them.

import type { Vokabel, KontextSatz, Themenfeld, VokabelKind } from '../data/wortschatz'
import { clozeParts } from '../data/wortschatz'

// ── Gemini client shape (matches useSchreibenArguments.GeminiClient) ──

export interface GeminiClient {
  models: {
    generateContent: (opts: {
      model: string
      contents: string
      config?: Record<string, unknown>
    }) => Promise<{ text?: string }>
  }
}

// ── Shared small helpers ─────────────────────────────────────────

function trimStr(x: unknown): string {
  return typeof x === 'string' ? x.trim() : ''
}

/**
 * The envelope skeleton in every prompt below uses "…" as the placeholder
 * for every string value. A model that echoes the placeholder literally
 * instead of a real value has not actually answered — this catches that.
 */
function isPlaceholder(s: string): boolean {
  return s === '…' || s === '...'
}

function validKontextSatz(raw: unknown): KontextSatz | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const de = trimStr(r.de)
  const en = trimStr(r.en)
  if (de.length === 0 || en.length === 0) return null
  const parts = clozeParts(de)
  if (parts === null) return null
  // The blank must never swallow the whole sentence — a Satz needs real
  // surrounding context to work as a cloze/Anwendung example at all.
  if (parts.before.trim().length === 0 && parts.after.trim().length === 0) return null
  return { de, en }
}

// German function words excluded from the {{blank}}↔Vokabel relation check
// in validateGeneratedVokabel below — articles and prepositions mostly, plus
// a handful of very common verbs/conjunctions that would otherwise trivially
// "match" almost any blank and defeat the point of the check.
const GERMAN_STOP_TOKENS = new Set([
  'der', 'die', 'das', 'den', 'dem', 'des',
  'ein', 'eine', 'einer', 'einen', 'einem', 'eines',
  'an', 'auf', 'in', 'im', 'zu', 'zur', 'zum', 'von', 'vom', 'mit', 'bei',
  'nach', 'für', 'durch', 'über', 'unter', 'vor', 'hinter', 'neben',
  'zwischen', 'aus', 'um', 'gegen', 'ohne', 'während', 'wegen', 'trotz',
  'statt', 'außer', 'entlang', 'innerhalb', 'außerhalb', 'seit', 'bis',
  'und', 'oder', 'dass', 'wenn', 'weil', 'sich', 'ist', 'sind', 'war',
  'hat', 'haben', 'wird', 'werden'
])

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[^a-zäöüß]+/).filter(t => t.length > 0)
}

/** Words of `de` worth checking against a blank: length ≥4, not a stop token. */
function contentTokens(de: string): string[] {
  return tokenize(de).filter(t => t.length >= 4 && !GERMAN_STOP_TOKENS.has(t))
}

/**
 * True if some word inside `blank` shares a ≥3-character prefix with some
 * content word of `de` — a loose, deliberately forgiving check that the
 * blank has *something* to do with the item, not a grading rule. Exact
 * matching would reject perfectly good sentences: German ablaut (nehmen →
 * nimmt) and other stem changes break a strict comparison even though the
 * sentence is fine — hence "prefix", and hence why validateGeneratedVokabel
 * only drops an item when NEITHER of its two Sätze relates.
 */
function blankRelatesToDe(blank: string, de: string): boolean {
  const content = contentTokens(de)
  if (content.length === 0) return true
  const blankTokens = tokenize(blank)
  return content.some(c => blankTokens.some(b => b.length >= 3 && b.slice(0, 3) === c.slice(0, 3)))
}

// ── 1. Vokabeln expansion ────────────────────────────────────────

export function buildVokabelnPrompt(feld: Themenfeld, existingDe: string[], count = 8): string {
  const exclusion = existingDe.length > 0
    ? `Verwende NICHT die folgenden, bereits vorhandenen Wörter/Wortverbindungen ` +
      `(auch keine bloßen Wiederholungen oder Formvarianten davon): ${existingDe.join(', ')}.\n\n`
    : ''
  // A flat "mindestens 3" only makes sense for the default batch size (8):
  // clamp so a smaller custom count never demands more Wortverbindungen than
  // half the batch, and drop the clause entirely once that clamp hits 0.
  const minWv = Math.min(3, Math.floor(count / 2))
  const wortverbindungClause = minWv >= 1
    ? ` — von den ${count} Vokabeln müssen MINDESTENS ${minWv} vom Typ "wortverbindung" sein.`
    : '.'
  return (
    `Erstelle ${count} neue Vokabeln für das Wortschatz-Modul der schriftlichen ` +
    'Goethe-B2-Prüfung, zu genau einem Themenfeld.\n\n' +
    `THEMENFELD: „${feld}"\n\n` +
    exclusion +
    'ANFORDERUNGEN:\n' +
    `- Genau ${count} Vokabeln, alle B2-Niveau, schriftsprachlich, im Prüfungsregister ` +
    `des genannten Themenfelds — Alltagswortschatz, keine Fachbegriffe eines Spezialgebiets.\n` +
    '- Mische die beiden Arten "einzelwort" (ein einzelnes Wort: Nomen, Verb oder Adjektiv) ' +
    'und "wortverbindung" (eine feste Wortverbindung/Kollokation, z. B. "eine Maßnahme ' +
    'ergreifen", "im Hinblick auf + Akk")' + wortverbindungClause + '\n' +
    '- "de": die kanonische deutsche Form. Ein Nomen IMMER mit Artikel (z. B. "die Maßnahme"), ' +
    'eine Wortverbindung in ihrer Grundform (z. B. "eine Maßnahme ergreifen").\n' +
    '- "en": eine natürliche englische Übersetzung/Glosse.\n' +
    '- "plural": NUR bei Nomen angeben — die Pluralform ohne Artikel (z. B. "Maßnahmen"), ' +
    'oder "" wenn das Nomen keinen Plural hat. Bei Verben, Adjektiven und Wortverbindungen ' +
    'lasse "plural" weg oder setze "".\n' +
    '- "rektion": NUR angeben, wenn das Item eine feste Präposition mit festem Kasus regiert ' +
    '(z. B. "auf + Akk", "an + Dat") — sonst weglassen.\n' +
    '- "variants": weitere akzeptierte vollständige Antwortformen (kann eine leere Liste sein).\n' +
    '- "saetze": GENAU 2 Beispielsätze pro Vokabel. In jedem Satz steht die (flektierte!) Form ' +
    'der Vokabel in doppelten geschweiften Klammern, z. B. "Konsequente {{Mülltrennung}} spart ' +
    'Rohstoffe." — die Klammern müssen genau EINMAL im Satz vorkommen und die eingeklammerte ' +
    'Form muss zur jeweiligen Flexion im Satz passen (nicht die Grundform, wenn der Satz eine ' +
    'andere Form verlangt). Jeder Satz braucht außerdem eine natürliche englische Übersetzung "en".\n' +
    '- Bei einer "wortverbindung" muss die GESAMTE Verbindung als zusammenhängende Einheit ' +
    'innerhalb der {{…}}-Klammern stehen, ohne dass andere Satzglieder sie auseinanderreißen — ' +
    'ein Perfekt- oder zu-Infinitiv-Rahmen hilft dabei (z. B. „... hat endlich {{eine Maßnahme ' +
    'ergriffen}}", „... versucht, {{eine Lösung zu finden}}").\n\n' +
    'Antworte ausschließlich als JSON-Objekt exakt dieser Form — keine Markdown-Fences: ' +
    '{"vokabeln": [{"kind": "einzelwort"|"wortverbindung", "de": "…", "en": "…", ' +
    '"plural": "…", "rektion": "…", "variants": ["…"], ' +
    '"saetze": [{"de": "…", "en": "…"}, {"de": "…", "en": "…"}]}]} ' +
    '("plural" und "rektion" nur angeben, wenn zutreffend — sonst den Schlüssel ganz weglassen).'
  )
}

const VALID_KINDS: readonly VokabelKind[] = ['einzelwort', 'wortverbindung']

/**
 * Validate one raw generated Vokabel item against the rules in the task
 * brief: kind valid; de/en nonempty; a noun (de starts with an article)
 * must carry a real `plural` string (not the "…" placeholder); both saetze
 * must pass clozeParts() with real surrounding context; at least one of the
 * two saetze's blanks must lexically relate to `de` (see blankRelatesToDe).
 * Returns null (dropped, never thrown) for a single bad item — the caller
 * retries the whole batch only if NO item survives.
 */
export function validateGeneratedVokabel(raw: unknown, feld: Themenfeld): Omit<Vokabel, 'id' | 'source'> | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const kind = r.kind
  if (typeof kind !== 'string' || !VALID_KINDS.includes(kind as VokabelKind)) return null

  const de = trimStr(r.de)
  const en = trimStr(r.en)
  if (de.length === 0 || en.length === 0) return null

  const isNoun = /^(der|die|das)\s/.test(de)
  let plural: string | undefined
  if (isNoun) {
    if (typeof r.plural !== 'string') return null
    if (isPlaceholder(r.plural.trim())) return null
    plural = r.plural
  } else if (typeof r.plural === 'string' && !isPlaceholder(r.plural.trim())) {
    plural = r.plural
  }

  const rektionRaw = typeof r.rektion === 'string' ? r.rektion.trim() : ''
  const rektion = rektionRaw.length > 0 && !isPlaceholder(rektionRaw) ? rektionRaw : undefined

  const variants = Array.isArray(r.variants)
    ? r.variants
        .filter((x): x is string => typeof x === 'string')
        .map(x => x.trim())
        .filter(x => x.length > 0 && !isPlaceholder(x))
    : []

  if (!Array.isArray(r.saetze) || r.saetze.length !== 2) return null
  const saetze: KontextSatz[] = []
  for (const s of r.saetze) {
    const v = validKontextSatz(s)
    if (v === null) return null
    saetze.push(v)
  }

  // Leniency across the two Sätze is deliberate: German ablaut (nehmen →
  // nimmt) and other stem changes can break the prefix match for ONE Satz
  // even though it's a perfectly good sentence, so a single non-matching
  // Satz must never sink an otherwise-good item — only drop it when NEITHER
  // blank relates to the item at all (e.g. a copy-paste mismatch).
  const relates = saetze.some(s => {
    const parts = clozeParts(s.de)
    return parts !== null && blankRelatesToDe(parts.blank, de)
  })
  if (!relates) return null

  const item: Omit<Vokabel, 'id' | 'source'> = {
    feld,
    kind: kind as VokabelKind,
    de,
    en,
    variants,
    saetze
  }
  if (plural !== undefined) item.plural = plural
  if (rektion !== undefined) item.rektion = rektion
  return item
}

export async function generateVokabeln(
  client: GeminiClient,
  model: string,
  feld: Themenfeld,
  existingDe: string[],
  count = 8,
  maxRetries = 2
): Promise<Array<Omit<Vokabel, 'id' | 'source'>>> {
  const prompt = buildVokabelnPrompt(feld, existingDe, count)
  let attempts = 0

  while (attempts <= maxRetries) {
    attempts++
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.8,
        topP: 0.95
      }
    })
    const text = response.text ?? ''
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      continue
    }
    if (!parsed || typeof parsed !== 'object') continue
    const raw = (parsed as { vokabeln?: unknown }).vokabeln
    if (!Array.isArray(raw)) continue

    const items = raw
      .map(item => validateGeneratedVokabel(item, feld))
      .filter((v): v is Omit<Vokabel, 'id' | 'source'> => v !== null)
    if (items.length === 0) continue
    return items
  }

  throw new Error(`Vokabeln generation for Themenfeld "${feld}" produced nothing usable after ${attempts} attempts`)
}

// ── 2. Extra Sätze for an existing Vokabel ───────────────────────

export function buildExtraSaetzePrompt(v: Vokabel): string {
  const bestehende = v.saetze.map(s => `- ${s.de}`).join('\n')
  return (
    'Schreibe 3 neue deutsche Beispielsätze für EINE bereits vorhandene B2-Vokabel ' +
    'aus dem Wortschatz-Modul der schriftlichen Goethe-B2-Prüfung.\n\n' +
    `VOKABEL: „${v.de}" (${v.en})` + (v.rektion ? `, Rektion: ${v.rektion}` : '') + '\n\n' +
    'BEREITS VORHANDENE SÄTZE (nicht wiederholen, auch nicht leicht abgewandelt):\n' +
    bestehende + '\n\n' +
    'ANFORDERUNGEN:\n' +
    '- Genau 3 Sätze, alle B2-Niveau, schriftsprachlich, die sich in Aufbau und Kontext ' +
    'voneinander unterscheiden (nicht bloße Variationen desselben Satzes) — und die sich auch ' +
    'von den oben aufgeführten bereits vorhandenen Sätzen unterscheiden.\n' +
    '- In jedem Satz steht die (flektierte!) Form der Vokabel in doppelten geschweiften Klammern, ' +
    'genau EINMAL im Satz, z. B. "Konsequente {{Mülltrennung}} spart Rohstoffe."\n' +
    '- Jeder Satz braucht außerdem eine natürliche englische Übersetzung.\n\n' +
    'Antworte ausschließlich als JSON-Objekt exakt dieser Form — keine Markdown-Fences: ' +
    '{"saetze": [{"de": "…", "en": "…"}, {"de": "…", "en": "…"}, {"de": "…", "en": "…"}]}'
  )
}

export async function generateExtraSaetze(
  client: GeminiClient,
  model: string,
  v: Vokabel,
  maxRetries = 2
): Promise<KontextSatz[]> {
  const prompt = buildExtraSaetzePrompt(v)
  let attempts = 0

  while (attempts <= maxRetries) {
    attempts++
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.8,
        topP: 0.95
      }
    })
    const text = response.text ?? ''
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      continue
    }
    if (!parsed || typeof parsed !== 'object') continue
    const raw = (parsed as { saetze?: unknown }).saetze
    if (!Array.isArray(raw) || raw.length !== 3) continue

    const saetze: KontextSatz[] = []
    let ok = true
    for (const s of raw) {
      const parsedSatz = validKontextSatz(s)
      if (parsedSatz === null) { ok = false; break }
      saetze.push(parsedSatz)
    }
    if (!ok) continue
    return saetze
  }

  throw new Error(`Extra-Sätze generation for "${v.de}" produced nothing usable after ${attempts} attempts`)
}

// ── 3. Rescue judge (Wiederholsitzung's online rescue) ───────────
//
// A local miss goes to the AI only online, asking whether the given answer
// is an acceptable form of EXACTLY THIS item — a synonym is still wrong (see
// CONTEXT.md → "Wiederholsitzung", in [Präzise]'s spirit). Single attempt:
// on parse failure this THROWS, and the caller treats that as "not rescued"
// (never silently accepts an unparseable verdict).

export function buildRescuePrompt(v: Vokabel, expected: string, given: string): string {
  const headerLines: string[] = [
    `VOKABEL: „${v.de}" (${v.en})` + (v.rektion ? `, Rektion: ${v.rektion}` : '')
  ]
  if (v.plural) headerLines.push(`PLURAL: ${v.plural}`)
  if (v.saetze[0]) {
    headerLines.push(
      `BEISPIELKONTEXT: "${v.saetze[0].de}" (${v.saetze[0].en}) — die Klammern {{…}} markieren die Zielform.`
    )
  }
  headerLines.push(`ZULÄSSIGE VARIANTEN: ${v.variants.length > 0 ? v.variants.join(', ') : 'keine'}`)
  headerLines.push(`ERWARTETE ANTWORT: „${expected}"`)
  headerLines.push(`GEGEBENE ANTWORT: „${given}"`)

  return (
    'Ein Deutschlerner (Niveau B2) hat bei einer Wortschatz-Wiederholung eine Vokabel-Antwort ' +
    'gegeben, die vom lokalen Abgleich als falsch erkannt wurde. Prüfe, ob die Antwort trotzdem ' +
    'als eine akzeptable Form GENAU DIESER Vokabel gelten darf (z. B. eine andere Flexion, ' +
    'eine andere Zahl oder eine der oben aufgeführten Varianten) — NICHT ob sie allgemein Sinn ergibt.\n\n' +
    headerLines.join('\n') + '\n\n' +
    'WICHTIG: Ein Synonym oder ein anderes Wort mit ähnlicher Bedeutung ist NICHT akzeptabel — ' +
    'es muss sich um dieselbe Vokabel handeln, nur eventuell anders flektiert, in anderer Zahl ' +
    'oder in einer der oben aufgeführten Varianten. Darüber hinaus dürfen auch eindeutige ' +
    'Rechtschreib- oder Tippfehler, die die Vokabel klar erkennbar lassen, als akzeptabel gelten.\n\n' +
    'Antworte ausschließlich als JSON-Objekt exakt dieser Form — keine Markdown-Fences: ' +
    '{"acceptable": true|false, "begruendung": "…"} — "begruendung" ist ein kurzer deutscher ' +
    'Satz, der die Entscheidung erklärt.'
  )
}

export async function judgeRescue(
  client: GeminiClient,
  model: string,
  v: Vokabel,
  expected: string,
  given: string
): Promise<{ acceptable: boolean; begruendung: string }> {
  const prompt = buildRescuePrompt(v, expected, given)
  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0
    }
  })
  const parsed = JSON.parse(response.text ?? '') as Record<string, unknown>
  if (typeof parsed.acceptable !== 'boolean') throw new Error('judgeRescue: malformed verdict')
  const begruendung = trimStr(parsed.begruendung)
  return { acceptable: parsed.acceptable, begruendung }
}

// ── 4. Anwendung grading ─────────────────────────────────────────

export function buildAnwendungPrompt(v: Vokabel, sentence: string): string {
  return (
    'Bewerte den deutschen Satz, den ein B2-Lerner in der Anwendung-Stufe des Wortschatz-Moduls ' +
    'selbst mit einer vorgegebenen Vokabel gebildet hat.\n\n' +
    `VOKABEL: „${v.de}" (${v.en})` + (v.rektion ? `, Rektion: ${v.rektion}` : '') + '\n' +
    `SATZ DES LERNERS: „${sentence}"\n\n` +
    'PRÜFE GENAU DREI DINGE:\n' +
    '1. Enthält der Satz die Vokabel in korrekt flektierter Form (nicht nur ähnlich, sondern ' +
    'erkennbar dieselbe Vokabel)?\n' +
    '2. Ist die Verwendung grammatisch korrekt' +
    (v.rektion ? ` — insbesondere die geforderte Rektion (${v.rektion})` : ' (Kasus, Rektion, Endungen)') +
    '?\n' +
    '3. Passt das Register — ist der Satz schriftsprachlich und auf B2-Niveau, wie es die ' +
    'schriftliche Prüfung verlangt (keine Umgangssprache, keine gesprochenen Füllwörter)?\n\n' +
    'Ein kurzer, einfacher Satz ist KEIN Fehler. Punkt 3 gilt nur dann als nicht erfüllt, wenn ' +
    'der Satz umgangssprachlich ist oder in einem schriftlichen Prüfungstext unpassend wirkt; ' +
    'bewerte NICHT Länge, Kreativität oder inhaltliche Tiefe.\n\n' +
    'Andere, von der Vokabel unabhängige Fehler im Satz (z. B. ein Tippfehler an anderer Stelle) ' +
    'sollen im Feedback erwähnt werden, dürfen aber NICHT allein dazu führen, dass die Karte als ' +
    'falsch gilt — entscheidend sind nur die drei Punkte oben.\n\n' +
    'Antworte ausschließlich als JSON-Objekt exakt dieser Form — keine Markdown-Fences: ' +
    '{"correct": true|false, "feedback": "…", "korrektur": "…"} — "feedback" ist ein kurzer ' +
    'deutscher Kommentar zu den drei Punkten; "korrektur" ist NUR zu setzen, wenn "correct" ' +
    'false ist, und enthält dann den korrigierten Satz.'
  )
}

export async function gradeAnwendung(
  client: GeminiClient,
  model: string,
  v: Vokabel,
  sentence: string,
  maxRetries = 2
): Promise<{ correct: boolean; feedback: string; korrektur?: string }> {
  const prompt = buildAnwendungPrompt(v, sentence)
  let attempts = 0

  while (attempts <= maxRetries) {
    attempts++
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0
      }
    })
    const text = response.text ?? ''
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      continue
    }
    if (!parsed || typeof parsed !== 'object') continue
    const r = parsed as Record<string, unknown>
    if (typeof r.correct !== 'boolean') continue
    const feedback = trimStr(r.feedback)
    if (feedback.length === 0) continue

    const result: { correct: boolean; feedback: string; korrektur?: string } = { correct: r.correct, feedback }
    if (!r.correct) {
      const korrektur = trimStr(r.korrektur)
      if (korrektur.length > 0) result.korrektur = korrektur
    }
    return result
  }

  throw new Error(`Anwendung grading for "${v.de}" produced nothing usable after ${attempts} attempts`)
}
