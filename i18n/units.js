// MAT i18n · what counts as one translatable unit, and how a unit becomes a key: inline tags turn into numbered tokens
// (<0>…</0>, <1/>) so a translation can move them around without touching their attributes.
window.I18U=(function(){
  const INLINE=new Set(['B','STRONG','I','EM','A','BR','SPAN','SMALL','CODE','SUP','SUB','TIME','U','S','MARK','ABBR','KBD','Q']);
  const SKIP=new Set(['SCRIPT','STYLE','svg','SVG','CANVAS','TEMPLATE','NOSCRIPT','INPUT','TEXTAREA','SELECT','VIDEO','IMG','PICTURE','IFRAME']);
  const norm=s=>s.replace(/\s+/g,' ').trim();
  const hasLetters=s=>/[A-Za-z]/.test(s);
  function unitable(el){ for(const d of el.querySelectorAll('*')){ if(!INLINE.has(d.tagName)||d.id||d.hasAttribute('data-i18n-skip')) return false; } return true; }
  // element → token string; tags in document order
  function key(el){ const tags=[]; const ser=n=>[...n.childNodes].map(c=>{ if(c.nodeType===3) return c.data; if(c.nodeType!==1) return ''; const i=tags.length; tags.push(c); return c.tagName==='BR'?`<${i}/>`:`<${i}>${ser(c)}</${i}>`; }).join('');
    return {k:norm(ser(el)),tags}; }
  // token string → children of el, re-using shallow clones of the original tags
  function apply(el,tr,tags){ const frag=document.createDocumentFragment(); const re=/<(\d+)(\/?)>|<\/(\d+)>/g; const stack=[frag]; let last=0,m;
    while((m=re.exec(tr))){ if(m.index>last) stack[stack.length-1].appendChild(document.createTextNode(tr.slice(last,m.index))); last=re.lastIndex;
      if(m[1]!==undefined){ const t=tags[+m[1]]; if(!t){ continue; } const c=t.cloneNode(false); stack[stack.length-1].appendChild(c); if(!m[2]&&t.tagName!=='BR') stack.push(c); }
      else if(stack.length>1) stack.pop(); }
    if(last<tr.length) stack[stack.length-1].appendChild(document.createTextNode(tr.slice(last)));
    el.textContent=''; el.appendChild(frag); }
  // calls unit(el,k,tags) for elements translated as a whole and text(node,k) for loose text nodes
  function walk(root,unit,text){
    for(const c of [...root.childNodes]){
      if(c.nodeType===3){ const k=norm(c.data); if(k&&hasLetters(k)) text(c,k); continue; }
      if(c.nodeType!==1||SKIP.has(c.tagName)||c.hasAttribute('data-i18n-skip')) continue;
      const t=norm(c.textContent); if(!t||!hasLetters(t)) continue;
      if(unitable(c)){ const {k,tags}=key(c); unit(c,k,tags); } else walk(c,unit,text);
    }
  }
  const ATTRS=['aria-label','placeholder','title','alt'];
  function attrs(root,fn){ for(const el of [root,...root.querySelectorAll('*')]){ if(!el.getAttribute) continue; for(const a of ATTRS){ const v=el.getAttribute(a); if(v&&hasLetters(v)) fn(el,a,norm(v)); } } }
  return {walk,attrs,norm,hasLetters,key,apply};
})();
