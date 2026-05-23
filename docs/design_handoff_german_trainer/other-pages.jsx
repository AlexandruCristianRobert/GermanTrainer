// ─── Settings, plus stubs for Adjectives / Verbs landings ───

function Settings({ navigate }) {
  const [showKey, setShowKey] = React.useState(false);
  const [key, setKey] = React.useState('');
  const [model, setModel] = React.useState('gemini-2.5-flash');
  const [testState, setTestState] = React.useState(null);
  const [verbSize, setVerbSize] = React.useState(() => {
    const stored = localStorage.getItem('gt:testVerbSize');
    return stored ? parseInt(stored, 10) : 26;
  });

  React.useEffect(() => {
    document.documentElement.style.setProperty('--test-verb-size', verbSize + 'px');
    localStorage.setItem('gt:testVerbSize', String(verbSize));
  }, [verbSize]);

  const doTest = () => {
    if (!key) return;
    setTestState('testing');
    setTimeout(() => setTestState('ok'), 900);
  };

  return (
    <div className="page" style={{maxWidth: 720, margin: '0 auto'}} data-screen-label="50 Settings">
      <div className="section-header">
        <div>
          <div className="breadcrumb">Konfiguration · Schlüssel & Anzeige</div>
          <h1 className="section-title">Settings<em>.</em></h1>
          <p className="section-subtitle">
            API access for the Adjectives quiz, plus display preferences.
            Everything is stored on this device only.
          </p>
        </div>
      </div>

      {/* ────── API section ────── */}
      <div className="settings-group-label">API · Gemini</div>

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

      <div className="alert alert-info" style={{marginTop: 32}}>
        <span className="alert-label">How to get a key</span>
        <p style={{margin: 0}}>
          Sign in at <code>aistudio.google.com/apikey</code> and click <em>Create API key</em>.
          The free tier covers light Adjectives-quiz use comfortably.
        </p>
      </div>

      {/* ────── Display section ────── */}
      <div className="settings-group-label" style={{marginTop: 64}}>Anzeige · Display</div>

      <div className="field">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
          <div className="field-label">Verb test-sheet · type size</div>
          <span className="micro-mark" style={{color: 'var(--ink-soft)'}}>{verbSize}<span style={{color: 'var(--mute)'}}>px</span></span>
        </div>
        <p style={{fontSize: 14, color: 'var(--ink-soft)', fontStyle: 'italic', margin: '0 0 12px 0'}}>
          Controls the size of each verb in the Translation quiz worksheet. Smaller = more verbs visible without scrolling.
        </p>
        <input
          type="range"
          min="18"
          max="44"
          step="1"
          value={verbSize}
          onChange={(e) => setVerbSize(parseInt(e.target.value, 10))}
          className="range-slider"
        />
        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 4}}>
          <span className="micro-mark">18 · compact</span>
          <span className="micro-mark">26 · default</span>
          <span className="micro-mark">44 · large</span>
        </div>
      </div>

      {/* Live preview */}
      <div className="settings-preview">
        <div className="settings-preview-label">Preview</div>
        <div className="test-row" style={{borderBottom: 'none', paddingBottom: 0}}>
          <div className="test-num"><strong>03.</strong></div>
          <div className="test-content">
            <div className="test-prompt-row">
              <span className="test-verb">aufstehen</span>
              <span className="test-chips">
                <span className="tag">A1</span>
                <span className="tag tag-cobalt">separable</span>
                <span className="tag">none</span>
              </span>
            </div>
            <input
              className="test-input"
              type="text"
              placeholder="English (to is optional)…"
              defaultValue="to get up"
            />
          </div>
        </div>
      </div>

      <div style={{marginTop: 20, display: 'flex', gap: 8}}>
        <button className="btn btn-quiet" onClick={() => setVerbSize(20)}>Compact · 20</button>
        <button className="btn btn-quiet" onClick={() => setVerbSize(26)}>Default · 26</button>
        <button className="btn btn-quiet" onClick={() => setVerbSize(36)}>Large · 36</button>
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
          <article
            key={c.route}
            className="card module-card interactive"
            onClick={() => {
              if (c.route === 'adjectives/quiz') navigate(c.route);
              else alert('Manage adjectives — stubbed in this prototype (same UX as Manage Nouns minus the gender field).');
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') { if (c.route === 'adjectives/quiz') navigate(c.route); } }}
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
