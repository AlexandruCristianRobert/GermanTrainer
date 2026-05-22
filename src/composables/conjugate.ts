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

const STRONG_PRAET_ENDINGS: SixForms = ['', 'st', '', 'en', 't', 'en']
const WEAK_PRAET_ENDINGS:   SixForms = ['',   'st', '', 'n',  't', 'n']

function endsWithTteDe(stem: string): boolean {
  return /[td]$/.test(stem) && !stem.endsWith('te')
}

function praeteritum(verb: Verb): SixForms {
  if (verb.praeteritum) {
    if (verb.separablePrefix) {
      return verb.praeteritum.map(f => `${f} ${verb.separablePrefix}`) as unknown as SixForms
    }
    return verb.praeteritum
  }
  const stem = verb.praeteritumStem
  const isWeak = stem.endsWith('te')
  const endings = isWeak ? WEAK_PRAET_ENDINGS : STRONG_PRAET_ENDINGS
  const needsBindeE = !isWeak && endsWithTteDe(stem)
  let forms = endings.map((end, i) => {
    if (i === 0 || i === 2) return stem
    let suffix = end
    if (needsBindeE && (suffix === 'st' || suffix === 't')) suffix = 'e' + suffix
    return stem + suffix
  }) as unknown as SixForms

  if (verb.separablePrefix) {
    forms = forms.map(f => `${f} ${verb.separablePrefix}`) as unknown as SixForms
  }
  return forms
}

function futur1Forms(verb: Verb): SixForms {
  return compoundWithAux(WERDEN_PRES, verb.german)
}

function futur2Forms(verb: Verb): SixForms {
  const tail = `${verb.partizip2} ${verb.auxiliary}`
  return compoundWithAux(WERDEN_PRES, tail)
}

function auxPraet(aux: 'haben' | 'sein'): SixForms {
  return aux === 'haben' ? HABEN_PRAET : SEIN_PRAET
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
    case 'praeteritum':
      return sixRows(praeteritum(verb))
    case 'plusquamperfekt':
      return sixRows(compoundWithAux(auxPraet(verb.auxiliary), verb.partizip2))
    case 'futur1':
      return sixRows(futur1Forms(verb))
    case 'futur2':
      return sixRows(futur2Forms(verb))
    default:
      throw new Error(`tense ${tense} not yet implemented`)
  }
}

// Re-exports used in later tasks
export { HABEN_PRES, HABEN_PRAET, SEIN_PRES, SEIN_PRAET, WERDEN_PRES }
