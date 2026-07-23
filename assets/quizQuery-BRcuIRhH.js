function i(t,n){if(typeof t!="string"||t.length===0)return[...n];const s=new Set(n);return t.split(",").map(e=>e.trim()).filter(e=>s.has(e))}export{i as c};
