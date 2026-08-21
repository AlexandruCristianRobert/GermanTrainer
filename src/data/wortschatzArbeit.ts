import type { Vokabel } from './wortschatz'

export const WORTSCHATZ_ARBEIT: Vokabel[] = [
  {
    id: 'vk-arbeit-fuehrungskraft', feld: 'Arbeit', kind: 'einzelwort',
    de: 'die Führungskraft', en: 'manager (person in a leadership position)', plural: 'Führungskräfte',
    variants: [],
    saetze: [
      { de: 'Viele {{Führungskräfte}} unterschätzen, wie wichtig regelmäßige Rückmeldungen für ihr Team sind.',
        en: 'Many managers underestimate how important regular feedback is for their team.' },
      { de: 'Als {{Führungskraft}} muss man auch unangenehme Entscheidungen klar vertreten können.',
        en: 'As a manager you also have to be able to defend unpleasant decisions clearly.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-arbeit-belegschaft', feld: 'Arbeit', kind: 'einzelwort',
    de: 'die Belegschaft', en: 'workforce (all the employees of a company)', plural: 'Belegschaften',
    variants: [],
    saetze: [
      { de: 'Die {{Belegschaft}} hat dem neuen Schichtmodell mit großer Mehrheit zugestimmt.',
        en: 'The workforce approved the new shift model by a large majority.' },
      { de: 'In beiden Werken wurden die {{Belegschaften}} frühzeitig über die Fusion informiert.',
        en: 'In both plants the workforces were informed about the merger at an early stage.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-arbeit-tarifvertrag', feld: 'Arbeit', kind: 'einzelwort',
    de: 'der Tarifvertrag', en: 'collective bargaining agreement (pay deal between union and employers)', plural: 'Tarifverträge',
    variants: [],
    saetze: [
      { de: 'Der neue {{Tarifvertrag}} sieht eine Lohnerhöhung von vier Prozent vor.',
        en: 'The new collective agreement provides for a pay rise of four percent.' },
      { de: 'In vielen Branchen gelten längst keine verbindlichen {{Tarifverträge}} mehr.',
        en: 'In many sectors, binding collective agreements have long ceased to apply.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-arbeit-probezeit', feld: 'Arbeit', kind: 'einzelwort',
    de: 'die Probezeit', en: 'probationary period (trial months at the start of a job)', plural: 'Probezeiten',
    variants: [],
    saetze: [
      { de: 'Nach der {{Probezeit}} wurde ihr Vertrag ohne lange Diskussion verlängert.',
        en: 'After the probationary period her contract was extended without lengthy discussion.' },
      { de: 'Bei kurzen Projekten verzichten manche Betriebe inzwischen auf lange {{Probezeiten}}.',
        en: 'For short projects some companies now do without long probationary periods.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-arbeit-fachkraft', feld: 'Arbeit', kind: 'einzelwort',
    de: 'die Fachkraft', en: 'skilled worker (with a completed vocational qualification)', plural: 'Fachkräfte',
    variants: [],
    saetze: [
      { de: 'In der Pflege fehlen bundesweit Tausende gut ausgebildete {{Fachkräfte}}.',
        en: 'Nationwide, thousands of well-trained skilled workers are missing in nursing.' },
      { de: 'Ohne eine erfahrene {{Fachkraft}} lässt sich die Anlage nicht sicher betreiben.',
        en: 'Without an experienced skilled worker the plant cannot be operated safely.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-arbeit-vorstellungsgespraech', feld: 'Arbeit', kind: 'einzelwort',
    de: 'das Vorstellungsgespräch', en: 'job interview', plural: 'Vorstellungsgespräche',
    variants: [],
    saetze: [
      { de: 'Vor dem {{Vorstellungsgespräch}} sollte man sich über das Unternehmen gründlich informieren.',
        en: 'Before the job interview you should inform yourself thoroughly about the company.' },
      { de: 'Sie hat innerhalb von zwei Wochen drei {{Vorstellungsgespräche}} bei Zulieferern geführt.',
        en: 'Within two weeks she had three job interviews with suppliers.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-arbeit-befoerderung', feld: 'Arbeit', kind: 'einzelwort',
    de: 'die Beförderung', en: 'promotion (move to a higher position at work)', plural: 'Beförderungen',
    variants: [],
    saetze: [
      { de: 'Nach der {{Beförderung}} trägt er die Verantwortung für zwölf Mitarbeiter.',
        en: 'After the promotion he is responsible for twelve members of staff.' },
      { de: 'Im Konzern werden {{Beförderungen}} seit Jahren nach klaren Kriterien vergeben.',
        en: 'In the group, promotions have been awarded according to clear criteria for years.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-arbeit-arbeitsbelastung', feld: 'Arbeit', kind: 'einzelwort',
    de: 'die Arbeitsbelastung', en: 'workload (the strain the job puts on someone)', plural: 'Arbeitsbelastungen',
    variants: [],
    saetze: [
      { de: 'Die {{Arbeitsbelastung}} in der Abteilung ist seit dem Personalabbau deutlich gestiegen.',
        en: 'The workload in the department has risen considerably since the job cuts.' },
      { de: 'Dauerhaft hohe {{Arbeitsbelastungen}} machen sich in der Krankenstatistik deutlich bemerkbar.',
        en: 'Permanently high workloads show up clearly in the sickness statistics.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-arbeit-einstellen', feld: 'Arbeit', kind: 'einzelwort',
    de: 'einstellen', en: 'to hire (take on a new employee)',
    variants: [],
    saetze: [
      { de: 'Der Betrieb will im Frühjahr zehn zusätzliche Mitarbeiter {{einstellen}}.',
        en: 'The company wants to hire ten additional employees in the spring.' },
      { de: 'Man hat sie direkt nach dem Studium als Projektleiterin {{eingestellt}}.',
        en: 'She was hired as a project manager straight after her degree.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-arbeit-kuendigen', feld: 'Arbeit', kind: 'einzelwort',
    de: 'kündigen', en: 'to give notice (quit a job, or terminate someone\'s contract)',
    variants: [],
    saetze: [
      { de: 'Nach dem Streit mit dem Vorgesetzten hat sie fristgerecht {{gekündigt}}.',
        en: 'After the argument with her superior she gave notice within the deadline.' },
      { de: 'Wenn die Aufträge weiter ausbleiben, muss die Firma einigen Beschäftigten {{kündigen}}.',
        en: 'If orders continue to fail to materialise, the firm will have to let some employees go.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-arbeit-unbefristet', feld: 'Arbeit', kind: 'einzelwort',
    de: 'unbefristet', en: 'permanent (of a contract, with no end date)',
    variants: [],
    saetze: [
      { de: 'Nach zwei Jahren erhielt sie endlich einen {{unbefristeten}} Arbeitsvertrag.',
        en: 'After two years she finally received a permanent employment contract.' },
      { de: 'Nur wenige Stellen im Kulturbereich sind heute noch {{unbefristet}}.',
        en: 'Only a few positions in the cultural sector are still permanent today.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-arbeit-berufstaetig', feld: 'Arbeit', kind: 'einzelwort',
    de: 'berufstätig', en: 'in paid employment (holding a job, not unemployed)',
    variants: [],
    saetze: [
      { de: 'In den meisten Haushalten sind heute beide Partner {{berufstätig}}.',
        en: 'In most households both partners are in paid employment today.' },
      { de: 'Für {{berufstätige}} Eltern ist die Ferienbetreuung jedes Jahr ein Problem.',
        en: 'For working parents, holiday childcare is a problem every year.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-arbeit-stelle-bewerben', feld: 'Arbeit', kind: 'wortverbindung',
    de: 'sich um eine Stelle bewerben', en: 'to apply for a position',
    rektion: 'um + Akk',
    variants: [],
    saetze: [
      { de: 'Sie will {{sich um eine Stelle bewerben}}, die besser bezahlt ist.',
        en: 'She wants to apply for a position that is better paid.' },
      { de: 'Er hat {{sich um mehrere Stellen beworben}}, bisher jedoch ohne Erfolg.',
        en: 'He has applied for several positions, so far without success, however.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-arbeit-in-rente-gehen', feld: 'Arbeit', kind: 'wortverbindung',
    de: 'in Rente gehen', en: 'to retire (start drawing a pension)',
    variants: [],
    saetze: [
      { de: 'Mein Kollege wird im Sommer nach vierzig Dienstjahren {{in Rente gehen}}.',
        en: 'My colleague will retire in the summer after forty years of service.' },
      { de: 'Viele Beschäftigte sind zuletzt deutlich früher {{in Rente gegangen}} als geplant.',
        en: 'Recently many employees have retired considerably earlier than planned.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-arbeit-beruf-privatleben-trennen', feld: 'Arbeit', kind: 'wortverbindung',
    de: 'Beruf und Privatleben trennen', en: 'to keep work and private life separate',
    variants: [],
    saetze: [
      { de: 'Wer {{Beruf und Privatleben trennen}} möchte, sollte abends das Diensthandy ausschalten.',
        en: 'Anyone who wants to keep work and private life separate should switch off the work phone in the evening.' },
      { de: 'Früher haben die meisten Beschäftigten {{Beruf und Privatleben getrennt}}, heute verschwimmt beides.',
        en: 'In the past most employees kept work and private life separate; today the two blur.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-arbeit-zeitdruck-stehen', feld: 'Arbeit', kind: 'wortverbindung',
    de: 'unter Zeitdruck stehen', en: 'to be under time pressure',
    rektion: 'unter + Dat',
    variants: [],
    saetze: [
      { de: 'Wer ständig {{unter Zeitdruck steht}}, macht mehr Fehler als nötig.',
        en: 'Anyone who is constantly under time pressure makes more mistakes than necessary.' },
      { de: 'Das Team hat wochenlang {{unter Zeitdruck gestanden}} und braucht nun Erholung.',
        en: 'The team was under time pressure for weeks and now needs a rest.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-arbeit-fortbildung-teilnehmen', feld: 'Arbeit', kind: 'wortverbindung',
    de: 'an einer Fortbildung teilnehmen', en: 'to take part in a training course',
    rektion: 'an + Dat',
    variants: ['an Fortbildungen teilnehmen'],
    saetze: [
      { de: 'Alle Mitarbeiter sollen einmal jährlich {{an einer Fortbildung teilnehmen}}.',
        en: 'All employees are supposed to take part in a training course once a year.' },
      { de: 'Er hat im letzten Jahr {{an mehreren Fortbildungen teilgenommen}}.',
        en: 'Last year he took part in several training courses.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-arbeit-ueberstunden-leisten', feld: 'Arbeit', kind: 'wortverbindung',
    de: 'Überstunden leisten', en: 'to work overtime',
    variants: [],
    saetze: [
      { de: 'Wer regelmäßig {{Überstunden leistet}}, sollte sie auch bezahlt bekommen.',
        en: 'Anyone who regularly works overtime should also be paid for it.' },
      { de: 'Die Pflegekräfte haben im vergangenen Winter unzählige {{Überstunden geleistet}}.',
        en: 'Last winter the nursing staff worked countless hours of overtime.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-arbeit-arbeitszeit-gestalten', feld: 'Arbeit', kind: 'wortverbindung',
    de: 'die Arbeitszeit flexibel gestalten', en: 'to organize working hours flexibly',
    variants: ['die Arbeitszeiten flexibel gestalten'],
    saetze: [
      { de: 'Viele Betriebe möchten {{die Arbeitszeit flexibel gestalten}}, scheuen aber den Aufwand.',
        en: 'Many companies would like to organize working hours flexibly, but shy away from the effort.' },
      { de: 'Unsere Abteilung hat {{die Arbeitszeit flexibel gestaltet}} und dadurch Fehlzeiten gesenkt.',
        en: 'Our department organized working hours flexibly and thereby reduced absences.',
        blankVariants: ['die Arbeitszeiten flexibel gestaltet'] }
    ],
    source: 'seed'
  },
  {
    id: 'vk-arbeit-homeoffice-arbeiten', feld: 'Arbeit', kind: 'wortverbindung',
    de: 'im Homeoffice arbeiten', en: 'to work from home',
    rektion: 'in + Dat',
    variants: [],
    saetze: [
      { de: 'Zwei Tage pro Woche darf das gesamte Team {{im Homeoffice arbeiten}}.',
        en: 'Two days a week the whole team is allowed to work from home.' },
      { de: 'Während der Pandemie haben Millionen Beschäftigte erstmals {{im Homeoffice gearbeitet}}.',
        en: 'During the pandemic millions of employees worked from home for the first time.' }
    ],
    source: 'seed'
  }
]
