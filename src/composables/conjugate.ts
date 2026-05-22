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
const WERDEN_PRAET: SixForms = ['wurde', 'wurdest', 'wurde', 'wurden', 'wurdet', 'wurden']
const WUERDE: SixForms = ['würde', 'würdest', 'würde', 'würden', 'würdet', 'würden']

const K1_ENDINGS: SixForms = ['e', 'est', 'e', 'en', 'et', 'en']

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

function infinitiveStem(verb: Verb): string {
  let inf = verb.german
  if (inf.startsWith('sich ')) inf = inf.slice(5)
  if (verb.separablePrefix) inf = inf.slice(verb.separablePrefix.length)
  return inf.endsWith('en') ? inf.slice(0, -2) : inf.slice(0, -1)
}

function konjunktiv1(verb: Verb): SixForms {
  if (verb.konjunktiv1) {
    if (verb.separablePrefix) {
      return verb.konjunktiv1.map(f => `${f} ${verb.separablePrefix}`) as unknown as SixForms
    }
    return verb.konjunktiv1
  }
  const stem = infinitiveStem(verb)
  let forms = K1_ENDINGS.map(e => stem + e) as unknown as SixForms
  if (verb.separablePrefix) {
    forms = forms.map(f => `${f} ${verb.separablePrefix}`) as unknown as SixForms
  }
  return forms
}

function konjunktiv2(verb: Verb): SixForms {
  if (verb.konjunktiv2) {
    if (verb.separablePrefix) {
      return verb.konjunktiv2.map(f => `${f} ${verb.separablePrefix}`) as unknown as SixForms
    }
    return verb.konjunktiv2
  }
  return compoundWithAux(WUERDE, verb.german)
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
  // Derive from er-form (praesens[2]) by stripping the trailing -t.
  // er-form is always stem+t (or stem+et with Bindevokal), so a single slice(0,-1) yields the correct stem.
  // Verbs with a→ä / au→äu vowel change must supply imperativDu explicitly (e.g. fahren → "fahr").
  let core = verb.praesens[2]
  if (verb.separablePrefix) {
    core = stripSuffixPrefix(core, verb.separablePrefix)
  }
  if (core.endsWith('t')) core = core.slice(0, -1)
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
    case 'konjunktiv1':
      return sixRows(konjunktiv1(verb))
    case 'konjunktiv2':
      return sixRows(konjunktiv2(verb))
    case 'passivPraesens':
      return sixRows(compoundWithAux(WERDEN_PRES, verb.partizip2))
    case 'passivPraeteritum':
      return sixRows(compoundWithAux(WERDEN_PRAET, verb.partizip2))
    case 'passivPerfekt':
      return sixRows(compoundWithAux(SEIN_PRES, `${verb.partizip2} worden`))
    case 'passivPlusquamperfekt':
      return sixRows(compoundWithAux(SEIN_PRAET, `${verb.partizip2} worden`))
    case 'passivFutur1':
      return sixRows(compoundWithAux(WERDEN_PRES, `${verb.partizip2} werden`))
    case 'passivKonjunktiv2':
      return sixRows(compoundWithAux(WUERDE, `${verb.partizip2} werden`))
    default: {
      const _exhaustive: never = tense
      throw new Error(`unhandled tense: ${String(_exhaustive)}`)
    }
  }
}

export function passiveAvailable(verb: Verb): boolean {
  return verb.case === 'accusative' || verb.case === 'dative+accusative'
}

export { HABEN_PRES, HABEN_PRAET, SEIN_PRES, SEIN_PRAET, WERDEN_PRES }
