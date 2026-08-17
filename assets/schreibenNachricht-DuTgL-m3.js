function C(n){const r=n.betreff.trim(),e=n.anrede.trim(),c=n.text.trim(),i=n.gruss.trim(),s=r?`Betreff: ${r}`:"",o=[e,c].filter(t=>t!=="").join(`
`);return[s,o,i].filter(t=>t!=="").join(`

`)}const f=100,T=120,a=160,_=1500;function H(n){return n<f?"under":n<=a?"ok":"over"}function R(n){return n<300?"planen":n<1200?"schreiben":n<=1500?"pruefen":"ueberzeit"}const h="gt:lastSchreibenTeil2";export{h as N,T as a,f as b,C as c,_ as d,R as e,H as n};
