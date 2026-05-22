import{d as B,K as h,H as Z,S as w,a6 as k,T as g,U as i,bq as ne,aw as G,M as O,r as oe,ax as ae,Z as _,az as U,O as Q,l as T,I as se,a0 as ie,_ as V,br as de,bc as ue,by as ce,P as X,aj as pe,bw as K,bz as me,ab as ge,an as he,A as fe,at as q,Q as be,aM as ve,z as xe,aE as N,aW as we,aX as Ce,ae as W,c as ze,w as f,u as b,N as ye,o as Pe,h as e,b as v,f as t}from"./index-VVK-nuYI.js";const ke=B({name:"ChevronLeft",render(){return h("svg",{viewBox:"0 0 16 16",fill:"none",xmlns:"http://www.w3.org/2000/svg"},h("path",{d:"M10.3536 3.14645C10.5488 3.34171 10.5488 3.65829 10.3536 3.85355L6.20711 8L10.3536 12.1464C10.5488 12.3417 10.5488 12.6583 10.3536 12.8536C10.1583 13.0488 9.84171 13.0488 9.64645 12.8536L5.14645 8.35355C4.95118 8.15829 4.95118 7.84171 5.14645 7.64645L9.64645 3.14645C9.84171 2.95118 10.1583 2.95118 10.3536 3.14645Z",fill:"currentColor"}))}});function Se(l){const{fontWeight:n,textColor1:r,textColor2:s,textColorDisabled:d,dividerColor:o,fontSize:m}=l;return{titleFontSize:m,titleFontWeight:n,dividerColor:o,titleTextColor:r,titleTextColorDisabled:d,fontSize:m,textColor:s,arrowColor:s,arrowColorDisabled:d,itemMargin:"16px 0 0 0",titlePadding:"16px 0 0 0"}}const Re={common:Z,self:Se},Ie=w("collapse","width: 100%;",[w("collapse-item",`
 font-size: var(--n-font-size);
 color: var(--n-text-color);
 transition:
 color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 margin: var(--n-item-margin);
 `,[k("disabled",[g("header","cursor: not-allowed;",[g("header-main",`
 color: var(--n-title-text-color-disabled);
 `),w("collapse-item-arrow",`
 color: var(--n-arrow-color-disabled);
 `)])]),w("collapse-item","margin-left: 32px;"),i("&:first-child","margin-top: 0;"),i("&:first-child >",[g("header","padding-top: 0;")]),k("left-arrow-placement",[g("header",[w("collapse-item-arrow","margin-right: 4px;")])]),k("right-arrow-placement",[g("header",[w("collapse-item-arrow","margin-left: 4px;")])]),g("content-wrapper",[g("content-inner","padding-top: 16px;"),ne({duration:"0.15s"})]),k("active",[g("header",[k("active",[w("collapse-item-arrow","transform: rotate(90deg);")])])]),i("&:not(:first-child)","border-top: 1px solid var(--n-divider-color);"),G("disabled",[k("trigger-area-main",[g("header",[g("header-main","cursor: pointer;"),w("collapse-item-arrow","cursor: default;")])]),k("trigger-area-arrow",[g("header",[w("collapse-item-arrow","cursor: pointer;")])]),k("trigger-area-extra",[g("header",[g("header-extra","cursor: pointer;")])])]),g("header",`
 font-size: var(--n-title-font-size);
 display: flex;
 flex-wrap: nowrap;
 align-items: center;
 transition: color .3s var(--n-bezier);
 position: relative;
 padding: var(--n-title-padding);
 color: var(--n-title-text-color);
 `,[g("header-main",`
 display: flex;
 flex-wrap: nowrap;
 align-items: center;
 font-weight: var(--n-title-font-weight);
 transition: color .3s var(--n-bezier);
 flex: 1;
 color: var(--n-title-text-color);
 `),g("header-extra",`
 display: flex;
 align-items: center;
 transition: color .3s var(--n-bezier);
 color: var(--n-text-color);
 `),w("collapse-item-arrow",`
 display: flex;
 transition:
 transform .15s var(--n-bezier),
 color .3s var(--n-bezier);
 font-size: 18px;
 color: var(--n-arrow-color);
 `)])])]),Ne=Object.assign(Object.assign({},_.props),{defaultExpandedNames:{type:[Array,String],default:null},expandedNames:[Array,String],arrowPlacement:{type:String,default:"left"},accordion:{type:Boolean,default:!1},displayDirective:{type:String,default:"if"},triggerAreas:{type:Array,default:()=>["main","extra","arrow"]},onItemHeaderClick:[Function,Array],"onUpdate:expandedNames":[Function,Array],onUpdateExpandedNames:[Function,Array],onExpandedNamesChange:{type:[Function,Array],validator:()=>!0,default:void 0}}),J=se("n-collapse"),Ee=B({name:"Collapse",props:Ne,slots:Object,setup(l,{slots:n}){const{mergedClsPrefixRef:r,inlineThemeDisabled:s,mergedRtlRef:d}=O(l),o=oe(l.defaultExpandedNames),m=T(()=>l.expandedNames),S=ae(m,o),C=_("Collapse","-collapse",Ie,Re,l,r);function u(z){const{"onUpdate:expandedNames":c,onUpdateExpandedNames:y,onExpandedNamesChange:$}=l;y&&V(y,z),c&&V(c,z),$&&V($,z),o.value=z}function p(z){const{onItemHeaderClick:c}=l;c&&V(c,z)}function a(z,c,y){const{accordion:$}=l,{value:M}=S;if($)z?(u([c]),p({name:c,expanded:!0,event:y})):(u([]),p({name:c,expanded:!1,event:y}));else if(!Array.isArray(M))u([c]),p({name:c,expanded:!0,event:y});else{const I=M.slice(),D=I.findIndex(A=>c===A);~D?(I.splice(D,1),u(I),p({name:c,expanded:!1,event:y})):(I.push(c),u(I),p({name:c,expanded:!0,event:y}))}}ie(J,{props:l,mergedClsPrefixRef:r,expandedNamesRef:S,slots:n,toggleItem:a});const x=U("Collapse",d,r),E=T(()=>{const{common:{cubicBezierEaseInOut:z},self:{titleFontWeight:c,dividerColor:y,titlePadding:$,titleTextColor:M,titleTextColorDisabled:I,textColor:D,arrowColor:A,fontSize:j,titleFontSize:F,arrowColorDisabled:L,itemMargin:H}}=C.value;return{"--n-font-size":j,"--n-bezier":z,"--n-text-color":D,"--n-divider-color":y,"--n-title-padding":$,"--n-title-font-size":F,"--n-title-text-color":M,"--n-title-text-color-disabled":I,"--n-title-font-weight":c,"--n-arrow-color":A,"--n-arrow-color-disabled":L,"--n-item-margin":H}}),R=s?Q("collapse",void 0,E,l):void 0;return{rtlEnabled:x,mergedTheme:C,mergedClsPrefix:r,cssVars:s?void 0:E,themeClass:R==null?void 0:R.themeClass,onRender:R==null?void 0:R.onRender}},render(){var l;return(l=this.onRender)===null||l===void 0||l.call(this),h("div",{class:[`${this.mergedClsPrefix}-collapse`,this.rtlEnabled&&`${this.mergedClsPrefix}-collapse--rtl`,this.themeClass],style:this.cssVars},this.$slots)}}),$e=B({name:"CollapseItemContent",props:{displayDirective:{type:String,required:!0},show:Boolean,clsPrefix:{type:String,required:!0}},setup(l){return{onceTrue:ce(X(l,"show"))}},render(){return h(de,null,{default:()=>{const{show:l,displayDirective:n,onceTrue:r,clsPrefix:s}=this,d=n==="show"&&r,o=h("div",{class:`${s}-collapse-item__content-wrapper`},h("div",{class:`${s}-collapse-item__content-inner`},this.$slots));return d?ue(o,[[pe,l]]):l?o:null}})}}),Te={title:String,name:[String,Number],disabled:Boolean,displayDirective:String},P=B({name:"CollapseItem",props:Te,setup(l){const{mergedRtlRef:n}=O(l),r=ge(),s=he(()=>{var a;return(a=l.name)!==null&&a!==void 0?a:r}),d=xe(J);d||fe("collapse-item","`n-collapse-item` must be placed inside `n-collapse`.");const{expandedNamesRef:o,props:m,mergedClsPrefixRef:S,slots:C}=d,u=T(()=>{const{value:a}=o;if(Array.isArray(a)){const{value:x}=s;return!~a.findIndex(E=>E===x)}else if(a){const{value:x}=s;return x!==a}return!0});return{rtlEnabled:U("Collapse",n,S),collapseSlots:C,randomName:r,mergedClsPrefix:S,collapsed:u,triggerAreas:X(m,"triggerAreas"),mergedDisplayDirective:T(()=>{const{displayDirective:a}=l;return a||m.displayDirective}),arrowPlacement:T(()=>m.arrowPlacement),handleClick(a){let x="main";q(a,"arrow")&&(x="arrow"),q(a,"extra")&&(x="extra"),m.triggerAreas.includes(x)&&d&&!l.disabled&&d.toggleItem(u.value,s.value,a)}}},render(){const{collapseSlots:l,$slots:n,arrowPlacement:r,collapsed:s,mergedDisplayDirective:d,mergedClsPrefix:o,disabled:m,triggerAreas:S}=this,C=K(n.header,{collapsed:s},()=>[this.title]),u=n["header-extra"]||l["header-extra"],p=n.arrow||l.arrow;return h("div",{class:[`${o}-collapse-item`,`${o}-collapse-item--${r}-arrow-placement`,m&&`${o}-collapse-item--disabled`,!s&&`${o}-collapse-item--active`,S.map(a=>`${o}-collapse-item--trigger-area-${a}`)]},h("div",{class:[`${o}-collapse-item__header`,!s&&`${o}-collapse-item__header--active`]},h("div",{class:`${o}-collapse-item__header-main`,onClick:this.handleClick},r==="right"&&C,h("div",{class:`${o}-collapse-item-arrow`,key:this.rtlEnabled?0:1,"data-arrow":!0},K(p,{collapsed:s},()=>[h(be,{clsPrefix:o},{default:()=>this.rtlEnabled?h(ke,null):h(ve,null)})])),r==="left"&&C),me(u,{collapsed:s},a=>h("div",{class:`${o}-collapse-item__header-extra`,onClick:this.handleClick,"data-extra":!0},a))),h($e,{clsPrefix:o,displayDirective:d,show:!s},n))}}),Me={thPaddingSmall:"6px",thPaddingMedium:"12px",thPaddingLarge:"12px",tdPaddingSmall:"6px",tdPaddingMedium:"12px",tdPaddingLarge:"12px"};function De(l){const{dividerColor:n,cardColor:r,modalColor:s,popoverColor:d,tableHeaderColor:o,tableColorStriped:m,textColor1:S,textColor2:C,borderRadius:u,fontWeightStrong:p,lineHeight:a,fontSizeSmall:x,fontSizeMedium:E,fontSizeLarge:R}=l;return Object.assign(Object.assign({},Me),{fontSizeSmall:x,fontSizeMedium:E,fontSizeLarge:R,lineHeight:a,borderRadius:u,borderColor:N(r,n),borderColorModal:N(s,n),borderColorPopover:N(d,n),tdColor:r,tdColorModal:s,tdColorPopover:d,tdColorStriped:N(r,m),tdColorStripedModal:N(s,m),tdColorStripedPopover:N(d,m),thColor:N(r,o),thColorModal:N(s,o),thColorPopover:N(d,o),thTextColor:S,tdTextColor:C,thFontWeight:p})}const Be={common:Z,self:De},Ae=i([w("table",`
 font-size: var(--n-font-size);
 font-variant-numeric: tabular-nums;
 line-height: var(--n-line-height);
 width: 100%;
 border-radius: var(--n-border-radius) var(--n-border-radius) 0 0;
 text-align: left;
 border-collapse: separate;
 border-spacing: 0;
 overflow: hidden;
 background-color: var(--n-td-color);
 border-color: var(--n-merged-border-color);
 transition:
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
 --n-merged-border-color: var(--n-border-color);
 `,[i("th",`
 white-space: nowrap;
 transition:
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
 text-align: inherit;
 padding: var(--n-th-padding);
 vertical-align: inherit;
 text-transform: none;
 border: 0px solid var(--n-merged-border-color);
 font-weight: var(--n-th-font-weight);
 color: var(--n-th-text-color);
 background-color: var(--n-th-color);
 border-bottom: 1px solid var(--n-merged-border-color);
 border-right: 1px solid var(--n-merged-border-color);
 `,[i("&:last-child",`
 border-right: 0px solid var(--n-merged-border-color);
 `)]),i("td",`
 transition:
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
 padding: var(--n-td-padding);
 color: var(--n-td-text-color);
 background-color: var(--n-td-color);
 border: 0px solid var(--n-merged-border-color);
 border-right: 1px solid var(--n-merged-border-color);
 border-bottom: 1px solid var(--n-merged-border-color);
 `,[i("&:last-child",`
 border-right: 0px solid var(--n-merged-border-color);
 `)]),k("bordered",`
 border: 1px solid var(--n-merged-border-color);
 border-radius: var(--n-border-radius);
 `,[i("tr",[i("&:last-child",[i("td",`
 border-bottom: 0 solid var(--n-merged-border-color);
 `)])])]),k("single-line",[i("th",`
 border-right: 0px solid var(--n-merged-border-color);
 `),i("td",`
 border-right: 0px solid var(--n-merged-border-color);
 `)]),k("single-column",[i("tr",[i("&:not(:last-child)",[i("td",`
 border-bottom: 0px solid var(--n-merged-border-color);
 `)])])]),k("striped",[i("tr:nth-of-type(even)",[i("td","background-color: var(--n-td-color-striped)")])]),G("bottom-bordered",[i("tr",[i("&:last-child",[i("td",`
 border-bottom: 0px solid var(--n-merged-border-color);
 `)])])])]),we(w("table",`
 background-color: var(--n-td-color-modal);
 --n-merged-border-color: var(--n-border-color-modal);
 `,[i("th",`
 background-color: var(--n-th-color-modal);
 `),i("td",`
 background-color: var(--n-td-color-modal);
 `)])),Ce(w("table",`
 background-color: var(--n-td-color-popover);
 --n-merged-border-color: var(--n-border-color-popover);
 `,[i("th",`
 background-color: var(--n-th-color-popover);
 `),i("td",`
 background-color: var(--n-td-color-popover);
 `)]))]),Ve=Object.assign(Object.assign({},_.props),{bordered:{type:Boolean,default:!0},bottomBordered:{type:Boolean,default:!0},singleLine:{type:Boolean,default:!0},striped:Boolean,singleColumn:Boolean,size:String}),_e=B({name:"Table",props:Ve,setup(l){const{mergedClsPrefixRef:n,inlineThemeDisabled:r,mergedRtlRef:s,mergedComponentPropsRef:d}=O(l),o=T(()=>{var p,a;return l.size||((a=(p=d==null?void 0:d.value)===null||p===void 0?void 0:p.Table)===null||a===void 0?void 0:a.size)||"medium"}),m=_("Table","-table",Ae,Be,l,n),S=U("Table",s,n),C=T(()=>{const p=o.value,{self:{borderColor:a,tdColor:x,tdColorModal:E,tdColorPopover:R,thColor:z,thColorModal:c,thColorPopover:y,thTextColor:$,tdTextColor:M,borderRadius:I,thFontWeight:D,lineHeight:A,borderColorModal:j,borderColorPopover:F,tdColorStriped:L,tdColorStripedModal:H,tdColorStripedPopover:Y,[W("fontSize",p)]:ee,[W("tdPadding",p)]:re,[W("thPadding",p)]:te},common:{cubicBezierEaseInOut:le}}=m.value;return{"--n-bezier":le,"--n-td-color":x,"--n-td-color-modal":E,"--n-td-color-popover":R,"--n-td-text-color":M,"--n-border-color":a,"--n-border-color-modal":j,"--n-border-color-popover":F,"--n-border-radius":I,"--n-font-size":ee,"--n-th-color":z,"--n-th-color-modal":c,"--n-th-color-popover":y,"--n-th-font-weight":D,"--n-th-text-color":$,"--n-line-height":A,"--n-td-padding":re,"--n-th-padding":te,"--n-td-color-striped":L,"--n-td-color-striped-modal":H,"--n-td-color-striped-popover":Y}}),u=r?Q("table",T(()=>o.value[0]),C,l):void 0;return{rtlEnabled:S,mergedClsPrefix:n,cssVars:r?void 0:C,themeClass:u==null?void 0:u.themeClass,onRender:u==null?void 0:u.onRender}},render(){var l;const{mergedClsPrefix:n}=this;return(l=this.onRender)===null||l===void 0||l.call(this),h("table",{class:[`${n}-table`,this.themeClass,{[`${n}-table--rtl`]:this.rtlEnabled,[`${n}-table--bottom-bordered`]:this.bottomBordered,[`${n}-table--bordered`]:this.bordered,[`${n}-table--single-line`]:this.singleLine,[`${n}-table--single-column`]:this.singleColumn,[`${n}-table--striped`]:this.striped}],style:this.cssVars},this.$slots)}}),Fe=B({__name:"CheatSheet",setup(l){return(n,r)=>(Pe(),ze(b(ye),{vertical:"",size:"large",style:{"max-width":"760px"}},{default:f(()=>[r[12]||(r[12]=e("h2",null,"Conjugation cheatsheet",-1)),v(b(Ee),{"arrow-placement":"right","default-expanded-names":["1"]},{default:f(()=>[v(b(P),{title:"1. Regular (schwache) Verben — present endings",name:"1"},{default:f(()=>[...r[0]||(r[0]=[e("p",null,"Stem + -e / -st / -t / -en / -t / -en.",-1),e("p",null,[e("strong",null,"Bindevokal -e-:"),t(" stems ending in -d, -t, -chn, -ffn, -tm, -dn add -e- before -st and -t: "),e("em",null,"du arbeitest, er arbeitet, ihr arbeitet"),t(".")],-1),e("p",null,[e("strong",null,"-s / -ß / -z / -tz / -x stems:"),t(" du-form takes only -t, not -st: "),e("em",null,"du tanzt, du heißt, du sitzt"),t(".")],-1)])]),_:1}),v(b(P),{title:"2. Strong (starke) Verben — vowel changes in du/er",name:"2"},{default:f(()=>[...r[1]||(r[1]=[e("p",null,[e("strong",null,"a → ä:"),t(" fahren → du fährst, er fährt; schlafen → schläft; tragen → trägt.")],-1),e("p",null,[e("strong",null,"au → äu:"),t(" laufen → läufst, läuft.")],-1),e("p",null,[e("strong",null,"e → i:"),t(" geben → gibst, gibt; helfen → hilfst, hilft; nehmen → nimmst, nimmt; essen → isst.")],-1),e("p",null,[e("strong",null,"e → ie:"),t(" sehen → siehst, sieht; lesen → liest; empfehlen → empfiehlt.")],-1)])]),_:1}),v(b(P),{title:"3. Mixed (gemischte) Verben — irregular stem + weak endings",name:"3"},{default:f(()=>[...r[2]||(r[2]=[e("p",null,"bringen → brachte, gebracht • denken → dachte, gedacht • wissen → wusste, gewusst • kennen → kannte, gekannt • brennen → brannte, gebrannt.",-1)])]),_:1}),v(b(P),{title:"4. Modalverben — full conjugation",name:"4"},{default:f(()=>[v(b(_e),{size:"small",bordered:!1},{default:f(()=>[...r[3]||(r[3]=[e("thead",null,[e("tr",null,[e("th"),e("th",null,"können"),e("th",null,"müssen"),e("th",null,"dürfen"),e("th",null,"sollen"),e("th",null,"wollen"),e("th",null,"mögen")])],-1),e("tbody",null,[e("tr",null,[e("td",null,"ich"),e("td",null,"kann"),e("td",null,"muss"),e("td",null,"darf"),e("td",null,"soll"),e("td",null,"will"),e("td",null,"mag")]),e("tr",null,[e("td",null,"du"),e("td",null,"kannst"),e("td",null,"musst"),e("td",null,"darfst"),e("td",null,"sollst"),e("td",null,"willst"),e("td",null,"magst")]),e("tr",null,[e("td",null,"er"),e("td",null,"kann"),e("td",null,"muss"),e("td",null,"darf"),e("td",null,"soll"),e("td",null,"will"),e("td",null,"mag")]),e("tr",null,[e("td",null,"K II"),e("td",null,"könnte"),e("td",null,"müsste"),e("td",null,"dürfte"),e("td",null,"sollte"),e("td",null,"wollte"),e("td",null,"möchte")])],-1)])]),_:1})]),_:1}),v(b(P),{title:"5. Separable vs inseparable prefixes",name:"5"},{default:f(()=>[...r[4]||(r[4]=[e("p",null,[e("strong",null,"Separable (split in main clause):"),t(" ab-, an-, auf-, aus-, ein-, mit-, nach-, vor-, zu-, fern-, weg-, zurück-, hin-, her-, fest-.")],-1),e("p",null,[e("strong",null,"Inseparable (never split):"),t(" be-, emp-, ent-, er-, ge-, ver-, zer-, miss-.")],-1),e("p",null,[t("Some prefixes are "),e("strong",null,"both"),t(" (durch-, über-, um-, unter-, voll-, wieder-) — meaning differs by stress.")],-1)])]),_:1}),v(b(P),{title:"6. Partizip II rules",name:"6"},{default:f(()=>[...r[5]||(r[5]=[e("p",null,[e("strong",null,"Weak:"),t(" ge- + stem + -t → gespielt, gearbeitet (with Bindevokal), gekauft.")],-1),e("p",null,[e("strong",null,"Strong:"),t(" ge- + (often changed) stem + -en → gegangen, gesehen, geschrieben.")],-1),e("p",null,[e("strong",null,"Separable:"),t(" prefix + ge + stem → aufgestanden, eingekauft.")],-1),e("p",null,[e("strong",null,"Inseparable / -ieren:"),t(" no ge- → verkauft, besucht, studiert.")],-1)])]),_:1}),v(b(P),{title:"7. haben vs sein in Perfekt/Plusquamperfekt",name:"7"},{default:f(()=>[...r[6]||(r[6]=[e("p",null,[e("strong",null,"sein"),t(" with verbs of motion or change-of-state, plus sein/werden/bleiben/passieren.")],-1),e("p",null,"Examples: gehen, kommen, fahren, fliegen, laufen, schwimmen, steigen, ankommen, aufstehen.",-1),e("p",null,[e("strong",null,"haben"),t(" for everything else (most transitive and stative verbs).")],-1)])]),_:1}),v(b(P),{title:"8. Imperativ",name:"8"},{default:f(()=>[...r[7]||(r[7]=[e("p",null,[e("strong",null,"du:"),t(" usually stem (no ending). With -d/-t add -e ("),e("em",null,"arbeite!"),t("). Strong verbs with e→i/ie carry the change ("),e("em",null,"gib! lies! nimm! sieh! iss!"),t("). a→ä does "),e("strong",null,"not"),t(" change ("),e("em",null,"fahr!"),t(', not "fähr!").')],-1),e("p",null,[e("strong",null,"ihr:"),t(" same as present ihr-form ("),e("em",null,"geht!"),t(", "),e("em",null,"arbeitet!"),t(").")],-1),e("p",null,[e("strong",null,"Sie:"),t(" present Sie-form inverted ("),e("em",null,"Gehen Sie!"),t(", "),e("em",null,"Helfen Sie!"),t(").")],-1)])]),_:1}),v(b(P),{title:"9. Konjunktiv II",name:"9"},{default:f(()=>[...r[8]||(r[8]=[e("p",null,"Use proper K2 forms for: sein (wäre), haben (hätte), werden (würde), modals (könnte, müsste, dürfte, sollte, wollte, möchte), wissen (wüsste), and common strong verbs (käme, ginge, fände, gäbe, ließe).",-1),e("p",null,[t("For everything else, use "),e("strong",null,"würde + Infinitiv"),t(": "),e("em",null,"Ich würde das machen.")],-1)])]),_:1}),v(b(P),{title:"10. Passiv (Vorgangspassiv)",name:"10"},{default:f(()=>[...r[9]||(r[9]=[e("p",null,[e("strong",null,"werden"),t(" (in the right tense) + "),e("strong",null,"Partizip II"),t(".")],-1),e("ul",null,[e("li",null,[t("Präsens: "),e("em",null,"wird gefragt")]),e("li",null,[t("Präteritum: "),e("em",null,"wurde gefragt")]),e("li",null,[t("Perfekt: "),e("em",null,[t("ist gefragt "),e("strong",null,"worden")]),t(" (note: "),e("strong",null,"worden"),t(", not geworden)")]),e("li",null,[t("Plusquamperfekt: "),e("em",null,"war gefragt worden")]),e("li",null,[t("Futur I: "),e("em",null,"wird gefragt werden")])],-1),e("p",null,"Only transitive verbs (accusative object) can form a normal passive.",-1)])]),_:1}),v(b(P),{title:"11. Reflexive Verben",name:"11"},{default:f(()=>[...r[10]||(r[10]=[e("p",null,[e("strong",null,"Accusative reflexive:"),t(" sich freuen, sich erinnern, sich entscheiden, sich beeilen, sich treffen.")],-1),e("p",null,"Pronouns: mich, dich, sich, uns, euch, sich.",-1),e("p",null,[e("strong",null,"Dative reflexive:"),t(" sich (etwas) vorstellen, sich (etwas) merken, sich (die Hände) waschen.")],-1),e("p",null,"Dative reflexive pronouns differ only in du (dir) and ich (mir).",-1)])]),_:1}),v(b(P),{title:"12. Verben mit Dativ",name:"12"},{default:f(()=>[...r[11]||(r[11]=[e("p",null,"helfen, danken, gefallen, antworten, gehören, passieren, schmecken, glauben (+ person), gratulieren, folgen, vertrauen, widersprechen, zuhören.",-1),e("p",null,[t("Example: "),e("em",null,"Ich helfe dir."),t(" (not "),e("em",null,"dich"),t(")")],-1)])]),_:1})]),_:1})]),_:1}))}});export{Fe as default};
