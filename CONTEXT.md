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
A highlighted word in the *source* sentence of a translation prompt that reveals its target-language vocabulary on demand (hover, tap, or keyboard focus). A scaffold, not the answer — it reveals the dictionary form, leaving any inflection to the learner. Currently EN→DE only.
_Avoid_: tooltip, popover, reveal, clue

### Prepositions

**Two-way preposition** (Wechselpräposition):
A preposition that governs the accusative for motion/direction and the dative for location.
_Avoid_: dual preposition, mixed preposition

**Assigned theme noun**:
A noun the drill deliberately selects from the learner's chosen noun theme and builds a sentence around. These are the vocabulary the drill tests, and the only nouns eligible for a word hint.
_Avoid_: target noun, chosen noun

**Incidental noun**:
A noun the AI introduces to make a generated sentence natural (e.g. the subject "the cat"). Not selected by the drill, not tested, and never hinted.
_Avoid_: extra noun, filler noun

**Error tag**:
A classification the grader assigns to a wrong sentence-translation answer, naming *what* went wrong. One of: `preposition` (wrong or missing preposition word), `case` (the right preposition but the wrong governed case — a mis-inflected article/ending), `noun` (a wrong assigned theme noun — wrong word, gender, or form), `typo` (a slip elsewhere in the sentence, not on the preposition, case, or assigned noun). A single answer may carry several. Assigned only for `EN→DE` sentence translation.
_Avoid_: error type, mistake category, error reason

**Weak point**:
A preposition or assigned theme noun the learner fails disproportionately often, surfaced from recorded sentence-translation attempts. The basis for suggesting targeted remedial practice.
_Avoid_: weakness, problem area, trouble word

**Remedial drill**:
A generated practice session aimed at the learner's weak points. Unlike the regular sentence-translation drill (random prepositions), it draws from the learner's weakest prepositions and nouns and blends several question formats — case fill-ins, noun cards, sentence translations — in proportion to the learner's recent error tags. Its own answers feed back into weak-point tracking.
_Avoid_: practice mode, review quiz, custom quiz

### Vocabulary forms

**Dictionary form**:
A word as it appears in a dictionary entry — for a noun, its article plus the nominative singular (`der Tisch`); for a preposition, the bare word (`auf`). What a word hint reveals.
_Avoid_: base form, lemma, citation form

**Inflected form**:
A word as it actually appears in a sentence after declension/conjugation (`den Tisch`). The learner must produce this themselves; hints never reveal it.
_Avoid_: surface form, conjugated form
