import type { Vokabel } from './wortschatz'

export const WORTSCHATZ_KONSUM: Vokabel[] = [
  {
    id: 'vk-konsum-kaufentscheidung', feld: 'Konsum', kind: 'einzelwort',
    de: 'die Kaufentscheidung', en: 'purchasing decision (which product to buy)',
    plural: 'Kaufentscheidungen',
    variants: [],
    saetze: [
      { de: 'Bei teuren Geräten treffe ich {{die Kaufentscheidung}} erst nach längerem Überlegen.',
        en: 'With expensive devices I only make the purchasing decision after thinking it over.' },
      { de: 'Werbung beeinflusst {{Kaufentscheidungen}} stärker, als die meisten zugeben würden.',
        en: 'Advertising influences purchasing decisions more strongly than most would admit.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-konsum-sonderangebot', feld: 'Konsum', kind: 'einzelwort',
    de: 'das Sonderangebot', en: 'special offer (temporarily reduced price)',
    plural: 'Sonderangebote',
    variants: [],
    saetze: [
      { de: 'Das Öl war im {{Sonderangebot}} und hat nur die Hälfte gekostet.',
        en: 'The oil was on special offer and cost only half as much.' },
      { de: 'Auf {{Sonderangebote}} im Supermarkt achte ich inzwischen kaum noch.',
        en: 'These days I hardly pay attention to special offers in the supermarket.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-konsum-ratenzahlung', feld: 'Konsum', kind: 'einzelwort',
    de: 'die Ratenzahlung', en: 'payment in instalments (paying off a purchase monthly)',
    plural: 'Ratenzahlungen',
    variants: [],
    saetze: [
      { de: 'Das Möbelhaus bietet {{Ratenzahlung}} ohne Zinsen über zwölf Monate an.',
        en: 'The furniture store offers interest-free payment in instalments over twelve months.' },
      { de: 'Offene {{Ratenzahlungen}} für mehrere Käufe bringen manche Haushalte in echte Schwierigkeiten.',
        en: 'Outstanding instalment plans for several purchases get some households into real difficulty.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-konsum-verbraucher', feld: 'Konsum', kind: 'einzelwort',
    de: 'der Verbraucher', en: 'consumer (private buyer of goods and services)',
    plural: 'Verbraucher',
    variants: [],
    saetze: [
      { de: 'Der {{Verbraucher}} kann einen online geschlossenen Vertrag binnen zwei Wochen widerrufen.',
        en: 'The consumer can withdraw from a contract concluded online within two weeks.' },
      { de: 'Bei vielen {{Verbrauchern}} entscheidet am Ende doch der Preis im Laden.',
        en: 'For many consumers it is the price in the shop that decides in the end after all.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-konsum-impulskauf', feld: 'Konsum', kind: 'einzelwort',
    de: 'der Impulskauf', en: 'impulse purchase (bought on the spur of the moment)',
    plural: 'Impulskäufe',
    variants: [],
    saetze: [
      { de: 'Die Schokolade an der Kasse verleitet fast jeden zum {{Impulskauf}}.',
        en: 'The chocolate at the till tempts almost everyone into an impulse purchase.' },
      { de: '{{Impulskäufe}} lassen sich mit einem festen Einkaufszettel gut vermeiden.',
        en: 'Impulse purchases can be avoided quite well with a fixed shopping list.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-konsum-umtauschfrist', feld: 'Konsum', kind: 'einzelwort',
    de: 'die Umtauschfrist', en: 'deadline for exchanging goods (period for returning a purchase)',
    plural: 'Umtauschfristen',
    variants: [],
    saetze: [
      { de: 'Die {{Umtauschfrist}} war leider schon abgelaufen, als ich es merkte.',
        en: 'Unfortunately the deadline for exchanging it had already passed when I noticed.' },
      { de: 'Manche Ketten verlängern ihre {{Umtauschfristen}} nach Weihnachten auf vier Wochen.',
        en: 'Some chains extend their exchange deadlines to four weeks after Christmas.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-konsum-reklamation', feld: 'Konsum', kind: 'einzelwort',
    de: 'die Reklamation', en: 'complaint about faulty goods (formal claim to the seller)',
    plural: 'Reklamationen',
    variants: [],
    saetze: [
      { de: 'Meine {{Reklamation}} hat der Händler nach kurzer Prüfung ohne Diskussion anerkannt.',
        en: 'After a brief check the dealer accepted my complaint without discussion.' },
      { de: 'Der Kundendienst bearbeitet {{Reklamationen}} inzwischen ausschließlich über ein Formular.',
        en: 'Customer service now handles complaints exclusively via a form.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-konsum-kundenbewertung', feld: 'Konsum', kind: 'einzelwort',
    de: 'die Kundenbewertung', en: 'customer review (rating written by a buyer)',
    plural: 'Kundenbewertungen',
    variants: [],
    saetze: [
      { de: 'Vor dem Kauf lese ich immer die schlechteste {{Kundenbewertung}} zuerst.',
        en: 'Before buying I always read the worst customer review first.' },
      { de: 'Gekaufte {{Kundenbewertungen}} verzerren das Bild eines Produkts im Netz erheblich.',
        en: 'Paid-for customer reviews considerably distort the picture of a product online.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-konsum-erwerben', feld: 'Konsum', kind: 'einzelwort',
    de: 'erwerben', en: 'to purchase (formal: acquire something by buying it)',
    variants: [],
    saetze: [
      { de: 'Das Gerät habe ich gebraucht und deutlich günstiger {{erworben}}.',
        en: 'I purchased the device second-hand and much more cheaply.' },
      { de: 'Wer eine Wohnung {{erwerben}} will, braucht heute erhebliche Eigenmittel.',
        en: 'Anyone wanting to purchase a flat needs considerable capital of their own today.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-konsum-abbuchen', feld: 'Konsum', kind: 'einzelwort',
    de: 'abbuchen', en: 'to debit (take an amount from a bank account)',
    variants: [],
    saetze: [
      { de: 'Der Beitrag wird jeden Monat automatisch vom Konto {{abgebucht}}.',
        en: 'The fee is debited from the account automatically every month.' },
      { de: 'Ohne meine ausdrückliche Zustimmung darf die Firma nichts {{abbuchen}}.',
        en: 'Without my explicit consent the company may not debit anything.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-konsum-hochwertig', feld: 'Konsum', kind: 'einzelwort',
    de: 'hochwertig', en: 'high-quality (well made, of good materials)',
    variants: [],
    saetze: [
      { de: 'Die Jacke ist teuer, wirkt aber wirklich {{hochwertig}} verarbeitet.',
        en: 'The jacket is expensive, but it really does look well made.' },
      { de: 'Für {{hochwertige}} Möbel zahlt man mehr, hat aber länger Freude daran.',
        en: 'You pay more for high-quality furniture, but enjoy it for longer.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-konsum-ueberteuert', feld: 'Konsum', kind: 'einzelwort',
    de: 'überteuert', en: 'overpriced (costing far more than it is worth)',
    variants: [],
    saetze: [
      { de: 'Am Bahnhof ist jedes belegte Brötchen maßlos {{überteuert}}.',
        en: 'At the station every filled roll is grossly overpriced.' },
      { de: 'Solche {{überteuerten}} Ersatzteile kauft niemand freiwillig ein zweites Mal.',
        en: 'Nobody willingly buys such overpriced spare parts a second time.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-konsum-preise-vergleichen', feld: 'Konsum', kind: 'wortverbindung',
    de: 'Preise vergleichen', en: 'to compare prices (check what the same thing costs elsewhere)',
    variants: [],
    saetze: [
      { de: 'Vor größeren Anschaffungen sollte man immer {{Preise vergleichen}}.',
        en: 'Before bigger purchases you should always compare prices.' },
      { de: 'Wir haben vorher {{Preise verglichen}} und dabei fast hundert Euro gespart.',
        en: 'We compared prices beforehand and saved almost a hundred euros doing so.',
        blankVariants: ['die Preise verglichen'] }
    ],
    source: 'seed'
  },
  {
    id: 'vk-konsum-auf-qualitaet-achten', feld: 'Konsum', kind: 'wortverbindung',
    de: 'auf Qualität achten', en: 'to pay attention to quality (make it a criterion when buying)',
    rektion: 'auf + Akk',
    variants: [],
    saetze: [
      { de: 'Bei Lebensmitteln sollte man stärker {{auf Qualität achten}} als auf den Preis.',
        en: 'With food you should pay more attention to quality than to price.' },
      { de: 'Früher hat kaum jemand {{auf Qualität geachtet}}, heute ist das anders.',
        en: 'In the past hardly anyone paid attention to quality; today that is different.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-konsum-ueber-ein-produkt-beschweren', feld: 'Konsum', kind: 'wortverbindung',
    de: 'sich über ein Produkt beschweren', en: 'to complain about a product (to the seller)',
    rektion: 'über + Akk',
    variants: [],
    saetze: [
      { de: 'Wer schlecht beraten wurde, kann {{sich über ein Produkt beschweren}}.',
        en: 'Anyone badly advised can complain about a product.' },
      { de: 'Sie hat {{sich über das Produkt beschwert}} und sofort Ersatz erhalten.',
        en: 'She complained about the product and immediately got a replacement.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-konsum-von-einem-kauf-zuruecktreten', feld: 'Konsum', kind: 'wortverbindung',
    de: 'von einem Kauf zurücktreten', en: 'to withdraw from a purchase (cancel it legally)',
    rektion: 'von + Dat',
    variants: [],
    saetze: [
      { de: 'Bei Online-Bestellungen darf man binnen zwei Wochen {{von einem Kauf zurücktreten}}.',
        en: 'With online orders you may withdraw from a purchase within two weeks.' },
      { de: 'Sie ist noch am selben Abend {{vom Kauf zurückgetreten}}.',
        en: 'She withdrew from the purchase that very evening.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-konsum-schnaeppchen-machen', feld: 'Konsum', kind: 'wortverbindung',
    de: 'ein Schnäppchen machen', en: 'to get a bargain (buy something unusually cheaply)',
    variants: [],
    saetze: [
      { de: 'Im Winterausverkauf kann man mit Geduld {{ein Schnäppchen machen}}.',
        en: 'In the winter sale you can get a bargain if you are patient.' },
      { de: 'Mit dem gebrauchten Fahrrad hat er {{ein Schnäppchen gemacht}}.',
        en: 'He got a bargain with the second-hand bicycle.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-konsum-ware-zurueckschicken', feld: 'Konsum', kind: 'wortverbindung',
    de: 'die Ware zurückschicken', en: 'to send the goods back (return a delivery)',
    rektion: 'an + Akk',
    variants: [],
    saetze: [
      { de: 'Passt die Größe nicht, kann man {{die Ware zurückschicken}}.',
        en: 'If the size does not fit, you can send the goods back.' },
      { de: 'Am selben Tag habe ich {{die Ware zurückgeschickt}} und mein Geld erhalten.',
        en: 'I sent the goods back the same day and got my money.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-konsum-abonnement-kuendigen', feld: 'Konsum', kind: 'wortverbindung',
    de: 'ein Abonnement kündigen', en: 'to cancel a subscription (end it formally)',
    variants: [],
    saetze: [
      { de: 'Vorsichtshalber sollte man {{ein Abonnement kündigen}}, bevor es sich verlängert.',
        en: 'To be on the safe side you should cancel a subscription before it renews.' },
      { de: 'Nach dem Probemonat habe ich {{das Abonnement gekündigt}} und nichts vermisst.',
        en: 'After the trial month I cancelled the subscription and missed nothing.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-konsum-auf-kredit-kaufen', feld: 'Konsum', kind: 'wortverbindung',
    de: 'auf Kredit kaufen', en: 'to buy on credit (pay for it later)',
    variants: [],
    saetze: [
      { de: 'Wer regelmäßig {{auf Kredit kauft}}, verliert leicht den Überblick.',
        en: 'Anyone who regularly buys on credit easily loses track.' },
      { de: 'Das Auto haben sie damals {{auf Kredit gekauft}} und lange abbezahlt.',
        en: 'They bought the car on credit back then and paid it off for a long time.' }
    ],
    source: 'seed'
  }
]
