// ─── Sentence module — shared logic + small components (both variants) ───

function snNorm(s) {
  return String(s || '').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ');
}

function snItemTotal(cfg) { return SN_CATS.reduce((s, c) => s + cfg[c], 0); }

/* Score canned cards against the config and draw a deck. */
function snBuildDeck(cfg, count, demo) {
  const scored = SN_CARDS.map(c => ({
    c, s: SN_CATS.reduce((s, cat) => s + Math.abs((cfg[cat] || 0) - c.counts[cat]), 0), r: Math.random(),
  })).sort((a, b) => a.s - b.s || a.r - b.r);
  let deck = scored.filter(x => x.s <= 4).map(x => x.c).slice(0, count);
  if (demo && demo.shortfall && deck.length > 2) deck = deck.slice(0, Math.max(2, Math.ceil(deck.length * 0.66)));
  return deck;
}

/* Typed / spoken EN→DE grading: substring presence of accepted forms. */
function snGrade(card, answer, dir) {
  if (dir === 'de-en') {
    const words = card.en.map(t => typeof t === 'string' ? t : t.t).join('').toLowerCase().match(/[a-z']+/g) || [];
    const content = words.filter(w => w.length > 3);
    const a = ' ' + String(answer).toLowerCase() + ' ';
    const hit = content.filter(w => a.includes(w.slice(0, Math.max(4, w.length - 2)))).length;
    const ratio = content.length ? hit / content.length : 0;
    const verdict = ratio >= 0.6 ? 'ok' : ratio >= 0.3 ? 'part' : 'no';
    return { verdict, items: null, okCount: null, ratio };
  }
  const a = snNorm(answer);
  const items = card.items.map(it => ({ k: it.k, ok: it.acc.some(x => a.includes(snNorm(x))) }));
  const okCount = items.filter(i => i.ok).length;
  const verdict = okCount === items.length ? 'ok' : okCount >= Math.ceil(items.length / 2) ? 'part' : 'no';
  return { verdict, items, okCount };
}

const SN_VERDICT = { ok: 'Richtig', part: 'Teils richtig', no: 'Daneben' };

/* Simulated speech transcript — the reference with an occasional slip. */
function snTranscript(card) {
  if (Math.random() < 0.55) return card.de;
  return card.de.replace(/\bdem\b/, 'den').replace(/daran|darauf|davon/, 'da');
}

function snManifestParts(card, nameConn) {
  const p = [];
  const n = card.counts;
  if (n.verb) p.push(n.verb + (n.verb === 1 ? ' Verb' : ' Verben'));
  if (n.noun) p.push(n.noun + ' Nomen');
  if (n.prep) p.push(n.prep + (n.prep === 1 ? ' Präposition' : ' Präpositionen'));
  if (n.dac) p.push(n.dac + (n.dac === 1 ? ' da-Kompositum' : ' da-Komposita'));
  if (n.conn) p.push(nameConn && card.conn ? card.conn : (n.conn === 1 ? '1 Konnektor' : n.conn + ' Konnektoren'));
  return p;
}

/* ── Run state machine, shared by both runners ── */
function useSnRun({ deck, offline, practice }) {
  const [idx, setIdx] = React.useState(0);
  const [phase, setPhase] = React.useState('prep'); // prep | answer | grading | graded | stream | done
  const [history, setHistory] = React.useState([]);
  const [last, setLast] = React.useState(null);
  React.useEffect(() => {
    if (phase === 'prep') { const t = setTimeout(() => setPhase('answer'), 1100); return () => clearTimeout(t); }
    if (phase === 'stream') { const t = setTimeout(() => setPhase('answer'), 900); return () => clearTimeout(t); }
  }, [phase]);
  const card = deck[idx];
  const submit = (answer, dir) => {
    const res = snGrade(card, answer, dir);
    const entry = { card, answer, res, offline: !!offline };
    setLast(entry);
    if (offline) { setPhase('graded'); }
    else { setPhase('grading'); setTimeout(() => setPhase('graded'), 850); }
    return entry;
  };
  const next = () => {
    const h = [...history, last];
    setHistory(h);
    setLast(null);
    if (idx + 1 < deck.length) { setIdx(idx + 1); setPhase('stream'); }
    else setPhase('done');
    return h;
  };
  return { idx, phase, card, history, last, submit, next, total: deck.length, practice: !!practice };
}

/* ── Pips progress (ok / part / no) ── */
function SnPips({ history, total, idx }) {
  return (
    <div className="quiz-progress-bar sn-pips">
      {Array.from({ length: total }).map((_, i) => {
        const h = history[i];
        const cls = h ? (h.res.verdict === 'ok' ? ' done' : h.res.verdict === 'part' ? ' part' : ' wrong') : (i === idx ? ' current' : '');
        return <span key={i} className={'pip' + cls}></span>;
      })}
    </div>
  );
}

/* ── TTS replay ── */
function SnTTS({ text, label }) {
  const speak = () => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE'; u.rate = 0.92;
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
    } catch (e) {}
  };
  return <button type="button" className="sn-tts" onClick={speak} title="Anhören">▶ {label || 'Anhören'}</button>;
}

/* ── Source text with hint spans; two-part connectors share a key and light together ── */
function SnSource({ card, hints, dir, size }) {
  const [lit, setLit] = React.useState(null);
  if (dir === 'de-en') return <div className={'sn-src ' + (size || '')}>{card.de}</div>;
  const items = {}; card.items.forEach(it => { items[it.k] = it; });
  const seen = {};
  return (
    <div className={'sn-src ' + (size || '')} onMouseLeave={() => setLit(null)}>
      {card.en.map((t, i) => {
        if (typeof t === 'string') return <span key={i}>{t}</span>;
        const it = items[t.k];
        seen[t.k] = (seen[t.k] || 0) + 1;
        if (!hints) return <span key={i}>{t.t}</span>;
        return (
          <span key={i}
            className={'sn-i' + (it.pair ? ' pair' : '') + (lit === t.k ? ' lit' : '')}
            data-cat={it.cat}
            onMouseEnter={() => setLit(t.k)}>
            {t.t}{it.pair && <sup className="sn-pairmark">{seen[t.k] === 1 ? '¹' : '¹'}</sup>}
          </span>
        );
      })}
    </div>
  );
}

function SnTagChips({ tags }) {
  return <span className="sn-tags">{tags.map(t => <span key={t} className="sn-tag">{t}</span>)}</span>;
}
function SnRekt({ text }) { return <span className="sn-rekt">{text}</span>; }
function SnOffline() {
  return <span className="sn-off" title="KI-Bewertung fehlgeschlagen — lokale Prüfung">offline bewertet</span>;
}

/* ── Retry modal ── */
function SnRetryModal({ wrong, onRetry, onResult }) {
  return (
    <div className="sn-modal-back">
      <div className="sn-modal" role="dialog" aria-modal="true">
        <div className="micro-mark" style={{ marginBottom: 12 }}>Runde beendet</div>
        <h3 className="sn-modal-t">{wrong} {wrong === 1 ? 'Karte ging' : 'Karten gingen'} daneben<em>.</em></h3>
        <p className="sn-modal-p">Eine Übungsrunde wiederholt nur diese Karten — sie wird nicht gewertet.</p>
        <div className="sn-modal-a">
          <button className="btn btn-ghost" onClick={onResult}>Zur Auswertung</button>
          <button className="btn btn-accent" onClick={onRetry}>Fehler üben · {wrong} {wrong === 1 ? 'Karte' : 'Karten'} →</button>
        </div>
      </div>
    </div>
  );
}

/* ── Result aggregation ── */
function snAggregate(history) {
  const cat = {}; SN_CATS.forEach(c => { cat[c] = { ok: 0, n: 0 }; });
  const tags = {};
  history.forEach(h => {
    if (!h.res.items) return;
    const map = {}; h.card.items.forEach(it => { map[it.k] = it; });
    h.res.items.forEach(r => {
      const it = map[r.k];
      cat[it.cat].n++; if (r.ok) cat[it.cat].ok++;
      if (!r.ok) it.tags.forEach(t => { tags[t] = (tags[t] || 0) + 1; });
    });
  });
  return { cat, tags };
}

Object.assign(window, {
  snNorm, snItemTotal, snBuildDeck, snGrade, snTranscript, snManifestParts,
  useSnRun, SnPips, SnTTS, SnSource, SnTagChips, SnRekt, SnOffline, SnRetryModal,
  snAggregate, SN_VERDICT,
});
