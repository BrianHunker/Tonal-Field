/* CHORDS (explorer). Choose a root and a quality; the chord's shapes are found on the strings (st_chordgen.js), in order up
   the neck. Prev | Next step through them; each is offered only if the hand's bones can hold it — its span rules, then
   the mechanism reaching every note — and the hand grips it, keeping the chord's open strings clear. Play sounds it as a
   two-bar figure through the drill pages' own engine: the pick, the ringing string, the TAB and its ball. */
let FBROT=null;                                                  // the turned board, for the zoom (st_zoom.js)
const CHORDS=BOOK.chords?(()=>{
  // pitch classes here count from A (as the strings do): 0 A … 3 C … 11 A♭
  const ROOTS=[[3,'C'],[4,'C♯','D♭'],[5,'D'],[6,'D♯','E♭'],[7,'E'],[8,'F'],[9,'F♯','G♭'],[10,'G'],[11,'G♯','A♭'],[0,'A'],[1,'A♯','B♭'],[2,'B']];
  const NAME={3:'C',4:'D♭',5:'D',6:'E♭',7:'E',8:'F',9:'F♯',10:'G',11:'A♭',0:'A',1:'B♭',2:'B'};
  const QUAL=[['','maj',[0,4,7]],['m','m',[0,3,7]],['7','7',[0,4,7,10]],['maj7','maj7',[0,4,7,11]],['m7','m7',[0,3,7,10]],['m7♭5','m7♭5',[0,3,6,10]],
    ['dim','dim',[0,3,6]],['dim7','dim7',[0,3,6,9]],['aug','aug',[0,4,8]],['sus2','sus2',[0,2,7]],['sus4','sus4',[0,5,7]],['6','6',[0,4,7,9]],['m6','m6',[0,3,7,9]]];
  const pcs=STRINGS.map(s=>s.pc), open=STRINGS.map((s,i)=>Math.round(openMidi(i)));   // whole semitones: the same pitch on two strings is the same
  let root=3, qi=0, shapes=[], idx=0, started=false;
  const fits=pl=>{ for(let i=0;i<pl.length;i++) for(let j=i+1;j<pl.length;j++) if(!fingersFit(pl[i].g,pl[i].f,pl[i].s,pl[j].g,pl[j].f,pl[j].s)) return false; return true; };
  // can the hand hold it? decided once per shape, the first time it is reached
  function holds(sh){
    if(sh.ok!==undefined) return sh.ok;
    if(!fits(sh.pl)) return sh.ok=false;
    HANDLAB.setOpen(sh.notes.filter(n=>n.f===0).map(n=>n.s));
    sh.err=HANDLAB.reach(sh.pl); return sh.ok=sh.err<=3; }
  function grip(sh){
    P=sh.pl.map(q=>Object.assign({},q)); const H=handFor(P); HAND.f=H.f; HAND.thumb=H.thumb; SEL=null;
    HANDLAB.setOpen(sh.notes.filter(n=>n.f===0).map(n=>n.s)); HANDLAB.resettle(); figure(); marks(sh); }
  // the next shape the hand can hold, from i, stepping by dir (wrapping round once)
  function show(i,dir){
    if(!started){ loadPage(0); started=true;
      // the Ring opens on D as Re, Re at 12 o'clock; from then on the listener turns it
      let s0=0, f0=99; for(let s=0;s<NSTR;s++) for(let f=0;f<12;f++) if(pcOf(s,f)===5&&f<f0){ s0=s; f0=f; }
      pagePhi({anchor:{s:s0,f:f0,deg:'re'},top:'re'}); }
    if(!shapes.length){ label(); return; }
    const N=shapes.length; dir=dir||1;
    for(let k=0;k<N;k++){ const j=(((i+dir*k)%N)+N)%N; if(holds(shapes[j])){ idx=SI=j; grip(shapes[j]); label(); return; } }
    P=[]; refresh(); label(); marks(null); }
  function choose(){ shapes=chordShapes(root,QUAL[qi][2],pcs,{open}); idx=0; show(0,1); }
  // PLAY: the shape as a two-bar figure, looping at the Tempo with the Click until Stop. Strum: a whole-note strum each bar,
  // the pick sweeping the strings in one stroke — a downstroke when the pitches rise, an upstroke when they fall. Arpeggio:
  // the shape's notes one a beat, every one a downstroke whatever the pitch's direction, each left to ring. Order: Up (low to
  // high), Down (high to low), or Alternating (strums: up one bar, down the next; arpeggio: up and back down, the ends not
  // repeated). A change of shape, articulation or order while playing comes in at the end of the two bars.
  const ART={mode:'strum',dir:'up'}, STRUM=0.022, BARS=2;
  const lowHigh=sh=>sh.notes.slice().sort((a,b)=>b.s-a.s);
  function fingerOf(n){ if(!n.f) return 0; const q=P.find(p=>p.s===n.s&&p.f===n.f); if(q) return q.g;
    const bar=P.find(p=>p.barre&&n.s<=p.s&&n.f===p.f); return bar?bar.g:0; }
  function chordDrill(sh){
    const plan=[], fig=[], ups=new Set(), note=n=>({string:n.s,fret:n.f,pitch:n.f,push:0,finger:fingerOf(n),frame:0,pick:true,glide:false,pre:false,kind:'pick',hi:false});
    if(ART.mode==='strum'){ const d=STRUM*drill.bpm/60;
      for(let b=0;b<BARS;b++){ const rise=ART.dir==='up'||(ART.dir==='alt'&&b%2===0), o=rise?lowHigh(sh):lowHigh(sh).reverse();
        if(!rise) ups.add(8*b);                                           // falling pitches: the stroke is up
        o.forEach((n,k)=>{ plan.push(note(n)); fig.push({s:4*b+k*d,d:k<o.length-1?d:4-k*d}); }); } }
    else { const up=lowHigh(sh), dn=up.slice().reverse(), q=ART.dir==='up'?up:(ART.dir==='down'?dn:up.concat(dn.slice(1,-1)));
      for(let b=0;b<4*BARS;b++){ plan.push(note(q[b%q.length])); fig.push({s:b,d:1}); } }
    const H=handFor(P), D={chord:true,walk:true,art:ART.mode,dir:'up',means:'pick',ham:false,pull:false,plan,bars:BARS,
      frames:[{string:sh.notes[0].s,tones:[],pl:P.map(q=>Object.assign({},q)),hand:H}],
      lo:{s:plan[0].string,f:plan[0].fret,g:plan[0].finger},hi:{s:plan[1%plan.length].string,f:plan[1%plan.length].fret,g:plan[1%plan.length].finger}};
    return {D,fig,ups,hand:H,chord:new Set(P.map(q=>q.g))}; }
  const useFig=C=>{ FIG=C.fig; LOOP=4*BARS; BAR_START=i=>FIG[i]&&Number.isInteger(FIG[i].s)&&FIG[i].s%4===0; };
  // the figure for the shape as it stands: shown at once when stopped; while playing, taken up at the loop's end
  function figure(){
    const sh=shapes[idx]; if(!sh||!sh.ok){ DRILL=null; refresh(); return; }
    const C=chordDrill(sh);
    if(T.on&&T.segs.length){ const s=T.segs[T.segs.length-1];
      s.swap=()=>{ useFig(C); s.D=C.D; s.plan=C.D.plan; s.hand=cloneHand(C.hand); s.chord=C.chord; s.upAt=n=>C.ups.has(n)||(n%2===1); s.picks=null; delete s.swap; T.shown=null; };
      return; }
    useFig(C); DRILL=C.D; layoutTab(BARS); refresh(); }
  function run(){
    const sh=shapes[idx]; if(!sh||!sh.ok) return;
    ensureCtx().then(()=>{
      if(T.on) stopAll();
      T.beat=60/drill.bpm; const C=chordDrill(sh); useFig(C); DRILL=C.D;
      const s={D:C.D,pass:0,plan:C.D.plan,hand:cloneHand(C.hand),si:0,custom:false,mode:'pick',strs:{},plant:true,xt:0,chord:C.chord,upAt:n=>C.ups.has(n)||(n%2===1)};
      placeSeg(s,ctx.currentTime+0.1);
      T.segs=[s]; T.si=0; T.nextI=0; T.nextCycle=0; T.nextBeat=-COUNT; T.live=[]; T.shown=null; T.on=true;
      tick(); T.timer=setInterval(tick,25);
      playBtn.textContent='Stop'; playBtn.classList.add('on'); }); }
  // the chord in TAB: a strum's numbers stacked on its beat, an arrow beside them in the order they sound, the stroke marked
  // above (⊓ down, V up); an arpeggio's numbers one a beat, each with its stem and a downstroke mark
  function tab(D){
    const plan=D.plan, stemTop=TB.rowY[NSTR-1]+10, stemLong=26, markY=TB.rowY[0]-17, mark=(x,up)=>{ const t=el('text',{x,y:markY,class:'bendLbl'},noteG); t.textContent=up?'V':'⊓'; };
    if(D.art==='strum'){ for(let b=0;b<BARS;b++){ const ix=plan.map((n,i)=>i).filter(i=>Math.floor(FIG[i].s+1e-6)===4*b), x=xBeat(4*b);
        ix.forEach(i=>{ const n=plan[i], o=numberAt(x,TB.rowY[n.string],String(n.fret)); tabNotes[i]=o; });
        const a=plan[ix[0]].string, z=plan[ix[ix.length-1]].string, ya=TB.rowY[a], yz=TB.rowY[z], ax=x+16, dir=yz<ya?-1:1;
        el('line',{x1:ax,y1:ya,x2:ax,y2:yz-dir*6,class:'inkS','stroke-width':1.3},noteG); arrowHead(ax,yz,dir);
        mark(x,yz>ya); } }
    else plan.forEach((n,i)=>{ const x=xBeat(FIG[i].s); tabNotes[i]=numberAt(x,TB.rowY[n.string],String(n.fret));
      el('line',{x1:x,y1:stemTop,x2:x,y2:stemTop+stemLong,class:'inkS','stroke-width':1.3},noteG); mark(x,false); }); }
  // the panel: the chord's name and chart above, the roots and qualities below
  const panel=document.createElement('div'); panel.className='gripPanel chordPanel';
  panel.innerHTML='<div class="chordHead"><span class="chordName" id="chordName"></span><span class="chordChart" id="chordChart"></span><span class="chordCt" id="chordCt"></span></div>'
    +'<div class="gripRow" id="chordRoots"></div><div class="gripRow" id="chordQuals"></div>'
    +'<div class="gripRow"><span class="gripGrp">Play</span><span class="cseg" id="artSel"><button type="button" data-a="strum">Strum</button><button type="button" data-a="arp">Arpeggio</button></span>'
    +'<span class="cseg" id="dirSel"><button type="button" data-d="up">Up</button><button type="button" data-d="down">Down</button><button type="button" data-d="alt">Alternating</button></span>'
    +'<button type="button" class="pill" id="rotBtn" data-zoom aria-pressed="false" title="Turn the board a quarter, as chord diagrams are drawn">90°</button></div>';
  fb.parentElement.after(panel);
  const rootsEl=panel.querySelector('#chordRoots'), qualsEl=panel.querySelector('#chordQuals');
  ROOTS.forEach(([pc,a,b])=>{ const e=document.createElement('button'); e.type='button'; e.className='gripBtn rootBtn'; e.innerHTML=b?a+'<span class="alt">'+b+'</span>':a; e.dataset.pc=pc;
    e.addEventListener('click',()=>{ root=pc; mark(); choose(); }); rootsEl.appendChild(e); });
  QUAL.forEach(([sfx,lbl],i)=>{ const e=document.createElement('button'); e.type='button'; e.className='gripBtn'; e.textContent=lbl; e.dataset.q=i;
    e.addEventListener('click',()=>{ qi=i; mark(); choose(); }); qualsEl.appendChild(e); });
  const artEl=panel.querySelector('#artSel'), dirEl=panel.querySelector('#dirSel');
  artEl.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; ART.mode=b.dataset.a; markPlay(); figure(); });
  dirEl.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; ART.dir=b.dataset.d; markPlay(); figure(); });
  function markPlay(){ artEl.querySelectorAll('button').forEach(e=>e.classList.toggle('on',e.dataset.a===ART.mode)); dirEl.querySelectorAll('button').forEach(e=>e.classList.toggle('on',e.dataset.d===ART.dir)); }
  function mark(){ rootsEl.querySelectorAll('button').forEach(e=>e.classList.toggle('on',+e.dataset.pc===root)); qualsEl.querySelectorAll('button').forEach(e=>e.classList.toggle('on',+e.dataset.q===qi)); }
  function label(){
    const sh=shapes[idx];
    $('chordName').innerHTML=NAME[root]+'<span class="q">'+QUAL[qi][0]+'</span>';
    $('chordChart').textContent=sh&&sh.ok?sh.chart:'—';
    $('chordCt').textContent=sh&&sh.ok?'shape '+(idx+1)+' of '+shapes.length:'no shape the hand can hold'; }
  // OPEN AND UNPLAYED STRINGS, as chord charts mark them: o over a string that rings open, x over one not played — just
  // before the nut (with the board turned, above it; up the neck, at the head of the view)
  const xoG=el('g',{class:'xo'},fb); let xoSh=null;
  function marks(sh){ xoSh=sh; while(xoG.firstChild) xoG.firstChild.remove(); if(!sh) return;
    const x=ROT.on?ROT.vb.x+15:22;
    for(let st=0;st<NSTR;st++){ const n=sh.notes.find(q=>q.s===st), y=FB.strY[st];
      if(n&&n.f===0) el('circle',{cx:x,cy:y,r:5.2,fill:'none',class:'inkS','stroke-width':1.7},xoG);
      else if(!n){ const r=4.6; el('path',{d:'M'+(x-r)+' '+(y-r)+'L'+(x+r)+' '+(y+r)+'M'+(x-r)+' '+(y+r)+'L'+(x+r)+' '+(y-r),fill:'none',class:'inkS','stroke-width':1.7},xoG); } } }
  // TURNED: the board a quarter turn clockwise, as chord diagrams are drawn — the nut at the top, the low E on the left,
  // the high e on the right — and closed in on the hand: five frets from the shape's lowest (from the nut when it lies
  // within the first three), gliding there when the shape moves
  const ROT={on:false,vb:null}, YUP=110;                     // YUP: room above the board for the hand (beside it, turned)
  const box=document.createElement('div'); box.className='fbRot'; fb.parentElement.insertBefore(box,fb); box.appendChild(fb);
  function target(){ const sh=shapes[idx], fr=(P.length?P.map(q=>q.f):[]).concat(sh&&sh.ok?sh.notes.map(n=>n.f):[]).filter(f=>f>0);
    const lo=fr.length?Math.min(...fr):1, hi=fr.length?Math.max(...fr):1, a=lo<=3?1:lo, b=Math.max(a+4,hi);
    const x0=a===1?4:cellL(a)-30, x1=cellR(b)+6; return {x:x0,y:-YUP,w:x1-x0,h:304+YUP}; }
  let sizeTo=null;                                                    // the zoomed view's size, when zoomed
  function fit(h,w){ sizeTo=h?{h,w}:null; layoutRot(); }
  function layoutRot(){
    if(!ROT.on){ box.removeAttribute('style'); fb.style.cssText=''; fb.setAttribute('viewBox','0 0 990 304'); return; }
    const v=ROT.vb, room=sizeTo||{h:Math.min(540,innerHeight*0.62),w:box.parentElement.clientWidth||innerWidth};
    let H=room.h, k=H/v.w; if(v.h*k>room.w){ k=room.w/v.h; H=v.w*k; }
    const D=v.h*k; box.style.cssText='position:relative; width:'+D+'px; height:'+H+'px; margin:0 auto';
    fb.style.cssText='position:absolute; left:0; top:0; width:'+H+'px; height:'+D+'px; max-width:none; transform-origin:0 0; transform:translateX('+D+'px) rotate(90deg)';
    fb.setAttribute('viewBox',v.x.toFixed(1)+' '+v.y+' '+v.w.toFixed(1)+' '+v.h); }
  // the fret numbers stay upright
  const upright=on=>fb.querySelectorAll('text.fretn').forEach(t=>{ if(on) t.setAttribute('transform','rotate(-90 '+t.getAttribute('x')+' '+t.getAttribute('y')+')'); else t.removeAttribute('transform'); });
  (function glide(){ if(ROT.on){ const t=target(), v=ROT.vb; let moved=false;
      for(const key of ['x','w']){ const d=t[key]-v[key]; if(Math.abs(d)>0.3){ v[key]+=d*(reduce?1:0.12); moved=true; } else v[key]=t[key]; }
      if(moved){ layoutRot(); marks(xoSh); } }
    requestAnimationFrame(glide); })();
  const rotBtn=panel.querySelector('#rotBtn');
  rotBtn.addEventListener('click',()=>{ const z=SURF.kind==='fb'||SURF.kind==='rot'; if(z) SURF.close();
    ROT.on=!ROT.on; ROT.vb=ROT.on?target():null; rotBtn.setAttribute('aria-pressed',ROT.on); rotBtn.classList.toggle('on',ROT.on);
    upright(ROT.on); layoutRot(); marks(xoSh); if(z) SURF.open(fb,'fb'); });
  addEventListener('resize',()=>{ if(ROT.on&&!sizeTo) layoutRot(); });
  // the page's own: the frame label and the page count give way to the chord
  ['means','pageCt','hold'].forEach(id=>{ const e=$(id); if(e) e.style.display='none'; });
  const css=document.createElement('style'); css.textContent='.chordHead{ display:flex; align-items:baseline; gap:16px; margin:0 0 10px; flex-wrap:wrap } .chordName{ font-family:var(--serif); font-style:italic; font-weight:500; font-size:30px; color:var(--ink); min-width:3.2em } .chordName .q{ font-size:22px; margin-left:1px } .chordChart{ font-family:ui-monospace,Menlo,monospace; font-size:16px; letter-spacing:.12em; color:var(--ink) } .chordCt{ font-size:13px; color:var(--mid) } .rootBtn{ min-width:46px } .rootBtn .alt{ display:block; font-size:10px; font-weight:500; color:var(--mid); line-height:1 } .rootBtn.on .alt{ color:var(--bg) } .cseg{ display:inline-flex; border:1.5px solid var(--mid); border-radius:999px; overflow:hidden; margin-right:10px } .cseg button{ font:inherit; font-size:14px; font-weight:600; padding:5px 12px; border:0; background:var(--bg); color:var(--ink); cursor:pointer } .cseg button+button{ border-left:1.5px solid var(--mid) } .cseg button.on{ background:var(--ink); color:var(--bg) } #rotBtn.on, .zoomBar .pill.on{ background:var(--ink); color:var(--bg) }';
  document.head.appendChild(css);
  markPlay(); mark(); shapes=chordShapes(root,QUAL[qi][2],pcs,{open});
  FBROT={get on(){ return ROT.on; }, fit};
  return {show:(i,dir)=>show(i,dir), run, tab, bass:()=>{ const sh=shapes[idx]; return sh&&sh.ok?{string:sh.notes[0].s,pitch:sh.notes[0].f,fret:sh.notes[0].f}:null; }};
})():null;
