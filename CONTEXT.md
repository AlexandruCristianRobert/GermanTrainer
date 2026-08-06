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
A highlighted word in the *source* sentence of a translation prompt that reveals its target-language vocabulary on demand (hover, tap, or keyboard focus). A scaffold — it reveals the dictionary form, leaving any inflection to the learner. EN→DE only. Scope depends on the drill: the preposition sentence quiz hints the preposition and the assigned theme nouns only (German built from stored data); the [Verb sentence quiz] hints every drilled verb and *every* noun (assigned and incidental), and the German for incidental words is supplied by the AI, not stored data; the [Sentence quiz] highlights every drilled item of every category (both parts of a two-part [Connector] included) plus every [Incidental noun], and *every* span reveals German: verbs and prepositions with their governed case (*warten + Akk*, *seit + Dat*), nouns with their article, the [Da-compound] word itself, a [Connector] with the word order it forces (pairs show the full *sowohl … als auch* form), incidental nouns with AI-supplied article + noun on a visually subtler span. For a preposition, da-compound, or connector the reveal *is* the graded word — peeking there is the learner's deliberate choice, and the setup's hint toggle turns all spans off together.
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
A noun the AI introduces to make a generated sentence natural (e.g. the subject "the cat"). Not selected by the drill and not tested. Never hinted in the preposition quiz; hinted in the [Verb sentence quiz] and the [Sentence quiz], where every noun is highlighted and its German (article + noun, so the gender shows) is AI-supplied.
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
An AI-generated EN→DE translation drill for verbs, the verb counterpart of the preposition sentence quiz. The learner picks a verb pool (level + type + governed case) and a noun theme; the app samples verbs, the AI writes an English+German sentence pair per item using 1–2 [Drilled verb]s and 1–2 [Assigned theme noun]s, the learner types or speaks the German (see [Modality]), and the AI grades it. Either [Modality] can play the reference sentence aloud on demand once a card is graded — that is output, not input, so it is not part of the Modality distinction. Distinct from the older word-level **Verb translation** (infinitive ↔ English) and **Verb conjugation** drills, which it does not replace.
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

### Sentence

**Sentence quiz**:
The Sentence module's mixed drill: the learner sets a per-card count for each drilled category — [Drilled verb]s (filtered by level, type, and [Verb case government]), [Assigned theme noun]s, prepositions, [Da-compound]s, and [Connector]s — and how many [Packed card]s to generate; each card samples fresh words from the chosen pools and the AI writes a sentence pair containing them all. Translated EN→DE or DE→EN ([Direction]), typed or spoken ([Modality]), always AI-graded ([Grading mode] is not offered). EN→DE answers are graded per drilled item with the union of the single-category drills' error tags plus `connector`, and feed the same [Weak point]s those drills feed; DE→EN is judged on meaning alone and feeds nothing. Unqualified "sentence quiz" means this drill; the single-category drills keep their qualified names ([Verb sentence quiz], preposition sentence quiz). Direction Words are deliberately not a category here.
_Avoid_: mixed quiz, combined test, sentence translation (ambiguous across the five sentence drills)

**Packed card**:
One generated unit of the [Sentence quiz]: a sentence pair containing *every* item the card's category counts call for — normally 1–2 sentences, stretching to a short text of 3–4 when no natural 1–2-sentence packing exists. The stretch is the generator's call, never the learner's. Budgeted: at most 8 drilled items per card (each category 0–3, connectors 0–2), with a warning above 6 that cards will stretch — dense cards trade naturalness for coverage, which is why the budget exists.
_Avoid_: question, sentence (a card may be several), passage (that is only the stretched form)

### Connectors

**Connector** (Konnektor):
A clause-joining word the [Sentence quiz] can be asked to weave into a [Packed card] — *aber*, *sondern*, *jedoch*, *deshalb*, *obwohl*, and kin. Grouped along two axes: by **meaning family** (adversative, causal, concessive, …), which is how the learner filters them, and by **grammatical behavior** — position-0 coordinating conjunction (*aber, sondern, denn, oder, und*: no effect on word order), inverting conjunctive adverb (*jedoch, trotzdem, dennoch, deshalb, allerdings*: verb comes straight after), or verb-final subordinator (*obwohl, weil, während*). The behavior axis is part of what grading judges: using *jedoch* with *aber*'s word order is a word-order error, and mixing the two behaviors is the drill's deliberate trap. A connector may be **two-part** (correlative) — *sowohl … als auch*, *nicht nur … sondern auch*, *entweder … oder*, *zwar … aber* — one connector with two placements, both of which must land correctly.
_Avoid_: adversative (one meaning family, not the category), conjunction (one grammatical behavior, not the category), linking word, transition word

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

**Sprechen error tag**:
A classification the post-Discussion analysis assigns to each marked mistake in a learner's turns, naming *what* went wrong. One of: `grammar` (case, conjugation, endings, agreement), `word-order` (verb-second, verb-final, separable-prefix placement), `vocabulary` (wrong word, false friend, broken collocation), `spelling`, `register` (du/Sie slips, tone). Unlike [Error tag] and [Verb error tag], exactly one kind per marked mistake — each annotation is a single span with a single explanation. `spelling` is never assigned in a `spoken` [Modality]: the spelling there is the speech recognizer's, not the learner's.
_Avoid_: mistake type, error category

**Move**:
The communicative job a Redemittel does, and the group the Sprechen cheatsheet and the in-test hint panel file it under. **Two disjoint sets, one per exam part**: in a [Discussion] the six Gesprächszüge — agree, disagree, partially agree, ask back, give an example, summarize (a seventh, stating an opinion, appears in the cheatsheet only); in a [Vortrag] the seven Vortragsfunktionen — open the topic, announce the structure, introduce an aspect, contrast, give evidence, summarize & close, answer a follow-up. A Move never spans parts, and the two sets are never counted together.
_Avoid_: hint category, strategy, tactic chip, section (Vortragsfunktionen outnumber the [Gliederungspunkt]s and do not map one-to-one)

**Vortragsmittel**:
The Teil 1 phrase bank: 35 stock German phrases for holding a [Vortrag], filed under the seven Vortragsfunktionen (see [Move]). A kind of Redemittel, not a rival concept — so [Redemittel yield] counts them, on their own separate tally, and the cheatsheet gives them their own tab.
_Avoid_: Redemittel (unqualified, where the Teil 1 bank specifically is meant), presentation phrases, Wendungen

**Redemittel yield** (de Redemittel-Ausbeute):
How many distinct Redemittel the learner's own words actually contained, grouped by [Move] — counted locally by text matching, never by AI, and never affecting the score. It measures *use*, not command: a phrase counts whether the learner recalled it, inserted it from the hint panel, or read it aloud from the panel mid-turn. Read at two scopes: the yield *of one [Discussion] or [Vortrag]*, visible while it runs and on its result; and the learner's *lifetime* yield, which accumulates across [Run]s and is the basis for suggesting a [Move] they have not reached for. **Counted per phrase bank**: a Discussion's Redemittel and a Vortrag's Vortragsmittel are separate tallies and are never summed, because their [Move] sets are disjoint. The lifetime figure is banked as each [Discussion] or [Vortrag] is graded, because the text it was counted from is discarded immediately afterwards and can never be re-counted.
_Avoid_: Redemittel score, phrase coverage, mastery

**Move nudge**:
A single [Move] the app names to the learner mid-test — *„Diesmal: nachfragen"* in a [Discussion], *„Diesmal: gegenüberstellen"* in a [Vortrag] — chosen from the Moves they have not used in this run, preferring the one their lifetime [Redemittel yield] shows they reach for least. Purely a suggestion: it is never validated against, never scored, and carries no obligation — the learner may ignore it and the run proceeds identically. Dismissible for the run, and absent when hints are off. Distinct from a [KI-Tipp], which costs an AI call and suggests *what* to argue; the nudge is free, local, and suggests *how*.
_Avoid_: prompt, task, challenge, goal, required move

**KI-Tipp**:
An on-demand AI-generated suggestion during the learner's turn in a [Discussion]: a strategic direction for what to argue next, never ready-made text. Uses are counted and shown with the result, but never affect the score.
_Avoid_: AI hint, tip (unqualified)

**Hilfe-Protokoll**:
The record of which helps the learner reached for during a [Vortrag] and when — hint-drawer opens, [Move nudge]s shown, Rettungsleinen taken, [KI-Tipp]s spent — shown with the result as counts against a minute timeline. Purely descriptive: it never affects the score and imposes no obligation. Teil 1 only for now.
_Avoid_: help score, usage stats, penalty, crutch count

**Prädikat**:
The Goethe grade band a graded [Discussion]'s or [Vortrag]'s score maps to: *sehr gut* (90+), *gut* (80+), *befriedigend* (70+), *ausreichend* (60+), *nicht bestanden* (below 60).
_Avoid_: grade, mark, rating

**Aufwertung**:
A style upgrade the analysis of a graded [Vortrag] proposes: a stretch of the learner's German that was **not wrong**, together with a more B2-like wording and why it reads better. It carries no [Sprechen error tag], never enters the [Error archive] and is never drilled — an [Archived correction] says "you got this wrong", an Aufwertung says "this was fine and could be better". Kept in full in the [Run]'s summary, because it is the app's advice rather than the learner's own speech.
_Avoid_: correction, improvement, suggestion, mistake, better version

**Archived correction** (de Korrektur):
One marked mistake from a graded [Discussion] or [Vortrag], kept after the learner's own words are discarded: the wrong wording, the suggested fix, its [Sprechen error tag], and enough of the surrounding sentence to make the fix intelligible. The only part of a [Discussion] or [Vortrag] that outlives it. Corrections from a `spoken` [Modality] are archived on the same terms as typed ones and are not distinguished — a mistake the recognizer invented is archived as readily as one the learner made, which is a known and accepted cost.
_Avoid_: mistake (that is the in-Discussion marking), error record, flashcard

**Error archive** (de Fehlerarchiv):
The learner's whole standing collection of [Archived correction]s, from both exam parts, grouped by [Sprechen error tag] so that repetition becomes visible and filterable by part. Cold storage: never read while a [Discussion] or [Vortrag] runs, only when the learner opens it or a [Correction drill]. [Aufwertung]s are deliberately not in it.
_Avoid_: mistake history, error log, weak points (that term belongs to the drill modules)

**Correction drill** (de Korrekturdrill):
A practice run over the [Error archive] that replays the learner's own [Archived correction]s and asks them to rewrite just the marked wording. Unlike a [Remedial drill], its items are the learner's own recorded sentences rather than generated ones.
_Avoid_: remedial drill (that is the preposition/verb one), review, retry

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
