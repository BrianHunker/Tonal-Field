/* ZOOM: a double tap on the TAB, the Ring or the fretboard brings it up to fill the screen; a double tap on it there (or
   Escape) puts it back. Nothing stops: the surface is moved, live, into a layer over the page and drawn larger, and
   returned to its place after. The fretboard is drawn to the screen's height, wider than the screen: it opens on the hand
   and scrolls left and right, and when the hand moves to a new place it follows it. The TAB is drawn large the same way and
   follows the playhead; the Ring fits the screen. The page's Play, Hold and Prev | Next come along in a bar at the foot of
   the zoomed view (copies that press the page's own, kept in step with them); a page may add its own (a button with
   data-zoom). On Chords, with the board turned a quarter, the turned board is what fills the screen. */
const SURF=(()=>{
  const layer=document.createElement('div'); layer.className='zoomLayer'; layer.hidden=true; document.body.appendChild(layer);
  const css=document.createElement('style'); css.textContent='.zoomLayer{ position:fixed; inset:0; z-index:60; background:var(--bg); overflow-x:auto; overflow-y:hidden; display:flex; align-items:center; -webkit-overflow-scrolling:touch; overscroll-behavior:contain } .zoomLayer.fit{ justify-content:center; overflow:hidden } .zoomLayer > *{ flex:0 0 auto; margin:0 } .zoomLayer > .panel{ border:0 } body.zoomed{ overflow:hidden } .zoomBar{ position:fixed; left:50%; bottom:max(12px,env(safe-area-inset-bottom)); transform:translateX(-50%); z-index:61; display:flex; align-items:center; gap:12px; padding:8px 12px; border-radius:999px; background:var(--bg); border:1px solid var(--faint); box-shadow:0 2px 14px rgba(0,0,0,.18); white-space:nowrap }';
  document.head.appendChild(css);
  let cur=null, home=null, kind=null, lastHx=null;
  const BAR=76;                                                  // the room the button bar takes at the foot
  const zbar=document.createElement('div'); zbar.className='zoomBar'; layer.appendChild(zbar);
  let prox=[];                                                   // [page button, its copy]
  function buildBar(){
    zbar.innerHTML=''; prox=[];
    const shown=id=>{ const o=document.getElementById(id); return o&&getComputedStyle(o).display!=='none'&&!o.hidden?o:null; };
    const copy=(o,into)=>{ const c=o.cloneNode(true); c.removeAttribute('id'); c.removeAttribute('aria-controls');
      c.addEventListener('click',e=>{ e.stopPropagation(); o.click(); }); into.appendChild(c); prox.push([o,c]); };
    ['play','hold'].forEach(id=>{ const o=shown(id); if(o) copy(o,zbar); });
    const pv=shown('prev'), nx=shown('next'); if(pv||nx){ const pair=document.createElement('div'); pair.className='pillPair'; if(pv) copy(pv,pair); if(nx) copy(nx,pair); zbar.appendChild(pair); }
    document.querySelectorAll('[data-zoom]').forEach(o=>{ if(getComputedStyle(o).display!=='none') copy(o,zbar); });
    sync(); }
  function sync(){ for(const [o,c] of prox){ if(c.textContent!==o.textContent) c.textContent=o.textContent; c.disabled=o.disabled; if(c.className!==o.className) c.className=o.className;
      const ap=o.getAttribute('aria-pressed'); if(ap!==null&&c.getAttribute('aria-pressed')!==ap) c.setAttribute('aria-pressed',ap); } }
  const vbOf=svg=>{ const v=svg.viewBox.baseVal; return {x:v.x,y:v.y,w:v.width,h:v.height}; };
  function size(){
    if(!cur) return; const W=innerWidth, H=innerHeight-BAR;
    if(kind==='rot'){ FBROT.fit(H*0.96,W*0.96); return; }
    if(kind==='fb'){ const v=vbOf(cur), h=H*0.94, w=Math.max(W,h*v.w/v.h); cur.style.width=w+'px'; cur.style.height=(w*v.h/v.w)+'px'; cur.style.maxWidth='none'; }
    else if(kind==='ring'){ const s=Math.min(W,H)*0.94; cur.style.width=s+'px'; cur.style.height=s+'px'; cur.style.maxWidth='none'; }
    else { const svg=cur.querySelector('svg'), v=vbOf(svg); let h=H*0.7, w=h*v.w/v.h; if(w<W*0.96){ w=W*0.96; h=w*v.h/v.w; }
      cur.style.width=w+'px'; cur.style.maxWidth='none'; cur.style.overflow='visible'; svg.style.width=w+'px'; svg.style.height=h+'px'; svg.style.maxWidth='none'; } }
  // the hand's place on the board (board units): its fingers' mean
  const handX=()=>fingers.reduce((a,F)=>a+(F.x||0),0)/fingers.length;
  function follow(smooth){
    if(kind!=='fb') return; const v=vbOf(cur), hx=handX(), px=(hx-v.x)/v.w*cur.getBoundingClientRect().width;
    layer.scrollTo({left:Math.max(0,px-innerWidth/2),behavior:smooth&&!reduce?'smooth':'auto'}); lastHx=hx; }
  const turned=()=>typeof FBROT!=='undefined'&&FBROT&&FBROT.on;
  function open(el,k){
    if(k==='fb'&&turned()){ el=el.parentNode; k='rot'; }
    cur=el; kind=k; home={parent:el.parentNode,next:el.nextSibling,style:el.getAttribute('style')};
    const svg=k==='tab'?el.querySelector('svg'):null; home.svgStyle=svg?svg.getAttribute('style'):null;
    layer.classList.toggle('fit',k==='ring'||k==='rot'); layer.style.paddingBottom=BAR+'px'; buildBar(); layer.hidden=false; layer.appendChild(el); document.body.classList.add('zoomed');
    size(); follow(false); }
  function close(){
    if(!cur) return; const el=cur;
    if(home.style===null) el.removeAttribute('style'); else el.setAttribute('style',home.style);
    if(kind==='tab'){ const svg=el.querySelector('svg'); if(svg){ if(home.svgStyle===null) svg.removeAttribute('style'); else svg.setAttribute('style',home.svgStyle); } if(typeof layoutTab==='function'&&DRILL) layoutTab(DRILL.bars||2); }
    const k=kind; home.parent.insertBefore(el,home.next); layer.hidden=true; document.body.classList.remove('zoomed'); cur=null; kind=null;
    if(k==='rot') FBROT.fit(); }
  function toggle(el,k){ if(cur) close(); else open(el,k); }
  // a double tap: two taps close together in time and place (a mouse double-click counts the same)
  function onDouble(el,k){ let t0=0, x0=0, y0=0;
    el.addEventListener('pointerup',e=>{ if(e.pointerType==='mouse') return; const now=performance.now();
      if(now-t0<320&&Math.hypot(e.clientX-x0,e.clientY-y0)<30){ t0=0; e.preventDefault(); toggle(el,k); return; } t0=now; x0=e.clientX; y0=e.clientY; });
    el.addEventListener('dblclick',e=>{ e.preventDefault(); toggle(el,k); }); }
  const tabPanel=document.getElementById('tabPanel'), ringEl=document.getElementById('ring'), fbEl=document.getElementById('fb');
  if(tabPanel) onDouble(tabPanel,'tab'); if(ringEl) onDouble(ringEl,'ring'); if(fbEl) onDouble(fbEl,'fb');
  addEventListener('keydown',e=>{ if(e.key==='Escape'&&cur) close(); });
  addEventListener('resize',()=>{ size(); follow(false); });
  // following the hand: when it moves to a new place (more than a fret's worth), the view glides to it
  let tabW=0;
  (function watch(){ if(cur) sync();
    // the TAB laid out afresh while zoomed (a new figure, Play): drawn large again
    if(kind==='tab'){ const svg=cur.querySelector('svg'), w=vbOf(svg).w; if(!svg.style.width.endsWith('px')||w!==tabW){ tabW=w; size(); } }
    if(kind==='fb'){ const hx=handX(); if(lastHx===null||Math.abs(hx-lastHx)>40) follow(true); }
    // the TAB: while it plays, the playhead is kept in view, a third of the way in
    else if(kind==='tab'&&T.on&&typeof head!=='undefined'){ const svg=cur.querySelector('svg'), v=vbOf(svg), x=(+head.getAttribute('x1')-v.x)/v.w*svg.getBoundingClientRect().width, sl=layer.scrollLeft;
      if(x<sl+innerWidth*0.15||x>sl+innerWidth*0.75) layer.scrollTo({left:Math.max(0,x-innerWidth/3),behavior:reduce?'auto':'smooth'}); }
    requestAnimationFrame(watch); })();
  return {close, open, get kind(){ return kind; }};
})();
