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
// upper four to the octave at fret 12 (finger 1 shifting up, picked, into the frame), down those four and up them again
function semiBars(pg){
  const m=W_DEG[pg.mode], shp=(a,b)=>a===2&&b===2?'maj':(a===2?'min':'dim');
  const up=[1,2,3].map(j=>wSemi(m+j)-wSemi(m)), fu=W_FING[shp(up[1]-up[0],up[2]-up[1])];
  const dn=[0,1,2,3].map(j=>12-(wSemi(m)-wSemi(m-j))), fd=W_FING[shp(dn[1]-dn[2],dn[0]-dn[1])];
  const U=[[0,0],[up[0],fu[0]],[up[1],fu[1]],[up[2],fu[2]]], D=[[dn[0],fd[2]],[dn[1],fd[1]],[dn[2],fd[0]],[dn[3],1,'shift']];
  return [{g:0,n:U},{g:1,n:D.slice().reverse()},{g:1,n:D},{g:1,n:D.slice().reverse()}];   // up to the 4th, on up to the octave, down to the 5th, back to the octave
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
function applySample(i){ loadPage(i); refresh(); }
function run(){
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
function placeSeg(s,t){ s.count=COUNT; s.countStart=t; s.loopStart=t+COUNT*T.beat; s.loops=SEG_EACH?1:((drill.hold||PAGES.length<2)?Infinity:(BOOK.loops||ADV_LOOPS)); s.end=s.loopStart+s.loops*LOOP*T.beat; }
function nextSeg(after){
  if(SEG_EACH){ const last=T.segs[T.segs.length-1], pass=last?last.pass+1:0;   // a count-in before every pass: the page again until its passes are done (or always, on Hold)
    if(drill.hold||PAGES.length<2||pass<(BOOK.loops||1)){ const s=walkSeg(after,pass); walkFig(s.D.bars); return s; } }
  const i=((after+1)%PAGES.length+PAGES.length)%PAGES.length, s=walkSeg(i); walkFig(s.D.bars); return s; }
function showSeg(s){
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
  INST=new Set(); if(DRILL) DRILL.plan.forEach(n=>INST.add(n.string*(FMAX+1)+n.fret));
  holdBtn.setAttribute('aria-pressed',drill.hold); diatBtn.setAttribute('aria-pressed',diatonic);
  playBtn.disabled=!DRILL&&!T.on;
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
// the hand belongs to the page: no pairing, no dragging
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
  // the mode: a spotlight on its letter, a tinge on the board from its fret; a new mode crossfades in
  const nk=held.string+':'+held.pitch, kk=Math.min(1,(dt||0.016)*6);
  if(!LIGHTS[MODE.cur].note||LIGHTS[MODE.cur].note!==nk){ if(LIGHTS[MODE.cur].note) MODE.cur=1-MODE.cur;
    const L=LIGHTS[MODE.cur]; L.note=nk; L.held=held;
    const hx=held.fret?(cellL(held.fret)+cellR(held.fret))/2:(FB.x0+FB.nut)/2; L.grad.setAttribute('cx',hx.toFixed(1)); L.grad.setAttribute('cy',FB.strY[held.string].toFixed(1)); }
  LIGHTS.forEach((L,i)=>{ const goal=i===MODE.cur?FIELD.lit:0; L.op+=(goal-L.op)*kk; if(L.op<0.002&&i!==MODE.cur){ L.op=0; }
    if(!L.held) return; const pc=pcOf(L.held.string,L.held.pitch), col=rgbS(valRGB(pc)), [x,y]=pt(RG.RL,pc);
    L.spot.setAttribute('cx',x.toFixed(1)); L.spot.setAttribute('cy',y.toFixed(1)); L.spot.setAttribute('fill',col); L.spot.setAttribute('opacity',(0.85*L.op).toFixed(3));
    L.stops.forEach(s=>s.setAttribute('stop-color',col)); L.rect.setAttribute('opacity',L.op.toFixed(3)); });
};
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
      d.innerHTML=names.map((n,i)=>{ const gap=i&&((SEMI[n]-SEMI[names[i-1]]+12)%12)===2?'<span class="us">_</span>':'';
        return gap+'<span style="color:'+(FIELD.on?rgbS(relRGB(SEMI[n]-2)):'')+'">'+n+'</span>'; }).join('');
      inner.appendChild(d); rows.push(d); } };
  const show=(anim)=>{ inner.style.transition=anim?'':'none'; inner.style.transform='translateY(calc(var(--rh) * '+(1-R)+'))';
    rows.forEach((d,r)=>d.classList.toggle('cur',r===R)); if(!anim){ void inner.offsetHeight; inner.style.transition=''; } };
  inner.addEventListener('transitionend',()=>{ if(R<7||R>13){ R+=R<7?7:-7; show(false); } });   // back into the middle copy, unseen
  build(); show(false);
  return {set(k){ build(); const cur=6-(R%7+7)%7; let d=((k-cur)%7+7)%7; if(d>3) d-=7; if(!d){ show(false); return; } R-=d; show(true); }, build};
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

/* THE HAND (lab), from photographs of the fretting hand as the player sees it: the hand itself is under the neck; each
   finger comes round the far (high e) edge and arches over the strings — what shows is its middle joint, a rounded hump
   beyond the edge, and from there the finger coming down toward the player to its tip on the string, the nail facing
   up at the tip. The thumb is under the neck too, its tip peeking out below the near (low E) edge, the heel of the hand
   and the forearm going on down toward the player. The fingertips are the dots' places, pressing and hovering with
   them. Each finger is its own shape, drawn little finger first so the ones in front cover the ones behind; the whole
   hand semi-transparent. */
const HANDLAB=(BOOK.handLab||BOOK.hand)?(()=>{
  const NS='http://www.w3.org/2000/svg', mk=(tag,at,par)=>{ const e=document.createElementNS(NS,tag); for(const k in at) e.setAttribute(k,at[k]); if(par) par.appendChild(e); return e; };
  fb.setAttribute('viewBox','0 4 990 352');                                // headroom for the knuckles, room below for the thumb
  const defs=mk('defs',{},fb), gid='hl'+Math.random().toString(36).slice(2,6);
  const lg=mk('linearGradient',{id:gid+'g',gradientUnits:'userSpaceOnUse',x1:0,y1:FB.bot+20,x2:0,y2:FB.bot+92},defs); mk('stop',{offset:0,'stop-color':'#fff'},lg); mk('stop',{offset:1,'stop-color':'#000'},lg);
  const mask=mk('mask',{id:gid,maskUnits:'userSpaceOnUse',x:-50,y:-200,width:1100,height:700},defs); mk('rect',{x:-50,y:-200,width:1100,height:700,fill:'url(#'+gid+'g)'},mask);
  const behind=mk('g',{class:'hlHand'}); fb.insertBefore(behind,fb.firstChild);   // thumb and the heel of the hand: under the neck
  const armFill=mk('path',{class:'hlSkin'},behind), armLine=mk('path',{class:'hlLine'},behind);
  const thumbFill=mk('path',{class:'hlSkin'},behind), thumbLine=mk('path',{class:'hlLine'},behind), thumbNail=mk('path',{class:'hlLine hlCrease'},behind);
  const front=mk('g',{class:'hlHand'}); fb.insertBefore(front,fingers[0].guide);
  const order=[3,2,0,1];                                                  // little, ring, index, middle: the middle finger in front
  const parts=[0,1,2,3].map(()=>({}));
  // each finger's tone: a gradient along the finger, the tone's colour at the tip fading back to the outline's white
  // half way up toward the knuckle
  const tg=[0,1,2,3].map(i=>{ const g=mk('linearGradient',{id:gid+'t'+i,gradientUnits:'userSpaceOnUse'},defs);
    const fg=mk('linearGradient',{id:gid+'f'+i,gradientUnits:'userSpaceOnUse'},defs);   // and a wash of it inside, clear by half way
    return {g, a:mk('stop',{offset:0},g), b:mk('stop',{offset:0.2},g), c:mk('stop',{offset:0.55},g), d:mk('stop',{offset:1},g),
      fg, fa:mk('stop',{offset:0},fg), fb:mk('stop',{offset:0.2},fg), fc:mk('stop',{offset:0.55,'stop-opacity':0},fg)}; });
  const tone=[0,0,0,0], toneCol=[null,null,null,null];
  order.forEach(i=>{ const q=parts[i]; q.fill=mk('path',{class:'hlSkin'},front); q.tint=mk('path',{'fill':'url(#'+gid+'f'+i+')',stroke:'none'},front); q.line=mk('path',{class:'hlLine'},front); q.nail=mk('path',{class:'hlLine hlNail'},front); q.joint=mk('path',{class:'hlLine hlCrease'},front); });
  // each finger: how far its hump stands beyond the high e edge; its lean (the hump's offset from the tip); its widths
  // at the hump, between the joints, and at the tip (board units: strings 24 apart, frets 66)
  const SPK=47, HUMP=[40,60,54,30], LEAN=[-18,-5,7,18], WK=[52,53,50,43], WM=[45,46,43,37], WT=[42,43,40,35];
  let thx=null, thT=null, sm=null, rot=0, SELK=0; const rots=[0,0,0,0], alpha=[1,1,1,1];
  const ROT=Math.tan(50*Math.PI/180);                                    // how far a crowded hand turns: its fingers 50° off the frets
  const f=v=>v.toFixed(1), P2=p=>f(p.x)+' '+f(p.y);
  const bump=(t,c,s)=>Math.exp(-((t-c)*(t-c))/(2*s*s));
  // one finger from its knuckle's crown H to its pad (the round of the tip, on the string): it leaves the knuckle
  // downward and rounds over toward the tip, so a turned finger curves rather than slanting straight; a barring
  // finger lies straight along its fret
  function finger(k,pad,H,kk,flat){
    const dx=pad.x-H.x, dy=pad.y-H.y, dl=Math.hypot(dx,dy)||1, rT0=WT[k]/2, E={x:pad.x+dx/dl*rT0, y:pad.y+dy/dl*rT0};
    const C=flat?{x:(H.x+E.x)/2, y:(H.y+E.y)/2}:{x:H.x+(E.x-H.x)*0.12, y:H.y+(E.y-H.y)*0.7};
    const P=t=>({x:(1-t)*(1-t)*H.x+2*(1-t)*t*C.x+t*t*E.x, y:(1-t)*(1-t)*H.y+2*(1-t)*t*C.y+t*t*E.y});
    const D=t=>{ const x=2*(1-t)*(C.x-H.x)+2*t*(E.x-C.x), y=2*(1-t)*(C.y-H.y)+2*t*(E.y-C.y), l=Math.hypot(x,y)||1; return {x:x/l,y:y/l}; };
    // width down the finger: the knuckle broad, the middle bone narrower, a swell at the end joint, the pad (wider pressed)
    const W=t=>{ const base=t<0.45?WK[k]+(WM[k]-WK[k])*(t/0.45):WM[k]+(WT[k]-WM[k])*((t-0.45)/0.55);
      return base*(1+0.05*bump(t,0.72,0.06)+0.06*kk*bump(t,0.97,0.06)); };
    const len=Math.hypot(E.x-H.x,E.y-H.y), rT=W(1)/2, rH=W(0)/2, t0=Math.min(0.4,rH/Math.max(len,1)), t1=Math.max(t0+0.05,1-rT/Math.max(len,1));
    const L=[], R=[], N=20;
    for(let i=0;i<=N;i++){ const t=t0+(t1-t0)*i/N, p=P(t), d=D(t), w=W(t)/2; L.push({x:p.x-d.y*w*-1,y:p.y+d.x*w*-1}); R.push({x:p.x+d.y*w*-1,y:p.y-d.x*w*-1}); }
    // L and R are the two sides; the hump is a half round over the top, the tip a half round at the bottom
    const sweepTop=L[0].x<R[0].x?1:0;
    const d='M'+P2(L[0])+' '+L.slice(1).map(p=>'L'+P2(p)).join(' ')+' A'+f(rT)+' '+f(rT)+' 0 0 '+(1-sweepTop)+' '+P2(R[N])+' '
      +R.slice(0,N).reverse().map(p=>'L'+P2(p)).join(' ')+' A'+f(rH)+' '+f(rH)+' 0 0 '+(1-sweepTop)+' '+P2(L[0])+' Z';
    // the nail: on the end of the finger, its free edge at the tip, its root (the cuticle's curve) a little way up
    const dE=D(t1), cE=P(t1), nw=W(1)*0.56, nh=W(1)*0.62, nx=-dE.y, ny=dE.x;
    const bot={x:cE.x+dE.x*rT*0.72, y:cE.y+dE.y*rT*0.72}, top={x:bot.x-dE.x*nh, y:bot.y-dE.y*nh};
    const bl={x:bot.x+nx*nw/2, y:bot.y+ny*nw/2}, br={x:bot.x-nx*nw/2, y:bot.y-ny*nw/2}, tl={x:top.x+nx*nw/2, y:top.y+ny*nw/2}, tr={x:top.x-nx*nw/2, y:top.y-ny*nw/2};
    const nail='M'+P2(tl)+' L'+P2(bl)+' Q'+P2({x:bot.x+dE.x*nw*0.35, y:bot.y+dE.y*nw*0.35})+' '+P2(br)+' L'+P2(tr)+' Q'+P2({x:top.x+dE.x*nw*0.22, y:top.y+dE.y*nw*0.22})+' '+P2(tl);
    // the end joint's crease, faint, across the back of the finger
    const tj=t0+(t1-t0)*0.5, pj=P(tj), dj=D(tj), wj=W(tj)*0.3;
    const joint='M'+P2({x:pj.x-dj.y*wj, y:pj.y+dj.x*wj})+' Q'+P2({x:pj.x+dj.x*4, y:pj.y+dj.y*4})+' '+P2({x:pj.x+dj.y*wj, y:pj.y-dj.x*wj});
    return {d, nail, joint};
  }
  function draw(dt,st,live,plan){
    const on=document.body.classList.contains('handOn'); front.style.display=behind.style.display=on?'':'none'; if(!on) return;
    // pressing is what the finger is doing, not where it is: a finger hovering over one string sits where the next
    // string's press would be, and read from its place it would flash down as the hand crosses strings
    const tips=fingers.map(F=>({x:F.x, y:F.y, kk:(F.isDown!==undefined?F.isDown:F.c.classList.contains('down'))?1:0}));
    if(tips.some(p=>p.x===undefined||isNaN(p.x))) return;
    const barre=P.some(q=>q.g===1&&q.barre), restPinky=!T.on&&!P.some(q=>q.g===4);
    // turning goes finger by finger: neighbours stopping one fret on different strings turn together toward the nut,
    // their knuckles closing into a row; a finger alone on its fret stays square to the frets, so in a barre or a
    // power-chord shape the 1st, 2nd and 3rd knuckles keep a fret apart
    const fr=[1,2,3,4].map(g=>HAND.f[g]?Math.round(HAND.f[g].fret):0), grp=[], gOf=[];
    for(let i=0;i<4;i++){ if(barre&&i===0){ gOf[i]=-1; continue; } if(restPinky&&i===3){ gOf[i]=-1; continue; }
      const g=grp.length&&grp[grp.length-1].fr===fr[i]&&HAND.f[i].string!==HAND.f[i+1].string?grp[grp.length-1]:(grp.push({fr:fr[i],m:[]}),grp[grp.length-1]); g.m.push(i); gOf[i]=grp.indexOf(g); }
    const rk=reduce?1:Math.min(1,(dt||0.016)/0.15);
    for(let i=0;i<4;i++){ const tgt=gOf[i]>=0&&grp[gOf[i]].m.length>1?1:0; rots[i]+=(tgt-rots[i])*rk; alpha[i]+=((tips[i].kk?1:0.38)-alpha[i])*Math.min(1,(dt||0.016)/0.08); }
    rot=Math.max(...rots);
    const hy=i=>FB.top-HUMP[i]*(1-0.25*rots[i]);
    // the tip on its string: the round of the tip just short of the fret wire; how far it reaches past the string is
    // the arch — an arched finger meets the string near the nail, its end only a little past it, never over the next
    // string; a barring finger lies flat, on the pad
    const wire=i=>{ const h=HAND.f[i+1]; return h?tips[i].x+cellR(Math.max(1,Math.min(FMAX,fr[i])))-tipX(Math.max(1,Math.min(FMAX,fr[i]))):tips[i].x; };
    const base=tips.map(p=>p.y+FR*0.75);                                  // the string's line (lifted with the finger when it hovers)
    const pads=[], humps=[];
    for(let i=0;i<4;i++){ const r=WT[i]/2; pads[i]={x:wire(i)-2-r, y:base[i]-r*0.4}; }
    const own=pads.map((p,i)=>p.x+LEAN[i]*(1-rots[i])-rots[i]*(p.y-hy(i))*ROT);
    for(let i=0;i<4;i++){
      if(barre&&i===0){ humps[i]={x:pads[i].x, y:FB.top-26}; continue; }
      const g=gOf[i]>=0?grp[gOf[i]]:null; let x=own[i];
      if(g&&g.m.length>1){ const mid=g.m.reduce((a,j)=>a+own[j],0)/g.m.length, at=g.m.indexOf(i)-(g.m.length-1)/2; x=own[i]+((mid+at*SPK)-own[i])*rots[i]*0.85; }
      humps[i]={x, y:hy(i)}; }
    // the knuckles never collapse past one another: each at least a knuckle's width beyond the one before it — so in a
    // barre or a power chord the 1st, 2nd and 3rd stand a fret apart and only the crowded fingers turn
    for(let i=1;i<4;i++) humps[i].x=Math.max(humps[i].x,humps[i-1].x+SPK);
    // the little finger at rest lies right alongside the ring finger, the joints touching all the way to the tips, a
    // little shorter
    if(restPinky){ const side=(WK[2]+WK[3])/2-1, sideT=(WT[2]+WT[3])/2-1;   // side by side with the ring finger, joint against joint down to the tips
      humps[3]={x:humps[2].x+side, y:humps[2].y+6}; pads[3]={x:pads[2].x+sideT, y:pads[2].y-8}; }
    // settle each pad so the finger's end lands where the arch puts it (the direction depends on the knuckle)
    for(let i=0;i<4;i++){ if(restPinky&&i===3) continue; const r=WT[i]/2, reach=(barre&&i===0)?10:7;
      for(let n=0;n<2;n++){ const dx=pads[i].x-humps[i].x, dy=pads[i].y-humps[i].y, l=Math.hypot(dx,dy)||1; pads[i].y=base[i]+reach-dy/l*r; pads[i].x=wire(i)-2-r+Math.max(0,dx/l)*0; } }
    tips.forEach((p,i)=>{ const g=finger(i,pads[i],humps[i],p.kk,barre&&i===0), q=parts[i]; q.line.classList.toggle('hlSel',SELK===i+1);
      q.fill.setAttribute('d',g.d); q.tint.setAttribute('d',g.d); q.line.setAttribute('d',g.d); q.nail.setAttribute('d',g.nail); q.joint.setAttribute('d',g.joint);
      const a=alpha[i].toFixed(3); q.fill.style.opacity=a; q.tint.style.opacity=a; q.line.style.opacity=a; q.nail.style.opacity=a; q.joint.style.opacity=a; });
    // a finger whose tone is ringing — pressing, and the highest stop on its string — takes the tone's colour (g(x) on)
    // playing, it is the note being struck — its finger, its string and fret; posed, every pinned finger that is the
    // highest stop on its string
    const ink=inkColour(), now=live&&st&&st.idx>=0&&plan&&plan[st.idx]?plan[st.idx]:null, lit=[false,false,false,false], at=[];
    if(now){ if(FIELD.on&&now.finger>=1&&now.fret>=1){ lit[now.finger-1]=true; at[now.finger-1]={s:now.string,f:now.fret}; } }
    else if(!T.on) P.forEach(q=>{ if(!FIELD.on||!q.g||!(q.f>=1)) return; if(P.some(o=>o!==q&&o.g&&o.s===q.s&&o.f>q.f)) return; lit[q.g-1]=true; at[q.g-1]={s:q.s,f:q.f}; });
    for(let i=0;i<4;i++){ const q=parts[i], G=tg[i];
      if(lit[i]) toneCol[i]=valRGB(pcOf(at[i].s,at[i].f));
      tone[i]+=((lit[i]?1:0)-tone[i])*Math.min(1,(dt||0.016)/(lit[i]?0.05:0.25));
      if(tone[i]<0.01||!toneCol[i]){ q.line.style.stroke=''; q.nail.style.stroke=''; q.tint.style.display='none'; continue; }
      const col=rgbS(mixRGB(ink,toneCol[i],tone[i])), w=rgbS(ink);
      G.g.setAttribute('x1',f(pads[i].x)); G.g.setAttribute('y1',f(pads[i].y+WT[i]*0.5)); G.g.setAttribute('x2',f(humps[i].x)); G.g.setAttribute('y2',f(humps[i].y));
      G.a.setAttribute('stop-color',col); G.b.setAttribute('stop-color',col); G.c.setAttribute('stop-color',w); G.d.setAttribute('stop-color',w);
      q.line.style.stroke='url(#'+gid+'t'+i+')';
      // the nail, at the tip, takes the colour whole; the fill a translucent wash, strongest at the tip
      q.nail.style.stroke=col;
      for(const k of ['x1','y1','x2','y2']) G.fg.setAttribute(k,G.g.getAttribute(k));
      const tc=rgbS(toneCol[i]); G.fa.setAttribute('stop-color',tc); G.fb.setAttribute('stop-color',tc); G.fc.setAttribute('stop-color',tc);
      G.fa.setAttribute('stop-opacity',(0.32*tone[i]).toFixed(3)); G.fb.setAttribute('stop-opacity',(0.26*tone[i]).toFixed(3)); q.tint.style.display=''; }
    // the thumb's tip just out from under the near edge, the thumb going back under the neck toward the heel of the hand;
    // the forearm on down toward the player
    // the thumb stays between the index and the middle finger, following the hand wherever it goes
    thT=(pads[0].x+pads[1].x)/2;
    const k=reduce?1:Math.min(1,(dt||0.016)/0.12); thx=thx===null||reduce?thT:thx+(thT-thx)*k;
    const mean=(tips[0].x+tips[1].x+tips[2].x+tips[3].x)/4; sm=sm===null||reduce?mean:sm+(mean-sm)*k;
    // under the neck, as the player sees it: the thumb's pad, a broad oval just out from under the near edge, its outer
    // side running up into the neck; and the heel of the hand, a long low line from the pad's foot across under the
    // fingers, curving up into the neck under the little finger
    // the pad sits clear of the fret markers, a little way below the edge; it is round below and flattened along the
    // top, where it bears on the back of the neck (the flat rising a little toward the fingers)
    const c={x:thx, y:FB.bot+52}, rx=32, ry=29, Rx=tips[3].x+WT[3]*0.5, tl=c.y-ry*0.78, tr=c.y-ry*0.86;
    const pad='M'+f(c.x-rx)+' '+f(c.y)+' C'+f(c.x-rx)+' '+f(c.y-ry*0.55)+' '+f(c.x-rx*0.82)+' '+f(tl)+' '+f(c.x-rx*0.42)+' '+f(tl)
      +' C'+f(c.x-rx*0.1)+' '+f(tl-1)+' '+f(c.x+rx*0.15)+' '+f(tr)+' '+f(c.x+rx*0.45)+' '+f(tr)
      +' C'+f(c.x+rx*0.84)+' '+f(tr)+' '+f(c.x+rx)+' '+f(c.y-ry*0.5)+' '+f(c.x+rx)+' '+f(c.y)
      +' A'+rx+' '+ry+' 0 0 1 '+f(c.x-rx)+' '+f(c.y);
    thumbLine.setAttribute('d',pad); thumbFill.setAttribute('d',pad+' Z');
    // its outer side running up into the neck; the heel of the hand from the pad's foot across under the fingers and up
    const S={x:c.x-rx-12, y:FB.bot}, Pf={x:c.x+rx*0.25, y:c.y+ry*0.97}, hy0=c.y+ry*0.55, Q={x:Rx-34, y:hy0};
    const heel='M'+P2(S)+' C'+f(S.x+3)+' '+f(FB.bot+14)+' '+f(c.x-rx-3)+' '+f(c.y-24)+' '+f(c.x-rx+1)+' '+f(c.y-4)
      +' M'+P2(Pf)+' C'+f(c.x+rx+40)+' '+f(hy0+4)+' '+f(Q.x-90)+' '+f(hy0-2)+' '+P2(Q)+' C'+f(Rx-8)+' '+f(hy0+1)+' '+f(Rx+2)+' '+f(FB.bot+26)+' '+f(Rx)+' '+f(FB.bot);
    armLine.setAttribute('d',heel);
    armFill.setAttribute('d','M'+P2(S)+' L'+f(c.x)+' '+f(c.y)+' L'+P2(Pf)+' C'+f(c.x+rx+40)+' '+f(hy0+4)+' '+f(Q.x-90)+' '+f(hy0-2)+' '+P2(Q)+' C'+f(Rx-8)+' '+f(hy0+1)+' '+f(Rx+2)+' '+f(FB.bot+26)+' '+f(Rx)+' '+f(FB.bot)+' Z');
    // the pad's fold at its foot, two faint arcs
    thumbNail.setAttribute('d','M'+f(c.x-14)+' '+f(c.y+15)+' Q'+f(c.x-2)+' '+f(c.y+24)+' '+f(c.x+14)+' '+f(c.y+18)+' M'+f(c.x-18)+' '+f(c.y+18)+' Q'+f(c.x-4)+' '+f(c.y+28)+' '+f(c.x+14)+' '+f(c.y+21));
  }
  if(!BOOK.handLab){ document.body.classList.add('handOn'); return {draw}; }   // the drill pages: the hand in place of the dots, nothing more
  // posing, free of any harmony: the hand's own rules only (fingers within their reach of each other, never crossing,
  // two on one string a fret apart). Pick a finger — click it, or press 1–4 — then click where it goes; it stays pinned
  // there, the hand stretching to keep what is pinned and forming the rest around it. Let Go lifts every pin.
  parts.forEach((q,i)=>{ q.fill.style.pointerEvents='all'; q.fill.style.cursor='pointer';
    q.fill.addEventListener('click',e=>{ if(svgPoint(e).y>=FB.top) return; e.stopPropagation(); SELK=SELK===i+1?0:i+1; }); });   // a finger is picked by its knuckle, above the board
  const fits=(pl)=>{ for(let i=0;i<pl.length;i++) for(let j=i+1;j<pl.length;j++) if(!fingersFit(pl[i].g,pl[i].f,pl[i].s,pl[j].g,pl[j].f,pl[j].s)) return false; return true; };
  function pose(k,s0,f0){
    stopForEdit(); P=P.filter(p=>p.g&&p.g!==k);
    while(!fits(P.concat([{g:k,s:s0,f:f0}]))){ const far=P.slice().sort((a,b)=>Math.abs(b.g-k)-Math.abs(a.g-k))[0]; P=P.filter(p=>p!==far); }
    P.push({g:k,s:s0,f:f0}); const H=handFor(P); HAND.f=H.f; HAND.thumb=H.thumb; DRILL=null; refresh(); }
  fb.addEventListener('click',e=>{ if(!document.body.classList.contains('handOn')) return;
    const p=svgPoint(e); if(p.y<FB.top) return; let fr=0; for(let n=1;n<=FMAX;n++) if(p.x>=cellL(n)&&p.x<cellR(n)) fr=n; if(!fr) return;
    let st=0, bd=1e9; FB.strY.forEach((y,i)=>{ if(Math.abs(y-p.y)<bd){ bd=Math.abs(y-p.y); st=i; } }); if(bd>16) return;
    let k=SELK; if(!k){ let best=1e9; for(let g=1;g<=4;g++){ const c=Math.abs(HAND.f[g].fret-fr)+(HAND.f[g].string===st?0:0.1); if(c<best){ best=c; k=g; } } }
    pose(k,st,fr); SELK=0; },true);
  addEventListener('keydown',e=>{ if(/^[1-4]$/.test(e.key)&&!e.metaKey&&!e.ctrlKey){ SELK=+e.key; } if(e.key==='Escape') SELK=0; });
  const letGo=document.getElementById('clear'); letGo.hidden=false; letGo.textContent='Let Go';
  document.addEventListener('click',e=>{ if(!e.target.closest||!e.target.closest('#clear')) return; P=[]; const H=handFor([]); HAND.f=H.f; HAND.thumb=H.thumb; SELK=0; },true);   // before the page's own Let Go, which stops the click
  // CHORD GRIP: the common open and barre chords; a name poses the hand to grip it. Each is written as a chord chart
  // is, low E to high e — the frets (x unplayed, 0 open) and the fingers; a finger on more than one string is a barre,
  // lying along its fret down to the lowest string it holds
  const GRIPS=[['Open',[['C','x32010','x32010'],['A','x02220','x01230'],['G','320003','210003'],['E','022100','023100'],['D','xx0232','xx0132'],
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
      b.addEventListener('click',()=>{ stopForEdit(); P=grip(fr,fi); const H=handFor(P); HAND.f=H.f; HAND.thumb=H.thumb; DRILL=null; SELK=0;
        panel.querySelectorAll('.gripBtn').forEach(x=>x.classList.toggle('on',x===b)); refresh(); });
      row.appendChild(b); });
    panel.appendChild(row); });
  fb.parentElement.after(panel);
  document.addEventListener('click',e=>{ if(e.target.closest&&(e.target.closest('#clear')||e.target.closest('#fb'))) panel.querySelectorAll('.gripBtn.on').forEach(x=>x.classList.remove('on')); },true);
  // the switch: the drawn hand, or the numbered dots
  const btn=document.createElement('button'); btn.type='button'; btn.className='pill'; btn.id='handTog';
  const sync=()=>{ const on=document.body.classList.contains('handOn'); btn.textContent=on?'Dots':'Hand'; btn.setAttribute('aria-pressed',on); };
  btn.addEventListener('click',()=>{ document.body.classList.toggle('handOn'); sync(); });
  document.body.classList.add('handOn'); sync();
  document.getElementById('pageCt').after(btn);
  return {draw};
})():null;
{ const prev=frameHook; frameHook=(st,live,plan,dt)=>{ if(prev) prev(st,live,plan,dt); if(HANDLAB) HANDLAB.draw(dt,st,live,plan); }; }
