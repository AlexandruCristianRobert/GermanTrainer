const y=["easy","medium","hard"],E={easy:"Easy · B1",medium:"Medium · B2",hard:"Hard · C1"},k={easy:"Simple SVO quotes with er/sie/es subjects so Konjunktiv I works cleanly. Reporting verbs: sagte, meinte.",medium:"Mixed subjects including plural and 1st person, which forces Konjunktiv II as a fallback in some cases. Reporting verbs: erklärte, behauptete, betonte.",hard:"News-register: subordinate clauses, modal verbs, time-of-utterance shifts. Reporting verbs: konstatierte, dementierte, wies darauf hin."},b=["Politik","Wirtschaft","Wissenschaft","Sport","Kultur"],I={type:"object",properties:{entries:{type:"array",items:{type:"object",properties:{source:{type:"string"},reportingClause:{type:"string"},referenceAnswer:{type:"string"},expectedMood:{type:"string",enum:["K1","K2-fallback"]},rationale:{type:"string"},difficulty:{type:"string",enum:["easy","medium","hard"]}},required:["source","reportingClause","referenceAnswer","expectedMood","rationale","difficulty"]}}},required:["entries"]},v={type:"object",properties:{verdict:{type:"string",enum:["correct","partially_correct","incorrect"]},expected:{type:"string"},acceptedVariants:{type:"array",items:{type:"string"}},feedback:{type:"string"},moodCheck:{type:"object",properties:{used:{type:"string",enum:["K1","K2","indicative","other"]},ok:{type:"boolean"}},required:["used","ok"]}},required:["verdict","expected","acceptedVariants","feedback","moodCheck"]},K=["K1","K2-fallback"],w=[["„",'"'],["«","»"]];function C(r){if(!r||typeof r!="object")return null;const e=r;return typeof e.source!="string"||e.source.length===0||typeof e.reportingClause!="string"||e.reportingClause.length===0||typeof e.referenceAnswer!="string"||e.referenceAnswer.length===0||typeof e.expectedMood!="string"||typeof e.rationale!="string"||e.rationale.trim().length===0||typeof e.difficulty!="string"||!e.source.includes(":")||!w.some(([i,o])=>e.source.includes(i)&&e.source.includes(o))||!e.reportingClause.endsWith(", ")||!e.referenceAnswer.startsWith(e.reportingClause)||!K.includes(e.expectedMood)||!y.includes(e.difficulty)?null:{source:e.source,reportingClause:e.reportingClause,referenceAnswer:e.referenceAnswer,expectedMood:e.expectedMood,rationale:e.rationale,difficulty:e.difficulty}}const j=["der Außenminister","die Bürgermeisterin","der CEO","die Klimaforscherin","der Bundestrainer","die Regisseurin","der Notenbankchef","die Astronautin","der Schiedsrichter","die Chefredakteurin","der Dirigent","die Sprecherin","der Whistleblower","die Anwältin","der Trainer","die Aktivistin","der Wirtschaftsminister","die Pilotin","der Vorstandschef","die Linguistin"],x=["sagte","erklärte","behauptete","betonte","meinte","wies darauf hin","dementierte","konstatierte","fügte hinzu","kündigte an","gab bekannt","bestritt","räumte ein","warnte","versprach","argumentierte"];function p(r,e,t){const i=[...r],o=[],n=Math.min(e,i.length);for(let s=0;s<n;s++){const a=Math.floor(t()*i.length);o.push(i.splice(a,1)[0])}return o}function S(r,e,t,i=Math.random){const o=t&&t.length>0&&t.length<b.length?`Bias topics toward: ${t.join(", ")}.`:"Mix topics across the batch.",n=p(j,Math.max(4,Math.min(8,r)),i),s=p(x,Math.max(4,Math.min(8,r)),i),a=Math.floor(i()*1e6).toString(36);return`Generate ${r} German direct-speech quote / indirect-speech rewrite pairs
for a Konjunktiv I drill.

DIFFICULTY: ${e}
${k[e]}

REQUIREMENTS for every entry:
- "source" is a single sentence containing a speaker, a reporting verb in the
  preterite, a colon, and the direct quote in German quote marks („…" or «…»).
  Example: Der Minister sagte: „Wir senken die Steuern."
- "reportingClause" is the speaker + reporting verb + ", " (literally ending with
  a comma and a space). Example: "Der Minister sagte, "
- "referenceAnswer" is the full indirect-speech rewrite, starting EXACTLY with the
  reportingClause string. Use Konjunktiv I where it differs from the indicative;
  fall back to Konjunktiv II ONLY when K-I would coincide with the indicative
  (typically plural and 1st-person forms).
- "expectedMood" is "K1" when the canonical answer is in K-I, or "K2-fallback"
  when the canonical answer must use K-II.
- "rationale" is a short English explanation (one or two sentences) of WHY the
  chosen mood applies — especially the K-I/K-II collision rule when relevant.
- "difficulty" is exactly "${e}".
- ${o}
- Vary reporting verbs and subjects across the batch. Draw inspiration from
  these seed pools (use as a starting point — paraphrase / extend, do not just
  echo): subjects = ${n.join(" · ")}; reporting verbs = ${s.join(" · ")}.
- Batch variation seed (do not echo): ${a}.
- About 30–40% of entries SHOULD deliberately require the K-II fallback so the
  drill reinforces the collision rule.

Return ONLY valid JSON matching the schema. No prose. No markdown fences.`}async function _(r,e){const t=e.maxRetries;let i=0,o=0;const n=[];for(;n.length<e.count&&o<=t;){o++;const s=e.count-n.length,a=S(s,e.difficulty,e.topics),m=(await r.models.generateContent({model:e.model,contents:a,config:{responseMimeType:"application/json",responseSchema:I,temperature:.9,topP:.95}})).text??"";let c;try{c=JSON.parse(m)}catch{continue}if(!c||typeof c!="object")continue;const u=c.entries;if(Array.isArray(u))for(const g of u){const d=C(g);if(d===null){i++;continue}if(n.push({id:`ki-${Date.now()}-${n.length}`,...d}),n.length>=e.count)break}}return{entries:n,rejected:i,attempts:o}}const M='You are a strict German grammar teacher grading indirekte-Rede transformations. Accept any grammatically valid Konjunktiv I or Konjunktiv II form that preserves the meaning. When Konjunktiv I coincides with the indicative (typical for plural and 1st-person), Konjunktiv II is required — flag this in moodCheck. Set moodCheck.used to "K1", "K2", "indicative", or "other". Set moodCheck.ok=true when the chosen mood is appropriate for the source quote.';function f(r){return r.trim().toLowerCase().replace(/\s+/g," ")}function h(r,e){const t=f(e)===f(r.referenceAnswer);return{verdict:t?"correct":"incorrect",expected:r.referenceAnswer,acceptedVariants:[],feedback:"Grader unavailable — fallback to reference match.",moodCheck:{used:"other",ok:t}}}function A(r,e){if(!r||typeof r!="object")return null;const t=r,i=["correct","partially_correct","incorrect"],o=["K1","K2","indicative","other"];if(typeof t.verdict!="string"||!i.includes(t.verdict)||typeof t.expected!="string"||!Array.isArray(t.acceptedVariants)||t.acceptedVariants.some(s=>typeof s!="string")||typeof t.feedback!="string")return null;const n=t.moodCheck;return!n||typeof n!="object"||typeof n.used!="string"||!o.includes(n.used)||typeof n.ok!="boolean"?null:{verdict:t.verdict,expected:e.referenceAnswer,acceptedVariants:t.acceptedVariants,feedback:t.feedback,moodCheck:{used:n.used,ok:n.ok}}}async function R(r,e,t,i){const o=`Source quote:
${t.source}

Canonical indirect-speech reference:
${t.referenceAnswer}

Expected mood: ${t.expectedMood}

Student's submitted answer:
${i.trim()||"(empty)"}`;try{const s=(await r.models.generateContent({model:e,contents:o,config:{systemInstruction:M,responseMimeType:"application/json",responseSchema:v,temperature:0}})).text??"",a=JSON.parse(s),l=A(a,t);return l===null?h(t,i):l}catch{return h(t,i)}}export{y as K,b as a,k as b,E as c,_ as g,R as j};
