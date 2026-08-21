import type { Vokabel } from './wortschatz'

export const WORTSCHATZ_BILDUNG: Vokabel[] = [
  // ── Einzelwörter: Nomen ─────────────────────────────────────────
  {
    id: 'vk-bildung-lehrkraft', feld: 'Bildung', kind: 'einzelwort',
    de: 'die Lehrkraft', en: 'teacher (formal term for school staff)', plural: 'Lehrkräfte',
    variants: [],
    saetze: [
      { de: 'An vielen Schulen fehlt es an {{Lehrkräften}} für die naturwissenschaftlichen Fächer.',
        en: 'Many schools lack teachers for the science subjects.' },
      { de: 'Eine erfahrene {{Lehrkraft}} erkennt Lernschwierigkeiten meist schon nach wenigen Wochen.',
        en: 'An experienced teacher usually spots learning difficulties after just a few weeks.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-bildung-lehrplan', feld: 'Bildung', kind: 'einzelwort',
    de: 'der Lehrplan', en: 'curriculum (official syllabus of a school)', plural: 'Lehrpläne',
    variants: [],
    saetze: [
      { de: 'Der {{Lehrplan}} lässt kaum Zeit für eigene Projekte der Schüler.',
        en: 'The curriculum leaves hardly any time for pupils\' own projects.' },
      { de: 'Die Bundesländer haben ihre {{Lehrpläne}} in den letzten Jahren mehrfach überarbeitet.',
        en: 'The federal states have revised their curricula several times in recent years.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-bildung-pflichtfach', feld: 'Bildung', kind: 'einzelwort',
    de: 'das Pflichtfach', en: 'compulsory subject (one every pupil must take)', plural: 'Pflichtfächer',
    variants: [],
    saetze: [
      { de: 'Informatik sollte meiner Meinung nach ein {{Pflichtfach}} an allen Schulen werden.',
        en: 'In my view, computer science should become a compulsory subject at all schools.' },
      { de: 'In der Oberstufe werden viele {{Pflichtfächer}} durch frei gewählte Kurse ersetzt.',
        en: 'In the upper years many compulsory subjects are replaced by freely chosen courses.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-bildung-bildungsabschluss', feld: 'Bildung', kind: 'einzelwort',
    de: 'der Bildungsabschluss', en: 'formal qualification (school or university certificate)', plural: 'Bildungsabschlüsse',
    variants: [],
    saetze: [
      { de: 'Ohne einen anerkannten {{Bildungsabschluss}} bleiben viele Bewerbungen von vornherein erfolglos.',
        en: 'Without a recognised qualification, many applications are unsuccessful from the start.' },
      { de: 'Im Ausland erworbene {{Bildungsabschlüsse}} werden hierzulande noch zu selten anerkannt.',
        en: 'Qualifications obtained abroad are still recognised far too rarely here.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-bildung-wissensluecke', feld: 'Bildung', kind: 'einzelwort',
    de: 'die Wissenslücke', en: 'gap in someone\'s knowledge', plural: 'Wissenslücken',
    variants: [],
    saetze: [
      { de: 'Im Onlineunterricht bleiben große {{Wissenslücken}} bei einzelnen Schülern oft monatelang unentdeckt.',
        en: 'In online lessons, large gaps in individual pupils\' knowledge often go unnoticed for months.' },
      { de: 'Ein zusätzlicher Förderkurs kann eine {{Wissenslücke}} in Mathematik rasch schließen.',
        en: 'An extra support course can quickly close a gap in maths knowledge.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-bildung-klassenarbeit', feld: 'Bildung', kind: 'einzelwort',
    de: 'die Klassenarbeit', en: 'written class test (graded test written in class)', plural: 'Klassenarbeiten',
    variants: [],
    saetze: [
      { de: 'Vor jeder {{Klassenarbeit}} wiederholen wir den Stoff der letzten Wochen.',
        en: 'Before every class test we revise the material of the past weeks.' },
      { de: 'Die {{Klassenarbeiten}} fielen in diesem Halbjahr deutlich schlechter aus als erwartet.',
        en: 'The class tests turned out much worse this term than expected.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-bildung-studiengang', feld: 'Bildung', kind: 'einzelwort',
    de: 'der Studiengang', en: 'degree programme (course of study at university)', plural: 'Studiengänge',
    variants: [],
    saetze: [
      { de: 'Der neue {{Studiengang}} verbindet Wirtschaft mit Informatik und ist stark nachgefragt.',
        en: 'The new degree programme combines business with computer science and is in high demand.' },
      { de: 'Viele {{Studiengänge}} setzen inzwischen ein mehrwöchiges Praktikum im Ausland voraus.',
        en: 'Many degree programmes now require an internship abroad lasting several weeks.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-bildung-zeugnis', feld: 'Bildung', kind: 'einzelwort',
    de: 'das Zeugnis', en: 'school report (report card with grades)', plural: 'Zeugnisse',
    variants: [],
    saetze: [
      { de: 'Am Ende des Schuljahres erhalten alle Schüler ihr {{Zeugnis}}.',
        en: 'At the end of the school year all pupils receive their report.' },
      { de: 'Gute {{Zeugnisse}} allein sagen wenig über die spätere Berufswahl aus.',
        en: 'Good school reports alone say little about a later choice of career.' }
    ],
    source: 'seed'
  },

  // ── Einzelwörter: Verben ────────────────────────────────────────
  {
    id: 'vk-bildung-benoten', feld: 'Bildung', kind: 'einzelwort',
    de: 'benoten', en: 'to grade (assign a mark to a pupil\'s work)',
    variants: [],
    saetze: [
      { de: 'Projektarbeiten lassen sich schwerer objektiv {{benoten}} als schriftliche Prüfungen.',
        en: 'Project work is harder to grade objectively than written exams.' },
      { de: 'Die Lehrerin hat die Aufsätze nach einheitlichen Kriterien {{benotet}}.',
        en: 'The teacher graded the essays according to uniform criteria.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-bildung-vertiefen', feld: 'Bildung', kind: 'einzelwort',
    de: 'vertiefen', en: 'to deepen (one\'s knowledge of a subject)',
    variants: [],
    saetze: [
      { de: 'In den Übungen {{vertiefen}} die Studierenden den Stoff der Vorlesung.',
        en: 'In the tutorials the students deepen the material of the lecture.' },
      { de: 'Das Praktikum hat mein Verständnis für pädagogische Fragen deutlich {{vertieft}}.',
        en: 'The internship considerably deepened my understanding of educational questions.' }
    ],
    source: 'seed'
  },

  // ── Einzelwörter: Adjektive ─────────────────────────────────────
  {
    id: 'vk-bildung-faecheruebergreifend', feld: 'Bildung', kind: 'einzelwort',
    de: 'fächerübergreifend', en: 'interdisciplinary (spanning several school subjects)',
    variants: [],
    saetze: [
      { de: '{{Fächerübergreifende}} Projekte fördern das Verständnis für größere Zusammenhänge.',
        en: 'Interdisciplinary projects promote an understanding of broader connections.' },
      { de: 'Der Unterricht ist an dieser Schule bewusst {{fächerübergreifend}} angelegt.',
        en: 'At this school, teaching is deliberately designed to span subjects.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-bildung-begabt', feld: 'Bildung', kind: 'einzelwort',
    de: 'begabt', en: 'gifted (having natural talent)',
    variants: [],
    saetze: [
      { de: 'Besonders {{begabte}} Schüler langweilen sich im Regelunterricht häufig.',
        en: 'Particularly gifted pupils are often bored in mainstream lessons.' },
      { de: 'Sie ist sprachlich außerordentlich {{begabt}}, tut sich in Mathematik aber schwer.',
        en: 'She is exceptionally gifted at languages but struggles with maths.' }
    ],
    source: 'seed'
  },

  // ── Wortverbindungen ────────────────────────────────────────────
  {
    id: 'vk-bildung-pruefung-ablegen', feld: 'Bildung', kind: 'wortverbindung',
    de: 'eine Prüfung ablegen', en: 'to sit an exam (take it formally)',
    variants: ['Prüfungen ablegen'],
    saetze: [
      { de: 'Am Ende des Kurses müssen alle Teilnehmer {{eine Prüfung ablegen}}.',
        en: 'At the end of the course all participants have to sit an exam.' },
      { de: 'Im vergangenen Semester habe ich drei {{Prüfungen abgelegt}} und alle bestanden.',
        en: 'Last semester I sat three exams and passed them all.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-bildung-am-unterricht-teilnehmen', feld: 'Bildung', kind: 'wortverbindung',
    de: 'am Unterricht teilnehmen', en: 'to attend class (take part in lessons)', rektion: 'an + Dat',
    variants: [],
    saetze: [
      { de: 'Wer den Kurs abschließen will, muss regelmäßig {{am Unterricht teilnehmen}}.',
        en: 'Anyone wanting to complete the course has to attend classes regularly.' },
      { de: 'Sie hat wegen einer Erkrankung mehrere Wochen nicht {{am Unterricht teilgenommen}}.',
        en: 'Because of an illness she did not attend classes for several weeks.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-bildung-um-studienplatz-bewerben', feld: 'Bildung', kind: 'wortverbindung',
    de: 'sich um einen Studienplatz bewerben', en: 'to apply for a university place', rektion: 'um + Akk',
    variants: [],
    saetze: [
      { de: 'Sie {{bewarb sich um einen Studienplatz}} in Medizin, wurde aber abgelehnt.',
        en: 'She applied for a place to study medicine but was rejected.' },
      { de: 'Tausende Abiturienten {{bewerben sich um einen Studienplatz}} in den beliebten Fächern.',
        en: 'Thousands of school leavers apply for a university place in the popular subjects.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-bildung-druck-ausueben', feld: 'Bildung', kind: 'wortverbindung',
    de: 'Druck auf Schüler ausüben', en: 'to put pressure on pupils', rektion: 'auf + Akk',
    variants: [],
    saetze: [
      { de: 'Eltern sollten keinen unnötigen {{Druck auf Schüler ausüben}}.',
        en: 'Parents should not put unnecessary pressure on pupils.' },
      { de: 'Das Notensystem hat jahrelang enormen {{Druck auf Schüler ausgeübt}}.',
        en: 'For years the grading system put enormous pressure on pupils.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-bildung-klasse-wiederholen', feld: 'Bildung', kind: 'wortverbindung',
    de: 'eine Klasse wiederholen', en: 'to repeat a school year',
    variants: [],
    saetze: [
      { de: 'Wegen langer Krankheit musste sie {{eine Klasse wiederholen}}.',
        en: 'Because of a long illness she had to repeat a school year.' },
      { de: 'Etwa jeder zwanzigste Schüler hat schon einmal {{eine Klasse wiederholt}}.',
        en: 'About one pupil in twenty has repeated a school year at some point.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-bildung-wissen-vermitteln', feld: 'Bildung', kind: 'wortverbindung',
    de: 'Wissen vermitteln', en: 'to impart knowledge (pass it on to learners)',
    variants: [],
    saetze: [
      { de: 'Eine gute Schule sollte nicht nur {{Wissen vermitteln}}, sondern auch Neugier wecken.',
        en: 'A good school should not only impart knowledge but also awaken curiosity.' },
      { de: 'Der Kurs hat mir in kurzer Zeit viel {{Wissen vermittelt}}.',
        en: 'The course imparted a lot of knowledge to me in a short time.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-bildung-abitur-nachholen', feld: 'Bildung', kind: 'wortverbindung',
    de: 'das Abitur nachholen', en: 'to complete one\'s school-leaving exams later in life',
    variants: [],
    saetze: [
      { de: 'Viele Erwachsene möchten in einer Abendschule {{das Abitur nachholen}}.',
        en: 'Many adults would like to complete their school-leaving exams at an evening school.' },
      { de: 'Mit dreißig hat er neben dem Beruf {{das Abitur nachgeholt}}.',
        en: 'At thirty he completed his school-leaving exams alongside his job.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-bildung-studium-abbrechen', feld: 'Bildung', kind: 'wortverbindung',
    de: 'das Studium abbrechen', en: 'to drop out of university',
    variants: ['ein Studium abbrechen'],
    saetze: [
      { de: 'Aus finanziellen Gründen müssen viele Studierende {{das Studium abbrechen}}.',
        en: 'For financial reasons many students have to drop out of university.' },
      { de: 'Nach zwei Semestern hat sie {{das Studium abgebrochen}} und eine Ausbildung begonnen.',
        en: 'After two semesters she dropped out of university and started vocational training.' }
    ],
    source: 'seed'
  }
]
