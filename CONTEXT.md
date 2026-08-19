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
A highlighted word in the *source* sentence of a translation prompt that reveals its target-language vocabulary on demand (hover, tap, or keyboard focus). A scaffold — it reveals the dictionary form, leaving any inflection to the learner. EN→DE only. Scope depends on the drill: the preposition sentence quiz hints the preposition and the assigned theme nouns only (German built from stored data); the [Verb sentence quiz] hints every drilled verb and *every* noun (assigned and incidental), and the German for incidental words is supplied by the AI, not stored data; the [Sentence quiz] highlights every drilled item of every category (both parts of a two-part [Connector] included) plus every [Incidental noun] and every verb the AI writes for naturalness (auxiliaries and modals included) — so every verb in the prompt is highlighted, not only the drilled ones — and *every* span reveals German: drilled verbs and prepositions with their governed case (*warten + Akk*, *seit + Dat*), nouns with their article, nominative plural, and genitive plural (*der Tisch – die Tische (der Tische)*, or the singular alone when there is no plural), the [Da-compound] together with the collocation it stands for (*darauf* · *warten auf + Akk*), a [Connector] with the [Connector placement] of each of its parts — the HZ/NZ badge, the position badge, and the word order it forces, one line per part so either half of a pair shows what the other does — incidental nouns with AI-supplied article, noun, and plural, and incidental verbs with an AI-supplied infinitive, both on a visually subtler span. For a preposition, da-compound, or connector the reveal *is* the graded word — peeking there is the learner's deliberate choice, and the setup's hint toggle turns all spans off together.
_Avoid_: tooltip, popover, reveal, clue

### Prepositions

**Two-way preposition** (Wechselpräposition):
A preposition that governs the accusative for motion/direction and the dative for location.
_Avoid_: dual preposition, mixed preposition

**Prepositional collocation** (feste Präposition):
A verb, adjective, or noun that governs a fixed preposition and a fixed case — *warten auf + Akkusativ*, *stolz auf + Akkusativ*, *Angst vor + Dativ*. The **Fixed prepositions** drill shows the word and its English meaning and asks the learner to supply the preposition and its case. Each meaning that takes a *different* preposition is a separate collocation (*sich freuen auf* "look forward to" vs *sich freuen über* "be glad about"). But a single meaning that more than one preposition satisfies **equally** (*das Interesse an* ≈ *für*, *die Frage an/nach*) is *one* collocation that accepts each: it carries a set of acceptable *(preposition, case)* answers — every one is graded correct, and a card is shown for it only once per drill. Distinct from meaning-splitting pairs and from opposites (*sich entscheiden für* vs *gegen*), which stay separate because the gloss is the answer.
_Avoid_: prepositional verb (excludes adjectives and nouns), fixed phrase, idiom

**Da-compound** (Pronominaladverb):
A pronoun-like adverb — da(r) + preposition (*dafür*, *daran*, *darüber*) — standing in for preposition + pronoun when the referent is a thing, an abstract, or a whole clause, never a person (persons keep preposition + personal pronoun: *an ihn*). `dar-` before a vowel-initial preposition, `da-` otherwise; some prepositions form no compound (*ohne*, *seit*, *außer*, *gegenüber*, the genitive prepositions).
_Avoid_: Pronominaladverb / Präpositionaladverb (German subtitle only), prepositional adverb, da-word

**Wo-compound**:
The interrogative counterpart of a [Da-compound] — wo(r) + preposition (*worauf*, *womit*) — asking after a thing; asking after a person takes preposition + *wen*/*wem* instead.
_Avoid_: w-compound, question adverb, wo-word

**Fixed-preposition core idea**:
The single dominant sense a preposition carries across its [Prepositional collocation]s — *über* marks the topic of talking/thinking, *nach* reaching-toward/seeking, *vor* fear/avoidance, *auf* anticipation. A memory hook, not a rule: which word governs which preposition is still memorized. The organizing spine of the **Fixed prepositions cheatsheet** (de *Spickzettel*), which groups collocations by preposition and states this hook instead of enumerating them — the mnemonic counterpart to the verb Cheatsheet's grammar rules.
_Avoid_: theme, meaning, category, rule.

**Core-idea hint**:
A one-line English cue shown on a Fixed prepositions drill card *before* the learner answers, worded to evoke the governed preposition's [Fixed-preposition core idea] as it applies to that one [Prepositional collocation] (*warten auf*: "your attention is oriented toward something still ahead") — *without* naming the preposition or the case. A scaffold for recall: it points toward the answer, it does not give it. For two-way prepositions the sense also carries the case (*denken an*: "the mind reaches out and fastens on a target" vs *teilnehmen an*: "you stand inside it, taking your part"). Distinct from the [Fixed-preposition core idea], which is the *preposition-level* mnemonic shared across a preposition's collocations; the core-idea hint specialises it down to a *single* collocation. Stored per collocation as `coreIdeaHint` (≤ 90 chars, ≤ 14 words, unique across the dataset). A setup toggle (default on) shows or hides it for the whole drill. Distinct from [Word hint], which reveals vocabulary in translation drills.
_Avoid_: scene hint, description, example retelling, tooltip

**Core-idea explanation**:
A short English explanation (one to two sentences) shown *after* a **wrong** answer in the Fixed prepositions drill — on the card's reveal, and beneath each missed word on the result screen. It *explains the mapping*: it unpacks **how** the collocation's [Core-idea hint] image enacts the governed preposition's [Fixed-preposition core idea] — the mechanism, not merely a restatement of both — then names the word, preposition, and case (*zweifeln an*: "A nagging doubt 'snags at one spot and refuses to hold' — it stays fastened to the one thing you can't be sure of and won't move past it. That stuck, won't-let-go grip is what *an* marks: fixation on a point. So *zweifeln* takes *an* (Dativ)."). Where the [Core-idea hint] *precedes* the answer and hides it, the core-idea explanation *follows* a miss and names it — the teaching payoff. A merged interchangeable [Prepositional collocation] explains each acceptable answer. Seeded per collocation as `coreIdeaExplanation`; shown only on a wrong answer, independent of the hint toggle.
_Avoid_: hint (that is the pre-answer cue), correction, feedback, AI explanation.

**Preposition color**:
A fixed hue permanently assigned to each of the fifteen governed prepositions (e.g. *gegen* = red), used in the **Fixed prepositions** drill as a memory anchor binding a [Prepositional collocation] to its preposition. By default it appears only once the learner has answered — at the card's reveal and in the drill summary — never while answering, because it would leak the answer; the [Color hint] toggle deliberately overrides this, showing it from the start. Correct/wrong verdicts keep their own green/red and always read on top of it. The cheatsheet does not use preposition colors.
_Avoid_: theme color, category color, highlight

**Color hint**:
The [Preposition color] shown on the drill card *before* the learner answers, as an opt-in cue. Unlike the [Core-idea hint], which evokes the preposition without naming it, the color hint gives the preposition away outright to a learner who knows the color scheme, leaving only the case to recall — its purpose is as much to drill the color↔preposition mapping itself as to scaffold the answer. Keyed to the preposition, not the case, so it never reveals the governed case. A setup toggle (default off) turns it on for the whole drill; when off, the [Preposition color] appears only on reveal. Distinct from [Word hint] (vocabulary in translation drills) and [Core-idea hint] (a worded cue).
_Avoid_: color coaching, color scheme trainer

**Assigned theme noun**:
A noun the drill deliberately selects from the learner's chosen noun theme and builds a sentence around. These are the vocabulary the drill tests, and the only nouns eligible for a word hint.
_Avoid_: target noun, chosen noun

**Incidental noun**:
A noun the AI introduces to make a generated sentence natural (e.g. the subject "the cat"). Not selected by the drill and not tested. Never hinted in the preposition quiz; hinted in the [Verb sentence quiz] and the [Sentence quiz], where every noun is highlighted and its German (article + noun, so the gender shows) is AI-supplied — the [Sentence quiz] hint adds the plural too, also AI-supplied.
_Avoid_: extra noun, filler noun

**Error tag**:
A classification the grader assigns to a wrong sentence-translation answer, naming *what* went wrong. One of: `preposition` (wrong or missing preposition word), `case` (the right preposition but the wrong governed case — a mis-inflected article/ending), `noun` (a wrong assigned theme noun — wrong word, gender, or form), `typo` (a slip elsewhere in the sentence, not on the preposition, case, or assigned noun). A single answer may carry several. Assigned only for `EN→DE` sentence translation.
_Avoid_: error type, mistake category, error reason

**Weak point**:
A preposition, assigned theme noun, [Drilled verb], [Prepositional collocation], [Adverb pair], or [Connector] the learner fails disproportionately often, surfaced from recorded sentence-translation attempts. Evidence pools across drills: a verb missed in the [Sentence quiz] and one missed in the [Verb sentence quiz] count toward the same weak point. The basis for suggesting targeted remedial practice.
_Avoid_: weakness, problem area, trouble word

**Remedial drill**:
A generated practice session aimed at the learner's weak points. Unlike the regular sentence-translation drill (random prepositions), it draws from the learner's weakest prepositions and nouns and blends several question formats — case fill-ins, noun cards, sentence translations — in proportion to the learner's recent error tags. Its own answers feed back into weak-point tracking.
_Avoid_: practice mode, review quiz, custom quiz

**Tagesplan**:
The panel at the top of Home that gathers, read-only, everything currently asking for attention — offene and [Fällig]e corrections, wackelige Dativ-Wörter, the weakest [Weak point]s, the lowest mastery bands — each row deep-linking into the owning module. It aggregates; it never samples: no drill's card selection changes because the Tagesplan exists (weakness-drawn runs stay the [Remedial drill]'s job). When nothing asks for attention it renders nothing — advice, not obligation.
_Avoid_: dashboard (that is the History page's world), today view, review queue, scheduler

### Verbs

**Verb level**:
A label naming one frequency-ordered batch of the verb pool (`A1`, `A2`, `B1`, `B2.1`, `B2.2`). Verbs are admitted by corpus frequency — each level is "the next most frequent verbs not yet in the pool", named for the CEFR stage it roughly serves, not an official CEFR classification; `B2.1` and `B2.2` are the first and second batches of the advanced pool.
_Avoid_: CEFR level (the learner-assessment scale is separate), difficulty, tier

**Verb translation**:
The word-level verb drill: one card, one prompt, no sentence. `DE→EN` ("Blatt") shows the German infinitive and asks for the English; `EN→DE` comes in two variants — [Bedeutungsfeld] and [Präzise] — chosen at setup as the **Variante**. A run records as one history type whichever direction and Variante it used. Distinct from the [Verb sentence quiz], which drills verbs inside AI-generated sentences.
_Avoid_: translation quiz (ambiguous across drills), vocabulary quiz

**Bedeutungsfeld**:
The lenient `EN→DE` variant of [Verb translation]: one card shows one bare English meaning, and *any* pool verb carrying that meaning is accepted — naming one member of the meaning's field wins the card.
_Avoid_: level 1, meaning-field mode, synonym quiz

**Präzise**:
The exacting `EN→DE` variant of [Verb translation]: one card per [Sense] — the English meaning arrives narrowed by a situation, and only a verb fitting *that* situation counts; [Bedeutungsfeld] siblings belonging to a different sense are rejected. Draws from the whole filtered pool: a meaning only one pool verb carries is a plain exact card (no situation cue needed), so Präzise covers the same vocabulary as [Bedeutungsfeld], just strictly. A sampled verb is drilled in *every* sense it carries — so a deck may hold more cards than sampled verbs — and a sense appears at most once per deck, however many of its verbs were sampled. A miss answered with a sibling from another sense of the same meaning is named as such on the reveal, cue and all — the teaching payoff, in the spirit of the [Core-idea explanation]. Deliberately not called a "level": [Verb level] means the frequency batches.
_Avoid_: level 2, exact mode, strict mode

**Sense** (de Lesart):
One situation-specific reading of an English meaning — the unit a [Präzise] card drills: a *situation cue* (a short parenthetical English narrowing, e.g. *accept (a fact, grudgingly)*) plus the set of verbs that fit that situation **equally** — usually exactly one, occasionally more (*anfangen/beginnen* both fit "begin (doing something)"), every one graded correct. The verb analogue of the interchangeable [Prepositional collocation]: where no situation can split two verbs, they share one sense rather than being forced apart by an artificial cue.
_Avoid_: situation (that is the cue, not the unit), meaning (the un-narrowed prompt), translation, variant

**Verb sentence quiz**:
An AI-generated EN→DE translation drill for verbs, the verb counterpart of the preposition sentence quiz. The learner picks a verb pool (level + type + governed case) and a noun theme; the app samples verbs, the AI writes an English+German sentence pair per item using 1–2 [Drilled verb]s and 1–2 [Assigned theme noun]s, the learner types or speaks the German (see [Modality]), and the AI grades it. Either [Modality] can play the reference sentence aloud on demand once a card is graded — that is output, not input, so it is not part of the Modality distinction. Distinct from the older word-level **Verb translation** (infinitive ↔ English) and **Verb conjugation** drills, which it does not replace. Setup also has a Zeitformen selection — all 15 `VerbTense` forms (Präsens through Passiv Konjunktiv II), grouped by CEFR level; each spec is assigned a form before generation from an evenly-rotating bag, with passive forms drawn only onto accusative-capable specs, and the default tracks the chosen level until first customised. The [Verb remedial drill] stays untensed.
_Avoid_: verb translation (means the word-level drill), sentence builder

**Drilled verb**:
A verb the verb sentence quiz deliberately samples from the chosen level/type/case pool and builds a sentence around — the verb analogue of an [Assigned theme noun]. The vocabulary the quiz tests; the basis (with theme nouns) for verb [Weak point]s. An [Incidental noun]'s verb counterpart (a verb the AI adds only for naturalness) is not separately named — every finite verb is highlighted, but only drilled verbs are tracked.
_Avoid_: target verb, chosen verb

**Verb error tag**:
A classification the grader assigns to a wrong verb-sentence answer, the verb counterpart of [Error tag]. One of: `conjugation` (the right verb but a wrong form — tense, person, auxiliary, or Partizip), `case` (the wrong case for an object the verb governs), `word-order` (verb-second, verb-final, or split separable-prefix placement gone wrong), `noun` (a wrong assigned theme noun — word, gender, or form), `typo` (a slip elsewhere). A single answer may carry several. EN→DE + AI grading only. `typo` is never assigned in a `spoken` [Modality]: the spelling there is the speech recognizer's, not the learner's.
_Avoid_: verb mistake type, conjugation error

**Verb remedial drill**:
A [Verb sentence quiz] run whose verb and noun pools are drawn from the learner's [Weak point]s (weakest drilled verbs + theme nouns from recent history) instead of random sampling — the verb counterpart of the preposition [Remedial drill], but a *single* format (weak-weighted sentence translation) rather than a blend of formats.
_Avoid_: review mode, weak-verb quiz

**Principal parts** (Stammformen):
A verb's citation set — infinitive, third-person-singular Präteritum, Partizip II, and the perfect-tense auxiliary (*haben*/*sein*) — learned and recalled as one unit. The **Principal parts** drill tests the whole set for a verb at once and counts a card correct only when every part is right. Distinct from the conjugation drill, which fills all six person-forms of a chosen tense.
_Avoid_: principal forms, base forms, stem forms; conjugation (the six-form drill)

**Verb case government** (Rektion):
The grammatical case a verb requires of its object — `accusative` (the default), `dative` (*helfen*, *danken*), `dative + accusative` (ditransitive, *geben*), `genitive` (rare, *gedenken*), a reflexive pronoun (*sich freuen*), or none (intransitive). The **Verb case government** drill shows a verb and the learner identifies which case it governs. Verbs whose governed case varies by meaning are excluded from the drill.
_Avoid_: valency, government, case selection

### Vocabulary forms

**Dictionary form**:
A word as it appears in a dictionary entry — for a noun, its article plus the nominative singular (`der Tisch`); for a preposition, the bare word (`auf`). What a word hint reveals.
_Avoid_: base form, lemma, citation form

**Inflected form**:
A word as it actually appears in a sentence after declension/conjugation (`den Tisch`). The learner must produce this themselves; hints never reveal it.
_Avoid_: surface form, conjugated form

### Direction words

**Perspective adverb**:
A hin/her word — bare *hin*/*her* or a preposition compound (*hinein/herein*, *hinauf/herauf*, *hinaus/heraus*, *hinunter/herunter*, *hinüber/herüber*, *herum*, *hervor*, *hindurch*) — encoding motion relative to the speaker's position: *hin* = away from the speaker, *her* = toward the speaker. The subject matter of the **Direction Words** module. Not to be confused with [Direction], which is the EN→DE/DE→EN axis of a translation drill.
_Avoid_: directional adverb, direction word (collides with [Direction]), hin/her word, movement adverb

**Adverb pair**:
The hin-/her- twins built on one preposition (*hinauf/herauf*), differing only in speaker perspective. The unit the Direction Words drills filter by and track [Weak point]s against — the module's analogue of a governed preposition.
_Avoid_: compound pair, twin forms

**R-form**:
The colloquial contraction of a [Perspective adverb] compound — *rein, raus, rauf, runter, rüber* — which collapses the hin/her distinction entirely. Spoken-register standard, written-register marked; never itself wrong, unlike misformed compounds (\**hinrein*).
_Avoid_: short form, slang form, contraction (too generic)

**Lexicalized prefix verb**:
A verb whose hin-/her- separable prefix no longer means direction — *herstellen* (produce), *hinweisen* (point out), *hinrichten* (execute), *herausfinden* (find out). Vocabulary, not perspective: the perspective rule does not apply and cannot be used to guess the meaning.
_Avoid_: idiom verb, faded-direction verb, prefix verb (unqualified)

**Direction error tag**:
A classification the grader assigns to a wrong Direction Words sentence answer. `direction` (any wrong [Perspective adverb]: wrong hin/her side, wrong compound, or a misformed one like \**hinrein*) joins the reused `conjugation`, `case`, `word-order`, `noun`, and `typo` tags. A single answer may carry several; `direction` errors feed [Weak point]s per [Adverb pair].
_Avoid_: perspective error, compound error (the da-compounds tag)

**Scene diagram**:
A schematic picture shown with a Direction Words drill card that fixes where the speaker stands and which way the motion goes — the information the perspective rule needs and the sentence alone may not give. Drawn from a small set of reusable scene archetypes (stairs, doorway, window, street, hill, room); its one-line text description doubles as the accessible fallback.
_Avoid_: illustration, image, picture hint

### Dative

**Dative verb** (Dativverb):
A verb whose *only* object is dative — *helfen*, *danken*, *begegnen*. The absence of an accusative object is what defines the class: a verb taking both (*geben*) is a [Ditransitive verb], not a dative verb. Membership is unpredictable from meaning and unpredictable from English, which is why the module tracks it per verb rather than by rule. ~45 members, the module's primary item bank.
_Avoid_: dative-only verb (redundant), indirect-object verb, Dativobjekt-Verb

**Semantic family**:
One of the three readings the dative gives its object across the [Dative verb] set — `recipient` (*danken*, *antworten*, *raten*), `experiencer` (*gefallen*, *schmecken*, *wehtun*), `co-agent` (*helfen*, *folgen*, *widersprechen*). A memory hook, not a rule: membership is still memorized. The organizing spine of the **Dativ cheatsheet**, the way [Fixed-preposition core idea] organizes the preposition cheatsheet. Stored per verb as `family`.
_Avoid_: semantic role, category, group, class

**Swallowed accusative**:
The hook explaining why a [Dative verb] governs the dative: an accusative object was absorbed into the verb's own meaning, leaving the indirect object behind — *antworten* = give [an answer] to sb, *danken* = give [thanks] to sb. Applies to most `recipient`-family verbs and some `co-agent` ones; it does **not** apply to the `experiencer` family, and the data must not claim it does. The content of the [Core-idea explanation] for this module.
_Avoid_: implied object, dropped object, hidden accusative

**Inverted experiencer**:
A [Dative verb] of the `experiencer` family where the *thing* is the nominative subject and controls verb agreement, while the person is the dative object — *Die Schuhe gefallen mir*, *Das Essen schmeckt mir*. The mirror of the English construction, and the source of the two errors the module's family IV exists to kill: `*Ich gefalle das Buch` (person taken as subject) and `*Die Schuhe gefällt mir` (agreement with the dative). Flagged per verb as `experiencer`.
_Avoid_: reversed verb, backwards verb, psych verb, gefallen-type

**Twin verb**:
A near-synonym of a [Dative verb] that governs the *accusative* instead, usually formed by prefixing — *antworten*/*beantworten*, *folgen*/*verfolgen*, *zuhören*/*hören*, *helfen*/*unterstützen*. The pair is the unit family V drills. Stored per verb as `twin`; both members must genuinely differ in governed case per `verbs.ts`, never an invented contrast.
_Avoid_: pair, minimal pair (that is the drill format), synonym, prefix variant

**English pull**:
The property of a [Dative verb] whose English equivalent takes a plain direct object, so L1 transfer pushes the learner toward the accusative — *help*, *follow*, *thank*, *answer*, *trust*, *congratulate*, *contradict*, *resemble*. The highest-yield trap set; flagged per verb as `englishPull` and the basis of family III.
_Avoid_: L1 interference, false friend, transfer error, English trap

**Ditransitive verb** (Verb mit Dativ und Akkusativ):
A verb taking both a dative and an accusative object — *geben*, *erklären*, *schenken*. 36 already carry `case: "dative+accusative"` in the pool. Distinguished from a [Dative verb] in that its dative is *predictable* from the recipient role and needs no memorizing — so it is band-tracked only, never entered in the [Item ledger]. Its own trap is [Object order].
_Avoid_: double-object verb, dative-accusative verb, two-object verb

**Object order**:
The rule governing the sequence of a [Ditransitive verb]'s two objects: dative before accusative by default (*Ich gebe dem Kind das Buch*), but **accusative before dative when both are pronouns** (*Ich gebe es ihm*). The subject matter of T8 and the source of the `object-order` [Dative error tag].
_Avoid_: word order (that is the general concept), pronoun order (only the exception), object sequence

**Free dative** (freier Dativ):
An *optional* dative adjunct the verb does not require, in three readings — `commodi` (to whose benefit: *Ich trage dir den Koffer*), `possessivus`/Pertinenzdativ (an inalienable possessor: *Wasch dir die Hände*), `ethicus` (an emotionally involved non-participant, near-particle, almost only *mir*/*dir*: *Sei mir bloß vorsichtig!*). Contrasted against a [Dative verb]'s obligatory object — dropping a free dative leaves a grammatical sentence, dropping a dative verb's object does not. That test is what family VIII drills.
_Avoid_: optional dative, adverbial dative, extra dative

**Dative error tag**:
A classification the grader assigns to a wrong answer in the Dativ module, the module's counterpart of [Verb error tag]. One of: `case` (accusative — or any wrong case — where dative is required), `subject` (an [Inverted experiencer]'s subject or agreement wrong), `twin` (the [Twin verb] used instead of the dative one, or vice versa), `object-order` ([Object order] violated), plus the reused `conjugation`, `word-order`, `noun`, and `typo`. A single answer may carry several. `case` and `subject` feed [Weak point]s per verb.
_Avoid_: dative mistake, case error (that is one tag, not the set)

**Item ledger**:
The module's per-item lifetime progress store (`gt:dativeLedger`) — one entry per memorization item, meaning every [Dative verb] plus every dative-governing adjective. Each entry is `new` (never encountered), `wackelig`, or `gesichert`. Drives the hub's `n / total gesichert` meter, whose denominator is derived at runtime as `Object.keys(DATIVE_VERBS).length + Object.keys(DATIVE_ADJECTIVES).length` rather than a hard-coded count, so it moves whenever a verb or adjective is added. Lifetime-scoped for the same reason ADR-0011 gives, but keyed by *item* where ADR-0011's rollup is keyed by *drill*. Rule-driven families — [Ditransitive verb]s, [Free dative]s, the passive consequence — are band-tracked only and never appear in the ledger, because there is no list to secure.
_Avoid_: mastery (that is the per-drill band), progress store, SRS, verb ledger (it holds adjectives too)

**Secured item** (gesichert):
An [Item ledger] entry whose **last three encounters were all correct**, across any drill. An entry with encounters but no clean streak of three is `wackelig`; one with none is `new`. A single miss demotes a secured item, and it must earn three clean encounters back. Chosen over an accuracy-over-a-floor rule so the meter reads current command rather than accumulated volume.
_Avoid_: mastered (collides with the per-drill mastery band), learned, known, complete

### Sentence

**Sentence quiz**:
The Sentence module's mixed drill: the learner sets a per-card count for each drilled category — [Drilled verb]s (filtered by level, type, and [Verb case government]), [Assigned theme noun]s, prepositions, [Da-compound]s, and [Connector]s — and how many [Packed card]s to generate; each card samples fresh words from the chosen pools and the AI writes a sentence pair containing them all. Translated EN→DE or DE→EN ([Direction]), typed or spoken ([Modality]), always AI-graded ([Grading mode] is not offered). EN→DE answers are graded per drilled item with the union of the single-category drills' error tags plus `connector`, and feed the same [Weak point]s those drills feed; DE→EN is judged on meaning alone and feeds nothing. Unqualified "sentence quiz" means this drill; the single-category drills keep their qualified names ([Verb sentence quiz], preposition sentence quiz). Direction Words are deliberately not a category here.
_Avoid_: mixed quiz, combined test, sentence translation (ambiguous across the five sentence drills)

**Packed card**:
One generated unit of the [Sentence quiz]: a sentence pair containing *every* item the card's category counts call for — normally 1–2 sentences, stretching to a short text of 3–4 when no natural 1–2-sentence packing exists. The stretch is the generator's call, never the learner's. Budgeted: at most 8 drilled items per card (each category 0–3, connectors 0–2), with a warning above 6 that cards will stretch — dense cards trade naturalness for coverage, which is why the budget exists.
_Avoid_: question, sentence (a card may be several), passage (that is only the stretched form)

**Domain** (de *Fachgebiet*):
A subject-matter field the [Sentence quiz] writes its [Packed card]s in — *.NET*, *SQL Server*, *Docker*. A Domain carries its own vocabulary: the nouns worth knowing in that field, and the verbs that field actually uses. Selecting one steers *what a card is about* as well as *which words it drills* — an untargeted run sets its scene arbitrarily (an office, a train station) and draws nouns from the chosen Themengruppen, a targeted run has no scene at all and instead speaks in its Domain's [Darstellungsform] — for an `erklärend` Domain, *explaining* a concept from the field (the difference between a function and a stored procedure, what an index costs, why the order of an image's layers matters) in the register of an interview answer — drawing that Domain's nouns instead. It binds the two vocabularies differently on purpose: its nouns **replace** the chosen Themengruppen, while its verbs are only **preferred** — every [Drilled verb] in the app stays eligible, so a card never wants for a verb and the [Verb level] stops selecting verbs and means only how hard the German should read. Its vocabulary is the field's *real* one, anglicisms included where those are what practitioners actually say (*der Container*, *das Repository*, *der Commit*) and German where German is what they say (*die Bereitstellung*, *die Abfrage*, *der Primärschlüssel*) — the register a colleague would use, not the one an exam would prefer. Several Domains may be selected, but each [Packed card] is written to exactly *one* of them, so a card is always internally coherent while a run spreads across the selection. Deliberately not a vocabulary category: a Themengruppe says which words an [Assigned theme noun] may be, a Domain says what the sentence is *about* — the only setting in the app that speaks to subject matter at all.
_Avoid_: theme (that is the noun category — see [Assigned theme noun]), topic (that is Sprechen's [Topic]), category, scenario, angle

**Darstellungsform**:
How a [Domain]'s [Packed card]s speak — declared once per Domain, one of three: `erklärend` (explain or contrast a concept: present tense, generic subject or *man*, no anecdote — the original targeted-card register), `erzählend` (a one-to-three-sentence STAR-story fragment a behavioral interview asks for: first person, past tense), `persönlich` (a first-person present-tense statement of the learner's own position or circumstances — salary expectation, notice period, motivation). It changes only what a scene asks the AI to write; the card mechanism — one EN+DE sentence pair, [Direction], [Modality], AI grading, error tags — is identical across all three. Deliberately one per Domain, never per card: an interview uses each topic in one way.
_Avoid_: register (a [Correction tag] kind — du/Sie slips), tone, style, card type, mode

**Katalog**:
A curated collection of [Domain]s assembled for one interview target — the type of company the learner is preparing to interview at. *Tier 1 Pharma* (big-pharma internal IT) is the first Katalog; more targets are planned. A Katalog **references** its Domains rather than owning them: the same Domain may appear in several Katalogs (every interview target asks the same C# fundamentals), so a new target reuses Domains and authors only what it alone needs. A Katalog groups and labels, nothing more: selection happens per Domain, and each [Packed card] is still written to exactly one Domain — the Katalog never reaches the card. Inside a Katalog, Domains are arranged under named sections ("Pharma & Regulated Industry", "Behavioral & Collaboration") purely to keep a long list findable; a section is not selectable and carries no data of its own.
_Avoid_: tier (on [Verb level]'s avoid list, and reads as *das Tier* in a German UI), category, track, collection, topic map

### Connectors

**Connector** (Konnektor):
A clause-joining word the [Sentence quiz] can be asked to weave into a [Packed card] — *aber*, *sondern*, *jedoch*, *deshalb*, *obwohl*, and kin. Grouped along two axes: by **meaning family** (adversative, causal, concessive, …), which is how the learner filters them, and by **grammatical behavior** — position-0 coordinating conjunction (*aber, sondern, denn, oder, und*: no effect on word order), inverting conjunctive adverb (*jedoch, trotzdem, dennoch, deshalb, allerdings*: verb comes straight after), or verb-final subordinator (*obwohl, weil, während*). The behavior axis is part of what grading judges: using *jedoch* with *aber*'s word order is a word-order error, and mixing the two behaviors is the drill's deliberate trap. A connector may be **two-part** (correlative) — *sowohl … als auch*, *nicht nur … sondern auch*, *entweder … oder*, *zwar … aber* — one connector with two placements, both of which must land correctly.
_Avoid_: adversative (one meaning family, not the category), conjunction (one grammatical behavior, not the category), linking word, transition word

**Connector placement**:
What a [Connector] part's grammatical behavior means for the clause the learner is about to write, and what the [Sentence quiz] shows on its badges: the **clause** it builds — Hauptsatz (`HZ`, green) or Nebensatz (`NZ`, blue) — and the **position** it takes there, in Feldermodell shorthand. Position `0` is outside the fields and belongs to the position-0 conjunction (*aber*) and the subordinator (*weil*) alike — what separates them is HZ against NZ. A conjunctive adverb (*deshalb*, *zwar*) takes position `I` (Vorfeld, and only there does it force the inversion) or `III` (Mittelfeld, after the finite verb); both are correct German, so both are what the grader is told to accept. Derived from the behavior, never stored per connector, and the two-part correlatives place each part on its own (*zwar* I / III … *aber* 0).
_Avoid_: word order (that is the consequence, not the placement), Position 1 (the badge reads I), Stellung

### Sprechen

**Discussion** (de Diskussion):
A Teil 2 speaking-practice conversation between the learner and the AI partner, arguing a [Topic] turn by turn. Its [Modality] decides whether the learner's turns are typed or spoken; everything else — the [Topic] pool, [Move]s, [Sprechen error tag]s, the rubric, the [Prädikat] — is the same either way. Resumable while in progress; once graded it is recorded as a [Run] and the conversation is discarded — what outlives it is the [Run]'s summary and, for each marked mistake, an [Archived correction] carrying the learner's own sentence. The partner's turns are kept nowhere.
_Avoid_: session, chat, dialogue, Diskussionsrunde

**Vortrag**:
A Teil 1 speaking-practice unit: one [Vortragsthema] chosen from two offered task sheets, a [Rede] of about four minutes, and one [Nachfrage] — graded as a whole against the Teil-1 rubric. Its [Modality] decides whether the learner speaks or types. Resumable while in progress; once graded it is recorded as a [Run] and both the Rede and the Nachfrage are discarded, leaving the Run's summary and one [Archived correction] per marked mistake. The Teil 1 counterpart of a [Discussion].
_Avoid_: presentation, talk, monologue (that is the [Rede]), Teil 1 (the exam part, not one practice unit)

**Rede**:
The monologue inside a [Vortrag]: one continuous stretch of the learner's German covering the five [Gliederungspunkt]s, budgeted at 360 words ≈ 4:00 at 90 words per minute — a rate chosen to be reachable by a B2 speaker, so that a typed and a spoken Rede are asked for the same amount of content. Composed **in one take**, never point by point. The Redezeit budget applies to the Rede alone.
_Avoid_: talk, speech, monologue, transcript, sections

**Nachfrage**:
The single follow-up question the AI partner asks once a [Rede] has ended — generated from what the learner actually said — together with the learner's answer to it. Graded inside the [Vortrag]'s Erfüllung criterion; not counted against the Rede's word budget, but its mistakes are archived and its Redemittel counted like any other. Exactly one per Vortrag.
_Avoid_: follow-up, question round, Rückfrage (in a [Discussion] that is the learner asking the partner)

**Gliederungspunkt**:
One of the five fixed points a Teil 1 task sheet prints and a [Rede] must cover — Einstieg, Situation, Vor- und Nachteile, Eigene Erfahrung, Meinung & Abschluss — each with its own hint and word target (45 / 75 / 95 / 75 / 70, summing to the [Rede]'s 360). The same five for every [Vortragsthema], and what the grader's coverage judgement is made against.
_Avoid_: section, bullet, outline point, Abschnitt

**Vortragsplan**:
The five keywords the learner writes against the [Gliederungspunkt]s while preparing, one per point. Carried into the [Vortrag] and matched locally against the live [Rede], so each point can show whether its own planned keyword has been said yet. Never graded.
_Avoid_: outline, script, notes (the free-text notes field is a separate thing)

**Modality**:
Whether the learner's own German in a [Discussion], a [Vortrag] or a [Verb sentence quiz] is `typed` or `spoken`. Chosen at setup and fixed for the run in all three. For a [Vortrag] it changes the input surface and how Redezeit is measured — real seconds against 4:00 when spoken, words against 360 when typed — and, as in a [Discussion], only the `kohaerenz` criterion's descriptor differs: a [Rede] is entirely a fluency performance, so the typed wording keeps the written-form hedge while the spoken one judges tempo, hesitation and pausing on evidence. The rubric, its four criteria and their weights are identical either way, so a typed and a spoken score stay directly comparable. For a [Discussion] it changes only the input surface — a text field or a microphone — and what can be measured from it: a spoken [Discussion] yields real speaking tempo, reaction time and pause counts, so its rubric judges Flüssigkeit on evidence instead of adapting around its absence. Everything else is shared: the same [Topic] pool, the same preparation, the same [Move]s and hints, the same rubric, and the *same* kind of [Run] — so a typed and a spoken score are directly comparable, and "how much worse am I when I have to speak?" is an answerable question. In a [Verb sentence quiz] the spoken Modality changes only the input surface too — the same generated sentences, the same AI grader, the same [Verb error tag]s, the same kind of [Run] — with no fluency measurement, because a translation drill is graded right or wrong.
_Avoid_: mode (collides with [Grading mode]), input method, voice mode, separate test

**Topic** (de Thema):
A controversial statement or question a [Discussion] argues — drawn from the app's seeded pool or AI-generated into the learner's custom pool. Teil 2 only; the Teil 1 counterpart is a [Vortragsthema], which is deliberately *not* a Topic.
_Avoid_: theme (a noun vocabulary category), subject, statement

**Vortragsthema**:
The subject a [Vortrag] treats, together with the task-sheet instruction that frames it (*„Halten Sie einen kurzen Vortrag darüber, …"*). Unlike a [Topic] it is **not controversial and takes no sides** — there is nothing for a partner to argue against, which is what makes Teil 1 a monologue. Its own seeded pool and its own AI-generated custom pool, kept separate from the Topic pools; both are tagged with the same ten fields, so both resolve an argument bank the same way.
_Avoid_: Topic (that is the Teil 2 concept), Thema (ambiguous across parts), prompt, task

**Correction tag**:
A classification the post-grading analysis assigns to each marked mistake in a learner's own German — in a [Discussion], a [Vortrag], a [Forumsbeitrag] or a [Nachricht] — naming *what* went wrong. One of: `grammar` (case, conjugation, endings, agreement), `word-order` (verb-second, verb-final, separable-prefix placement), `vocabulary` (wrong word, false friend, broken collocation), `spelling`, `register` (du/Sie slips, tone). Unlike [Error tag] and [Verb error tag], exactly one kind per marked mistake — each annotation is a single span with a single explanation. `spelling` is never assigned in a `spoken` [Modality]: the spelling there is the speech recognizer's, not the learner's.
_Avoid_: Sprechen error tag (the pre-Schreiben name), mistake type, error category

**Move**:
The communicative job a Redemittel does, and the group the Sprechen cheatsheet and the in-test hint panel file it under. **Disjoint sets, one per exam part**: in a [Discussion] the six Gesprächszüge — agree, disagree, partially agree, ask back, give an example, summarize (a seventh, stating an opinion, appears in the cheatsheet only); in a [Vortrag] the seven Vortragsfunktionen — open the topic, announce the structure, introduce an aspect, contrast, give evidence, summarize & close, answer a follow-up; in a [Forumsbeitrag] the seven Beitragsfunktionen — take up the topic, state an opinion, justify, give an example, concede the counter-view, suggest an alternative, draw a conclusion; in a [Nachricht] the eight Nachrichtfunktionen — refer to the occasion, explain the situation, apologize, request politely, express dissatisfaction, propose, thank, close with commitment. A Move never spans parts, and the sets are never counted together. Nachrichtfunktionen alone are **Anlass-aware**: each declares which [Schreibanlass]e it fits — Bezug, Begründung and Abschluss fit every Nachricht, the five occasion-cores map one-to-one onto the Anlässe but may be apt beyond their own (a polite request belongs in almost any Nachricht) — and the [Move nudge] suggests only apt ones, because nudging an apology into a thank-you message would coach the genre wrong.
_Avoid_: hint category, strategy, tactic chip, section (Vortragsfunktionen outnumber the [Gliederungspunkt]s and do not map one-to-one)

**Vortragsmittel**:
The Teil 1 phrase bank: 35 stock German phrases for holding a [Vortrag], filed under the seven Vortragsfunktionen (see [Move]). A kind of Redemittel, not a rival concept — so [Redemittel yield] counts them, on their own separate tally, and the cheatsheet gives them their own tab.
_Avoid_: Redemittel (unqualified, where the Teil 1 bank specifically is meant), presentation phrases, Wendungen

**Nachrichtenmittel**:
The Schreiben Teil 2 phrase bank: stock written-German phrases for a [Nachricht], filed under the eight Nachrichtfunktionen (see [Move]). A kind of Redemittel, like [Vortragsmittel] and [Schreibmittel] — so [Redemittel yield] counts them on their own separate tally, and the cheatsheet gives them their own surface. Includes the genre's fixed frame: matched Anrede/Grußformel pairs and Konjunktiv-II request forms live here, not in a separate bank.
_Avoid_: Schreibmittel (Teil 1's bank), Redemittel (unqualified, where the Teil 2 bank specifically is meant), E-Mail-Floskeln, Textbausteine

**Redemittel yield** (de Redemittel-Ausbeute):
How many distinct Redemittel the learner's own words actually contained, grouped by [Move] — counted locally by text matching, never by AI, and never affecting the score. It measures *use*, not command: a phrase counts whether the learner recalled it, inserted it from the hint panel, or read it aloud from the panel mid-turn. Read at two scopes: the yield *of one [Discussion], [Vortrag], [Forumsbeitrag] or [Nachricht]*, visible while it runs and on its result; and the learner's *lifetime* yield, which accumulates across [Run]s and is the basis for suggesting a [Move] they have not reached for. **Counted per phrase bank**: a Discussion's Redemittel, a Vortrag's Vortragsmittel, a Forumsbeitrag's [Schreibmittel] and a Nachricht's [Nachrichtenmittel] are separate tallies and are never summed, because their [Move] sets are disjoint. The lifetime figure is banked as each [Discussion], [Vortrag], [Forumsbeitrag] or [Nachricht] is graded, because the text it was counted from is discarded immediately afterwards and can never be re-counted.
_Avoid_: Redemittel score, phrase coverage, mastery

**Move nudge**:
A single [Move] the app names to the learner mid-test — *„Diesmal: nachfragen"* in a [Discussion], *„Diesmal: gegenüberstellen"* in a [Vortrag], *„Diesmal: eine Alternative vorschlagen"* in a [Forumsbeitrag], *„Diesmal: höflich bitten"* in a [Nachricht] — chosen from the Moves they have not used in this run (in a [Nachricht], only from Moves apt for its [Schreibanlass] — see [Move]), preferring the one their lifetime [Redemittel yield] shows they reach for least. Purely a suggestion: it is never validated against, never scored, and carries no obligation — the learner may ignore it and the run proceeds identically. Dismissible for the run, and absent when hints are off. Distinct from a [KI-Tipp], which costs an AI call and suggests *what* to argue; the nudge is free, local, and suggests *how*.
_Avoid_: prompt, task, challenge, goal, required move

**KI-Tipp**:
An on-demand AI-generated suggestion during the learner's turn in a [Discussion] or mid-sitting in a [Forumsbeitrag] or a [Nachricht]: a strategic direction for what to argue or write next, never ready-made text. Uses are counted and shown with the result, but never affect the score.
_Avoid_: AI hint, tip (unqualified)

**Hilfe-Protokoll**:
The record of which helps the learner reached for during a [Vortrag], a [Forumsbeitrag] or a [Nachricht] and when — hint-drawer opens, [Move nudge]s shown, Rettungsleinen taken (Vortrag only), [KI-Tipp]s spent — shown with the result as counts against a minute timeline. [Radar] and [Gerüst-Check] warnings are not entries: they are pushed at the learner, not reached for. Purely descriptive: it never affects the score and imposes no obligation. Not kept for a [Discussion].
_Avoid_: help score, usage stats, penalty, crutch count

**Prädikat**:
The Goethe grade band a graded [Discussion]'s, [Vortrag]'s, [Forumsbeitrag]'s or [Nachricht]'s score maps to: *sehr gut* (90+), *gut* (80+), *befriedigend* (70+), *ausreichend* (60+), *nicht bestanden* (below 60).
_Avoid_: grade, mark, rating

**Aufwertung**:
A style upgrade the analysis of a graded [Vortrag], [Forumsbeitrag] or [Nachricht] proposes: a stretch of the learner's German that was **not wrong**, together with a more B2-like wording and why it reads better. It carries no [Correction tag], never enters the [Error archive] and is never drilled — an [Archived correction] says "you got this wrong", an Aufwertung says "this was fine and could be better". Kept in full in the [Run]'s summary, because it is the app's advice rather than the learner's own speech.
_Avoid_: correction, improvement, suggestion, mistake, better version

**Archived correction** (de Korrektur):
One marked mistake from a graded [Discussion], [Vortrag], [Forumsbeitrag] or [Nachricht], kept after the learner's own words are discarded: the wrong wording, the suggested fix, its [Correction tag], and enough of the surrounding sentence to make the fix intelligible. The only part of a [Discussion] or [Vortrag] that outlives it. Corrections from a `spoken` [Modality] are archived on the same terms as typed ones and are not distinguished — a mistake the recognizer invented is archived as readily as one the learner made, which is a known and accepted cost.
_Avoid_: mistake (that is the in-Discussion marking), error record, flashcard

**Error archive** (de Fehlerarchiv):
The learner's whole standing collection of [Archived correction]s — from Sprechen and Schreiben alike — grouped by [Correction tag] so that repetition becomes visible, and filterable by module and part. Cold storage: never read while a [Discussion], [Vortrag], [Forumsbeitrag] or [Nachricht] runs, only when the learner opens it or a [Correction drill]. [Aufwertung]s are deliberately not in it.
_Avoid_: mistake history, error log, weak points (that term belongs to the drill modules)

**Correction drill** (de Korrekturdrill):
A practice run over the [Error archive] that replays the learner's own [Archived correction]s and asks them to rewrite just the marked wording. Unlike a [Remedial drill], its items are the learner's own recorded sentences rather than generated ones. Its queue serves *offene* corrections first (newest first), then [Fällig]e ones — new mistakes are never crowded out by [Wiedervorlage] — but a quarter of each sitting is kept free for [Fällig]e ones, so review always progresses even behind a large *offen* backlog.
_Avoid_: remedial drill (that is the preposition/verb one), review, retry

**Wiedervorlage**:
The rule that solving a correction once is not the end of it: an [Archived correction] the learner has rewritten correctly returns to the [Correction drill] after 3, then 10, then 30 days, and only after the fourth spaced success is it retired for good. A miss at any point makes it *offen* again — the same demotion honesty as [Secured item]'s wackelig. Derived entirely from the drill's own recorded attempts; nothing is scheduled by hand and nothing extra is stored.
_Avoid_: SRS, spaced repetition (the mechanism's genus, not its name here), review queue, resurfacing

**Fällig**:
The state of an [Archived correction] whose [Wiedervorlage] delay has elapsed: nachgeübt earlier, due for another retrieval now. One of three states shown side by side and never summed — *offen* (no current success: never solved, or missed since), *fällig*, *nachgeübt* (resting between returns, or retired after the fourth). In the drill a fällige card is labelled with its Wiederholung number so review is never mistaken for a new mistake.
_Avoid_: open (that is offen's word), overdue, expired, drilled (pre-Wiedervorlage vocabulary)

### Schreiben

**Forumsbeitrag**:
A Goethe B2 Schreiben Teil 1 writing-practice unit: one [Schreibthema], one guided sitting, one grading. The learner writes the forum post in a single continuous take — at least 150 words, addressing all four of the sheet's [Inhaltspunkt]s — with a live word count, an optional countdown defaulting to the exam's 50 minutes (soft: running over is shown, never enforced), and helps on demand. Always typed; [Modality] does not apply. Graded as a whole against the Goethe B2 Schreiben Teil 1 rubric, [Prädikat] included. Resumable while in progress; once graded it is recorded as a [Run] and the essay is discarded — what outlives it is the Run's summary, one [Archived correction] per marked mistake, and its [Aufwertung]s. The Schreiben counterpart of a [Vortrag]. Distinct from the C1 writing tutor's *Forumsbeitrag* task type, which is a prompt category in the keep-every-draft workbench, not a practice unit.
_Avoid_: essay, draft (the C1 tutor's unit), Diskussionsbeitrag, post, Teil 1 (the exam part, not one practice unit)

**Schreibthema**:
The task sheet a [Forumsbeitrag] answers: a controversial subject framed as an online-forum discussion, the exam-style instruction, and its own four [Inhaltspunkt]s. Like a [Topic] it invites taking a side — but it is a full task sheet rather than a bare statement, and it belongs to Schreiben: its own seeded pool and its own AI-generated custom pool, mirroring [Vortragsthema], never shared with the Sprechen pools. Tagged with the same ten fields as the Sprechen pools, but resolving its *own* writing argument bank — written-register pro/contra angles and Textwortschatz, layered like Sprechen's: AI-cached per Schreibthema, hand-authored for flagship themes, per-field fallback so every theme resolves offline. Every seeded Schreibthema also carries a dominant [Aufgabenmuster] — the lens that picks its matching [Mustertext].
_Avoid_: Topic (Sprechen Teil 2's term), Vortragsthema (Sprechen Teil 1's), prompt (the C1 tutor's word), Thema (ambiguous across modules)

**Inhaltspunkt**:
One of the four content points printed on a [Schreibthema], all of which a [Forumsbeitrag] must address. Stored per task sheet with topic-flavored wording ("Nennen Sie Vor- und Nachteile von …") following the exam's recurring patterns — unlike a [Gliederungspunkt], which is the same five for every [Vortragsthema]. What the grader's coverage judgement is made against.
_Avoid_: Gliederungspunkt (fixed and Sprechen's), content point, bullet, requirement

**Schreibplan**:
The four keywords the learner writes against the [Inhaltspunkt]s while preparing a [Forumsbeitrag] or a [Nachricht], one per point, skippable. Carried into the sitting and matched locally against the live text, so each point can show whether its own planned keyword has been written yet — the Schreiben counterpart of a [Vortragsplan]. Never graded.
_Avoid_: outline, Vortragsplan (Sprechen's), notes, checklist

**Schreibmittel**:
The Schreiben Teil 1 phrase bank: stock written-German phrases for a [Forumsbeitrag], filed under the Beitragsfunktionen (see [Move]). A kind of Redemittel, like [Vortragsmittel] — so [Redemittel yield] counts them on their own separate tally, and the cheatsheet gives them their own tab.
_Avoid_: Redemittel (unqualified, where the Schreiben bank specifically is meant), Vortragsmittel (Sprechen Teil 1's bank), Textbausteine, phrase list

**Aufgabenmuster**: One of five recurring shapes the four [Inhaltspunkt]s of a [Schreibthema] take — *Pro & Contra abwägen*, *Meinung + Alternative vorschlagen*, *Eigene Erfahrung als Beleg*, *Gegenmeinung entkräften*, *Maßnahme bewerten & empfehlen*. Every seeded Schreibthema is mapped to its **dominant** Aufgabenmuster (custom themes are not mapped); the mapping is a study lens that picks the right [Mustertext], never a filter, never a grading input.
_Avoid_: Textsorte, [Schreibanlass] (Teil 2's grouping — occasions, not genres), task type, Kategorie, pattern (code-only term)

**Mustertext**: The annotated model [Forumsbeitrag] for one [Aufgabenmuster]: a hand-authored answer of exam length to one seeded [Schreibthema], marked up in three layers — Konnektoren, [Schreibmittel]-style moves, grammatische Strukturen — where every marked span carries a note explaining why the device works *at that spot*. Read-only teaching material: never graded, never counted in [Redemittel yield], never a [Run].
_Avoid_: sample essay, Vorlage, Musterlösung (implies the one correct answer), template (that is the skeleton, the paragraph plan beside it), Musternachricht (Teil 2's model text)

**Musternachricht**:
The annotated model [Nachricht] for one [Schreibanlass]: a hand-authored answer of exam length to one seeded [Schreibauftrag], marked up in **four** layers — Konnektoren, [Nachrichtenmittel]-style moves, grammatische Strukturen, and Höflichkeit (Konjunktiv-II request frames, softeners, Anrede/Gruß conventions — the layer that carries the genre's core skill) — where every marked span carries a note explaining why the device works *at that spot*. Read-only teaching material: never graded, never counted in [Redemittel yield], never a [Run]. Deliberately its own concept beside [Mustertext]: the same teaching mechanism, but its own layer set and its own library surface, because the two genres teach different skills.
_Avoid_: Mustertext (Teil 1's model Forumsbeitrag), Musterbrief, sample email, Vorlage, Musterlösung

**Nachricht**:
A Goethe B2 Schreiben Teil 2 writing-practice unit: one [Schreibauftrag], one guided sitting, one grading. The learner writes the halbformelle Nachricht — an e-mail in a work or education setting, Sie-register throughout, with Anrede and Grußformel — in a single continuous take: at least 100 words covering all four of the sheet's [Inhaltspunkt]s, a live word count, an optional soft countdown defaulting to the exam's 25 minutes, and helps on demand. Always typed; [Modality] does not apply. Graded as a whole against the Goethe B2 Schreiben Teil 2 rubric, [Prädikat] included. Resumable while in progress; once graded it is recorded as a [Run] and the text is discarded — what outlives it is the Run's summary, one [Archived correction] per marked mistake, and its [Aufwertung]s. The Teil 2 counterpart of a [Forumsbeitrag].
_Avoid_: E-Mail (the medium, not the unit), Mitteilung, Brief, message, Teil 2 (the exam part, not one practice unit)

**Schreibauftrag**:
The task sheet a [Nachricht] answers: a workplace or education situation, the Empfänger the message goes to (name and role — what the Anrede must fit), the exam-style instruction, its own four [Inhaltspunkt]s, and exactly one [Schreibanlass]. Unlike a [Schreibthema] it is not controversial and takes no sides — it is a situational assignment, which is what makes Teil 2 interaction rather than argument. Its own seeded pool and its own AI-generated custom pool, never shared with the Teil 1 pools. Resolves its own **Inhalts-Baukasten** — per-[Schreibanlass] building blocks (plausible Gründe, Lösungs- und Vorschlag-Ideen, Textwortschatz) in place of Teil 1's pro/contra argument bank, because a Nachricht argues nothing — layered like Teil 1's banks: AI-cached per Auftrag, hand-authored for flagship Aufträge, per-Anlass fallback so every Auftrag resolves offline.
_Avoid_: Schreibthema (Teil 1's task sheet), Thema (there is no side to take), Szenario, Situation (one field of the sheet, not the sheet), Aufgabe (generic)

**Schreibanlass**:
The communicative occasion a [Schreibauftrag] is written for — why the Nachricht exists — one of five: *Entschuldigung & Absage*, *Bitte & Anfrage*, *Beschwerde & Problem melden*, *Vorschlag & Anregung*, *Dank & Rückmeldung*. Every Schreibauftrag, seeded and custom alike, carries exactly one; it picks the matching [Musternachricht], shows on the sheet as a badge, and Setup can filter the pool by it. The Teil 2 counterpart of the [Aufgabenmuster], but structural where that is a lens: an Auftrag's [Inhaltspunkt]s flow from its Anlass, so the field is authored, generated, and filtered on — though like the Aufgabenmuster it is never a grading input. Deliberately not a Textsorte: Teil 2's Textsorte is constant (always a halbformelle Nachricht); what varies is the occasion.
_Avoid_: Textsorte (constant across Teil 2), genre, Kategorie, task type, Aufgabenmuster (Teil 1's lens)

**Rahmen-Gerüst**:
The optional compose scaffold of a [Nachricht]: labeled empty slots — Betreff, Anrede, Text, Gruß & Name — in place of the single free textarea. Nothing is prewritten: every word, the Anrede formula and its comma included, is the learner's own, so the [Gerüst-Check] judges the same things whether the scaffold is on or off. Its own help switch (default on), independent of hints; switched off, the learner writes the whole frame in one free textarea — the exam condition. The word count spans all slots.
_Avoid_: template, form, E-Mail-Editor, structured editor

**Gerüst-Check**:
Live dots for a [Nachricht]'s communicative frame, shown beside the [Inhaltspunkt] checklist and governed by the same checklist switch: Betreff vorhanden · Anrede korrekt (names the [Schreibauftrag]'s Empfänger with the matching Herr/Frau title and adjective ending — *Sehr geehrte Frau …* never *Sehr geehrte Herr …* — comma set) · kleingeschrieben nach der Anrede · Absätze erkennbar (in the body, between Anrede and Grußformel — the assembled frame alone earns nothing) · Grußformel · Name darunter. Local text checks, advisory, never a grading input — the frame is graded only by the AI, inside Erfüllung.
_Avoid_: form validation, Formalia-Check, frame check (English-only), checklist (that is the Inhaltspunkt surface)

**Radar**:
The live warning helper of a [Nachricht], under its own help switch: the **Du/Sie-Radar** flags du/dich/dein/euch forms and informal markers in what must be a Sie-register text, and the **Höflichkeits-Check** warns when a Bitte- or Beschwerde-[Schreibanlass] text contains no Konjunktiv-II form yet. Push-warnings where the hint drawer is pull-help — it interrupts with "this reads wrong" rather than waiting to be asked, which makes it the least exam-realistic help and is why it has its own switch, separate from the checklist's progress dots. Local checks, free, advisory; its warnings are never [Hilfe-Protokoll] entries.
_Avoid_: linter, live correction, Fehlerprüfung, register checker (one of its two checks, not the helper)

**Nachbessern**:
The optional guided revision pass offered once, directly after a [Nachricht] is graded: the just-graded text reopens with the run's marked mistakes in view, the learner works the corrections in, and local text checks report each as *offen*, *geändert* or *behoben* — where *geändert* claims only that the wording changed, never that the new wording is right. A continuation of the grading moment, not access to a stored text: the text is held only for that sitting and is discarded when the pass ends or the page is left — a reload loses the offer (the ADR-0019 boundary, scoped by ADR-0024). Never a [Run], never re-graded, never persisted; it touches neither the [Error archive] nor the [Correction drill]'s queue — a fix incorporated with the correction on screen is not retrieval, so "nachgeübt" stays the Correction drill's word.
_Avoid_: revision, draft (the C1 tutor's world), edit mode, retry, Nachbesserung in Teil 2 UI copy (taught there as Beschwerde content vocabulary — the remedy the writer demands)

### Identity & history

**User**:
A learner identified solely by a self-chosen display name — no password, no account, no verification. Anyone who types the same name shares and adds to that name's history; identity is honor-system. The name is asked for once and remembered on the device; if it is ever missing, the app asks again.
_Avoid_: account, profile, login, player

**Username key**:
The normalized form of a User's name — trimmed, lower-cased, inner whitespace collapsed — used to group all of that name's runs. Two names differing only in case or spacing are the same User.
_Avoid_: slug, id, handle

**Run**:
One completed quiz, recorded in history with its score, timing, settings, and (for some quiz types) per-item detail. The unit the History page lists and the stats aggregate over. Recorded only when online — a quiz finished offline is silently unrecorded practice. A retry round of only the wrong items is practice, not a Run, and is never recorded.
_Avoid_: session, attempt, entry
