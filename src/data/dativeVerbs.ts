// Dative-verb side-table — teaching data for the Dativ module, following the
// verb-tips.ts / verb-senses.ts precedent: it holds ONLY dative-specific
// content and keys into VERBS.german for the verb itself, its level, and its
// conjugation. verbs.ts stays the single source of truth for what a verb is.
//
// family    — the [Semantic family] (CONTEXT.md): a memory hook, not a rule.
// hint      — [Core-idea hint] contract: ≤90 chars, ≤14 words, unique, never
//             the word "Dativ" or a dative form. Shown BEFORE the answer.
// explanation — [Core-idea explanation]: unpacks the mechanism, then names
//             the verb and case. Shown only on a miss.
// swallowed — the [Swallowed accusative] hook. NEVER on experiencer entries.
// twin      — [Twin verb]: accusative near-synonym, exactly as in VERBS.german.

export interface DativeVerbEntry {
  family: 'recipient' | 'experiencer' | 'co-agent'
  /** ≤ 90 chars, ≤ 14 words, unique — same contract as coreIdeaHint. */
  coreIdeaHint: string
  /** Unpacks the mechanism, then names the verb and case. Shown only on a miss. */
  coreIdeaExplanation: string
  /** Accusative near-synonym, exactly as in VERBS.german, or absent. */
  twin?: string
  /** English equivalent takes a plain direct object. */
  englishPull?: true
  /** Thing is the nominative subject; person is dative. */
  experiencer?: true
  /** Swallowed-accusative hook applies. Never set on experiencer verbs. */
  swallowed?: string
}

export const DATIVE_VERBS: Record<string, DativeVerbEntry> = {
  // ─── recipient ─────────────────────────────────────────────────────────
  'danken': {
    family: 'recipient',
    coreIdeaHint: 'You hand someone your gratitude; the words themselves are the gift.',
    coreIdeaExplanation: 'danken = give [thanks] to somebody: the thing given (der Dank) is swallowed into the verb, leaving only the receiver behind. So danken takes the Dativ: Ich danke dir.',
    englishPull: true,
    swallowed: 'give [thanks] to somebody',
  },
  'antworten': {
    family: 'recipient',
    coreIdeaHint: 'A reply travels to the asker; what travels is already inside the verb.',
    coreIdeaExplanation: 'antworten = give [an answer] to somebody: the accusative (die Antwort) was absorbed into the verb, so only the receiver is left. antworten takes the Dativ: Sie antwortet dem Lehrer. The twin beantworten keeps the thing as its object: eine Frage beantworten (Akkusativ).',
    twin: 'beantworten',
    englishPull: true,
    swallowed: 'give [an answer] to somebody',
  },
  'raten': {
    family: 'recipient',
    coreIdeaHint: 'You pass a piece of guidance across the table to someone.',
    coreIdeaExplanation: 'raten = give [advice] to somebody: der Rat is swallowed into the verb and the person advised stays as the affected receiver. raten takes the Dativ: Ich rate dir zu warten.',
    englishPull: true,
    swallowed: 'give [advice] to somebody',
  },
  'gratulieren': {
    family: 'recipient',
    coreIdeaHint: 'Good wishes delivered straight into another person\'s hands on their big day.',
    coreIdeaExplanation: 'gratulieren = offer [congratulations] to somebody: the Glückwünsche are built into the verb, leaving only the celebrated person. gratulieren takes the Dativ: Wir gratulieren ihr zum Geburtstag.',
    englishPull: true,
    swallowed: 'offer [congratulations] to somebody',
  },
  'verzeihen': {
    family: 'recipient',
    coreIdeaHint: 'Pardon is granted to the person, not aimed at them.',
    coreIdeaExplanation: 'verzeihen = grant [pardon] to somebody: the forgiveness itself is inside the verb, so the forgiven person stands as receiver. verzeihen takes the Dativ: Verzeih mir!',
    englishPull: true,
    swallowed: 'grant [pardon] to somebody',
  },
  'befehlen': {
    family: 'recipient',
    coreIdeaHint: 'A command is issued downward; the order lands with the one who must obey.',
    coreIdeaExplanation: 'befehlen = give [an order] to somebody: der Befehl is swallowed into the verb; the commanded person is its receiver. befehlen takes the Dativ: Der General befiehlt den Soldaten.',
    englishPull: true,
    swallowed: 'give [an order] to somebody',
  },
  'drohen': {
    family: 'recipient',
    coreIdeaHint: 'A threat is delivered like a dark parcel to its target.',
    coreIdeaExplanation: 'drohen = make [a threat] to somebody: die Drohung is packed into the verb, leaving the threatened person as receiver. drohen takes the Dativ: Er droht seinem Nachbarn.',
    englishPull: true,
    swallowed: 'make [a threat] to somebody',
  },
  'vertrauen': {
    family: 'recipient',
    coreIdeaHint: 'You place your confidence in someone\'s keeping, like a deposit.',
    coreIdeaExplanation: 'vertrauen = give [your trust] to somebody: das Vertrauen is handed over, and the person holding it is the receiver. vertrauen takes the Dativ: Ich vertraue meiner Ärztin — English "trust somebody" pulls toward the Akkusativ.',
    englishPull: true,
    swallowed: 'give [your trust] to somebody',
  },
  'misstrauen': {
    family: 'recipient',
    coreIdeaHint: 'The same deposit of confidence, pointedly withheld from its keeper.',
    coreIdeaExplanation: 'misstrauen is vertrauen with the trust withheld — the person is still construed as its would-be receiver. misstrauen takes the Dativ: Sie misstraut jedem Verkäufer.',
    englishPull: true,
  },

  // ─── experiencer (thing is subject, person is dative; NEVER swallowed) ──
  'gefallen': {
    family: 'experiencer',
    coreIdeaHint: 'The thing does the pleasing; the person just registers it.',
    coreIdeaExplanation: 'With gefallen the thing is the subject and controls the verb; the person who feels the appeal is the affected experiencer. gefallen takes the Dativ: Die Schuhe gefallen mir — never *Ich gefalle die Schuhe.',
    experiencer: true,
  },
  'schmecken': {
    family: 'experiencer',
    coreIdeaHint: 'The food performs; the eater only receives the verdict.',
    coreIdeaExplanation: 'The dish is the subject — it does the tasting-good — while the taster is the affected experiencer. schmecken takes the Dativ: Die Suppe schmeckt dem Kind.',
    experiencer: true,
  },
  'gehören': {
    family: 'experiencer',
    coreIdeaHint: 'The object announces its owner; ownership radiates from the thing.',
    coreIdeaExplanation: 'The possessed thing is the subject and the owner is marked as the affected person. gehören takes the Dativ: Das Fahrrad gehört meinem Bruder. (gehören zu means "to be part of" — a different pattern.)',
    experiencer: true,
  },
  'fehlen': {
    family: 'experiencer',
    coreIdeaHint: 'An absence makes itself felt; someone senses the hole it leaves.',
    coreIdeaExplanation: 'What is missing is the subject; the person who feels the lack is the dative experiencer. fehlen takes the Dativ: Du fehlst mir.',
    experiencer: true,
  },
  'passen': {
    family: 'experiencer',
    coreIdeaHint: 'The garment does the fitting; the wearer merely finds out.',
    coreIdeaExplanation: 'The thing that fits is the subject, the person it suits is the experiencer. passen takes the Dativ: Die Jacke passt dir nicht.',
    experiencer: true,
  },
  'gelingen': {
    family: 'experiencer',
    coreIdeaHint: 'Success happens to you; the project itself carries the triumph.',
    coreIdeaExplanation: 'The thing that turns out well is the subject; the person is its beneficiary-experiencer. gelingen takes the Dativ (and sein): Der Kuchen ist mir gelungen.',
    experiencer: true,
  },
  'misslingen': {
    family: 'experiencer',
    coreIdeaHint: 'Failure also happens to you; the project carries the flop.',
    coreIdeaExplanation: 'The mirror of gelingen: the failed thing is the subject, the person the affected experiencer. misslingen takes the Dativ (and sein): Der Plan ist uns misslungen.',
    experiencer: true,
  },
  'schaden': {
    family: 'experiencer',
    coreIdeaHint: 'The harm flows out of the thing and lands on a person.',
    coreIdeaExplanation: 'The damaging thing is the subject; the person or thing harmed is the affected party. schaden takes the Dativ: Rauchen schadet der Gesundheit.',
    experiencer: true,
  },
  'wehtun': {
    family: 'experiencer',
    coreIdeaHint: 'The aching part is the actor; its owner suffers the performance.',
    coreIdeaExplanation: 'The hurting body part is the subject and the person who feels it is the experiencer. wehtun takes the Dativ: Mein Rücken tut mir weh.',
    experiencer: true,
  },
  'einfallen': {
    family: 'experiencer',
    coreIdeaHint: 'An idea drops in uninvited; the mind is only its landing place.',
    coreIdeaExplanation: 'The idea is the subject — it "falls in" — and the person it strikes is the experiencer. einfallen takes the Dativ (and sein): Der Name fällt mir nicht ein.',
    experiencer: true,
  },
  'auffallen': {
    family: 'experiencer',
    coreIdeaHint: 'Something leaps to the eye; the eye\'s owner just registers the jolt.',
    coreIdeaExplanation: 'The striking thing is the subject; the person who notices is the experiencer. auffallen takes the Dativ (and sein): Der Fehler ist mir sofort aufgefallen.',
    experiencer: true,
  },
  'genügen': {
    family: 'experiencer',
    coreIdeaHint: 'The amount declares itself sufficient; a person receives that verdict.',
    coreIdeaExplanation: 'What suffices is the subject and the satisfied person is the experiencer. genügen takes the Dativ: Eine kurze Antwort genügt mir.',
    experiencer: true,
  },
  'nützen': {
    family: 'experiencer',
    coreIdeaHint: 'The tool radiates usefulness toward whoever profits from it.',
    coreIdeaExplanation: 'The useful thing is the subject; the person who benefits is the affected party. nützen takes the Dativ: Das Wörterbuch nützt den Studenten viel.',
    experiencer: true,
  },
  'imponieren': {
    family: 'experiencer',
    coreIdeaHint: 'The feat does the impressing; the admirer only absorbs it.',
    coreIdeaExplanation: 'The impressive thing is the subject, the impressed person the experiencer — English "impress somebody" pulls the wrong way. imponieren takes the Dativ: Dein Mut imponiert mir.',
    englishPull: true,
    experiencer: true,
  },
  'passieren': {
    family: 'experiencer',
    coreIdeaHint: 'Events simply land on people; whoever they strike is marked.',
    coreIdeaExplanation: 'What happens is the subject; the person it happens to is the affected experiencer. passieren takes the Dativ (and sein): Das ist mir noch nie passiert.',
    experiencer: true,
  },
  'leidtun': {
    family: 'experiencer',
    coreIdeaHint: 'The regret radiates from its cause; a person merely holds the sorrow.',
    coreIdeaExplanation: 'The regretted thing (or es) is the subject; the person who is sorry is the experiencer. leidtun takes the Dativ: Es tut mir leid. Er tut ihr leid.',
    experiencer: true,
  },
  'guttun': {
    family: 'experiencer',
    coreIdeaHint: 'The rest cure acts; the patient soaks up its effect.',
    coreIdeaExplanation: 'What does good is the subject; the person restored is the experiencer. guttun takes the Dativ: Die Pause hat mir gutgetan.',
    experiencer: true,
  },
  'entgehen': {
    family: 'experiencer',
    coreIdeaHint: 'The detail slips past; the person is the checkpoint it evaded.',
    coreIdeaExplanation: 'The escaping thing is the subject and the person who misses it is the experiencer. entgehen takes the Dativ (and sein): Der Fehler ist dem Prüfer entgangen.',
    experiencer: true,
  },

  // ─── co-agent ──────────────────────────────────────────────────────────
  'helfen': {
    family: 'co-agent',
    coreIdeaHint: 'Your effort joins another person\'s struggle; two forces working the same problem.',
    coreIdeaExplanation: 'helfen = give [help] to somebody, an action that meets the other person\'s own effort (action–reaction). helfen takes the Dativ: Ich helfe meiner Mutter — English "help somebody" pulls toward the Akkusativ. The twin unterstützen does take the Akkusativ.',
    twin: 'unterstützen',
    englishPull: true,
    swallowed: 'give [help] to somebody',
  },
  'folgen': {
    family: 'co-agent',
    coreIdeaHint: 'You match another mover\'s path, step answering step.',
    coreIdeaExplanation: 'The follower reacts to the leader\'s movement — two agents in one scene. folgen takes the Dativ (and sein): Der Hund folgt seinem Herrn. The twin verfolgen (to pursue, to hunt) takes the Akkusativ.',
    twin: 'verfolgen',
    englishPull: true,
  },
  'widersprechen': {
    family: 'co-agent',
    coreIdeaHint: 'Your words push back against another speaker\'s words.',
    coreIdeaExplanation: 'Contradicting is speech meeting speech — you counter the other person\'s utterance rather than acting on them. widersprechen takes the Dativ: Sie widerspricht ihrem Chef — though English "contradict somebody" is transitive.',
    englishPull: true,
  },
  'zuhören': {
    family: 'co-agent',
    coreIdeaHint: 'Your attention leans toward the speaker and stays fastened there.',
    coreIdeaExplanation: 'zuhören is attention directed at a person mid-performance — an interaction, not a grab. zuhören takes the Dativ: Hör deiner Lehrerin zu! The twin hören (to hear something) takes the Akkusativ: Musik hören.',
    twin: 'hören',
    englishPull: true,
  },
  'zusehen': {
    family: 'co-agent',
    coreIdeaHint: 'Your gaze accompanies someone at work without touching the work.',
    coreIdeaExplanation: 'Watching someone act is a silent participation in their scene. zusehen takes the Dativ: Die Kinder sehen dem Koch zu — English "watch somebody" pulls toward the Akkusativ.',
    englishPull: true,
  },
  'zuschauen': {
    family: 'co-agent',
    coreIdeaHint: 'A spectator\'s eyes travel with the players through the whole match.',
    coreIdeaExplanation: 'Like zusehen, zuschauen construes the watched person as a co-participant, not a grabbed object. zuschauen takes the Dativ: Wir schauen den Tänzern zu.',
    englishPull: true,
  },
  'begegnen': {
    family: 'co-agent',
    coreIdeaHint: 'Two paths cross; each walker is the other\'s counterpart.',
    coreIdeaExplanation: 'A chance meeting is symmetric — the person you run into is your co-agent, not your target. begegnen takes the Dativ (and sein): Ich bin ihm im Park begegnet. The near-twin treffen takes the Akkusativ.',
    twin: 'treffen',
    englishPull: true,
  },
  'gehorchen': {
    family: 'co-agent',
    coreIdeaHint: 'One will bends to another will; the two stay in dialogue.',
    coreIdeaExplanation: 'Obeying answers another person\'s command — reaction to their action. gehorchen takes the Dativ: Der Hund gehorcht seiner Besitzerin — English "obey somebody" is transitive.',
    englishPull: true,
  },
  'dienen': {
    family: 'co-agent',
    coreIdeaHint: 'Your work bends itself around another person\'s purposes.',
    coreIdeaExplanation: 'Serving is sustained cooperation directed at a person\'s interest, not an act done to them. dienen takes the Dativ: Er diente dem König treu — English "serve somebody" pulls toward the Akkusativ.',
    englishPull: true,
  },
  'beistehen': {
    family: 'co-agent',
    coreIdeaHint: 'You plant yourself at a struggling person\'s side and hold the line.',
    coreIdeaExplanation: 'beistehen is literally standing by someone — shoulder to shoulder, co-agents against the trouble. beistehen takes the Dativ: Sie stand ihrer Freundin in der Krise bei.',
  },
  'beitreten': {
    family: 'co-agent',
    coreIdeaHint: 'You step across a threshold and take your place inside a group.',
    coreIdeaExplanation: 'Joining construes the club as the body you attach yourself to. beitreten takes the Dativ (and sein): Er ist dem Verein beigetreten — English "join something" is transitive.',
    englishPull: true,
  },
  'ausweichen': {
    family: 'co-agent',
    coreIdeaHint: 'You bend your own path around what is coming at you.',
    coreIdeaExplanation: 'Dodging is movement answering movement — the obstacle keeps its course and you adjust yours. ausweichen takes the Dativ (and sein): Das Auto wich dem Radfahrer aus. The twin vermeiden (to avoid doing or having something) takes the Akkusativ.',
    twin: 'vermeiden',
    englishPull: true,
  },
  'sich nähern': {
    family: 'co-agent',
    coreIdeaHint: 'Your course and a target\'s position slowly close the gap between them.',
    coreIdeaExplanation: 'Approaching is your movement measured against the other\'s position — a relation, not a grab. sich nähern takes the Dativ: Der Zug nähert sich dem Bahnhof — English "approach something" is transitive.',
    englishPull: true,
  },
  'unterliegen': {
    family: 'co-agent',
    coreIdeaHint: 'In the contest\'s final scene you are the one lying underneath.',
    coreIdeaExplanation: 'Losing to someone keeps both contestants in the frame — the winner is your counterpart. unterliegen takes the Dativ: Sie unterlag ihrer Rivalin im Finale; also "be subject to": Der Vertrag unterliegt dem deutschen Recht.',
  },
  'zustimmen': {
    family: 'co-agent',
    coreIdeaHint: 'Your voice adds itself to another person\'s proposal.',
    coreIdeaExplanation: 'zustimmen = give [your agreement] to a person or proposal — die Zustimmung is inside the verb. zustimmen takes the Dativ: Ich stimme dem Vorschlag zu.',
    swallowed: 'give [your agreement] to somebody',
  },
  'ähneln': {
    family: 'co-agent',
    coreIdeaHint: 'Two faces mirror each other; likeness is a relation, not an action.',
    coreIdeaExplanation: 'Resemblance holds between two counterparts — neither acts on the other. ähneln takes the Dativ: Das Kind ähnelt seinem Großvater — though English "resemble somebody" is transitive.',
    englishPull: true,
  },
  'entsprechen': {
    family: 'co-agent',
    coreIdeaHint: 'One thing lines up point for point with its counterpart.',
    coreIdeaExplanation: 'Corresponding is a matching relation between two items, each the other\'s reference. entsprechen takes the Dativ: Der Bericht entspricht den Tatsachen.',
  },
}

export const DATIVE_VERB_KEYS: readonly string[] = Object.freeze(Object.keys(DATIVE_VERBS))

export function dativeVerbsBy(family: DativeVerbEntry['family']): string[] {
  return DATIVE_VERB_KEYS.filter(k => DATIVE_VERBS[k].family === family)
}
