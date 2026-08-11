<script setup lang="ts">
import { DATIVE_VERBS, DATIVE_VERB_KEYS, dativeVerbsBy } from '../../data/dativeVerbs'
import { DATIVE_ADJECTIVES, DATIVE_ADJECTIVE_KEYS } from '../../data/dativeAdjectives'
import { TWIN_PAIRS, type TwinPair } from '../../data/dativeTwins'
import { OBJECT_ORDER_ITEMS, objectOrderAnswer } from '../../data/dativeDitransitive'
import { DATIVE_FAMILIES, FAMILY_LABELS, type DativeFamily } from '../../composables/useDativeDrill'

// I — the dative map: three semantic families, straight from the side-table.
const FAMILY_GLOSS: Record<DativeFamily, string> = {
  'recipient': 'jemand bekommt etwas — oft steckt das Etwas schon im Verb',
  'experiencer': 'die Sache ist Subjekt; der Mensch erlebt sie nur',
  'co-agent': 'zwei Beteiligte in einer Szene — Aktion und Reaktion',
}
const familyCols = DATIVE_FAMILIES.map(f => ({
  family: f,
  label: FAMILY_LABELS[f],
  gloss: FAMILY_GLOSS[f],
  verbs: dativeVerbsBy(f),
}))
function pull(verb: string): boolean { return DATIVE_VERBS[verb]?.englishPull === true }

// II — the swallowed-accusative hook, derived (never set on experiencer entries).
const swallowedRows = DATIVE_VERB_KEYS
  .filter(k => DATIVE_VERBS[k].swallowed)
  .map(k => ({ verb: k, hook: DATIVE_VERBS[k].swallowed! }))

// III — the inverted experiencers.
const experiencerVerbs = dativeVerbsBy('experiencer')

// IV — twin table rows; the contrast lines are authored in the phase 3 bank.
function twinLabel(p: TwinPair): string {
  if (p.twinParticle) return `${p.dativeVerb} | ${p.twin} ${p.twinParticle}`
  if (p.dativeVerb === p.twin) return `${p.dativeVerb} +Dat | +Akk`
  return `${p.dativeVerb} | ${p.twin}`
}

// V — object order, derived through the executable rule so the cheatsheet can
// never contradict the T8 drill.
const ORDER_KINDS = [
  { kind: 'nn' as const, label: 'Nomen + Nomen', rule: 'Dativ vor Akkusativ' },
  { kind: 'pp' as const, label: 'Pronomen + Pronomen', rule: 'Akkusativ vor Dativ' },
  { kind: 'mixed' as const, label: 'Pronomen + Nomen', rule: 'Pronomen zuerst' },
]
const orderRows = ORDER_KINDS.map(k => {
  const item = OBJECT_ORDER_ITEMS.find(i => i.kind === k.kind)!
  return { ...k, sentence: `${item.stem} ${objectOrderAnswer(item)}${item.punct}` }
})

// VI — the three free-dative readings (CONTEXT.md's canonical examples).
const FREE_ROWS = [
  { reading: 'commodi', de: 'Vorteil', example: 'Ich trage dir den Koffer.', test: 'Ich trage den Koffer. — bleibt korrekt' },
  { reading: 'possessivus', de: 'Besitz (Pertinenzdativ)', example: 'Wasch dir die Hände!', test: 'Wasch die Hände! — bleibt korrekt' },
  { reading: 'ethicus', de: 'Anteilnahme', example: 'Sei mir bloß vorsichtig!', test: 'Sei bloß vorsichtig! — bleibt korrekt' },
]

// VIII — reflexive dative minimal pairs.
const REFLEXIVE_ROWS = [
  { akk: 'Ich wasche mich.', dat: 'Ich wasche mir die Hände.' },
  { akk: 'Ich ziehe mich an.', dat: 'Ich ziehe mir die Schuhe an.' },
  { akk: 'Ich stelle mich vor. (vorstellen = präsentieren)', dat: 'Ich stelle mir das vor. (vorstellen = ausmalen)' },
]

// IX — adjectives from the phase 1 side-table.
const adjectiveRows = DATIVE_ADJECTIVE_KEYS.map(k => ({ lemma: k, ...DATIVE_ADJECTIVES[k] }))
</script>

<template>
  <div class="page">
    <header class="section-header cheatsheet-section-header">
      <div>
        <div class="breadcrumb">Kapitel XIII · Dativ · Spickzettel</div>
        <h1 class="section-title">Der Dativ<em>.</em></h1>
        <p class="section-subtitle">
          An affected person, marked on the verb. The map by semantic family, the swallowed
          accusative, the twins, the orders, the free datives — and where the rest lives.
        </p>
      </div>
      <router-link :to="{ name: 'dative' }" class="btn btn-ghost back-link">← Dativ</router-link>
    </header>

    <section id="dat-map" class="plate">
      <div class="plate-h">
        <span class="plate-n">I</span>
        <h2 class="plate-t">The dative map</h2>
        <span class="plate-de">Drei Familien</span>
      </div>
      <div class="plate-b">
        <p>
          The dative marks an <strong>affected person</strong>. Membership is memorized per verb —
          but three readings organize the whole set. Verbs marked ↯ carry the
          <strong>English pull</strong>: their English twin is plain transitive
          (<em>help, thank, follow, answer, trust</em>), and your hand reaches for the accusative.
        </p>
        <div class="dat-fam-grid">
          <div v-for="col in familyCols" :key="col.family" class="dat-fam-col">
            <div class="dat-fam-h">{{ col.label }}</div>
            <div class="dat-fam-gloss">{{ col.gloss }}</div>
            <div class="dat-fam-verbs">
              <span v-for="v in col.verbs" :key="v" class="dat-verb">{{ v }}<template v-if="pull(v)"> ↯</template></span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="dat-swallowed" class="plate">
      <div class="plate-h">
        <span class="plate-n">II</span>
        <h2 class="plate-t">The swallowed accusative</h2>
        <span class="plate-de">Der verschluckte Akkusativ</span>
      </div>
      <div class="plate-b">
        <p>
          Why is there no accusative? Because the verb already <strong>ate it</strong>:
          <em>antworten</em> = give [an answer] to somebody. The direct object was absorbed
          into the verb; the person was always the indirect object — and stays dative.
          The hook never applies to the experiencer family.
        </p>
        <table class="mini-table">
          <tbody>
            <tr v-for="row in swallowedRows" :key="row.verb">
              <td class="t-de">{{ row.verb }}</td>
              <td class="t-it">{{ row.hook }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="dat-inverted" class="plate">
      <div class="plate-h">
        <span class="plate-n">III</span>
        <h2 class="plate-t">Inverted experiencers</h2>
        <span class="plate-de">Umgekehrte Verben</span>
      </div>
      <div class="plate-b">
        <p>
          <strong>Die Schuhe gefallen mir.</strong> The thing is the nominative subject and
          controls agreement; the person is dative. Two errors live here, and both are wrong:
          <em>*Ich gefalle das Buch</em> (person taken as subject) and
          <em>*Die Schuhe gefällt mir</em> (verb agreeing with the dative).
        </p>
        <p class="dat-verblist">
          <span v-for="v in experiencerVerbs" :key="v" class="dat-verb">{{ v }}</span>
        </p>
      </div>
    </section>

    <section id="dat-twins" class="plate">
      <div class="plate-h">
        <span class="plate-n">IV</span>
        <h2 class="plate-t">Twin verbs</h2>
        <span class="plate-de">Zwillinge</span>
      </div>
      <div class="plate-b">
        <p>
          Near-synonyms on opposite sides of the case line — usually the prefix eats the dative:
          <em>antworten + Dat</em> but <em>beantworten + Akk</em>.
        </p>
        <table class="mini-table">
          <tbody>
            <tr v-for="p in TWIN_PAIRS" :key="p.pairId">
              <td class="t-de">{{ twinLabel(p) }}</td>
              <td class="t-it">{{ p.contrast }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="dat-order" class="plate">
      <div class="plate-h">
        <span class="plate-n">V</span>
        <h2 class="plate-t">Two objects and their order</h2>
        <span class="plate-de">Objektfolge</span>
      </div>
      <div class="plate-b">
        <p>
          Ditransitives (<em>geben, schenken, erklären</em>) keep the person dative and the thing
          accusative — that part is predictable. The trap is the sequence:
        </p>
        <table class="mini-table">
          <thead>
            <tr><th>Konstellation</th><th>Regel</th><th>Beispiel</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in orderRows" :key="r.kind">
              <td class="t-it">{{ r.label }}</td>
              <td class="t-mono">{{ r.rule }}</td>
              <td class="t-ex">{{ r.sentence }}</td>
            </tr>
          </tbody>
        </table>
        <p>
          Never <em>*Ich gebe ihm es</em> — two pronouns always flip to accusative-first.
        </p>
      </div>
    </section>

    <section id="dat-free" class="plate">
      <div class="plate-h">
        <span class="plate-n">VI</span>
        <h2 class="plate-t">Free datives</h2>
        <span class="plate-de">Freier Dativ</span>
      </div>
      <div class="plate-b">
        <p>
          Optional datives the verb never asked for, in three readings. The test:
          <strong>drop it</strong>. A free dative leaves a grammatical sentence behind;
          a dative verb's object does not (<em>*Das Fahrrad gehört</em>).
          The ethicus is near-particle and takes almost only <em>mir/dir</em>.
        </p>
        <table class="mini-table">
          <thead>
            <tr><th>Lesart</th><th>Beispiel</th><th>Probe</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in FREE_ROWS" :key="r.reading">
              <td class="t-mono">{{ r.de }} ({{ r.reading }})</td>
              <td class="t-de">{{ r.example }}</td>
              <td class="t-it">{{ r.test }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="dat-passive" class="plate">
      <div class="plate-h">
        <span class="plate-n">VII</span>
        <h2 class="plate-t">No personal passive</h2>
        <span class="plate-de">Kein persönliches Passiv</span>
      </div>
      <div class="plate-b">
        <p>
          With no accusative object, nothing can become a passive subject. So:
          <strong>Mir wird geholfen</strong> — or with the position-1 placeholder,
          <strong>Es wird mir geholfen</strong> — and never <em>*Ich werde geholfen</em>.
        </p>
        <p>
          The dative survives, the verb freezes in the 3rd person singular
          (<em>Den Kindern <strong>wird</strong> geholfen</em>, never <em>*werden</em>),
          and the dummy <em>es</em> vanishes as soon as anything else takes first position:
          <em>Jetzt wird mir geholfen</em>, not <em>*Jetzt wird es mir geholfen</em>.
        </p>
      </div>
    </section>

    <section id="dat-reflexive" class="plate">
      <div class="plate-h">
        <span class="plate-n">VIII</span>
        <h2 class="plate-t">Reflexive dative</h2>
        <span class="plate-de">Reflexiver Dativ</span>
      </div>
      <div class="plate-b">
        <p>
          When an accusative object is already in the sentence, the reflexive pronoun
          moves to the dative — visible only in <em>mir/dir</em> against <em>mich/dich</em>.
        </p>
        <table class="mini-table">
          <thead>
            <tr><th>Reflexiv = Objekt (Akk)</th><th>Objekt schon da → Reflexiv Dativ</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in REFLEXIVE_ROWS" :key="r.dat">
              <td class="t-de">{{ r.akk }}</td>
              <td class="t-de">{{ r.dat }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="dat-adjectives" class="plate">
      <div class="plate-h">
        <span class="plate-n">IX</span>
        <h2 class="plate-t">Dative adjectives</h2>
        <span class="plate-de">Dativ ohne Objekt</span>
      </div>
      <div class="plate-b">
        <p>
          A dozen adjectives mark their person dative with no verb object in sight —
          plus the subjectless body states (<em>Mir ist kalt</em>, never <em>*Ich bin kalt</em>
          unless you mean your character).
        </p>
        <table class="mini-table">
          <tbody>
            <tr v-for="a in adjectiveRows" :key="a.lemma">
              <td class="t-de">{{ a.lemma }}<template v-if="a.impersonal"> °</template></td>
              <td class="t-it">{{ a.english }}</td>
              <td class="t-ex">{{ a.example }}</td>
            </tr>
          </tbody>
        </table>
        <p class="micro-mark">° subjectless body state — the dative person is all there is.</p>
      </div>
    </section>

    <section id="dat-elsewhere" class="plate">
      <div class="plate-h">
        <span class="plate-n">X</span>
        <h2 class="plate-t">Where the rest lives</h2>
        <span class="plate-de">Nachschlagen</span>
      </div>
      <div class="plate-b">
        <p>
          This module deliberately does <strong>not</strong> re-teach the rest of the dative
          territory — it is already drilled elsewhere:
        </p>
        <ul class="dat-links">
          <li>
            <strong>Dative prepositions</strong> (<em>aus, bei, mit, nach, seit, von, zu</em>),
            the two-way prepositions and the fixed collocations (<em>Angst vor + Dat</em>) —
            <router-link :to="{ name: 'prepositions' }">Präpositionen</router-link> ·
            <router-link :to="{ name: 'prepositions-cheatsheet' }">deren Spickzettel</router-link>
          </li>
          <li>
            <strong>Dative morphology</strong> — <em>dem/der/den +n</em>, adjective endings,
            pronoun tables — <router-link :to="{ name: 'declension' }">Deklination</router-link>
          </li>
          <li>
            <strong>Which of six cases does a verb govern?</strong> — the Rektion drill in
            <router-link :to="{ name: 'verbs' }">Verben</router-link>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page { max-width: 980px; }
.cheatsheet-section-header { margin-bottom: 48px; }
.back-link { text-decoration: none; border-bottom: 0; }

.dat-fam-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 6px;
}
.dat-fam-h {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  color: var(--accent);
}
.dat-fam-gloss {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13px;
  color: var(--ink-soft);
  margin: 2px 0 10px;
}
.dat-verb {
  display: inline-block;
  font-size: 14px;
  color: var(--ink);
  border: 1px solid var(--hairline);
  border-radius: 3px;
  padding: 2px 8px;
  margin: 0 6px 6px 0;
}
.dat-verblist { margin-top: 8px; }
.dat-links { margin: 8px 0 0; padding-left: 20px; }
.dat-links li { margin-bottom: 10px; }

@media (max-width: 720px) {
  .dat-fam-grid { grid-template-columns: 1fr; }
}
</style>
