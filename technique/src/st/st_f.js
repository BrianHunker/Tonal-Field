
/* ---------- a run: segments on the audio clock, one per drill ----------
   Each segment: a one-bar count-in (the hand moves to the new place while it goes by), then the figure, 4 loops when
   advancing, endless on Hold. Advancing appends the next sample's segment as the current one finishes. */
const T={on:false,beat:60/70,segs:[],si:0,nextI:0,nextCycle:0,nextBeat:0,timer:null,live:[],shown:null};
// PULSE (a page in another metre): the click every u beats, accent(n) on the n-th; null, a click a beat, beat 1 of 4 accented.
// TAB_LIT: the plan's notes lit together (a page whose tones overlap); null, only the one sounding.
let PULSE=null, TAB_LIT=null;
const playBtn=document.getElementById('play');
function layoutOf(D){                                                   // the pairings and resting hand a drill implies
  const pl=placementsOf({lo:D.lo,hi:D.hi}).map(q=>({g:q.g,s:q.s,f:q.f})), H=handFor(pl);
  if(D.means==='slide'){ const st=(D.dir||drill.dir)==='up'?D.lo:D.hi; H.f[D.lo.g].fret=st.f; }
  return {pl,H};
}
function mkSeg(D,H,si,custom){
  const dir=D.dir||drill.dir, DD=Object.assign({},D,{dir}); DD.plan=planOf(DD,dir);
  return {D:DD,plan:DD.plan,hand:cloneHand(H),si,custom,mode:D.means,strs:{},plant:true,
    xt:D.means==='slide'?SLIDE_T:(D.means==='bend'?Math.min(0.16,0.4*T.beat/2):0)};
}
function placeSeg(s,t){ s.count=COUNT; s.countStart=t; s.loopStart=t+COUNT*T.beat; s.loops=drill.hold?Infinity:ADV_LOOPS; s.end=s.loopStart+s.loops*LOOP*T.beat; }
function nextSeg(after){
  if(!SAMPLES.length) return null;
  const i=(((after<0?SI:after)+1)%SAMPLES.length+SAMPLES.length)%SAMPLES.length, D=drillOfSample(SAMPLES[i]);
  return mkSeg(D,layoutOf(D).H,i,false);
}
function run(){
  if(!DRILL) return;
  ensureCtx().then(()=>{
    if(T.on) stopAll();
    T.beat=60/drill.bpm;
    const s=mkSeg(Object.assign({},DRILL,{dir:drill.dir}),HAND,CUSTOM?-1:SI,CUSTOM); placeSeg(s,ctx.currentTime+0.1);
    T.segs=[s]; T.si=0; T.nextI=0; T.nextCycle=0; T.nextBeat=-COUNT; T.live=[]; T.shown=null; T.on=true;
    tick(); T.timer=setInterval(tick,25);
    playBtn.textContent='Stop'; playBtn.classList.add('on');
  });
}
function tick(){
  const horizon=ctx.currentTime+0.18;
  while(T.si<T.segs.length){
    const s=T.segs[T.si], total=s.loops*LOOP, U=PULSE?PULSE.u:1;
    for(;;){
      if(T.nextBeat*U>=total) break;
      const t=s.loopStart+T.nextBeat*U*T.beat; if(t>=horizon) break;
      const counting=T.nextBeat<0;
      if(counting||drill.click) click(t,PULSE?PULSE.acc(T.nextBeat):((T.nextBeat%4)+4)%4===0);
      T.nextBeat++;
    }
    const SF=s.fig||FIG;                                                  // a segment may carry its own figure (a song's bar)
    for(;;){
      if(T.nextCycle>=s.loops) break;
      const e=SF[T.nextI], t=s.loopStart+(T.nextCycle*LOOP+e.s)*T.beat; if(t>=horizon) break;
      const sn=s.plan[T.nextI].string; if(!s.strs[sn]) s.strs[sn]=makeString(GAUGE(sn));
      note(s,t,T.nextI,T.nextCycle===0&&T.nextI===0);
      if(++T.nextI===SF.length){ T.nextI=0; T.nextCycle++; if(s.swap) s.swap(); }   // a chord page may change its figure at the loop's end
    }
    if(T.nextBeat*U>=total&&T.nextCycle>=s.loops){
      if(!s.keep) for(const k in s.strs) s.strs[k].stopAt(s.end);   // (a song's bars share their strings, ringing on across the bar line)
      if(T.si===T.segs.length-1&&(!drill.hold||SEG_EACH)){ const n=nextSeg(s.si); if(n){ placeSeg(n,s.end); T.segs.push(n); } }
      T.si++; T.nextI=0; T.nextCycle=0; if(T.si<T.segs.length) T.nextBeat=-T.segs[T.si].count/U;
    }else break;
  }
  // trim the played segments, keeping the last six; the scheduler's place moves back with them (it used to be clamped
  // to the new length, which put it past the end: a long run went silent at its 13th segment)
  if(T.segs.length>12){ const k=T.segs.length-6; T.segs.splice(0,k); T.si=Math.max(0,T.si-k); }
}
function track(src,g){ const rec={src,g}; T.live.push(rec); src.onended=()=>{const k=T.live.indexOf(rec); if(k>=0) T.live.splice(k,1);}; return rec; }
// THE OTHER RINGING STRINGS: on a chord every string still sounding is drawn vibrating — its own band and strobe, from the
// fret it is stopped at (read off its own pitch) to the bridge, lit in its tone's colour by its own level — not only the
// string struck last, which the drawing above keeps as before. A string stilled, let go or quiet drops back to a plain line.
const VIBX=[];
function vibEls(k){ if(!VIBX[k]){ const b=blurEl.cloneNode(), z=strobeEl.cloneNode(); blurEl.parentNode.insertBefore(b,blurEl); strobeEl.parentNode.insertBefore(z,strobeEl); VIBX[k]={blur:b,strobe:z,on:false}; } return VIBX[k]; }
function ringOthers(live,s,strI,t){
  const chord=live&&s&&s.strs&&s.chord, now=performance.now();
  for(let k=0;k<NSTR;k++){ const o=chord&&k!==strI?s.strs[k]:null; let on=false;
    if(o&&o.snap&&now-(o.snapT||0)<200&&!(o.offAt!==undefined&&ctx.currentTime>o.offAt)){ const a=Math.min(1,ampOf(o.snap)/0.3);
      if(a>0.03){ const fr=Math.max(0,12*Math.log2(o.snap.f/STRINGS[k].hz)), fx=fr<0.05?FB.nut:tipXf(fr), y=FB.strY[k], E=vibEls(k);
        on=drawVib(o.snap,fx,y,BRIDGE_X,y,t,E);
        if(on){ const ink=inkColour(), c=toneColour(pcOf(k,Math.round(fr))), tint='rgb('+ink.map((v,i)=>Math.round(v+(c[i]-v)*a)).join(',')+')';
          E.blur.style.fill=tint; E.strobe.style.stroke=tint;
          strLines[k].setAttribute('d','M'+FB.x0+' '+y+' L'+FB.nut+' '+y+' L'+fx.toFixed(1)+' '+y); strLines[k].classList.add('strDim'); } } }
    const E=VIBX[k]; if(!E) continue;
    if(!on&&E.on){ E.blur.setAttribute('visibility','hidden'); E.strobe.setAttribute('visibility','hidden'); if(k!==strI) strLines[k].setAttribute('d',strPath(FB.strY[k],0,0)); }
    E.on=on; }
}
// each string's picture of itself, timed as it arrives (so a string whose sound has stopped stops drawing), and its stop time
{ const mk0=makeString; makeString=function(g){ const o=mk0(g); let sn=null;
    Object.defineProperty(o,'snap',{get:()=>sn,set:v=>{ sn=v; o.snapT=performance.now(); },configurable:true});
    const st0=o.stopAt; o.stopAt=(t,now)=>{ o.offAt=now?ctx.currentTime:t; st0(t,now); }; return o; }; }
function note(s,t,i,first){
  const e=s.plan[i], f=fretHz(e.string,e.pitch), str=s.strs[e.string];
  // a written length (e.off beats): the string stilled where the tone ends — unless it is struck again straight after (e.gap)
  if(e.off!==undefined){ const tr=t+e.off*T.beat, room=e.gap*T.beat; if(room>0.05) str.send({kind:'damp',t:tr-0.012,t1:tr+Math.min(0.045,room-0.01),depth:0.002}); }
  const q=s.plan[(i+s.plan.length-1)%s.plan.length];                  // crossing to the other string: the last one is let go
  if(!first&&!s.chord&&q.string!==e.string&&s.strs[q.string]) s.strs[q.string].send({kind:'damp',t:t+0.03,t1:t+0.25,depth:0.002});   // a chord's tones ring on
  // re-striking a string: a single line's pick stops it first (a choke); a strum's pick only brushes the ringing string on its
  // way through — a light touch (about −8 dB over 10 ms), the old vibration carrying on under the new
  const choke=()=>{ if(first) return; if(s.chord&&!e.line) str.send({kind:'damp',t:Math.max(ctx.currentTime,t-0.01),t1:t,depth:0.4}); else str.send({kind:'damp',t:Math.max(ctx.currentTime,t-catchT()),t1:t,depth:0.03}); };
  if(!first&&(e.kind==='ham'||e.kind==='pull')){ const K=e.kind==='ham'?'H':'P'; str.send({kind:'set',t,f}); str.send({kind:'pluck',t,f,v:LEG.v[K],a:LEG.a[K],keep:true}); return; }
  if(e.mute) for(const m of e.mute) if(s.strs[m]) s.strs[m].send({kind:'damp',t:t-0.02,t1:t+0.02,depth:0.002});   // a new grip: strings it leaves out are stilled
  if(first||(!e.glide&&!e.pre)){ choke(); str.send({kind:'pluck',t,f,v:PLUCK_V*(e.vel||1)}); return; }
  const g0=Math.max(ctx.currentTime,t-s.xt);
  if(e.pre) str.send({kind:'damp',t:g0,t1:t,depth:0.003});
  str.send({kind:'glide',t:g0,t1:t,f});
  if(e.pick){ if(!e.pre) choke(); str.send({kind:'pluck',t,f,v:PLUCK_V}); }
}
/*@COPY:1072-1090*/
function stopAll(){
  if(T.timer){ clearInterval(T.timer); T.timer=null; }
  T.on=false;
  if(ctx){
    const now=ctx.currentTime;
    for(const r of T.live){ try{ r.g.gain.cancelScheduledValues(now); r.g.gain.setValueAtTime(r.g.gain.value,now); r.g.gain.linearRampToValueAtTime(0,now+0.03); r.src.stop(now+0.05); }catch(err){} }
    for(const s of T.segs) for(const k in s.strs) s.strs[k].stopAt(now,true);
  }
  T.live=[]; T.segs=[]; T.shown=null;
  playBtn.textContent='Play'; playBtn.classList.remove('on');
  refresh();
}
// Hold switched during playback: on, the current drill loops on; off, it finishes the loop it is in (at least 4) and moves on
function holdChanged(){
  if(!T.on) return;
  const now=ctx.currentTime, s=segAt(now);
  if(drill.hold){ const k=T.segs.indexOf(s); if(T.si===k){ s.loops=Infinity; s.end=Infinity; } }
  else if(!isFinite(s.loops)){ const cyc=Math.max(0,Math.floor((now-s.loopStart)/(LOOP*T.beat))); s.loops=Math.max(ADV_LOOPS,cyc+1); s.end=s.loopStart+s.loops*LOOP*T.beat; }
}

/* ---------- what the screen shows at audio time t ---------- */
function segAt(t){ let s=T.segs[0]; for(const x of T.segs){ if(x.countStart<=t) s=x; else break; } return s; }
// the strums of a segment (several strings struck at once, a beat time each): the run they make on the eighths, a down on each
// downbeat, an up on each off-beat — null if they are not laid so (or there are none)
function pendOf(s){
  if(s._pendP===s.plan) return s._pend; s._pendP=s.plan; s._pend=null; const pl=s.plan, F=s.fig; if(!pl||!F||pl.length!==F.length) return null;
  const st=[]; for(let i=0;i<pl.length;i++){ const q=pl[i]; if(q.t===undefined||!q.pick) continue; if(i>0&&pl[i-1].t===q.t&&pl[i-1].frame===q.frame) continue;
    let n=1; while(i+n<pl.length&&pl[i+n].t===q.t&&pl[i+n].frame===q.frame) n++; if(n>1) st.push({b:F[i].s,up:!!q.up,sp:(F[i+n-1].s-F[i].s)/(n-1)}); }
  if(!st.length) return null; const b0=st[0].b, sp=Math.max(...st.map(x=>x.sp));
  const hit=new Set(); for(const x of st){ const j=(x.b-b0)/0.5; if(Math.abs(j-Math.round(j))>1e-3||(Math.round(j)%2===1)!==x.up) return null; hit.add(Math.round(j)); }
  s._pend={b0,b1:st[st.length-1].b+0.5,sd:Math.min(0.3,sp*(NSTR-1)),hit}; return s._pend; }
function pendY(s,ph){ const P=pendOf(s); if(!P||ph<P.b0||ph>=P.b1) return null;
  const j=Math.floor((ph-P.b0)/0.5+1e-9), u=ph-P.b0-j*0.5, down=j%2===0, lo=FB.strY[NSTR-1], hi=FB.strY[0], a=down?lo:hi, b=down?hi:lo;
  // ghost: a stroke that strikes nothing (eased in and out at its ends, 0–1)
  const gh=P.hit.has(j)?0:Math.max(0,Math.min(1,u/0.08,(0.5-u)/0.08)); PEND_GHOST=gh;
  if(u<P.sd) return a+(b-a)*(u/P.sd);
  const v=(u-P.sd)/(0.5-P.sd), over=0.6*Math.abs(FB.strY[1]-FB.strY[0]); return b+Math.sign(b-a)*over*Math.sin(Math.PI*v); }
let PEND_GHOST=0;
function stateAt(t){
  const s=segAt(t), b=(t-s.loopStart)/T.beat;
  if(b<0){ const k=Math.floor(b); return {s,count:true,idx:-1,beatIdx:((k%LOOP)+LOOP)%LOOP,beatT:s.loopStart+k*T.beat}; }
  if(b>=s.loops*LOOP) return {s,count:true,done:true,idx:-1,beatIdx:-1,beatT:0};
  const cyc=Math.floor(b/LOOP), ph=b-cyc*LOOP, base=s.loopStart+cyc*LOOP*T.beat;
  const SF=s.fig||FIG; let idx=0; for(let i=1;i<SF.length;i++){ if(SF[i].s<=ph) idx=i; else break; }
  const e=SF[idx], onset=base+e.s*T.beat, dur=e.d*T.beat;
  return {s,count:false,ph,idx,onset,dur,nextIdx:(idx+1)%SF.length,nextOnset:onset+dur,beatIdx:Math.floor(ph),beatT:base+Math.floor(ph)*T.beat};
}
const pitchOf=(s,i)=>s.plan[i].pitch;
function pitchAt(st,t){
  const s=st.s, e=s.plan[st.idx], cur=e.pitch, pn=s.plan[st.nextIdx];
  if(!(pn.glide||pn.pre)||pn.string!==e.string) return cur;
  const g0=st.nextOnset-s.xt; if(t<g0) return cur;
  let u=Math.min(1,(t-g0)/s.xt); u=u*u*(3-2*u);
  return cur+(pn.pitch-cur)*u;
}
// a finger is down when it sounds the note; Stay down keeps the placed fingers behind it on that string down too; on a
// bend every finger behind the bending one pushes with it
// the hand a segment has at a moment: one hand for a drill; a walk has one per frame, the hand of the sounding tone's frame
function handNow(s,st){
  // a song changes grip at its bars: the hand goes to the next one a little ahead of the bar (s.lead)
  if(s.hands&&s.lead&&T.on&&ctx){ const sa=stateAt(ctx.currentTime+s.lead); if(sa.s.hands&&sa.idx>=0) return sa.s.hands[sa.s.plan[sa.idx].frame]; if(sa.s===s&&sa.count) return s.hands[s.plan[0].frame]; }
  return (s.hands&&st&&st.idx>=0)?s.hands[s.plan[st.idx].frame]:s.hand; }
function fingerDown(f,t){
  let st=stateAt(t+LEAD); if(st.s&&st.s.lead) st=stateAt(t+st.s.lead);
  if(st.s&&st.s.liftAt&&!st.count&&st.s.liftAt(st)) return false;   // (Custom) the grip let go where its tones end
  if(st.s&&st.s.chord) return (st.s.chords&&st.idx>=0?st.s.chords[st.s.plan[st.idx].frame]:st.s.chord).has(f);   // a chord: its fingers stay down throughout (a song's, its bar's chord)
  if(st.idx<0) return false;
  const s=st.s, e=s.plan[st.idx], h=handNow(s,st).f[f];
  if(f===e.finger) return true;
  if(!h||h.string!==e.string||f>e.finger) return false;
  if(s.mode==='bend') return true;
  if(s.mode==='slide') return false;
  // playing in position, only the frame's own fingers stay down behind the one sounding: a finger the frame does not
  // use (the middle finger in Re_MiFa) stays up, so what is down always spells the frame
  if(e.frame!==undefined&&!s.plan.some(n=>n.frame===e.frame&&n.string===e.string&&n.finger===f)) return false;
  return s.plant&&h.fret<e.fret;
}
const BEND_PX=16;
/*@COPY:1136-1138*/
let frameHook=null, paintOnly=null, boardLetters=false, boardCells=false;   // boardCells: a page paints the fret spaces itself (the strings lit only where a tone rings)   // boardLetters: g(x) off, the board carries its letters instead of grey paint
// paintOnly: a page may paint only some strings
                                                   // a page's own display, run each frame after the board
let fieldClock=0, pickSy=null, MORPH=null; const ampHold={v:0,t:0}, boost={v:0,key:null}, BOOST=0.3, BOOST_T=0.8;
const shortTo=(a,b)=>((b-a+6)%12+12)%12-6;
function stepField(){
  const now=performance.now(), dt=fieldClock?Math.min(0.1,(now-fieldClock)/1000):0; fieldClock=now;
  const goal=FIELD.on?1:0, was=[FIELD.lit,FIELD.re,FIELD.mx,FIELD.reC,LET.offA,LET.offC,RING.m].join();
  FIELD.lit=reduce?goal:FIELD.lit+(goal-FIELD.lit)*Math.min(1,dt*3.2); if(Math.abs(FIELD.lit-goal)<0.002) FIELD.lit=goal;
  const snap=FIELD.lit<=0.001||reduce, k=Math.min(1,dt*7);
  const oT=LET.off, oC=((7*LET.off)%12+12)%12;
  if(snap){ LET.offA=oT; LET.offC=oC; } else { const a=shortTo(LET.offA,oT), c=shortTo(LET.offC,oC); LET.offA=Math.abs(a)<0.002?oT:LET.offA+a*k; LET.offC=Math.abs(c)<0.002?oC:LET.offC+c*k; }
  const reT=PHI.doPc+2+LET.off, rcT=fifth(reT);
  if(DRAGF&&!snap){ MORPH=null; FIELD.mx=-1; FIELD.re=DRAGF.re+(DRAGF.chain?7:1)*DRAGF.x; FIELD.reC=DRAGF.reC+(DRAGF.chain?1:7)*DRAGF.x; }   // turned by hand: a rotation
  else if(MORPH&&!snap){ const x=Math.min(1,(now-MORPH.t0)/MORPH.dur);   // a morph: straight from the old values to the new, one rate for all
    FIELD.re=reT; FIELD.reC=rcT; FIELD.reA=MORPH.reA; FIELD.reCA=MORPH.reCA; FIELD.mx=x; if(x>=1){ MORPH=null; FIELD.mx=-1; } }
  else{ MORPH=null; FIELD.mx=-1;
    if(snap){ FIELD.re=reT; FIELD.reC=rcT; } else { const d=shortTo(FIELD.re,reT), c=shortTo(FIELD.reC,rcT); FIELD.re=Math.abs(d)<0.002?reT:FIELD.re+d*Math.min(1,dt*5); FIELD.reC=Math.abs(c)<0.002?rcT:FIELD.reC+c*Math.min(1,dt*5); } }
  if(RING.m!==RING.goal){ if(reduce) RING.m=RING.goal; else { RING.t=(RING.t||0)+dt/0.8*(RING.goal>RING.m?1:-1); RING.t=Math.max(0,Math.min(1,RING.t)); RING.m=RING.t*RING.t*(3-2*RING.t); if(Math.abs(RING.m-RING.goal)<1e-4) RING.m=RING.goal; } }
  const now2=[FIELD.lit,FIELD.re,FIELD.mx,FIELD.reC,LET.offA,LET.offC,RING.m].join();
  if(now2!==was||FIELD.lit>0) placeRing(), placeField(), placeGhost();
}
// a segment comes on screen: it becomes the current drill
function showSeg(s){
  T.shown=s; DRILL=s.D; MEANS=s.D.means; LEGATO.ham=s.D.ham; LEGATO.pull=s.D.pull; drill.dir=s.D.dir;
  HAND.f=cloneHand(s.hand).f; HAND.thumb=s.hand.thumb; P=placementsOf({lo:s.D.lo,hi:s.D.hi}).map(q=>({g:q.g,s:q.s,f:q.f}));
  if(s.si>=0) SI=s.si; CUSTOM=s.custom; SEL=null; refresh();
}

/* the sounding tone's name (g(x) on): at each onset it pops up out of the string where the finger stops it, rises through the
   note's time and fades with the string's own decay; when the next tone sounds it lets go quickly. The same name fades up
   and out above the TAB, over the tone, between the high e and the line the ball lands on */
const sylG=el('g',{'pointer-events':'none'},fb), sylTabG=el('g',{'pointer-events':'none'},tab), SYLS=[]; let sylKey=null;
function stepSyl(st,live,plan,fxV,sy,amp){
  const now=performance.now()/1000;
  if(live&&FIELD.lit>0.5){ const key=st.onset.toFixed(4);
    if(key!==sylKey){ sylKey=key; const e=plan[st.idx], pc=pcOf(e.string,e.pitch), name=sylOf(pc);
      SYLS.forEach(o=>{ if(o.cur){ o.cur=false; o.t1=now; } });
      if(name&&e.root===undefined&&(!st.s.chord||e.line===true)){ const t=el('text',{class:'sylPop'},sylG); t.textContent=name; t.style.fill=rgbS(toneColour(pc));   // single tones only: no names rising from a strum's strings
        const nx=tabNotes[st.idx]?+tabNotes[st.idx].num.getAttribute('x'):xBeat(st.ph), tt=el('text',{x:nx,y:((TB.floor+TB.rowY[0])/2+4).toFixed(1),class:'sylTab',opacity:0},sylTabG);
        tt.textContent=e.root!==undefined?'':name; tt.style.fill=t.style.fill;   // a song's bars carry their own names over the TAB
        SYLS.push({t,tt,cur:true,t0:now,dur:Math.max(0.25,st.dur),x:fxV,y0:sy,o:0}); } } }
  else{ sylKey=null; SYLS.forEach(o=>{ if(o.cur){ o.cur=false; o.t1=now; } }); }
  for(let i=SYLS.length-1;i>=0;i--){ const o=SYLS[i], age=now-o.t0;
    if(o.cur) o.o=Math.min(1,age/0.05)*(0.2+0.8*Math.min(1,amp));
    else{ o.o*=Math.exp(-(now-(o.tl||o.t1))/0.12); o.tl=now; }
    if(!o.cur&&o.o<0.02){ o.t.remove(); o.tt.remove(); SYLS.splice(i,1); continue; }
    o.tt.setAttribute('opacity',o.o.toFixed(3));
    const a=Math.min(1,age/0.16), k=reduce?1:(a>=1?1:0.55+0.45*a+0.3*Math.sin(Math.PI*a)), r=Math.min(1,age/o.dur), y=o.y0-6-(reduce?24:46*(1-(1-r)*(1-r)));
    o.t.setAttribute('transform','translate('+o.x.toFixed(1)+' '+y.toFixed(1)+') scale('+k.toFixed(3)+')'); o.t.setAttribute('opacity',o.o.toFixed(3)); }
}
/* THE RING'S LIGHT: in place of the pointer, a cone of light from the centre, faint there, growing through the solfège and
   landing as a spotlight on the chromatic letter — in the tone's colour (g(x) on), grey without it. The TONE's cone fades
   up as the tone sounds and down as it dies, and lets go as the next tone takes over (the tones of a strum fade together).
   The MODE's cone, where a chord symbol names the mode (its root), stays lit until the chord changes, crossfading to the next. */
const CONE=(()=>{
  const defs=el('defs',{},ringSvg), id='cn'+Math.random().toString(36).slice(2,6), C=RG.c, RL=RG.RL, W=0.17;
  const mask=el('mask',{id:id+'m',maskUnits:'userSpaceOnUse',x:0,y:0,width:2*C,height:2*C},defs);
  const gr=el('radialGradient',{id:id+'g',gradientUnits:'userSpaceOnUse',cx:C,cy:C,r:RL+10},defs);
  [[0,0.12],[0.25,0.3],[0.55,0.52],[0.82,0.72],[0.94,0.95],[1,0]].forEach(([o,a])=>el('stop',{offset:o,'stop-color':'#fff','stop-opacity':a},gr));
  el('rect',{x:0,y:0,width:2*C,height:2*C,fill:'url(#'+id+'g)'},mask);
  const soft=el('filter',{id:id+'b',x:'-50%',y:'-50%',width:'200%',height:'200%'},defs); el('feGaussianBlur',{stdDeviation:2.2},soft);
  const spotF=el('filter',{id:id+'s',x:'-100%',y:'-100%',width:'300%',height:'300%'},defs); el('feGaussianBlur',{stdDeviation:5},spotF);
  const beam='M'+C+' '+C+' L'+(C+(RL+8)*Math.sin(W)).toFixed(2)+' '+(C-(RL+8)*Math.cos(W)).toFixed(2)+' A'+(RL+8)+' '+(RL+8)+' 0 0 0 '+(C-(RL+8)*Math.sin(W)).toFixed(2)+' '+(C-(RL+8)*Math.cos(W)).toFixed(2)+' Z';
  // the cones over the field, under the names; the spots under the letters
  const coneL=el('g',{'pointer-events':'none'}), spotL=el('g',{'pointer-events':'none'});
  ringSvg.insertBefore(coneL,valLbls[0]); ringSvg.insertBefore(spotL,rDots[0]);
  function make(){ const g=el('g',{mask:'url(#'+id+'m)',opacity:0},coneL), p=el('path',{d:beam,filter:'url(#'+id+'b)'},g);
    const s=el('circle',{cx:C,cy:C-RL,r:14,filter:'url(#'+id+'s)',opacity:0},spotL); return {g,p,s,o:0,pc:null}; }
  const degOf=pc=>{ const [x,y]=pt(RL,pc); return Math.atan2(x-C,C-y)*180/Math.PI; };
  function draw(k,gain,spotGain){ const dark=bgColour()[0]<128, rgb=rgbS(toneColour(Math.round(k.pc)%12)), tr='rotate('+(degOf(k.pc)+(k.rot||0)).toFixed(2)+' '+C+' '+C+')';
    coneL.style.mixBlendMode=spotL.style.mixBlendMode=dark?'screen':'multiply';
    k.g.setAttribute('transform',tr); k.s.setAttribute('transform',tr); k.p.setAttribute('fill',rgb); k.s.setAttribute('fill',rgb);
    k.g.setAttribute('opacity',(gain*k.o).toFixed(3)); k.s.setAttribute('opacity',(spotGain*k.o).toFixed(3)); }
  const free=[]; const take=()=>free.pop()||make(), drop=k=>{ k.g.setAttribute('opacity',0); k.s.setAttribute('opacity',0); free.push(k); };
  let cur=null, curKey=null, curT=0; const gone=[];
  const modes=[make(),make()]; let mi=0, modeKey=null;
  // g(x) off: the letter a grey spotlight lands on is shown in black over it (a copy of the letter, faded in with the light)
  const inkL=el('g',{'pointer-events':'none'}), inks=rLbls.map(g=>{ const c=g.cloneNode(true); c.removeAttribute('class'); for(const t of c.children){ t.removeAttribute('class'); t.setAttribute('class','rl'); t.style.fill='#000'; t.style.fontWeight='700'; } c.setAttribute('opacity',0); inkL.appendChild(c); return c; });
  ringSvg.appendChild(inkL); const litAt=new Array(12).fill(0);
  const mark=(k,spotGain)=>{ if(k.pc===null) return; const pc=((Math.round(k.pc)%12)+12)%12; litAt[pc]=Math.max(litAt[pc],spotGain*k.o); };
  /* THE SCALE'S LIGHTS (a page may ask, g(x) off): a dim grey spotlight standing on each of the mode's seven letters all the
     time, brightening while its tone sounds and easing back as it ends — in place of the tone's and the mode's own cones */
  const SC=[]; let scSet=null, scOn=null, scGain=0, scRot=0;
  const scale=(set,on,gain,shift)=>{ scSet=set; scOn=on; scGain=gain; scRot=30*(shift||0); if(gain>0.001&&!SC.length) for(let pc=0;pc<12;pc++){ const k=make(); k.pc=pc; k.o=0; k.lv=0; SC.push(k); } };
  let clock=0;
  function step(live,pcF,amp,key,chord,modePc){
    const now=performance.now()/1000, dt=Math.min(0.1,clock?now-clock:0.016); clock=now;
    // the tone
    if(live&&pcF!==null){
      if(key!==curKey){ const strum=chord&&cur&&now-curT<0.09; if(cur){ cur.tau=strum?0.9:0.13; gone.push(cur); } cur=take(); cur.o=0; curKey=key; curT=now; }
      cur.pc=pcF; const want=0.3+0.7*amp; cur.o+=(want-cur.o)*Math.min(1,reduce?1:dt/0.035); }
    else if(cur){ cur.tau=0.2; gone.push(cur); cur=null; curKey=null; }
    const ng=1-scGain;                                                  // (the scale's lights, where they stand, in their place)
    for(let i=gone.length-1;i>=0;i--){ const k=gone[i]; k.o*=Math.exp(-dt/k.tau); if(k.o<0.01){ drop(k); gone.splice(i,1); } else draw(k,0.62*ng,0.95*ng); }
    if(cur) draw(cur,0.62*ng,0.95*ng);
    // the mode
    if(modePc!==modeKey){ if(modePc!==null){ mi=1-mi; modes[mi].pc=modePc; } modeKey=modePc; }
    modes.forEach((k,i)=>{ const on=i===mi&&modeKey!==null; k.o+=((on?1:0)-k.o)*Math.min(1,reduce?1:dt/0.25); if(k.o<0.003&&!on) k.o=0; if(k.pc===null) return; draw(k,0.4*ng,0.7*ng); });
    SC.forEach(k=>{ const on=!!scOn&&scOn.has(k.pc), inS=!!scSet&&scSet.has(k.pc); if(on) k.lv=1; else k.lv*=Math.exp(-dt/0.35);
      const want=inS?scGain*(0.24+0.76*k.lv):0; k.rot=scRot; k.o+=(want-k.o)*Math.min(1,reduce?1:dt/0.08); if(k.o<0.003&&!want){ k.o=0; k.g.setAttribute('opacity',0); k.s.setAttribute('opacity',0); return; } draw(k,0.62,0.95); });
    litAt.fill(0); gone.forEach(k=>mark(k,0.95*ng)); if(cur) mark(cur,0.95*ng); modes.forEach(k=>mark(k,0.7*ng)); if(Math.abs(scRot)<0.3) SC.forEach(k=>{ const pc=k.pc; litAt[pc]=Math.max(litAt[pc],0.95*k.lv*scGain*(scSet&&scSet.has(pc)?1:0)); });
    inks.forEach((c,pc)=>{ c.setAttribute('transform',rLbls[pc].getAttribute('transform')||''); c.setAttribute('opacity',Math.min(1,litAt[pc]/0.55).toFixed(3)); }); }   // (in colour or grey, the light is bright: a dark letter reads on it)
  return {step, scale, get mode(){ return modeKey!==null; }};
})();
hand.style.display='none';                                              // the cone takes the pointer's place
function frame(){
  stepField();
  const t=(T.on&&ctx)?ctx.currentTime:null, st=t!==null?stateAt(t):null, s=st?st.s:null;
  if(s&&T.shown!==s) showSeg(s);
  const live=!!(st&&!st.count), plan=s?s.plan:(DRILL?DRILL.plan:null), H=s?handNow(s,st):HAND, mode=s?s.mode:(DRILL?DRILL.means:'pick');
  const strI=live?plan[st.idx].string:(plan?plan[0].string:H.f[1].string), sy=FB.strY[strI];
  const p=live?pitchAt(st,t):null;
  const shift=(live&&mode==='slide')?p-plan[0].pitch:0;               // the whole hand moves with a slide; the thumb does not
  const bendAmt=(live&&mode==='bend')?Math.max(0,p-s.D.lo.f):0, bendDy=bendAmt*BEND_PX*(strI<NSTR/2?1:-1);
  const fnow=performance.now(), fdt=Math.min(0.1,(fnow-(frame.lastT||fnow))/1000); frame.lastT=fnow;
  const ydt=fdt||0.016;
  const cand=(!T.on&&!DRILL)?CAND:null;
  for(const F of fingers){
    const h=H.f[F.f], fsy=FB.strY[h.string];
    const rest=t===null&&P.some(q=>q.g===F.f);                          // stopped: a placed finger rests on its string
    const down=(t!==null&&fingerDown(F.f,t))||rest; F.isDown=down; F.c.dataset.down=down?1:0;   // the finger's own state, not read off where it happens to be
    const onBent=live&&mode==='bend'&&h.string===strI&&F.f<=s.D.lo.g;
    const target=down?fsy+(onBent?bendDy*(tipX(h.fret)-FB.nut)/Math.max(1,tipX(s.D.lo.f)-FB.nut):0)-FR*PRESS_H:hoverY(fsy);
    const lm=(live&&!reduce)?legatoMotion(F,st,t,fsy):null; let sq=0;
    const tgt=(lm&&lm.target!==undefined&&!down)?lm.target:target;
    if(reduce||F.drag) F.y=tgt;
    else if(lm&&lm.y!==undefined){ F.y=lm.y; F.vy=0; sq=lm.sq||0; }
    else if(down){ F.y+=(tgt-F.y)*0.5; if(Math.abs(F.y-tgt)<0.3) F.y=tgt; F.vy=0; }
    else { if(lm&&lm.kick&&F.kick!==lm.kick){ F.kick=lm.kick; F.vy=-FLICK_V; }
      for(let n=Math.ceil(ydt/0.008),k=0;k<n;k++){ const h=ydt/n; F.vy=(F.vy||0)+(SPR_K*(tgt-F.y)-SPR_C*(F.vy||0))*h; F.y+=F.vy*h; } }   // in small steps: a slow frame cannot throw the finger off
    const tx=tipXf(h.fret+shift);
    F.x=(reduce||F.x===undefined||F.drag||(live&&mode==='slide'))?tx:F.x+(tx-F.x)*Math.min(1,fdt/0.07);
    const hov=hoverY(fsy), pc=fsy-FR*PRESS_H, kk0=Math.max(0,Math.min(1,(F.y-hov)/(pc-hov))), kk=kk0*kk0*(3-2*kk0)+sq;
    F.c.setAttribute('d',fingerPath(F.x,F.y,kk)); F.t.setAttribute('x',F.x); F.t.setAttribute('y',(F.y+1.5*kk).toFixed(2));
    F.guide.setAttribute('x1',F.x); F.guide.setAttribute('x2',F.x); F.guide.setAttribute('y1',(F.y+FR+1).toFixed(1)); F.guide.setAttribute('y2',(fsy-3).toFixed(1));
    const pressed=kk0>0.5;
    F.c.classList.toggle('down',pressed); F.t.classList.toggle('down',pressed);
    F.guide.setAttribute('visibility',down?'hidden':'visible');
    F.c.classList.toggle('cand',!!cand&&cand.fingers.has(F.f)&&!pressed);
    F.c.classList.toggle('sel',!!SEL&&SEL.finger===F.f);
  }
  placeThumb(shift,H);
  paintBoard(H,shift,fdt);
  // the sounding tone's level, held through the pick's catch; slides, bends and legato arrivals re-light it a little
  const sstr=(live&&s.strs)?s.strs[strI]:null, ampNow=sstr?Math.min(1,ampOf(sstr.snap)/0.3):0, now=performance.now()/1000, adt=Math.min(0.1,now-(ampHold.t||now));
  ampHold.t=now; ampHold.v=live?Math.max(ampNow,ampHold.v*Math.exp(-adt/0.15)):0;
  if(live&&(mode!=='pick'||s.D.ham||s.D.pull)){ const key=st.onset.toFixed(4); if(key!==boost.key){ if(boost.key!==null&&!s.plan[st.idx].pick) boost.v=Math.min(1,boost.v+BOOST); boost.key=key; } }
  else { boost.key=null; boost.v=0; }
  boost.v*=Math.exp(-adt/BOOST_T); const amp=Math.min(1,ampHold.v+boost.v);
  // STRUMMING, the hand a pendulum: through a run of strums the pick swings down on every eighth's downbeat and up on every
  // off-beat, struck or not — a missed stroke (a down on 3 between two ups) still traced, passing over the strings — so
  // consecutive strokes in one direction read, and are, one continuous motion. Each swing crosses the strings at the strum's
  // own speed (each string as it sounds), then carries on out past the last and turns back for the next.
  PEND_GHOST=0; const pend=live&&!reduce?pendY(s,st.ph):null;
  if(pend!==null) pickSy=pend; else
  // where the pick heads: the tone a little ahead — but a strum is swept, string by string, from its first: coming up on one, the
  // pick goes to the string it starts on (looking ahead it would see only the strum's far end, and skip the strings before);
  // in it, to the string after the one just struck
  { const sa=(t!==null&&st&&!st.done)?stateAt(t+catchT()+0.14):null; let si=sa&&sa.idx>=0?sa.idx:-1;
    if(si>=0){ const pl=sa.s.plan, q=pl[si]; if(q.t!==undefined){ let f0=si; while(f0>0&&pl[f0-1].t===q.t&&pl[f0-1].frame===q.frame&&pl[f0-1].pick) f0--;
      if(f0<si){ const sn=stateAt(t+catchT()); si=(sn&&sn.s===sa.s&&sn.idx>=f0&&sn.idx<=si)?Math.min(si,sn.idx+1):f0; } } }
    const ts=FB.strY[si>=0?sa.s.plan[si].string:strI];
    pickSy=(pickSy===null||reduce)?ts:pickSy+(ts-pickSy)*Math.min(1,fdt/0.05); }
  // (a chord strummed: the pick its root's colour, as the ball; a ghost stroke, grey)
  const held=placePick(st,pickSy,t,amp*(1-PEND_GHOST),live?toneColour(plan[st.idx].root!==undefined?plan[st.idx].root:plan[st.idx].ballRoot!==undefined?plan[st.idx].ballRoot:pcOf(strI,p)):null);   // a song's pick: its bar's root colour
  if(PEND_GHOST>0){ const m=/(\d+),\s*(\d+),\s*(\d+)/.exec(pickBody.style.fill||''), r=pickRest(); if(m) pickBody.style.fill='rgb('+[1,2,3].map((k,i)=>Math.round(+m[k]+(r[i]-m[k])*PEND_GHOST)).join(',')+')'; }   // (the ghost grey through its stroke: no bloom into the next until it is nearly there)
  const fxV=live?((mode==='bend'&&p>s.D.lo.f+1e-3)?tipX(s.D.lo.f):(plan[st.idx].fret===0&&mode!=='slide'?FB.nut:tipXf(p))):0;
  stepSyl(st,live,plan,fxV,sy+bendDy,amp); if(frameHook) frameHook(st,live,plan,fdt);
  const vibOn=live&&held===null&&drawVib(sstr&&sstr.snap,fxV,sy+bendDy,BRIDGE_X,sy,t);
  const glow=vibOn?amp:0, inkRGB=inkColour(), glowRGB=live?toneColour(pcOf(strI,p)):inkRGB;
  const tint=a=>'rgb('+inkRGB.map((v,i)=>Math.round(v+(glowRGB[i]-v)*a)).join(',')+')';
  blurEl.style.fill=tint(glow); strobeEl.style.stroke=tint(glow);
  const holder=live?plan[st.idx].finger:0;
  fingers.forEach(F=>{ F.c.style.fill=(F.f===holder&&glow>0.01&&F.c.classList.contains('down'))?tint(glow):''; });
  if(!vibOn){ blurEl.setAttribute('visibility','hidden'); strobeEl.setAttribute('visibility','hidden'); }
  if(lastStr>=0&&lastStr!==strI){ strLines[lastStr].setAttribute('d',strPath(FB.strY[lastStr],0,0)); strLines[lastStr].classList.add('strDim'); }
  strLines[strI].classList.add('strDim');                              // the stopped length stays as dim as the rest: only the ringing length lights
  const fxH=live?fxV:FB.nut;
  if(held!==null&&Math.abs(pickSy-sy)<1) strLines[strI].setAttribute('d','M'+FB.x0+' '+sy+' L'+FB.nut+' '+sy+' L'+fxH.toFixed(1)+' '+(sy+bendDy).toFixed(1)+' L'+PICK_X+' '+held.toFixed(1)+' L'+BRIDGE_X+' '+sy);
  else strLines[strI].setAttribute('d',vibOn?'M'+FB.x0+' '+sy+' L'+FB.nut+' '+sy+' L'+fxV.toFixed(1)+' '+(sy+bendDy).toFixed(1):strPath(sy,fxH,bendDy));
  lastStr=strI;
  ringOthers(live,s,strI,t);
  if(live){
    ringLine.setAttribute('x1',fxV); ringLine.setAttribute('y1',sy+bendDy); ringLine.setAttribute('y2',sy); ringLine.setAttribute('visibility',vibOn?'hidden':'visible');
    tabNotes.forEach((o,i)=>{ const on=i===st.idx; o.bar.classList.toggle('on',on); o.num.classList.toggle('on',on); });
    const J0=st.s.jumpGap?st.s.jumpGap():0, x=xBeat(st.ph+(J0&&st.ph>LOOP-1?(st.ph-(LOOP-1))*J0:0)); head.setAttribute('x1',x); head.setAttribute('x2',x); followHead(x); head.setAttribute('visibility','visible');
    countLbl.setAttribute('visibility','hidden');
    { const r=plan[st.idx].root; if(r!==undefined) setHand(r,r); else setHand(pcOf(strI,p),pcOf(strI,pitchOf(s,st.idx))); }   // a song's ring shows its bar's root, not each tone
    { const r=plan[st.idx].root, mr=typeof CHORDS!=='undefined'&&CHORDS&&CHORDS.rootNow?CHORDS.rootNow():null;
      CONE.step(r===undefined,r===undefined?pcOf(strI,p):null,amp,st.onset.toFixed(4)+':'+st.idx,!!s.chord,r!==undefined?r:mr); }
  }else{
    ringLine.setAttribute('visibility','hidden');
    tabNotes.forEach(o=>{ o.bar.classList.remove('on'); o.num.classList.remove('on'); });
    if(st&&!st.done){ head.setAttribute('x1',xBeat(0)); head.setAttribute('x2',xBeat(0)); head.setAttribute('visibility','visible'); countLbl.setAttribute('visibility','visible'); followHead(xBeat(0)); }   // the count-in: the TAB back at its start, where the ball is
    else{ head.setAttribute('visibility','hidden'); countLbl.setAttribute('visibility','hidden'); }
    { const r=typeof CHORDS!=='undefined'&&CHORDS&&CHORDS.rootNow?CHORDS.rootNow():null; if(r!==null) setHand(r,r); else setHand(null,-1); CONE.step(false,null,0,null,false,r); }
  }
  let bx=xBeat(0), u=0, hb=1;
  if(st&&!st.done){ if(st.count) u=PULSE?((((t-st.s.loopStart)/T.beat/PULSE.u)%1)+1)%1:Math.max(0,(t-st.beatT)/T.beat)%1; else { u=PULSE?(st.ph/PULSE.u)%1:st.ph%1;   // a pulse of u beats: the ball lands on each
    // a song's last bar before its repeat: on the last beat the ball leaps the repeat sign and lands in the bar after it
    const J=st.s.jumpGap?st.s.jumpGap():0, last=st.ph>LOOP-1; bx=xBeat(st.ph+(J&&last?(st.ph-(LOOP-1))*J:0)); if(J&&last) hb=1.2; } }
  const by=TB.floor-TB.ballR-(reduce?0:TB.ballH*hb*4*u*(1-u));
  ball.setAttribute('cx',bx.toFixed(1)); ball.setAttribute('cy',by.toFixed(1));
  let b1o=1, b2o=0, b2x=xBeat(0), b2u=0.5;
  if(st&&!st.done&&!st.count&&!reduce){
    const half=LOOP-0.5, intoLoop=(t-st.s.loopStart)/T.beat>=LOOP;
    if(st.ph>=half&&(!st.s.loopsBack||st.s.loopsBack())){ const k=(st.ph-half)/0.5; b2o=Math.min(1,k/0.15); b2x=xBeat(st.ph-LOOP); b2u=st.ph%1; b1o=1-0.6*k; }
    else if(st.ph<0.3&&intoLoop){ b2o=0.4*(1-st.ph/0.3); b2x=xBeat(LOOP+st.ph); b2u=st.ph; }
  }
  ball.setAttribute('opacity',(DRILL||T.on?b1o:0.25).toFixed(3)); ball2.setAttribute('opacity',b2o.toFixed(3));
  if(b2o>0){ ball2.setAttribute('cx',b2x.toFixed(1)); ball2.setAttribute('cy',(TB.floor-TB.ballR-TB.ballH*4*b2u*(1-b2u)).toFixed(1)); }
  paintTabField(st,live,p,amp);
  requestAnimationFrame(frame);
}
// the board: paint, glow, spotlight; the pulsing marks
let INST=new Set();
function paintBoard(H,shift,dt){
  const L=FIELD.lit, ink=rgbS(inkColour()), k=Math.min(1,(dt||0.016)*9), near=new Set();
  for(let j=1;j<=4;j++){ const h=H.f[j], f0=Math.round(h.fret+shift); for(let ds=-1;ds<=1;ds++) for(let df=-1;df<=1;df++){ const s=h.string+ds, f=f0+df; if(s>=0&&s<NSTR&&f>=0&&f<=FMAX) near.add(s*(FMAX+1)+f); } }
  CELLS.forEach((c,i)=>{
    c.lv=1;                                                           // the whole board at the lit level
    const pc=pcOf(c.s,c.f), anti=sylOf(pc)===null, show=L>0.001&&!(diatonic&&anti)&&(!paintOnly||paintOnly.has(c.s));
    if(show&&(!boardCells||INST.has(i))){ const col=rgbS(valRGB(pc)); c.paint.setAttribute('stroke',col); c.paint.setAttribute('opacity',(L*(0.28+0.72*c.lv)).toFixed(3)); }
    else if(c.lv>0.003&&!boardLetters){ c.paint.setAttribute('stroke',ink); c.paint.setAttribute('opacity',((1-L)*0.8*c.lv).toFixed(3)); }
    else c.paint.setAttribute('opacity',0);
    const g=L>0.001&&INST.has(i)?L*0.55:0;
    if(g){ c.glow.setAttribute('stroke',rgbS(valRGB(pc))); }
    c.glow.setAttribute('opacity',g.toFixed(3));
  });
}
requestAnimationFrame(frame);
