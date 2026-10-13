/* CHORDS (explorer). Choose a root and a quality; the chord's shapes are found on the strings (st_chordgen.js), in order up
   the neck. Prev | Next step through them; each is offered only if the hand's bones can hold it — its span rules, then
   the mechanism reaching every note — and the hand grips it, keeping the chord's open strings clear. Play strums it,
   low string to high. */
const CHORDS=BOOK.chords?(()=>{
  // pitch classes here count from A (as the strings do): 0 A … 3 C … 11 A♭
  const ROOTS=[[3,'C'],[4,'C♯','D♭'],[5,'D'],[6,'D♯','E♭'],[7,'E'],[8,'F'],[9,'F♯','G♭'],[10,'G'],[11,'G♯','A♭'],[0,'A'],[1,'A♯','B♭'],[2,'B']];
  const NAME={3:'C',4:'D♭',5:'D',6:'E♭',7:'E',8:'F',9:'F♯',10:'G',11:'A♭',0:'A',1:'B♭',2:'B'};
  const QUAL=[['','maj',[0,4,7]],['m','m',[0,3,7]],['7','7',[0,4,7,10]],['maj7','maj7',[0,4,7,11]],['m7','m7',[0,3,7,10]],['m7♭5','m7♭5',[0,3,6,10]],
    ['dim','dim',[0,3,6]],['dim7','dim7',[0,3,6,9]],['aug','aug',[0,4,8]],['sus2','sus2',[0,2,7]],['sus4','sus4',[0,5,7]],['6','6',[0,4,7,9]],['m6','m6',[0,3,7,9]]];
  const pcs=STRINGS.map(s=>s.pc), open=STRINGS.map((s,i)=>openMidi(i));
  let root=3, qi=0, shapes=[], idx=0, started=false, voices=[];
  const fits=pl=>{ for(let i=0;i<pl.length;i++) for(let j=i+1;j<pl.length;j++) if(!fingersFit(pl[i].g,pl[i].f,pl[i].s,pl[j].g,pl[j].f,pl[j].s)) return false; return true; };
  // can the hand hold it? decided once per shape, the first time it is reached
  function holds(sh){
    if(sh.ok!==undefined) return sh.ok;
    if(!fits(sh.pl)) return sh.ok=false;
    HANDLAB.setOpen(sh.notes.filter(n=>n.f===0).map(n=>n.s));
    sh.err=HANDLAB.reach(sh.pl); return sh.ok=sh.err<=3; }
  function grip(sh){
    stopForEdit(); P=sh.pl.map(q=>Object.assign({},q)); const H=handFor(P); HAND.f=H.f; HAND.thumb=H.thumb; DRILL=null; SEL=null;
    HANDLAB.setOpen(sh.notes.filter(n=>n.f===0).map(n=>n.s)); refresh(); }
  // the next shape the hand can hold, from i, stepping by dir (wrapping round once)
  function show(i,dir){
    if(!started){ loadPage(0); started=true;
      // the Ring opens on D as Re, Re at 12 o'clock; from then on the listener turns it
      let s0=0, f0=99; for(let s=0;s<NSTR;s++) for(let f=0;f<12;f++) if(pcOf(s,f)===5&&f<f0){ s0=s; f0=f; }
      pagePhi({anchor:{s:s0,f:f0,deg:'re'},top:'re'}); }
    if(!shapes.length){ label(); return; }
    const N=shapes.length; dir=dir||1;
    for(let k=0;k<N;k++){ const j=(((i+dir*k)%N)+N)%N; if(holds(shapes[j])){ idx=SI=j; grip(shapes[j]); label(); return; } }
    P=[]; refresh(); label(); }
  function choose(){ shapes=chordShapes(root,QUAL[qi][2],pcs,{open}); idx=0; show(0,1); }
  // PLAY: the shape sounded at the Tempo, with the Click, until Stop. Strum: a whole-note strum each bar. Arpeggio: the
  // shape's notes one a beat, every one a downstroke whatever the pitch's direction, each left to ring. Order: Up (low to
  // high), Down (high to low), or Alternating (strums: up, then down, bar by bar; arpeggio: up and back down, the ends not
  // repeated). Each string is its own voice; a string sounded again is caught by the pick first.
  const ART={mode:'strum',dir:'up'}, PL={on:false,timer:null,b:0,t:0,strs:{}};
  const voice=s=>PL.strs[s]||(PL.strs[s]=makeString(GAUGE(s)));
  function pluck(n,t){ const v=voice(n.s); v.send({kind:'damp',t:Math.max(ctx.currentTime,t-0.02),t1:t,depth:0.03}); v.send({kind:'pluck',t,f:fretHz(n.s,n.f),v:PLUCK_V}); }
  const lowHigh=sh=>sh.notes.slice().sort((a,b)=>b.s-a.s);
  function arpSeq(sh){ const up=lowHigh(sh), dn=up.slice().reverse();
    return ART.dir==='up'?up:(ART.dir==='down'?dn:up.concat(dn.slice(1,-1))); }
  function beat(b,t){
    const sh=shapes[idx]; if(drill.click) click(t,b%4===0); if(!sh||!sh.ok) return;
    // strings no longer in the shape are let go
    Object.keys(PL.strs).forEach(s=>{ if(!sh.notes.some(n=>n.s===+s)) PL.strs[s].send({kind:'damp',t,t1:t+0.08,depth:0.002}); });
    if(ART.mode==='strum'){ if(b%4) return; const bar=b/4, up=ART.dir==='up'||(ART.dir==='alt'&&bar%2===0), o=up?lowHigh(sh):lowHigh(sh).reverse();
      o.forEach((n,k)=>pluck(n,t+k*0.022)); }
    else { const q=arpSeq(sh); pluck(q[b%q.length],t); } }
  function tick(){ const B=60/drill.bpm; while(PL.t<ctx.currentTime+0.15){ beat(PL.b,PL.t); PL.b++; PL.t+=B; } }
  function start(){ ensureCtx().then(()=>{ PL.on=true; PL.b=0; PL.t=ctx.currentTime+0.08; tick(); PL.timer=setInterval(tick,25); playBtn.textContent='Stop'; playBtn.classList.add('on'); }); }
  function stop(){ PL.on=false; clearInterval(PL.timer); if(ctx) Object.values(PL.strs).forEach(v=>v.stopAt(ctx.currentTime,true)); PL.strs={}; playBtn.textContent='Play'; playBtn.classList.remove('on'); }
  const toggle=()=>{ if(PL.on) stop(); else start(); };
  // the panel: the chord's name and chart above, the roots and qualities below
  const panel=document.createElement('div'); panel.className='gripPanel chordPanel';
  panel.innerHTML='<div class="chordHead"><span class="chordName" id="chordName"></span><span class="chordChart" id="chordChart"></span><span class="chordCt" id="chordCt"></span></div>'
    +'<div class="gripRow" id="chordRoots"></div><div class="gripRow" id="chordQuals"></div>'
    +'<div class="gripRow"><span class="gripGrp">Play</span><span class="seg" id="artSel"><button type="button" data-a="strum">Strum</button><button type="button" data-a="arp">Arpeggio</button></span>'
    +'<span class="seg" id="dirSel"><button type="button" data-d="up">Up</button><button type="button" data-d="down">Down</button><button type="button" data-d="alt">Alternating</button></span></div>';
  fb.parentElement.after(panel);
  const rootsEl=panel.querySelector('#chordRoots'), qualsEl=panel.querySelector('#chordQuals');
  ROOTS.forEach(([pc,a,b])=>{ const e=document.createElement('button'); e.type='button'; e.className='gripBtn rootBtn'; e.innerHTML=b?a+'<span class="alt">'+b+'</span>':a; e.dataset.pc=pc;
    e.addEventListener('click',()=>{ root=pc; mark(); choose(); }); rootsEl.appendChild(e); });
  QUAL.forEach(([sfx,lbl],i)=>{ const e=document.createElement('button'); e.type='button'; e.className='gripBtn'; e.textContent=lbl; e.dataset.q=i;
    e.addEventListener('click',()=>{ qi=i; mark(); choose(); }); qualsEl.appendChild(e); });
  const artEl=panel.querySelector('#artSel'), dirEl=panel.querySelector('#dirSel');
  artEl.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; ART.mode=b.dataset.a; markPlay(); });
  dirEl.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; ART.dir=b.dataset.d; markPlay(); });
  function markPlay(){ artEl.querySelectorAll('button').forEach(e=>e.classList.toggle('on',e.dataset.a===ART.mode)); dirEl.querySelectorAll('button').forEach(e=>e.classList.toggle('on',e.dataset.d===ART.dir)); }
  function mark(){ rootsEl.querySelectorAll('button').forEach(e=>e.classList.toggle('on',+e.dataset.pc===root)); qualsEl.querySelectorAll('button').forEach(e=>e.classList.toggle('on',+e.dataset.q===qi)); }
  function label(){
    const sh=shapes[idx];
    $('chordName').innerHTML=NAME[root]+'<span class="q">'+QUAL[qi][0]+'</span>';
    $('chordChart').textContent=sh&&sh.ok?sh.chart:'—';
    $('chordCt').textContent=sh&&sh.ok?'shape '+(idx+1)+' of '+shapes.length:'no shape the hand can hold'; }
  // the page's own: the frame label, the TAB and the page count give way to the chord
  ['means','tabPanel','pageCt','hold'].forEach(id=>{ const e=$(id); if(e) e.style.display='none'; });
  const css=document.createElement('style'); css.textContent='.chordHead{ display:flex; align-items:baseline; gap:16px; margin:0 0 10px; flex-wrap:wrap } .chordName{ font-family:var(--serif); font-style:italic; font-weight:500; font-size:30px; color:var(--ink); min-width:3.2em } .chordName .q{ font-size:22px; margin-left:1px } .chordChart{ font-family:ui-monospace,Menlo,monospace; font-size:16px; letter-spacing:.12em; color:var(--ink) } .chordCt{ font-size:13px; color:var(--mid) } .rootBtn{ min-width:46px } .rootBtn .alt{ display:block; font-size:10px; font-weight:500; color:var(--mid); line-height:1 } .rootBtn.on .alt{ color:var(--bg) } .seg{ display:inline-flex; border:1.5px solid var(--mid); border-radius:999px; overflow:hidden; margin-right:10px } .seg button{ font:inherit; font-size:14px; font-weight:600; padding:5px 12px; border:0; background:var(--bg); color:var(--ink); cursor:pointer } .seg button+button{ border-left:1.5px solid var(--mid) } .seg button.on{ background:var(--ink); color:var(--bg) }';
  document.head.appendChild(css);
  markPlay(); mark(); shapes=chordShapes(root,QUAL[qi][2],pcs,{open});
  return {show:(i,dir)=>show(i,dir), toggle, strum:toggle, bass:()=>{ const sh=shapes[idx]; return sh&&sh.ok?{string:sh.notes[0].s,pitch:sh.notes[0].f,fret:sh.notes[0].f}:null; }};
})():null;
