import type { SixForms, Verb, VerbTense } from '../data/verbs'

export interface ConjugationRow {
  person: string
  expected: string
}

const PERSON_LABELS_6 = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'] as const
const IMP_LABELS = ['du', 'ihr', 'Sie'] as const

const HABEN_PRES: SixForms = ['habe', 'hast', 'hat', 'haben', 'habt', 'haben']
const HABEN_PRAET: SixForms = ['hatte', 'hattest', 'hatte', 'hatten', 'hattet', 'hatten']
const SEIN_PRES: SixForms = ['bin', 'bist', 'ist', 'sind', 'seid', 'sind']
const SEIN_PRAET: SixForms = ['war', 'warst', 'war', 'waren', 'wart', 'waren']
const WERDEN_PRES: SixForms = ['werde', 'wirst', 'wird', 'werden', 'werdet', 'werden']

function auxPresent(aux: 'haben' | 'sein'): SixForms {
  return aux === 'haben' ? HABEN_PRES : SEIN_PRES
}

function sixRows(forms: SixForms): ConjugationRow[] {
  return PERSON_LABELS_6.map((person, i) => ({ person, expected: forms[i] }))
}

function compoundWithAux(aux: SixForms, tail: string): SixForms {
  return aux.map(a => `${a} ${tail}`) as unknown as SixForms
}

function stripSuffixPrefix(form: string, prefix: string): string {
  const suffix = ` ${prefix}`
  return form.endsWith(suffix) ? form.slice(0, -suffix.length) : form
}

function imperativDu(verb: Verb): string {
  if (verb.imperativDu) {
    return verb.separablePrefix
      ? `${verb.imperativDu} ${verb.separablePrefix}`
      : verb.imperativDu
  }
  let core = verb.praesens[1]
  if (verb.separablePrefix) {
    core = stripSuffixPrefix(core, verb.separablePrefix)
  }
  if (core.endsWith('est')) core = core.slice(0, -2)
  else if (core.endsWith('st')) core = core.slice(0, -2)
  return verb.separablePrefix ? `${core} ${verb.separablePrefix}` : core
}

function imperativ(verb: Verb): ConjugationRow[] {
  const du = imperativDu(verb)
  const ihr = verb.praesens[4]
  let sie: string
  if (verb.separablePrefix) {
    const sieBase = stripSuffixPrefix(verb.praesens[5], verb.separablePrefix)
    sie = `${sieBase} Sie ${verb.separablePrefix}`
  } else {
    sie = `${verb.praesens[5]} Sie`
  }
  return [
    { person: IMP_LABELS[0], expected: du },
    { person: IMP_LABELS[1], expected: ihr },
    { person: IMP_LABELS[2], expected: sie }
  ]
}

export function conjugate(verb: Verb, tense: VerbTense): ConjugationRow[] {
  switch (tense) {
    case 'praesens':
      return sixRows(verb.praesens)
    case 'imperativ':
      return imperativ(verb)
    case 'perfekt':
      return sixRows(compoundWithAux(auxPresent(verb.auxiliary), verb.partizip2))
    default:
      throw new Error(`tense ${tense} not yet implemented`)
  }
}

// Re-exports used in later tasks
export { HABEN_PRES, HABEN_PRAET, SEIN_PRES, SEIN_PRAET, WERDEN_PRES }
