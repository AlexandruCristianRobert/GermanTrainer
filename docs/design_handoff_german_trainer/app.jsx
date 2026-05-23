// ─── Main app: state, routing, tweaks panel, theme ───

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "sage"
}/*EDITMODE-END*/;

const ACCENT_PALETTE = {
  sage:   { light: '#5C7A52', dark: '#8FAE82', tint: 'rgba(92, 122, 82, 0.18)',  darkTint: 'rgba(143, 174, 130, 0.22)', wash: 'rgba(92,122,82,0.06)',  darkWash: 'rgba(143,174,130,0.08)' },
  clay:   { light: '#A03B2B', dark: '#D4604E', tint: 'rgba(160, 59, 43, 0.18)',  darkTint: 'rgba(212, 96, 78, 0.22)',  wash: 'rgba(160,59,43,0.06)',  darkWash: 'rgba(212,96,78,0.08)' },
  ochre:  { light: '#B8852F', dark: '#E2B158', tint: 'rgba(184, 133, 47, 0.20)', darkTint: 'rgba(226, 177, 88, 0.22)', wash: 'rgba(184,133,47,0.06)', darkWash: 'rgba(226,177,88,0.08)' },
  cobalt: { light: '#2C5282', dark: '#6090C2', tint: 'rgba(44, 82, 130, 0.18)',  darkTint: 'rgba(96, 144, 194, 0.22)', wash: 'rgba(44,82,130,0.06)',  darkWash: 'rgba(96,144,194,0.08)' },
};

// ─── Palette overrides ───
// Custom theme palette applied as a <style id="palette-overrides"> block
// that contains :root[data-theme="..."] { --paper: ...; etc } rules.

const PALETTE_KEYS = [
  'paper', 'paper-deep', 'paper-card',
  'ink', 'ink-soft', 'mute', 'rule', 'hairline',
  'sage', 'clay', 'ochre', 'cobalt',
];

const PALETTE_DEFAULTS = {
  light: {
    'paper':       '#FAF7F0',
    'paper-deep':  '#F1ECDE',
    'paper-card':  '#FCFAF3',
    'ink':         '#15130E',
    'ink-soft':    '#3A372F',
    'mute':        '#948C7C',
    'rule':        '#1E1B14',
    'hairline':    'rgba(30, 27, 20, 0.14)',
    'sage':        '#5C7A52',
    'clay':        '#A03B2B',
    'ochre':       '#B8852F',
    'cobalt':      '#2C5282',
  },
  dark: {
    'paper':       '#15130E',
    'paper-deep':  '#1E1B14',
    'paper-card':  '#1B1812',
    'ink':         '#EDE7D6',
    'ink-soft':    '#B8B0A0',
    'mute':        '#6A6557',
    'rule':        '#3A372F',
    'hairline':    'rgba(237, 231, 214, 0.14)',
    'sage':        '#8FAE82',
    'clay':        '#D4604E',
    'ochre':       '#E2B158',
    'cobalt':      '#6090C2',
  },
};

function loadPalette() {
  try {
    const raw = localStorage.getItem('gt:palette');
    if (!raw) return { light: {}, dark: {} };
    const parsed = JSON.parse(raw);
    return { light: parsed.light || {}, dark: parsed.dark || {} };
  } catch (e) {
    return { light: {}, dark: {} };
  }
}

function savePalette(palette) {
  try { localStorage.setItem('gt:palette', JSON.stringify(palette)); } catch (e) {}
}

function paletteToCss(palette) {
  // Generate one rule per non-empty mode
  let css = '';
  for (const mode of ['light', 'dark']) {
    const overrides = palette[mode] || {};
    const decls = Object.entries(overrides)
      .filter(([k, v]) => v && PALETTE_KEYS.includes(k))
      .map(([k, v]) => `  --${k}: ${v};`)
      .join('\n');
    if (decls) {
      css += `[data-theme="${mode}"] {\n${decls}\n}\n`;
    }
  }
  return css;
}

function applyPalette(palette) {
  let el = document.getElementById('palette-overrides');
  if (!el) {
    el = document.createElement('style');
    el.id = 'palette-overrides';
    document.head.appendChild(el);
  }
  el.textContent = paletteToCss(palette);
}

// Boot — apply on initial load before React mounts
applyPalette(loadPalette());

// Expose for Settings to use
Object.assign(window, { loadPalette, savePalette, applyPalette, PALETTE_KEYS, PALETTE_DEFAULTS });

function App() {
  // Route is "home", "nouns", "nouns/manage", "nouns/quiz", "nouns/quiz/run", "verbs/cheatsheet", "settings", etc.
  const [route, setRoute] = React.useState('home');
  const [theme, setTheme] = React.useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [tweaks, setTweaksState] = React.useState(TWEAK_DEFAULTS);
  const [quizConfig, setQuizConfig] = React.useState(null);

  // Apply accent to root
  React.useEffect(() => {
    const accent = ACCENT_PALETTE[tweaks.accent] || ACCENT_PALETTE.sage;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.style.setProperty('--accent', accent.dark);
      root.style.setProperty('--accent-tint', accent.darkTint);
      root.style.setProperty('--accent-wash', accent.darkWash);
    } else {
      root.style.setProperty('--accent', accent.light);
      root.style.setProperty('--accent-tint', accent.tint);
      root.style.setProperty('--accent-wash', accent.wash);
    }
  }, [tweaks.accent, theme]);

  // Apply theme
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Apply persisted display settings on mount
  React.useEffect(() => {
    const verbSize = localStorage.getItem('gt:testVerbSize');
    if (verbSize) document.documentElement.style.setProperty('--test-verb-size', verbSize + 'px');
    const nounSize = localStorage.getItem('gt:nounPromptSize');
    if (nounSize) document.documentElement.style.setProperty('--noun-prompt-size', nounSize + 'px');
    const adjSize = localStorage.getItem('gt:adjectivePromptSize');
    if (adjSize) document.documentElement.style.setProperty('--adjective-prompt-size', adjSize + 'px');
  }, []);

  const setTweak = (key, value) => {
    let next;
    if (typeof key === 'object') next = { ...tweaks, ...key };
    else next = { ...tweaks, [key]: value };
    setTweaksState(next);
    try {
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: next }, '*');
    } catch (e) {}
  };

  // Scroll to top on route change
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [route]);

  const navigate = (r) => setRoute(r);
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  // Route dispatch
  let body;
  if (route === 'home') body = <HomePage navigate={navigate} />;
  else if (route === 'nouns') body = <NounsLanding navigate={navigate} />;
  else if (route === 'nouns/manage') body = <ManageNouns navigate={navigate} />;
  else if (route === 'nouns/quiz') body = <NounQuizSetup navigate={navigate} startQuiz={setQuizConfig} />;
  else if (route === 'nouns/quiz/run') body = <NounQuizRunner navigate={navigate} config={quizConfig} />;
  else if (route === 'adjectives') body = <AdjectivesLanding navigate={navigate} />;
  else if (route === 'adjectives/quiz') body = <AdjectiveQuizSetup navigate={navigate} startQuiz={setQuizConfig} />;
  else if (route === 'adjectives/quiz/run') body = <AdjectiveQuizRunner navigate={navigate} config={quizConfig} />;
  else if (route === 'adjectives/quiz/result') body = <AdjectiveQuizResult navigate={navigate} />;
  else if (route === 'verbs') body = <VerbsLanding navigate={navigate} />;
  else if (route === 'verbs/translation') body = <VerbTranslationSetup navigate={navigate} startQuiz={setQuizConfig} />;
  else if (route === 'verbs/translation/run') body = <VerbTranslationRunner navigate={navigate} config={quizConfig} />;
  else if (route === 'verbs/translation/result') body = <VerbTranslationResult navigate={navigate} />;
  else if (route === 'verbs/cheatsheet') body = <Cheatsheet navigate={navigate} />;
  else if (route === 'settings') body = <Settings navigate={navigate} />;
  else if (route === 'history') body = <HistoryPage navigate={navigate} />;
  else body = <HomePage navigate={navigate} />;

  return (
    <React.Fragment>
      <div className="paper-grain"></div>
      <div className="app-shell">
        <NavShell route={route} navigate={navigate} theme={theme} toggleTheme={toggleTheme} />
        {body}
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Accent">
          <TweakColor
            label="Accent"
            value={(ACCENT_PALETTE[tweaks.accent] || ACCENT_PALETTE.sage)[theme === 'dark' ? 'dark' : 'light']}
            options={Object.keys(ACCENT_PALETTE).map(k => ACCENT_PALETTE[k][theme === 'dark' ? 'dark' : 'light'])}
            onChange={(hex) => {
              // Map hex back to its accent key
              const lower = String(hex).toLowerCase();
              const match = Object.keys(ACCENT_PALETTE).find(k => {
                const p = ACCENT_PALETTE[k];
                return p.light.toLowerCase() === lower || p.dark.toLowerCase() === lower;
              });
              if (match) setTweak('accent', match);
            }}
          />
          <p style={{fontSize: 12, color: 'var(--mute)', fontStyle: 'italic', marginTop: 12, marginBottom: 0, lineHeight: 1.5}}>
            Currently <strong style={{color: 'var(--accent)', textTransform: 'capitalize'}}>{tweaks.accent}</strong>.
            Echoes through chapter numerals, drop caps, vowel-shift highlights, quiz progress, and CTAs.
          </p>
        </TweakSection>
      </TweaksPanel>
    </React.Fragment>
  );
}

// Mount
ReactDOM.createRoot(document.getElementById('app')).render(<App />);
