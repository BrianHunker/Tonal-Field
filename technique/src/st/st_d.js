
/* ---------- the ring: the twelve letters round a circle, the field inside them ----------
   OUTER RING: the anchor — drag the letters round and the field stays where it is (Do moves, magnetic at each semitone).
   INNER RING: the function — click a syllable of the field to make it the modal root; drag the field round to rotate it
   under the letters (the letters stay; Do moves). Selected (click the ring), the number row moves φ; a syllable key held
   (d r m f s l t) while a letter is clicked gives that letter that function.
   1|5: chromatic order or the dominant chain. LISTEN morphs the field under the fixed letters, one tick. */
const LET={off:0,offA:0,offC:0};                                         // the letter ring's turn on screen (semitones), eased; offC: on the chain
/*@COPY:599-622*/
/*@COPY:630-641*/
/*@COPY:644-671*/
/*@COPY:672-688*/
function buildWedge(){
  if(!DRILL){ wedge.setAttribute('d',''); rLbls.forEach(g=>g.classList.remove('pair')); return; }
  const a=pcOf(DRILL.lo.s,DRILL.lo.f), b=(a+1)%12, sa=ringPos(a), sb=ringPos(b);
  const d=((sb-sa)%12+12)%12, s0=d>6?sb:sa, ext=d>6?12-d:d;
  const at=(r,q)=>{ const t=q*Math.PI/6; return [RG.c+r*Math.sin(t),RG.c-r*Math.cos(t)]; };
  const [x1,y1]=at(RG.RW,s0), [x2,y2]=at(RG.RW,s0+ext);
  wedge.setAttribute('d','M'+x1.toFixed(1)+' '+y1.toFixed(1)+' A'+RG.RW+' '+RG.RW+' 0 0 1 '+x2.toFixed(1)+' '+y2.toFixed(1));
  rLbls.forEach((g,pc)=>g.classList.toggle('pair',pc===a||pc===b));
}
/*@COPY:702-706*/
// the inner ring: a syllable clicked becomes the modal root
let DRAGF=null, dragFEnd=0;                                             // the field being turned by hand
valLbls.forEach(t=>{ t.style.cursor='pointer'; t.addEventListener('click',()=>{ if(FIELD.lit<0.5||performance.now()-dragFEnd<250) return; const k=SYL.indexOf(t.textContent); if(k<0) return; PHI.root=k; refresh(); }); });

/* ---------- moving φ ----------
   Every change of orientation is Do moving d semitones under the fixed letters (−6 … 6). The distance decides how it is
   shown: a π/6 shift (one semitone) ROTATES the field; anything larger MORPHS, the dial turning the nearest way (on the
   chain ring a morph is itself a rotation, one seat per tick). Dragging the field rotates it, seat for seat. The ghost
   keeps the orientation just left, a faint outline, for comparison. */
const GHOST={on:false,doPc:null};
try{ GHOST.on=localStorage.getItem('structures-ghost')==='on'; }catch(err){}
const ghostG=el('g',{'pointer-events':'none',opacity:0}); ringSvg.insertBefore(ghostG,valG.nextSibling);
const ghostPath=el('path',{d:'',class:'ghostLine'},ghostG); let ghostChain=null;
function placeGhost(){
  const chain=RING.m>=0.5, swing=Math.abs(1-2*RING.m), show=GHOST.on&&GHOST.doPc!==null&&GHOST.doPc!==PHI.doPc;
  ghostG.setAttribute('opacity',show?(FIELD.lit*swing).toFixed(3):0); if(!show) return;
  if(chain!==ghostChain){ ghostChain=chain; let d='';
    for(let i=0;i<=144;i++){ const k=12*i/144, r=VAL.R0+VAL.K*(chain?Math.cos(k*Math.PI/6):gOf(k*Math.PI/6)), a=k*Math.PI/6;
      d+=(i?'L':'M')+(RG.c+r*Math.sin(a)).toFixed(2)+' '+(RG.c-r*Math.cos(a)).toFixed(2); }
    ghostPath.setAttribute('d',d+'Z'); }
  const re=GHOST.doPc+2;                                                  // the old Re, by pitch: it turns with the letters
  ghostG.setAttribute('transform','rotate('+((chain?7*re+LET.offC:re+LET.offA)*30).toFixed(2)+' '+RG.c+' '+RG.c+')');
}
const MORPH_MS=1000;
let triPos=0, triDir=1; const ARROW={up:false,down:false};
function tritoneStep(){ let d=ARROW.up&&!ARROW.down?1:(ARROW.down&&!ARROW.up?-1:triDir); triPos+=d;   // held arrows say which way; else it hovers up, down, down, up …
  if(triPos>=1){ triPos=1; triDir=-1; } else if(triPos<=-1){ triPos=-1; triDir=1; } return 6*d; }
// TURNING THE RING WHILE IT PLAYS: on the Structures page the ring chooses the drill, so turning it stops playback; on a
// drill book's pages (the walks, Chords, a song) the drill is fixed and the ring only says how it is heard — it turns, by
// keys, letters or the field, and the colours follow, while the music plays on
const ringStops=()=>typeof BOOK==='undefined';
function modulate(d){
  d=Math.round(d); if(!d||!FIELD.on) return; if(ringStops()) stopForEdit();
  const was=PHI.doPc, reT=was+2+LET.off;
  if(Math.abs(d)>1&&!reduce){
    MORPH={t0:performance.now(),dur:MORPH_MS,reA:FIELD.re,reCA:FIELD.reC}; }
  else{ MORPH=null; FIELD.mx=-1; }                                          // a semitone: the field rotates one seat
  PHI.doPc=((was+d)%12+12)%12; GHOST.doPc=was; fieldMoved();
}
// the ring is selected by clicking it (the number row then moves φ), and stays so until a click elsewhere
let RINGSEL=false; const ringBoxEl=ringSvg.parentNode;
document.addEventListener('pointerdown',e=>{ RINGSEL=ringBoxEl.contains(e.target); ringBoxEl.classList.toggle('sel',RINGSEL); },true);
const SOLKEY={d:0,r:1,m:2,f:3,s:4,l:5,t:6}; let solHeld=null;
const ROW={'1':-1,'2':-2,'3':-3,'4':-4,'5':-5,'7':5,'8':4,'9':3,'0':2,'-':1};   // left of 6 Do moves down by the key's face, right of it up by the mirror; 6 the tritone
window.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey) return; const tg=e.target, tag=(tg&&tg.tagName||'').toLowerCase();
  if(tag==='input'&&tg.type!=='checkbox'&&tg.type!=='range'||tag==='textarea'||tag==='select') return;
  if(e.key==='ArrowUp') ARROW.up=true; if(e.key==='ArrowDown') ARROW.down=true;
  const k=e.key.toLowerCase(); if(SOLKEY.hasOwnProperty(k)) solHeld=k;
  if(!RINGSEL||e.repeat) return;
  if(e.key==='6'){ modulate(tritoneStep()); e.preventDefault(); }
  else if(ROW.hasOwnProperty(e.key)){ modulate(ROW[e.key]); e.preventDefault(); }
});
window.addEventListener('keyup',e=>{ if(e.key==='ArrowUp') ARROW.up=false; if(e.key==='ArrowDown') ARROW.down=false; if(solHeld===e.key.toLowerCase()) solHeld=null; });
window.addEventListener('blur',()=>{ solHeld=null; ARROW.up=ARROW.down=false; });
{ let drag=null;
  const angOf=e=>{ const r=ringSvg.getBoundingClientRect(), x=e.clientX-(r.left+r.width/2), y=e.clientY-(r.top+r.height/2); return {a:Math.atan2(x,-y)*6/Math.PI, d:Math.hypot(x,y)/(r.width/2)}; };
  ringSvg.addEventListener('pointerdown',e=>{ if(!FIELD.on) return; const p=angOf(e);
    if(p.d>=0.72&&solHeld&&FIELD.lit>0.5){                                // a syllable key held, a letter clicked: that letter takes that function
      const s=Math.round(p.a), pc=RING.m>=0.5?((7*s-LET.off)%12+12)%12:((s-LET.off)%12+12)%12;
      let d=(((pc-SYLPC[SOLKEY[solHeld]])-PHI.doPc)%12+12)%12; if(d>6) d-=12; if(d===6||d===-6) d=tritoneStep();
      modulate(d); e.preventDefault(); return; }
    if(p.d<0.72){ if(FIELD.lit>0.5) drag={inner:true,last:p.a,acc:0,id:e.pointerId,was:PHI.doPc}; return; }      // the field: a drag only once it moves, so a click still picks a syllable
    if(T.on&&ringStops()) stopAll(); drag={a:p.a,off:LET.off,was:PHI.doPc}; ringSvg.setPointerCapture(e.pointerId); e.preventDefault(); });
  ringSvg.addEventListener('pointermove',e=>{ if(!drag) return;
    if(drag.inner){ const a=angOf(e).a; drag.acc+=((a-drag.last+6)%12+12)%12-6; drag.last=a;
      if(!DRAGF){ if(Math.abs(drag.acc)<0.35) return;
        if(ringStops()) stopForEdit(); try{ ringSvg.setPointerCapture(drag.id); }catch(err){}
        MORPH=null; FIELD.mx=-1; const re=PHI.doPc+2+LET.off;
        DRAGF={re,reC:fifth(re),x:0,chain:RING.m>=0.5}; }
      DRAGF.x=drag.acc;                                                   // the field turns with the hand, seat for seat
      if(reduce){ const n=Math.round(DRAGF.x); if(n){ PHI.doPc=((PHI.doPc+(DRAGF.chain?7*n:n))%12+12)%12; drag.acc-=n; DRAGF.x-=n; const re=PHI.doPc+2+LET.off; DRAGF.re=re; DRAGF.reC=fifth(re); fieldMoved(); } }
      return; }
    let da=angOf(e).a-drag.a; da=((da+6)%12+12)%12-6;
    if(RING.m>=0.5) da=((7*Math.round(da))%12+12)%12, da=da>6?da-12:da;   // on the chain one seat is −5 semitones
    const want=drag.off+Math.round(da), step=want-LET.off; if(!step) return;
    LET.off=want; PHI.doPc=((PHI.doPc-step)%12+12)%12; ringMoved(); });
  const end=()=>{
    if(DRAGF){ const n=Math.round(DRAGF.x);                                // let go: the field settles on the nearest seat, and that is φ
      FIELD.re=DRAGF.re+(DRAGF.chain?7:1)*DRAGF.x; FIELD.reC=DRAGF.reC+(DRAGF.chain?1:7)*DRAGF.x;
      PHI.doPc=((PHI.doPc+(DRAGF.chain?7*n:n))%12+12)%12; DRAGF=null; dragFEnd=performance.now(); fieldMoved(); }
    if(drag&&drag.was!==PHI.doPc) GHOST.doPc=drag.was;
    drag=null; };
  ringSvg.addEventListener('pointerup',end); ringSvg.addEventListener('pointercancel',end);
}
