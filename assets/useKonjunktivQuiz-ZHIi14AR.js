const g=["easy","medium","hard"],S={easy:"Easy · B1",medium:"Medium · B2",hard:"Hard · C1"},y={easy:"Simple SVO quotes with er/sie/es subjects so Konjunktiv I works cleanly. Reporting verbs: sagte, meinte.",medium:"Mixed subjects including plural and 1st person, which forces Konjunktiv II as a fallback in some cases. Reporting verbs: erklärte, behauptete, betonte.",hard:"News-register: subordinate clauses, modal verbs, time-of-utterance shifts. Reporting verbs: konstatierte, dementierte, wies darauf hin."},k=["Politik","Wirtschaft","Wissenschaft","Sport","Kultur"],b={type:"object",properties:{entries:{type:"array",items:{type:"object",properties:{source:{type:"string"},reportingClause:{type:"string"},referenceAnswer:{type:"string"},expectedMood:{type:"string",enum:["K1","K2-fallback"]},rationale:{type:"string"},difficulty:{type:"string",enum:["easy","medium","hard"]}},required:["source","reportingClause","referenceAnswer","expectedMood","rationale","difficulty"]}}},required:["entries"]},I={type:"object",properties:{verdict:{type:"string",enum:["correct","partially_correct","incorrect"]},expected:{type:"string"},acceptedVariants:{type:"array",items:{type:"string"}},feedback:{type:"string"},moodCheck:{type:"object",properties:{used:{type:"string",enum:["K1","K2","indicative","other"]},ok:{type:"boolean"}},required:["used","ok"]}},required:["verdict","expected","acceptedVariants","feedback","moodCheck"]},K=["K1","K2-fallback"],v=[["„",'"'],["«","»"]];function w(r){if(!r||typeof r!="object")return null;const e=r;return typeof e.source!="string"||e.source.length===0||typeof e.reportingClause!="string"||e.reportingClause.length===0||typeof e.referenceAnswer!="string"||e.referenceAnswer.length===0||typeof e.expectedMood!="string"||typeof e.rationale!="string"||e.rationale.trim().length===0||typeof e.difficulty!="string"||!e.source.includes(":")||!v.some(([i,o])=>e.source.includes(i)&&e.source.includes(o))||!e.reportingClause.endsWith(", ")||!e.referenceAnswer.startsWith(e.reportingClause)||!K.includes(e.expectedMood)||!g.includes(e.difficulty)?null:{source:e.source,reportingClause:e.reportingClause,referenceAnswer:e.referenceAnswer,expectedMood:e.expectedMood,rationale:e.rationale,difficulty:e.difficulty}}function C(r,e,t){const i=t&&t.length>0&&t.length<k.length?`Bias topics toward: ${t.join(", ")}.`:"Mix topics across the batch.";return`Generate ${r} German direct-speech quote / indirect-speech rewrite pairs
for a Konjunktiv I drill.

DIFFICULTY: ${e}
${y[e]}

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
- ${i}
- Vary reporting verbs and subjects across the batch.
- About 30–40% of entries SHOULD deliberately require the K-II fallback so the
  drill reinforces the collision rule.

Return ONLY valid JSON matching the schema. No prose. No markdown fences.`}async function A(r,e){const t=e.maxRetries;let i=0,o=0;const n=[];for(;n.length<e.count&&o<=t;){o++;const s=e.count-n.length,a=C(s,e.difficulty,e.topics),h=(await r.models.generateContent({model:e.model,contents:a,config:{responseMimeType:"application/json",responseSchema:b,temperature:.4}})).text??"";let c;try{c=JSON.parse(h)}catch{continue}if(!c||typeof c!="object")continue;const u=c.entries;if(Array.isArray(u))for(const m of u){const d=w(m);if(d===null){i++;continue}if(n.push({id:`ki-${Date.now()}-${n.length}`,...d}),n.length>=e.count)break}}return{entries:n,rejected:i,attempts:o}}const j='You are a strict German grammar teacher grading indirekte-Rede transformations. Accept any grammatically valid Konjunktiv I or Konjunktiv II form that preserves the meaning. When Konjunktiv I coincides with the indicative (typical for plural and 1st-person), Konjunktiv II is required — flag this in moodCheck. Set moodCheck.used to "K1", "K2", "indicative", or "other". Set moodCheck.ok=true when the chosen mood is appropriate for the source quote.';function p(r){return r.trim().toLowerCase().replace(/\s+/g," ")}function f(r,e){const t=p(e)===p(r.referenceAnswer);return{verdict:t?"correct":"incorrect",expected:r.referenceAnswer,acceptedVariants:[],feedback:"Grader unavailable — fallback to reference match.",moodCheck:{used:"other",ok:t}}}function x(r,e){if(!r||typeof r!="object")return null;const t=r,i=["correct","partially_correct","incorrect"],o=["K1","K2","indicative","other"];if(typeof t.verdict!="string"||!i.includes(t.verdict)||typeof t.expected!="string"||!Array.isArray(t.acceptedVariants)||t.acceptedVariants.some(s=>typeof s!="string")||typeof t.feedback!="string")return null;const n=t.moodCheck;return!n||typeof n!="object"||typeof n.used!="string"||!o.includes(n.used)||typeof n.ok!="boolean"?null:{verdict:t.verdict,expected:e.referenceAnswer,acceptedVariants:t.acceptedVariants,feedback:t.feedback,moodCheck:{used:n.used,ok:n.ok}}}async function E(r,e,t,i){const o=`Source quote:
${t.source}

Canonical indirect-speech reference:
${t.referenceAnswer}

Expected mood: ${t.expectedMood}

Student's submitted answer:
${i.trim()||"(empty)"}`;try{const s=(await r.models.generateContent({model:e,contents:o,config:{systemInstruction:j,responseMimeType:"application/json",responseSchema:I,temperature:0}})).text??"",a=JSON.parse(s),l=x(a,t);return l===null?f(t,i):l}catch{return f(t,i)}}export{g as K,k as a,y as b,S as c,A as g,E as j};
