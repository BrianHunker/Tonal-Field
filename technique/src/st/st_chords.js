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
    if(SONG){ if(!started){ loadPage(0); started=true; const R=SONG.ring||{pc:5,deg:'re',top:'re'}; let s0=0, f0=99; for(let s=0;s<NSTR;s++) for(let f=0;f<12;f++) if(pcOf(s,f)===R.pc&&f<f0){ s0=s; f0=f; } pagePhi({anchor:{s:s0,f:f0,deg:R.deg},top:R.top}); } songShow(); return; }
    if(!started){ loadPage(0); started=true;
      // the Ring opens on D as Re, Re at 12 o'clock; from then on the listener turns it
      let s0=0, f0=99; for(let s=0;s<NSTR;s++) for(let f=0;f<12;f++) if(pcOf(s,f)===5&&f<f0){ s0=s; f0=f; }
      pagePhi({anchor:{s:s0,f:f0,deg:'re'},top:'re'}); }
    if(!shapes.length){ label(); return; }
    const N=shapes.length; dir=dir||1;
    for(let k=0;k<N;k++){ const j=(((i+dir*k)%N)+N)%N; if(holds(shapes[j])){ idx=SI=j; grip(shapes[j]); label(); return; } }
    P=[]; refresh(); label(); marks(null); }
  // the common grips (the Hand Lab's chord grips: the open chords as they are taught, the rock G among them) lead at their
  // place on the neck, fingered as charted
  const COMMON={}; HANDLAB.grips.forEach(([,list])=>list.forEach(([,fr,fi])=>{ COMMON[fr]=fi; }));
  function find(){ const out=chordShapes(root,QUAL[qi][2],pcs,{open}).map(sh=>{ const fi=COMMON[sh.chart]; if(fi){ sh.common=true; sh.pl=HANDLAB.grip(sh.chart,fi); } return sh; });
    return out.sort((a,b)=>a.pos-b.pos||(b.common?1:0)-(a.common?1:0)); }
  function choose(){ shapes=find(); idx=0; show(0,1); }
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
  const useFig=C=>{ FIG=C.fig; LOOP=4*(C.D.bars||BARS); BAR_START=i=>FIG[i]&&Number.isInteger(FIG[i].s)&&FIG[i].s%4===0; };
  // the figure for the shape as it stands: shown at once when stopped; while playing, taken up at the loop's end
  function figure(){
    const sh=shapes[idx]; if(!sh||!sh.ok){ DRILL=null; refresh(); return; }
    const C=chordDrill(sh);
    if(T.on&&T.segs.length){ const s=T.segs[T.segs.length-1];
      s.swap=()=>{ useFig(C); s.D=C.D; s.plan=C.D.plan; s.hand=cloneHand(C.hand); s.chord=C.chord; s.upAt=n=>C.ups.has(n)||(n%2===1); s.picks=null; delete s.swap; T.shown=null; };
      return; }
    useFig(C); DRILL=C.D; layoutTab(BARS); refresh(); }
  function run(){
    if(SONG) return songRun();
    const sh=shapes[idx]; if(!sh||!sh.ok) return;
    ensureCtx().then(()=>{
      if(T.on) stopAll();
      T.beat=60/drill.bpm; const C=chordDrill(sh); useFig(C); DRILL=C.D;
      const s={D:C.D,pass:0,plan:C.D.plan,hand:cloneHand(C.hand),si:0,custom:false,mode:'pick',strs:{},plant:true,xt:0,chord:C.chord,upAt:n=>C.ups.has(n)||(n%2===1)};
      placeSeg(s,ctx.currentTime+0.1);
      T.segs=[s]; T.si=0; T.nextI=0; T.nextCycle=0; T.nextBeat=-COUNT; T.live=[]; T.shown=null; T.on=true;
      tick(); T.timer=setInterval(tick,25);
      playBtn.textContent='Stop'; playBtn.classList.add('on'); }); }
  // the chord in TAB: a strum's numbers stacked on its beat, an arrow beside them in the order they sound (down the page
  // for a downstroke — the strings' order on the staff); below the staff, the stroke as players think of it, a plain
  // arrow: down for a downstroke, up for an upstroke (a heavier one for an accent). An arpeggio's numbers one a beat,
  // each with its stem, the stroke's arrow under it
  const strokeMark=(x,up,y0,y1,heavy)=>{ el('line',{x1:x,y1:up?y0+6:y0,x2:x,y2:up?y1:y1-6,class:'inkS','stroke-width':heavy?2.4:1.4},noteG); arrowHead(x,up?y0:y1,up?-1:1); };
  function tab(D){
    if(D.song) return songTab(D);
    const plan=D.plan, stemTop=TB.rowY[NSTR-1]+10, stemLong=14, below=TB.rowY[NSTR-1]+12, mark=(x,up)=>strokeMark(x,up,D.art==='strum'?below:stemTop+stemLong+4,D.art==='strum'?below+22:224,false);
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
  // A SONG (a page's own exercise, BOOK.song): a progression of grips, one a bar, strummed in sixteenths to one pattern.
  // The pattern is the bar's sixteen strokes, D u d u …: d a downstroke, u an upstroke, _ the hand passing the strings
  // without touching them. Where a stroke falls says what it catches and how hard: the bar's downbeat, the heaviest,
  // only the grip's two lowest tones (its bass); every other downstroke, at a middle weight, the grip's middle two or
  // three strings; an upstroke, lightest, its top two — a capital U lifting an upstroke to the middle weight. The hand
  // changes grip a sixteenth ahead of the bar; strings the new grip leaves out are stilled.
  // Each grip is formed once, ahead, so the hand goes straight to it.
  const SONG=BOOK.song?(()=>{ const G=BOOK.song, NS=NSTR;
    const bars=G.bars.map(([name,chart])=>{ const fi=COMMON[chart], pl=HANDLAB.grip(chart,fi), notes=[];
      [...chart].forEach((c,i)=>{ if(c!=='x'&&c!=='X') notes.push({s:NS-1-i,f:+c}); });
      notes.sort((a,b)=>b.s-a.s); const root=({C:3,D:5,E:7,F:8,G:10,A:0,B:2}[name[0]]+(/^.[♯#]/.test(name)?1:/^.[♭b]/.test(name)?-1:0)+12)%12;
      return {name,chart,pl,notes,root,open:notes.filter(n=>n.f===0).map(n=>n.s)}; });
    return {bars,pattern:G.pattern,bpm:G.bpm,ring:G.ring}; })():null;
  let barNow=-1;
  function songDrill(){
    const plan=[], fig=[], strums=[], hands=[], chords=[], N=SONG.bars.length, d=STRUM*drill.bpm/60;
    SONG.bars.forEach((B,b)=>{ hands.push(handFor(B.pl)); chords.push(new Set(B.pl.map(q=>q.g)));
      const fin=n=>{ if(!n.f) return 0; const q=B.pl.find(p=>p.s===n.s&&p.f===n.f)||B.pl.find(p=>p.barre&&n.s<=p.s&&n.f===p.f); return q?q.g:0; };
      const prev=SONG.bars[(b+N-1)%N], mute=prev.notes.filter(n=>!B.notes.some(m=>m.s===n.s)).map(n=>n.s);
      let firstOfBar=true;
      [...SONG.pattern].forEach((c,i)=>{ if(c==='_') return; const up=c==='u'||c==='U', acc=c==='D'||c==='U';
        const NN=B.notes.length, cn=NN>=5?3:2, c0=Math.round((NN-cn)/2), bass=firstOfBar&&!up;
        const strs=up?B.notes.slice(-2).reverse():(bass?B.notes.slice(0,2):B.notes.slice(c0,c0+cn)), vel=bass?1:(up?(c==='U'?0.72:0.5):0.72), ix=[];
        strs.forEach((n,k)=>{ ix.push(plan.length); plan.push({string:n.s,fret:n.f,pitch:n.f,push:0,finger:fin(n),frame:b,pick:true,glide:false,pre:false,kind:'pick',hi:false,vel,root:B.root,head:k===0,mute:firstOfBar&&k===0&&mute.length?mute:null}); fig.push({s:4*b+i/4+k*d}); });
        strums.push({b,i,up,acc:bass||c==='U',ix}); firstOfBar=false; }); });
    fig.forEach((e,k)=>{ e.d=k<fig.length-1?fig[k+1].s-e.s:4*N-e.s+fig[0].s; });
    const D={chord:true,song:true,walk:true,art:'song',dir:'up',means:'pick',ham:false,pull:false,plan,bars:N,strums,
      frames:[{string:plan[0].string,tones:[],pl:SONG.bars[0].pl,hand:hands[0]}],
      lo:{s:plan[0].string,f:plan[0].fret,g:plan[0].finger},hi:{s:plan[1].string,f:plan[1].fret,g:plan[1].finger}};
    return {D,fig,hands,chords}; }
  function songTab(D){
    const below=TB.rowY[NSTR-1]+12, bars=D.bars;
    D.strums.forEach(S=>{ const x=xBeat(4*S.b+S.i/4);
      S.ix.forEach(i=>{ const n=D.plan[i]; tabNotes[i]=numberAt(x,TB.rowY[n.string],String(n.fret)); });
      const a=D.plan[S.ix[0]].string, z=D.plan[S.ix[S.ix.length-1]].string, ya=TB.rowY[a], yz=TB.rowY[z], ax=x+13, dir=yz<ya?-1:1;
      if(S.ix.length>1){ el('line',{x1:ax,y1:ya,x2:ax,y2:yz-dir*6,class:'inkS','stroke-width':1.1},noteG); arrowHead(ax,yz,dir); }
      strokeMark(x,S.up,below,below+20,S.acc); });
    // each bar: its name over the staff (the letter, then its root's function), and behind the staff its mode's light,
    // strongest at the downbeat and fading to nothing by the bar's end
    while(bgG.firstChild) bgG.firstChild.remove(); barArt.length=0;
    const yT=TB.rowY[0]-34, yB=TB.rowY[NSTR-1]+8;
    for(let b=0;b<bars;b++){ const B=SONG.bars[b], x0=b?TB.barX(b):TB.x0, x1=b<bars-1?TB.barX(b+1):TB.s1, id=gid+'bar'+b;
      const g=el('linearGradient',{id,x1:0,y1:0,x2:1,y2:0},bgG), s0=el('stop',{offset:0},g), s1=el('stop',{offset:1,'stop-opacity':0},g);
      const r=el('rect',{x:x0,y:yT,width:x1-x0,height:yB-yT,fill:'url(#'+id+')',opacity:0},bgG);
      const t=el('text',{x:x0+8,y:((TB.floor+TB.rowY[0])/2+5).toFixed(1),class:'barName'},noteG), L=el('tspan',{class:'barLetter'},t), S=el('tspan',{class:'barSyl',dx:6},t);
      L.textContent=B.name;
      barArt.push({B,s0,r,L,S}); }
    paintBars(-1,null); }
  // the bars' light, each frame: the bar playing lit full, the others (past and coming) dimmer; the names white until
  // their bar's downbeat, then in their function's colour; a soft vertical light rides the playhead
  const bgG=el('g',{'pointer-events':'none'},null), barArt=[], gid='sg'+Math.random().toString(36).slice(2,6);
  const tabSvg=document.getElementById('tab'); tabSvg.insertBefore(bgG,tabSvg.firstChild);
  const spotF=el('filter',{id:gid+'spot',x:'-200%',y:'-30%',width:'500%',height:'160%'},bgG.parentNode);
  el('feGaussianBlur',{stdDeviation:'7 10'},spotF);
  const spot=el('rect',{x:0,y:TB.rowY[0]-30,width:10,height:TB.rowY[NSTR-1]-TB.rowY[0]+48,rx:5,filter:'url(#'+gid+'spot)',opacity:0,'pointer-events':'none'},null);
  tabSvg.insertBefore(spot,bgG.nextSibling);
  function paintBars(cur,hx){ const L=FIELD.lit, ink=inkColour();
    barArt.forEach((a,b)=>{ const c=valRGB(a.B.root), on=b===cur;
      a.s0.setAttribute('stop-color',rgbS(c)); a.r.setAttribute('opacity',(L*(on?0.42:0.13)).toFixed(3));
      const col=on&&L>0.001?rgbS(mixRGB(ink,c,L)):rgbS(ink); a.L.style.fill=col; a.S.style.fill=col;
      const syl=sylOf(a.B.root); a.S.textContent=L>0.5&&syl?syl:''; });
    if(hx===null||cur<0){ spot.setAttribute('opacity',0); return; }
    const c=L>0.001?mixRGB(ink,valRGB(barArt[cur].B.root),L):ink; spot.setAttribute('fill',rgbS(c)); spot.setAttribute('x',(hx-5).toFixed(1)); spot.setAttribute('opacity',(0.55).toFixed(2)); }
  // the grip of bar b on the board: the dots, the open strings, the x's and o's, the name — and the hand to its learned pose
  function songBar(b){ if(b===barNow) return; barNow=b; const B=SONG.bars[b];
    P=B.pl.map(q=>Object.assign({},q)); { const H=handFor(P); HAND.f=H.f; HAND.thumb=H.thumb; }
    HANDLAB.setOpen(B.open); HANDLAB.toGrip(B.chart); marks(B); songLabel(); }
  function songLabel(){ const B=SONG.bars[Math.max(0,barNow)];
    $('chordName').innerHTML=B.name.replace(/^([A-G][♯♭#b]?)(.*)$/,'$1<span class="q">$2</span>'); $('chordChart').textContent=B.chart;
    $('chordCt').textContent='bar '+(barNow+1)+' of '+SONG.bars.length;
    progEl.querySelectorAll('span').forEach((e,i)=>e.classList.toggle('on',i===barNow)); }
  function songRun(){
    ensureCtx().then(()=>{
      if(T.on) stopAll();
      T.beat=60/drill.bpm; const C=songDrill(); useFig(C); DRILL=C.D;
      const s={D:C.D,pass:0,plan:C.D.plan,hand:cloneHand(C.hands[0]),hands:C.hands.map(cloneHand),si:0,custom:false,mode:'pick',strs:{},plant:true,xt:0,chord:C.chords[0],chords:C.chords,lead:0.8*T.beat/4};
      placeSeg(s,ctx.currentTime+0.1);
      T.segs=[s]; T.si=0; T.nextI=0; T.nextCycle=0; T.nextBeat=-COUNT; T.live=[]; T.shown=null; T.on=true;
      tick(); T.timer=setInterval(tick,25);
      playBtn.textContent='Stop'; playBtn.classList.add('on'); }); }
  function songShow(){ const C=songDrill(); useFig(C); DRILL=C.D; layoutTab(SONG.bars.length); barNow=-1; songBar(0); refresh(); }
  // which bar is on the board: playing, the one the hand is heading for; stopped, the first
  function step(st,live){ if(!SONG) return; let b=0;
    if(barArt.length){ const playing=T.on&&st&&live&&st.s&&st.s.chords; paintBars(playing?st.s.plan[st.idx].frame:-1,playing?xBeat(st.ph):null); head.style.opacity=SONG?0:''; }
    if(T.on&&ctx&&st&&st.s&&st.s.chords){ const sa=stateAt(ctx.currentTime+st.s.lead); b=(sa.s===st.s&&sa.idx>=0)?st.s.plan[sa.idx].frame:(sa.count?0:barNow); }
    else if(T.on) return;
    if(b!==barNow) songBar(b); }
  let progEl=null;
  if(SONG){ STROKES=4; CW_MIN=64; TB.tail=CW_MIN/2; TB.barX=b=>xBeat(4*b-0.125);
    if(SONG.bpm){ drill.bpm=SONG.bpm; const r=$('bpm'), v=$('bpmv'); if(r) r.value=SONG.bpm; if(v) v.textContent=SONG.bpm; }
    ['chordRoots','chordQuals'].forEach(id=>{ panel.querySelector('#'+id).style.display='none'; });
    artEl.style.display=dirEl.style.display='none'; panel.querySelector('.gripRow .gripGrp').textContent='';
    progEl=document.createElement('div'); progEl.className='gripRow songProg';
    SONG.bars.forEach((B,i)=>{ if(i&&i%4===0) progEl.appendChild(document.createElement('br')); const e=document.createElement('span'); e.textContent=B.name; progEl.appendChild(e); });
    panel.querySelector('#chordRoots').before(progEl);
    const pat=document.createElement('div'); pat.className='songPat'; pat.textContent=SONG.pattern.replace(/U/g,'u').replace(/(.{4})(?=.)/g,'$1 ');
    progEl.after(pat);
    $('prev').parentElement.style.display='none';
    // each grip formed once, ahead, a frame apart so the page stays awake
    const charts=[...new Set(SONG.bars.map(B=>B.chart))];
    (function learnNext(k){ if(k>=charts.length){ if(barNow>=0){ const B=SONG.bars[barNow]; HANDLAB.setOpen(B.open); HANDLAB.toGrip(B.chart); } return; }
      const B=SONG.bars.find(x=>x.chart===charts[k]); HANDLAB.learn(B.chart,B.pl,B.open); setTimeout(()=>learnNext(k+1),30); })(0); }
  // the page's own: the frame label and the page count give way to the chord
  ['means','pageCt','hold'].forEach(id=>{ const e=$(id); if(e) e.style.display='none'; });
  const css=document.createElement('style'); css.textContent='.chordHead{ display:flex; align-items:baseline; gap:16px; margin:0 0 10px; flex-wrap:wrap } .chordName{ font-family:var(--serif); font-style:italic; font-weight:500; font-size:30px; color:var(--ink); min-width:3.2em } .chordName .q{ font-size:22px; margin-left:1px } .chordChart{ font-family:ui-monospace,Menlo,monospace; font-size:16px; letter-spacing:.12em; color:var(--ink) } .chordCt{ font-size:13px; color:var(--mid) } .rootBtn{ min-width:46px } .rootBtn .alt{ display:block; font-size:10px; font-weight:500; color:var(--mid); line-height:1 } .rootBtn.on .alt{ color:var(--bg) } .cseg{ display:inline-flex; border:1.5px solid var(--mid); border-radius:999px; overflow:hidden; margin-right:10px } .cseg button{ font:inherit; font-size:14px; font-weight:600; padding:5px 12px; border:0; background:var(--bg); color:var(--ink); cursor:pointer } .cseg button+button{ border-left:1.5px solid var(--mid) } .cseg button.on{ background:var(--ink); color:var(--bg) } #rotBtn.on, .zoomBar .pill.on{ background:var(--ink); color:var(--bg) } .songProg span{ display:inline-block; min-width:3.2em; padding:4px 10px; margin:0 6px 6px 0; border:1.5px solid var(--mid); border-radius:8px; font-weight:600; text-align:center } .songProg span.on{ background:var(--ink); color:var(--bg); border-color:var(--ink) } .songPat{ font-family:ui-monospace,Menlo,monospace; font-size:16px; letter-spacing:.14em; margin:2px 0 10px; color:var(--ink) } #tab .barName{ font-size:17px; font-weight:700 } #tab .barSyl{ font-family:var(--serif); font-style:italic; font-weight:500 }';
  document.head.appendChild(css);
  markPlay(); mark(); shapes=find();
  FBROT={get on(){ return ROT.on; }, fit};
  return {show:(i,dir)=>show(i,dir), run, tab, step, bass:()=>{ if(SONG){ const B=SONG.bars[Math.max(0,barNow)]; return {string:B.notes[0].s,pitch:B.notes[0].f,fret:B.notes[0].f}; } const sh=shapes[idx]; return sh&&sh.ok?{string:sh.notes[0].s,pitch:sh.notes[0].f,fret:sh.notes[0].f}:null; }};
})():null;
