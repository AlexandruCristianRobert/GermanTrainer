// ─── Sample data for the prototype ───
// Subset of the real seed (enough to feel populated)

const NOUN_GROUPS = [
  'Office', 'Work', 'Furniture', 'House', 'Rooms', 'Family', 'School',
  'Bank & Money', 'Food', 'Body & Health', 'Clothing', 'Nature & Weather',
  'Animals', 'Transport & Travel', 'Technology', 'Sports & Hobbies',
  'Culture & Arts', 'Time & Numbers', 'City & Shopping', 'Other'
];

const NOUNS = [
  { german: 'Tisch',    gender: 'der', english: 'table / desk',           group: 'Furniture' },
  { german: 'Stuhl',    gender: 'der', english: 'chair',                  group: 'Furniture' },
  { german: 'Tür',      gender: 'die', english: 'door',                   group: 'House' },
  { german: 'Fenster',  gender: 'das', english: 'window',                 group: 'House' },
  { german: 'Haus',     gender: 'das', english: 'house',                  group: 'House' },
  { german: 'Küche',    gender: 'die', english: 'kitchen',                group: 'Rooms' },
  { german: 'Lampe',    gender: 'die', english: 'lamp',                   group: 'Furniture' },
  { german: 'Brot',     gender: 'das', english: 'bread',                  group: 'Food' },
  { german: 'Apfel',    gender: 'der', english: 'apple',                  group: 'Food' },
  { german: 'Milch',    gender: 'die', english: 'milk',                   group: 'Food' },
  { german: 'Kaffee',   gender: 'der', english: 'coffee',                 group: 'Food' },
  { german: 'Wasser',   gender: 'das', english: 'water',                  group: 'Food' },
  { german: 'Butter',   gender: 'die', english: 'butter',                 group: 'Food' },
  { german: 'Mutter',   gender: 'die', english: 'mother',                 group: 'Family' },
  { german: 'Vater',    gender: 'der', english: 'father',                 group: 'Family' },
  { german: 'Kind',     gender: 'das', english: 'child',                  group: 'Family' },
  { german: 'Schwester',gender: 'die', english: 'sister',                 group: 'Family' },
  { german: 'Bruder',   gender: 'der', english: 'brother',                group: 'Family' },
  { german: 'Buch',     gender: 'das', english: 'book',                   group: 'School' },
  { german: 'Schule',   gender: 'die', english: 'school',                 group: 'School' },
  { german: 'Lehrer',   gender: 'der', english: 'teacher (m)',            group: 'School' },
  { german: 'Hund',     gender: 'der', english: 'dog',                    group: 'Animals' },
  { german: 'Katze',    gender: 'die', english: 'cat',                    group: 'Animals' },
  { german: 'Pferd',    gender: 'das', english: 'horse',                  group: 'Animals' },
  { german: 'Vogel',    gender: 'der', english: 'bird',                   group: 'Animals' },
  { german: 'Auto',     gender: 'das', english: 'car',                    group: 'Transport & Travel' },
  { german: 'Zug',      gender: 'der', english: 'train',                  group: 'Transport & Travel' },
  { german: 'Flughafen',gender: 'der', english: 'airport',                group: 'Transport & Travel' },
  { german: 'Sonne',    gender: 'die', english: 'sun',                    group: 'Nature & Weather' },
  { german: 'Mond',     gender: 'der', english: 'moon',                   group: 'Nature & Weather' },
  { german: 'Wind',     gender: 'der', english: 'wind',                   group: 'Nature & Weather' },
  { german: 'Wolke',    gender: 'die', english: 'cloud',                  group: 'Nature & Weather' },
  { german: 'Telefon',  gender: 'das', english: 'phone',                  group: 'Technology' },
  { german: 'Computer', gender: 'der', english: 'computer',               group: 'Technology' },
  { german: 'Maus',     gender: 'die', english: 'mouse',                  group: 'Technology' },
  { german: 'Hand',     gender: 'die', english: 'hand',                   group: 'Body & Health' },
  { german: 'Auge',     gender: 'das', english: 'eye',                    group: 'Body & Health' },
  { german: 'Kopf',     gender: 'der', english: 'head',                   group: 'Body & Health' },
  { german: 'Hemd',     gender: 'das', english: 'shirt',                  group: 'Clothing' },
  { german: 'Hose',     gender: 'die', english: 'trousers',               group: 'Clothing' },
  { german: 'Schuh',    gender: 'der', english: 'shoe',                   group: 'Clothing' },
  { german: 'Stadt',    gender: 'die', english: 'city / town',            group: 'City & Shopping' },
  { german: 'Markt',    gender: 'der', english: 'market',                 group: 'City & Shopping' },
  { german: 'Geschäft', gender: 'das', english: 'shop / business',        group: 'City & Shopping' },
  { german: 'Geld',     gender: 'das', english: 'money',                  group: 'Bank & Money' },
  { german: 'Bank',     gender: 'die', english: 'bank / bench',           group: 'Bank & Money' },
];

// approximate per-group counts so the chips look realistic
const GROUP_COUNTS = {
  'Office': 42, 'Work': 68, 'Furniture': 31, 'House': 54, 'Rooms': 18,
  'Family': 27, 'School': 39, 'Bank & Money': 24, 'Food': 87,
  'Body & Health': 73, 'Clothing': 36, 'Nature & Weather': 49,
  'Animals': 61, 'Transport & Travel': 58, 'Technology': 44,
  'Sports & Hobbies': 41, 'Culture & Arts': 35, 'Time & Numbers': 26,
  'City & Shopping': 47, 'Other': 92,
};

// Marginalia content for the gender quiz — three vignettes that cycle
const GENDER_MARGINALIA = [
  {
    label: 'BEACHTE',
    quote: 'Die meisten Wörter auf -e sind feminin.',
    body: 'Most nouns ending in -e are feminine: die Lampe, die Tür, die Schule, die Sonne, die Wolke. A handful of exceptions — der Name, das Auge — have to be memorised.'
  },
  {
    label: 'REGEL',
    quote: 'Diminutives in -chen and -lein are always neuter.',
    body: 'das Mädchen ("girl") looks like it should be feminine but isn\'t — the -chen ending overrides natural gender. Same with das Fräulein.'
  },
  {
    label: 'TIPP',
    quote: 'Learn the article with the noun, never alone.',
    body: 'German nouns are stored in memory as "der Tisch", not "Tisch". The article is part of the word. When you make a flashcard, never write the bare form.'
  },
];

Object.assign(window, { NOUN_GROUPS, NOUNS, GROUP_COUNTS, GENDER_MARGINALIA });
