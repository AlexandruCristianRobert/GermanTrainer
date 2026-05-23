import{v as u,p as n,q as b,s as v,a$ as D,b0 as O,d as C,n as i,z as $,D as E,C as h,E as R,bB as T,l as f,G as I,H as L,M as H,X as N,T as V,bC as M,aR as K,ao as W,aH as X,r as q,bD as G,bE as Y,aw as A,ar as F,bp as J}from"./index-Cw4Xx764.js";const Q=u([n("list",`
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
 `,[b("show-divider",[n("list-item",[u("&:not(:last-child)",[v("divider",`
 background-color: var(--n-merged-border-color);
 `)])])]),b("clickable",[n("list-item",`
 cursor: pointer;
 `)]),b("bordered",`
 border: 1px solid var(--n-merged-border-color);
 border-radius: var(--n-border-radius);
 `),b("hoverable",[n("list-item",`
 border-radius: var(--n-border-radius);
 `,[u("&:hover",`
 background-color: var(--n-merged-color-hover);
 `,[v("divider",`
 background-color: transparent;
 `)])])]),b("bordered, hoverable",[n("list-item",`
 padding: 12px 20px;
 `),v("header, footer",`
 padding: 12px 20px;
 `)]),v("header, footer",`
 padding: 12px 0;
 box-sizing: border-box;
 transition: border-color .3s var(--n-bezier);
 `,[u("&:not(:last-child)",`
 border-bottom: 1px solid var(--n-merged-border-color);
 `)]),n("list-item",`
 position: relative;
 padding: 12px 0; 
 box-sizing: border-box;
 display: flex;
 flex-wrap: nowrap;
 align-items: center;
 transition:
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 `,[v("prefix",`
 margin-right: 20px;
 flex: 0;
 `),v("suffix",`
 margin-left: 20px;
 flex: 0;
 `),v("main",`
 flex: 1;
 `),v("divider",`
 height: 1px;
 position: absolute;
 bottom: 0;
 left: 0;
 right: 0;
 background-color: transparent;
 transition: background-color .3s var(--n-bezier);
 pointer-events: none;
 `)])]),D(n("list",`
 --n-merged-color-hover: var(--n-color-hover-modal);
 --n-merged-color: var(--n-color-modal);
 --n-merged-border-color: var(--n-border-color-modal);
 `)),O(n("list",`
 --n-merged-color-hover: var(--n-color-hover-popover);
 --n-merged-color: var(--n-color-popover);
 --n-merged-border-color: var(--n-border-color-popover);
 `))]),U=Object.assign(Object.assign({},h.props),{size:{type:String,default:"medium"},bordered:Boolean,clickable:Boolean,hoverable:Boolean,showDivider:{type:Boolean,default:!0}}),w=I("n-list"),se=C({name:"List",props:U,slots:Object,setup(e){const{mergedClsPrefixRef:r,inlineThemeDisabled:o,mergedRtlRef:s}=$(e),p=E("List",s,r),a=h("List","-list",Q,T,e,r);L(w,{showDividerRef:H(e,"showDivider"),mergedClsPrefixRef:r});const c=f(()=>{const{common:{cubicBezierEaseInOut:t},self:{fontSize:d,textColor:m,color:g,colorModal:x,colorPopover:y,borderColor:z,borderColorModal:k,borderColorPopover:S,borderRadius:P,colorHover:_,colorHoverModal:j,colorHoverPopover:B}}=a.value;return{"--n-font-size":d,"--n-bezier":t,"--n-text-color":m,"--n-color":g,"--n-border-radius":P,"--n-border-color":z,"--n-border-color-modal":k,"--n-border-color-popover":S,"--n-color-modal":x,"--n-color-popover":y,"--n-color-hover":_,"--n-color-hover-modal":j,"--n-color-hover-popover":B}}),l=o?R("list",void 0,c,e):void 0;return{mergedClsPrefix:r,rtlEnabled:p,cssVars:o?void 0:c,themeClass:l==null?void 0:l.themeClass,onRender:l==null?void 0:l.onRender}},render(){var e;const{$slots:r,mergedClsPrefix:o,onRender:s}=this;return s==null||s(),i("ul",{class:[`${o}-list`,this.rtlEnabled&&`${o}-list--rtl`,this.bordered&&`${o}-list--bordered`,this.showDivider&&`${o}-list--show-divider`,this.hoverable&&`${o}-list--hoverable`,this.clickable&&`${o}-list--clickable`,this.themeClass],style:this.cssVars},r.header?i("div",{class:`${o}-list__header`},r.header()):null,(e=r.default)===null||e===void 0?void 0:e.call(r),r.footer?i("div",{class:`${o}-list__footer`},r.footer()):null)}}),ie=C({name:"ListItem",slots:Object,setup(){const e=N(w,null);return e||V("list-item","`n-list-item` must be placed in `n-list`."),{showDivider:e.showDividerRef,mergedClsPrefix:e.mergedClsPrefixRef}},render(){const{$slots:e,mergedClsPrefix:r}=this;return i("li",{class:`${r}-list-item`},e.prefix?i("div",{class:`${r}-list-item__prefix`},e.prefix()):null,e.default?i("div",{class:`${r}-list-item__main`},e):null,e.suffix?i("div",{class:`${r}-list-item__suffix`},e.suffix()):null,this.showDivider&&i("div",{class:`${r}-list-item__divider`}))}}),Z=u([u("@keyframes spin-rotate",`
 from {
 transform: rotate(0);
 }
 to {
 transform: rotate(360deg);
 }
 `),n("spin-container",`
 position: relative;
 `,[n("spin-body",`
 position: absolute;
 top: 50%;
 left: 50%;
 transform: translateX(-50%) translateY(-50%);
 `,[M()])]),n("spin-body",`
 display: inline-flex;
 align-items: center;
 justify-content: center;
 flex-direction: column;
 `),n("spin",`
 display: inline-flex;
 height: var(--n-size);
 width: var(--n-size);
 font-size: var(--n-size);
 color: var(--n-color);
 `,[b("rotate",`
 animation: spin-rotate 2s linear infinite;
 `)]),n("spin-description",`
 display: inline-block;
 font-size: var(--n-font-size);
 color: var(--n-text-color);
 transition: color .3s var(--n-bezier);
 margin-top: 8px;
 `),n("spin-content",`
 opacity: 1;
 transition: opacity .3s var(--n-bezier);
 pointer-events: all;
 `,[b("spinning",`
 user-select: none;
 -webkit-user-select: none;
 pointer-events: none;
 opacity: var(--n-opacity-spinning);
 `)])]),ee={small:20,medium:18,large:16},oe=Object.assign(Object.assign(Object.assign({},h.props),{contentClass:String,contentStyle:[Object,String],description:String,size:{type:[String,Number],default:"medium"},show:{type:Boolean,default:!0},rotate:{type:Boolean,default:!0},spinning:{type:Boolean,validator:()=>!0,default:void 0},delay:Number}),G),te=C({name:"Spin",props:oe,slots:Object,setup(e){const{mergedClsPrefixRef:r,inlineThemeDisabled:o}=$(e),s=h("Spin","-spin",Z,Y,e,r),p=f(()=>{const{size:t}=e,{common:{cubicBezierEaseInOut:d},self:m}=s.value,{opacitySpinning:g,color:x,textColor:y}=m,z=typeof t=="number"?A(t):m[F("size",t)];return{"--n-bezier":d,"--n-opacity-spinning":g,"--n-size":z,"--n-color":x,"--n-text-color":y}}),a=o?R("spin",f(()=>{const{size:t}=e;return typeof t=="number"?String(t):t[0]}),p,e):void 0,c=J(e,["spinning","show"]),l=q(!1);return X(t=>{let d;if(c.value){const{delay:m}=e;if(m){d=window.setTimeout(()=>{l.value=!0},m),t(()=>{clearTimeout(d)});return}}l.value=c.value}),{mergedClsPrefix:r,active:l,mergedStrokeWidth:f(()=>{const{strokeWidth:t}=e;if(t!==void 0)return t;const{size:d}=e;return ee[typeof d=="number"?"medium":d]}),cssVars:o?void 0:p,themeClass:a==null?void 0:a.themeClass,onRender:a==null?void 0:a.onRender}},render(){var e,r;const{$slots:o,mergedClsPrefix:s,description:p}=this,a=o.icon&&this.rotate,c=(p||o.description)&&i("div",{class:`${s}-spin-description`},p||((e=o.description)===null||e===void 0?void 0:e.call(o))),l=o.icon?i("div",{class:[`${s}-spin-body`,this.themeClass]},i("div",{class:[`${s}-spin`,a&&`${s}-spin--rotate`],style:o.default?"":this.cssVars},o.icon()),c):i("div",{class:[`${s}-spin-body`,this.themeClass]},i(K,{clsPrefix:s,style:o.default?"":this.cssVars,stroke:this.stroke,"stroke-width":this.mergedStrokeWidth,radius:this.radius,scale:this.scale,class:`${s}-spin`}),c);return(r=this.onRender)===null||r===void 0||r.call(this),o.default?i("div",{class:[`${s}-spin-container`,this.themeClass],style:this.cssVars},i("div",{class:[`${s}-spin-content`,this.active&&`${s}-spin-content--spinning`,this.contentClass],style:this.contentStyle},o),i(W,{name:"fade-in-transition"},{default:()=>this.active?l:null})):l}});export{se as N,ie as a,te as b};
