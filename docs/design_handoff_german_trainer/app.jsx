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
    const stored = localStorage.getItem('gt:testVerbSize');
    if (stored) document.documentElement.style.setProperty('--test-verb-size', stored + 'px');
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
  else if (route === 'nouns/quiz/result') body = <NounQuizResult navigate={navigate} />;
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
