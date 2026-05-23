<script setup lang="ts">
import { nextTick, ref } from 'vue'
import './cheatsheet/cheatsheet.css'
import ChapterNav, { type Chapter } from './cheatsheet/ChapterNav.vue'
import ConjugationTable from './cheatsheet/ConjugationTable.vue'
import Callout from './cheatsheet/Callout.vue'
import VowelShift from './cheatsheet/VowelShift.vue'

const chapters: Chapter[] = [
  { id: 'ch-1',  numeral: 'I',    titleDe: 'Schwache Verben',         titleEn: 'Weak (regular) verbs' },
  { id: 'ch-2',  numeral: 'II',   titleDe: 'Starke Verben',           titleEn: 'Strong verbs' },
  { id: 'ch-3',  numeral: 'III',  titleDe: 'Mischverben',             titleEn: 'Mixed verbs' },
  { id: 'ch-4',  numeral: 'IV',   titleDe: 'Modalverben',             titleEn: 'Modal verbs' },
  { id: 'ch-5',  numeral: 'V',    titleDe: 'Trennbar & untrennbar',   titleEn: 'Separable vs inseparable prefixes' },
  { id: 'ch-6',  numeral: 'VI',   titleDe: 'Partizip II',             titleEn: 'Past participle formation' },
  { id: 'ch-7',  numeral: 'VII',  titleDe: 'Haben oder Sein',         titleEn: 'Auxiliary in compound tenses' },
  { id: 'ch-8',  numeral: 'VIII', titleDe: 'Imperativ',               titleEn: 'Commands' },
  { id: 'ch-9',  numeral: 'IX',   titleDe: 'Konjunktiv II',           titleEn: 'Subjunctive II' },
  { id: 'ch-10', numeral: 'X',    titleDe: 'Vorgangspassiv',          titleEn: 'Process passive' },
  { id: 'ch-11', numeral: 'XI',   titleDe: 'Reflexive Verben',        titleEn: 'Reflexive verbs' },
  { id: 'ch-12', numeral: 'XII',  titleDe: 'Verben mit Dativ',        titleEn: 'Dative verbs' }
]

const searchQuery = ref('')

function onSelect(id: string) {
  if (typeof document === 'undefined') return
  const el = document.getElementById(id)
  if (!el) return
  nextTick(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
</script>

<template>
  <div class="grammatik">
    <header class="grammatik-header" data-print-hide>
      <span class="grammatik-mark">GRAMMATIK · KONJUGATION</span>
    </header>

    <div class="grammatik-layout">
      <ChapterNav
        :chapters="chapters"
        :search-query="searchQuery"
        @update:search-query="searchQuery = $event"
        @select="onSelect"
      />

      <main class="grammatik-main">
        <!-- ───────── I. Schwache Verben ───────── -->
        <section id="ch-1" class="chapter">
          <div class="chapter-numeral">I</div>
          <h2 class="chapter-title">Schwache Verben</h2>
          <p class="chapter-subtitle">Regular (weak) verbs — predictable endings on an unchanging stem</p>
          <hr class="rule" />

          <p class="dropcap-p">
            Weak verbs form the bedrock of German verbal morphology. The stem stays the same throughout
            the present tense; only the ending changes. If you can conjugate <code>spielen</code>, you can
            conjugate hundreds of others — <code>kaufen</code>, <code>machen</code>, <code>lieben</code>,
            <code>kochen</code>, <code>wohnen</code>, <code>fragen</code>, the whole regular crew.
          </p>

          <div class="two-col">
            <ConjugationTable
              verb="spielen"
              caption="PRÄSENS"
              :rows="[
                { person: 'ich', form: 'spiel<span class=&quot;ending&quot;>e</span>' },
                { person: 'du',  form: 'spiel<span class=&quot;ending&quot;>st</span>' },
                { person: 'er',  form: 'spiel<span class=&quot;ending&quot;>t</span>' },
                { person: 'wir', form: 'spiel<span class=&quot;ending&quot;>en</span>' },
                { person: 'ihr', form: 'spiel<span class=&quot;ending&quot;>t</span>' },
                { person: 'sie', form: 'spiel<span class=&quot;ending&quot;>en</span>' }
              ]"
            />
            <ConjugationTable
              verb="arbeiten"
              caption="PRÄSENS — Bindevokal"
              :rows="[
                { person: 'ich', form: 'arbeit<span class=&quot;ending&quot;>e</span>' },
                { person: 'du',  form: 'arbeit<span class=&quot;ending&quot;>est</span>' },
                { person: 'er',  form: 'arbeit<span class=&quot;ending&quot;>et</span>' },
                { person: 'wir', form: 'arbeit<span class=&quot;ending&quot;>en</span>' },
                { person: 'ihr', form: 'arbeit<span class=&quot;ending&quot;>et</span>' },
                { person: 'sie', form: 'arbeit<span class=&quot;ending&quot;>en</span>' }
              ]"
            />
          </div>

          <Callout kind="note">
            <p><strong>Bindevokal -e-.</strong> When the stem ends in <code>-d</code>, <code>-t</code>,
              <code>-chn</code>, <code>-ffn</code>, <code>-tm</code> or <code>-dn</code>, slip an extra
              <code>-e-</code> in before <code>-st</code> and <code>-t</code>. Examples:
              <code>arbeiten → du arbeitest, er arbeitet</code>;
              <code>warten → du wartest, er wartet</code>;
              <code>finden → du findest, er findet</code>;
              <code>öffnen → du öffnest, ihr öffnet</code>;
              <code>atmen → du atmest, er atmet</code>.</p>
          </Callout>

          <Callout kind="exception">
            <p><strong>Stems in -s / -ß / -z / -tz / -x.</strong> The du-form already ends in a sibilant,
              so it takes only <code>-t</code>, not <code>-st</code>. Examples:
              <code>tanzen → du tanz<strong>t</strong></code>;
              <code>heißen → du heiß<strong>t</strong></code>;
              <code>sitzen → du sitz<strong>t</strong></code>;
              <code>reisen → du reis<strong>t</strong></code>.</p>
          </Callout>

          <Callout kind="example">
            <p>
              "Ich arbeite jeden Tag in der Bibliothek."<br />
              "Du tanzt sehr gut."<br />
              "Wir wohnen in Berlin."
            </p>
          </Callout>
        </section>

        <!-- ───────── II. Starke Verben ───────── -->
        <section id="ch-2" class="chapter">
          <div class="chapter-numeral">II</div>
          <h2 class="chapter-title">Starke Verben</h2>
          <p class="chapter-subtitle">Strong verbs — vowel changes in du and er/sie/es</p>
          <hr class="rule" />

          <p class="dropcap-p">
            Strong verbs shift their stem vowel in the 2nd- and 3rd-person singular. The pattern is
            predictable once you've learned which letter swaps for which — and crucially, the change
            shows up <em>only</em> in du and er/sie/es. Everywhere else, the stem is normal.
          </p>

          <h3 class="pattern-heading">a → ä</h3>
          <p>
            <code>fahren → du f<VowelShift from="fahren">ä</VowelShift>hrst, er f<VowelShift from="fahren">ä</VowelShift>hrt</code>
            · <code>schlafen → schl<VowelShift>ä</VowelShift>ft</code>
            · <code>tragen → tr<VowelShift>ä</VowelShift>gt</code>
            · <code>waschen → w<VowelShift>ä</VowelShift>scht</code>
            · <code>halten → h<VowelShift>ä</VowelShift>lt</code>
            · <code>lassen → l<VowelShift>ä</VowelShift>sst</code>.
          </p>

          <h3 class="pattern-heading">au → äu</h3>
          <p>
            <code>laufen → du l<VowelShift from="laufen">äu</VowelShift>fst, er l<VowelShift from="laufen">äu</VowelShift>ft</code>
            · <code>saufen → s<VowelShift>äu</VowelShift>ft</code>.
          </p>

          <h3 class="pattern-heading">e → i</h3>
          <p>
            <code>geben → du g<VowelShift from="geben">i</VowelShift>bst, er g<VowelShift from="geben">i</VowelShift>bt</code>
            · <code>nehmen → n<VowelShift>i</VowelShift>mmt</code>
            · <code>helfen → h<VowelShift>i</VowelShift>lft</code>
            · <code>sprechen → spr<VowelShift>i</VowelShift>cht</code>
            · <code>essen → <VowelShift>i</VowelShift>sst</code>
            · <code>treffen → tr<VowelShift>i</VowelShift>fft</code>
            · <code>werfen → w<VowelShift>i</VowelShift>rft</code>.
          </p>

          <h3 class="pattern-heading">e → ie</h3>
          <p>
            <code>sehen → du s<VowelShift from="sehen">ie</VowelShift>hst, er s<VowelShift from="sehen">ie</VowelShift>ht</code>
            · <code>lesen → l<VowelShift>ie</VowelShift>st</code>
            · <code>empfehlen → empf<VowelShift>ie</VowelShift>hlt</code>
            · <code>stehlen → st<VowelShift>ie</VowelShift>hlt</code>.
          </p>

          <Callout kind="exception">
            <p><strong>Looks strong but isn't.</strong> Some common verbs you'd expect to shift, don't —
              <code>kommen → er kommt</code>, <code>gehen → er geht</code>, <code>schwimmen → er schwimmt</code>.
              Memorise these so you don't over-apply the rules.</p>
          </Callout>

          <Callout kind="example">
            <p>
              "Er fährt nach Hamburg."<br />
              "Sie liest gerade ein Buch."<br />
              "Du gibst mir das Salz, bitte."
            </p>
          </Callout>
        </section>

        <!-- ───────── III. Mischverben ───────── -->
        <section id="ch-3" class="chapter">
          <div class="chapter-numeral">III</div>
          <h2 class="chapter-title">Mischverben</h2>
          <p class="chapter-subtitle">Mixed verbs — irregular stem, weak endings</p>
          <hr class="rule" />

          <p class="dropcap-p">
            A small but important group. In the Präteritum and Partizip II, the stem vowel changes (like
            a strong verb), but the endings stay weak (<code>-te</code>, <code>-t</code>). They're
            unpredictable — just memorise them.
          </p>

          <ConjugationTable
            verb="Mischverben"
            caption="STAMMFORMEN — selected"
            :rows="[
              { person: 'bringen', form: 'br<span class=&quot;vh&quot;>a</span>chte · ge·br<span class=&quot;vh&quot;>a</span>cht' },
              { person: 'denken',  form: 'd<span class=&quot;vh&quot;>a</span>chte · ge·d<span class=&quot;vh&quot;>a</span>cht' },
              { person: 'wissen',  form: 'w<span class=&quot;vh&quot;>u</span>sste · ge·w<span class=&quot;vh&quot;>u</span>sst' },
              { person: 'kennen',  form: 'k<span class=&quot;vh&quot;>a</span>nnte · ge·k<span class=&quot;vh&quot;>a</span>nnt' },
              { person: 'nennen',  form: 'n<span class=&quot;vh&quot;>a</span>nnte · ge·n<span class=&quot;vh&quot;>a</span>nnt' },
              { person: 'brennen', form: 'br<span class=&quot;vh&quot;>a</span>nnte · ge·br<span class=&quot;vh&quot;>a</span>nnt' },
              { person: 'rennen',  form: 'r<span class=&quot;vh&quot;>a</span>nnte · ge·r<span class=&quot;vh&quot;>a</span>nnt' },
              { person: 'senden',  form: 's<span class=&quot;vh&quot;>a</span>ndte · ge·s<span class=&quot;vh&quot;>a</span>ndt' }
            ]"
          />

          <Callout kind="note">
            <p>The Präsens of mixed verbs is fully regular — the irregularity only shows up in past forms.
              <code>bringen → ich bringe, du bringst, er bringt</code>. The surprise is <code>brachte</code> in
              Präteritum and <code>gebracht</code> as Partizip II.</p>
          </Callout>
        </section>

        <!-- ───────── IV. Modalverben ───────── -->
        <section id="ch-4" class="chapter">
          <div class="chapter-numeral">IV</div>
          <h2 class="chapter-title">Modalverben</h2>
          <p class="chapter-subtitle">The six modal verbs and their full conjugation grid</p>
          <hr class="rule" />

          <p class="dropcap-p">
            Six verbs, all irregular in the singular present, all using <code>-te</code> in the Präteritum.
            Modals usually pair with a bare infinitive at the end of the clause: <code>Ich muss arbeiten</code>.
            In compound tenses with another infinitive, they form a "double infinitive" rather than a
            normal Partizip II.
          </p>

          <div class="modal-grid">
            <table class="modal-table">
              <thead>
                <tr>
                  <th></th>
                  <th>können</th><th>müssen</th><th>dürfen</th>
                  <th>sollen</th><th>wollen</th><th>mögen</th>
                </tr>
              </thead>
              <tbody>
                <tr><th>ich</th><td>kann</td><td>muss</td><td>darf</td><td>soll</td><td>will</td><td>mag</td></tr>
                <tr><th>du</th><td>kannst</td><td>musst</td><td>darfst</td><td>sollst</td><td>willst</td><td>magst</td></tr>
                <tr><th>er/sie/es</th><td>kann</td><td>muss</td><td>darf</td><td>soll</td><td>will</td><td>mag</td></tr>
                <tr><th>wir</th><td>können</td><td>müssen</td><td>dürfen</td><td>sollen</td><td>wollen</td><td>mögen</td></tr>
                <tr><th>ihr</th><td>könnt</td><td>müsst</td><td>dürft</td><td>sollt</td><td>wollt</td><td>mögt</td></tr>
                <tr><th>sie/Sie</th><td>können</td><td>müssen</td><td>dürfen</td><td>sollen</td><td>wollen</td><td>mögen</td></tr>
                <tr class="row-sep"><th>Präteritum</th><td>konnte</td><td>musste</td><td>durfte</td><td>sollte</td><td>wollte</td><td>mochte</td></tr>
                <tr><th>Konjunktiv II</th><td>könnte</td><td>müsste</td><td>dürfte</td><td>sollte</td><td>wollte</td><td>möchte</td></tr>
                <tr><th>Partizip II</th><td>gekonnt</td><td>gemusst</td><td>gedurft</td><td>gesollt</td><td>gewollt</td><td>gemocht</td></tr>
              </tbody>
            </table>
          </div>

          <Callout kind="note">
            <p><strong>Doppel-Infinitiv.</strong> When a modal joins another verb in Perfekt or
              Plusquamperfekt, both verbs end up as infinitives — no <code>ge-</code> Partizip II.
              Compare: <em>Ich habe es gewollt</em> (modal alone, with Partizip II) vs
              <em>Ich habe arbeiten müssen</em> (modal + infinitive, double infinitive).</p>
          </Callout>

          <Callout kind="note">
            <p><strong>"möchte" is technically Konjunktiv II of mögen</strong>, but it functions as its own
              modal in everyday use — <em>"Ich möchte einen Kaffee, bitte."</em> Treat it as the polite
              equivalent of <em>"Ich will"</em>.</p>
          </Callout>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.grammatik-header {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--rule);
  margin-bottom: 32px;
}

.grammatik-mark {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.2em;
  color: var(--ink-soft);
}

.grammatik-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 48px;
  max-width: 1160px;
  margin: 0 auto;
}

.grammatik-main {
  max-width: 720px;
}

.chapter {
  position: relative;
  margin: 96px 0;
  scroll-margin-top: 96px;
  animation: chapter-in 400ms ease-out both;
}

.chapter:first-of-type { margin-top: 16px; }

@keyframes chapter-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.chapter-numeral {
  position: absolute;
  top: -8px;
  left: -88px;
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 300;
  font-size: 96px;
  line-height: 1;
  color: var(--sage);
  opacity: 0.85;
}

.chapter-title {
  font-size: 44px;
  font-weight: 600;
  line-height: 1.1;
  margin-bottom: 4px;
}

.chapter-subtitle {
  font-size: 18px;
  font-style: italic;
  color: var(--ink-soft);
  margin: 0 0 0 0;
}

.pattern-heading {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  margin: 22px 0 10px 0;
  color: var(--sage);
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.modal-grid { overflow-x: auto; margin: 22px 0; }

.modal-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  font-family: var(--font-mono);
}

.modal-table th, .modal-table td {
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px dotted var(--mute);
}

.modal-table th {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--ink-soft);
  font-weight: 400;
}

.modal-table thead th {
  font-family: var(--font-display);
  font-style: normal;
  font-weight: 600;
  color: var(--ink);
  border-bottom: 1px solid var(--rule);
}

.modal-table .row-sep th, .modal-table .row-sep td {
  border-top: 1px solid var(--rule);
  padding-top: 12px;
}

/* Highlight ending letters inside conj forms */
:deep(.conj-form .ending) {
  color: var(--sage);
  font-weight: 600;
}

/* Highlight vowel changes inside conj forms (.vh shorthand) */
:deep(.conj-form .vh) {
  color: var(--sage);
  font-weight: 600;
}

@media (max-width: 959px) {
  .grammatik-layout {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .chapter-numeral {
    position: static;
    margin-bottom: 12px;
    font-size: 64px;
  }
  .chapter-title { font-size: 32px; }
  .two-col { grid-template-columns: 1fr; }
}
</style>
