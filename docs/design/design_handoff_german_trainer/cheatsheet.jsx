// ─── Cheatsheet excerpt — first two chapters as a working sample ───

const CHAPTERS = [
  { id: 'ch-1',  numeral: 'I',    titleDe: 'Schwache Verben',         titleEn: 'Weak (regular) verbs' },
  { id: 'ch-2',  numeral: 'II',   titleDe: 'Starke Verben',           titleEn: 'Strong verbs' },
  { id: 'ch-3',  numeral: 'III',  titleDe: 'Mischverben',             titleEn: 'Mixed verbs' },
  { id: 'ch-4',  numeral: 'IV',   titleDe: 'Modalverben',             titleEn: 'Modal verbs' },
  { id: 'ch-5',  numeral: 'V',    titleDe: 'Trennbar & untrennbar',   titleEn: 'Separable vs inseparable' },
  { id: 'ch-6',  numeral: 'VI',   titleDe: 'Partizip II',             titleEn: 'Past participle' },
  { id: 'ch-7',  numeral: 'VII',  titleDe: 'Haben oder Sein',         titleEn: 'Auxiliary selection' },
  { id: 'ch-8',  numeral: 'VIII', titleDe: 'Imperativ',               titleEn: 'Commands' },
  { id: 'ch-9',  numeral: 'IX',   titleDe: 'Konjunktiv II',           titleEn: 'Subjunctive II' },
  { id: 'ch-10', numeral: 'X',    titleDe: 'Vorgangspassiv',          titleEn: 'Process passive' },
  { id: 'ch-11', numeral: 'XI',   titleDe: 'Reflexive Verben',        titleEn: 'Reflexive verbs' },
  { id: 'ch-12', numeral: 'XII',  titleDe: 'Verben mit Dativ',        titleEn: 'Dative verbs' }
];

function ConjTable({ caption, rows }) {
  return (
    <div className="conj-table">
      <span className="conj-caption">{caption}</span>
      <div className="conj-grid">
        {rows.map((r, i) => (
          <div key={i} className="conj-row">
            <div className="person">{r.person}</div>
            <div className="form" dangerouslySetInnerHTML={{ __html: r.form }}></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Callout({ kind, label, children }) {
  return (
    <div className={'callout ' + kind}>
      <div className="callout-label">{label}</div>
      {children}
    </div>
  );
}

function Cheatsheet({ navigate }) {
  const [search, setSearch] = React.useState('');
  const [active, setActive] = React.useState('ch-1');

  React.useEffect(() => {
    // simple scroll-spy
    const onScroll = () => {
      const offsets = CHAPTERS.map(c => {
        const el = document.getElementById(c.id);
        return el ? { id: c.id, top: el.getBoundingClientRect().top } : null;
      }).filter(Boolean);
      const above = offsets.filter(o => o.top < 140);
      if (above.length) setActive(above[above.length - 1].id);
      else if (offsets.length) setActive(offsets[0].id);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const onSelect = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const filtered = CHAPTERS.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.titleDe.toLowerCase().includes(q) || c.titleEn.toLowerCase().includes(q);
  });

  return (
    <div className="page grammatik" data-screen-label="40 Cheatsheet">
      <div className="section-header" style={{maxWidth: 1160, margin: '0 auto 32px'}}>
        <div>
          <div className="breadcrumb">Kapitel III · Verben · Cheatsheet</div>
          <h1 className="section-title">Grammatik<em>.</em></h1>
          <p className="section-subtitle">
            Twelve chapters of conjugation rules, exceptions, and example sentences — built to skim,
            but written to read.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('verbs')}>← Verben</button>
      </div>

      <div className="grammatik-layout">
        <aside className="cheat-rail">
          <div className="rail-label">Inhalt</div>
          <input
            className="input rail-search"
            placeholder="Suche…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ol>
            {CHAPTERS.map((c) => {
              const dimmed = !filtered.some(f => f.id === c.id);
              return (
                <li key={c.id}>
                  <button
                    className={active === c.id ? 'active' : ''}
                    style={{ opacity: dimmed ? 0.32 : 1 }}
                    onClick={() => onSelect(c.id)}
                  >
                    <span className="num">{c.numeral}.</span>
                    <span>
                      {c.titleDe}
                      <div style={{fontStyle: 'italic', fontSize: 12, color: 'var(--mute)', marginTop: 1}}>{c.titleEn}</div>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <main>
          {/* Chapter I */}
          <section id="ch-1" className="chapter">
            <div className="chapter-numeral">I</div>
            <h2 className="chapter-title">Schwache Verben</h2>
            <p className="chapter-subtitle">Regular (weak) verbs — predictable endings on an unchanging stem</p>
            <hr className="rule" />

            <p className="dropcap-p">
              Weak verbs form the bedrock of German verbal morphology. The stem stays the same throughout
              the present tense; only the ending changes. If you can conjugate <code>spielen</code>, you can
              conjugate hundreds of others — <code>kaufen</code>, <code>machen</code>, <code>lieben</code>,
              <code>kochen</code>, <code>wohnen</code>, <code>fragen</code>, the whole regular crew.
            </p>

            <div className="two-col">
              <ConjTable
                caption="PRÄSENS — spielen"
                rows={[
                  { person: 'ich', form: 'spiel<span class="ending">e</span>' },
                  { person: 'du',  form: 'spiel<span class="ending">st</span>' },
                  { person: 'er',  form: 'spiel<span class="ending">t</span>' },
                  { person: 'wir', form: 'spiel<span class="ending">en</span>' },
                  { person: 'ihr', form: 'spiel<span class="ending">t</span>' },
                  { person: 'sie', form: 'spiel<span class="ending">en</span>' }
                ]}
              />
              <ConjTable
                caption="PRÄSENS — arbeiten · Bindevokal"
                rows={[
                  { person: 'ich', form: 'arbeit<span class="ending">e</span>' },
                  { person: 'du',  form: 'arbeit<span class="ending">est</span>' },
                  { person: 'er',  form: 'arbeit<span class="ending">et</span>' },
                  { person: 'wir', form: 'arbeit<span class="ending">en</span>' },
                  { person: 'ihr', form: 'arbeit<span class="ending">et</span>' },
                  { person: 'sie', form: 'arbeit<span class="ending">en</span>' }
                ]}
              />
            </div>

            <Callout kind="note" label="Beachte">
              <p>
                <strong>Bindevokal -e-.</strong> When the stem ends in <code>-d</code>, <code>-t</code>,
                <code>-chn</code>, <code>-ffn</code>, or <code>-tm</code>, slip an extra <code>-e-</code> in
                before <code>-st</code> and <code>-t</code>: <code>arbeiten → du arbeitest</code>,{' '}
                <code>warten → er wartet</code>, <code>finden → du findest</code>, <code>öffnen → ihr öffnet</code>.
              </p>
            </Callout>

            <Callout kind="exception" label="Ausnahme">
              <p>
                <strong>Stems in -s / -ß / -z / -tz.</strong> The du-form already ends in a sibilant,
                so it takes only <code>-t</code>, not <code>-st</code>: <code>tanzen → du tanzt</code>,{' '}
                <code>heißen → du heißt</code>, <code>sitzen → du sitzt</code>.
              </p>
            </Callout>

            <Callout kind="example" label="Beispiele">
              <p>
                "Ich arbeite jeden Tag in der Bibliothek."<br />
                "Du tanzt sehr gut."<br />
                "Wir wohnen in Berlin."
              </p>
            </Callout>
          </section>

          {/* Chapter II */}
          <section id="ch-2" className="chapter">
            <div className="chapter-numeral">II</div>
            <h2 className="chapter-title">Starke Verben</h2>
            <p className="chapter-subtitle">Strong verbs — vowel changes in du and er/sie/es</p>
            <hr className="rule" />

            <p className="dropcap-p">
              Strong verbs shift their stem vowel in the 2nd- and 3rd-person singular. The pattern is
              predictable once you've learned which letter swaps for which — and crucially, the change
              shows up <em>only</em> in du and er/sie/es. Everywhere else, the stem is normal.
            </p>

            <h3 className="pattern-heading">a → ä</h3>
            <p>
              <code>fahren → du f<span className="vh">ä</span>hrst, er f<span className="vh">ä</span>hrt</code>{' '}
              · <code>schlafen → schl<span className="vh">ä</span>ft</code>{' '}
              · <code>tragen → tr<span className="vh">ä</span>gt</code>{' '}
              · <code>waschen → w<span className="vh">ä</span>scht</code>{' '}
              · <code>halten → h<span className="vh">ä</span>lt</code>{' '}
              · <code>lassen → l<span className="vh">ä</span>sst</code>.
            </p>

            <h3 className="pattern-heading">au → äu</h3>
            <p>
              <code>laufen → er l<span className="vh">äu</span>ft</code>{' '}
              · <code>saufen → er s<span className="vh">äu</span>ft</code>.
            </p>

            <h3 className="pattern-heading">e → i</h3>
            <p>
              <code>geben → er g<span className="vh">i</span>bt</code>{' '}
              · <code>nehmen → er n<span className="vh">i</span>mmt</code>{' '}
              · <code>helfen → er h<span className="vh">i</span>lft</code>{' '}
              · <code>sprechen → er spr<span className="vh">i</span>cht</code>{' '}
              · <code>essen → er <span className="vh">i</span>sst</code>.
            </p>

            <h3 className="pattern-heading">e → ie</h3>
            <p>
              <code>sehen → er s<span className="vh">ie</span>ht</code>{' '}
              · <code>lesen → er l<span className="vh">ie</span>st</code>{' '}
              · <code>empfehlen → er empf<span className="vh">ie</span>hlt</code>.
            </p>

            <Callout kind="exception" label="Ausnahme">
              <p>
                <strong>Looks strong but isn't.</strong> Some common verbs you'd expect to shift, don't —
                <code> kommen → er kommt</code>, <code>gehen → er geht</code>, <code>schwimmen → er schwimmt</code>.
                Memorise these so you don't over-apply the rules.
              </p>
            </Callout>

            <Callout kind="example" label="Beispiele">
              <p>
                "Er fährt nach Hamburg."<br />
                "Sie liest gerade ein Buch."<br />
                "Du gibst mir das Salz, bitte."
              </p>
            </Callout>

            <p style={{marginTop: 56, color: 'var(--mute)', textAlign: 'center', fontStyle: 'italic', fontFamily: 'var(--font-display)'}}>
              · · ·
            </p>
            <p style={{textAlign: 'center', color: 'var(--mute)', fontSize: 14}}>
              Chapters III–XII follow the same pattern — they're omitted from this prototype.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { Cheatsheet });
