# Mobile UI Fixes — German Trainer

This document captures every mobile-UI change made during the design session, what it looks like in the captured screenshots in `mobile-shots/`, and what to verify after Claude Code applies the changes.

All visual changes are CSS-only except where noted. The JSX files were touched only for:
- New result-screen markup (verbs + nouns)
- New 2-line CTA button structure (3 buttons)
- A new `QuizProgress` helper component (replaces the inline pip loop)
- A new 4th Settings tab "IV. Daten · Backup"

---

## Files in this handoff

| File | What changed |
|---|---|
| `styles.css` | All mobile media queries, plus new component classes |
| `nav.jsx` | Added `QuizProgress` helper (renders pips at ≤25, continuous meter above) |
| `nouns.jsx` | Updated `ResultScreen` to the new strong-stamp design; replaced pip loop with `<QuizProgress>`; converted Start CTA to `btn-meta` two-liner |
| `verbs.jsx` | Updated `VerbResultScreen` to the strong-stamp design; converted Start/Submit CTAs to `btn-meta` |
| `adjectives.jsx` | Replaced pip loop with `<QuizProgress>`; converted "Generate & start" CTA |
| `other-pages.jsx` | Added `SettingsData` component + new `'data'` tab in `SETTINGS_TABS` |
| `mobile-shots/` | 12 reference screenshots of the target mobile state |

---

## Mobile fixes — issue list

### 1. Header actions snap to the right on mobile
- **Bug:** With the desktop nav links hidden, the theme toggle + burger menu drifted to the centre.
- **Fix:** `.nav-actions { margin-left: auto }` inside the `@media (max-width: 720px)` block.
- **See:** `cap-01-home.png` — the sun + burger icons sit flush against the right padding.

### 2. Settings page no longer overflows horizontally
- **Bug:** The settings page (and any page using the same grid) extended past the right edge of the viewport on mobile.
- **Fixes:**
  - `.page { max-width: 100%; min-width: 0 }`
  - `.settings-main { min-width: 0 }`
  - `.settings-layout { grid-template-columns: minmax(0, 1fr) }` at mobile (was `1fr`, which lets grid children blow out the parent).
  - `overflow-wrap: anywhere` on long German words.
- **See:** all `cap-10-*` and `cap-11-*` screenshots — nothing clipped.

### 3. Settings tabs are now a 2×2 card grid on mobile (no scrollbar)
- **Bug:** Earlier iteration used a horizontal-scrolling pill strip. Scrollbar visible, partial tabs visible, ugly.
- **Fix:** Replaced with a 2×2 grid of mini-cards inside a bordered container. Each cell shows the Roman numeral, German title, and small italic English subtitle. Active cell has accent-wash background + accent left rule. Lives entirely inside `@media (max-width: 900px)` on `.settings-rail`.
- **See:** `cap-10-settings-daten-tab.png` — clean 2×2 grid, IV. Daten active.

### 4. Module cards compacted on Nouns / Adjectives / Verbs landings
- **Bug:** Module cards on landings were too tall on mobile — they took almost a full screen each.
- **Fix:** In `@media (max-width: 720px)`: `min-height: 0`, padding `20px 20px 18px`, numeral 38px (was 64px), title 22px, subtitle 14px, CTA 11px.
- **See:** `cap-02-nouns-landing.png` — two cards visible without scroll, content readable.

### 5. Setup page compacted so the Start button is reachable
- **Bug:** The section-header / description ate a whole screen, the Start CTA was way below the fold.
- **Fixes:**
  - Smaller mobile section-header (32px title, 15.5px subtitle, 22px margin-bottom).
  - Tighter `.field` margins.
  - Mode segmented control is now `flex: 1 1 auto; flex-wrap: wrap` so the two options share a row at 412px.
  - Chip rows are 6px-gap.
- **See:** `cap-03-noun-setup-top.png` for groups + chips; `cap-04-noun-setup-bottom-cta.png` for the bottom of the page with the CTA visible.

### 6. Quiz runner fits on mobile (no clipped buttons or oversized prompts)
- **Fixes (all in `@media (max-width: 720px)`):**
  - The group tag inside `.prompt-card` is `position: static` (was absolute + clipping on the left edge).
  - `.prompt-german` now `font-size: clamp(40px, 13vw, 58px)` so the longest words still fit.
  - `.gender-row` gap 8px, `.gender-btn` font-size 26px, sub 8.5px — three buttons side-by-side fit comfortably.
  - `.marginalia` collapses to static below the question column.
  - `.translation-input-wrap` stacks input + submit vertically.
- **See:** `cap-05-noun-quiz-runner.png` — der/die/das fit, prompt clean, ENTER hint + Next button on the bottom.

### 7. Two-line CTA buttons for long action labels
- **Bug:** `Start quiz · 30 questions →`, `Submit all · 20 verbs →`, and `Generate sentences and start →` either wrapped ugly or pushed off-screen.
- **Fix:** New `.btn-meta` class plus child spans `<span class="bm-main">` (primary action) and `<span class="bm-sub">` (mono-caps subtitle). 2-line stacked button, always centred.
- **Applied to:** Start quiz (nouns + verbs), Generate & start (adjectives), Submit all (verb worksheet).
- **See:** `cap-04-noun-setup-bottom-cta.png` — bottom-right green button reads "Start quiz →" / "10 QUESTIONS".

### 8. Progress meter (continuous bar) when total > 25 questions
- **Bug:** With many pips, each pip shrank to invisible.
- **Fix:** New `<QuizProgress>` component in `nav.jsx`. At `total <= 25` it renders pips as before. At `total > 25` it switches to a continuous `.quiz-meter` with three regions (correct/green + wrong/red + remaining/hairline) and a vertical cursor at the current index, plus a legend showing answered/total + counts + remaining.
- **Applied to:** Noun gender quiz, Noun translation quiz, Adjective sentence quiz. (Verb translation uses the worksheet pattern, not pips.)
- **See:** `cap-12-progress-meter.png` — 18/40 progress, green/red split, cursor, "✓ 12 ✗ 6 · 22 REMAINING".

### 9. Noun result page redesigned with red/green row stamps
- **Bug:** Old design used the same `.result-list` rows as text-only — easy to skim past wrong answers.
- **Fix:** Now uses the same `.verb-result-card` family — green wash for correct rows, red wash for wrong rows, ✓/✗ medallion on the right, your-answer/expected stamps stacked on wrong rows.
- **Summary strip** at the top: 3 cells — Richtig (green), Falsch (red), Quote (%).
- **See:** `cap-06-noun-result-top.png` (header + summary), `cap-07-noun-result-rows.png` (close-up of red row with strikethrough "die" + green "der" expected).

### 10. Verb result rows same strong-stamp design
- **See:** `cap-08-verb-result-top.png`, `cap-09-verb-result-rows.png`. Identical pattern: red row "aufstehen" with struck-through "to wake" + green "to get up / to stand up" expected; green row "haben" with ✓ medallion.

### 11. New Settings tab "IV. Daten · Backup"
- **What:** New 4th tab inside `SETTINGS_TABS` in `other-pages.jsx`. Component `SettingsData` renders a backup-management surface:
  - Privacy alert ("Local-only — back up regularly").
  - Storage cells: bytes used (with progress bar) + last backup ago.
  - Section A · Bestand: 4-cell counts strip (Substantive / Adjektive / Verben / Verlauf).
  - Section B · Sichern: three labelled rows — Export all to JSON, Import from backup, Copy snapshot to clipboard.
  - Section C · Zurücksetzen: four danger-buttons — Reset nouns, Reset adjectives, Clear history, Delete all.
  - A final no-undo warning alert.
- **See:** `cap-10-settings-daten-tab.png` (tab grid + Daten title), `cap-11-settings-daten-content.png` (storage + start of Bestand section).

---

## Screenshot index

| File | Shows |
|---|---|
| `cap-01-home.png` | Home page on mobile — header actions on the right, mobile module cards |
| `cap-02-nouns-landing.png` | Nouns landing — compact 2-card layout |
| `cap-03-noun-setup-top.png` | Noun quiz setup top — title, subtitle, group chips |
| `cap-04-noun-setup-bottom-cta.png` | Noun quiz setup bottom — mode picker + question count + two-line CTA |
| `cap-05-noun-quiz-runner.png` | Noun gender quiz runner — der/die/das buttons fit |
| `cap-06-noun-result-top.png` | Noun result page — score, action buttons, summary strip, first row |
| `cap-07-noun-result-rows.png` | Close-up — red row with strikethrough + green expected, green row with ✓ |
| `cap-08-verb-result-top.png` | Verb result top — score, action buttons, summary strip |
| `cap-09-verb-result-rows.png` | Close-up — wrong/right stamps |
| `cap-10-settings-daten-tab.png` | Settings — 2×2 tab grid, IV. Daten active |
| `cap-11-settings-daten-content.png` | Daten content — storage cells, last backup, A. Bestand section header |
| `cap-12-progress-meter.png` | Progress meter at 18/40 — green + red regions, cursor, counts |

All shots are 412px-viewport mobile, dark theme.

---

## Verification checklist for Claude Code

After integrating, test at ≤420px viewport:
- [ ] Header: theme toggle + hamburger flush right
- [ ] Nouns landing: cards compact, no oversized whitespace
- [ ] Settings: 4-tab 2×2 grid; tap each tab and content updates without page-level horizontal scroll
- [ ] IV. Daten tab is present and renders the storage cells + Bestand counts + 3 sections of actions
- [ ] Noun quiz setup: scrolling down reaches a two-line green CTA "Start quiz" / "N QUESTIONS"
- [ ] Noun gender runner: der/die/das fit side-by-side; group tag is inline (not absolute-clipped); long words wrap rather than overflow
- [ ] Noun result page: red rows for wrong + green rows for correct + ✓/✗ medallions; summary strip at top
- [ ] Verb result page: same stamp design
- [ ] Long-running quiz (>25 questions): no individual pips — instead a single bar with coloured fills + cursor + counts legend
