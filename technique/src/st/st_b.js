function canPair(g,s,f){ const p={g,s,f}; P.push(p); const ok=COMP.some(c=>c.means===MEANS&&consistent(c)); P.pop(); return ok; }
// the drill a completion makes: each tone with its string, fret, sounding pitch (fret + push) and finger
function makeDrill(c){
  const D={r:c.r,lo:Object.assign({},c.lo),hi:Object.assign({},c.hi),means:c.means,ham:false,pull:false};
  if(D.means!=='pick'||D.lo.s!==D.hi.s){ D.ham=false; D.pull=false; } else { D.ham=LEGATO.ham; D.pull=LEGATO.pull; }
  return D;
}
const LEGATO={ham:false,pull:false};
// the notes in playing order: the two tones alternating through the figure (Up: the lower first; Down: the upper first)
function planOf(D,dir){
  const first=dir==='up'?D.lo:D.hi, second=dir==='up'?D.hi:D.lo, mid=x=>midiOf(x.s,x.f)+(x.push||0);
  return FIG.map((e,i)=>{ const x=i%2?second:first, q=i%2?first:second;
    const n={string:x.s,fret:x.f,pitch:x.f+(x.push||0),push:x.push||0,finger:x.g,pick:true,glide:false,pre:false,kind:'pick',hi:x===D.hi};
    if(D.means==='slide'||D.means==='bend'){
      if(!BAR_START(i)){ n.pick=false; n.glide=true; n.kind=D.means==='slide'?'slide':(x===D.hi?'bend':'release'); }
      else if(D.means==='bend'&&x===D.hi){ n.pre=true; n.kind='pre'; } }
    else if(x.s===q.s){ const up=mid(x)>mid(q); if(up&&D.ham){ n.pick=false; n.kind='ham'; } else if(!up&&D.pull){ n.pick=false; n.kind='pull'; } }
    return n; });
}
// the default fingering of a place, for a means
function fingeringOf(r,means){
  const L=r.lo, H=r.hi;
  if(means==='slide') return {lo:{s:L.s,f:L.f,g:1},hi:{s:H.s,f:H.f,g:1}};
  if(means==='bend'){ const g=Math.min(3,L.f); return {lo:{s:L.s,f:L.f,g},hi:{s:L.s,f:L.f,g,push:1}}; }
  if(!L.f) return {lo:{s:L.s,f:0,g:0},hi:{s:H.s,f:H.f,g:1}};
  if(!H.f) return {lo:{s:L.s,f:L.f,g:1},hi:{s:H.s,f:0,g:0}};
  if(L.s===H.s) return {lo:{s:L.s,f:L.f,g:1},hi:{s:H.s,f:H.f,g:2}};
  const gap=Math.abs(L.f-H.f), lowLo=L.f<=H.f, other=Math.min(4,1+gap);
  return lowLo?{lo:{s:L.s,f:L.f,g:1},hi:{s:H.s,f:H.f,g:other}}:{lo:{s:L.s,f:L.f,g:other},hi:{s:H.s,f:H.f,g:1}};
}

/* ---------- the sampling Advance walks ----------
   Not exhaustive: one default fingering per place, chosen to show the variety a player should know. Its backbone is the
   unison family — the same two pitches in every place they live. Ordered by lean, each step moves exactly one tone to the
   next string, so the cross-string place is the half-way lean. One rule for every structure:
   1. home: the family's place on one string nearest the middle of the neck, picked;
   2. lean back one tone at a time to the far end (at an open string: the hammer-on from it and pull-off to it);
   3. home again for the one-string techniques: hammer-on and pull-off, slide, bend, prebend and release;
   4. lean forward to the family's other end;
   5. the other (octave) families, each leaning back. */
function sampling(){
  const fams=new Map();
  instances().forEach(r=>{ const m=midiOf(r.lo.s,r.lo.f); if(!fams.has(m)) fams.set(m,[]); fams.get(m).push(r); });
  const key=r=>r.lo.s+r.hi.s;                                           // larger: toward the low strings, leaning forward
  const list=[...fams.keys()].sort((a,b)=>a-b).map(m=>fams.get(m).sort((a,b)=>key(b)-key(a)));
  let home=null, best=1e9;
  const heard=r=>relOf(pcOf(r.lo.s,r.lo.f))===HEAR[hearing].lo;      // home is always a place of the chosen hearing, field on or off
  list.forEach((F,fi)=>F.forEach((r,ri)=>{ if(r.lo.s!==r.hi.s||!heard(r)) return; const d=Math.pow(r.lo.s-(NSTR-1)/2,2)+0.25*Math.pow((r.lo.f+r.hi.f)/2-6,2); if(d<best){ best=d; home={fi,ri}; } }));
  const S=[], add=(r,means,o)=>S.push(Object.assign({r,means,dir:'up',ham:false,pull:false},o||{}));
  if(!home) return S;
  const F=list[home.fi], h=F[home.ri];
  add(h,'pick');
  for(let i=home.ri+1;i<F.length;i++){ const r=F[i]; add(r,'pick'); if(r.lo.s===r.hi.s&&(r.lo.f===0||r.hi.f===0)) add(r,'pick',{ham:true,pull:true}); }
  add(h,'pick',{ham:true,pull:true});
  if(h.lo.f>=1){ add(h,'slide'); add(h,'bend'); add(h,'bend',{dir:'down'}); }
  for(let i=home.ri-1;i>=0;i--) add(F[i],'pick');
  list.forEach((G,gi)=>{ if(gi!==home.fi) G.forEach(r=>add(r,'pick')); });
  return S;
}
// a sample becomes the current drill: its pairings, means, direction, the hand set around them
function drillOfSample(x){
  const fg=fingeringOf(x.r,x.means), D={r:x.r,lo:fg.lo,hi:fg.hi,means:x.means,ham:!!x.ham,pull:!!x.pull,dir:x.dir};
  return D;
}
function applyDrill(D,custom){
  DRILL=D; drill.dir=D.dir||drill.dir; MEANS=D.means; LEGATO.ham=D.ham; LEGATO.pull=D.pull;
  P=placementsOf({lo:D.lo,hi:D.hi}).map(q=>({g:q.g,s:q.s,f:q.f})); if(drill.dir==='down') P.reverse();   // the leading tone first
  relayout();
  DRILL.plan=planOf(DRILL,drill.dir); CUSTOM=!!custom; SEL=null;
}
function applySample(i){ if(!SAMPLES.length) return; SI=((i%SAMPLES.length)+SAMPLES.length)%SAMPLES.length; applyDrill(drillOfSample(SAMPLES[SI]),false); refresh(); }
// after any change to the pairings: is the structure complete?
function settle(){
  COMP=completions();
  if(DRILL&&!CUSTOM){ DRILL.plan=planOf(DRILL,drill.dir); return; }
  const C=COMP.filter(c=>c.means===MEANS&&consistent(c));
  let done=C.find(realized);
  if(!done&&MEANS!=='pick'&&C.length===1) done=C[0];                    // a slide or bend from the anchored finger: the second tone follows
  if(done){ const D=makeDrill(done); D.dir=drill.dir;
    if(D.means==='bend'){ P=[{g:D.lo.g,s:D.lo.s,f:D.lo.f}]; relayout(); }
    else{ const f0=P[0]; D.dir=(f0&&samePl(f0,D.hi)&&!samePl(f0,D.lo))?'down':'up'; drill.dir=D.dir; }   // the tone placed first leads
    DRILL=D; DRILL.plan=planOf(DRILL,drill.dir); }
  else DRILL=null;
}
