
/* ---------- the controls ---------- */
let CAND={C:[],fingers:new Set(),cells:new Map()};
const $=id=>document.getElementById(id);
const holdBtn=$('hold'), segMeans=$('segMeans');
const bpmIn=$('bpm'), bpmV=$('bpmv'), clickIn=$('click');
const listenEl=$('listen'), hearSeg=$('hearSeg'), hearKnob=$('hearKnob'), orderBtn=$('order'), diatBtn=$('diat');
const spell=(pc)=>((PHI.doPc===8||[1,6,11,4].includes(PHI.doPc))?LETTER_B:LETTER)[((pc%12)+12)%12];
function refresh(){
  COMP=completions();
  if(DRILL){ const h=hearingOf(DRILL); if(h) hearing=h; }
  CAND=(!T.on&&!DRILL)?candidates():{C:[],fingers:new Set(),cells:new Map()};
  // the pulsing marks: with a finger selected, only the frets that finger can take; with a fret selected, that fret
  const selF=SEL&&SEL.finger, selC=SEL&&SEL.cell;
  MARKS.forEach((m,i)=>{ const c=CELLS[i], key=c.s+':'+c.f, gs=CAND.cells.get(key);
    const on=!!gs&&(!selF||gs.has(selF));
    m.setAttribute('visibility',on?'visible':'hidden'); m.classList.toggle('cand',on);
    m.classList.toggle('sel',!!selC&&selC.s===c.s&&selC.f===c.f);
    m.style.stroke=on&&FIELD.lit>0.5?rgbS(valRGB(pcOf(c.s,c.f))):''; });
  INST=new Set(); if(FIELD.on) instances().forEach(r=>{ INST.add(r.lo.s*(FMAX+1)+r.lo.f); INST.add(r.hi.s*(FMAX+1)+r.hi.f); });
  // the means available from what is placed
  const anchor=P.find(q=>q.g)||P[0], keep=P;   // what the anchored finger can reach, whatever the second tone is now
  const anyOf=m=>{ if(!anchor) return false; P=[anchor]; const ok=COMP.some(c=>c.means===m&&consistent(c)); P=keep; return ok; };
  // Hammer-on and Pull-off: legato on a fretted step along one string, either or both; Fret alone is both steps picked
  const legOK=!!DRILL&&DRILL.means==='pick'&&DRILL.lo.s===DRILL.hi.s, leg=legOK&&(DRILL.ham||DRILL.pull);
  for(const b of segMeans.querySelectorAll('button')){ const v=b.dataset.v;
    if(v==='ham'||v==='pull'){ b.setAttribute('aria-pressed',legOK&&!!DRILL[v]); b.disabled=!legOK; continue; }
    const m=v==='prebend'?'bend':v, on=MEANS===m&&(m!=='bend'||((drill.dir==='down')===(v==='prebend')))&&!(m==='pick'&&leg);
    b.setAttribute('aria-pressed',on); b.disabled=!P.length||!(DRILL&&DRILL.means===m||anyOf(m)); }
  holdBtn.setAttribute('aria-pressed',drill.hold); diatBtn.setAttribute('aria-pressed',diatonic);
  playBtn.disabled=!DRILL&&!T.on;
  // Listen: the hearing of the frequencies in hand
  const cur=DRILL?hearingOf(DRILL):hearing; let sel=null;
  for(const b of hearSeg.querySelectorAll('button')){ const on=b.dataset.v===cur; b.setAttribute('aria-checked',on); if(on) sel=b; }
  if(sel&&sel.offsetWidth){ hearKnob.style.opacity=1; hearKnob.style.width=sel.offsetWidth+'px'; hearKnob.style.transform='translateX('+sel.offsetLeft+'px)'; } else hearKnob.style.opacity=0;
  orderBtn.querySelectorAll('span').forEach((x,i)=>x.classList.toggle('on',(i===1)===(RING.goal===1)));
  buildTabNotes(); buildWedge();
}
function edited(){ CUSTOM=true; if(!drill.hold){ drill.hold=true; } }
function stopForEdit(){ if(T.on) stopAll(); }
// pairing: a finger then a fret, or a fret then a finger; a placed finger clicked is let go
function addPair(g,s,f){
  P.push({g,s,f});
  SEL=null; DRILL=null; edited(); relayout(); settle(); refresh();
}
function clickFinger(k){
  stopForEdit();
  if(P.some(p=>p.g===k)){ unpair(k); DRILL=null; SEL=null; edited(); relayout(); settle(); refresh(); return; }   // let go: the hand relaxes at once
  if(SEL&&SEL.cell&&canPair(k,SEL.cell.s,SEL.cell.f)){ addPair(k,SEL.cell.s,SEL.cell.f); return; }
  if(CAND.fingers.has(k)){ const cells=[...CAND.cells.entries()].filter(([,gs])=>gs.has(k)); if(cells.length===1){ const [s,f]=cells[0][0].split(':').map(Number); addPair(k,s,f); return; } }
  SEL=(SEL&&SEL.finger===k)?null:{finger:k}; refresh();
}
function clickCell(s,f){
  stopForEdit();
  const here=P.find(p=>p.s===s&&p.f===f);                                 // the circle round a placed fret: let it go, as clicking its finger does
  if(here){ if(here.g){ clickFinger(here.g); return; } P=P.filter(p=>p!==here); DRILL=null; SEL=null; edited(); relayout(); settle(); refresh(); return; }
  if(DRILL&&!P.some(p=>p.s===s&&p.f===f)) return;                       // a complete drill: fingers are let go first, or Let Go
  if(SEL&&SEL.finger&&f>0&&canPair(SEL.finger,s,f)){ addPair(SEL.finger,s,f); return; }
  if(f===0&&canPair(0,s,0)){ addPair(0,s,0); return; }
  const gs=CAND.cells.get(s+':'+f);
  if(gs&&gs.size===1){ addPair([...gs][0],s,f); return; }
  if(!gs&&!(FIELD.on||P.length)){ SEL={cell:{s,f}}; refresh(); return; }  // without the field: any fret may start
  SEL=gs?{cell:{s,f}}:null; refresh();
}
// dragging a finger: it snaps to the nearest string and the spot behind the nearest fret, pushing or pulling its
// neighbours; dropped on a fret it can take, it is placed there. Dragging the thumb moves it, and past finger 2's reach, the hand.
function svgPoint(e){ const p=fb.createSVGPoint(); p.x=e.clientX; p.y=e.clientY; return p.matrixTransform(fb.getScreenCTM().inverse()); }
const nearString=y=>{ let b=0; FB.strY.forEach((sy,i)=>{ if(Math.abs(sy-y)<Math.abs(FB.strY[b]-y)) b=i; }); return b; };
const nearFret=x=>{ let b=1; for(let f=1;f<=FMAX;f++) if(Math.abs(tipX(f)-x)<Math.abs(tipX(b)-x)) b=f; return b; };
fingers.forEach(F=>{
  const start=e=>{ e.preventDefault(); e.stopPropagation(); const p=svgPoint(e); F.dragState={x0:p.x,y0:p.y,moved:false}; (e.target.setPointerCapture&&e.target.setPointerCapture(e.pointerId)); };
  [F.c,F.t].forEach(n=>{ n.style.cursor='grab'; n.style.pointerEvents='all';
    n.addEventListener('pointerdown',start);
    n.addEventListener('pointermove',e=>{ const d=F.dragState; if(!d) return; const p=svgPoint(e);
      if(!d.moved&&Math.hypot(p.x-d.x0,p.y-d.y0)<7) return;
      if(!d.moved){ d.moved=true; stopForEdit(); F.drag=true; }
      const s=nearString(p.y+HOVER_GAP*0.5), f=nearFret(p.x), h=HAND.f[F.f];
      if(h.string!==s||h.fret!==f){ const was=P.some(q=>q.g===F.f); dragTo(F.f,s,f); DRILL=null; if(was) edited(); settle(); refresh(); } });
    const end=e=>{ const d=F.dragState; if(!d) return; F.dragState=null; F.drag=false;
      if(!d.moved){   // a hovering finger lies over the next string's frets: with a finger chosen, a click on a fret there is meant for the fret
        const p=svgPoint(e), s=nearString(p.y);
        if(SEL&&SEL.finger&&s!==HAND.f[F.f].string&&Math.abs(FB.strY[s]-p.y)<9){ let f=0; for(let k=0;k<=FMAX;k++) if(p.x>=cellL(k)&&p.x<cellR(k)) f=k; clickCell(s,f); return; }
        clickFinger(F.f); return; }
      const h=HAND.f[F.f]; if(canPair(F.f,h.string,h.fret)&&(FIELD.on||P.length||true)) addPair(F.f,h.string,h.fret); else refresh(); };
    n.addEventListener('pointerup',end); n.addEventListener('pointercancel',()=>{ F.dragState=null; F.drag=false; });
  });
});
{ let td=null;
  thumbG.style.cursor='grab';
  thumbG.addEventListener('pointerdown',e=>{ e.preventDefault(); stopForEdit(); td=true; thumbG.setPointerCapture(e.pointerId); });
  thumbG.addEventListener('pointermove',e=>{ if(!td) return; const fr=fretAt(svgPoint(e).x), f2=HAND.f[2].fret;
    if(!P.some(p=>p.g)){ const b=Math.round(fr-0.5); if(b!==HAND.f[1].fret){ const H=handFor([],b); HAND.f=H.f; } HAND.thumb=Math.max(HAND.f[2].fret-3,Math.min(HAND.f[2].fret+3,fr)); return; }   // nothing placed: the thumb carries the hand
    HAND.thumb=Math.max(f2-3,Math.min(f2+3,fr)); });
  const end=()=>{ td=null; }; thumbG.addEventListener('pointerup',end); thumbG.addEventListener('pointercancel',end);
}
// the means of the step between the tones
segMeans.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b||b.disabled) return; stopForEdit();
  const v=b.dataset.v, m=v==='prebend'?'bend':v;
  if(v==='ham'||v==='pull'){ LEGATO[v]=!DRILL[v]; DRILL[v]=LEGATO[v]; DRILL.plan=planOf(DRILL,drill.dir); edited(); refresh(); return; }
  if(m==='bend') drill.dir=v==='prebend'?'down':'up';
  if(v==='pick'&&DRILL&&DRILL.means==='pick'){ LEGATO.ham=LEGATO.pull=DRILL.ham=DRILL.pull=false; }   // Fret: every step picked
  if(DRILL&&DRILL.means===m){ DRILL.dir=drill.dir; DRILL.plan=planOf(DRILL,drill.dir); edited(); refresh(); return; }
  const anchor=P.find(p=>p.g)||P[0]; MEANS=m; P=anchor?[anchor]:[]; DRILL=null; edited(); relayout(); settle(); relayout(); refresh(); });
holdBtn.addEventListener('click',()=>{ drill.hold=!drill.hold; holdChanged(); refresh(); });
$('prev').addEventListener('click',()=>{ const was=T.on; if(was) stopAll(); applySample(SI-1); if(was) run(); });
$('next').addEventListener('click',()=>{ const was=T.on; if(was) stopAll(); applySample(SI+1); if(was) run(); });
$('clear').addEventListener('click',()=>{ stopForEdit(); P=[]; DRILL=null; SEL=null; MEANS='pick'; LEGATO.ham=LEGATO.pull=false; CUSTOM=true; drill.hold=true;
  const H=handFor([],HAND.f[1].fret,0); HAND.f=H.f; HAND.thumb=H.thumb; settle(); refresh(); });
playBtn.addEventListener('click',()=>{ if(T.on) stopAll(); else run(); });
window.addEventListener('keydown',e=>{ if(e.code!=='Space') return; const tag=(e.target&&e.target.tagName||'').toLowerCase(); if(tag==='button'||tag==='input') return; e.preventDefault(); if(T.on) stopAll(); else run(); });
bpmIn.addEventListener('input',()=>{ drill.bpm=+bpmIn.value; bpmV.textContent=drill.bpm; });
bpmIn.addEventListener('change',()=>{ if(T.on) run(); });
clickIn.addEventListener('change',()=>{ drill.click=clickIn.checked; });
// Listen: the two hearings of the frequencies in hand; choosing the other morphs φ one tick, the hand staying put
// Listen: the orientation stays; the hand moves to the nearest place of the other diatonic semitone, same means if it can
function chooseHearing(h){
  stopForEdit(); if(!FIELD.on||h===hearing&&(!DRILL||hearingOf(DRILL)===h)) return;
  hearing=h; SAMPLES=sampling();
  if(!DRILL){ P=[]; SEL=null; MEANS='pick'; settle(); refresh(); return; }
  const D0=DRILL, same0=D0.lo.s===D0.hi.s;
  let best=null, bc=1e9; instances().forEach(r=>{ const c=3*Math.abs(r.lo.s-D0.lo.s)+3*Math.abs(r.hi.s-D0.hi.s)+Math.abs(r.lo.f-D0.lo.f)+Math.abs(r.hi.f-D0.hi.f)+((r.lo.s===r.hi.s)===same0?0:2); if(c<bc){ bc=c; best=r; } });
  if(!best){ refresh(); return; }
  const oneStr=best.lo.s===best.hi.s, means=(D0.means!=='pick'&&oneStr&&best.lo.f>=1)?D0.means:'pick';
  const D=drillOfSample({r:best,means,ham:oneStr&&D0.ham,pull:oneStr&&D0.pull,dir:drill.dir});
  const i=SAMPLES.findIndex(x=>x.r===best&&x.means===means&&!!x.ham===!!D.ham&&!!x.pull===!!D.pull&&(x.dir||'up')===drill.dir);
  applyDrill(D,i<0); if(i>=0) SI=i; else{ const j=SAMPLES.findIndex(x=>x.r===best); if(j>=0) SI=j; }
  refresh();
}
hearSeg.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; chooseHearing(b.dataset.v); });
window.addEventListener('resize',refresh);
/* THE SILENT SWITCH (as in the Tonal Field app, v359). A phone or tablet mutes a page's Web Audio while its ring/silent switch
   is on silent, though a video on the same page would play. The page says it plays media, not alert sounds: newer iOS takes
   that as navigator.audioSession.type = 'playback'; older iOS switches to media playback while an ordinary <audio> element
   is playing, so a silent one loops from the first tap. It is paused while the page is hidden. */
let mediaEl=null;
function mediaUnlock(){
  try{ if(navigator.audioSession&&navigator.audioSession.type!=='playback') navigator.audioSession.type='playback'; }catch(err){}
  try{
    if(!mediaEl){
      const n=8000, buf=new ArrayBuffer(44+n), v=new DataView(buf), str=(o,t)=>{ for(let i=0;i<t.length;i++) v.setUint8(o+i,t.charCodeAt(i)); };
      str(0,'RIFF'); v.setUint32(4,36+n,true); str(8,'WAVEfmt '); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
      v.setUint32(24,8000,true); v.setUint32(28,8000,true); v.setUint16(32,1,true); v.setUint16(34,8,true); str(36,'data'); v.setUint32(40,n,true);
      for(let i=0;i<n;i++) v.setUint8(44+i,128);                        // one second of 8-bit silence
      mediaEl=document.createElement('audio'); mediaEl.setAttribute('playsinline',''); mediaEl.setAttribute('webkit-playsinline','');
      mediaEl.loop=true; mediaEl.preload='auto'; mediaEl.src=URL.createObjectURL(new Blob([buf],{type:'audio/wav'}));
      document.addEventListener('visibilitychange',()=>{ if(mediaEl&&document.hidden){ try{ mediaEl.pause(); }catch(err){} } }); }
    if(mediaEl.paused){ const pr=mediaEl.play(); if(pr&&pr.catch) pr.catch(()=>{}); }
  }catch(err){}
}
['touchend','pointerup','click','keydown'].forEach(t=>document.addEventListener(t,()=>{ mediaUnlock(); if(ctx&&ctx.state!=='running'){ try{ ctx.resume(); }catch(err){} } },true));
// the field turned by hand: the hand keeps its frequencies when they are still a diatonic semitone (the hearing follows
// them); otherwise the nearest place of the hearing in use is loaded
function fieldMoved(){
  SAMPLES=sampling(); const same=x=>x.r.lo.s===DRILL.lo.s&&x.r.lo.f===DRILL.lo.f&&x.r.hi.s===DRILL.hi.s&&x.r.hi.f===DRILL.hi.f;
  if(DRILL){ const h=hearingOf(DRILL);
    if(h){ if(h!==hearing){ hearing=h; SAMPLES=sampling(); } const i=SAMPLES.findIndex(same); if(i>=0) SI=i; DRILL.plan=planOf(DRILL,drill.dir); refresh(); return; }
    let bi=-1, bc=1e9; SAMPLES.forEach((x,i)=>{ const c=3*Math.abs(x.r.lo.s-DRILL.lo.s)+Math.abs(x.r.lo.f-DRILL.lo.f)+(x.means===DRILL.means?0:0.5)+(x.r.lo.s===x.r.hi.s?0:0.25); if(c<bc){ bc=c; bi=i; } });
    if(bi>=0){ applySample(bi); return; } }
  COMP=completions(); if(!COMP.some(c=>c.means===MEANS&&consistent(c))){ P=[]; SEL=null; relayout(); }
  settle(); refresh();
}
function ringMoved(){ SAMPLES=sampling(); if(DRILL){ const i=SAMPLES.findIndex(x=>x.r.lo.s===DRILL.lo.s&&x.r.lo.f===DRILL.lo.f&&x.r.hi.s===DRILL.hi.s&&x.r.hi.f===DRILL.hi.f); if(i>=0) SI=i; } refresh(); }
orderBtn.addEventListener('click',()=>{ RING.goal=RING.goal===1?0:1; try{ localStorage.setItem('structures-ring',RING.goal?'chain':'chrom'); }catch(err){} refresh(); });
{ const gb=$('ghost'); gb.setAttribute('aria-pressed',GHOST.on); gb.addEventListener('click',()=>{ GHOST.on=!GHOST.on; gb.setAttribute('aria-pressed',GHOST.on); try{ localStorage.setItem('structures-ghost',GHOST.on?'on':'off'); }catch(err){} }); }
diatBtn.addEventListener('click',()=>{ diatonic=!diatonic; valKey=''; refresh(); });
// the structure: its name opens the list of all of them; the others open their own pages until they are merged in
{ const btn=$('structBtn'), menu=$('structMenu'), q=location.search;
  const LIST=[['Semitone',null],['Tone','tone.html'],['Frame','frame.html'],['Dominant Chain','chain.html'],['Interval',''],['Scale',''],['Arpeggio',''],['Block Chord','']];
  menu.innerHTML=LIST.map(([n,h])=>h===null?'<span class="cur" role="menuitem">'+n+'</span>':(h?'<a role="menuitem" href="'+h+q+'">'+n+'<small>own page</small></a>':'<span class="soon" role="menuitem">'+n+'<small>coming</small></span>')).join('');
  btn.addEventListener('click',e=>{ e.stopPropagation(); const open=menu.hidden; menu.hidden=!open; btn.setAttribute('aria-expanded',open); });
  document.addEventListener('click',()=>{ menu.hidden=true; btn.setAttribute('aria-expanded',false); });
}
/*@COPY:1414-1453*/
// g(x): off by default, so the field is a choice made against the world without it (remembered on this device)
const gxBtn=$('gx'), eqn=$('eqn');
try{ FIELD.on=localStorage.getItem('structures-gx')==='on'; }catch(err){}
function syncGx(){ gxBtn.setAttribute('aria-pressed',FIELD.on); eqn.classList.toggle('on',FIELD.on); listenEl.hidden=!FIELD.on; document.body.classList.toggle('gxOn',FIELD.on); }
gxBtn.addEventListener('click',()=>{ stopForEdit(); FIELD.on=!FIELD.on; try{ localStorage.setItem('structures-gx',FIELD.on?'on':'off'); }catch(err){} syncGx();
  const keep=DRILL; SAMPLES=sampling(); if(keep){ const i=SAMPLES.findIndex(x=>x.r.lo.s===keep.lo.s&&x.r.lo.f===keep.lo.f&&x.r.hi.s===keep.hi.s&&x.r.hi.f===keep.hi.f); if(i>=0) SI=i; } else { P=[]; settle(); } refresh(); });
try{ if(localStorage.getItem('structures-ring')==='chain'){ RING.goal=RING.m=RING.t=1; } }catch(err){}
/*@COPY:1475-1478*/
syncGx();
/* FIT: on a screen wider than the page, the whole page — title to fretboard — scales up to the window, until it meets the
   width or the height, whichever comes first (the settings panel, when open, is left out of the measure). Narrower
   windows keep the page as it is. */
let ZOOM=1; const afterFit=[];
{ const wrapEl=document.querySelector('.wrap'), mixerEl=document.getElementById('mixer'); let pend=0;
  const fit=()=>{ pend=0; const r=wrapEl.getBoundingClientRect(), h=r.height/ZOOM-(mixerEl&&!mixerEl.hidden?mixerEl.getBoundingClientRect().height/ZOOM+18:0);
    const s=window.innerWidth<=980?1:Math.max(1,Math.min(3,window.innerWidth/980,(window.innerHeight-4)/Math.max(300,h)));
    if(Math.abs(s-ZOOM)>0.004){ ZOOM=s; wrapEl.style.zoom=s===1?'':s.toFixed(4); }
    afterFit.forEach(f=>f()); };
  const later=()=>{ if(!pend) pend=requestAnimationFrame(fit); };
  window.addEventListener('resize',later); new ResizeObserver(later).observe(wrapEl);
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(later); later(); }
SAMPLES=sampling(); COMP=completions(); applySample(0);
placeRing();
})();
