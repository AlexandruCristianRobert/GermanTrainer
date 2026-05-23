// ─── Settings, plus stubs for Adjectives / Verbs landings ───

function Settings({ navigate }) {
  const [showKey, setShowKey] = React.useState(false);
  const [key, setKey] = React.useState('');
  const [model, setModel] = React.useState('gemini-2.5-flash');
  const [testState, setTestState] = React.useState(null);

  const doTest = () => {
    if (!key) return;
    setTestState('testing');
    setTimeout(() => setTestState('ok'), 900);
  };

  return (
    <div className="page" style={{maxWidth: 720, margin: '0 auto'}} data-screen-label="50 Settings">
      <div className="section-header">
        <div>
          <div className="breadcrumb">Konfiguration · Schlüssel & Modell</div>
          <h1 className="section-title">Settings<em>.</em></h1>
          <p className="section-subtitle">
            Required only for the Adjectives quiz. Everything else runs entirely offline.
          </p>
        </div>
      </div>

      <div className="alert alert-warning">
        <span className="alert-label">Privacy</span>
        Your API key is stored only in this browser. It is sent directly to Google's Gemini API and to nobody else.
      </div>

      <div className="field">
        <div className="field-label">Gemini API key</div>
        <div style={{display: 'flex', gap: 12, alignItems: 'flex-end'}}>
          <input
            className="input"
            type={showKey ? 'text' : 'password'}
            placeholder="AIzaSy…"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            style={{flex: 1}}
          />
          <button className="btn btn-quiet" onClick={() => setShowKey(!showKey)}>
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <div className="field">
        <div className="field-label">Model</div>
        <select className="select" value={model} onChange={(e) => setModel(e.target.value)}>
          <option value="gemini-2.5-flash">gemini-2.5-flash — default, free tier</option>
          <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite — cheapest</option>
          <option value="gemini-2.5-pro">gemini-2.5-pro — most capable</option>
        </select>
      </div>

      <div style={{display: 'flex', gap: 12, marginTop: 32, alignItems: 'center'}}>
        <button className="btn btn-accent">Save</button>
        <button className="btn btn-ghost" disabled={!key || testState === 'testing'} onClick={doTest}>
          {testState === 'testing' ? 'Testing…' : 'Test connection'}
        </button>
        {testState === 'ok' && (
          <span style={{color: 'var(--success)', fontFamily: 'var(--font-display)', fontStyle: 'italic'}}>
            ✓ Reached the model.
          </span>
        )}
      </div>

      <div className="alert alert-info" style={{marginTop: 48}}>
        <span className="alert-label">How to get a key</span>
        <p style={{margin: 0}}>
          Sign in at <code>aistudio.google.com/apikey</code> and click <em>Create API key</em>.
          The free tier covers light Adjectives-quiz use comfortably.
        </p>
      </div>
    </div>
  );
}

/* ────── Adjectives landing (stub) ────── */

function AdjectivesLanding({ navigate }) {
  return (
    <div className="page">
      <div className="section-header" data-screen-label="20 Adjectives landing">
        <div>
          <div className="breadcrumb">Kapitel II · Adjektive</div>
          <h1 className="section-title">Adjectives<em>.</em></h1>
          <p className="section-subtitle">
            Fill-in-the-blank quiz on AI-generated German sentences. The point of the drill is
            <em> inflection</em> — case + gender endings, not just the dictionary form.
          </p>
        </div>
      </div>
      <div className="module-grid">
        {[
          { numeral: 'A', title: 'Manage adjectives', de: 'Verwalten', desc: 'Add, edit, or delete adjectives. Reset to the curated seed of ~250 entries.', route: 'adjectives/manage' },
          { numeral: 'B', title: 'Quiz', de: 'Übung', desc: 'Pick groups, generate sentences with Gemini, type the inflected form. Requires an API key.', route: 'adjectives/quiz' },
        ].map((c) => (
          <article key={c.route} className="card module-card interactive" onClick={() => alert('Stubbed in this prototype — focus is Nouns + Cheatsheet')}>
            <div className="module-numeral">{c.numeral}</div>
            <h2>{c.title}</h2>
            <div className="module-de">{c.de}</div>
            <p className="module-desc">{c.desc}</p>
            <div className="module-cta">Open <span>→</span></div>
          </article>
        ))}
      </div>
      <div className="alert alert-info" style={{marginTop: 32}}>
        <span className="alert-label">Prototype</span>
        The Adjectives flow follows the same shape as Nouns (setup → runner → result). In this prototype we focused depth on Nouns.
      </div>
    </div>
  );
}

/* ────── Verbs landing ────── */

function VerbsLanding({ navigate }) {
  const cards = [
    { numeral: 'A', title: 'Browse verbs', de: 'Liste', desc: 'Searchable list of all 378 A1/A2/B1/B2 verbs with type, case, and auxiliary.', route: 'verbs/list' },
    { numeral: 'B', title: 'Translation quiz', de: 'Übersetzen', desc: 'Type the English meaning of a German verb. "to" is optional.', route: 'verbs/translation' },
    { numeral: 'C', title: 'Conjugation quiz', de: 'Konjugation', desc: 'Fill in all six forms across the tenses you pick — from Präsens to Passiv.', route: 'verbs/conjugation' },
    { numeral: 'D', title: 'Cheatsheet', de: 'Grammatik', desc: 'Twelve chapters of conjugation rules, exceptions, and example sentences.', route: 'verbs/cheatsheet' },
  ];
  return (
    <div className="page">
      <div className="section-header" data-screen-label="30 Verbs landing">
        <div>
          <div className="breadcrumb">Kapitel III · Verben</div>
          <h1 className="section-title">Verbs<em>.</em></h1>
          <p className="section-subtitle">
            Translate verbs, drill all fifteen tenses one verb at a time, and consult the long-form cheatsheet
            whenever you forget which auxiliary <em>laufen</em> takes in the Perfekt.
          </p>
        </div>
      </div>
      <div className="module-grid" style={{gridTemplateColumns: 'repeat(2, 1fr)'}}>
        {cards.map((c) => (
          <article
            key={c.route}
            className="card module-card interactive"
            onClick={() => {
              if (c.route === 'verbs/cheatsheet' || c.route === 'verbs/translation') navigate(c.route);
              else alert('Stubbed in this prototype — try Translation quiz or Cheatsheet');
            }}
          >
            <div className="module-numeral">{c.numeral}</div>
            <h2>{c.title}</h2>
            <div className="module-de">{c.de}</div>
            <p className="module-desc">{c.desc}</p>
            <div className="module-cta">Open <span>→</span></div>
          </article>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Settings, AdjectivesLanding, VerbsLanding });
