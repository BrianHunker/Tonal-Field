/* ---------- a student's drill book: pages of walks ----------
   The same tool, its controls turned to a set of pages. Each page is a walk of FRAMES — three diatonic tones on a string —
   up the strings (or down them), one frame a string, the first tone of the next frame held at the end of each bar (the
   dominant-chain bar: three eighths across a frame, the fourth an eighth tied to a half). At the far string it returns,
   each bar the outbound bar run backwards, so the held tone is always the next frame's nearest finger — finger 1 walking
   up, finger 4 walking down. Prev | Next turn the pages; Hold keeps the page looping, otherwise each page plays four
   times and turns to the next. φ is the page's own: set by its first tone and that tone's function (G♯_Ti), with Re at
   12 o'clock. The ring still turns it (the number row, the letters, the field), the hand staying put. */
const PAGES=BOOK.pages; FLAT_OFF=true; SEG_EACH=!!BOOK.countEach;
let STRSEL=NSTR-1;                                                     // Semimodes: the string the page is played on (low E first)
const effPage=pg=>!BOOK.strings?pg:Object.assign({},pg,{string:STRSEL,anchor:pg.anchor&&Object.assign({},pg.anchor,{s:STRSEL}),paint:pg.paint&&[STRSEL]});                                                // the book's pages, given by the build
let PAGE=0; const WALK={ham:false,pull:false};
const W_DEG={do:0,re:1,mi:2,fa:3,sol:4,la:5,ti:6}, W_MAJ=[0,2,4,5,7,9,11], W_FING={dim:[1,2,4],min:[1,3,4],maj:[1,2,4]};
const wSemi=d=>12*Math.floor(d/7)+W_MAJ[((d%7)+7)%7];
const pageCt=$('pageCt');
// the frames, string by string from the page's string: each its three tones (low to high), its shape and the hand that plays it
function walkFrames(pg){
  const d0=W_DEG[pg.deg], P0=openMidi(pg.string)+pg.fret, sg=pg.dir==='down'?-1:1, out=[];
  for(let k=0;k<=pg.links;k++){ const si=pg.string-sg*k; if(si<0||si>=NSTR) break;
    const tones=[0,1,2].map(j=>{ const d=d0+sg*(3*k+j); return {deg:d,fret:Math.round(P0+wSemi(d)-wSemi(d0)-openMidi(si))}; }).sort((x,y)=>x.fret-y.fret);
    const a=tones[1].fret-tones[0].fret, b=tones[2].fret-tones[1].fret, shape=a===2&&b===2?'maj':(a===2?'min':'dim');
    const pl=tones.map((t,r)=>({g:W_FING[shape][r],s:si,f:t.fret}));
    out.push({string:si,tones,shape,pl,hand:handFor(pl)}); }
  return out;
}
// the notes in playing order: out, four tones a bar; back, each bar the outbound one reversed
function walkPlan(pg){
  const fr=walkFrames(pg), d0=W_DEG[pg.deg], sg=pg.dir==='down'?-1:1, L=fr.length-1, at={};
  fr.forEach((F,k)=>F.tones.forEach((t,r)=>{ at[t.deg]={F,k,r}; }));
  const nt=d=>{ const {F,k,r}=at[d], f=F.tones[r].fret; return {string:F.string,fret:f,pitch:f,push:0,finger:W_FING[F.shape][r],frame:k,pick:true,glide:false,pre:false,kind:'pick',hi:false}; };
  const plan=[];
  for(let b=0;b<L;b++) for(let j=0;j<4;j++) plan.push(nt(d0+sg*(3*b+j)));
  for(let b=L-1;b>=0;b--) for(let j=3;j>=0;j--) plan.push(nt(d0+sg*(3*b+j)));
  if(WALK.ham||WALK.pull) plan.forEach((e,i)=>{ const q=plan[(i+plan.length-1)%plan.length];   // legato along a string: hammer-ons rising, pull-offs falling
    if(q.string!==e.string||q.pitch===e.pitch) return;
    if(e.pitch>q.pitch&&WALK.ham){ e.pick=false; e.kind='ham'; } else if(e.pitch<q.pitch&&WALK.pull){ e.pick=false; e.kind='pull'; } });
  return {plan,frames:fr,bars:2*L};
}
function walkFig(bars){ FIG=[]; for(let b=0;b<bars;b++) FIG.push({s:4*b,d:.5},{s:4*b+.5,d:.5},{s:4*b+1,d:.5},{s:4*b+1.5,d:2.5}); LOOP=4*bars; BAR_START=i=>i%4===0; }
// a page written out note by note on one string (Semimodes): bars of four [fret, finger, hand] (finger 0 open; hand a name,
// the bar's group unless given), each bar in a group that shares one name — its tones, low to high
// a Semimodes page from its function: up from the open string four tones (open, then a frame in its fingering), on up the
// upper four to the octave at fret 12 (finger 1 shifting up, picked, into the frame), down those four to the 5th, then on
// down the lower four to the open string — the walk up mirrored, each half paused on its last tone
function semiBars(pg){
  const m=W_DEG[pg.mode], shp=(a,b)=>a===2&&b===2?'maj':(a===2?'min':'dim');
  const up=[1,2,3].map(j=>wSemi(m+j)-wSemi(m)), fu=W_FING[shp(up[1]-up[0],up[2]-up[1])];
  const dn=[0,1,2,3].map(j=>12-(wSemi(m)-wSemi(m-j))), fd=W_FING[shp(dn[1]-dn[2],dn[0]-dn[1])];
  const U=[[0,0],[up[0],fu[0]],[up[1],fu[1]],[up[2],fu[2]]], D=[[dn[0],fd[2]],[dn[1],fd[1]],[dn[2],fd[0]],[dn[3],1,'shift']];
  return [{g:0,n:U},{g:1,n:D.slice().reverse()},{g:1,n:D},{g:0,n:U.slice().reverse()}];   // up to the 4th, on up to the octave, down to the 5th, on down to the open string
}
function seqPlan(pg){
  const plan=[], keys=[], bars=pg.bars||semiBars(pg);
  bars.forEach(b=>b.n.forEach(([f,g,h])=>{ const hk=h===undefined?'g'+b.g:h; if(!keys.includes(hk)) keys.push(hk);
    plan.push({string:pg.string,fret:f,pitch:f,push:0,finger:g,frame:keys.indexOf(hk),grp:b.g,pick:true,glide:false,pre:false,kind:'pick',hi:false}); }));
  const frames=keys.map((hk,k)=>{ const pl=[]; plan.filter(n=>n.frame===k).forEach(n=>{ if(n.finger&&!pl.some(q=>q.g===n.finger)) pl.push({g:n.finger,s:pg.string,f:n.fret}); });
    return {string:pg.string,tones:[],pl,hand:handFor(pl)}; });
  const groups=[]; for(let k=0;k<=Math.max(...bars.map(b=>b.g));k++)
    groups.push({string:pg.string,tones:[...new Set(plan.filter(n=>n.grp===k).map(n=>n.fret))].sort((x,y)=>x-y).map(f=>({fret:f}))});
  if(WALK.ham||WALK.pull) plan.forEach((e,i)=>{ const q=plan[(i+plan.length-1)%plan.length];
    if(q.string!==e.string||q.pitch===e.pitch) return;
    if(e.pitch>q.pitch&&WALK.ham){ e.pick=false; e.kind='ham'; } else if(e.pitch<q.pitch&&WALK.pull){ e.pick=false; e.kind='pull'; } });
  return {plan,frames,groups,bars:bars.length};
}
function walkDrill(i){
  const pg=effPage(PAGES[i]), W=pg.kind==='seq'?seqPlan(pg):walkPlan(pg), a=W.plan[0], b=W.plan[1];
  return {walk:true,page:i,means:'pick',ham:WALK.ham,pull:WALK.pull,dir:'up',plan:W.plan,frames:W.frames,groups:W.groups,bars:W.bars,
    lo:{s:a.string,f:a.fret,g:a.finger},hi:{s:b.string,f:b.fret,g:b.finger}};
}
// the page's φ: a tone and its function (a walk's first tone, unless the page names another); the letters turn so the
// page's chosen function (Re unless it says) stands at 12 o'clock
// A change of φ from one page to the next is a modulation like any other: the page left becomes the ghost, and a move of more
// than π/6 morphs (a semitone rotates). Where the letters turn with it (Frame Walk keeps Re at 12) the field holds its place.
let phiReady=false;
function pagePhi(pg){ const a=pg.anchor||{s:pg.string,f:pg.fret,deg:pg.deg}, was=PHI.doPc;
  PHI.doPc=((pcOf(a.s,a.f)-SYLPC[W_DEG[a.deg]])%12+12)%12;
  if(phiReady&&was!==PHI.doPc){ let d=((PHI.doPc-was)%12+12)%12; if(d>6) d-=12; GHOST.doPc=was;
    if(Math.abs(d)>1&&!reduce&&FIELD.lit>0.001) MORPH={t0:performance.now(),dur:MORPH_MS,reA:FIELD.re,reCA:FIELD.reC}; else MORPH=null; }
  phiReady=true;
  let off=-((PHI.doPc+SYLPC[W_DEG[pg.top||'re']])%12); if(off<-6) off+=12; LET.off=off; MODE.key=''; paintOnly=pg.paint?new Set(pg.paint):null; }
function loadPage(i){
  PAGE=SI=((i%PAGES.length)+PAGES.length)%PAGES.length; const pg=effPage(PAGES[PAGE]);
  pagePhi(pg); RING.goal=0;                          // stopped: the order of the page's first half
  DRILL=walkDrill(PAGE); walkFig(DRILL.bars); layoutTab(DRILL.bars); MEANS='pick'; CUSTOM=false; SEL=null;
  const F0=DRILL.frames[0]; HAND.f=cloneHand(F0.hand).f; HAND.thumb=F0.hand.thumb;
  P=F0.pl.map(q=>Object.assign({},q));                                  // stopped, the hand rests on its first frame
}
function walkSeg(i,pass){
  const D=walkDrill(i);
  return {D,pass:pass||0,plan:D.plan,hand:cloneHand(D.frames[0].hand),hands:D.frames.map(F=>F.hand),si:i,custom:false,mode:'pick',strs:{},plant:true,xt:0};
}
// the tool's own functions, given to the pages
function applySample(i){ if(CHORDS){ CHORDS.show(i,i<SI?-1:1); return; } loadPage(i); refresh(); }
function run(){
  if(CHORDS){ CHORDS.run(); return; }                                    // the Chords page plays its own figure
  if(!DRILL) return;
  ensureCtx().then(()=>{
    if(T.on) stopAll();
    T.beat=60/drill.bpm; loadPage(PAGE);
    const s=walkSeg(PAGE); placeSeg(s,ctx.currentTime+0.1);
    T.segs=[s]; T.si=0; T.nextI=0; T.nextCycle=0; T.nextBeat=-COUNT; T.live=[]; T.shown=null; T.on=true;
    tick(); T.timer=setInterval(tick,25);
    playBtn.textContent='Stop'; playBtn.classList.add('on');
  });
}
function placeSeg(s,t){ if(s.place) return s.place(s,t); s.count=COUNT; s.countStart=t; s.loopStart=t+COUNT*T.beat; s.loops=SEG_EACH?1:((drill.hold||PAGES.length<2)?Infinity:(BOOK.loops||ADV_LOOPS)); s.end=s.loopStart+s.loops*LOOP*T.beat; }
function nextSeg(after){
  if(CHORDS&&CHORDS.nextSeg) return CHORDS.nextSeg(after);
  if(SEG_EACH){ const last=T.segs[T.segs.length-1], pass=last?last.pass+1:0;   // a count-in before every pass: the page again until its passes are done (or always, on Hold)
    if(drill.hold||PAGES.length<2||pass<(BOOK.loops||1)){ const s=walkSeg(after,pass); walkFig(s.D.bars); return s; } }
  const i=((after+1)%PAGES.length+PAGES.length)%PAGES.length, s=walkSeg(i); walkFig(s.D.bars); return s; }
function showSeg(s){
  if(s.chord){ T.shown=s; if(s.showBar){ s.showBar(s); return; } DRILL=s.D; layoutTab(s.D.bars); refresh(); return; }   // a chord: the Ring stays as the listener left it
  T.shown=s; DRILL=s.D; PAGE=SI=s.si; MEANS='pick'; SEL=null; P=[]; pagePhi(effPage(PAGES[PAGE])); { const pg=PAGES[PAGE]; RING.goal=pg.order==='alt'?s.pass%2:0; }   // the next pass's order shows through its count-in
  HAND.f=cloneHand(s.hand).f; HAND.thumb=s.hand.thumb; layoutTab(s.D.bars); refresh();
}
function holdChanged(){
  if(!T.on||PAGES.length<2||SEG_EACH) return;
  const now=ctx.currentTime, s=segAt(now);
  if(drill.hold){ const k=T.segs.indexOf(s); if(T.si===k){ s.loops=Infinity; s.end=Infinity; } }
  else if(!isFinite(s.loops)){ const cyc=Math.max(0,Math.floor((now-s.loopStart)/(LOOP*T.beat))); s.loops=Math.max(BOOK.loops||ADV_LOOPS,cyc+1); s.end=s.loopStart+s.loops*LOOP*T.beat; }
}
function refresh(){
  CAND={C:[],fingers:new Set(),cells:new Map()};
  MARKS.forEach(m=>{ m.setAttribute('visibility','hidden'); m.classList.remove('cand','sel'); });
  INST=new Set(); const vc=CHORDS&&CHORDS.cells?CHORDS.cells():null; if(vc) vc.forEach(k=>INST.add(k)); else if(DRILL) DRILL.plan.forEach(n=>INST.add(n.string*(FMAX+1)+n.fret));   // a song: only the grip on the board
  holdBtn.setAttribute('aria-pressed',drill.hold); diatBtn.setAttribute('aria-pressed',diatonic);
  playBtn.disabled=!DRILL&&!T.on&&!(CHORDS&&P.length);
  pageCt.textContent=(PAGE+1)+'/'+PAGES.length;
  orderBtn.querySelectorAll('span').forEach((x,i)=>x.classList.toggle('on',(i===1)===(RING.goal===1)));
  buildTabNotes(); buildWedge();
}
function buildWedge(){ wedge.setAttribute('d',''); rLbls.forEach(g=>g.classList.remove('pair')); }
// the walk in TAB: numbers on their lines, eighths beamed in pairs, each bar's fourth tone tied over to a half note on beat 3
function buildTabNotes(){
  while(noteG.firstChild) noteG.removeChild(noteG.firstChild);
  tabNotes=[]; const D=(T.on&&T.shown)?T.shown.D:DRILL; rows.forEach(r=>r.classList.add('sel')); rowLbls.forEach(l=>l.classList.add('sel'));
  if(!D) return;
  if(D.chord&&CHORDS){ CHORDS.tab(D); return; }
  const plan=D.plan, stemTop=TB.rowY[NSTR-1]+10, stemLong=26, stemShort=13, slurPts=[];
  FIG.forEach((e,i)=>{ const n=plan[i]; if(!n) return; const x=xBeat(e.s), y=TB.rowY[n.string];
    const o=numberAt(x,y,String(n.fret)); tabNotes.push(o);
    slurPts.push({x,y,leg:(n.kind==='ham'||n.kind==='pull'),lbl:n.kind==='ham'?'H':(n.kind==='pull'?'P':'')});
    el('line',{x1:x,y1:stemTop,x2:x,y2:stemTop+stemLong,class:'inkS','stroke-width':1.3},noteG);
    if(i%2===0) el('rect',{x:x-0.65,y:stemTop+stemLong-3.5,width:TB.cw+1.3,height:3.5,class:'ink'},noteG);
    if(i%4===3){ const xh=xBeat(e.s+0.5); el('line',{x1:xh,y1:stemTop,x2:xh,y2:stemTop+stemShort,class:'inkS','stroke-width':1.3},noteG);
      el('path',{d:'M'+(x+2)+' '+(stemTop+stemLong+6)+' Q'+((x+xh)/2)+' '+(stemTop+stemLong+13)+' '+(xh-2)+' '+(stemTop+stemShort+6),class:'curve'},noteG);
      const ft=String(n.fret), tw=7.6*ft.length+12, tied=numberAt(xh,y,'('+ft+')',tw);   // held, not played again
      tied.num.classList.add('tied'); o.extra=(o.extra||[]).concat(tied.num); slurPts[slurPts.length-1].x2=xh;
      const xa=x+3.8*ft.length+1, xb=xh-tw/2+3;
      el('path',{d:'M'+xa.toFixed(1)+' '+(y+7)+' Q'+((xa+xb)/2).toFixed(1)+' '+(y+13)+' '+xb.toFixed(1)+' '+(y+7),class:'curve'},noteG); } });
  { const arc=(xa,xb,y)=>el('path',{d:'M'+(xa+3)+' '+(y-11)+' Q'+((xa+xb)/2)+' '+(y-11-Math.min(16,6+(xb-xa)*0.12))+' '+(xb-3)+' '+(y-11),class:'curve'},noteG); let g0=-1;
    slurPts.forEach((q,i)=>{ if(q.lbl){ const t=el('text',{x:i>0?((slurPts[i-1].x2||slurPts[i-1].x)+q.x)/2:q.x-16,y:q.y-24,class:'bendLbl'},noteG); t.textContent=q.lbl; }
      if(i===0&&q.leg){ arc(q.x-34,q.x,q.y); return; }
      if(q.leg){ if(g0<0) g0=i-1; if(i===slurPts.length-1||!slurPts[i+1].leg){ arc(slurPts[g0].x2||slurPts[g0].x,q.x,q.y); g0=-1; } } }); }
}
// the ring turns φ under the hand; the hand and the walk stay
function fieldMoved(){ MODE.key=''; refresh(); }
function ringMoved(){ refresh(); }
// the dots belong to the page (no dragging); the drawn hand pairs its own way (THE HAND, below)
function clickFinger(){} function clickCell(){} function addPair(){} function dragTo(){} function settle(){} function relayout(){} function edited(){}
fingers.forEach(F=>{ F.c.style.pointerEvents='none'; F.t.style.pointerEvents='none'; }); thumbG.style.pointerEvents='none';
/* ---------- the frame and the mode ----------
   The FRAME label names the frame the hand is on, low to high, a whole step marked by the gap between names (TiDo_Re). It
   changes the moment a finger lands on a new string: walking up on the held tone (the & of 2), walking down on the & of 1.
   The MODE is the last tone held for a half note (on the & of 2), lit where it was last played: its letter on the ring
   gets a spotlight in its own colour, and the fretboard a radial tinge of it from its fret. g(x) off: no colour, so neither shows. */
const frameLbl=$('frameLbl');
const sylName=pc=>{ const k=((pc-(PHI.doPc+2))%12+12)%12; return SOLF[k][0]; };   // the field's name for a pitch (an anti keeps its ~)
const spotDefs=el('defs',{},ringSvg), spotF=el('filter',{id:'modeSpotF',x:'-100%',y:'-100%',width:'300%',height:'300%'},spotDefs);
el('feGaussianBlur',{stdDeviation:5},spotF);
// the mode's light, in two layers: when the mode changes the old light fades out where it is as the new one fades in at its
// own letter and fret — nothing travels
const boardRect=fb.querySelector('rect.board'), fbDefs=el('defs',{},fb);
const LIGHTS=[0,1].map(i=>{
  const spot=el('circle',{r:15,filter:'url(#modeSpotF)',opacity:0,'pointer-events':'none'}); ringSvg.insertBefore(spot,rLbls[0]);
  const grad=el('radialGradient',{id:'modeTinge'+i,gradientUnits:'userSpaceOnUse',cx:500,cy:160,r:520},fbDefs);
  const stops=[[0,0.42],[0.35,0.18],[1,0]].map(([o,a])=>el('stop',{offset:o,'stop-opacity':a},grad));
  const rect=el('rect',{x:boardRect.getAttribute('x'),y:boardRect.getAttribute('y'),width:boardRect.getAttribute('width'),height:boardRect.getAttribute('height'),fill:'url(#modeTinge'+i+')',opacity:0,'pointer-events':'none'});
  fb.insertBefore(rect,boardRect.nextSibling);
  return {spot,grad,stops,rect,op:0,note:null}; });
const MODE={key:'',cur:0};
function modeNow(st,live,plan){                                          // the held tone in force, and the frame sounding
  // the mode: the last tone held (the loop's last before the first), lit where that tone was last played — a bar that opens
  // on it moves its light there; the frame in force is the hand's: it changes the moment a finger lands in a new place
  const n=plan.length, idx=live?st.idx:0, pcN=q=>pcOf(q.string,q.pitch);
  let hi=-1; for(let i=idx;i>=0;i--) if(i%4===3){ hi=i; break; }
  let h=hi>=0?plan[hi]:plan[n-1]; const b0=idx-idx%4;
  if(b0>hi&&pcN(plan[b0])===pcN(h)) h=plan[b0];
  return {held:h,frame:plan[idx].frame};
}
/* the ring's order follows the walk: chromatic (1) for the first half, the dominant chain (5) for the second — it turns on
   the held tone at the far string, and back to 1 only once the last bar has fully sounded. */
function orderFor(st,live){
  const pg=PAGES[PAGE], L=DRILL.bars/2, out=0;                     // every page opens on 1 and turns to 5 half way, at the turn
  if(pg.order==='chrom') return 0;
  if(pg.order==='alt'){ if(!live) return T.on&&T.shown?T.shown.pass%2:0; const s=st.s, cyc=SEG_EACH?s.pass:Math.floor((ctx.currentTime-s.loopStart)/(LOOP*T.beat)); return cyc%2; }   // Semimodes: 1 the first time through, 5 for the repeat
  if(!live) return out;
  const back=st.idx>=4*L-1; return back?1-out:out;
}
frameHook=(st,live,plan,dt)=>{
  if(CHORDS){ CHORDS.step(st,live); const h=CHORDS.bass(); if(h) modeLight(h,dt); return; }   // the Chords page: the mode lit from the voicing's lowest root
  if(!DRILL||!plan) return;
  if(live){ const g=orderFor(st,live); if(RING.goal!==g){ RING.goal=g; refresh(); } }
  const {held,frame:hk}=modeNow(st,live,plan), k=plan[0]&&plan[0].grp!==undefined?(live?plan[st.idx].grp:plan[0].grp):hk, F=(DRILL.groups||DRILL.frames)[k];
  // the frame's name, in the field's colours
  const key=k+'|'+PHI.doPc+'|'+FIELD.on+'|'+diatonic;
  if(SEMI){ SEMI.step(live?plan[st.idx].grp:plan[0].grp,dt); }
  else if(ROLL&&key!==MODE.key&&F){ MODE.key=key; rollTo(F); }
  else if(key!==MODE.key&&F){ MODE.key=key;
    const T3=F.tones;                                                     // the frame's own name: its tones low to high
    frameLbl.innerHTML=T3.map((t,i)=>{ const pc=pcOf(F.string,t.fret), gap=i&&Math.abs(t.fret-T3[i-1].fret)===2?'<span class="us">_</span>':'';
      return gap+'<span style="color:'+(FIELD.on?rgbS(relRGB(pc-(PHI.doPc+2))):'')+'">'+sylName(pc)+'</span>'; }).join(''); }   // the colour of its function under φ, not of the ring mid-turn
  modeLight(held,dt);
};
// the mode: a spotlight on its letter, a tinge on the board from its fret; a new mode crossfades in
function modeLight(held,dt){
  const nk=held.string+':'+held.pitch, kk=Math.min(1,(dt||0.016)*6);
  if(!LIGHTS[MODE.cur].note||LIGHTS[MODE.cur].note!==nk){ if(LIGHTS[MODE.cur].note) MODE.cur=1-MODE.cur;
    const L=LIGHTS[MODE.cur]; L.note=nk; L.held=held;
    const hx=held.fret?(cellL(held.fret)+cellR(held.fret))/2:(FB.x0+FB.nut)/2; L.grad.setAttribute('cx',hx.toFixed(1)); L.grad.setAttribute('cy',FB.strY[held.string].toFixed(1)); }
  LIGHTS.forEach((L,i)=>{ const goal=i===MODE.cur?FIELD.lit:0; L.op+=(goal-L.op)*kk; if(L.op<0.002&&i!==MODE.cur){ L.op=0; }
    if(!L.held) return; const pc=pcOf(L.held.string,L.held.pitch), col=rgbS(valRGB(pc)), [x,y]=pt(RG.RL,pc);
    L.spot.setAttribute('cx',x.toFixed(1)); L.spot.setAttribute('cy',y.toFixed(1)); L.spot.setAttribute('fill',col); L.spot.setAttribute('opacity',(CONE.mode?0:0.85*L.op).toFixed(3));
    L.stops.forEach(s=>s.setAttribute('stop-color',col)); L.rect.setAttribute('opacity',L.op.toFixed(3)); });
}
// Let Go: the hand lifts off the page's first frame
document.querySelector('.bar').addEventListener('click',e=>{ if(!e.target.closest('#clear')) return; e.stopPropagation(); stopForEdit(); P=[]; refresh(); },true);

// the string selector, just above the fretboard: low to high, as the strings lie under the hand
if(BOOK.strings){
  const seg=document.createElement('div'); seg.className='seg strSel'; seg.setAttribute('role','group'); seg.setAttribute('aria-label','String');
  for(let i=NSTR-1;i>=0;i--){ const b=document.createElement('button'); b.type='button'; b.dataset.s=i; b.textContent=STRINGS[i].lbl; b.title='Play the page on the '+STRINGS[i].name+' string'; seg.appendChild(b); }
  const row=document.createElement('div'); row.className='strRow'; row.appendChild(seg); $('means').after(row);   // its own row at the left, midway between the label and the fretboard
  const sync=()=>seg.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.s===STRSEL));
  seg.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; const was=T.on; stopForEdit(); STRSEL=+b.dataset.s; sync(); loadPage(PAGE); refresh(); if(was) run(); });
  sync();
}

// the label sits right under the TAB (the column beside the ring), so the fretboard follows the ring with no gap
document.querySelector('.tabCol').appendChild($('means')); { const r=document.querySelector('.strRow'); if(r) document.querySelector('.tabCol').appendChild(r); }
fb.setAttribute('viewBox','0 38 990 266');                               // the board drawn without the headroom over the high e it does not need here

// Semimodes: the string selector right under the TAB, the mode's line at the foot of the column, just above the fretboard
if(BOOK.strings){ const col=document.querySelector('.tabCol'), r=document.querySelector('.strRow'); col.insertBefore(r,$('means')); r.style.flex='none'; $('means').style.marginTop='auto'; }
// …and where the board is big enough, the selector stands upright at the left of the open strings, each letter level
// with its string (high e at the top, as the board lies); on a phone, where the strings sit too close for a button
// each, it stays the row under the TAB
if(BOOK.strings){
  const seg=document.querySelector('.strSel'), row=document.querySelector('.strRow'), wrap=document.querySelector('.wrap');
  wrap.style.position='relative';
  const place=()=>{ const m=fb.getScreenCTM(); if(!m) return; const pt=(x,y)=>{ const p=fb.createSVGPoint(); p.x=x; p.y=y; return p.matrixTransform(m); };
    const top=pt(FB.x0,FB.strY[0]), bot=pt(FB.x0,FB.strY[NSTR-1]), sp=(bot.y-top.y)/(NSTR-1), W=wrap.getBoundingClientRect();
    const room=top.x-W.left;
    if(sp<20||room<34){ if(seg.parentElement!==row){ row.appendChild(seg); } seg.classList.remove('vert'); seg.style.top=seg.style.left=''; seg.querySelectorAll('button').forEach(b=>b.style.height=''); row.style.display=''; return; }
    if(seg.parentElement!==wrap) wrap.appendChild(seg); seg.classList.add('vert'); row.style.display='none';
    const h=Math.min(sp,34)/ZOOM, w=Math.min(32,(room-8)/ZOOM);
    seg.querySelectorAll('button').forEach(b=>{ b.style.height=h.toFixed(1)+'px'; b.style.width=w.toFixed(1)+'px'; });
    seg.style.left=((top.x-W.left)/ZOOM-w-6).toFixed(1)+'px';
    seg.style.top=((top.y-W.top)/ZOOM-h/2-(sp/ZOOM-h)*0).toFixed(1)+'px';
    seg.style.gap=((sp-Math.min(sp,34))/ZOOM).toFixed(1)+'px'; };
  afterFit.push(place); addEventListener('resize',place); setTimeout(place,0); setTimeout(place,600);
}
// Frame Walk: the label centred over the 5th fret, level with the Diatonic button
if(BOOK.labelAt==='fret5'){
  const lab=$('means'), wrap=document.querySelector('.wrap'); wrap.style.position='relative'; lab.style.position='absolute'; lab.style.margin='0';
  const narrow=matchMedia('(max-width:640px)');   // a phone upright: the column stacks, so the label stays in the flow under the TAB
  const place=()=>{ if(narrow.matches){ lab.style.position=''; lab.style.left=lab.style.top=''; return; } lab.style.position='absolute';
    const W=wrap.getBoundingClientRect(), d=diatBtn.getBoundingClientRect(), m=fb.getScreenCTM(); if(!m) return;
    const x=W.left+0, p=fb.createSVGPoint(); p.x=(cellL(5)+cellR(5))/2; p.y=0; const fx=p.matrixTransform(m).x;
    const r=lab.getBoundingClientRect();
    lab.style.left=((fx-W.left-r.width/2)/ZOOM).toFixed(1)+'px'; lab.style.top=((d.top+d.height/2-W.top-r.height/2)/ZOOM).toFixed(1)+'px'; };   // in the page's own (unzoomed) pixels
  afterFit.push(place); narrow.addEventListener('change',place); new ResizeObserver(place).observe(lab); setTimeout(place,0); setTimeout(place,600);
}

/* THE ROLL (Frame Walk): the seven frames on a drum in fourths order — Ti Mi La Re Sol Do Fa, round again — the order the
   walk climbs the strings, so the next frame up the strings stands above, as the higher string does on the board. The
   frame in force sits in the middle; the one before and the one after show dimly below and above; a change rolls the
   drum the short way round. */
const ROLL=BOOK.roll?(()=>{
  const FR=[['Ti','Do','Re'],['Mi','Fa','Sol'],['La','Ti','Do'],['Re','Mi','Fa'],['Sol','La','Ti'],['Do','Re','Mi'],['Fa','Sol','La']];
  const SEMI={Do:0,Re:2,Mi:4,Fa:5,Sol:7,La:9,Ti:11};
  const box=document.createElement('div'); box.className='roll'; const inner=document.createElement('div'); inner.className='rollIn'; box.appendChild(inner);
  frameLbl.replaceWith(box); box.id='frameLbl';
  const rows=[]; let R=10, built='';                                       // R: the row in the middle (21 rows: the seven, three times)
  const build=()=>{ const key=FIELD.on+'|'+diatonic; if(key===built) return; built=key; inner.innerHTML=''; rows.length=0;
    for(let r=0;r<21;r++){ const k=6-(r%7), names=FR[k], d=document.createElement('div'); d.className='rollRow';
      d.innerHTML=names.map(n=>'<span style="grid-column:'+(1+(SEMI[n]-SEMI[names[0]]+12)%12)+';color:'+(FIELD.on?rgbS(relRGB(SEMI[n]-2)):'')+'">'+n+'</span>').join('');   // its column: semitones above the frame's lowest tone
      inner.appendChild(d); rows.push(d); } };
  const show=(anim)=>{ inner.style.transition=anim?'':'none'; inner.style.transform='translateY(calc(var(--rh) * '+(1-R)+'))';
    rows.forEach((d,r)=>d.classList.toggle('cur',r===R)); if(!anim){ void inner.offsetHeight; inner.style.transition=''; } };
  inner.addEventListener('transitionend',()=>{ if(R<7||R>13){ R+=R<7?7:-7; show(false); } });   // back into the middle copy, unseen
  build(); show(false);
  return {set(k){ build(); const cur=6-(R%7+7)%7; let d=((k-cur)%7+7)%7; if(d>3) d-=7; if(!d){ show(false); return; } R-=d; show(true); }, build, row:()=>rows[R], rebuild:()=>{ built=''; }};
})():null;
function rollTo(F){ const low=sylName(pcOf(F.string,F.tones[0].fret)), k=['Ti','Mi','La','Re','Sol','Do','Fa'].indexOf(low); ROLL.build(); if(k>=0) ROLL.set(k); }

/* THE SEMIMODE LINE (Semimodes): the whole mode on one line, from the page's tone to its octave — names spaced by their
   steps (a half step close, a whole step wide), its two semimodes either side of a marked gap, the tritone. A pill frames
   the semimode in force: its names at full brightness, its complement's dimmed, "half step" under its half step if it has
   one (above the pair), and root, fourth, fifth and octave under their names — all inside the pill, so only the framed semimode's show. When the semimode changes the pill slides across the gap, each name brightening as the pill takes it in and dimming
   as the pill leaves it. Where a semimode spans the tritone itself (Fa to Ti, on the Ti and Fa pages) there is no gap: the
   two halves meet at a half step, and the tritone mark sits under the root's tritone — Fa on the Ti page, Ti on the Fa page.
   A page turn is a step along the chain: each page's upper semimode is the next page's lower one (the seventh closes the
   loop back to the first). So a turn slides the whole line left — the dimmed semimode and its tritone leave to the left,
   the framed one rides the pill into the lower place, a new tritone and the coming semimode arrive from the right. Prev
   runs the same slide the other way. */
const SEMI=BOOK.strings?(()=>{
  const SEMIS={Do:0,Re:2,Mi:4,Fa:5,Sol:7,La:9,Ti:11}, U=37, G=150, PAD=36, SLIDE=0.9;   // px a semitone, the gap, the pill's reach past a name's centre; s a turn
  const host=$('means'); host.innerHTML=''; host.classList.add('semiHost'); host.style.overflowX='clip';
  const box=document.createElement('div'); box.className='semiLine'; host.appendChild(box);
  const track=document.createElement('div'); track.className='semiTrack'; box.appendChild(track);
  let names=[], ghosts=[], pill=null, cap=null, hsLbl=null, built='', builtMode=null, cur=null, tgt=null, geo=null, slide=null, hsOn=0, width=0;
  const lineOf=mode=>{ const m=W_DEG[mode], seq=[0,1,2,3,4,5,6,7].map(j=>({syl:SYL[(m+j)%7], s:wSemi(m+j)-wSemi(m)}));
    const lowSpan=seq[3].s, tt=lowSpan===6?0:seq[7].s-seq[4].s===6?4:-1, x=[];   // tt: the half that is itself the tritone, if one is
    seq.forEach((t,i)=>x[i]=PAD+(tt>=0?t.s*U:i<4?t.s*U:lowSpan*U+G+(t.s-seq[4].s)*U));
    const tw=G-2*PAD-12, tc=tt>=0?x[seq.findIndex(t=>t.s===6)]:(x[3]+x[4])/2, tri={l:tc-tw/2, r:tc+tw/2};   // one size everywhere: across the gap, or under the root's tritone (Fa of Ti, Ti of Fa)
    return {m,seq,x,tri}; };
  const el=(cls,txt,left)=>{ const e=document.createElement('div'); e.className=cls; if(txt) e.textContent=txt; e.style.left=left.toFixed(1)+'px'; track.appendChild(e); return e; };
  const name=(syl,left)=>{ const e=document.createElement('span'); e.className='semiName'; e.textContent=syl; e.style.left=left.toFixed(1)+'px'; e._x=left; e._rgb=relRGB(SEMIS[syl]-2); track.appendChild(e); return e; };
  const tri=(L,off)=>{ const l=L.tri.l-off, w=L.tri.r-L.tri.l, a=el('semiTri','',l); a.style.width=w.toFixed(1)+'px'; a._x=l+w/2;
    const b=el('semiTriLbl','tritone',l+w/2); b._x=l+w/2; return [a,b]; };
  // the old line's half that leaves, placed in the new line's coordinates
  const ghostsFor=()=>{ if(!slide) return []; const O=slide.old, off=slide.off, out=[];
    const idx=slide.dir>0?[0,1,2,3]:[4,5,6,7]; idx.forEach(i=>{ const e=name(O.seq[i].syl,O.x[i]-off); e._ghost=1; out.push(e); });
    tri(O,off).forEach(e=>{ e._ghost=1; out.push(e); }); return out; };
  const build=()=>{ const pg=PAGES[PAGE], key=pg.mode+'|'+FIELD.on+'|'+diatonic+'|'+PHI.doPc; if(key===built) return; built=key;
    const L=lineOf(pg.mode);
    if(builtMode&&builtMode!==pg.mode&&geo){   // a page turn: along the chain, either way, slides; anything else snaps
      const O={seq:geo.seq,x:geo.x,tri:geo.tri}, dm=(L.m-W_DEG[builtMode]+7)%7, dir=dm===4?1:dm===3?-1:0;
      if(dir&&!reduce){ const off=dir>0?O.x[4]-L.x[0]:O.x[0]-L.x[4], keep=geo.sides[dir>0?1:0];
        // the pill rides with its names when it frames the half that stays; it lets go only once the line has settled
        const carry=!!cur&&Math.abs(cur.l-keep.l)+Math.abs(cur.r-keep.r)<24;
        const tcN=(L.tri.l+L.tri.r)/2, tcO=(O.tri.l+O.tri.r)/2-off, wN=L.x[7]+PAD+4;
        slide={old:O, off, dir, p:0, carry, popIn:tcN+off>-10&&tcN+off<wN+10, popOut:tcO>-10&&tcO<wN+10}; if(cur){ cur.l-=off; cur.r-=off; } }
      else { slide=null; cur=null; }
    }
    const hsX=hsLbl&&hsLbl._x!==undefined?hsLbl._x-(slide&&slide.p===0?slide.off:0):0; if(!hsLbl||hsLbl._x===undefined) hsOn=0;
    builtMode=pg.mode; track.innerHTML='';
    pill=el('semiPill','',0); cap=document.createElement('div'); cap.className='semiCap'; cap.textContent='Semimode'; pill.appendChild(cap);
    const own=tri(L,0); hsLbl=el('semiHs','half step',hsX); hsLbl._x=hsX; hsLbl.style.transition='none';
    names=L.seq.map((t,i)=>name(t.syl,L.x[i]));
    // under the names, inside the pill: root, fourth, fifth, octave — by interval, so the Fa page has no fourth and the Ti page no fifth
    const IV={0:'root',5:'fourth',7:'fifth',12:'octave'}; L.seq.forEach((t,i)=>{ if(IV[t.s]){ const v=el('semiIv',IV[t.s],L.x[i]); v._x=L.x[i]; names[i]._iv=v; } }); ghosts=ghostsFor();
    width=L.x[7]+PAD+4; box.style.width=width+'px'; fit();
    const span=(a,b)=>L.seq[b].s-L.seq[a].s, hs=(a,b)=>{ for(let i=a;i<b;i++) if(L.seq[i+1].s-L.seq[i].s===1) return i; return -1; };
    geo={x:L.x, seq:L.seq, tri:L.tri, extras:own, sides:[0,1].map(k=>{ const a=4*k, b=a+3; const X=L.x, reach=(i,j)=>j<0||j>7?PAD:Math.min(PAD,Math.abs(X[j]-X[i])/2);   // where the halves meet at a half step, the pill closes halfway
      return {l:X[a]-reach(a,a-1), r:X[b]+reach(b,b+1), hs:hs(a,b)}; })};
    // an interval name at a narrow end of the pill (where the halves meet at a half step) steps in to stay inside it
    names.forEach((n,i)=>{ const v=n._iv; if(!v) return; const sd=geo.sides[i<4?0:1], w=v.offsetWidth||0;
      const c=Math.max(sd.l+w/2+7,Math.min(sd.r-w/2-7,n._x)); v._x=n._x; v.style.left=c.toFixed(1)+'px'; });
    tgt=null; };
  // on a narrow screen the line shrinks to its column rather than run under the ring or off the page
  function fit(){ const avail=host.clientWidth; box.style.zoom=avail&&width>avail?(avail/width).toFixed(3):''; }
  addEventListener('resize',fit);
  const clamp=v=>Math.max(0,Math.min(1,v));
  const edge=x=>clamp((x+40)/50)*clamp((width+70-x)/60);   // things leave the line to the left and arrive from the right
  const paint=(shift,e)=>{ const bg=bgColour(), ink=inkColour();
    track.style.transform=shift?'translateX('+shift.toFixed(1)+'px)':'';
    names.concat(ghosts.filter(e=>e.className==='semiName')).forEach(e=>{ const cx=e._x, inside=clamp(Math.min(cx-cur.l,cur.r-cx)/18+0.5);   // in the pill: full; out: dim
      const col=FIELD.on?e._rgb:ink, dim=mixRGB(bg,col,0.32); e.style.color=rgbS(mixRGB(dim,col,inside)); e.style.opacity=edge(cx+shift).toFixed(3); if(e._iv) e._iv.style.opacity=(inside*edge(cx+shift)).toFixed(3); });
    // a tritone mark that changes place within the line fades across the slide rather than popping
    const fin=slide&&slide.popIn?e:1, fout=slide&&slide.popOut?1-e:1;
    geo.extras.forEach(x=>{ x.style.opacity=(fin*edge(x._x+shift)).toFixed(3); });
    ghosts.filter(x=>x.className!=='semiName').forEach(x=>{ x.style.opacity=(fout*edge(x._x+shift)).toFixed(3); });
    hsLbl.style.opacity=(hsOn*edge(hsLbl._x+shift)).toFixed(3);
    pill.style.left=cur.l.toFixed(1)+'px'; pill.style.width=(cur.r-cur.l).toFixed(1)+'px'; };
  return {step(g,dt){ build(); if(!geo) return; const side=geo.sides[g?1:0]; dt=dt||0.016;
    if(!cur){ cur={l:side.l,r:side.r}; }
    if(tgt!==side){ tgt=side; const h=side.hs; if(h>=0){ hsLbl._x=(geo.x[h]+geo.x[h+1])/2; hsLbl.style.left=hsLbl._x.toFixed(1)+'px'; } }
    const hsGoal=side.hs>=0&&Math.abs(cur.l-side.l)+Math.abs(cur.r-side.r)<24?1:0; hsOn+=(hsGoal-hsOn)*(reduce?1:Math.min(1,dt*6));
    const k=reduce?1:slide&&slide.carry?0:Math.min(1,dt*5); cur.l+=(side.l-cur.l)*k; cur.r+=(side.r-cur.r)*k;
    let shift=0, e=1;
    if(slide){ slide.p=Math.min(1,slide.p+dt/SLIDE); const p=slide.p; e=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2; shift=slide.off*(1-e);
      if(p>=1){ slide=null; ghosts.forEach(e=>e.remove()); ghosts=[]; shift=0; } }
    paint(shift,e); }};
})():null;

/* THE HAND (lab), drawn from its skeleton (st_hand.js): the palm, the knuckles fixed in their row on it, each finger's
   three bones and the thumb's, placed on a real neck in millimetres and seen as the player sees the board — what stands
   up off the board leans up the screen, what is behind the neck shows below its near edge. The fingertips go where the
   dots go; the hand is whatever the bones make of that. The palm and thumb are under the neck, the fingers over it, each
   bone in front of the ones behind it; the whole hand semi-transparent. */
const HANDLAB=(BOOK.handLab||BOOK.hand)?(()=>{
  const NS='http://www.w3.org/2000/svg', mk=(tag,at,par)=>{ const e=document.createElementNS(NS,tag); for(const k in at) e.setAttribute(k,at[k]); if(par) par.appendChild(e); return e; };
  fb.setAttribute('viewBox','-10 -60 1000 420');                          // headroom for the knuckles, room below for the thumb
  // the neck in millimetres, laid on the board as drawn: frets at their true places, strings parallel, a little apart
  const LMM=648, U=FB.strY[1]-FB.strY[0], K=0.25;                        // K: how far up the screen a millimetre of height shows (the player looks nearly straight down)
  const gapAt=X=>BASS?(16+5*X/LMM):(35.5+17*X/LMM)/5;
  const NECK={nstr:NSTR, strY:(s,X)=>s*gapAt(X), yFar:X=>-(FB.strY[0]-FB.top)/U*gapAt(X), yNear:X=>(FB.bot-FB.strY[0])/U*gapAt(X), depth:X=>(BASS?24:20.5)+7*X/LMM};
  const xs=X=>FB.nut+SCALE*X/LMM, Xof=x=>(x-FB.nut)*LMM/SCALE;
  const proj=P=>({x:xs(P[0]), y:FB.strY[0]+(P[1]-K*P[2])*U/gapAt(P[0])}), depth=P=>P[2]+K*P[1];
  const scl=X=>Math.sqrt((SCALE/LMM)*(U/gapAt(X)));                      // board units per millimetre, for a bone's thickness
  const fretMM=n=>LMM*(1-Math.pow(2,-n/12));
  const HM=makeHand(NECK), HM2=makeHand(NECK);
  const defs=mk('defs',{},fb), gid='hl'+Math.random().toString(36).slice(2,6);
  const behind=mk('g',{class:'hlHand'}); fb.insertBefore(behind,fb.firstChild);   // palm and thumb: under the neck
  const palmFill=mk('path',{class:'hlSkin'},behind), palmLine=mk('path',{class:'hlLine'},behind);
  const thumbSeg=[0,1,2].map(()=>({fill:mk('path',{class:'hlSkin'},behind), line:mk('path',{class:'hlLine'},behind)}));
  const thumbNail=mk('path',{class:'hlLine hlNail'},behind);
  const front=mk('g',{class:'hlHand'}); fb.insertBefore(front,fingers[0].guide);
  // twelve places for the fingers' bones, filled nearest last each frame; a bone carries its finger's look with it
  const slots=Array.from({length:12},()=>({fill:mk('path',{class:'hlSkin'},front), tint:mk('path',{stroke:'none','pointer-events':'none'},front), line:mk('path',{class:'hlLine','pointer-events':'none'},front), nail:mk('path',{class:'hlLine hlNail','pointer-events':'none'},front), k:0}));   // only the skin takes a click
  // and for Solid: each bone's skin and outline in the masks, its visible outline in front
  // HAND DRAWING, Solid (default) or Wire (the gear). Wire: every outline seen through the translucent skin. Solid: the same
  // skin, and of the outlines only what can be seen from here — each drawn opaque through a mask in which every bone, in
  // depth order, lays its skin (black) over what is behind it and its own outline (white) on top; the palm and thumb's
  // outlines are hidden where a finger (or, for the palm, the thumb) covers them
  const MASKBOX={maskUnits:'userSpaceOnUse',x:-200,y:-400,width:1500,height:1100};
  const mF=mk('mask',Object.assign({id:gid+'mF'},MASKBOX),defs), mFr=mk('rect',{x:-200,y:-400,width:1500,height:1100,fill:'#000'},mF);
  const mT=mk('mask',Object.assign({id:gid+'mT'},MASKBOX),defs), mTr=mk('rect',{x:-200,y:-400,width:1500,height:1100,fill:'#fff'},mT);
  const mP=mk('mask',Object.assign({id:gid+'mP'},MASKBOX),defs), mPr=mk('rect',{x:-200,y:-400,width:1500,height:1100,fill:'#fff'},mP);
  // the masks are fitted to the hand each frame: what they cover is redrawn every frame, so they cover no more than it
  function fitMasks(x0,y0,x1,y1){ const at={x:(x0-8).toFixed(0),y:(y0-8).toFixed(0),width:(x1-x0+16).toFixed(0),height:(y1-y0+16).toFixed(0)};
    [mF,mT,mP,mFr,mTr,mPr].forEach(e=>{ for(const k in at) e.setAttribute(k,at[k]); }); }
  const mPth=[0,1,2].map(()=>mk('path',{fill:'#000'},mP));
  const behindLines=mk('g',{}); fb.insertBefore(behindLines,behind.nextSibling);
  const vPalm=mk('path',{class:'hlLine',mask:'url(#'+gid+'mP)'},behindLines);
  const vThumbG=mk('g',{mask:'url(#'+gid+'mT)'},behindLines), vThumb=[0,1,2].map(()=>mk('path',{class:'hlLine'},vThumbG)), vThumbNail=mk('path',{class:'hlLine hlNail'},vThumbG);
  const frontLines=mk('g',{mask:'url(#'+gid+'mF)','pointer-events':'none'}); fb.insertBefore(frontLines,fingers[0].guide);
  let SOLID=true; try{ SOLID=localStorage.getItem('hand-look')!=='wire'; }catch(err){}
  const solidOf=()=>slots.forEach(q=>{ q.mFill=mk('path',{fill:'#000',stroke:'#fff','stroke-width':1.7,'stroke-linejoin':'round'},mF); q.mNail=mk('path',{fill:'none',stroke:'#fff','stroke-width':1.2},mF);
      q.tFill=mk('path',{fill:'#000'},mT); q.pFill=mk('path',{fill:'#000'},mP);
      q.vLine=mk('path',{class:'hlLine'},frontLines); q.vNail=mk('path',{class:'hlLine hlNail'},frontLines); });
  function setLook(solid){ SOLID=solid; try{ localStorage.setItem('hand-look',solid?'solid':'wire'); }catch(err){}
    frontLines.style.display=behindLines.style.display=solid?'':'none';
    slots.forEach(q=>{ q.line.style.visibility=q.nail.style.visibility=solid?'hidden':''; });
    palmLine.style.visibility=solid?'hidden':''; thumbSeg.forEach(t=>t.line.style.visibility=solid?'hidden':''); thumbNail.style.visibility=solid?'hidden':'';
    if(segLook) segLook.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',(b.dataset.v==='solid')===solid)); }
  let segLook=null; solidOf();
  // the gear: Hand drawing, Solid | Wire, under the Hand row
  { const hr=document.getElementById('segHand'), row=hr&&hr.closest('.mixRow');
    if(row){ const r=document.createElement('div'); r.className='mixRow sub'; r.innerHTML='<span class="name">Hand drawing</span><div class="seg" id="segLook" role="group" aria-label="How the hand is drawn"><button type="button" data-v="solid">Solid</button><button type="button" data-v="wire">Wire</button></div>';
      row.after(r); segLook=r.querySelector('#segLook'); segLook.addEventListener('click',e=>{ const b=e.target.closest('button'); if(b) setLook(b.dataset.v==='solid'); }); } }
  setLook(SOLID);
  // each finger's tone: a gradient along the finger, the tone's colour at the tip fading back to the outline's white
  // half way up toward the knuckle
  const tg=[0,1,2,3].map(i=>{ const g=mk('linearGradient',{id:gid+'t'+i,gradientUnits:'userSpaceOnUse'},defs);
    const fg=mk('linearGradient',{id:gid+'f'+i,gradientUnits:'userSpaceOnUse'},defs);   // and a wash of it inside, clear by half way
    return {g, a:mk('stop',{offset:0},g), b:mk('stop',{offset:0.2},g), c:mk('stop',{offset:0.55},g), d:mk('stop',{offset:1},g),
      fg, fa:mk('stop',{offset:0},fg), fb:mk('stop',{offset:0.2},fg), fc:mk('stop',{offset:0.55,'stop-opacity':0},fg)}; });
  const tone=[0,0,0,0], toneCol=[null,null,null,null], alpha=[1,1,1,1], lift=[1,1,1,1];
  let SELK=0, fresh=true, lastFresh=-1e9, clock=0, qd=null, still=0, lastAsk=null, resettle=false, settled=false, ease=null; const EASE=0.45;   // resettle: form the hand afresh once a new grip's dots have come to rest
  const rank=[...Array(12).keys()];                                         // the bones' drawing order last frame
  const openStr=new Set();                                                 // open strings meant to ring (a chord chart's 0s)
  const f=v=>v.toFixed(1), P2=p=>f(p.x)+' '+f(p.y);
  // THE BONES' ORDER, as a painter lays them: where two bones' outlines cross on the screen, the one nearer the eye at that
  // crossing goes over — compared there, at the crossing, not at the bones' middles (a bone's middle can lie above its
  // neighbour's while at the place they cross it lies below). Bones a hair apart there keep the order they had (no blinking);
  // bones that do not cross keep it too. A loop of overs (rare) is broken at the farthest bone.
  const near2=(a,b,c,d)=>{ const ux=b.x-a.x, uy=b.y-a.y, vx=d.x-c.x, vy=d.y-c.y, wx=a.x-c.x, wy=a.y-c.y, A=ux*ux+uy*uy, B=ux*vx+uy*vy, C=vx*vx+vy*vy, D=ux*wx+uy*wy, E=vx*wx+vy*wy, den=A*C-B*B;
    let sN=den>1e-9?(B*E-C*D)/den:0; sN=Math.max(0,Math.min(1,sN)); let t=C>1e-9?(B*sN+E)/C:0;
    if(t<0){ t=0; sN=A>1e-9?Math.max(0,Math.min(1,-D/A)):0; } else if(t>1){ t=1; sN=A>1e-9?Math.max(0,Math.min(1,(B-D)/A)):0; }
    return [sN,t,Math.hypot(a.x+ux*sN-c.x-vx*t, a.y+uy*sN-c.y-vy*t)]; };
  const at3=(A,B,t)=>[A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t];
  function paint(segs){
    const N=segs.length, over=Array.from({length:N},()=>[]), deg=new Array(N).fill(0);
    segs.forEach(g=>{ g.pa=proj(g.A); g.pb=proj(g.B); });
    for(let i=0;i<N;i++) for(let j=i+1;j<N;j++){ const a=segs[i], b=segs[j];
      let da, db;
      if(a.k===b.k&&Math.abs(a.s-b.s)===1){ da=a.dp; db=b.dp; }                         // a finger's own neighbouring bones meet at their joint: the nearer whole over
      else { const [s1,t1,d]=near2(a.pa,a.pb,b.pa,b.pb), ra=a.ra+(a.rb-a.ra)*s1, rb=b.ra+(b.rb-b.ra)*t1; if(d>=ra+rb) continue;
        da=depth(at3(a.A,a.B,s1)); db=depth(at3(b.A,b.B,t1)); }
      let top;
      if(Math.abs(da-db)>=1.5) top=da>db?i:j; else top=a.r>b.r?i:j;
      const bot=top===i?j:i; over[bot].push(top); deg[top]++; }
    const out=[], done=new Array(N).fill(false);
    for(let n=0;n<N;n++){ let pick=-1;
      for(let i=0;i<N;i++) if(!done[i]&&deg[i]===0&&(pick<0||segs[i].r<segs[pick].r)) pick=i;   // free to go: the earliest it went before
      if(pick<0) for(let i=0;i<N;i++) if(!done[i]&&(pick<0||segs[i].dp<segs[pick].dp)) pick=i;   // a loop: the farthest first
      done[pick]=true; out.push(segs[pick]); for(const t of over[pick]) deg[t]--; }
    segs.length=0; segs.push(...out); }
  // a bone seen from the side: two circles (its ends, their thickness) and the lines tangent to both
  function bone(A,B,ra,rb){
    const dx=B.x-A.x, dy=B.y-A.y, l=Math.hypot(dx,dy);
    if(l<=Math.abs(ra-rb)+0.01){ const C=ra>=rb?A:B, r=Math.max(ra,rb); return 'M'+f(C.x-r)+' '+f(C.y)+' a'+f(r)+' '+f(r)+' 0 1 0 '+f(2*r)+' 0 a'+f(r)+' '+f(r)+' 0 1 0 '+f(-2*r)+' 0 Z'; }
    const ex=dx/l, ey=dy/l, nx=-ey, ny=ex, sp=(ra-rb)/l, cp=Math.sqrt(1-sp*sp);
    const n1={x:ex*sp+nx*cp, y:ey*sp+ny*cp}, n2={x:ex*sp-nx*cp, y:ey*sp-ny*cp}, sw=(n1.x*ey-n1.y*ex)>0?1:0;
    return 'M'+f(A.x+ra*n1.x)+' '+f(A.y+ra*n1.y)+' L'+f(B.x+rb*n1.x)+' '+f(B.y+rb*n1.y)+' A'+f(rb)+' '+f(rb)+' 0 '+(sp<0?1:0)+' '+sw+' '+f(B.x+rb*n2.x)+' '+f(B.y+rb*n2.y)
      +' L'+f(A.x+ra*n2.x)+' '+f(A.y+ra*n2.y)+' A'+f(ra)+' '+f(ra)+' 0 '+(sp>0?1:0)+' '+sw+' '+f(A.x+ra*n1.x)+' '+f(A.y+ra*n1.y)+' Z'; }
  // a nail on a bone's end, on its back, if its back is turned toward the eye
  // a nail, drawn on the fingertip as it is drawn: on its axis, its free edge a few millimetres inside the round of the tip,
  // its length foreshortened as the finger turns, about three quarters the tip's width; shown when its back faces the eye
  function nail(A,B,rb,end,dir,back,X){
    const vis=(back[2]+K*back[1])/Math.hypot(1,K); if(vis<0.15) return null;
    let ux=B.x-A.x, uy=B.y-A.y, l=Math.hypot(ux,uy); if(l<1e-3) return null; ux/=l; uy/=l;
    const s=scl(X), e=proj(end), c11=proj([end[0]-dir[0]*11,end[1]-dir[1]*11,end[2]-dir[2]*11]), ln=Math.max(4,Math.hypot(e.x-c11.x,e.y-c11.y));
    const tip={x:B.x+ux*Math.max(0,rb-2.5*s), y:B.y+uy*Math.max(0,rb-2.5*s)}, cut={x:tip.x-ux*ln, y:tip.y-uy*ln}, w=rb*0.75, nx=-uy*w, ny=ux*w;
    const P=(p,k,m)=>f(p.x+nx*k+ux*m)+' '+f(p.y+ny*k+uy*m);
    return {d:'M'+P(cut,1,0)+' L'+P(tip,0.92,-w*0.35)+' Q'+P(tip,0,w*0.25)+' '+P(tip,-0.92,-w*0.35)+' L'+P(cut,-1,0)+' Q'+P(cut,0,-w*0.45)+' '+P(cut,1,0), vis}; }
  // a gradient's stops rebuilt: [offset, colour, opacity]
  function setStops(g,list){ while(g.firstChild) g.removeChild(g.firstChild); list.forEach(([o,c,a])=>mk('stop',{offset:Math.max(0,Math.min(1,o)).toFixed(4),'stop-color':c,'stop-opacity':a},g)); }
  // the barring finger: along it from its tip to its knuckle, a band of each sounding string's colour where it crosses it
  function barreTint(G,F,bands,ink){
    const A=proj(F.end), B=proj(F.mcp), dy=B.y-A.y||1, w=rgbS(ink), T0=tone[0], hw=0.35*U/Math.abs(dy);
    G.g.setAttribute('x1',f(A.x)); G.g.setAttribute('y1',f(A.y)); G.g.setAttribute('x2',f(B.x)); G.g.setAttribute('y2',f(B.y));
    for(const k of ['x1','y1','x2','y2']) G.fg.setAttribute(k,G.g.getAttribute(k));
    const st=[[0,w,1]], fs=[[0,w,0]];
    bands.map(b=>({t:(FB.strY[b.s]-A.y)/dy,c:rgbS(mixRGB(ink,b.col,T0)),tc:rgbS(b.col)})).sort((a,b)=>a.t-b.t).forEach(b=>{
      st.push([b.t-hw,w,1],[b.t-hw*0.4,b.c,1],[b.t+hw*0.4,b.c,1],[b.t+hw,w,1]); fs.push([b.t-hw,b.tc,0],[b.t,b.tc,0.34*T0],[b.t+hw,b.tc,0]); });
    st.push([1,w,1]); fs.push([1,w,0]); setStops(G.g,st); setStops(G.fg,fs); G.barred=true; }
  function plainStops(G){ if(!G.barred) return; G.barred=false;
    setStops(G.g,[[0,'#fff',1],[0.2,'#fff',1],[0.55,'#fff',1],[1,'#fff',1]]); [G.a,G.b,G.c,G.d]=[...G.g.children];
    setStops(G.fg,[[0,'#fff',0],[0.2,'#fff',0],[0.55,'#fff',0]]); [G.fa,G.fb,G.fc]=[...G.fg.children]; }
  // what the hand is asked, read off the dots: where each tip is, whether it presses (and then anywhere in its fret's
  // cell will do), a barre laid along its fret; the thumb on the back of the neck between the first two fingers
  // which strings are sounding, and from where: a stopped string from its stopping fret's wire, an open one from the nut
  function ringing(fs,live,now){
    const ring=Array(NSTR).fill(null), stop=(s,x)=>{ if(s>=0&&s<NSTR) ring[s]=Math.max(ring[s]===null?0:ring[s],x); };
    fs.forEach((g,i)=>{ if(g.barre) for(let s=0;s<=g.lowS;s++) stop(s,g.barre.w); else if(g.press) stop(g.s,g.cell[1]); });
    openStr.forEach(s=>{ if(ring[s]===null) ring[s]=0; });
    if(live&&now&&now.finger===0&&ring[now.string]===null) ring[now.string]=0;
    return ring; }
  function ask(dt,live,now){
    const bar=P.find(q=>q.g===1&&q.barre), hov=(HOVER_GAP-FR*PRESS_H)/(K*U)*gapAt(150);
    const fs=fingers.map((F,i)=>{
      const down=F.isDown!==undefined?F.isDown:F.c.classList.contains('down');
      lift[i]+=((down?0:1)-lift[i])*Math.min(1,(dt||0.016)/0.07);
      const X=Xof(F.x), g=gapAt(X), Z=0.5+lift[i]*hov*gapAt(X)/gapAt(150), Y=(F.y+FR*PRESS_H-FB.strY[0])*g/U+K*Z;
      // the dot sits two thirds of the way along its fret's cell: the cell's length, and the wire at its far end
      const fg=(LMM-X)*0.0561/(1-0.66*0.0561), wire=X+0.34*fg, s=HAND.f[i+1]?HAND.f[i+1].string:0;
      if(i===0&&bar&&down) return {s:bar.s, lowS:bar.s, barre:{w:wire,y0:0,y1:bar.s*g+1.5}};
      return down?{s,p:[X,Y,Z],press:true,cell:[wire-fg+2.5,wire]}:{s,p:[X,Y,Z],press:false}; });
    const xs2=fs.map(g=>g.barre?g.barre.w:g.p[0]), tx=(xs2[0]+xs2[1])/2, yf=NECK.yFar(tx), yn=NECK.yNear(tx), hw=(yn-yf)/2, yc=(yn+yf)/2, ty=yc+0.15*hw;
    return {f:fs, ring:ringing(fs,live,now), th:[tx,ty,-NECK.depth(tx)*Math.sqrt(1-Math.pow((ty-yc)/hw,2))], thw:0.6}; }
  // how far the asked places moved since the last frame (mm): the hand at rest is still
  const moved=(a,b)=>{ if(!a||!b) return 1e9; let m=0; a.f.forEach((g,i)=>{ const h=b.f[i], p=g.barre?[g.barre.w,g.barre.y1,0]:g.p, o=h.barre?[h.barre.w,h.barre.y1,0]:h.p; if(!o||!p) { m=1e9; return; } m=Math.max(m,Math.abs(p[0]-o[0]),Math.abs(p[1]-o[1]),Math.abs(p[2]-o[2])); }); return m; };
  function draw(dt,st,live,plan){
    const on=document.body.classList.contains('handOn'); front.style.display=behind.style.display=behindLines.style.display=frontLines.style.display=on?'':'none'; if(!on) return;
    if(fingers.some(F=>F.x===undefined||isNaN(F.x))) return;
    clock+=dt||0.016;
    const nowN=live&&st&&st.idx>=0&&plan&&plan[st.idx]?plan[st.idx]:null, TGT=ask(dt,live,nowN);
    // the hand follows from where it was; from scratch when it is new, or has lost its way (not more than once a second)
    // SETTLING: while what is asked moves, the hand follows it a step a frame; once it is still, the hand is formed whole —
    // the search carried to its end in one go — and then left alone until something is asked of it again. What is drawn
    // eases onto that one pose and stops there: nothing goes on searching (or rounding) at rest, so nothing jiggles
    still=moved(TGT,lastAsk)<0.05?still+(dt||0.016):0; lastAsk=TGT; if(!still) settled=false;
    if(wantGrip&&LEARNED[wantGrip]){ HM.q=LEARNED[wantGrip]; wantGrip=null; settled=false; fresh=false; resettle=false; lastFresh=clock; }
    if(fresh){ HM.solveFresh(TGT); fresh=false; lastFresh=clock; }
    else if(!settled){ const q0=HM.q; HM.solve(TGT,reduce?6:2);
      if(still>0.25&&!resettle){ HM.solve(TGT,80); settled=true; }                        // at rest: carried to the end
      else if(q0&&still>0.1){ const q1=HM.q; let m=0; for(let i=0;i<q1.length;i++) m=Math.max(m,Math.abs(q1[i]-q0[i])); if(m<1e-4) settled=true; } }
    if(clock-lastFresh>1&&Math.max(...HM.errs().map((e,i)=>(TGT.f[i].press||TGT.f[i].barre)?e:0))>4){ HM.solveFresh(TGT); lastFresh=clock; settled=false; }
    // a new grip, the fingers arrived: the hand forms it from scratch (following the dots there can leave it in a poorer shape)
    if(resettle&&still>0.2){ HM.solveFresh(TGT); HM.solve(TGT,80); resettle=false; settled=true; lastFresh=clock; }
    // what is drawn follows the solved hand: closely while the hand is moving; at rest it eases onto the pose in a set time
    const qs=HM.q;
    if(!qd||qd.length!==qs.length||reduce){ qd=qs.slice(); ease=null; }
    else if(settled){ // onto the resting pose in one smooth move of fixed length, ending on it exactly
      if(!ease||ease.to.some((v,i)=>v!==qs[i])) ease={from:qd.slice(),to:qs.slice(),t:0};
      ease.t=Math.min(1,ease.t+(dt||0.016)/EASE); const u=ease.t*ease.t*(3-2*ease.t);
      for(let i=0;i<qs.length;i++) qd[i]=ease.t>=1?qs[i]:ease.from[i]+(qs[i]-ease.from[i])*u; }
    else { ease=null; const kq=Math.min(1,(dt||0.016)/0.04); for(let i=0;i<qs.length;i++) qd[i]+=(qs[i]-qd[i])*kq; }
    const S=HM.poseAt(qd);
    if(SELK&&!MARKS.some(m=>m.getAttribute('visibility')==='visible')) marks();   // a refresh clears the pulsing frets; while a finger is picked they come back
    for(let i=0;i<4;i++){ const pr=TGT.f[i].press||TGT.f[i].barre; alpha[i]+=((pr?1:0.38)-alpha[i])*Math.min(1,(dt||0.016)/0.08); }
    // the fingers' bones, farthest first
    const segs=[];
    S.F.forEach((Fk,k)=>{ for(let s=0;s<3;s++){ const A=Fk.j[s], B=Fk.j[s+1]; const R=HM.RAD[k]; segs.push({k,s,A,B,dp:depth([(A[0]+B[0])/2,(A[1]+B[1])/2,(A[2]+B[2])/2]),ra:(s===0?R[0]*1.08:R[s-1]*0.98)*scl(A[0]),rb:R[s]*(s===2?HM.TIPK:0.96)*scl(B[0])}); } });
    segs.forEach(g=>{ g.r=rank[g.k*3+g.s]; });
    paint(segs);
    segs.forEach((g,n)=>{ rank[g.k*3+g.s]=n; });
    segs.forEach((g,n)=>{ const q=slots[n], ra=g.ra, rb=g.rb;
      const d=bone(proj(g.A),proj(g.B),ra,rb); if(q.k!==g.k||!q.fill.hasAttribute('data-k')) q.fill.setAttribute('data-k',g.k); q.k=g.k; q.fill.setAttribute('d',d); q.tint.setAttribute('d',d); q.line.setAttribute('d',d);
      q.line.classList.toggle('hlSel',SELK===g.k+1); q.tint.setAttribute('fill','url(#'+gid+'f'+g.k+')');
      let nl=null; if(g.s===2){ const Fk=S.F[g.k]; nl=nail(proj(g.A),proj(g.B),rb,Fk.end,Fk.dir3,Fk.back,g.B[0]); }
      q.nail.setAttribute('d',nl?nl.d:''); q.nail.style.display=nl?'':'none';
      const a=alpha[g.k].toFixed(3); q.fill.style.opacity=a; q.tint.style.opacity=a; q.line.style.opacity=a; q.nail.style.opacity=nl?(alpha[g.k]*Math.min(1,nl.vis*1.6)).toFixed(3):0; });
    if(SOLID) slots.forEach(q=>{ const d=q.fill.getAttribute('d')||'', nd=q.nail.style.display==='none'?'':(q.nail.getAttribute('d')||'');
      q.mFill.setAttribute('d',d); q.tFill.setAttribute('d',d); q.pFill.setAttribute('d',d); q.mNail.setAttribute('d',nd);
      q.vLine.setAttribute('d',d); q.vNail.setAttribute('d',nd); q.vLine.classList.toggle('hlSel',q.line.classList.contains('hlSel'));
      q.mFill.setAttribute('stroke-width',q.line.classList.contains('hlSel')?3.2:1.7);
      q.vLine.style.opacity=q.line.style.opacity; q.vNail.style.opacity=q.nail.style.opacity; });
    // a finger whose tone is ringing — pressing, and the highest stop on its string — takes the tone's colour (g(x) on)
    // playing, it is the note being struck — its finger, its string and fret; posed, every pinned finger that is the
    // highest stop on its string
    const ink=inkColour(), now=live&&st&&st.idx>=0&&plan&&plan[st.idx]?plan[st.idx]:null, lit=[false,false,false,false], at=[];
    if(now&&!CHORDS){ if(FIELD.on&&now.finger>=1&&now.fret>=1){ lit[now.finger-1]=true; at[now.finger-1]={s:now.string,f:now.fret}; } }
    else if(!T.on||CHORDS) P.forEach(q=>{ if(!FIELD.on||!q.g||!(q.f>=1)) return; if(P.some(o=>o!==q&&o.g&&o.s===q.s&&o.f>q.f)) return; lit[q.g-1]=true; at[q.g-1]={s:q.s,f:q.f}; });
    // a barre sounds every string it holds where nothing stops that string higher: its finger takes each one's colour there
    const bar=((!now&&!T.on)||CHORDS)&&FIELD.on?P.find(q=>q.g===1&&q.barre):null, bands=[];
    if(bar) for(let s2=0;s2<=bar.s;s2++){ if(P.some(o=>o!==bar&&o.g&&o.s===s2&&o.f>bar.f)) continue; bands.push({s:s2,col:valRGB(pcOf(s2,bar.f))}); }
    for(let i=0;i<4;i++){ const G=tg[i];
      if(lit[i]) toneCol[i]=valRGB(pcOf(at[i].s,at[i].f));
      if(i===0&&bands.length){ lit[0]=true; toneCol[0]=bands[0].col; }
      tone[i]+=((lit[i]?1:0)-tone[i])*Math.min(1,(dt||0.016)/(lit[i]?0.05:0.25));
      const mine=slots.filter(q=>q.k===i);
      if(tone[i]<0.01||!toneCol[i]){ mine.forEach(q=>{ q.line.style.stroke=''; q.nail.style.stroke=''; q.tint.style.display='none'; }); continue; }
      const col=rgbS(mixRGB(ink,toneCol[i],tone[i])), w=rgbS(ink), tip=proj(S.F[i].pad), kn=proj(S.F[i].pip);
      if(i===0&&bands.length){ barreTint(G,S.F[0],bands,ink); mine.forEach(q=>{ q.line.style.stroke='url(#'+gid+'t0)'; q.nail.style.stroke=col; q.tint.style.display=''; }); continue; }
      plainStops(G);
      G.g.setAttribute('x1',f(tip.x)); G.g.setAttribute('y1',f(tip.y)); G.g.setAttribute('x2',f(kn.x)); G.g.setAttribute('y2',f(kn.y));
      G.a.setAttribute('stop-color',col); G.b.setAttribute('stop-color',col); G.c.setAttribute('stop-color',w); G.d.setAttribute('stop-color',w);
      for(const k of ['x1','y1','x2','y2']) G.fg.setAttribute(k,G.g.getAttribute(k));
      const tc=rgbS(toneCol[i]); G.fa.setAttribute('stop-color',tc); G.fb.setAttribute('stop-color',tc); G.fc.setAttribute('stop-color',tc);
      G.fa.setAttribute('stop-opacity',(0.32*tone[i]).toFixed(3)); G.fb.setAttribute('stop-opacity',(0.26*tone[i]).toFixed(3));
      // the nail, at the tip, takes the colour whole; the fill a translucent wash, strongest at the tip
      mine.forEach(q=>{ q.line.style.stroke='url(#'+gid+'t'+i+')'; q.nail.style.stroke=col; q.tint.style.display=''; }); }
    if(SOLID) slots.forEach(q=>{ q.vLine.style.stroke=q.line.style.stroke; q.vNail.style.stroke=q.nail.style.stroke; });
    // under the neck: the palm round its knuckles, heel and wrist, and the thumb
    const pts=S.palm.map(proj), n=pts.length;
    let d='M'+P2({x:(pts[n-1].x+pts[0].x)/2,y:(pts[n-1].y+pts[0].y)/2});
    for(let i=0;i<n;i++){ const a=pts[i], b=pts[(i+1)%n]; d+=' Q'+P2(a)+' '+P2({x:(a.x+b.x)/2,y:(a.y+b.y)/2}); }
    palmFill.setAttribute('d',d+' Z'); palmLine.setAttribute('d',d+' Z');
    const tj=S.Th.j; for(let s=0;s<3;s++){ const ra=HM.TRAD[Math.max(0,s-1)]*scl(tj[s][0])*(s===0?1.05:1), rb=HM.TRAD[s]*scl(tj[s+1][0]); const dd=bone(proj(tj[s]),proj(tj[s+1]),ra,rb); thumbSeg[s].fill.setAttribute('d',dd); thumbSeg[s].line.setAttribute('d',dd); }
    const tdir=[0,1,2].map(i=>(S.Th.end[i]-S.Th.ip[i])/27), tn=nail(proj(S.Th.ip),proj(S.Th.end),HM.TRAD[2]*scl(S.Th.end[0]),S.Th.end,tdir,S.Th.back,S.Th.end[0]);
    thumbNail.setAttribute('d',tn?tn.d:''); thumbNail.style.display=tn?'':'none';
    if(SOLID){ let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; const grow=(p,r)=>{ x0=Math.min(x0,p.x-r); x1=Math.max(x1,p.x+r); y0=Math.min(y0,p.y-r); y1=Math.max(y1,p.y+r); };
      S.F.forEach((Fk,k)=>Fk.j.forEach(J=>grow(proj(J),HM.RAD[k][0]*1.1*scl(J[0])))); S.palm.forEach(J=>grow(proj(J),4)); S.Th.j.forEach(J=>grow(proj(J),HM.TRAD[0]*1.1*scl(J[0])));
      fitMasks(x0,y0,x1,y1);
      vPalm.setAttribute('d',palmLine.getAttribute('d')); thumbSeg.forEach((t,s)=>{ vThumb[s].setAttribute('d',t.line.getAttribute('d')); mPth[s].setAttribute('d',t.fill.getAttribute('d')); });
      vThumbNail.setAttribute('d',tn?tn.d:''); vThumbNail.style.display=tn?'':'none'; }
  }
  // can the hand hold this placing? how far the farthest pressing tip stops short (mm)
  function tgFor(pl){
    const tg2=[null,null,null,null], H=handFor(pl);
    for(let k=1;k<=4;k++){ const q=pl.find(o=>o.g===k), h=H.f[k], n=Math.max(1,Math.round(h.fret)), X=fretMM(n)-0.3*(fretMM(n)-fretMM(n-1)), g=gapAt(X);
      if(q&&q.barre&&k===1) tg2[0]={s:q.s, lowS:q.s, barre:{w:fretMM(n),y0:0,y1:q.s*g+1.5}};
      else if(q) tg2[k-1]={s:q.s,p:[X,q.s*g,0.5],press:true,cell:[fretMM(n-1)+2.5,fretMM(n)]};
      else tg2[k-1]={s:h.string,p:[X,h.string*g,5],press:false}; }
    const xs2=tg2.map(g=>g.barre?g.barre.w:g.p[0]), tx=(xs2[0]+xs2[1])/2, yf=NECK.yFar(tx), yn=NECK.yNear(tx), hw=(yn-yf)/2, yc=(yn+yf)/2, ty=yc+0.15*hw;
    return {f:tg2, ring:ringing(tg2), th:[tx,ty,-NECK.depth(tx)*Math.sqrt(1-Math.pow((ty-yc)/hw,2))], thw:0.6}; }
  function reach(pl){
    const TG=tgFor(pl), tg2=TG.f;
    const worst=()=>Math.max(...HM2.errs().map((e,i)=>(tg2[i].press||tg2[i].barre)?e:0));
    // a quick look from where the hand is; if that falls short, the full search before saying no
    HM2.q=HM.q; HM2.quick(TG); let e=worst(); if(e>3){ HM2.solveFresh(TG); e=Math.min(e,worst()); } return e; }
  // LEARNED GRIPS: a song's few chords formed once, ahead (each from scratch), so that when the song changes grip the hand
  // goes straight to the one it found rather than searching mid-strum
  const LEARNED={}; let wantGrip=null;
  function learn(key,pl,open){ openStr.clear(); open.forEach(x=>openStr.add(x)); HM2.reset(); HM2.solveFresh(tgFor(pl)); LEARNED[key]=HM2.q; }
  // PAIRING, on every page with the drawn hand, the hand's own rules only (fingers within their reach of each other, never
  // crossing, two on one string a fret apart). A knuckle clicked (above the board): its finger is picked — let go first if
  // it was placed. The frets it can then reach pulse; one clicked, the finger is placed there and stays, the hand stretching
  // to keep what is placed and forming the rest around it. (Keys 1–4 pick a finger too; Escape drops the pick.) In the Hand
  // lab a fret clicked with no finger picked takes the nearest finger.
  const fits=(pl)=>{ for(let i=0;i<pl.length;i++) for(let j=i+1;j<pl.length;j++) if(!fingersFit(pl[i].g,pl[i].f,pl[i].s,pl[j].g,pl[j].f,pl[j].s)) return false; return true; };
  const reachable=(k,s,f)=>f>=1&&!P.some(p=>p.g!==k&&p.s===s&&p.f===f)&&fits(P.filter(p=>p.g&&p.g!==k).concat([{g:k,s,f}]));
  let marked=false;
  function marks(){ if(!SELK&&!marked) return; marked=!!SELK;
    MARKS.forEach((m,i)=>{ const c=CELLS[i], on=!!SELK&&reachable(SELK,c.s,c.f);
      m.setAttribute('visibility',on?'visible':'hidden'); m.classList.toggle('cand',on); m.style.stroke=on&&FIELD.lit>0.5?rgbS(valRGB(pcOf(c.s,c.f))):''; }); }
  function rehand(){ const H=handFor(P); HAND.f=H.f; HAND.thumb=H.thumb; DRILL=null; resettle=true; refresh(); }
  slots.forEach(q=>{ q.fill.style.pointerEvents='all'; q.fill.style.cursor='pointer';
    q.fill.addEventListener('click',e=>{ if(svgPoint(e).y>=FB.top) return; e.stopPropagation(); const k=q.k+1;
      if(P.some(p=>p.g===k)){ stopForEdit(); P=P.filter(p=>p.g!==k); rehand(); SELK=k; }   // placed: let go, and picked to place again
      else SELK=SELK===k?0:k;
      marks(); }); });
  function pose(k,s0,f0){
    stopForEdit(); openStr.clear(); P=P.filter(p=>p.g&&p.g!==k);
    // what the bones cannot hold together is let go, the finger farthest from the new one first
    while(P.length&&(!fits(P.concat([{g:k,s:s0,f:f0}]))||reach(P.concat([{g:k,s:s0,f:f0}]))>4)){ const far=P.slice().sort((a,b)=>Math.abs(b.g-k)-Math.abs(a.g-k))[0]; P=P.filter(p=>p!==far); }
    P.push({g:k,s:s0,f:f0}); rehand(); }
  fb.addEventListener('click',e=>{ if(!document.body.classList.contains('handOn')) return;
    const p=svgPoint(e); if(p.y<FB.top) return; let fr=0; for(let n=1;n<=FMAX;n++) if(p.x>=cellL(n)&&p.x<cellR(n)) fr=n; if(!fr) return;
    let st=0, bd=1e9; FB.strY.forEach((y,i)=>{ if(Math.abs(y-p.y)<bd){ bd=Math.abs(y-p.y); st=i; } }); if(bd>16) return;
    let k=SELK;
    if(k&&!reachable(k,st,fr)) return;                                     // only a fret the picked finger can reach
    if(!k){ if(!BOOK.handLab) return; let best=1e9; for(let g=1;g<=4;g++){ const c=Math.abs(HAND.f[g].fret-fr)+(HAND.f[g].string===st?0:0.1); if(c<best){ best=c; k=g; } }
      // no finger picked: the nearest goes — but not at once, for a second tap would make it a double tap (the zoom),
      // which leaves the hand and the playing alone
      e.stopPropagation(); if(tapT){ clearTimeout(tapT); tapT=0; return; }
      tapT=setTimeout(()=>{ tapT=0; pose(k,st,fr); SELK=0; marks(); },320); return; }
    e.stopPropagation(); pose(k,st,fr); SELK=0; marks(); },true);
  let tapT=0;
  addEventListener('keydown',e=>{ if(/^[1-4]$/.test(e.key)&&!e.metaKey&&!e.ctrlKey&&!RINGSEL){ SELK=+e.key; marks(); } if(e.key==='Escape'){ SELK=0; marks(); } });
  if(!BOOK.handLab){ document.body.classList.add('handOn'); return {draw, marks}; }   // the drill pages: the hand in place of the dots, and pairing
  const letGo=document.getElementById('clear'); letGo.hidden=false; letGo.textContent='Let Go';
  document.addEventListener('click',e=>{ if(!e.target.closest||!e.target.closest('#clear')) return; P=[]; openStr.clear(); const H=handFor([]); HAND.f=H.f; HAND.thumb=H.thumb; SELK=0; },true);   // before the page's own Let Go, which stops the click
  // CHORD GRIP: the common open and barre chords; a name poses the hand to grip it. Each is written as a chord chart
  // is, low E to high e — the frets (x unplayed, 0 open) and the fingers; a finger on more than one string is a barre,
  // lying along its fret down to the lowest string it holds
  const GRIPS=[['Open',[['C','x32010','x32010'],['A','x02220','x01230'],['G','320033','210034'],['E','022100','023100'],['D','xx0232','xx0132'],
      ['Am','x02210','x02310'],['Em','022000','023000'],['Dm','xx0231','xx0231'],['E7','020100','020100'],['A7','x02020','x01020'],['D7','xx0212','xx0213'],
      ['G7','320001','320001'],['C7','x32310','x32410'],['B7','x21202','x21304'],['Cmaj7','x32000','x32000'],['Fmaj7','xx3210','xx3210']]],
    ['Barre',[['F','133211','134211'],['Fm','133111','134111'],['F♯m','244222','134111'],['G','355433','134211'],['A','577655','134211'],
      ['B♭','x13331','x12341'],['B','x24442','x12341'],['Bm','x24432','x13421'],['C','x35553','x12341'],['Cm','x35543','x13421']]]];
  function grip(frets,fing){
    const pl=[], by={};
    for(let i=0;i<6;i++){ const g=+fing[i], f=+frets[i]; if(!(g>=1)||!(f>=1)) continue; const st=NSTR-1-i; (by[g]=by[g]||[]).push({s:st,f}); }
    for(const g in by){ const a=by[g], lowS=Math.max(...a.map(q=>q.s)); pl.push({g:+g, s:lowS, f:a[0].f, barre:a.length>1}); }
    return pl; }
  const panel=document.createElement('div'); panel.className='gripPanel';
  panel.innerHTML='<p class="gripHd">Chord Grip</p>';
  GRIPS.forEach(([grp,list])=>{ const row=document.createElement('div'); row.className='gripRow';
    row.innerHTML='<span class="gripGrp">'+grp+'</span>';
    list.forEach(([nm,fr,fi])=>{ const b=document.createElement('button'); b.type='button'; b.className='gripBtn';
      const at=grp==='Barre'?Math.min(...[...fr].filter(c=>c!=='x').map(Number).filter(n=>n>0)):0;
      b.innerHTML=nm+(at?'<sub>'+at+'</sub>':''); b.title=nm+' — '+fr;
      b.addEventListener('click',()=>{ stopForEdit(); resettle=true; P=grip(fr,fi); openStr.clear(); [...fr].forEach((c,i)=>{ if(c==='0') openStr.add(NSTR-1-i); }); const H=handFor(P); HAND.f=H.f; HAND.thumb=H.thumb; DRILL=null; SELK=0;
        panel.querySelectorAll('.gripBtn').forEach(x=>x.classList.toggle('on',x===b)); refresh(); });
      row.appendChild(b); });
    panel.appendChild(row); });
  fb.parentElement.after(panel); if(BOOK.chords||BOOK.custom) panel.style.display='none';   // the Chords page has its own panel
  document.addEventListener('click',e=>{ if(e.target.closest&&(e.target.closest('#clear')||e.target.closest('#fb'))) panel.querySelectorAll('.gripBtn.on').forEach(x=>x.classList.remove('on')); },true);
  // the switch: the drawn hand, or the numbered dots
  const btn=document.createElement('button'); btn.type='button'; btn.className='pill'; btn.id='handTog';
  const sync=()=>{ const on=document.body.classList.contains('handOn'); btn.textContent=on?'Dots':'Hand'; btn.setAttribute('aria-pressed',on); };
  btn.addEventListener('click',()=>{ document.body.classList.toggle('handOn'); sync(); });
  document.body.classList.add('handOn'); sync();
  document.getElementById('pageCt').after(btn);
  return {draw, marks, reach, grips:GRIPS, grip, learn, toGrip:k=>{ wantGrip=LEARNED[k]?k:null; }, resettle:()=>{ resettle=true; }, setOpen:a=>{ openStr.clear(); a.forEach(x=>openStr.add(x)); }};
})():null;
{ const prev=frameHook; frameHook=(st,live,plan,dt)=>{ if(prev) prev(st,live,plan,dt); if(HANDLAB) HANDLAB.draw(dt,st,live,plan); }; }
