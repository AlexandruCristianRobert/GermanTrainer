// ─── Home page ───

function HomePage({ navigate }) {
  const modules = [
    {
      numeral: 'I',
      route: 'nouns',
      de: 'Substantive',
      title: 'Nouns',
      desc: 'Drill der/die/das or English translation across twenty themed groups — around 1,400 words from Möbel to Wetter.',
      meta: '1,407 entries · 20 groups',
    },
    {
      numeral: 'II',
      route: 'adjectives',
      de: 'Adjektive',
      title: 'Adjectives',
      desc: 'AI-generated German sentences with one word missing. Type the inflected form to match the case and gender.',
      meta: '~250 adjectives · 11 groups',
    },
    {
      numeral: 'III',
      route: 'verbs',
      de: 'Verben',
      title: 'Verbs',
      desc: 'Translation drill, full-tense conjugation across all fifteen tenses, plus a twelve-chapter grammar cheatsheet.',
      meta: '378 verbs · 15 tenses',
    },
    {
      numeral: 'IV',
      route: 'settings',
      de: 'Einstellungen',
      title: 'Settings',
      desc: 'Set your Gemini API key and choose a model. Required only for the Adjectives quiz.',
      meta: 'Local · stored in your browser',
    },
  ];

  return (
    <div className="page">
      <div className="section-header" data-screen-label="00 Home">
        <div>
          <div className="breadcrumb">Frontispiece · I/IV</div>
          <h1 className="section-title">Üben<em>.</em></h1>
          <p className="section-subtitle">
            A small workbook for German vocabulary and grammar — three drills,
            a long-form cheatsheet, and a quiet place to come back to.
          </p>
        </div>
        <div style={{textAlign: 'right'}}>
          <div className="micro-mark" style={{marginBottom: 6}}>Niveau</div>
          <div style={{fontFamily: 'var(--font-display)', fontSize: 24, fontStyle: 'italic', letterSpacing: '-0.01em'}}>A1 — B2</div>
        </div>
      </div>

      <div className="module-grid">
        {modules.map((m) => (
          <article
            key={m.route}
            className="card module-card interactive"
            onClick={() => navigate(m.route)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(m.route); }}
          >
            <div className="module-numeral">{m.numeral}</div>
            <h2>{m.title}</h2>
            <div className="module-de">{m.de}</div>
            <p className="module-desc">{m.desc}</p>
            <div className="module-meta">{m.meta}</div>
            <div className="module-cta">
              Open <span aria-hidden="true">→</span>
            </div>
          </article>
        ))}
      </div>

      <footer style={{marginTop: 96, paddingTop: 24, borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12}}>
        <span className="micro-mark">Local first · no account · A single-user atelier</span>
        <span className="micro-mark">Ausgabe MMXXVI · Berlin</span>
      </footer>
    </div>
  );
}

Object.assign(window, { HomePage });
