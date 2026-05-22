<script setup lang="ts">
import { NSpace, NCollapse, NCollapseItem, NTable } from 'naive-ui'
</script>

<template>
  <n-space vertical size="large" style="max-width: 760px">
    <h2>Conjugation cheatsheet</h2>
    <n-collapse arrow-placement="right" :default-expanded-names="['1']">
      <n-collapse-item title="1. Regular (schwache) Verben — present endings" name="1">
        <p>Stem + -e / -st / -t / -en / -t / -en.</p>
        <p><strong>Bindevokal -e-:</strong> stems ending in -d, -t, -chn, -ffn, -tm, -dn add -e- before -st and -t: <em>du arbeitest, er arbeitet, ihr arbeitet</em>.</p>
        <p><strong>-s / -ß / -z / -tz / -x stems:</strong> du-form takes only -t, not -st: <em>du tanzt, du heißt, du sitzt</em>.</p>
      </n-collapse-item>

      <n-collapse-item title="2. Strong (starke) Verben — vowel changes in du/er" name="2">
        <p><strong>a → ä:</strong> fahren → du fährst, er fährt; schlafen → schläft; tragen → trägt.</p>
        <p><strong>au → äu:</strong> laufen → läufst, läuft.</p>
        <p><strong>e → i:</strong> geben → gibst, gibt; helfen → hilfst, hilft; nehmen → nimmst, nimmt; essen → isst.</p>
        <p><strong>e → ie:</strong> sehen → siehst, sieht; lesen → liest; empfehlen → empfiehlt.</p>
      </n-collapse-item>

      <n-collapse-item title="3. Mixed (gemischte) Verben — irregular stem + weak endings" name="3">
        <p>bringen → brachte, gebracht • denken → dachte, gedacht • wissen → wusste, gewusst • kennen → kannte, gekannt • brennen → brannte, gebrannt.</p>
      </n-collapse-item>

      <n-collapse-item title="4. Modalverben — full conjugation" name="4">
        <n-table size="small" :bordered="false">
          <thead><tr><th></th><th>können</th><th>müssen</th><th>dürfen</th><th>sollen</th><th>wollen</th><th>mögen</th></tr></thead>
          <tbody>
            <tr><td>ich</td><td>kann</td><td>muss</td><td>darf</td><td>soll</td><td>will</td><td>mag</td></tr>
            <tr><td>du</td><td>kannst</td><td>musst</td><td>darfst</td><td>sollst</td><td>willst</td><td>magst</td></tr>
            <tr><td>er</td><td>kann</td><td>muss</td><td>darf</td><td>soll</td><td>will</td><td>mag</td></tr>
            <tr><td>K II</td><td>könnte</td><td>müsste</td><td>dürfte</td><td>sollte</td><td>wollte</td><td>möchte</td></tr>
          </tbody>
        </n-table>
      </n-collapse-item>

      <n-collapse-item title="5. Separable vs inseparable prefixes" name="5">
        <p><strong>Separable (split in main clause):</strong> ab-, an-, auf-, aus-, ein-, mit-, nach-, vor-, zu-, fern-, weg-, zurück-, hin-, her-, fest-.</p>
        <p><strong>Inseparable (never split):</strong> be-, emp-, ent-, er-, ge-, ver-, zer-, miss-.</p>
        <p>Some prefixes are <strong>both</strong> (durch-, über-, um-, unter-, voll-, wieder-) — meaning differs by stress.</p>
      </n-collapse-item>

      <n-collapse-item title="6. Partizip II rules" name="6">
        <p><strong>Weak:</strong> ge- + stem + -t → gespielt, gearbeitet (with Bindevokal), gekauft.</p>
        <p><strong>Strong:</strong> ge- + (often changed) stem + -en → gegangen, gesehen, geschrieben.</p>
        <p><strong>Separable:</strong> prefix + ge + stem → aufgestanden, eingekauft.</p>
        <p><strong>Inseparable / -ieren:</strong> no ge- → verkauft, besucht, studiert.</p>
      </n-collapse-item>

      <n-collapse-item title="7. haben vs sein in Perfekt/Plusquamperfekt" name="7">
        <p><strong>sein</strong> with verbs of motion or change-of-state, plus sein/werden/bleiben/passieren.</p>
        <p>Examples: gehen, kommen, fahren, fliegen, laufen, schwimmen, steigen, ankommen, aufstehen.</p>
        <p><strong>haben</strong> for everything else (most transitive and stative verbs).</p>
      </n-collapse-item>

      <n-collapse-item title="8. Imperativ" name="8">
        <p><strong>du:</strong> usually stem (no ending). With -d/-t add -e (<em>arbeite!</em>). Strong verbs with e→i/ie carry the change (<em>gib! lies! nimm! sieh! iss!</em>). a→ä does <strong>not</strong> change (<em>fahr!</em>, not "fähr!").</p>
        <p><strong>ihr:</strong> same as present ihr-form (<em>geht!</em>, <em>arbeitet!</em>).</p>
        <p><strong>Sie:</strong> present Sie-form inverted (<em>Gehen Sie!</em>, <em>Helfen Sie!</em>).</p>
      </n-collapse-item>

      <n-collapse-item title="9. Konjunktiv II" name="9">
        <p>Use proper K2 forms for: sein (wäre), haben (hätte), werden (würde), modals (könnte, müsste, dürfte, sollte, wollte, möchte), wissen (wüsste), and common strong verbs (käme, ginge, fände, gäbe, ließe).</p>
        <p>For everything else, use <strong>würde + Infinitiv</strong>: <em>Ich würde das machen.</em></p>
      </n-collapse-item>

      <n-collapse-item title="10. Passiv (Vorgangspassiv)" name="10">
        <p><strong>werden</strong> (in the right tense) + <strong>Partizip II</strong>.</p>
        <ul>
          <li>Präsens: <em>wird gefragt</em></li>
          <li>Präteritum: <em>wurde gefragt</em></li>
          <li>Perfekt: <em>ist gefragt <strong>worden</strong></em> (note: <strong>worden</strong>, not geworden)</li>
          <li>Plusquamperfekt: <em>war gefragt worden</em></li>
          <li>Futur I: <em>wird gefragt werden</em></li>
        </ul>
        <p>Only transitive verbs (accusative object) can form a normal passive.</p>
      </n-collapse-item>

      <n-collapse-item title="11. Reflexive Verben" name="11">
        <p><strong>Accusative reflexive:</strong> sich freuen, sich erinnern, sich entscheiden, sich beeilen, sich treffen.</p>
        <p>Pronouns: mich, dich, sich, uns, euch, sich.</p>
        <p><strong>Dative reflexive:</strong> sich (etwas) vorstellen, sich (etwas) merken, sich (die Hände) waschen.</p>
        <p>Dative reflexive pronouns differ only in du (dir) and ich (mir).</p>
      </n-collapse-item>

      <n-collapse-item title="12. Verben mit Dativ" name="12">
        <p>helfen, danken, gefallen, antworten, gehören, passieren, schmecken, glauben (+ person), gratulieren, folgen, vertrauen, widersprechen, zuhören.</p>
        <p>Example: <em>Ich helfe dir.</em> (not <em>dich</em>)</p>
      </n-collapse-item>
    </n-collapse>
  </n-space>
</template>
