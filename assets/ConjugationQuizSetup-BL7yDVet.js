import{p as se,y as A,s as k,q as b,d as H,n as _,_ as V,z as ae,C as K,E as ne,br as ie,l as x,r as B,i as re,Y as ue,c as y,w as a,u as l,N,o,b as n,h as i,B as G,f as p,k as E,Z as z,j as $,t as w,a as oe,bs as de,a2 as ve}from"./index-Cw4Xx764.js";import{V as L,a as O,b as q,c as Y,T as pe,P as fe,d as ce,u as me}from"./useVerbs-BdUJdUcV.js";import{N as D,a as T,b as ge,c as I}from"./RadioGroup-BVIbKizk.js";import{N as U}from"./Alert-RoyAjIXg.js";import{N as be}from"./InputNumber-D8OgHUlB.js";import{N as ye}from"./Tag-Bkbiqm2W.js";import"./Input-j-9Qs7CG.js";const xe=se("divider",`
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
 `),b("title-position-left",[k("line",[b("left",{width:"28px"})])]),b("title-position-right",[k("line",[b("right",{width:"28px"})])]),b("dashed",[k("line",`
 background-color: #0000;
 height: 0px;
 width: 100%;
 border-style: dashed;
 border-width: 1px 0 0;
 `)]),b("vertical",`
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
 `),A("dashed",[k("line",{backgroundColor:"var(--n-color)"})]),b("dashed",[k("line",{borderColor:"var(--n-color)"})]),b("vertical",{backgroundColor:"var(--n-color)"})]),he=Object.assign(Object.assign({},K.props),{titlePlacement:{type:String,default:"center"},dashed:Boolean,vertical:Boolean}),J=H({name:"Divider",props:he,setup(m){const{mergedClsPrefixRef:c,inlineThemeDisabled:h}=ae(m),d=K("Divider","-divider",xe,ie,m,c),v=x(()=>{const{common:{cubicBezierEaseInOut:s},self:{color:f,textColor:g,fontWeight:R}}=d.value;return{"--n-bezier":s,"--n-color":f,"--n-text-color":g,"--n-font-weight":R}}),u=h?ne("divider",void 0,v,m):void 0;return{mergedClsPrefix:c,cssVars:h?void 0:v,themeClass:u==null?void 0:u.themeClass,onRender:u==null?void 0:u.onRender}},render(){var m;const{$slots:c,titlePlacement:h,vertical:d,dashed:v,cssVars:u,mergedClsPrefix:s}=this;return(m=this.onRender)===null||m===void 0||m.call(this),_("div",{role:"separator",class:[`${s}-divider`,this.themeClass,{[`${s}-divider--vertical`]:d,[`${s}-divider--no-title`]:!c.default,[`${s}-divider--dashed`]:v,[`${s}-divider--title-position-${h}`]:c.default&&h}],style:u},d?null:_("div",{class:`${s}-divider__line ${s}-divider__line--left`}),!d&&c.default?_(V,null,_("div",{class:`${s}-divider__title`},this.$slots),_("div",{class:`${s}-divider__line ${s}-divider__line--right`})):null)}}),Ce={style:{"font-weight":"600",margin:"6px 0"}},ke=["onClick"],Ne=["checked","disabled"],Ee={key:1,style:{opacity:"0.7","margin-top":"8px"}},F="verbConjQuiz",we=H({__name:"ConjugationQuizSetup",setup(m){const c=oe(),{filter:h}=me(),d=B([...L]),v=B([...O]),u=B([...q]),s=B(["praesens"]),f=B(10),g=B(10);function R(){try{const r=localStorage.getItem(F);if(!r)return;const e=JSON.parse(r);e.levels&&(d.value=e.levels.filter(t=>L.includes(t))),e.types&&(v.value=e.types.filter(t=>O.includes(t))),e.cases&&(u.value=e.cases.filter(t=>q.includes(t))),e.tenses&&(s.value=e.tenses.filter(t=>Y.includes(t))),e.preset!==void 0&&(f.value=e.preset),e.customCount!==void 0&&(g.value=e.customCount)}catch{}}function W(){try{const r={levels:d.value,types:v.value,cases:u.value,tenses:s.value,preset:f.value,customCount:g.value};localStorage.setItem(F,JSON.stringify(r))}catch{}}re(R),ue([d,v,u,s,f,g],W,{deep:!0});const M=x(()=>h({levels:d.value,types:v.value,cases:u.value})),S=x(()=>M.value.length),Q=x(()=>M.value.some(r=>r.case==="accusative"||r.case==="dative+accusative")),Z=x(()=>f.value==="all"?S.value:f.value==="custom"?g.value:f.value),j=x(()=>Math.min(Z.value,S.value)),X=x(()=>j.value*s.value.length),ee=x(()=>{const r={A1:[],A2:[],B1:[],B2:[],C1:[]};for(const e of Y)r[ce[e]].push(e);return r});function P(r){return fe.has(r)&&!Q.value}function te(r){if(P(r))return;const e=s.value.indexOf(r);e>=0?s.value.splice(e,1):s.value.push(r)}function le(){c.push({name:"verbs-conjugation-run",query:{count:String(j.value),levels:d.value.join(","),types:v.value.join(","),cases:u.value.join(","),tenses:s.value.join(",")}})}return(r,e)=>(o(),y(l(N),{vertical:"",size:"large",style:{"max-width":"720px"}},{default:a(()=>[n(l(N),{justify:"space-between",align:"center"},{default:a(()=>[e[7]||(e[7]=i("h2",{style:{margin:"0"}},"Conjugation quiz setup",-1)),n(l(G),{onClick:e[0]||(e[0]=t=>l(c).push("/verbs/cheatsheet"))},{default:a(()=>[...e[6]||(e[6]=[p("Open cheatsheet",-1)])]),_:1})]),_:1}),i("div",null,[e[11]||(e[11]=i("p",null,[i("strong",null,"Verb filters")],-1)),n(l(N),{wrap:!0,size:"large"},{default:a(()=>[i("div",null,[e[8]||(e[8]=i("p",null,"Level",-1)),n(l(D),{value:d.value,"onUpdate:value":e[1]||(e[1]=t=>d.value=t)},{default:a(()=>[n(l(N),null,{default:a(()=>[(o(!0),E(V,null,z(l(L),t=>(o(),y(l(I),{key:t,value:t,label:t},null,8,["value","label"]))),128))]),_:1})]),_:1},8,["value"])]),i("div",null,[e[9]||(e[9]=i("p",null,"Type",-1)),n(l(D),{value:v.value,"onUpdate:value":e[2]||(e[2]=t=>v.value=t)},{default:a(()=>[n(l(N),{wrap:!0},{default:a(()=>[(o(!0),E(V,null,z(l(O),t=>(o(),y(l(I),{key:t,value:t,label:t},null,8,["value","label"]))),128))]),_:1})]),_:1},8,["value"])]),i("div",null,[e[10]||(e[10]=i("p",null,"Case",-1)),n(l(D),{value:u.value,"onUpdate:value":e[3]||(e[3]=t=>u.value=t)},{default:a(()=>[n(l(N),{wrap:!0},{default:a(()=>[(o(!0),E(V,null,z(l(q),t=>(o(),y(l(I),{key:t,value:t,label:t},null,8,["value","label"]))),128))]),_:1})]),_:1},8,["value"])])]),_:1})]),n(l(J)),i("div",null,[e[13]||(e[13]=i("p",null,[i("strong",null,"Tenses")],-1)),Q.value?$("",!0):(o(),y(l(U),{key:0,type:"info",style:{"margin-bottom":"8px"}},{default:a(()=>[...e[12]||(e[12]=[p(" Passive tenses are disabled — your verb filter has no transitive (accusative) verbs. ",-1)])]),_:1})),(o(),E(V,null,z(["A1","A2","B1","B2","C1"],t=>i("div",{key:t,style:{"margin-bottom":"12px"}},[i("p",Ce,w(t),1),n(l(N),{wrap:!0},{default:a(()=>[(o(!0),E(V,null,z(ee.value[t],C=>(o(),E("label",{key:C,class:de(["tense-chip",{disabled:P(C),selected:s.value.includes(C)}]),onClick:Se=>te(C)},[i("input",{type:"checkbox",checked:s.value.includes(C),disabled:P(C),style:{"margin-right":"6px"}},null,8,Ne),p(" "+w(l(pe)[C])+" ",1),n(l(ye),{size:"small",bordered:!1,style:{"margin-left":"6px"}},{default:a(()=>[p(w(t),1)]),_:2},1024)],10,ke))),128))]),_:2},1024)])),64))]),n(l(J)),i("div",null,[e[18]||(e[18]=i("p",null,[i("strong",null,"Number of verbs")],-1)),n(l(ge),{value:f.value,"onUpdate:value":e[4]||(e[4]=t=>f.value=t)},{default:a(()=>[n(l(T),{value:10},{default:a(()=>[...e[14]||(e[14]=[p("10",-1)])]),_:1}),n(l(T),{value:15},{default:a(()=>[...e[15]||(e[15]=[p("15",-1)])]),_:1}),n(l(T),{value:20},{default:a(()=>[...e[16]||(e[16]=[p("20",-1)])]),_:1}),n(l(T),{value:"all"},{default:a(()=>[p("All ("+w(S.value)+")",1)]),_:1}),n(l(T),{value:"custom"},{default:a(()=>[...e[17]||(e[17]=[p("Custom",-1)])]),_:1})]),_:1},8,["value"]),f.value==="custom"?(o(),y(l(be),{key:0,value:g.value,"onUpdate:value":e[5]||(e[5]=t=>g.value=t),min:1,max:S.value||1,style:{"margin-top":"8px",width:"100%"}},null,8,["value","max"])):$("",!0),s.value.length>0?(o(),E("p",Ee," ≈ "+w(X.value)+" questions ("+w(j.value)+" verbs × "+w(s.value.length)+" tenses) ",1)):$("",!0)]),S.value===0?(o(),y(l(U),{key:0,type:"warning"},{default:a(()=>[...e[19]||(e[19]=[p("No verbs match the selected filters.",-1)])]),_:1})):s.value.length===0?(o(),y(l(U),{key:1,type:"warning"},{default:a(()=>[...e[20]||(e[20]=[p("Pick at least one tense.",-1)])]),_:1})):$("",!0),n(l(G),{type:"primary",disabled:S.value===0||s.value.length===0,onClick:le},{default:a(()=>[...e[21]||(e[21]=[p(" Start quiz ",-1)])]),_:1},8,["disabled"])]),_:1}))}}),je=ve(we,[["__scopeId","data-v-d40595c3"]]);export{je as default};
