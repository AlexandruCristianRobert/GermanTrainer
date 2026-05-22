import{H as se,S as ae,aw as A,T as k,a6 as y,d as J,K as _,F as V,M as ne,Z as K,O as ie,l as h,r as B,i as re,n as oe,c as x,w as a,u as l,N,o as d,b as n,h as i,B as G,f as p,k as S,p as z,j as $,t as w,a as ue,bj as de}from"./index-VVK-nuYI.js";import{V as L,a as O,b as D,c as W,T as ve,P as pe,d as fe,u as ce}from"./useVerbs-Ba67V7gn.js";import{N as I,a as T,b as me,c as q}from"./RadioGroup-Cm0I_2oC.js";import{N as M}from"./Alert-DpydDzji.js";import{N as ge}from"./InputNumber-jNnkd4Tb.js";import{N as be}from"./Tag-BxScK3kg.js";import{_ as ye}from"./_plugin-vue_export-helper-DlAUqK2U.js";import"./Input-BtRArBLT.js";function xe(m){const{textColor1:f,dividerColor:g,fontWeightStrong:u}=m;return{textColor:f,color:g,fontWeight:u}}const he={common:se,self:xe},Ce=ae("divider",`
 position: relative;
 display: flex;
 width: 100%;
 box-sizing: border-box;
 font-size: 16px;
 color: var(--n-text-color);
 transition:
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
`,[A("vertical",`
 margin-top: 24px;
 margin-bottom: 24px;
 `,[A("no-title",`
 display: flex;
 align-items: center;
 `)]),k("title",`
 display: flex;
 align-items: center;
 margin-left: 12px;
 margin-right: 12px;
 white-space: nowrap;
 font-weight: var(--n-font-weight);
 `),y("title-position-left",[k("line",[y("left",{width:"28px"})])]),y("title-position-right",[k("line",[y("right",{width:"28px"})])]),y("dashed",[k("line",`
 background-color: #0000;
 height: 0px;
 width: 100%;
 border-style: dashed;
 border-width: 1px 0 0;
 `)]),y("vertical",`
 display: inline-block;
 height: 1em;
 margin: 0 8px;
 vertical-align: middle;
 width: 1px;
 `),k("line",`
 border: none;
 transition: background-color .3s var(--n-bezier), border-color .3s var(--n-bezier);
 height: 1px;
 width: 100%;
 margin: 0;
 `),A("dashed",[k("line",{backgroundColor:"var(--n-color)"})]),y("dashed",[k("line",{borderColor:"var(--n-color)"})]),y("vertical",{backgroundColor:"var(--n-color)"})]),ke=Object.assign(Object.assign({},K.props),{titlePlacement:{type:String,default:"center"},dashed:Boolean,vertical:Boolean}),F=J({name:"Divider",props:ke,setup(m){const{mergedClsPrefixRef:f,inlineThemeDisabled:g}=ne(m),u=K("Divider","-divider",Ce,he,m,f),v=h(()=>{const{common:{cubicBezierEaseInOut:s},self:{color:c,textColor:b,fontWeight:j}}=u.value;return{"--n-bezier":s,"--n-color":c,"--n-text-color":b,"--n-font-weight":j}}),o=g?ie("divider",void 0,v,m):void 0;return{mergedClsPrefix:f,cssVars:g?void 0:v,themeClass:o==null?void 0:o.themeClass,onRender:o==null?void 0:o.onRender}},render(){var m;const{$slots:f,titlePlacement:g,vertical:u,dashed:v,cssVars:o,mergedClsPrefix:s}=this;return(m=this.onRender)===null||m===void 0||m.call(this),_("div",{role:"separator",class:[`${s}-divider`,this.themeClass,{[`${s}-divider--vertical`]:u,[`${s}-divider--no-title`]:!f.default,[`${s}-divider--dashed`]:v,[`${s}-divider--title-position-${g}`]:f.default&&g}],style:o},u?null:_("div",{class:`${s}-divider__line ${s}-divider__line--left`}),!u&&f.default?_(V,null,_("div",{class:`${s}-divider__title`},this.$slots),_("div",{class:`${s}-divider__line ${s}-divider__line--right`})):null)}}),Ne={style:{"font-weight":"600",margin:"6px 0"}},Se=["onClick"],we=["checked","disabled"],Ee={key:1,style:{opacity:"0.7","margin-top":"8px"}},H="verbConjQuiz",Be=J({__name:"ConjugationQuizSetup",setup(m){const f=ue(),{filter:g}=ce(),u=B([...L]),v=B([...O]),o=B([...D]),s=B(["praesens"]),c=B(10),b=B(10);function j(){try{const r=localStorage.getItem(H);if(!r)return;const e=JSON.parse(r);e.levels&&(u.value=e.levels.filter(t=>L.includes(t))),e.types&&(v.value=e.types.filter(t=>O.includes(t))),e.cases&&(o.value=e.cases.filter(t=>D.includes(t))),e.tenses&&(s.value=e.tenses.filter(t=>W.includes(t))),e.preset!==void 0&&(c.value=e.preset),e.customCount!==void 0&&(b.value=e.customCount)}catch{}}function Y(){try{const r={levels:u.value,types:v.value,cases:o.value,tenses:s.value,preset:c.value,customCount:b.value};localStorage.setItem(H,JSON.stringify(r))}catch{}}re(j),oe([u,v,o,s,c,b],Y,{deep:!0});const U=h(()=>g({levels:u.value,types:v.value,cases:o.value})),E=h(()=>U.value.length),Q=h(()=>U.value.some(r=>r.case==="accusative"||r.case==="dative+accusative")),Z=h(()=>c.value==="all"?E.value:c.value==="custom"?b.value:c.value),R=h(()=>Math.min(Z.value,E.value)),X=h(()=>R.value*s.value.length),ee=h(()=>{const r={A1:[],A2:[],B1:[],B2:[],C1:[]};for(const e of W)r[fe[e]].push(e);return r});function P(r){return pe.has(r)&&!Q.value}function te(r){if(P(r))return;const e=s.value.indexOf(r);e>=0?s.value.splice(e,1):s.value.push(r)}function le(){f.push({name:"verbs-conjugation-run",query:{count:String(R.value),levels:u.value.join(","),types:v.value.join(","),cases:o.value.join(","),tenses:s.value.join(",")}})}return(r,e)=>(d(),x(l(N),{vertical:"",size:"large",style:{"max-width":"720px"}},{default:a(()=>[n(l(N),{justify:"space-between",align:"center"},{default:a(()=>[e[7]||(e[7]=i("h2",{style:{margin:"0"}},"Conjugation quiz setup",-1)),n(l(G),{onClick:e[0]||(e[0]=t=>l(f).push("/verbs/cheatsheet"))},{default:a(()=>[...e[6]||(e[6]=[p("Open cheatsheet",-1)])]),_:1})]),_:1}),i("div",null,[e[11]||(e[11]=i("p",null,[i("strong",null,"Verb filters")],-1)),n(l(N),{wrap:!0,size:"large"},{default:a(()=>[i("div",null,[e[8]||(e[8]=i("p",null,"Level",-1)),n(l(I),{value:u.value,"onUpdate:value":e[1]||(e[1]=t=>u.value=t)},{default:a(()=>[n(l(N),null,{default:a(()=>[(d(!0),S(V,null,z(l(L),t=>(d(),x(l(q),{key:t,value:t,label:t},null,8,["value","label"]))),128))]),_:1})]),_:1},8,["value"])]),i("div",null,[e[9]||(e[9]=i("p",null,"Type",-1)),n(l(I),{value:v.value,"onUpdate:value":e[2]||(e[2]=t=>v.value=t)},{default:a(()=>[n(l(N),{wrap:!0},{default:a(()=>[(d(!0),S(V,null,z(l(O),t=>(d(),x(l(q),{key:t,value:t,label:t},null,8,["value","label"]))),128))]),_:1})]),_:1},8,["value"])]),i("div",null,[e[10]||(e[10]=i("p",null,"Case",-1)),n(l(I),{value:o.value,"onUpdate:value":e[3]||(e[3]=t=>o.value=t)},{default:a(()=>[n(l(N),{wrap:!0},{default:a(()=>[(d(!0),S(V,null,z(l(D),t=>(d(),x(l(q),{key:t,value:t,label:t},null,8,["value","label"]))),128))]),_:1})]),_:1},8,["value"])])]),_:1})]),n(l(F)),i("div",null,[e[13]||(e[13]=i("p",null,[i("strong",null,"Tenses")],-1)),Q.value?$("",!0):(d(),x(l(M),{key:0,type:"info",style:{"margin-bottom":"8px"}},{default:a(()=>[...e[12]||(e[12]=[p(" Passive tenses are disabled — your verb filter has no transitive (accusative) verbs. ",-1)])]),_:1})),(d(),S(V,null,z(["A1","A2","B1","B2","C1"],t=>i("div",{key:t,style:{"margin-bottom":"12px"}},[i("p",Ne,w(t),1),n(l(N),{wrap:!0},{default:a(()=>[(d(!0),S(V,null,z(ee.value[t],C=>(d(),S("label",{key:C,class:de(["tense-chip",{disabled:P(C),selected:s.value.includes(C)}]),onClick:Ve=>te(C)},[i("input",{type:"checkbox",checked:s.value.includes(C),disabled:P(C),style:{"margin-right":"6px"}},null,8,we),p(" "+w(l(ve)[C])+" ",1),n(l(be),{size:"small",bordered:!1,style:{"margin-left":"6px"}},{default:a(()=>[p(w(t),1)]),_:2},1024)],10,Se))),128))]),_:2},1024)])),64))]),n(l(F)),i("div",null,[e[18]||(e[18]=i("p",null,[i("strong",null,"Number of verbs")],-1)),n(l(me),{value:c.value,"onUpdate:value":e[4]||(e[4]=t=>c.value=t)},{default:a(()=>[n(l(T),{value:10},{default:a(()=>[...e[14]||(e[14]=[p("10",-1)])]),_:1}),n(l(T),{value:15},{default:a(()=>[...e[15]||(e[15]=[p("15",-1)])]),_:1}),n(l(T),{value:20},{default:a(()=>[...e[16]||(e[16]=[p("20",-1)])]),_:1}),n(l(T),{value:"all"},{default:a(()=>[p("All ("+w(E.value)+")",1)]),_:1}),n(l(T),{value:"custom"},{default:a(()=>[...e[17]||(e[17]=[p("Custom",-1)])]),_:1})]),_:1},8,["value"]),c.value==="custom"?(d(),x(l(ge),{key:0,value:b.value,"onUpdate:value":e[5]||(e[5]=t=>b.value=t),min:1,max:E.value||1,style:{"margin-top":"8px",width:"100%"}},null,8,["value","max"])):$("",!0),s.value.length>0?(d(),S("p",Ee," ≈ "+w(X.value)+" questions ("+w(R.value)+" verbs × "+w(s.value.length)+" tenses) ",1)):$("",!0)]),E.value===0?(d(),x(l(M),{key:0,type:"warning"},{default:a(()=>[...e[19]||(e[19]=[p("No verbs match the selected filters.",-1)])]),_:1})):s.value.length===0?(d(),x(l(M),{key:1,type:"warning"},{default:a(()=>[...e[20]||(e[20]=[p("Pick at least one tense.",-1)])]),_:1})):$("",!0),n(l(G),{type:"primary",disabled:E.value===0||s.value.length===0,onClick:le},{default:a(()=>[...e[21]||(e[21]=[p(" Start quiz ",-1)])]),_:1},8,["disabled"])]),_:1}))}}),Le=ye(Be,[["__scopeId","data-v-d40595c3"]]);export{Le as default};
