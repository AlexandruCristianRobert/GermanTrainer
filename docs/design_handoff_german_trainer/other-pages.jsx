// ─── Settings, plus stubs for Adjectives / Verbs landings ───

function TypeSizeField({ label, blurb, min, max, value, setValue, storageKey, cssVar, presets }) {
  React.useEffect(() => {
    document.documentElement.style.setProperty(cssVar, value + 'px');
    localStorage.setItem(storageKey, String(value));
  }, [value]);

  return (
    <div className="field">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
        <div className="field-label">{label}</div>
        <span className="micro-mark" style={{color: 'var(--ink-soft)'}}>{value}<span style={{color: 'var(--mute)'}}>px</span></span>
      </div>
      {blurb && (
        <p style={{fontSize: 14, color: 'var(--ink-soft)', fontStyle: 'italic', margin: '0 0 12px 0'}}>
          {blurb}
        </p>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step="1"
        value={value}
        onChange={(e) => setValue(parseInt(e.target.value, 10))}
        className="range-slider"
      />
      {presets && (
        <div style={{marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap'}}>
          {presets.map(p => (
            <button key={p.value} className="btn btn-quiet" onClick={() => setValue(p.value)}>
              {p.label} · {p.value}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PaletteSection() {
  const [mode, setMode] = React.useState('light');
  const [palette, setPaletteState] = React.useState(() => loadPalette());
  const [importing, setImporting] = React.useState(false);
  const [importText, setImportText] = React.useState('');
  const [importError, setImportError] = React.useState(null);

  const update = (next) => {
    setPaletteState(next);
    savePalette(next);
    applyPalette(next);
  };

  const setColor = (key, value) => {
    const m = palette[mode] || {};
    update({
      ...palette,
      [mode]: { ...m, [key]: value },
    });
  };

  const resetMode = () => {
    update({ ...palette, [mode]: {} });
  };

  const resetAll = () => {
    if (confirm('Reset both light and dark palettes to defaults?')) {
      update({ light: {}, dark: {} });
    }
  };

  const exportJson = () => {
    return JSON.stringify(palette, null, 2);
  };

  const tryImport = () => {
    try {
      const parsed = JSON.parse(importText);
      if (typeof parsed !== 'object' || !parsed) throw new Error('Expected an object');
      // Accept either { light: {}, dark: {} } shape OR a flat shape applied to current mode
      let next;
      if (parsed.light || parsed.dark) {
        next = {
          light: { ...(palette.light || {}), ...(parsed.light || {}) },
          dark:  { ...(palette.dark  || {}), ...(parsed.dark  || {}) },
        };
      } else {
        next = {
          ...palette,
          [mode]: { ...(palette[mode] || {}), ...parsed },
        };
      }
      update(next);
      setImporting(false);
      setImportText('');
      setImportError(null);
    } catch (e) {
      setImportError(e.message || 'Invalid JSON');
    }
  };

  const tokenVal = (key) => (palette[mode] && palette[mode][key]) || PALETTE_DEFAULTS[mode][key] || '';
  const isOverridden = (key) => !!(palette[mode] && palette[mode][key]);

  return (
    <>
      <div className="field">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
          <div className="field-label">Apply to theme</div>
          <span style={{fontSize: 12, color: 'var(--mute)', fontStyle: 'italic'}}>
            editing <strong style={{color: 'var(--accent)'}}>{mode}</strong>
          </span>
        </div>
        <div className="segmented">
          <button className={mode === 'light' ? 'active' : ''} onClick={() => setMode('light')}>Light</button>
          <button className={mode === 'dark' ? 'active' : ''} onClick={() => setMode('dark')}>Dark</button>
        </div>
      </div>

      <div className="palette-grid">
        {PALETTE_KEYS.map(k => {
          const v = tokenVal(k);
          const overridden = isOverridden(k);
          // For colors without alpha, native color picker works. For rgba values, skip the picker.
          const isHex = /^#[0-9a-fA-F]{6}$/.test(v);
          return (
            <div key={k} className="palette-row">
              <div className="palette-key">
                <span style={{
                  display: 'inline-block', width: 20, height: 20, borderRadius: 3,
                  background: v, border: '1px solid var(--hairline)', verticalAlign: 'middle',
                  marginRight: 10,
                }} />
                <code style={{fontSize: 12, color: 'var(--ink)'}}>--{k}</code>
                {overridden && (
                  <span className="micro-mark" style={{marginLeft: 8, color: 'var(--accent)'}}>edited</span>
                )}
              </div>
              <div className="palette-controls">
                {isHex && (
                  <input
                    type="color"
                    value={v}
                    onChange={(e) => setColor(k, e.target.value)}
                    className="palette-color-picker"
                    aria-label={`Pick ${k} color`}
                  />
                )}
                <input
                  type="text"
                  className="input palette-hex-input"
                  value={v}
                  onChange={(e) => setColor(k, e.target.value)}
                  placeholder={PALETTE_DEFAULTS[mode][k]}
                />
                {overridden && (
                  <button
                    className="btn btn-quiet"
                    onClick={() => {
                      const m = { ...(palette[mode] || {}) };
                      delete m[k];
                      update({ ...palette, [mode]: m });
                    }}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview strip */}
      <div className="palette-preview">
        <div className="palette-preview-label">Live preview</div>
        <div className="palette-preview-card">
          <div className="palette-preview-title">Aa</div>
          <div className="palette-preview-body">
            <p style={{margin: 0}}><strong>Editorial sample.</strong> Paper bg, ink text. <em>Italic for soft.</em></p>
            <div style={{display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap'}}>
              <span className="tag tag-cobalt">der</span>
              <span className="tag tag-clay">die</span>
              <span className="tag tag-ochre">das</span>
              <span className="tag tag-accent">accent</span>
            </div>
            <button className="btn btn-accent" style={{marginTop: 12}}>Sample CTA →</button>
          </div>
        </div>
      </div>

      <div style={{display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap'}}>
        <button className="btn btn-quiet" onClick={() => setImporting(!importing)}>
          {importing ? 'Close import' : 'Import JSON…'}
        </button>
        <button className="btn btn-quiet" onClick={() => {
          navigator.clipboard?.writeText(exportJson());
        }}>
          Copy current as JSON
        </button>
        <span style={{flex: 1}} />
        <button className="btn btn-ghost" onClick={resetMode}>Reset {mode}</button>
        <button className="btn btn-ghost btn-danger" onClick={resetAll}>Reset all</button>
      </div>

      {importing && (
        <div style={{marginTop: 18}}>
          <div className="field-label" style={{marginBottom: 8}}>Paste palette JSON</div>
          <p style={{fontSize: 13, color: 'var(--ink-soft)', fontStyle: 'italic', margin: '0 0 10px 0'}}>
            Accepts either the full shape <code>{'{ "light": {…}, "dark": {…} }'}</code> or a flat object of
            token overrides for the currently-edited mode.
          </p>
          <textarea
            value={importText}
            onChange={(e) => { setImportText(e.target.value); setImportError(null); }}
            className="palette-json-input"
            rows={8}
            placeholder={'{\n  "paper": "#FAF7F0",\n  "ink": "#15130E",\n  "sage": "#5C7A52"\n}'}
          />
          {importError && (
            <div className="alert alert-danger" style={{marginTop: 10}}>
              <span className="alert-label">Parse error</span>
              {importError}
            </div>
          )}
          <button className="btn btn-accent" onClick={tryImport} style={{marginTop: 12}}>Apply import</button>
        </div>
      )}
    </>
  );
}

function SettingsApi() {
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
    <>
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
    </>
  );
}

function SettingsDisplay() {
  const [verbSize, setVerbSize] = React.useState(() => parseInt(localStorage.getItem('gt:testVerbSize') || '26', 10));
  const [nounSize, setNounSize] = React.useState(() => parseInt(localStorage.getItem('gt:nounPromptSize') || '92', 10));
  const [adjSize, setAdjSize] = React.useState(() => parseInt(localStorage.getItem('gt:adjectivePromptSize') || '36', 10));

  return (
    <>
      <TypeSizeField
        label="Verb test-sheet · type size"
        blurb="Controls verb size in the Translation worksheet. Smaller = more verbs visible without scrolling."
        min={18} max={44}
        value={verbSize} setValue={setVerbSize}
        storageKey="gt:testVerbSize" cssVar="--test-verb-size"
        presets={[
          {label: 'Compact', value: 20},
          {label: 'Default', value: 26},
          {label: 'Large', value: 36},
        ]}
      />

      <div className="settings-preview">
        <div className="settings-preview-label">Verb worksheet · preview</div>
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

      <hr className="settings-divider" />

      <TypeSizeField
        label="Noun quiz · prompt size"
        blurb="Controls the big German word shown in the single-card noun runner (e.g. Wasser, Mutter)."
        min={48} max={140}
        value={nounSize} setValue={setNounSize}
        storageKey="gt:nounPromptSize" cssVar="--noun-prompt-size"
        presets={[
          {label: 'Compact', value: 64},
          {label: 'Default', value: 92},
          {label: 'Large', value: 120},
        ]}
      />

      <div className="settings-preview">
        <div className="settings-preview-label">Noun runner · preview</div>
        <div className="prompt-card" style={{padding: '24px 0 16px', borderTop: 0, borderBottom: 0}}>
          <div className="prompt-german" style={{fontSize: 'var(--noun-prompt-size, 92px)'}}>Wasser</div>
          <div className="prompt-english">water</div>
        </div>
      </div>

      <hr className="settings-divider" />

      <TypeSizeField
        label="Adjective quiz · sentence size"
        blurb="Controls the blanked sentence shown in the single-card adjective runner."
        min={22} max={64}
        value={adjSize} setValue={setAdjSize}
        storageKey="gt:adjectivePromptSize" cssVar="--adjective-prompt-size"
        presets={[
          {label: 'Compact', value: 26},
          {label: 'Default', value: 36},
          {label: 'Large', value: 52},
        ]}
      />

      <div className="settings-preview">
        <div className="settings-preview-label">Adjective runner · preview</div>
        <div className="prompt-card" style={{padding: '24px 0 16px', borderTop: 0, borderBottom: 0, textAlign: 'center'}}>
          <div className="prompt-german" style={{
            fontSize: 'var(--adjective-prompt-size, 36px)',
            lineHeight: 1.3,
          }}>
            Ich sehe den ____ Park.
          </div>
          <div className="prompt-english" style={{marginTop: 12}}>the beautiful park (acc.)</div>
        </div>
      </div>
    </>
  );
}

/* ────── Settings · Daten — backup & data management ────── */

function SettingsData({ navigate }) {
  // Mocked values for the prototype — in production these come from IndexedDB
  const [counts] = React.useState({
    nouns: 1407,
    nounsCustom: 12,
    adjectives: 248,
    verbs: 378,
    history: 47,
  });
  const [storage] = React.useState({
    usedKb: 412,
    quotaKb: 51200, // ~50 MB indexeddb quota typical
    lastBackup: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
  });
  const pct = Math.min(100, Math.round((storage.usedKb / storage.quotaKb) * 100));

  const fmtDate = (d) => {
    if (!d) return '—';
    const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    return days + ' days ago';
  };

  const exportAll = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), counts, note: 'Prototype export — no real data wired up.' }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grammatik-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="alert alert-info">
        <span className="alert-label">Local-only</span>
        Everything lives in this browser's IndexedDB. Clear your site data and it's gone — back up regularly,
        especially before switching devices.
      </div>

      <div className="daten-storage">
        <div className="daten-storage-cell">
          <div className="daten-storage-num">
            {storage.usedKb}<span className="unit">KB</span>
          </div>
          <div className="daten-storage-label">Belegt · used</div>
          <div className="daten-storage-bar">
            <div className="daten-storage-bar-fill" style={{ width: pct + '%' }}></div>
          </div>
        </div>
        <div className="daten-storage-cell">
          <div className="daten-storage-num">
            {fmtDate(storage.lastBackup)}
          </div>
          <div className="daten-storage-label">Letztes Backup · last export</div>
        </div>
      </div>

      {/* ─── Section A · Counts ─── */}
      <div className="daten-section">
        <div className="daten-section-head">
          <span className="num">A.</span>
          <span className="title">Bestand</span>
          <span className="meta">What's stored</span>
        </div>

        <div className="daten-counts">
          <div className="daten-counts-cell">
            <div className="daten-counts-num">{counts.nouns}</div>
            <div className="daten-counts-de">Substantive</div>
            <div className="daten-counts-label">Nouns · {counts.nounsCustom} custom</div>
          </div>
          <div className="daten-counts-cell">
            <div className="daten-counts-num">{counts.adjectives}</div>
            <div className="daten-counts-de">Adjektive</div>
            <div className="daten-counts-label">Adjectives</div>
          </div>
          <div className="daten-counts-cell">
            <div className="daten-counts-num">{counts.verbs}</div>
            <div className="daten-counts-de">Verben</div>
            <div className="daten-counts-label">Verbs · bundled</div>
          </div>
          <div className="daten-counts-cell">
            <div className="daten-counts-num">{counts.history}</div>
            <div className="daten-counts-de">Verlauf</div>
            <div className="daten-counts-label">Quiz runs</div>
          </div>
        </div>
      </div>

      {/* ─── Section B · Backup ─── */}
      <div className="daten-section">
        <div className="daten-section-head">
          <span className="num">B.</span>
          <span className="title">Sichern</span>
          <span className="meta">Export &amp; restore</span>
        </div>

        <div className="daten-row">
          <div className="daten-row-text">
            <div className="dr-title">Export all to JSON</div>
            <p className="dr-sub">A single file containing nouns, adjectives, quiz history, palette overrides and settings — readable, diffable, future-proof.</p>
          </div>
          <div className="daten-row-actions">
            <button className="btn btn-accent" onClick={exportAll}>Export ↓</button>
          </div>
        </div>

        <div className="daten-row">
          <div className="daten-row-text">
            <div className="dr-title">Import from backup</div>
            <p className="dr-sub">Pick a previous <code>grammatik-backup-*.json</code>. Lets you merge or overwrite — you'll get a diff preview first.</p>
          </div>
          <div className="daten-row-actions">
            <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
              Choose file…
              <input type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) alert('Stubbed — would parse "' + e.target.files[0].name + '" and show a diff preview.'); }} />
            </label>
          </div>
        </div>

        <div className="daten-row">
          <div className="daten-row-text">
            <div className="dr-title">Copy snapshot to clipboard</div>
            <p className="dr-sub">Same payload as the full export, minus the file. Useful for sharing the deck with another device via a paste.</p>
          </div>
          <div className="daten-row-actions">
            <button className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(JSON.stringify({ counts }))}>Copy</button>
          </div>
        </div>
      </div>

      {/* ─── Section C · Reset ─── */}
      <div className="daten-section">
        <div className="daten-section-head">
          <span className="num">C.</span>
          <span className="title">Zurücksetzen</span>
          <span className="meta">Reset to defaults</span>
        </div>

        <div className="daten-row">
          <div className="daten-row-text">
            <div className="dr-title">Reset noun deck to seed</div>
            <p className="dr-sub">Deletes your {counts.nounsCustom} custom entries and restores the curated {counts.nouns - counts.nounsCustom}-noun seed list.</p>
          </div>
          <div className="daten-row-actions">
            <button className="btn btn-ghost btn-danger">Reset nouns</button>
          </div>
        </div>

        <div className="daten-row">
          <div className="daten-row-text">
            <div className="dr-title">Reset adjective deck to seed</div>
            <p className="dr-sub">Restores the ~250 curated adjectives. Custom entries are removed.</p>
          </div>
          <div className="daten-row-actions">
            <button className="btn btn-ghost btn-danger">Reset adjectives</button>
          </div>
        </div>

        <div className="daten-row">
          <div className="daten-row-text">
            <div className="dr-title">Clear quiz history</div>
            <p className="dr-sub">Wipes the {counts.history} stored quiz runs. The Verlauf page resets to empty.</p>
          </div>
          <div className="daten-row-actions">
            <button className="btn btn-ghost btn-danger">Clear history</button>
          </div>
        </div>

        <div className="daten-row">
          <div className="daten-row-text">
            <div className="dr-title">Delete everything · nuke the deck</div>
            <p className="dr-sub">Drops all IndexedDB tables (nouns, adjectives, history, settings) and clears localStorage. The app reloads as a fresh install.</p>
          </div>
          <div className="daten-row-actions">
            <button className="btn btn-ghost btn-danger" onClick={() => { if (confirm('Delete every byte of stored data and start over? This cannot be undone unless you exported a backup first.')) alert('Stubbed — would wipe IndexedDB and reload.'); }}>Delete all</button>
          </div>
        </div>
      </div>

      <div className="alert alert-warning" style={{ marginTop: 4 }}>
        <span className="alert-label">No undo</span>
        Reset and delete actions are permanent. Export a backup first if you've added custom nouns or adjectives.
      </div>
    </>
  );
}

const SETTINGS_TABS = [
  { id: 'api',     numeral: 'I',   titleDe: 'Schlüssel',  titleEn: 'API · Gemini',     blurb: 'Set your Gemini API key and pick a model. Required only for the Adjectives quiz.' },
  { id: 'display', numeral: 'II',  titleDe: 'Anzeige',    titleEn: 'Display · Sizes',  blurb: 'Type sizes for each quiz prompt. Each setting has its own live preview.' },
  { id: 'palette', numeral: 'III', titleDe: 'Farben',     titleEn: 'Palette · Colors', blurb: 'Override design tokens per theme. Edit Light and Dark independently. Import and export as JSON.' },
  { id: 'data',    numeral: 'IV',  titleDe: 'Daten',      titleEn: 'Data · Backup',    blurb: 'Export everything to a single JSON file, import a previous backup, or reset individual collections to the seed list.' },
];

function Settings({ navigate }) {
  const [tab, setTab] = React.useState('api');
  const active = SETTINGS_TABS.find(t => t.id === tab) || SETTINGS_TABS[0];

  return (
    <div className="page settings-page" data-screen-label="50 Settings">
      <div className="section-header" style={{marginBottom: 32}}>
        <div>
          <div className="breadcrumb">Konfiguration · Einstellungen</div>
          <h1 className="section-title">Settings<em>.</em></h1>
          <p className="section-subtitle">
            API access, display sizes, and a custom palette. All stored on this device only.
          </p>
        </div>
      </div>

      <div className="settings-layout">
        <aside className="settings-rail">
          <div className="rail-label">Inhalt</div>
          <ol>
            {SETTINGS_TABS.map(t => (
              <li key={t.id}>
                <button
                  className={tab === t.id ? 'active' : ''}
                  onClick={() => setTab(t.id)}
                >
                  <span className="num">{t.numeral}.</span>
                  <span>
                    {t.titleDe}
                    <div style={{fontStyle: 'italic', fontSize: 12, color: 'var(--mute)', marginTop: 1}}>{t.titleEn}</div>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <main className="settings-main">
          <div className="settings-tab-header">
            <span className="micro-mark">Kapitel {active.numeral}</span>
            <h2 className="settings-tab-title">{active.titleDe}<em>.</em></h2>
            <p className="settings-tab-blurb">{active.blurb}</p>
            <hr className="rule" />
          </div>

          {tab === 'api' && <SettingsApi />}
          {tab === 'display' && <SettingsDisplay />}
          {tab === 'palette' && <PaletteSection />}
          {tab === 'data' && <SettingsData navigate={navigate} />}
        </main>
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
