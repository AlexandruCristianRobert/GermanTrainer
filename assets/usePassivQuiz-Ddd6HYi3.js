import{d as v,c as b,e as w,T as u,a as T,P as k}from"./passiv-C98qRAMm.js";const d=new Set(u);function S(r,e){const t=e.toLowerCase();switch(r){case"vorgangspassiv":return/\b(wird|wurde|werde|wurden|worden|werden)\b/.test(t)&&/(ge\w+t|ge\w+en)\b/.test(t);case"zustandspassiv":return/\b(ist|sind|war|waren)\b/.test(t)&&/(ge\w+t|ge\w+en)\b/.test(t);case"sich-lassen":return/l(a|ä)ss/.test(t)&&/sich/.test(t);case"sein-zu":return/\b(ist|sind|war|waren)\b/.test(t)&&/\bzu\s+\w+en\b/.test(t);case"bar-adjektiv":return/\w+(bar|lich)\b/.test(t);case"man-konstruktion":return/\bman\b/.test(t)}}function A(r){if(!r||typeof r!="object")return null;const e=r;if(typeof e.active!="string"||e.active.trim().length===0||typeof e.target!="string"||!Array.isArray(e.legalTypes)||e.legalTypes.length===0||typeof e.referenceAnswer!="string"||e.referenceAnswer.trim().length===0||typeof e.rationale!="string"||e.rationale.trim().length===0||typeof e.difficulty!="string"||!d.has(e.target)||!k.includes(e.difficulty))return null;for(const t of e.legalTypes)if(typeof t!="string"||!d.has(t))return null;return!e.legalTypes.includes(e.target)||!S(e.target,e.referenceAnswer)?null:{active:e.active.trim(),target:e.target,legalTypes:e.legalTypes,referenceAnswer:e.referenceAnswer.trim(),rationale:e.rationale.trim(),difficulty:e.difficulty}}function I(r,e,t){const a=t&&t.length>0&&t.length<u.length?`Bias the chosen "target" toward: ${t.join(", ")}.`:'Distribute "target" choices across the six transformation types.';return`Generate ${r} active German sentences for a Passiv transformation drill.

DIFFICULTY: ${e}
${T[e]}

REQUIREMENTS for every entry:
- "active" is a single active sentence in German.
- "legalTypes" enumerates every transformation that is grammatically legal
  for this verb. Exclude:
  * "zustandspassiv" for verbs without a resultant state.
  * "bar-adjektiv" for verbs that don't form a -bar/-lich adjective.
  * "sein-zu" when the modal nuance is unnatural.
  * All passive forms except "man-konstruktion" for intransitive verbs.
- "target" MUST be one of the entries in "legalTypes".
- "referenceAnswer" is the canonical rewrite of "active" into the "target"
  transformation. Examples:
  * vorgangspassiv:  "Das Gerät wird repariert."
  * zustandspassiv:  "Das Gerät ist repariert."
  * sich-lassen:     "Das Gerät lässt sich reparieren."
  * sein-zu:         "Das Gerät ist zu reparieren."
  * bar-adjektiv:    "Das Gerät ist reparierbar."
  * man-konstruktion: "Man repariert das Gerät."
- "rationale" is a short English explanation (one sentence) of WHY this
  transformation is appropriate and how the form is built.
- "difficulty" is exactly "${e}".
- ${a}
- Vary verbs across the batch.

Return ONLY valid JSON matching the schema. No prose. No markdown fences.`}async function j(r,e){const t=e.maxRetries;let a=0,s=0;const n=[];for(;n.length<e.count&&s<=t;){s++;const i=e.count-n.length,o=I(i,e.difficulty,e.focusedTypes),h=(await r.models.generateContent({model:e.model,contents:o,config:{responseMimeType:"application/json",responseSchema:v,temperature:.4}})).text??"";let c;try{c=JSON.parse(h)}catch{continue}if(!c||typeof c!="object")continue;const f=c.entries;if(Array.isArray(f))for(const y of f){const p=A(y);if(p===null){a++;continue}if(n.push({id:`passiv-${Date.now()}-${n.length}`,...p}),n.length>=e.count)break}}return{entries:n,rejected:a,attempts:s}}const E='You grade German Passiv and Passiv-alternative transformations. The student was asked to produce a SPECIFIC transformation type. Identify which type the student actually produced (vorgangspassiv, zustandspassiv, sich-lassen, sein-zu, bar-adjektiv, man-konstruktion, or "unknown"), set formCheck.usedType and formCheck.matchesTarget accordingly. Reject answers that are grammatically correct but use the wrong type — verdict "partially_correct" — and explain the type mismatch in feedback.';function g(r){return r.trim().toLowerCase().replace(/\s+/g," ")}function m(r,e){const t=g(e)===g(r.referenceAnswer);return{verdict:t?"correct":"incorrect",expected:r.referenceAnswer,acceptedVariants:[],feedback:"Grader unavailable — fallback to reference match.",formCheck:{usedType:"unknown",matchesTarget:t}}}function P(r,e){if(!r||typeof r!="object")return null;const t=r,a=["correct","partially_correct","incorrect"],s=[...u,"unknown"];if(typeof t.verdict!="string"||!a.includes(t.verdict)||typeof t.expected!="string"||!Array.isArray(t.acceptedVariants)||t.acceptedVariants.some(i=>typeof i!="string")||typeof t.feedback!="string")return null;const n=t.formCheck;return!n||typeof n!="object"||typeof n.usedType!="string"||!s.includes(n.usedType)||typeof n.matchesTarget!="boolean"?null:{verdict:t.verdict,expected:e.referenceAnswer,acceptedVariants:t.acceptedVariants,feedback:t.feedback,formCheck:{usedType:n.usedType,matchesTarget:n.matchesTarget}}}async function x(r,e,t,a){const s=`Active source:
${t.active}

Target transformation: ${t.target} (${b[t.target]})

Canonical reference:
${t.referenceAnswer}

Student's submitted answer:
${a.trim()||"(empty)"}`;try{const i=(await r.models.generateContent({model:e,contents:s,config:{systemInstruction:E,responseMimeType:"application/json",responseSchema:w,temperature:0}})).text??"",o=JSON.parse(i),l=P(o,t);return l===null?m(t,a):l}catch{return m(t,a)}}export{j as g,x as j};
