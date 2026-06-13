# German Trainer

A browser app for drilling German grammar and vocabulary (nouns, adjectives, verbs, declension, prepositions) with AI-assisted exercises. This glossary pins the language used across the app so features stay consistent.

## Language

### Quiz framing

**Direction**:
Which way the learner translates in a translation drill: `EN→DE` (shown the English, types the German) or `DE→EN` (shown the German, types the English).
_Avoid_: mode, way, side

**Grading mode**:
How a typed answer is judged: `AI` (meaning-aware verdict plus a coaching tip) or `Exact` (local match against the reference, forgiving case/punctuation/whitespace).
_Avoid_: checking, scoring method

**Word hint**:
A highlighted word in the *source* sentence of a translation prompt that reveals its target-language vocabulary on demand (hover, tap, or keyboard focus). A scaffold, not the answer — it reveals the dictionary form, leaving any inflection to the learner. EN→DE only. Scope depends on the drill: the preposition sentence quiz hints the preposition and the assigned theme nouns only (German built from stored data); the [Verb sentence quiz] hints every drilled verb and *every* noun (assigned and incidental), and the German for incidental words is supplied by the AI, not stored data.
_Avoid_: tooltip, popover, reveal, clue

### Prepositions

**Two-way preposition** (Wechselpräposition):
A preposition that governs the accusative for motion/direction and the dative for location.
_Avoid_: dual preposition, mixed preposition

**Assigned theme noun**:
A noun the drill deliberately selects from the learner's chosen noun theme and builds a sentence around. These are the vocabulary the drill tests, and the only nouns eligible for a word hint.
_Avoid_: target noun, chosen noun

**Incidental noun**:
A noun the AI introduces to make a generated sentence natural (e.g. the subject "the cat"). Not selected by the drill and not tested. Never hinted in the preposition quiz; hinted in the [Verb sentence quiz], where every noun is highlighted and its German is AI-supplied.
_Avoid_: extra noun, filler noun

**Error tag**:
A classification the grader assigns to a wrong sentence-translation answer, naming *what* went wrong. One of: `preposition` (wrong or missing preposition word), `case` (the right preposition but the wrong governed case — a mis-inflected article/ending), `noun` (a wrong assigned theme noun — wrong word, gender, or form), `typo` (a slip elsewhere in the sentence, not on the preposition, case, or assigned noun). A single answer may carry several. Assigned only for `EN→DE` sentence translation.
_Avoid_: error type, mistake category, error reason

**Weak point**:
A preposition, assigned theme noun, or [Drilled verb] the learner fails disproportionately often, surfaced from recorded sentence-translation attempts. The basis for suggesting targeted remedial practice.
_Avoid_: weakness, problem area, trouble word

**Remedial drill**:
A generated practice session aimed at the learner's weak points. Unlike the regular sentence-translation drill (random prepositions), it draws from the learner's weakest prepositions and nouns and blends several question formats — case fill-ins, noun cards, sentence translations — in proportion to the learner's recent error tags. Its own answers feed back into weak-point tracking.
_Avoid_: practice mode, review quiz, custom quiz

### Verbs

**Verb sentence quiz**:
An AI-generated EN→DE translation drill for verbs, the verb counterpart of the preposition sentence quiz. The learner picks a verb pool (level + type + governed case) and a noun theme; the app samples verbs, the AI writes an English+German sentence pair per item using 1–2 [Drilled verb]s and 1–2 [Assigned theme noun]s, the learner types the German, and the AI grades it. Distinct from the older word-level **Verb translation** (infinitive ↔ English) and **Verb conjugation** drills, which it does not replace.
_Avoid_: verb translation (means the word-level drill), sentence builder

**Drilled verb**:
A verb the verb sentence quiz deliberately samples from the chosen level/type/case pool and builds a sentence around — the verb analogue of an [Assigned theme noun]. The vocabulary the quiz tests; the basis (with theme nouns) for verb [Weak point]s. An [Incidental noun]'s verb counterpart (a verb the AI adds only for naturalness) is not separately named — every finite verb is highlighted, but only drilled verbs are tracked.
_Avoid_: target verb, chosen verb

**Verb error tag**:
A classification the grader assigns to a wrong verb-sentence answer, the verb counterpart of [Error tag]. One of: `conjugation` (the right verb but a wrong form — tense, person, auxiliary, or Partizip), `case` (the wrong case for an object the verb governs), `word-order` (verb-second, verb-final, or split separable-prefix placement gone wrong), `noun` (a wrong assigned theme noun — word, gender, or form), `typo` (a slip elsewhere). A single answer may carry several. EN→DE + AI grading only.
_Avoid_: verb mistake type, conjugation error

**Verb remedial drill**:
A [Verb sentence quiz] run whose verb and noun pools are drawn from the learner's [Weak point]s (weakest drilled verbs + theme nouns from recent history) instead of random sampling — the verb counterpart of the preposition [Remedial drill], but a *single* format (weak-weighted sentence translation) rather than a blend of formats.
_Avoid_: review mode, weak-verb quiz

### Vocabulary forms

**Dictionary form**:
A word as it appears in a dictionary entry — for a noun, its article plus the nominative singular (`der Tisch`); for a preposition, the bare word (`auf`). What a word hint reveals.
_Avoid_: base form, lemma, citation form

**Inflected form**:
A word as it actually appears in a sentence after declension/conjugation (`den Tisch`). The learner must produce this themselves; hints never reveal it.
_Avoid_: surface form, conjugated form
