import{p as R,aw as f,x as b,q as a,s as u,v as p,aR as L,aS as O,d as $,n as l,A as S,E as B,D as g,F as w,l as h,G as M,H as E,M as I,X as N,T as V,bq as K,aF as W,aT as q,ap as F,r as X,br as A,a6 as G,ar as Y,bi as J}from"./index-CmOiGifh.js";function Q(e){const{textColor2:r,cardColor:o,modalColor:i,popoverColor:d,dividerColor:n,borderRadius:c,fontSize:t,hoverColor:s}=e;return{textColor:r,color:o,colorHover:s,colorModal:i,colorHoverModal:f(i,s),colorPopover:d,colorHoverPopover:f(d,s),borderColor:n,borderColorModal:f(i,n),borderColorPopover:f(d,n),borderRadius:c,fontSize:t}}const U={common:R,self:Q};function Z(e){const{opacityDisabled:r,heightTiny:o,heightSmall:i,heightMedium:d,heightLarge:n,heightHuge:c,primaryColor:t,fontSize:s}=e;return{fontSize:s,textColor:t,sizeTiny:o,sizeSmall:i,sizeMedium:d,sizeLarge:n,sizeHuge:c,color:t,opacitySpinning:r}}const ee={common:R,self:Z},oe=b([a("list",`
 --n-merged-border-color: var(--n-border-color);
 --n-merged-color: var(--n-color);
 --n-merged-color-hover: var(--n-color-hover);
 margin: 0;
 font-size: var(--n-font-size);
 transition:
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 padding: 0;
 list-style-type: none;
 color: var(--n-text-color);
 background-color: var(--n-merged-color);
 `,[u("show-divider",[a("list-item",[b("&:not(:last-child)",[p("divider",`
 background-color: var(--n-merged-border-color);
 `)])])]),u("clickable",[a("list-item",`
 cursor: pointer;
 `)]),u("bordered",`
 border: 1px solid var(--n-merged-border-color);
 border-radius: var(--n-border-radius);
 `),u("hoverable",[a("list-item",`
 border-radius: var(--n-border-radius);
 `,[b("&:hover",`
 background-color: var(--n-merged-color-hover);
 `,[p("divider",`
 background-color: transparent;
 `)])])]),u("bordered, hoverable",[a("list-item",`
 padding: 12px 20px;
 `),p("header, footer",`
 padding: 12px 20px;
 `)]),p("header, footer",`
 padding: 12px 0;
 box-sizing: border-box;
 transition: border-color .3s var(--n-bezier);
 `,[b("&:not(:last-child)",`
 border-bottom: 1px solid var(--n-merged-border-color);
 `)]),a("list-item",`
 position: relative;
 padding: 12px 0; 
 box-sizing: border-box;
 display: flex;
 flex-wrap: nowrap;
 align-items: center;
 transition:
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 `,[p("prefix",`
 margin-right: 20px;
 flex: 0;
 `),p("suffix",`
 margin-left: 20px;
 flex: 0;
 `),p("main",`
 flex: 1;
 `),p("divider",`
 height: 1px;
 position: absolute;
 bottom: 0;
 left: 0;
 right: 0;
 background-color: transparent;
 transition: background-color .3s var(--n-bezier);
 pointer-events: none;
 `)])]),L(a("list",`
 --n-merged-color-hover: var(--n-color-hover-modal);
 --n-merged-color: var(--n-color-modal);
 --n-merged-border-color: var(--n-border-color-modal);
 `)),O(a("list",`
 --n-merged-color-hover: var(--n-color-hover-popover);
 --n-merged-color: var(--n-color-popover);
 --n-merged-border-color: var(--n-border-color-popover);
 `))]),re=Object.assign(Object.assign({},g.props),{size:{type:String,default:"medium"},bordered:Boolean,clickable:Boolean,hoverable:Boolean,showDivider:{type:Boolean,default:!0}}),k=M("n-list"),le=$({name:"List",props:re,slots:Object,setup(e){const{mergedClsPrefixRef:r,inlineThemeDisabled:o,mergedRtlRef:i}=S(e),d=B("List",i,r),n=g("List","-list",oe,U,e,r);E(k,{showDividerRef:I(e,"showDivider"),mergedClsPrefixRef:r});const c=h(()=>{const{common:{cubicBezierEaseInOut:s},self:{fontSize:v,textColor:m,color:x,colorModal:y,colorPopover:C,borderColor:z,borderColorModal:P,borderColorPopover:_,borderRadius:j,colorHover:T,colorHoverModal:D,colorHoverPopover:H}}=n.value;return{"--n-font-size":v,"--n-bezier":s,"--n-text-color":m,"--n-color":x,"--n-border-radius":j,"--n-border-color":z,"--n-border-color-modal":P,"--n-border-color-popover":_,"--n-color-modal":y,"--n-color-popover":C,"--n-color-hover":T,"--n-color-hover-modal":D,"--n-color-hover-popover":H}}),t=o?w("list",void 0,c,e):void 0;return{mergedClsPrefix:r,rtlEnabled:d,cssVars:o?void 0:c,themeClass:t==null?void 0:t.themeClass,onRender:t==null?void 0:t.onRender}},render(){var e;const{$slots:r,mergedClsPrefix:o,onRender:i}=this;return i==null||i(),l("ul",{class:[`${o}-list`,this.rtlEnabled&&`${o}-list--rtl`,this.bordered&&`${o}-list--bordered`,this.showDivider&&`${o}-list--show-divider`,this.hoverable&&`${o}-list--hoverable`,this.clickable&&`${o}-list--clickable`,this.themeClass],style:this.cssVars},r.header?l("div",{class:`${o}-list__header`},r.header()):null,(e=r.default)===null||e===void 0?void 0:e.call(r),r.footer?l("div",{class:`${o}-list__footer`},r.footer()):null)}}),ae=$({name:"ListItem",slots:Object,setup(){const e=N(k,null);return e||V("list-item","`n-list-item` must be placed in `n-list`."),{showDivider:e.showDividerRef,mergedClsPrefix:e.mergedClsPrefixRef}},render(){const{$slots:e,mergedClsPrefix:r}=this;return l("li",{class:`${r}-list-item`},e.prefix?l("div",{class:`${r}-list-item__prefix`},e.prefix()):null,e.default?l("div",{class:`${r}-list-item__main`},e):null,e.suffix?l("div",{class:`${r}-list-item__suffix`},e.suffix()):null,this.showDivider&&l("div",{class:`${r}-list-item__divider`}))}}),ie=b([b("@keyframes spin-rotate",`
 from {
 transform: rotate(0);
 }
 to {
 transform: rotate(360deg);
 }
 `),a("spin-container",`
 position: relative;
 `,[a("spin-body",`
 position: absolute;
 top: 50%;
 left: 50%;
 transform: translateX(-50%) translateY(-50%);
 `,[K()])]),a("spin-body",`
 display: inline-flex;
 align-items: center;
 justify-content: center;
 flex-direction: column;
 `),a("spin",`
 display: inline-flex;
 height: var(--n-size);
 width: var(--n-size);
 font-size: var(--n-size);
 color: var(--n-color);
 `,[u("rotate",`
 animation: spin-rotate 2s linear infinite;
 `)]),a("spin-description",`
 display: inline-block;
 font-size: var(--n-font-size);
 color: var(--n-text-color);
 transition: color .3s var(--n-bezier);
 margin-top: 8px;
 `),a("spin-content",`
 opacity: 1;
 transition: opacity .3s var(--n-bezier);
 pointer-events: all;
 `,[u("spinning",`
 user-select: none;
 -webkit-user-select: none;
 pointer-events: none;
 opacity: var(--n-opacity-spinning);
 `)])]),se={small:20,medium:18,large:16},te=Object.assign(Object.assign(Object.assign({},g.props),{contentClass:String,contentStyle:[Object,String],description:String,size:{type:[String,Number],default:"medium"},show:{type:Boolean,default:!0},rotate:{type:Boolean,default:!0},spinning:{type:Boolean,validator:()=>!0,default:void 0},delay:Number}),A),de=$({name:"Spin",props:te,slots:Object,setup(e){const{mergedClsPrefixRef:r,inlineThemeDisabled:o}=S(e),i=g("Spin","-spin",ie,ee,e,r),d=h(()=>{const{size:s}=e,{common:{cubicBezierEaseInOut:v},self:m}=i.value,{opacitySpinning:x,color:y,textColor:C}=m,z=typeof s=="number"?G(s):m[Y("size",s)];return{"--n-bezier":v,"--n-opacity-spinning":x,"--n-size":z,"--n-color":y,"--n-text-color":C}}),n=o?w("spin",h(()=>{const{size:s}=e;return typeof s=="number"?String(s):s[0]}),d,e):void 0,c=J(e,["spinning","show"]),t=X(!1);return F(s=>{let v;if(c.value){const{delay:m}=e;if(m){v=window.setTimeout(()=>{t.value=!0},m),s(()=>{clearTimeout(v)});return}}t.value=c.value}),{mergedClsPrefix:r,active:t,mergedStrokeWidth:h(()=>{const{strokeWidth:s}=e;if(s!==void 0)return s;const{size:v}=e;return se[typeof v=="number"?"medium":v]}),cssVars:o?void 0:d,themeClass:n==null?void 0:n.themeClass,onRender:n==null?void 0:n.onRender}},render(){var e,r;const{$slots:o,mergedClsPrefix:i,description:d}=this,n=o.icon&&this.rotate,c=(d||o.description)&&l("div",{class:`${i}-spin-description`},d||((e=o.description)===null||e===void 0?void 0:e.call(o))),t=o.icon?l("div",{class:[`${i}-spin-body`,this.themeClass]},l("div",{class:[`${i}-spin`,n&&`${i}-spin--rotate`],style:o.default?"":this.cssVars},o.icon()),c):l("div",{class:[`${i}-spin-body`,this.themeClass]},l(W,{clsPrefix:i,style:o.default?"":this.cssVars,stroke:this.stroke,"stroke-width":this.mergedStrokeWidth,radius:this.radius,scale:this.scale,class:`${i}-spin`}),c);return(r=this.onRender)===null||r===void 0||r.call(this),o.default?l("div",{class:[`${i}-spin-container`,this.themeClass],style:this.cssVars},l("div",{class:[`${i}-spin-content`,this.active&&`${i}-spin-content--spinning`,this.contentClass],style:this.contentStyle},o),l(q,{name:"fade-in-transition"},{default:()=>this.active?t:null})):t}});export{le as N,ae as a,de as b};
