/* ZOOM: a double tap on the TAB, the Ring or the fretboard brings it up to fill the screen; a double tap on it there (or
   Escape) puts it back. Nothing stops: the surface is moved, live, into a layer over the page and drawn larger, and
   returned to its place after. The fretboard is drawn to the screen's height, wider than the screen: it opens on the hand
   and scrolls left and right, and when the hand moves to a new place it follows it. The TAB is drawn large the same way and
   follows the playhead; the Ring fits the screen. */
const SURF=(()=>{
  const layer=document.createElement('div'); layer.className='zoomLayer'; layer.hidden=true; document.body.appendChild(layer);
  const css=document.createElement('style'); css.textContent='.zoomLayer{ position:fixed; inset:0; z-index:60; background:var(--bg); overflow-x:auto; overflow-y:hidden; display:flex; align-items:center; -webkit-overflow-scrolling:touch; overscroll-behavior:contain } .zoomLayer.fit{ justify-content:center; overflow:hidden } .zoomLayer > *{ flex:0 0 auto; margin:0 } .zoomLayer > .panel{ border:0 } body.zoomed{ overflow:hidden }';
  document.head.appendChild(css);
  let cur=null, home=null, kind=null, lastHx=null;
  const vbOf=svg=>{ const v=svg.viewBox.baseVal; return {x:v.x,y:v.y,w:v.width,h:v.height}; };
  function size(){
    if(!cur) return; const W=innerWidth, H=innerHeight;
    if(kind==='fb'){ const v=vbOf(cur), h=H*0.94, w=Math.max(W,h*v.w/v.h); cur.style.width=w+'px'; cur.style.height=(w*v.h/v.w)+'px'; cur.style.maxWidth='none'; }
    else if(kind==='ring'){ const s=Math.min(W,H)*0.94; cur.style.width=s+'px'; cur.style.height=s+'px'; cur.style.maxWidth='none'; }
    else { const svg=cur.querySelector('svg'), v=vbOf(svg); let h=H*0.7, w=h*v.w/v.h; if(w<W*0.96){ w=W*0.96; h=w*v.h/v.w; }
      cur.style.width=w+'px'; cur.style.maxWidth='none'; cur.style.overflow='visible'; svg.style.width=w+'px'; svg.style.height=h+'px'; svg.style.maxWidth='none'; } }
  // the hand's place on the board (board units): its fingers' mean
  const handX=()=>fingers.reduce((a,F)=>a+(F.x||0),0)/fingers.length;
  function follow(smooth){
    if(kind!=='fb') return; const v=vbOf(cur), hx=handX(), px=(hx-v.x)/v.w*cur.getBoundingClientRect().width;
    layer.scrollTo({left:Math.max(0,px-innerWidth/2),behavior:smooth&&!reduce?'smooth':'auto'}); lastHx=hx; }
  function open(el,k){
    cur=el; kind=k; home={parent:el.parentNode,next:el.nextSibling,style:el.getAttribute('style')};
    const svg=k==='tab'?el.querySelector('svg'):null; home.svgStyle=svg?svg.getAttribute('style'):null;
    layer.classList.toggle('fit',k==='ring'); layer.hidden=false; layer.appendChild(el); document.body.classList.add('zoomed');
    size(); follow(false); }
  function close(){
    if(!cur) return; const el=cur;
    if(home.style===null) el.removeAttribute('style'); else el.setAttribute('style',home.style);
    if(kind==='tab'){ const svg=el.querySelector('svg'); if(svg){ if(home.svgStyle===null) svg.removeAttribute('style'); else svg.setAttribute('style',home.svgStyle); } if(typeof layoutTab==='function'&&DRILL) layoutTab(DRILL.bars||2); }
    home.parent.insertBefore(el,home.next); layer.hidden=true; document.body.classList.remove('zoomed'); cur=null; kind=null; }
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
  (function watch(){ if(kind==='fb'){ const hx=handX(); if(lastHx===null||Math.abs(hx-lastHx)>40) follow(true); }
    // the TAB: while it plays, the playhead is kept in view, a third of the way in
    else if(kind==='tab'&&T.on&&typeof head!=='undefined'){ const svg=cur.querySelector('svg'), v=vbOf(svg), x=(+head.getAttribute('x1')-v.x)/v.w*svg.getBoundingClientRect().width, sl=layer.scrollLeft;
      if(x<sl+innerWidth*0.15||x>sl+innerWidth*0.75) layer.scrollTo({left:Math.max(0,x-innerWidth/3),behavior:reduce?'auto':'smooth'}); }
    requestAnimationFrame(watch); })();
  return {close};
})();
