// ─── Sentence module (Kapitel XII · Sätze) — shared mock data ───
// Canned "AI-packed" cards: each card is an EN/DE pair whose drilled items are
// marked as token spans. The prototype samples the closest-matching cards to the
// learner's per-category config.

const SN_CAT = {
  verb: { de: 'Verben', one: 'Verb', many: 'Verben', letter: 'V', color: 'var(--sage)', tint: 'var(--sage-tint)' },
  noun: { de: 'Nomen', one: 'Nomen', many: 'Nomen', letter: 'N', color: 'var(--cobalt)', tint: 'var(--cobalt-tint)' },
  prep: { de: 'Präpositionen', one: 'Präposition', many: 'Präpositionen', letter: 'P', color: 'var(--ochre)', tint: 'var(--ochre-tint)' },
  dac: { de: 'Da-Komposita', one: 'da-Kompositum', many: 'da-Komposita', letter: 'D', color: 'var(--clay)', tint: 'var(--clay-tint)' },
  conn: { de: 'Konnektoren', one: 'Konnektor', many: 'Konnektoren', letter: 'K', color: 'var(--ink-soft)', tint: 'var(--hairline)' },
};
const SN_CATS = ['verb', 'noun', 'prep', 'dac', 'conn'];
const SN_MAX = { verb: 3, noun: 3, prep: 3, dac: 3, conn: 2 };
const SN_BUDGET = 8;
const SN_WARN_AT = 7;

const SN_VERB_LEVELS = ['A1', 'A2', 'B1', 'B2.1', 'B2.2'];
const SN_VERB_TYPES = [
  { id: 'reg', label: 'regelmäßig', n: 96 }, { id: 'irr', label: 'unregelmäßig', n: 74 },
  { id: 'sep', label: 'trennbar', n: 41 }, { id: 'refl', label: 'reflexiv', n: 28 },
];
const SN_REKTION = [
  { id: 'akk', label: 'Akkusativ', n: 64 }, { id: 'dat', label: 'Dativ', n: 22 },
  { id: 'datakk', label: 'Dativ + Akkusativ', n: 14 }, { id: 'refl', label: 'reflexiv', n: 18 },
  { id: 'praep', label: 'mit Präposition', n: 31 },
];
const SN_VERB_LEVEL_N = { 'A1': 52, 'A2': 61, 'B1': 58, 'B2.1': 34, 'B2.2': 21 };
const SN_NOUN_GROUPS = [
  { id: 'alltag', label: 'Alltag & Wohnen', n: 48 }, { id: 'arbeit', label: 'Arbeit & Beruf', n: 36 },
  { id: 'reisen', label: 'Reisen & Verkehr', n: 29 }, { id: 'gesund', label: 'Gesundheit', n: 21 },
  { id: 'natur', label: 'Natur & Umwelt', n: 17 }, { id: 'medien', label: 'Medien & Technik', n: 24 },
  { id: 'abstrakt', label: 'Abstrakta', n: 0 },
];
const SN_PREP_GROUPS = [
  { id: 'akk', label: 'mit Akkusativ', n: 9 }, { id: 'dat', label: 'mit Dativ', n: 11 },
  { id: 'wechsel', label: 'Wechselpräpositionen', n: 9 }, { id: 'gen', label: 'mit Genitiv', n: 6 },
];

// Connector behavior: '0' = word order unchanged · 'inv' = inversion · 'end' = verb to the end
const SN_CONN_BEHAVIOR = { '0': 'Wortstellung bleibt', inv: 'Inversion', end: 'Verb ans Ende' };
const SN_CONN_FAMILIES = [
  { id: 'adversativ', label: 'Adversative', de: 'Gegensatz', words: [
    { w: 'aber', b: '0' }, { w: 'sondern', b: '0' }, { w: 'jedoch', b: 'inv' },
    { w: 'allerdings', b: 'inv' }, { w: 'zwar … aber', b: '0', pair: true }] },
  { id: 'kausal', label: 'Causal', de: 'Grund & Folge', words: [
    { w: 'denn', b: '0' }, { w: 'weil', b: 'end' }, { w: 'deshalb', b: 'inv' }, { w: 'daher', b: 'inv' }] },
  { id: 'konzessiv', label: 'Concessive', de: 'Einräumung', words: [
    { w: 'obwohl', b: 'end' }, { w: 'trotzdem', b: 'inv' }, { w: 'dennoch', b: 'inv' }] },
  { id: 'temporal', label: 'Temporal', de: 'Zeit', words: [
    { w: 'während', b: 'end' }, { w: 'bevor', b: 'end' }, { w: 'nachdem', b: 'end' }, { w: 'dann', b: 'inv' }] },
  { id: 'alternativ', label: 'Alternative', de: 'Wahl', words: [
    { w: 'oder', b: '0' }, { w: 'entweder … oder', b: '0', pair: true }] },
  { id: 'additiv', label: 'Additive', de: 'Hinzufügung', words: [
    { w: 'außerdem', b: 'inv' }, { w: 'sowohl … als auch', b: '0', pair: true },
    { w: 'nicht nur … sondern auch', b: '0', pair: true }] },
];

const SN_TAGS = ['conjugation', 'case', 'word-order', 'noun', 'preposition', 'compound', 'connector', 'typo'];

// Packed cards. en = token list (string | {k,t}); two-part connectors carry the same k twice.
const SN_CARDS = [
  { id: 'c1', sents: 1, counts: { verb: 2, noun: 2, prep: 1, dac: 1, conn: 1 }, conn: 'aber',
    en: ['My ', { k: 'n1', t: 'colleague' }, ' has been ', { k: 'v1', t: 'waiting for' }, ' the ', { k: 'n2', t: 'report' }, ' ', { k: 'p1', t: 'since' }, ' Monday, ', { k: 'k1', t: 'but' }, ' I am still ', { k: 'v2', t: 'working' }, ' ', { k: 'd1', t: 'on it' }, '.'],
    de: 'Mein Kollege wartet seit Montag auf den Bericht, aber ich arbeite noch daran.',
    tip: '„aber" ist Position null: die Wortstellung im zweiten Satz bleibt unverändert.',
    items: [
      { k: 'v1', cat: 'verb', en: 'waiting for', sol: 'wartet auf', rekt: 'warten auf + Akk', acc: ['wartet', 'warten', 'gewartet'], tags: ['conjugation', 'preposition'] },
      { k: 'v2', cat: 'verb', en: 'working (on)', sol: 'arbeite', rekt: 'arbeiten an + Dat', acc: ['arbeite', 'arbeitet', 'gearbeitet'], tags: ['conjugation', 'case'] },
      { k: 'n1', cat: 'noun', en: 'colleague', sol: 'der Kollege', acc: ['kollege', 'kollegen', 'kollegin'], tags: ['noun'] },
      { k: 'n2', cat: 'noun', en: 'report', sol: 'der Bericht', acc: ['bericht'], tags: ['noun'] },
      { k: 'p1', cat: 'prep', en: 'since', sol: 'seit + Dat', acc: ['seit'], tags: ['preposition', 'case'] },
      { k: 'd1', cat: 'dac', en: 'on it', sol: 'daran', acc: ['daran', 'dran'], tags: ['compound'] },
      { k: 'k1', cat: 'conn', en: 'but', sol: 'aber — Wortstellung bleibt', acc: ['aber'], tags: ['connector', 'word-order'], fam: 'adversativ' }] },
  { id: 'c2', sents: 2, counts: { verb: 2, noun: 2, prep: 0, dac: 0, conn: 2 }, conn: 'nicht nur … sondern auch · deshalb',
    en: [{ k: 'k1', t: 'Not only' }, ' the ', { k: 'n1', t: 'rent' }, ' ', { k: 'k1', t: 'but also' }, ' the additional costs are ', { k: 'v1', t: 'rising' }, '. ', { k: 'k2', t: 'Therefore' }, ' many families are ', { k: 'v2', t: 'looking for' }, ' a smaller ', { k: 'n2', t: 'apartment' }, '.'],
    de: 'Nicht nur die Miete, sondern auch die Nebenkosten steigen. Deshalb suchen viele Familien nach einer kleineren Wohnung.',
    tip: 'Nach „deshalb" folgt Inversion: Verb sofort, Subjekt danach.',
    items: [
      { k: 'v1', cat: 'verb', en: 'rising', sol: 'steigen', acc: ['steigen', 'steigt'], tags: ['conjugation'] },
      { k: 'v2', cat: 'verb', en: 'looking for', sol: 'suchen nach', rekt: 'suchen nach + Dat', acc: ['suchen', 'sucht'], tags: ['conjugation', 'case'] },
      { k: 'n1', cat: 'noun', en: 'rent', sol: 'die Miete', acc: ['miete'], tags: ['noun'] },
      { k: 'n2', cat: 'noun', en: 'apartment', sol: 'die Wohnung', acc: ['wohnung'], tags: ['noun'] },
      { k: 'k1', cat: 'conn', en: 'not only … but also', sol: 'nicht nur … sondern auch', acc: ['sondern auch', 'nicht nur'], tags: ['connector'], fam: 'additiv', pair: true },
      { k: 'k2', cat: 'conn', en: 'therefore', sol: 'deshalb — Inversion', acc: ['deshalb', 'daher', 'deswegen'], tags: ['connector', 'word-order'], fam: 'kausal' }] },
  { id: 'c3', sents: 4, counts: { verb: 3, noun: 2, prep: 1, dac: 1, conn: 1 }, conn: 'obwohl',
    en: [{ k: 'k1', t: 'Although' }, ' it was raining, we ', { k: 'v1', t: 'decided on' }, ' the old ', { k: 'n1', t: 'hiking trail' }, '. We had ', { k: 'v2', t: 'prepared' }, ' ', { k: 'd1', t: 'for it' }, ' for weeks. ', { k: 'p1', t: 'During' }, ' the tour my ', { k: 'n2', t: 'backpack' }, ' broke. In the end we ', { k: 'v3', t: 'laughed about' }, ' it anyway.'],
    de: 'Obwohl es regnete, entschieden wir uns für den alten Wanderweg. Wir hatten uns wochenlang darauf vorbereitet. Während der Tour ging mein Rucksack kaputt. Am Ende haben wir trotzdem darüber gelacht.',
    tip: '„obwohl" schickt das Verb ans Ende des Nebensatzes.',
    items: [
      { k: 'v1', cat: 'verb', en: 'decided on', sol: 'entschieden uns für', rekt: 'sich entscheiden für + Akk', acc: ['entschieden', 'entscheiden'], tags: ['conjugation', 'case'] },
      { k: 'v2', cat: 'verb', en: 'prepared (for)', sol: 'vorbereitet', rekt: 'sich vorbereiten auf + Akk', acc: ['vorbereitet', 'vorbereiten'], tags: ['conjugation'] },
      { k: 'v3', cat: 'verb', en: 'laughed about', sol: 'gelacht über', rekt: 'lachen über + Akk', acc: ['gelacht', 'lachten', 'lachen'], tags: ['conjugation', 'preposition'] },
      { k: 'n1', cat: 'noun', en: 'hiking trail', sol: 'der Wanderweg', acc: ['wanderweg'], tags: ['noun'] },
      { k: 'n2', cat: 'noun', en: 'backpack', sol: 'der Rucksack', acc: ['rucksack'], tags: ['noun'] },
      { k: 'p1', cat: 'prep', en: 'during', sol: 'während + Gen', acc: ['während', 'waehrend'], tags: ['preposition', 'case'] },
      { k: 'd1', cat: 'dac', en: 'for it', sol: 'darauf', acc: ['darauf', 'drauf'], tags: ['compound'] },
      { k: 'k1', cat: 'conn', en: 'although', sol: 'obwohl — Verb ans Ende', acc: ['obwohl'], tags: ['connector', 'word-order'], fam: 'konzessiv' }] },
  { id: 'c4', sents: 1, counts: { verb: 1, noun: 1, prep: 1, dac: 0, conn: 0 }, conn: null,
    en: ['The children are ', { k: 'v1', t: 'running' }, ' ', { k: 'p1', t: 'through' }, ' the ', { k: 'n1', t: 'park' }, '.'],
    de: 'Die Kinder laufen durch den Park.',
    tip: '„durch" fordert immer den Akkusativ.',
    items: [
      { k: 'v1', cat: 'verb', en: 'running', sol: 'laufen', acc: ['laufen', 'läuft', 'rennen'], tags: ['conjugation'] },
      { k: 'n1', cat: 'noun', en: 'park', sol: 'der Park', acc: ['park'], tags: ['noun'] },
      { k: 'p1', cat: 'prep', en: 'through', sol: 'durch + Akk', acc: ['durch'], tags: ['preposition', 'case'] }] },
  { id: 'c5', sents: 1, counts: { verb: 2, noun: 1, prep: 0, dac: 0, conn: 1 }, conn: 'jedoch',
    en: ['He ', { k: 'v1', t: 'apologized' }, ' for the ', { k: 'n1', t: 'delay' }, '; ', { k: 'k1', t: 'however' }, ', his boss did not ', { k: 'v2', t: 'answer' }, ' him.'],
    de: 'Er entschuldigte sich für die Verspätung, jedoch antwortete ihm sein Chef nicht.',
    tip: '„jedoch" erzwingt Inversion — und „antworten" nimmt den Dativ.',
    items: [
      { k: 'v1', cat: 'verb', en: 'apologized', sol: 'entschuldigte sich', rekt: 'sich entschuldigen für + Akk', acc: ['entschuldig'], tags: ['conjugation', 'case'] },
      { k: 'v2', cat: 'verb', en: 'answer', sol: 'antwortete ihm', rekt: 'antworten + Dat', acc: ['antwort'], tags: ['conjugation', 'case'] },
      { k: 'n1', cat: 'noun', en: 'delay', sol: 'die Verspätung', acc: ['verspätung', 'verspaetung'], tags: ['noun'] },
      { k: 'k1', cat: 'conn', en: 'however', sol: 'jedoch — Inversion', acc: ['jedoch', 'allerdings'], tags: ['connector', 'word-order'], fam: 'adversativ' }] },
  { id: 'c6', sents: 2, counts: { verb: 2, noun: 2, prep: 1, dac: 1, conn: 1 }, conn: 'weil',
    en: ['We are ', { k: 'v1', t: 'talking' }, ' ', { k: 'p1', t: 'with' }, ' the ', { k: 'n1', t: 'customer' }, ' about the ', { k: 'n2', t: 'offer' }, ', ', { k: 'k1', t: 'because' }, ' he ', { k: 'v2', t: 'asked for' }, ' a discount. I am counting ', { k: 'd1', t: 'on it' }, '.'],
    de: 'Wir sprechen mit dem Kunden über das Angebot, weil er nach einem Rabatt gefragt hat. Ich verlasse mich darauf.',
    tip: '„weil" ist Subjunktor: „… weil er … gefragt hat" — Verb ganz ans Ende.',
    items: [
      { k: 'v1', cat: 'verb', en: 'talking (about)', sol: 'sprechen über', rekt: 'sprechen über + Akk', acc: ['sprechen', 'spricht', 'gesprochen'], tags: ['conjugation', 'preposition'] },
      { k: 'v2', cat: 'verb', en: 'asked for', sol: 'gefragt hat', rekt: 'fragen nach + Dat', acc: ['gefragt', 'fragt', 'fragen'], tags: ['conjugation', 'word-order'] },
      { k: 'n1', cat: 'noun', en: 'customer', sol: 'der Kunde', acc: ['kunden', 'kunde'], tags: ['noun'] },
      { k: 'n2', cat: 'noun', en: 'offer', sol: 'das Angebot', acc: ['angebot'], tags: ['noun'] },
      { k: 'p1', cat: 'prep', en: 'with', sol: 'mit + Dat', acc: ['mit'], tags: ['preposition', 'case'] },
      { k: 'd1', cat: 'dac', en: 'on it', sol: 'darauf', acc: ['darauf'], tags: ['compound'] },
      { k: 'k1', cat: 'conn', en: 'because', sol: 'weil — Verb ans Ende', acc: ['weil', 'da '], tags: ['connector', 'word-order'], fam: 'kausal' }] },
  { id: 'c7', sents: 1, counts: { verb: 1, noun: 2, prep: 1, dac: 0, conn: 1 }, conn: 'bevor',
    en: [{ k: 'k1', t: 'Before' }, ' the ', { k: 'n1', t: 'meeting' }, ' ', { k: 'v1', t: 'begins' }, ', put the ', { k: 'n2', t: 'documents' }, ' ', { k: 'p1', t: 'on' }, ' the table.'],
    de: 'Bevor die Besprechung beginnt, leg die Unterlagen auf den Tisch.',
    tip: 'Wechselpräposition „auf": Richtung → Akkusativ (auf den Tisch).',
    items: [
      { k: 'v1', cat: 'verb', en: 'begins', sol: 'beginnt', acc: ['beginnt', 'beginnen', 'anfängt'], tags: ['conjugation', 'word-order'] },
      { k: 'n1', cat: 'noun', en: 'meeting', sol: 'die Besprechung', acc: ['besprechung', 'sitzung', 'meeting'], tags: ['noun'] },
      { k: 'n2', cat: 'noun', en: 'documents', sol: 'die Unterlagen', acc: ['unterlagen', 'dokumente'], tags: ['noun'] },
      { k: 'p1', cat: 'prep', en: 'on(to)', sol: 'auf + Akk (Richtung)', acc: ['auf'], tags: ['preposition', 'case'] },
      { k: 'k1', cat: 'conn', en: 'before', sol: 'bevor — Verb ans Ende', acc: ['bevor'], tags: ['connector', 'word-order'], fam: 'temporal' }] },
  { id: 'c8', sents: 2, counts: { verb: 2, noun: 2, prep: 1, dac: 1, conn: 1 }, conn: 'obwohl',
    en: ['My sister is ', { k: 'v1', t: 'interested in' }, ' the ', { k: 'n1', t: 'apartment' }, ', ', { k: 'k1', t: 'although' }, ' she rarely thinks ', { k: 'd1', t: 'about it' }, '. ', { k: 'p1', t: 'On' }, ' Saturday she is ', { k: 'v2', t: 'meeting' }, ' with the ', { k: 'n2', t: 'landlord' }, '.'],
    de: 'Meine Schwester interessiert sich für die Wohnung, obwohl sie selten daran denkt. Am Samstag trifft sie sich mit dem Vermieter.',
    tip: 'Reflexiv + Rektion: sich interessieren für + Akk, sich treffen mit + Dat.',
    items: [
      { k: 'v1', cat: 'verb', en: 'interested in', sol: 'interessiert sich für', rekt: 'sich interessieren für + Akk', acc: ['interessiert'], tags: ['conjugation', 'case'] },
      { k: 'v2', cat: 'verb', en: 'meeting (with)', sol: 'trifft sich mit', rekt: 'sich treffen mit + Dat', acc: ['trifft', 'treffen', 'getroffen'], tags: ['conjugation', 'case'] },
      { k: 'n1', cat: 'noun', en: 'apartment', sol: 'die Wohnung', acc: ['wohnung'], tags: ['noun'] },
      { k: 'n2', cat: 'noun', en: 'landlord', sol: 'der Vermieter', acc: ['vermieter'], tags: ['noun'] },
      { k: 'p1', cat: 'prep', en: 'on (Saturday)', sol: 'an + Dat (am Samstag)', acc: ['am'], tags: ['preposition', 'case'] },
      { k: 'd1', cat: 'dac', en: 'about it', sol: 'daran', acc: ['daran'], tags: ['compound'] },
      { k: 'k1', cat: 'conn', en: 'although', sol: 'obwohl — Verb ans Ende', acc: ['obwohl'], tags: ['connector', 'word-order'], fam: 'konzessiv' }] },
  { id: 'c9', sents: 2, counts: { verb: 1, noun: 1, prep: 0, dac: 0, conn: 1 }, conn: 'dennoch',
    en: ['He failed the ', { k: 'n1', t: 'exam' }, '. ', { k: 'k1', t: 'Nevertheless' }, ' he is not ', { k: 'v1', t: 'giving up' }, '.'],
    de: 'Er hat die Prüfung nicht bestanden. Dennoch gibt er nicht auf.',
    tip: '„dennoch": Inversion — und das trennbare „aufgeben" spaltet sich: gibt … auf.',
    items: [
      { k: 'v1', cat: 'verb', en: 'giving up', sol: 'gibt … auf', rekt: 'aufgeben — trennbar', acc: ['gibt', 'aufgeben', 'aufgegeben'], tags: ['conjugation', 'word-order'] },
      { k: 'n1', cat: 'noun', en: 'exam', sol: 'die Prüfung', acc: ['prüfung', 'pruefung'], tags: ['noun'] },
      { k: 'k1', cat: 'conn', en: 'nevertheless', sol: 'dennoch — Inversion', acc: ['dennoch', 'trotzdem'], tags: ['connector', 'word-order'], fam: 'konzessiv' }] },
  { id: 'c10', sents: 2, counts: { verb: 2, noun: 1, prep: 1, dac: 1, conn: 0 }, conn: null,
    en: [{ k: 'p1', t: 'Since' }, ' the ', { k: 'n1', t: 'accident' }, ' he has been ', { k: 'v1', t: 'afraid of' }, ' dogs. His friends ', { k: 'v2', t: 'know' }, ' ', { k: 'd1', t: 'about it' }, '.'],
    de: 'Seit dem Unfall hat er Angst vor Hunden. Seine Freunde wissen davon.',
    tip: '„seit" + Dativ; und „wissen von" wird zum Kompositum „davon".',
    items: [
      { k: 'v1', cat: 'verb', en: 'afraid of', sol: 'hat Angst vor', rekt: 'Angst haben vor + Dat', acc: ['angst'], tags: ['conjugation', 'case'] },
      { k: 'v2', cat: 'verb', en: 'know (about)', sol: 'wissen von', rekt: 'wissen von + Dat', acc: ['wissen', 'weiß', 'weiss'], tags: ['conjugation', 'preposition'] },
      { k: 'n1', cat: 'noun', en: 'accident', sol: 'der Unfall', acc: ['unfall'], tags: ['noun'] },
      { k: 'p1', cat: 'prep', en: 'since', sol: 'seit + Dat', acc: ['seit'], tags: ['preposition', 'case'] },
      { k: 'd1', cat: 'dac', en: 'about it', sol: 'davon', acc: ['davon'], tags: ['compound'] }] },
];
