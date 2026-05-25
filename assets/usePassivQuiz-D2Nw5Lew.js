import{d as v,a as b,e as w,T as u,b as T,P as k}from"./passiv-ZktdfAFW.js";const p=new Set(u);function S(r,t){const e=t.toLowerCase();switch(r){case"vorgangspassiv":return/\b(wird|wurde|werde|wurden|worden|werden)\b/.test(e)&&/(ge\w+t|ge\w+en)\b/.test(e);case"zustandspassiv":return/\b(ist|sind|war|waren)\b/.test(e)&&/(ge\w+t|ge\w+en)\b/.test(e);case"sich-lassen":return/l(a|ä)ss/.test(e)&&/sich/.test(e);case"sein-zu":return/\b(ist|sind|war|waren)\b/.test(e)&&/\bzu\s+\w+en\b/.test(e);case"bar-adjektiv":return/\w+(bar|lich)\b/.test(e);case"man-konstruktion":return/\bman\b/.test(e)}}function A(r){if(!r||typeof r!="object")return null;const t=r;if(typeof t.active!="string"||t.active.trim().length===0||typeof t.target!="string"||!Array.isArray(t.legalTypes)||t.legalTypes.length===0||typeof t.referenceAnswer!="string"||t.referenceAnswer.trim().length===0||typeof t.rationale!="string"||t.rationale.trim().length===0||typeof t.difficulty!="string"||!p.has(t.target)||!k.includes(t.difficulty))return null;for(const e of t.legalTypes)if(typeof e!="string"||!p.has(e))return null;return!t.legalTypes.includes(t.target)||!S(t.target,t.referenceAnswer)?null:{active:t.active.trim(),target:t.target,legalTypes:t.legalTypes,referenceAnswer:t.referenceAnswer.trim(),rationale:t.rationale.trim(),difficulty:t.difficulty}}const I=["industrial production","medical procedures","culinary techniques","IT and software","construction site","newsroom journalism","civic administration","scientific research","live theatre","logistics and shipping","gardening","classroom teaching","orchestra rehearsal","firefighting","museum curation","sports broadcasting","restaurant kitchen","archaeology","banking and finance","film post-production","animal welfare","urban planning","aviation","haute couture"];function P(r,t){const e=[...I],a=[],s=Math.min(r,e.length);for(let n=0;n<s;n++){const i=Math.floor(t()*e.length);a.push(e.splice(i,1)[0])}return a}function E(r,t,e,a=Math.random){const s=e&&e.length>0&&e.length<u.length?`Bias the chosen "target" toward: ${e.join(", ")}.`:'Distribute "target" choices across the six transformation types.',n=P(Math.max(4,Math.min(8,r)),a),i=Math.floor(a()*1e6).toString(36);return`Generate ${r} active German sentences for a Passiv transformation drill.

DIFFICULTY: ${t}
${T[t]}

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
- "difficulty" is exactly "${t}".
- ${s}
- Vary verbs across the batch — draw each sentence from a DIFFERENT domain in
  this rotating pool (do not reuse a domain twice, do not default to generic
  "Das Gerät" templates): ${n.join(" · ")}.
- Batch variation seed (use as inspiration, do not echo): ${i}.

Return ONLY valid JSON matching the schema. No prose. No markdown fences.`}async function M(r,t){const e=t.maxRetries;let a=0,s=0;const n=[];for(;n.length<t.count&&s<=e;){s++;const i=t.count-n.length,c=E(i,t.difficulty,t.focusedTypes),g=(await r.models.generateContent({model:t.model,contents:c,config:{responseMimeType:"application/json",responseSchema:v,temperature:.9,topP:.95}})).text??"";let o;try{o=JSON.parse(g)}catch{continue}if(!o||typeof o!="object")continue;const f=o.entries;if(Array.isArray(f))for(const y of f){const d=A(y);if(d===null){a++;continue}if(n.push({id:`passiv-${Date.now()}-${n.length}`,...d}),n.length>=t.count)break}}return{entries:n,rejected:a,attempts:s}}const j='You grade German Passiv and Passiv-alternative transformations. The student was asked to produce a SPECIFIC transformation type. Identify which type the student actually produced (vorgangspassiv, zustandspassiv, sich-lassen, sein-zu, bar-adjektiv, man-konstruktion, or "unknown"), set formCheck.usedType and formCheck.matchesTarget accordingly. Reject answers that are grammatically correct but use the wrong type — verdict "partially_correct" — and explain the type mismatch in feedback.';function h(r){return r.trim().toLowerCase().replace(/\s+/g," ")}function m(r,t){const e=h(t)===h(r.referenceAnswer);return{verdict:e?"correct":"incorrect",expected:r.referenceAnswer,acceptedVariants:[],feedback:"Grader unavailable — fallback to reference match.",formCheck:{usedType:"unknown",matchesTarget:e}}}function x(r,t){if(!r||typeof r!="object")return null;const e=r,a=["correct","partially_correct","incorrect"],s=[...u,"unknown"];if(typeof e.verdict!="string"||!a.includes(e.verdict)||typeof e.expected!="string"||!Array.isArray(e.acceptedVariants)||e.acceptedVariants.some(i=>typeof i!="string")||typeof e.feedback!="string")return null;const n=e.formCheck;return!n||typeof n!="object"||typeof n.usedType!="string"||!s.includes(n.usedType)||typeof n.matchesTarget!="boolean"?null:{verdict:e.verdict,expected:t.referenceAnswer,acceptedVariants:e.acceptedVariants,feedback:e.feedback,formCheck:{usedType:n.usedType,matchesTarget:n.matchesTarget}}}async function R(r,t,e,a){const s=`Active source:
${e.active}

Target transformation: ${e.target} (${b[e.target]})

Canonical reference:
${e.referenceAnswer}

Student's submitted answer:
${a.trim()||"(empty)"}`;try{const i=(await r.models.generateContent({model:t,contents:s,config:{systemInstruction:j,responseMimeType:"application/json",responseSchema:w,temperature:0}})).text??"",c=JSON.parse(i),l=x(c,e);return l===null?m(e,a):l}catch{return m(e,a)}}export{M as g,R as j};
