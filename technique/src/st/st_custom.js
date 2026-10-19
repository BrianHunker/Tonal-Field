/* CUSTOM: a drill written by hand. Two ways in, kept in step — the TAB itself (a cursor on a string at a moment: type a
   fret, choose its length) and one line of text — and a third, the fretboard: a fret clicked is written at the cursor.
   Each tone carries its written length; the string is stilled where it ends. Chord symbols stand where they are written,
   anywhere in a bar: a name and its root's function (Am_La) orients the ring there — the letter is the anchor, the
   syllable its function — while a bare name (Am) leaves the orientation as it is and takes whatever function it gives
   the root. The ring lights the mode from the chord's root; the board and the TAB light every tone sounding or held.
   The hand is fingered automatically, one pose for each moment something new sounds: the least travel and stretch
   across the whole drill, within the hand's own reach; any tone's finger can be written instead (@2).
   Time is counted in ticks, 24 to a quarter, so every common value lands exactly: whole 96, half 48, quarter 24,
   eighth 12, sixteenth 6, thirty-second 3; dotted ×3/2; triplets ×2/3. */
function customTool(){
  const PRE=BOOK.preset||null;                                         // a page that is one exercise, generated (its options in place of the editor)
  const TPQ=24, $q=id=>document.getElementById(id);
  const METERS=[[2,4],[3,4],[4,4],[5,4],[6,8],[9,8],[12,8]];
  const barT=m=>m[0]*4*TPQ/m[1];
  const compound=m=>m[1]===8&&m[0]%3===0;
  const pulseT=m=>compound(m)?36:4*TPQ/m[1];                         // the beat: a dotted quarter in 6/8, 9/8, 12/8
  const BASEV={w:96,h:48,q:24,e:12,s:6,x:3};
  // every length with a single name, longest first (the text writes a length as one of these, or several tied)
  const NAMED=[[96,'w'],[72,'h.'],[64,'w3'],[48,'h'],[36,'q.'],[32,'h3'],[24,'q'],[18,'e.'],[16,'q3'],[12,'e'],[9,'s.'],[8,'e3'],[6,'s'],[4,'s3'],[3,'x'],[2,'x3']];
  const NAMEOF={}; NAMED.forEach(([v,n])=>{ NAMEOF[v]=n; });
  const ROOTPC={C:3,D:5,E:7,F:8,G:10,A:0,B:2};                       // pitch classes count from A, as the strings do
  const SOLN=SOLF.map(([n])=>n);                                     // semitones up from Re
  const sylNorm=x=>{ const k=x.toLowerCase().replace(/^so$/,'sol').replace(/^~so$/,'~sol'); const i=SOLN.findIndex(n=>n.toLowerCase()===k); return i<0?null:SOLN[i]; };
  const fromDo=syl=>(SOLN.indexOf(syl)+2)%12;                         // a syllable's distance above Do
  const durOf=tok=>{ const m=/^([whqesx])([.3]*)$/.exec(tok); if(!m) return null; let v=BASEV[m[1]];
    for(const c of m[2]){ if(c==='.') v*=1.5; else v*=2/3; } return Number.isInteger(v)&&v>0?v:null; };
  // the fewest named lengths that add up to n ticks (null if none can)
  const split=n=>{ if(n<=0) return []; const best=[[]]; for(let i=1;i<=n;i++){ best[i]=null;
      for(const [v] of NAMED) if(v<=i&&best[i-v]&&(!best[i]||best[i-v].length+1<best[i].length)) best[i]=best[i-v].concat([v]); }
    return best[n]&&best[n].slice().sort((a,b)=>b-a); };
  const lenText=n=>{ const p=split(n); return p?p.map(v=>NAMEOF[v]).join('~'):null; };

  /* ---------- the drill ---------- */
  const fresh=()=>({title:'Custom',meter:[4,4],bpm:70,bars:2,ev:[],ch:[]});
  let M=fresh(), uid=1;
  const total=()=>M.bars*barT(M.meter);
  const chordOf=(name,syl)=>{ const m=/^([A-G])([#♯b♭]?)(.*)$/.exec(name); if(!m) return null;
    const root=(ROOTPC[m[1]]+(/[#♯]/.test(m[2])?1:/[b♭]/.test(m[2])?-1:0)+12)%12;
    return {name:m[1]+(m[2]?(/[#♯]/.test(m[2])?'♯':'♭'):'')+m[3],root,syl:syl||null}; };
  // the drill made consistent: one tone at a time on a string (a tone is cut where the next on its string begins), nothing
  // past the end, the bars enough to hold everything
  function normalize(){
    const B=barT(M.meter);
    M.ev=M.ev.filter(e=>e.s>=0&&e.s<NSTR&&e.f>=0&&e.f<=FMAX&&e.d>0&&e.t>=0);
    const end=M.ev.reduce((a,e)=>Math.max(a,e.t+e.d),0), endC=M.ch.reduce((a,c)=>Math.max(a,c.t+1),0);
    M.bars=Math.max(1,M.bars,Math.ceil(Math.max(end,endC)/B));
    M.ev.sort((a,b)=>a.t-b.t||b.s-a.s);
    for(let s=0;s<NSTR;s++){ const on=M.ev.filter(e=>e.s===s);
      for(let i=0;i<on.length;i++){ const n=on[i+1]; if(n&&n.t===on[i].t){ on[i].d=0; continue; } if(n&&on[i].t+on[i].d>n.t) on[i].d=n.t-on[i].t; } }
    M.ev=M.ev.filter(e=>e.d>0);
    const seen={}; M.ch=M.ch.slice().reverse().filter(c=>{ if(seen[c.t]) return false; seen[c.t]=1; return c.t<total(); }).reverse().sort((a,b)=>a.t-b.t);
    M.ev.forEach(e=>{ if(!e.id) e.id=uid++; }); M.ch.forEach(c=>{ if(!c.id) c.id=uid++; }); }

  /* ---------- the text: one line, read and written ----------
     q h w e s x   quarter, half, whole, eighth, sixteenth, thirty-second; a dot after it dotted, a 3 after it a triplet
                   (e3); a length holds until another is written
     6:3           string 6 (the low E) at fret 3; 1 is the high e
     6:3+5:2+4:0   struck together
     2:3@1         the finger written (1–4); otherwise the hand chooses
     6:0=h         a tone held longer (or shorter) than the step to what follows: =h, =q.~e, …
     r   ~         a rest; a tie, the tones just ended held on
     Am_La   G7    a chord symbol: its root's function orients the ring; bare, the root takes what the ring gives it
     |             a bar line (a short bar is filled with rest) */
  function parse(text){
    const B=barT(M.meter), out={ev:[],ch:[]}, errs=[];
    let pos=0, dur=24, last=[], bar=0;
    const toks=text.replace(/\|/g,' | ').split(/\s+/).filter(Boolean);
    toks.forEach((tk,ti)=>{
      if(tk==='|'||tk==='||'){ bar++; const at=bar*B;
        if(pos<at) pos=at;                                              // a short bar: rest to its end
        else if(pos>at) errs.push('bar '+bar+' runs '+fmtBeats(pos-at)+' over');
        return; }
      const d=durOf(tk); if(d){ dur=d; return; }
      if(tk==='r'){ pos+=dur; last=[]; return; }
      if(tk==='~'){ const tied=last.filter(e=>e.t+e.d===pos); if(!tied.length) errs.push('“~” with nothing to tie, bar '+(bar+1)); tied.forEach(e=>{ e.d+=dur; }); pos+=dur; return; }
      const cm=/^([A-G][#♯b♭]?[^_\s]*)(?:_(~?[A-Za-z]+))?$/.exec(tk);
      if(cm){ const syl=cm[2]?sylNorm(cm[2]):null; if(cm[2]&&!syl){ errs.push('“'+tk+'”: no function “'+cm[2]+'”'); return; }
        const c=chordOf(cm[1],syl); if(!c){ errs.push('“'+tk+'” is not a chord'); return; } out.ch.push(Object.assign(c,{t:pos})); return; }
      const parts=tk.split('+'), grp=[]; let bad=false;
      parts.forEach(p=>{ const m=/^(\d):(\d{1,2})(?:@([0-4]))?(?:=([whqesx.3~]+))?$/.exec(p);
        if(!m){ bad=true; return; } const s=+m[1]-1, f=+m[2];
        if(s<0||s>=NSTR){ errs.push('“'+p+'”: there is no string '+m[1]); bad=true; return; }
        if(f>FMAX){ errs.push('“'+p+'”: the board shows frets 0–'+FMAX); bad=true; return; }
        let len=dur; if(m[4]){ len=0; for(const v of m[4].split('~')){ const x=durOf(v); if(!x){ errs.push('“'+p+'”: no length “'+v+'”'); bad=true; return; } len+=x; } }
        const e={t:pos,d:len,s,f}; if(m[3]!==undefined&&f>0&&+m[3]>0) e.g=+m[3]; grp.push(e); });
      if(bad&&!grp.length){ if(!errs.some(x=>x.includes(tk))) errs.push('“'+tk+'” is not a tone, a length or a chord'); return; }
      grp.forEach(e=>out.ev.push(e)); last=grp; pos+=dur; });
    out.bars=Math.max(1,Math.ceil(pos/B));
    return {out,errs}; }
  const fmtBeats=n=>{ const b=n/TPQ; return (Number.isInteger(b)?b:b.toFixed(2).replace(/0+$/,''))+(b===1?' beat':' beats'); };
  // the drill written out: bar by bar, at each moment its chord symbol and the tones struck there; a length is written only
  // when it changes; a tone held past the step to the next moment carries its own (=…)
  function serialize(){
    const B=barT(M.meter), out=[]; let dur=null, carry=0;
    const put=(arr,v)=>{ if(v!==dur){ arr.push(NAMEOF[v]); dur=v; } };
    const ascii=n=>n.replace(/♯/g,'#').replace(/♭/g,'b');
    const startsIn=(a,b)=>M.ev.some(e=>e.t>a&&e.t<b)||M.ch.some(c=>c.t>a&&c.t<b);
    for(let b=0;b<M.bars;b++){ const b0=b*B, b1=b0+B, toks=[]; let from=b0;
      // tones tied over from the bar before: a tie (~) for each length they still hold
      if(carry){ const c=Math.min(carry,B); split(c).forEach(v=>{ put(toks,v); toks.push('~'); }); from=b0+c; carry-=c; }
      const pts=[...new Set([from,b1].concat(M.ev.filter(e=>e.t>=from&&e.t<b1).map(e=>e.t),M.ch.filter(c=>c.t>=from&&c.t<b1).map(c=>c.t)))].sort((x,y)=>x-y);
      for(let i=0;i<pts.length-1;i++){ const p=pts[i], q=pts[i+1], G=q-p;
        M.ch.filter(c=>c.t===p).forEach(c=>toks.push(ascii(c.name)+(c.syl?'_'+c.syl:'')));
        const grp=M.ev.filter(e=>e.t===p).sort((x,y)=>y.s-x.s), segs=split(G)||[G];
        if(!grp.length){ segs.forEach(v=>{ put(toks,v); toks.push('r'); }); continue; }
        const lens=[...new Set(grp.map(e=>e.d))], L=lens.length===1?lens[0]:0;
        const tone=(e,adv)=>(e.s+1)+':'+e.f+(e.g&&e.f>0?'@'+e.g:'')+(e.d!==adv?'='+lenText(e.d):'');
        // one length, held past the bar line with nothing else starting before it ends: tied over the bar line
        const over=L>G&&q===b1&&!M.ev.some(e=>e.t===b1)&&!M.ch.some(c=>c.t===b1)&&!startsIn(b1,p+L);
        const one=L&&(L<=G||over)?split(Math.min(L,G)):null;
        if(one){ put(toks,one[0]); toks.push(grp.map(e=>tone(e,e.d)).join('+')); one.slice(1).forEach(v=>{ put(toks,v); toks.push('~'); });
          if(over) carry=L-G; else (split(G-L)||[]).forEach(v=>{ put(toks,v); toks.push('r'); }); }
        else{ put(toks,segs[0]); toks.push(grp.map(e=>tone(e,segs[0])).join('+')); segs.slice(1).forEach(v=>{ put(toks,v); toks.push('r'); }); } }
      out.push(toks.join(' ')); }
    return out.join(' | '); }

  /* ---------- fingering ----------
     Every moment something new is struck is a frame. The hand's state there is the finger of every fretted tone sounding
     (a held tone keeps its finger). One finger per tone; finger 1 may lie across a fret as a barre (then nothing under
     it rings open). Neighbouring fingers keep their reach (the hand's own rule: fingersFit). Cost: the stretch away from
     one finger per fret, the hand's travel from the frame before, a barre, a repeated tone changing finger. The cheapest
     path through all the frames is kept (dynamic programming, a beam of the best few states each frame). */
  const GRIPMAP={}; if(NSTR===6&&HANDLAB.grips) HANDLAB.grips.forEach(([,list])=>list.forEach(([,fr,fi])=>{ GRIPMAP[fr]=fi; }));
  function validHand(L,opens,strict){
    const by={}; L.forEach(x=>{ (by[x.g]=by[x.g]||[]).push(x); });
    for(const g in by) if(by[g].length>1){ if(+g!==1) return false; if(by[g].some(x=>x.f!==by[g][0].f)) return false; }
    const bar=by[1]&&by[1].length>1?{f:by[1][0].f,low:Math.max(...by[1].map(x=>x.s))}:null;
    if(bar){ if(L.some(x=>x.g!==1&&x.s<=bar.low&&x.f<=bar.f)) return false; if(opens.some(s=>s<=bar.low)) return false; }
    if(!strict) return true;
    const reps=Object.keys(by).map(g=>({g:+g,f:by[g][0].f,s:bar&&+g===1?-1:by[g][0].s}));
    for(let i=0;i<reps.length;i++) for(let j=i+1;j<reps.length;j++) if(!fingersFit(reps[i].g,reps[i].f,reps[i].s,reps[j].g,reps[j].f,reps[j].s)) return false;
    return true; }
  const perms=(free,m)=>{ const out=[]; const go=(acc,left)=>{ if(acc.length===m){ out.push(acc.slice()); return; } left.forEach((g,i)=>go(acc.concat([g]),left.slice(0,i).concat(left.slice(i+1)))); }; go([],free); return out; };
  function costOf(L,prevMean,bar,prevAt){
    if(!L.length) return {c:0,mean:prevMean};
    const bases=L.map(x=>x.f-(x.g-1)), mean=bases.reduce((a,b)=>a+b,0)/bases.length;
    let c=1.0*(Math.max(...bases)-Math.min(...bases))+(prevMean===null?0:0.5*Math.abs(mean-prevMean))+(bar?(L.length>4?0.8:2.4):0)+0.02*L.reduce((a,x)=>a+x.g,0);
    L.forEach(x=>{ const g0=prevAt[x.s+':'+x.f]; if(g0&&g0!==x.g) c+=0.3; });
    // two fingers at one fret lie in order across the strings: the higher finger on the higher string
    for(let i=0;i<L.length;i++) for(let j=0;j<L.length;j++){ const a=L[i], b=L[j]; if(a.g<b.g&&a.f===b.f&&a.s<b.s) c+=0.6; }
    return {c,mean}; }
  function fingering(evs){
    const times=[...new Set(evs.map(e=>e.t))].sort((a,b)=>a-b), warn=[];
    const frames=times.map(t0=>{ const snd=evs.filter(e=>e.t<=t0&&t0<e.t+e.d), nw=evs.filter(e=>e.t===t0);
      // a common grip struck whole: fingered as it is taught
      let chart=null; if(NSTR===6&&nw.length>=3){ const c=[]; for(let s=NSTR-1;s>=0;s--){ const e=nw.find(x=>x.s===s); c.push(e?String(e.f):'x'); }
        const key=c.join(''); if(GRIPMAP[key]&&!nw.some(e=>e.g)&&snd.length===nw.length) chart=GRIPMAP[key]; }
      return {t:t0,snd,nw,chart}; });
    let states=[{a:new Map(),c:0,mean:null,prev:null,L:[]}];
    frames.forEach((F,k)=>{
      const fretNew=F.nw.filter(e=>e.f>0), opens=F.snd.filter(e=>e.f===0).map(e=>e.s), next=new Map();
      const fixedOf=e=>{ if(e.g) return e.g; if(F.chart){ const c=+F.chart[NSTR-1-e.s]; if(c>=1) return c; } return 0; };
      const tryAll=strict=>{ for(const S of states){
          const held=F.snd.filter(e=>e.f>0&&e.t<F.t&&S.a.has(e.id)).map(e=>({e,g:S.a.get(e.id)}));
          const usedG=new Set(held.map(h=>h.g)), heldBar=held.filter(h=>h.g===1).length>1;
          const prevAt={}; S.L.forEach(x=>{ prevAt[x.s+':'+x.f]=x.g; });
          const opts=[];
          // plain: one finger each
          const free=[1,2,3,4].filter(g=>!usedG.has(g));
          if(fretNew.length<=free.length) perms(free,fretNew.length).forEach(p=>opts.push(fretNew.map((e,i)=>({e,g:p[i]}))));
          // a barre: finger 1 across the lowest fret sounding
          const all=held.map(h=>({s:h.e.s,f:h.e.f})).concat(fretNew.map(e=>({s:e.s,f:e.f})));
          if(all.length>=2){ const fb=Math.min(...all.map(x=>x.f)), under=fretNew.filter(e=>e.f===fb), rest=fretNew.filter(e=>e.f!==fb);
            if(under.length+held.filter(h=>h.e.f===fb&&h.g===1).length>=2&&(!usedG.has(1)||heldBar||held.some(h=>h.g===1&&h.e.f===fb))){
              const free2=[2,3,4].filter(g=>!usedG.has(g));
              if(rest.length<=free2.length) perms(free2,rest.length).forEach(p=>opts.push(under.map(e=>({e,g:1})).concat(rest.map((e,i)=>({e,g:p[i]}))))); } }
          for(const o of opts){
            if(o.some(x=>{ const fx=fixedOf(x.e); return fx&&fx!==x.g; })) continue;
            const L=held.map(h=>({g:h.g,s:h.e.s,f:h.e.f,id:h.e.id})).concat(o.map(x=>({g:x.g,s:x.e.s,f:x.e.f,id:x.e.id})));
            if(!validHand(L,opens,strict)) continue;
            const bar=L.filter(x=>x.g===1).length>1, {c,mean}=costOf(L,S.mean,bar&&!heldBar,prevAt);
            const a=new Map(); L.forEach(x=>a.set(x.id,x.g));
            const key=L.map(x=>x.id+'.'+x.g).sort().join(','), cc=S.c+c;
            if(!next.has(key)||next.get(key).c>cc) next.set(key,{a,c:cc,mean,prev:S,L,k}); } } };
      tryAll(true);
      if(!next.size){ tryAll(false); if(fretNew.length) warn.push(F.t); }       // out of the hand's reach: the nearest it can do
      if(!next.size){ const S=states[0], a=new Map(S.a); fretNew.forEach((e,i)=>a.set(e.id,Math.min(4,i+1))); next.set('x'+k,{a,c:S.c+9,mean:S.mean,prev:S,L:fretNew.map((e,i)=>({g:Math.min(4,i+1),s:e.s,f:e.f,id:e.id})),k}); }
      states=[...next.values()].sort((x,y)=>x.c-y.c).slice(0,48); });
    // back through the best path: each frame's hand, each tone's finger
    const pathS=[]; let S=states[0]; while(S&&S.prev){ pathS.unshift(S); S=S.prev; }
    const fing={}; pathS.forEach(S=>S.L.forEach(x=>{ if(fing[x.id]===undefined) fing[x.id]=x.g; }));
    return {frames,path:pathS,fing,warn}; }

  /* ---------- the drill compiled for the engine ---------- */
  let C=null;                                                          // {D, fig, hands, chordsAt, frames, ...}
  const STRUM=0.022;
  function compile(){
    const evs=M.ev.map(e=>Object.assign({},e)), TT=total(), LOOPB=TT/TPQ;
    if(!evs.length){ C={empty:true,frames:[],hands:[],sets:[],opens:[],pls:[],warn:[]}; return C; }
    const FG=fingering(evs), plan=[], fig=[], hands=[], sets=[], opens=[], pls=[], strumAt=new Set(), lift=[];
    const GR=strokeGrid(), upAt=t=>{ const g=GR.find(q=>Math.abs(q.b*TPQ-t)<1e-6); return !!g&&g.up; };
    let lastH=null;
    FG.frames.forEach((F,k)=>{
      const S=FG.path[k], L=S?S.L:[];
      const bar=L.filter(x=>x.g===1).length>1?{f:L.find(x=>x.g===1).f,low:Math.max(...L.filter(x=>x.g===1).map(x=>x.s))}:null;
      const pl=L.filter(x=>!(bar&&x.g===1)).map(x=>({g:x.g,s:x.s,f:x.f})); if(bar) pl.push({g:1,s:bar.low,f:bar.f,barre:true});
      const H=pl.length?handFor(pl):(lastH?cloneHand(lastH):handFor([],Math.max(1,(evs.find(e=>e.f>0)||{f:1}).f-1),NSTR-1));
      if(pl.length) lastH=H; hands.push(H); pls.push(pl); sets.push(new Set(L.map(x=>x.g)));
      opens.push(F.snd.filter(e=>e.f===0).map(e=>e.s));
      lift.push(Math.max(-1,...F.snd.filter(e=>e.f>0).map(e=>e.t+e.d)));   // the grip is let go when its fretted tones end
      const up=F.nw.length>1&&upAt(F.t), nw=F.nw.slice().sort((a,b)=>up?a.s-b.s:b.s-a.s), nextT=   // a strum on an upstroke sweeps high to low
        k<FG.frames.length-1?FG.frames[k+1].t:TT+FG.frames[0].t;
      const spread=nw.length>1?Math.min(STRUM*drill.bpm/60,0.6*(nextT-F.t)/TPQ/(nw.length-1)):0;
      if(nw.length>1) strumAt.add(F.t);
      nw.forEach((e,i)=>{ const off=i*spread;
        plan.push({string:e.s,fret:e.f,pitch:e.f,push:0,finger:e.f>0?(FG.fing[e.id]||0):0,frame:k,pick:true,glide:false,pre:false,kind:'pick',hi:false,
          vel:Math.pow(0.96,i)*(up?0.75:1),up,line:nw.length===1,ev:e.id,t:e.t,len:e.d,off:e.d/TPQ-off});
        fig.push({s:e.t/TPQ+off}); }); });
    // where each tone's string is next struck: room to still it at its end, or not
    plan.forEach(p=>{ const later=plan.filter(q=>q.string===p.string&&q.t>p.t).map(q=>q.t), first=Math.min(...plan.filter(q=>q.string===p.string).map(q=>q.t));
      const nt=later.length?Math.min(...later):first+TT; p.gap=(nt-(p.t+p.len))/TPQ; });
    fig.forEach((e,i)=>{ e.d=i<fig.length-1?fig[i+1].s-e.s:LOOPB-e.s+fig[0].s; });
    const g=fig.reduce((a,e,i)=>gcd(a,Math.round(plan[i].t)),TPQ), strokes=Math.min(4,Math.max(2,TPQ/g));   // (the pick runs on its own strokes: strokeGrid)
    const D={chord:true,custom:true,walk:true,art:'custom',dir:'up',means:'pick',ham:false,pull:false,plan,bars:M.bars,
      frames:[{string:plan[0].string,tones:[],pl:pls[0],hand:hands[0]}],
      lo:{s:plan[0].string,f:plan[0].fret,g:plan[0].finger},hi:{s:plan[Math.min(1,plan.length-1)].string,f:plan[Math.min(1,plan.length-1)].fret,g:plan[Math.min(1,plan.length-1)].finger}};
    C={D,fig,hands,sets,opens,pls,frames:FG.frames,fing:FG.fing,warn:FG.warn,strokes,strumAt,loop:LOOPB,lift};
    return C; }
  const gcd=(a,b)=>{ a=Math.abs(a); b=Math.abs(b); while(b){ [a,b]=[b,a%b]; } return a||TPQ; };
  function useC(){ if(!C||C.empty){ DRILL=null; FIG=[{s:0,d:4}]; LOOP=total()/TPQ; return; }
    FIG=C.fig; LOOP=C.loop; STROKES=C.strokes; BAR_START=i=>!!FIG[i]&&Math.abs((FIG[i].s*TPQ)%barT(M.meter))<1e-6; DRILL=C.D; }
  function setPulse(){ const u=pulseT(M.meter)/TPQ, B=barT(M.meter); PULSE={u,acc:n=>((Math.round(n*u*TPQ)%B)+B)%B===0}; }

  /* ---------- what is in force at a moment ---------- */
  const chordAt=t=>{ let c=null; for(const x of M.ch){ if(x.t<=t+1e-6) c=x; else break; } return c||(M.ch.length?M.ch[M.ch.length-1]:null); };
  // Do's pitch in force at t: the last chord symbol with a function at or before t (the drill loops, so before the first,
  // the last); none at all, null — the ring stays as the listener turns it
  let lastDo=undefined;
  const doAt=t=>{ const withF=M.ch.filter(c=>c.syl); if(!withF.length) return null; let c=null; for(const x of withF){ if(x.t<=t+1e-6) c=x; } c=c||withF[withF.length-1];
    return ((c.root-fromDo(c.syl))%12+12)%12; };
  function orient(doPc,force){ if(doPc===null||doPc===PHI.doPc&&!force) return; let s0=0, f0=99; for(let s=0;s<NSTR;s++) for(let f=0;f<12;f++) if(pcOf(s,f)===doPc&&f<f0){ s0=s; f0=f; }
    pagePhi(PRE==='csm'?{anchor:{s:s0,f:f0,deg:'do'},topPc:curL().root}:{anchor:{s:s0,f:f0,deg:'do'},top:PRE?'do':'re'}); }   // (an exercise page: its mode's root at 12 o'clock — an anti's too)
  /* THE MODE FOLLOWS THE LINE (an exercise page): a tone held — longer than a beat, alone — is heard as the mode's root
     (Fa, Sol or Do held in the walks, each its own mode); a strummed chord restores its own root's mode. In force from
     that moment to the next, on the Ring (its mode cone), the TAB (its light fading across the span) and the fretboard. */
  let MODES=[];
  function modeEvents(){ const out=[], ons=[...new Set(M.ev.map(e=>e.t))].sort((a,b)=>a-b);
    ons.forEach(t=>{ const g=M.ev.filter(e=>e.t===t);
      if(g.length>1){ const c=chordAt(t); if(!c) return; const r=c.root, at=lowest(g.filter(e=>pcOf(e.s,e.f)===r))||lowest(g); out.push({t,root:r,at,id:'m'+t}); }
      else if(g[0].d>TPQ) out.push({t,root:pcOf(g[0].s,g[0].f),at:g[0],id:'m'+t}); });
    return out; }
  const modeAt=t=>{ let m=null; for(const x of MODES){ if(x.t<=t+1e-6) m=x; else break; } return m||(MODES.length?MODES[MODES.length-1]:null); };
  const frameAt=t=>{ if(!C||C.empty) return -1; let k=-1; C.frames.forEach((F,i)=>{ if(F.t<=t+1e-6) k=i; }); return k; };
  const soundingAt=t=>M.ev.filter(e=>e.t<=t+1e-6&&t<e.t+e.d-1e-6);

  /* ---------- the TAB: laid out for the metre, drawn with the drill, edited in place ---------- */
  const xT=t=>xBeat(t/TPQ), tOfX=x=>(x-TB.x0-TB.cw/2)/(2*TB.cw)*TPQ;
  const tsig=[...tab.querySelectorAll('text.tsig')];
  const laneY=-12, stemTop=TB.rowY[NSTR-1]+10;
  const bgG=el('g',{'pointer-events':'none'},null); tab.insertBefore(bgG,tab.firstChild);
  const durG=el('g',{'pointer-events':'none'},null); tab.insertBefore(durG,noteG);
  const curG=el('g',{'pointer-events':'none'},tab);
  const curBox=el('rect',{class:'cuCursor',rx:3,height:18},curG), curTick=el('path',{class:'cuCaret'},curG);
  let durBars=[], chordArt=[], minStep=TPQ;
  function lay(){
    const TT=total(), B=barT(M.meter), Q=TT/TPQ;
    const steps=M.ev.map(e=>e.t).concat(M.ev.map(e=>e.t+e.d),M.ch.map(c=>c.t),[TT]); let ms=pal.dur();
    const ts=[...new Set(steps)].sort((a,b)=>a-b); for(let i=1;i<ts.length;i++) ms=Math.min(ms,ts[i]-ts[i-1]); minStep=ms;
    TB.cw=Math.max(PRE?36:23.5,(886-TB.x0)/(2*Q),13*TPQ/(2*ms)); TB.s1=TB.x1=TB.x0+2*Q*TB.cw; TB.boff=0;   // (an exercise page: room for its strums to read)
    // (an exercise page: the first bars again after the repeat, and room past them for the view to follow the ball)
    const W=Math.max(900,Math.round(TB.s1+14+(PRE?GHOST_GAP+2*TB.cw*Math.min(M.bars,GHOST_BARS)*B/TPQ+360:0))); tab.setAttribute('viewBox','0 -34 '+W+' 272'); tab.style.width=(100*W/900).toFixed(2)+'%'; tab.style.maxWidth=W>900?'none':'';
    tabPanel.classList.toggle('wide',W>900); if(W<=900) tabPanel.scrollLeft=0;
    rows.forEach(r=>r.setAttribute('x2',TB.s1));
    while(gridG.firstChild) gridG.removeChild(gridG.firstChild);
    const xb=t=>TB.x0+2*TB.cw*t/TPQ;                                   // a bar line: half a cell before the bar's first beat
    for(let b=1;b<M.bars;b++) el('line',{x1:xb(b*B),y1:TB.rowY[0],x2:xb(b*B),y2:TB.rowY[NSTR-1],class:'inkS','stroke-width':1},gridG);
    const re=TB.s1; [[re,4],[re-6,1]].forEach(([x,w])=>el('line',{x1:x,y1:TB.rowY[0],x2:x,y2:TB.rowY[NSTR-1],class:'inkS','stroke-width':w},gridG));
    DOTS.map(midY).forEach(y=>el('circle',{cx:re-12,cy:y,r:2.4,class:'ink'},gridG));
    const P_=pulseT(M.meter); for(let t=0;t<TT;t+=P_){ const x=xT(t); el('line',{x1:x-5,y1:TB.floor+1.5,x2:x+5,y2:TB.floor+1.5,class:'faintS','stroke-width':2,'stroke-linecap':'round'},gridG); }
    if(tsig.length===2){ tsig[0].textContent=M.meter[0]; tsig[1].textContent=M.meter[1]; }
    // the bar numbers, small, over each bar's start
    for(let b=0;b<M.bars;b++){ const t=el('text',{x:xb(b*B)+(b?4:2),y:TB.rowY[0]-9,class:'cuBarNo'},gridG); t.textContent=b+1; } }
  // a tone's rhythmic value, as engraved: the longest single name it begins with
  const valueOf=len=>{ for(const [v,n] of NAMED) if(v<=len) return {v,n,base:n[0],dot:n.includes('.'),trip:n.includes('3')}; return {v:len,n:'x',base:'x',dot:false,trip:false}; };
  const BEAMS={w:0,h:0,q:0,e:1,s:2,x:3};
  function tabDraw(D){
    lay(); durBars=[]; chordArt=[]; while(bgG.firstChild) bgG.firstChild.remove(); while(durG.firstChild) durG.firstChild.remove();
    const plan=D?D.plan:[];
    // the numbers on their lines (a strum's numbers stacked, as written), each with its length drawn along its string
    plan.forEach((n,i)=>{ const x=xT(n.t), y=TB.rowY[n.string], txt=String(n.fret), o=numberAt(x,y,txt); tabNotes[i]=o;
      const g=C&&C.fing?C.fing[n.ev]:0; if(g&&n.fret>0&&M.ev.find(e=>e.id===n.ev&&e.g)&&!plan.some(q=>q!==n&&q.t===n.t)){ const fl=el('text',{x:x+3.8*txt.length+5,y:y+6,class:'cuFing'},noteG); fl.textContent=g; o.extra=[fl]; }
      const x0=x+3.8*txt.length+5, x1=xT(n.t+n.len)-7;
      durBars.push(x1>x0+1?el('line',{x1:x0,y1:y,x2:x1,y2:y,class:'cuDur'},durG):null); });
    { const by={}; plan.forEach((n,i)=>{ (by[n.t]=by[n.t]||[]).push(n); });
      Object.values(by).forEach(g=>{ if(g.length<2) return; const x=xT(g[0].t)+13, ya=TB.rowY[g[0].string], yz=TB.rowY[g[g.length-1].string], dir=yz<ya?-1:1;
        el('line',{x1:x,y1:ya,x2:x,y2:yz-dir*6,class:'inkS','stroke-width':1.1},noteG); arrowHead(x,yz,dir); }); }
    // rhythm below the staff: a stem for each moment struck, beamed by the beat, flagged alone; a dot, a triplet's 3
    const P_=pulseT(M.meter), groups=[...new Set(plan.map(n=>n.t))].sort((a,b)=>a-b).map(t=>{ const len=Math.max(...plan.filter(n=>n.t===t).map(n=>n.len)); return {t,x:xT(t),V:valueOf(len)}; });
    const stemL=26, stemS=13, foot=stemTop+stemL;
    groups.forEach(G=>{ const b=G.V.base; if(b==='w') return; el('line',{x1:G.x,y1:stemTop,x2:G.x,y2:stemTop+(b==='h'?stemS:stemL),class:'inkS','stroke-width':1.3},noteG);
      if(G.V.dot) el('circle',{cx:G.x+6,cy:stemTop+(b==='h'?stemS:stemL)-2,r:1.9,class:'ink'},noteG); });
    const byPulse={}; groups.forEach(G=>{ if(BEAMS[G.V.base]>0){ const k=Math.floor(G.t/P_); (byPulse[k]=byPulse[k]||[]).push(G); } });
    Object.values(byPulse).forEach(arr=>{
      if(arr.length===1){ const G=arr[0]; for(let j=0;j<BEAMS[G.V.base];j++) el('path',{d:'M'+G.x+' '+(foot-j*6)+' q9 -4 8 -14',class:'cuFlag'},noteG); return; }
      const xa=arr[0].x, xz=arr[arr.length-1].x; el('rect',{x:xa-0.65,y:foot-3.5,width:xz-xa+1.3,height:3.5,class:'ink'},noteG);
      for(let lv=1;lv<3;lv++) arr.forEach((G,j)=>{ if(BEAMS[G.V.base]<=lv) return; const nb=arr[j+1], pb=arr[j-1], y=foot-3.5-lv*5.5;
        if(nb&&BEAMS[nb.V.base]>lv) el('rect',{x:G.x-0.65,y,width:nb.x-G.x+1.3,height:3.2,class:'ink'},noteG);
        else if(!(pb&&BEAMS[pb.V.base]>lv)){ const w=Math.min(9,0.4*TB.cw), toR=!!nb; el('rect',{x:toR?G.x:G.x-w,y,width:w,height:3.2,class:'ink'},noteG); } }); });
    // a triplet's 3, once under each beat that holds one
    const trip={}; groups.forEach(G=>{ if(G.V.trip){ const k=Math.floor(G.t/P_); (trip[k]=trip[k]||[]).push(G.x); } });
    Object.values(trip).forEach(xs=>{ const t=el('text',{x:(Math.min(...xs)+Math.max(...xs))/2,y:foot+12,class:'cuTrip'},noteG); t.textContent='3'; });
    // the chord symbols: each over its moment in the lane above the ball, its name then its root's function; behind the
    // staff its span faintly lit in that function's colour
    const yT=TB.rowY[0]-30, yB=TB.rowY[NSTR-1]+8, TT=total();
    const light=(spans,i,c)=>{ const x0=xT(c.t)-TB.cw/2, nx=i<spans.length-1?xT(spans[i+1].t)-TB.cw/2:TB.s1, id='cuG'+c.id;
      const gr=el('linearGradient',{id,x1:0,y1:0,x2:1,y2:0},bgG), s0=el('stop',{offset:0},gr); el('stop',{offset:1,'stop-opacity':0},gr);
      return {s0,r:el('rect',{x:x0,y:yT,width:Math.max(1,nx-x0),height:yB-yT,fill:'url(#'+id+')',opacity:0},bgG)}; };
    MODES=PRE?modeEvents():[]; modeArt=[];
    // a run of the same mode (a chord strummed again, a held tone that is its root) is one light: it comes up smoothly at
    // each strum and fades from it, the fade reaching nothing at the run's end — no hard edges inside a run
    { const runs=[]; MODES.forEach(m=>{ const r=runs[runs.length-1]; if(r&&r.root===m.root) r.ms.push(m); else runs.push({t:m.t,root:m.root,ms:[m],id:m.id}); });
      runs.forEach((R,i)=>{ const x0=xT(R.t)-TB.cw/2, x1=i<runs.length-1?xT(runs[i+1].t)-TB.cw/2:TB.s1, w=Math.max(1,x1-x0), id='cuG'+R.id;
        const gr=el('linearGradient',{id,x1:0,y1:0,x2:1,y2:0},bgG), xs=R.ms.map(m=>xT(m.t)), ramp=Math.max(6,TB.cw*0.6), stops=[];
        const env=x=>{ let v=0; xs.forEach(xi=>{ const a=x<xi-ramp?0:(x>=xi?1:(()=>{ const u=(x-(xi-ramp))/ramp; return u*u*(3-2*u); })()); v=Math.max(v,a*Math.max(0,1-(x-Math.max(x0,xi-ramp))/(x1-Math.max(x0,xi-ramp))*(x>xi?1:0))); }); return v; };
        const N=Math.max(8,Math.min(96,Math.round(w/6))); for(let j=0;j<=N;j++){ const x=x0+w*j/N; stops.push(el('stop',{offset:(j/N).toFixed(4),'stop-opacity':env(x).toFixed(3)},gr)); }
        modeArt.push({m:R.ms[0],ms:R.ms,stops,r:el('rect',{x:x0,y:yT,width:w,height:yB-yT,fill:'url(#'+id+')',opacity:0},bgG)}); }); }
    M.ch.forEach((c,i)=>{ const {s0,r}=PRE?{s0:null,r:null}:light(M.ch,i,c);
      const t=el('text',{x:xT(c.t)-6,y:laneY,class:'cuChord'},noteG), L=el('tspan',{},t), S=el('tspan',{class:'cuSyl',dx:5},t);
      L.textContent=c.name; chordArt.push({c,s0,r,L,S}); });
    sylArt=[]; if(PRE){ const y=((TB.floor+TB.rowY[0])/2+4).toFixed(1);
      plan.forEach(n=>{ if(plan.some(q=>q!==n&&q.t===n.t)) return; const t=el('text',{x:xT(n.t),y,class:'sylTab cuSylFix'},noteG); sylArt.push({t,n}); }); }
    if(PRE) ghostBar(); placeCursor(); paintChords(); }
  /* AFTER THE REPEAT SIGN (an exercise page): the first bar again — a live copy of it, lit as it is lit — so at the repeat the
     ball bounces over the sign and lands in it, and the TAB goes on from there with nothing jumping back: once the ball
     passes into the second bar, the view is moved back by the loop's length at once, and what is on screen is the same. */
  const GHOST_GAP=48, GHOST_BARS=3; let ghostG=null;   // (the first bars, enough for the view to keep the ball where it follows it)
  function ghostBar(){ if(ghostG) ghostG.remove(); const B=barT(M.meter), G=Math.min(M.bars,GHOST_BARS), xb=TB.x0+2*TB.cw*G*B/TPQ, dx=TB.s1+GHOST_GAP-TB.x0;
    [[bgG,'cuBgG'],[durG,'cuDurG'],[noteG,'cuNoteG'],[gridG,'cuGridG']].forEach(([g,id])=>{ if(!g.id) g.id=id; });
    ghostG=el('g',{transform:'translate('+dx.toFixed(2)+' 0)','pointer-events':'none'},tab);
    const cp=el('clipPath',{id:'cuGhostClip'},ghostG); el('rect',{x:TB.x0+1,y:-40,width:xb-TB.x0-3,height:320},cp);
    TB.rowY.forEach(y=>el('line',{x1:TB.x0-4,y1:y,x2:xb,y2:y,class:'inkS','stroke-width':1,opacity:0.55},ghostG));
    for(let b=1;b<=G;b++){ const x=TB.x0+2*TB.cw*b*B/TPQ; el('line',{x1:x,y1:TB.rowY[0],x2:x,y2:TB.rowY[NSTR-1],class:'inkS','stroke-width':1},ghostG); }
    const cg=el('g',{'clip-path':'url(#cuGhostClip)'},ghostG);
    [bgG,durG,noteG,gridG].forEach(g=>{ const u=el('use',{},cg); u.setAttribute('href','#'+g.id); }); }
  let sylArt=[], modeArt=[];
  // the chord symbols' colours: their root's function under the orientation in force where they stand (g(x) on)
  function paintChords(cur){ const L=FIELD.lit, ink=inkColour();
    modeArt.forEach(a=>{ const d0=doAt(a.m.t), dp=d0===null?PHI.doPc:d0, col=relRGB(((a.m.root-(dp+2))%12+12)%12), on=a.ms.includes(curMode), cs=rgbS(col);
      if(a.cs!==cs){ a.cs=cs; a.stops.forEach(st=>st.setAttribute('stop-color',cs)); } a.r.setAttribute('opacity',(L*(on?0.36:0.12)).toFixed(3)); });
    sylArt.forEach(({t,n})=>{ const d0=doAt(n.t), dp=d0===null?PHI.doPc:d0, k=((pcOf(n.string,n.pitch)-(dp+2))%12+12)%12;
      t.textContent=SOLN[k]; t.style.fill=L>0.001?rgbS(mixRGB(ink,relRGB(k),L)):rgbS(ink); });
    chordArt.forEach(a=>{ const d0=doAt(a.c.t), dp=d0===null?PHI.doPc:d0, k=((a.c.root-(dp+2))%12+12)%12, col=relRGB(k), on=a.c===cur;   // the colour the TAB's numbers take (Diatonic filtering as they do)
      if(a.r){ a.s0.setAttribute('stop-color',rgbS(col)); a.r.setAttribute('opacity',(L*(on?0.36:0.12)).toFixed(3)); }
      const c=L>0.001?rgbS(mixRGB(ink,col,L)):rgbS(ink); a.L.style.fill=c; a.S.style.fill=c; a.S.textContent=SOLN[k]; }); }
  function placeCursor(){ const show=!T.on&&document.activeElement===tab;
    curG.setAttribute('visibility',show?'visible':'hidden'); if(!show) return;
    const x=xT(cur.t), e=M.ev.find(v=>v.s===cur.s&&v.t===cur.t), len=e?e.d:pal.dur(), x1=Math.max(x+12,xT(cur.t+len)-8);
    curBox.setAttribute('x',(x-11).toFixed(1)); curBox.setAttribute('width',(x1-x+11).toFixed(1)); curBox.setAttribute('y',TB.rowY[cur.s]-9);
    curTick.setAttribute('d','M'+(x-5)+' '+(laneY+12)+' L'+(x+5)+' '+(laneY+12)+' L'+x+' '+(laneY+18)+' Z'); }

  /* ---------- the panel ---------- */
  const pal={v:'e',dot:false,trip:false,dur(){ let v=BASEV[this.v]; if(this.dot) v*=1.5; if(this.trip) v*=2/3; return Math.round(v); },grid(){ let v=BASEV[this.v]; if(this.trip) v*=2/3; return Math.round(v); }};
  const cur={t:0,s:0};
  const panel=document.createElement('div'); panel.className='gripPanel cuPanel';
  panel.innerHTML=
     '<div class="cuRow"><input class="cuTitle" id="cuTitle" type="text" spellcheck="false" aria-label="Title">'
    +'<label class="cuLbl">Metre <select id="cuMeter">'+METERS.map(m=>'<option value="'+m.join('/')+'">'+m.join('/')+'</option>').join('')+'</select></label>'
    +'<span class="cuLbl">Bars <span class="cseg"><button type="button" id="cuBarDn" aria-label="One bar fewer">−</button><b id="cuBars">2</b><button type="button" id="cuBarUp" aria-label="One bar more">+</button></span></span>'
    +'<span class="cuSp"></span><button type="button" class="pill" id="cuNew">New</button><button type="button" class="pill" id="cuLoad">Load</button><button type="button" class="pill" id="cuSave">Save</button>'
    +'<input type="file" id="cuFile" accept=".json,application/json" hidden></div>'
    +'<div class="cuRow"><span class="cuLbl">Length</span><span class="cseg" id="cuPal">'+[['w','Whole'],['h','Half'],['q','Quarter'],['e','Eighth'],['s','16th']].map(([k,n])=>'<button type="button" data-v="'+k+'" title="'+n+' ('+k+')">'+n+'</button>').join('')+'</span>'
    +'<span class="cseg"><button type="button" id="cuDot" title="Dotted (.)">Dotted</button><button type="button" id="cuTrip" title="Triplet (t)">Triplet</button></span>'
    +'<label class="cuLbl">Chord <input id="cuChord" class="cuChordIn" type="text" spellcheck="false" placeholder="Am_La" aria-label="Chord symbol at the cursor"></label></div>'
    +'<textarea id="cuText" class="cuText" rows="3" spellcheck="false" aria-label="The drill as text"></textarea>'
    +'<div class="cuMsg" id="cuMsg" aria-live="polite"></div>'
    +'<details class="cuKey"><summary>Text</summary><p><b>q h w e s x</b> quarter, half, whole, eighth, sixteenth, 32nd — <b>.</b> dotted, <b>3</b> triplet (<b>e3</b>); a length holds until the next. '
    +'<b>6:3</b> string 6 fret 3 (1 = high e) · <b>6:3+5:2</b> together · <b>@2</b> finger · <b>=h</b> held for a half · <b>r</b> rest · <b>~</b> tie · <b>|</b> bar · <b>Am_La</b> chord, its root La · <b>Am</b> chord in the orientation in force.</p>'
    +'<p>On the TAB: click a string, type the fret; <b>w h q e s . t</b> the length; <b>+ −</b> longer, shorter; <b>← →</b> along, <b>↑ ↓</b> strings; <b>⌥1–4</b> finger, <b>⌥0</b> the hand’s choice; <b>c</b> chord; <b>⌫</b> remove; <b>⌘Z</b> undo. A fret clicked on the board is written at the cursor.</p></details>';
  fb.parentElement.after(panel);
  { const st=document.createElement('style'); st.textContent=
    '.cuPanel{ display:grid; gap:10px } .cuRow{ display:flex; flex-wrap:wrap; align-items:center; gap:8px 14px } .cuSp{ flex:1 }'
   +'.cuLbl{ font-size:12px; letter-spacing:.08em; text-transform:uppercase; font-weight:600; color:var(--mid); display:inline-flex; align-items:center; gap:8px }'
   +'.cuTitle{ font:inherit; font-size:20px; font-weight:700; color:var(--ink); background:transparent; border:0; border-bottom:1.5px solid var(--faint); padding:2px 0; min-width:8em; max-width:100% }'
   +'.cuTitle:focus{ outline:none; border-bottom-color:var(--ink) }'
   +'.cuPanel select, .cuChordIn{ font:inherit; font-size:14px; color:var(--ink); background:var(--bg); border:1.5px solid var(--mid); border-radius:8px; padding:4px 8px; text-transform:none; letter-spacing:0; font-weight:500 }'
   +'.cuChordIn{ width:7.5em; font-family:var(--serif); font-style:italic; font-size:16px }'
   +'.cseg{ display:inline-flex; align-items:center; border:1.5px solid var(--mid); border-radius:999px; overflow:hidden; text-transform:none; letter-spacing:0 } .cseg button{ font:inherit; font-size:14px; font-weight:600; padding:5px 12px; border:0; background:var(--bg); color:var(--ink); cursor:pointer } .cseg button+button, .cseg b+button{ border-left:1.5px solid var(--mid) } .cseg button.on{ background:var(--ink); color:var(--bg) } .cseg b{ min-width:2.2em; text-align:center; color:var(--ink); font-size:14px; border-left:1.5px solid var(--mid); padding:5px 0 }'
   +'.cuText{ font-family:ui-monospace,Menlo,Consolas,monospace; font-size:15px; line-height:1.5; color:var(--ink); background:var(--bg); border:1.5px solid var(--faint); border-radius:8px; padding:8px 10px; width:100%; box-sizing:border-box; resize:vertical }'
   +'.cuText:focus{ outline:none; border-color:var(--mid) }'
   +'.cuMsg{ font-size:13px; color:var(--mid); min-height:1em } .cuMsg.on{ color:var(--ink) }'
   +'.cuKey{ font-size:13px; color:var(--mid) } .cuKey summary{ cursor:pointer; font-size:12px; letter-spacing:.08em; text-transform:uppercase; font-weight:600 } .cuKey p{ margin:6px 0 } .cuKey b{ color:var(--ink); font-family:ui-monospace,Menlo,monospace; font-weight:600 }'
   +'#tab .cuCursor{ fill:var(--ink); fill-opacity:.07; stroke:var(--ink); stroke-width:1.2; stroke-dasharray:3 2 } #tab .cuCaret{ fill:var(--mid) }'
   +'#tab .cuDur{ stroke-linecap:round; stroke:var(--ink) }'
   +'#tab .cuChord{ font-size:17px; font-weight:700; fill:var(--ink) } #tab .cuSyl{ font-family:var(--serif); font-style:italic; font-weight:500 }'
   +'#tab .cuFing{ font-size:9.5px; font-weight:700; fill:var(--mid); text-anchor:middle } #tab .cuFlag{ fill:none; stroke:var(--ink); stroke-width:1.5 } #tab .cuTrip{ font-size:11px; font-style:italic; fill:var(--ink); text-anchor:middle }'
   +'.cuClear{ position:absolute; top:0; right:0; z-index:2; font-size:12px; padding:4px 12px }'+'.roll.big{ --rh:62px } .roll.big .rollRow{ font-size:calc(var(--rh) * .8) } .roll.big .rollRow span{ transition:opacity .25s, text-shadow .25s } .roll.big .rollRow.cur span.unlit{ opacity:.42 } .roll.big .rollRow.cur span.lit{ opacity:1; text-shadow:0 0 18px currentColor }'+'#tab .cuBarNo{ font-size:10px; fill:var(--mid) } #tab:focus{ outline:none } #tabPanel{ cursor:text }';
    document.head.appendChild(st); }
  const titleIn=$q('cuTitle'), meterIn=$q('cuMeter'), barsEl=$q('cuBars'), palEl=$q('cuPal'), dotB=$q('cuDot'), tripB=$q('cuTrip'), chordIn=$q('cuChord'), textEl=$q('cuText'), msgEl=$q('cuMsg'), fileIn=$q('cuFile');
  // keys typed in the panel stay in the panel (the hand's finger keys, the ring's, Space)
  panel.addEventListener('keydown',e=>{ e.stopPropagation(); },false);
  const markPal=()=>{ palEl.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.v===pal.v)); dotB.classList.toggle('on',pal.dot); tripB.classList.toggle('on',pal.trip); };
  // the page around it: one page, no Prev/Next or Hold; the header names the drill
  ['means','pageCt','hold','clear'].forEach(id=>{ const e=$q(id); if(e) e.style.display='none'; }); { const p=$q('prev'); if(p) p.parentElement.style.display='none'; }
  // CLEAR, on the TAB: every tone and chord symbol gone (the title, metre, bars and tempo kept); ⌘Z brings them back
  if(!PRE){ const col=document.querySelector('.tabCol'), b=document.createElement('button'); b.type='button'; b.className='pill cuClear'; b.id='cuClear'; b.textContent='Clear';
    b.title='Clear the TAB: every tone and chord symbol (⌘Z undoes)'; col.style.position='relative'; col.appendChild(b);
    b.addEventListener('click',()=>{ if(!M.ev.length&&!M.ch.length) return; edit(()=>{ M.ev=[]; M.ch=[]; cur.t=0; }); tab.focus(); }); }
  tab.setAttribute('tabindex','0'); tab.setAttribute('aria-label','The drill in TAB: click a string and type a fret');
  tab.style.outline='none';

  /* ---------- changes: every edit goes through here (undo, the text, the save in the browser) ---------- */
  const UNDO=[], REDO=[]; const snap=()=>JSON.stringify({M,cur});
  function edit(fn,opts){ opts=opts||{}; if(T.on) stopAll(); UNDO.push(snap()); if(UNDO.length>200) UNDO.shift(); REDO.length=0;
    fn(); normalize(); if(!opts.keepText) textEl.value=serialize(); rebuild(); }
  function undo(redo){ const A=redo?REDO:UNDO, Bk=redo?UNDO:REDO; if(!A.length) return; if(T.on) stopAll(); Bk.push(snap()); const o=JSON.parse(A.pop()); M=o.M; Object.assign(cur,o.cur); normalize(); textEl.value=serialize(); syncCtl(); rebuild(); }
  function store(){ if(PRE) return; try{ localStorage.setItem('custom-drill-1',JSON.stringify(fileOf())); }catch(err){} }
  function rebuild(){ lastDo=undefined; cur.t=Math.min(cur.t,total()); setPulse(); compile(); useC(); refresh(); if(!DRILL) tabDraw(null); barsEl.textContent=M.bars; showMsg(); store(); stepNow(true); }
  let parseErr=[];
  function showMsg(){ const w=C&&C.warn?C.warn:[]; const B=barT(M.meter), at=t=>'bar '+(Math.floor(t/B)+1)+', beat '+(1+(t%B)/pulseT(M.meter)).toFixed(2).replace(/\.?0+$/,'');
    const m=parseErr.slice(0,3).concat(w.slice(0,2).map(t=>at(t)+': beyond the hand’s reach — fingered as near as it can'));
    msgEl.textContent=m.join(' · '); msgEl.classList.toggle('on',m.length>0); }
  function syncCtl(){ titleIn.value=M.title; meterIn.value=M.meter.join('/'); barsEl.textContent=M.bars; drill.bpm=M.bpm; const r=$q('bpm'), v=$q('bpmv'); if(r) r.value=M.bpm; if(v) v.textContent=M.bpm;
    const h=$q('structName'); if(h) h.textContent=M.title||'Custom'; document.title=M.title||'Custom'; }

  // the text, typed: read as it is typed (a moment after the last key), the TAB following; the line itself is left as
  // written until it is left, then written out again in its plain form
  let tt=0;
  textEl.addEventListener('input',()=>{ clearTimeout(tt); tt=setTimeout(()=>{ const {out,errs}=parse(textEl.value); parseErr=errs;
    edit(()=>{ M.ev=out.ev; M.ch=out.ch; M.bars=out.bars; },{keepText:true}); },280); });
  textEl.addEventListener('blur',()=>{ if(!parseErr.length) textEl.value=serialize(); });
  titleIn.addEventListener('input',()=>{ M.title=titleIn.value; syncCtl(); store(); });
  meterIn.addEventListener('change',()=>{ const [a,b]=meterIn.value.split('/').map(Number); edit(()=>{ const was=total(); M.meter=[a,b]; M.bars=Math.max(1,Math.ceil(was/barT(M.meter))); }); });
  $q('cuBarUp').addEventListener('click',()=>edit(()=>{ M.bars++; }));
  $q('cuBarDn').addEventListener('click',()=>{ if(M.bars<2) return; edit(()=>{ M.bars--; const TT=total(); M.ev=M.ev.filter(e=>e.t<TT); M.ev.forEach(e=>{ e.d=Math.min(e.d,TT-e.t); }); M.ch=M.ch.filter(c=>c.t<TT); cur.t=Math.min(cur.t,TT); });
    // the bars count only shrinks as far as what is written allows
  });
  palEl.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; setLen(b.dataset.v); tab.focus(); });
  dotB.addEventListener('click',()=>{ pal.dot=!pal.dot; if(pal.dot) pal.trip=false; applyLen(); tab.focus(); });
  tripB.addEventListener('click',()=>{ pal.trip=!pal.trip; if(pal.trip) pal.dot=false; applyLen(); tab.focus(); });
  $q('bpm').addEventListener('input',()=>{ M.bpm=drill.bpm; store(); });
  $q('bpm').addEventListener('change',()=>{ compile(); useC(); });
  chordIn.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); setChord(chordIn.value.trim()); tab.focus(); } else if(e.key==='Escape'){ e.preventDefault(); chordIn.value=''; tab.focus(); } });
  function setChord(txt){
    if(!txt){ if(M.ch.some(c=>c.t===cur.t)) edit(()=>{ M.ch=M.ch.filter(c=>c.t!==cur.t); }); return; }
    const m=/^([A-G][#♯b♭]?[^_\s]*)(?:[_\s]+(~?[A-Za-z]+))?$/.exec(txt); const syl=m&&m[2]?sylNorm(m[2]):null, c=m?chordOf(m[1],syl):null;
    if(!c||(m[2]&&!syl)){ parseErr=['“'+txt+'” is not a chord symbol (Am_La, or Am)']; showMsg(); parseErr=[]; return; }
    edit(()=>{ M.ch=M.ch.filter(x=>x.t!==cur.t); M.ch.push(Object.assign(c,{t:cur.t})); }); }

  // SAVE and LOAD: the drill as a file — its title, metre, tempo, the tones and chords, and the text line for reading
  const fileOf=()=>({kind:'tonal-field-custom-drill',version:1,title:M.title,meter:M.meter,bpm:M.bpm,bars:M.bars,text:serialize(),
    tones:M.ev.map(e=>{ const o={t:e.t,d:e.d,string:e.s+1,fret:e.f}; if(e.g) o.finger=e.g; return o; }),chords:M.ch.map(c=>({t:c.t,name:c.name,fn:c.syl||null}))});
  function fromFile(o){
    if(!o||o.kind!=='tonal-field-custom-drill') throw new Error('not a Custom drill file');
    const m=fresh(); m.title=String(o.title||'Custom'); if(Array.isArray(o.meter)&&METERS.some(x=>x[0]===o.meter[0]&&x[1]===o.meter[1])) m.meter=o.meter;
    m.bpm=Math.max(40,Math.min(140,+o.bpm||70)); m.bars=Math.max(1,+o.bars||1);
    if(Array.isArray(o.tones)) m.ev=o.tones.map(x=>{ const e={t:+x.t,d:+x.d,s:(+x.string)-1,f:+x.fret}; if(+x.finger>=1&&+x.finger<=4) e.g=+x.finger; return e; });
    else if(o.text){ M=m; const {out}=parse(o.text); m.ev=out.ev; m.ch=out.ch; m.bars=out.bars; }
    if(Array.isArray(o.chords)) m.ch=o.chords.map(x=>{ const syl=x.fn?sylNorm(String(x.fn)):null, c=chordOf(String(x.name||''),syl); return c?Object.assign(c,{t:+x.t}):null; }).filter(Boolean);
    return m; }
  const slug=s=>(s||'custom').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'custom';
  $q('cuSave').addEventListener('click',()=>{ const blob=new Blob([JSON.stringify(fileOf(),null,1)],{type:'application/json'}), a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download=slug(M.title)+'.json'; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500); });
  $q('cuLoad').addEventListener('click',()=>fileIn.click());
  fileIn.addEventListener('change',()=>{ const f=fileIn.files&&fileIn.files[0]; if(!f) return; const r=new FileReader();
    r.onload=()=>{ try{ const m=fromFile(JSON.parse(r.result)); edit(()=>{ M=m; cur.t=0; cur.s=0; }); syncCtl(); compile(); useC(); refresh(); if(!DRILL) tabDraw(null); }
      catch(err){ parseErr=['That file could not be read: '+err.message]; showMsg(); parseErr=[]; } fileIn.value=''; }; r.readAsText(f); });
  $q('cuNew').addEventListener('click',()=>{ edit(()=>{ const mt=M.meter; M=fresh(); M.meter=mt; M.bpm=drill.bpm; cur.t=0; cur.s=0; }); syncCtl(); textEl.focus(); });

  /* ---------- editing on the TAB ---------- */
  const evAt=(s,t)=>M.ev.find(e=>e.s===s&&e.t===t);
  function setLen(v){ pal.v=v; applyLen(); }
  function applyLen(){ markPal(); const e=evAt(cur.s,cur.t); if(e){ const d=pal.dur(); edit(()=>{ const x=evAt(cur.s,cur.t); x.d=d; }); } else placeCursor(); }
  let digit={s:-1,t:-1,at:0,v:''};
  function typeFret(ch){
    const now=performance.now(); let v=ch;
    if(digit.s===cur.s&&digit.t===cur.t&&now-digit.at<900&&digit.v.length===1&&+(digit.v+ch)<=FMAX) v=digit.v+ch;
    digit={s:cur.s,t:cur.t,at:now,v};
    const f=+v; edit(()=>{ const e=evAt(cur.s,cur.t); if(e){ e.f=f; if(e.g&&f===0) delete e.g; } else M.ev.push({t:cur.t,d:pal.dur(),s:cur.s,f}); if(cur.t>=total()) M.bars=Math.ceil((cur.t+1)/barT(M.meter)); }); }
  function moveT(dir){ const TT=total(), ons=[...new Set(M.ev.map(e=>e.t).concat(M.ch.map(c=>c.t)))].sort((a,b)=>a-b);
    if(dir>0){ const e=evAt(cur.s,cur.t), step=e?e.d:pal.grid(), nx=ons.find(t=>t>cur.t); cur.t=Math.min(TT,nx!==undefined?Math.min(nx,cur.t+step):cur.t+step); }
    else{ const pv=ons.filter(t=>t<cur.t).pop(); cur.t=Math.max(0,pv!==undefined?Math.max(pv,cur.t-pal.grid()):cur.t-pal.grid()); }
    cursorMoved(); }
  function cursorMoved(){ const c=M.ch.find(x=>x.t===cur.t); chordIn.value=c?c.name+(c.syl?'_'+c.syl:''):''; placeCursor(); stepNow(true); followCursor(); }
  function followCursor(){ if(!tabPanel.classList.contains('wide')) return; const k=tab.clientWidth/(TB.s1+14), x=xT(cur.t)*k;
    if(x<tabPanel.scrollLeft+40||x>tabPanel.scrollLeft+tabPanel.clientWidth-40) tabPanel.scrollLeft=Math.max(0,x-0.3*tabPanel.clientWidth); }
  tab.addEventListener('focus',placeCursor); tab.addEventListener('blur',()=>setTimeout(placeCursor,0));
  tab.addEventListener('keydown',e=>{ if(PRE) return;
    const k=e.key, mod=e.metaKey||e.ctrlKey;
    if(mod&&(k==='z'||k==='Z')){ e.preventDefault(); e.stopPropagation(); undo(e.shiftKey); return; }
    if(mod&&k==='y'){ e.preventDefault(); e.stopPropagation(); undo(true); return; }
    if(mod) return;
    let done=true;
    if(e.altKey&&/^Digit[0-4]$/.test(e.code)){ const g=+e.code.slice(5), x=evAt(cur.s,cur.t); if(x&&x.f>0) edit(()=>{ const y=evAt(cur.s,cur.t); if(g) y.g=g; else delete y.g; }); }
    else if(/^[0-9]$/.test(k)) typeFret(k);
    else if(k==='ArrowRight') moveT(1); else if(k==='ArrowLeft') moveT(-1);
    else if(k==='ArrowUp'){ cur.s=Math.max(0,cur.s-1); cursorMoved(); } else if(k==='ArrowDown'){ cur.s=Math.min(NSTR-1,cur.s+1); cursorMoved(); }
    else if(k==='Home'){ cur.t=0; cursorMoved(); } else if(k==='End'){ cur.t=total(); cursorMoved(); }
    else if('whqes'.includes(k)&&k.length===1) setLen(k);
    else if(k==='.'){ pal.dot=!pal.dot; if(pal.dot) pal.trip=false; applyLen(); }
    else if(k==='t'){ pal.trip=!pal.trip; if(pal.trip) pal.dot=false; applyLen(); }
    else if(k==='+'||k==='='){ const x=evAt(cur.s,cur.t); if(x) edit(()=>{ evAt(cur.s,cur.t).d+=pal.grid(); }); }
    else if(k==='-'||k==='_'){ const x=evAt(cur.s,cur.t); if(x&&x.d>pal.grid()) edit(()=>{ evAt(cur.s,cur.t).d-=pal.grid(); }); }
    else if(k==='Backspace'||k==='Delete'){ const x=evAt(cur.s,cur.t); if(x) edit(()=>{ M.ev=M.ev.filter(y=>y!==evAt(cur.s,cur.t)); }); else if(M.ch.some(c=>c.t===cur.t)) edit(()=>{ M.ch=M.ch.filter(c=>c.t!==cur.t); }); }
    else if(k==='c'||k==='C'||k==='Enter'){ chordIn.focus(); chordIn.select(); }
    else if(k==='Escape'&&!SURF.kind) tab.blur();
    else done=false;
    if(done){ e.preventDefault(); e.stopPropagation(); } });
  const svgPt=(sv,e)=>{ const p=sv.createSVGPoint(); p.x=e.clientX; p.y=e.clientY; return p.matrixTransform(sv.getScreenCTM().inverse()); };
  tab.addEventListener('pointerdown',e=>{ if(PRE) return; const p=svgPt(tab,e), TT=total();
    if(p.x<TB.x0-20) return;
    let t=tOfX(p.x); const ons=[...new Set(M.ev.map(v=>v.t).concat(M.ch.map(c=>c.t)))], near=ons.find(o=>Math.abs(xT(o)-p.x)<10);
    if(near!==undefined) t=near; else{ const g=pal.grid(); t=Math.round(t/g)*g; }
    cur.t=Math.max(0,Math.min(TT,t));
    if(p.y<TB.rowY[0]-14){ setTimeout(()=>{ chordIn.focus(); chordIn.select(); },0); cursorMoved(); return; }
    let s=0; TB.rowY.forEach((y,i)=>{ if(Math.abs(y-p.y)<Math.abs(TB.rowY[s]-p.y)) s=i; }); cur.s=s;
    setTimeout(()=>tab.focus(),0); cursorMoved(); });
  // the board: a fret clicked is written at the cursor, on that string (the hand's own posing is not used here)
  fb.parentElement.addEventListener('click',e=>{ if(!e.target.closest||!e.target.closest('#fb')) return;
    if(PRE){ e.stopPropagation(); return; }
    if(e.target.closest('.fbRotBtn')) return;
    e.stopPropagation(); e.preventDefault();
    const p=svgPt(fb,e); if(p.y<FB.top-6||p.y>FB.bot+6) return;
    let fr=-1; if(p.x>=FB.x0&&p.x<FB.nut) fr=0; else for(let n=1;n<=FMAX;n++) if(p.x>=cellL(n)&&p.x<cellR(n)) fr=n; if(fr<0) return;
    let st=0, bd=1e9; FB.strY.forEach((y,i)=>{ if(Math.abs(y-p.y)<bd){ bd=Math.abs(y-p.y); st=i; } }); if(bd>16) return;
    cur.s=st; edit(()=>{ const x=evAt(st,cur.t); if(x){ x.f=fr; if(fr===0) delete x.g; } else M.ev.push({t:cur.t,d:pal.dur(),s:st,f:fr}); if(cur.t>=total()) M.bars=Math.ceil((cur.t+1)/barT(M.meter)); });
    tab.focus(); },true);

  /* ---------- running ---------- */
  function segment(){
    const B=barT(M.meter);
    const lead=Math.min(0.09,0.35*(minStep/TPQ)*60/drill.bpm);
    return {D:C.D,grid:strokeGrid(),liftAt:st=>st.idx>=0&&st.ph*TPQ>=C.lift[st.s.plan[st.idx].frame]-1e-6,pass:0,plan:C.D.plan,fig:C.fig,hand:cloneHand(C.hands[0]),hands:C.hands,chords:C.sets,chord:C.sets[0],si:0,custom:false,mode:'pick',strs:{},plant:true,xt:0,lead,
      place(s,t){ s.count=B/TPQ; s.countStart=t; s.loopStart=t+s.count*T.beat; s.loops=Infinity; s.end=Infinity; },
      showBar(s){ T.shown=s; },
      ...(PRE?{jumpGap:()=>GHOST_GAP/(2*TB.cw), loopsBack:()=>false}:{})}; }
  // THE PICK'S STROKES: each beat cut as finely as what is played in it needs (eighths, triplets, sixteenths …), the pick
  // alternating through the cuts from a downstroke on the beat — a tone struck where it falls, the rest silent passes
  function strokeGrid(){
    const P_=pulseT(M.meter), TT=total(), ons=new Set(M.ev.map(e=>e.t)), out=[], cmp=compound(M.meter);
    for(let p0=0;p0<TT;p0+=P_){ const here=[...ons].filter(t=>t>=p0&&t<p0+P_).map(t=>t-p0);
      let k=cmp?3:2; for(const c of (cmp?[3,6,9,12,18,36]:[2,3,4,6,8,12,24])){ if(here.every(o=>Number.isInteger(o*c/P_))){ k=c; break; } k=c; }
      for(let j=0;j<k;j++){ const t=p0+j*P_/k; out.push({b:t/TPQ,up:j%2===1,struck:ons.has(Math.round(t))&&Math.abs(t-Math.round(t))<1e-6}); } }
    return out; }
  function run(){
    if(!M.ev.length) return;
    ensureCtx().then(()=>{
      if(T.on) stopAll();
      T.beat=60/drill.bpm; setPulse(); compile(); useC(); if(!DRILL) return;
      const s=segment(); placeSeg(s,ctx.currentTime+0.1);
      T.segs=[s]; T.si=0; T.nextI=0; T.nextCycle=0; T.nextBeat=-s.count/PULSE.u; T.live=[]; T.shown=null; T.on=true;
      tick(); T.timer=setInterval(tick,25);
      playBtn.textContent='Stop'; playBtn.classList.add('on'); placeCursor(); }); }

  /* ---------- each frame ---------- */
  let shownK=-2, shownDo=null, rootHeld=null, curChord=null, curMode=null, wasOn=false;
  function stepNow(force){ if(force) shownK=-2; step(null,false); }
  function step(st,live){
    if(keyWatch) keyWatch();                                            // (an exercise page: the ring turned)
    if(modePaint) modePaint();
    if(wasOn&&!T.on){ TAB_LIT=null; shownK=-2; placeCursor(); } wasOn=T.on;
    if(!DRILL&&!noteG.firstChild&&M.ch.length) tabDraw(null);           // (the page redrew an empty TAB: the chord lane back)
    const playing=!!(T.on&&st&&st.s&&st.s.D&&st.s.D.custom);
    let tk;
    if(playing){ tk=st.count?0:st.ph*TPQ; }
    else if(T.on) return;
    else tk=cur.t;
    if(PRE){ const B=barT(M.meter), cyc=playing&&!st.count?Math.floor((ctx.currentTime-st.s.loopStart)/(LOOP*T.beat)+1e-6):0, want=cyc>=1&&tk<B-1e-6?LOOP+GHOST_GAP/(2*TB.cw):0;
      if(want!==(TB.boff||0)){ const was=TB.boff||0; TB.boff=want;
        if(was>0&&want===0){ const dxU=was*2*TB.cw, vb=tab.viewBox.baseVal.width||1;   // on into the second bar: the view back by the loop's length
          if(tabPanel.classList.contains('wide')) tabPanel.scrollLeft-=dxU*tab.getBoundingClientRect().width/vb;
          if(typeof SURF!=='undefined'&&SURF&&SURF.shiftTab) SURF.shiftTab(-dxU); } } }
    // the orientation in force, and the chord
    // a chord symbol's orientation is applied as its span is entered; between, the ring is the listener's to turn
    const dp=doAt(Math.min(tk,total()-1e-3)); if(dp!==null&&dp!==lastDo){ lastDo=dp; orient(dp); }
    curChord=M.ch.length?chordAt(tk):null;
    // what is sounding: lit on the board and in the TAB
    const snd=playing&&st.count?[]:soundingAt(tk); INST=new Set(snd.map(e=>e.s*(FMAX+1)+e.f)); soundNow=playing?new Set(snd.map(e=>pcOf(e.s,e.f))):new Set();
    if(playing){ const ids=new Set(snd.map(e=>e.id)); TAB_LIT=new Set(); C.D.plan.forEach((n,i)=>{ if(ids.has(n.ev)) TAB_LIT.add(i); }); } else TAB_LIT=null;
    // the mode's light, from the chord's root: where the root sounds lowest now, else lowest in the chord's span, else
    // the root nearest the hand
    rootHeld=null; curMode=MODES.length?modeAt(tk):null;
    if(curMode){ const e=curMode.at; rootHeld={string:e.s,pitch:e.f,fret:e.f}; }
    else if(curChord){ const r=curChord.root, isR=e=>pcOf(e.s,e.f)===r, nx=M.ch[M.ch.indexOf(curChord)+1];
      const span=M.ev.filter(e=>e.t>=curChord.t&&(!nx||e.t<nx.t));
      let e=lowest(snd.filter(isR))||lowest(span.filter(isR));
      if(!e){ let best=null, bd=1e9; const hf=HAND.f[1].fret; for(let s=NSTR-1;s>=0;s--) for(let f=0;f<=FMAX;f++) if(pcOf(s,f)===r){ const d=Math.abs(f-hf)+(NSTR-1-s)*0.3; if(d<bd){ bd=d; best={s,f}; } } e=best; }
      if(e) rootHeld={string:e.s,pitch:e.f,fret:e.f}; }
    // no chord in force: the mode's light goes out
    if(!rootHeld) LIGHTS.forEach(Lt=>{ Lt.op*=0.9; if(Lt.op<0.003) Lt.op=0; Lt.spot.setAttribute('opacity',(0.85*Lt.op).toFixed(3)); Lt.rect.setAttribute('opacity',Lt.op.toFixed(3)); if(!Lt.op) Lt.note=null; });
    // stopped: the hand as it is at the cursor (playing, the engine moves it frame by frame; the open strings and a
    // barre follow it here)
    const k=playing?(()=>{ const sa=stateAt(ctx.currentTime+(st.s.lead||0)); return sa.idx>=0&&sa.s.plan[sa.idx]?sa.s.plan[sa.idx].frame:0; })():frameAt(tk);
    if(k!==shownK&&C&&!C.empty){ shownK=k; const kk=Math.max(0,k);
      P=k<0?[]:C.pls[kk].map(q=>Object.assign({},q)); HANDLAB.setOpen(k<0?[]:C.opens[kk]);
      if(!playing){ const H=k<0?C.hands[0]:C.hands[kk]; HAND.f=cloneHand(H).f; HAND.thumb=H.thumb; HANDLAB.resettle(); } }
    else if(C&&C.empty&&shownK!==-1){ shownK=-1; P=[]; HANDLAB.setOpen([]); }
    // the lengths along the strings, in their tones' colours while they sound
    const L=FIELD.lit, ink=inkColour();
    if(C&&!C.empty) C.D.plan.forEach((n,i)=>{ const b=durBars[i]; if(!b) return; const on=snd.some(e=>e.id===n.ev), pc=pcOf(n.string,n.pitch), col=L>0.001?mixRGB(ink,valRGB(pc),L):ink;
      b.style.stroke=rgbS(col); b.style.opacity=on?(0.85).toFixed(2):(L>0.001?0.32:0.28).toFixed(2); b.style.strokeWidth=on?3:2; });
    paintChords(curChord);
    if(PRE&&typeof ROLL!=='undefined'&&ROLL){ rollStep(tk); rollLight(snd,tk); }
    if(CLOCK) CLOCK.step(tk,playing); }
  // THE DRUM (an exercise page): the frame the walk is in — the one sounding, or the next to come — rolled into the middle.
  // A string's frame by where the hand sits in position: 6th Ti, 5th Mi, 4th La, 3rd Re, 2nd Sol_La (two tones: the walk
  // shifts on to TiDo_Re going up, Re_MiFa going down), 1st Ti.
  const FRAME_OF={5:'Ti',4:'Mi',3:'La',2:'Re',1:'Sol',0:'Ti'}, DRUM=['Ti','Mi','La','Re','Sol'];   // (the page's drum: BOOK.drum)
  let rollKey='', litKey='', litRow=null;
  // the drum's names lit by what sounds: a name in the middle row whose tone is sounding glows in its colour, the rest dim
  function rollLight(snd,tk){ const d0=doAt(tk), dp=d0===null?PHI.doPc:d0, on=new Set(snd.map(e=>SOLN[((pcOf(e.s,e.f)-(dp+2))%12+12)%12]));
    const row0=ROLL.row(), key=rollKey+'|'+[...on].sort().join(','); if(key===litKey&&row0===litRow) return; litKey=key; litRow=row0;
    document.querySelectorAll('#frameLbl .rollRow span').forEach(sp=>{ sp.classList.remove('lit','unlit'); });
    const row=ROLL.row(); if(!row) return; row.querySelectorAll('span:not(.us)').forEach(sp=>{ sp.classList.add(on.has(sp.textContent)?'lit':'unlit'); }); }
  function solLaCols(e){ const dp=PRE==='csm'?walkDo():PHI.doPc, on=M.ev.filter(x=>x.s===e.s&&x.fr==='Sol'&&x.g), at={};
    on.forEach(x=>{ const k=((pcOf(x.s,x.f)-dp)%12+12)%12; if(k===7) at.Sol=x.g; if(k===9) at.La=x.g; });
    if(at.Sol===undefined&&at.La!==undefined) at.Sol=at.La-2; if(at.La===undefined&&at.Sol!==undefined) at.La=at.Sol+2;
    return at.Sol>=1&&at.La<=4&&at.La>at.Sol?[at.Sol,at.La]:null; }
  function rollStep(tk){
    const singles=M.ev.filter(e=>!M.ev.some(q=>q!==e&&q.t===e.t)).sort((a,b)=>a.t-b.t); if(!singles.length) return;
    const e=singles.find(x=>x.t<=tk+1e-6&&tk<x.t+x.d)||singles.find(x=>x.t>tk)||singles[0], fr=e.fr||FRAME_OF[e.s];
    // Sol_La placed where the walk plays it: in position its two tones fall a fret further on across the G–B string's
    // major third than on any other string — under the fingers that play them
    const solCols=fr==='Sol'?solLaCols(e):null;
    const key=fr+'|'+FIELD.on+'|'+diatonic+'|'+(solCols?solCols.join():''); if(key===rollKey) return; rollKey=key;
    const k=DRUM.indexOf(fr); if(solCols&&ROLL.cols) ROLL.cols(k,solCols); ROLL.rebuild(); ROLL.set(k);
  }
  /* THE RHYTHM CLOCK (an exercise page): the bar round a clock the ring's own size, its sixteen sixteenths named round the
     rim (1 e & a 2 e & a …) in grey, each lighting in its tone's colour as it is struck. Each tone struck in the bar a dot
     where it falls — a downstroke filled, an upstroke a ring, a strum larger — joined in turn. A hand sweeps round with the
     bar, and the ring is lit like a radar's sweep: a tone lights the ring the instant it sounds, right under the hand, and
     the light trails the hand as it advances, fading smoothly with time — nothing ahead of the hand but the last turn's
     faded trail. One arc per tone sounding (not per string), nested by the tones' place in the mode's hierarchy — R 5 3 7
     9 13 11 — the highest of them on the ring itself, each next one a step inside it. Stopped, the bar's colours rest dim.
     Behind it all, a light in the colour of the mode in force. Between the TAB and the fretboard, over the nut. */
  const CLOCK=PRE?(()=>{
    const NSV='http://www.w3.org/2000/svg', S=240, C=S/2, R=84, sv=document.createElementNS(NSV,'svg'), A=(t,a,par)=>{ const e=document.createElementNS(NSV,t); for(const k in a) e.setAttribute(k,a[k]); (par||sv).appendChild(e); return e; };
    sv.setAttribute('viewBox','0 0 '+S+' '+S); sv.setAttribute('class','cuClock'); sv.setAttribute('aria-hidden','true');
    const ang=i=>-Math.PI/2+i*Math.PI/8, at=(i,r)=>{ const a=ang(i); return [C+r*Math.cos(a),C+r*Math.sin(a)]; };
    A('circle',{cx:C,cy:C,r:R,class:'ckl',fill:'none'});
    for(let i=0;i<16;i++){ const [x0,y0]=at(i,R-(i%4?4:8)), [x1,y1]=at(i,R+(i%4?4:8)); A('line',{x1:x0,y1:y0,x2:x1,y2:y1,class:'ckl'}); }
    // the sixteen names, the beats bold and further out
    const SUBN=['','e','&','a'], lbls=[];
    for(let i=0;i<16;i++){ const beat=i%4===0, [x,y]=at(i,R+(beat?22:19)), e=A('text',{x:x.toFixed(1),y:(y+(beat?5.5:4.5)).toFixed(1),class:beat?'ckn':'cks'}); e.textContent=beat?String(i/4+1):SUBN[i%4]; lbls.push({e,lv:0,pc:null}); }
    const neck=A('polygon',{points:'',class:'ckneck'}), dotsG=A('g',{}), hand=A('line',{x1:C,y1:C,x2:C,y2:C-R+14,class:'ckhand'}); A('circle',{cx:C,cy:C,r:3.5,class:'ckhub'});
    // the light (the mode's glow and the sweep's trail) on a canvas just under the clock's lines
    const cv=document.createElement('canvas'); cv.className='cuClockCv'; cv.setAttribute('aria-hidden','true'); const cx=cv.getContext('2d');
    // both in one box: placed over the nut, and what a double click brings up to fill the screen (playback carries on)
    const box=document.createElement('div'); box.className='cuClockBox'; box.appendChild(cv); box.appendChild(sv);
    const host=document.querySelector('.wrap'); host.appendChild(box); if(typeof SURF!=='undefined'&&SURF) SURF.attach(box,'clock');
    const css=document.createElement('style'); css.textContent='.cuClockBox{ position:relative; z-index:6; -webkit-user-select:none; user-select:none } .wrap > .cuClockBox{ position:absolute } .zoomLayer > .cuClockBox{ top:auto !important; left:auto !important } .cuClockBox > canvas, .cuClockBox > svg{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none } .cuClock{ color:var(--ink) } .cuClock .ckl{ stroke:currentColor; stroke-width:1.2; opacity:.55 } .cuClock .ckn{ fill:var(--mid); font-size:16px; font-weight:800; text-anchor:middle } .cuClock .cks{ fill:var(--mid); font-size:12.5px; font-weight:600; text-anchor:middle } .cuClock .ckn, .cuClock .cks{ transform-box:fill-box; transform-origin:center } .cuClock .ckneck{ fill:none; stroke:currentColor; stroke-width:1; opacity:.28 } .cuClock .ckhand{ stroke:currentColor; stroke-width:2.5; stroke-linecap:round } .cuClock .ckhub{ fill:currentColor } .cuClock .ckdot{ transform-box:fill-box; transform-origin:center }';
    document.head.appendChild(css);
    // the ring's size; over the nut, in the room between the TAB and the strings (sitting down on the strings' side when the
    // room is short)
    let px=0;
    const place=()=>{ if(box.parentNode!==host) return; const st=document.querySelector('.stage'), m=fb.getScreenCTM(); if(!st||!m) return; const W=host.getBoundingClientRect(), p=fb.createSVGPoint();
      p.x=FB.nut; p.y=FB.top; const q=p.matrixTransform(m), top=(st.getBoundingClientRect().bottom-W.top)/ZOOM, bot=(q.y-W.top)/ZOOM;
      const rw=ringSvg.getBoundingClientRect().width/ZOOM, sz=Math.round(1.3*Math.max(120,rw||200)), room=bot-top;   // a third larger than the ring
      // at the page's left edge, just under the TAB (the board kept far enough down for the hand to pass beneath it)
      const T=(sz<=room-16?top+8:bot-sz-6);
      box.style.width=box.style.height=sz.toFixed(0)+'px'; box.style.top=T.toFixed(0)+'px'; box.style.left='0px';
      if(STRIP) STRIP.place(sz,T,W.width/ZOOM); };
    afterFit.push(place); addEventListener('resize',place); new ResizeObserver(place).observe(fb.parentElement); new ResizeObserver(place).observe(ringSvg); setTimeout(place,0); setTimeout(place,600);
    // a tone's place in the mode's hierarchy, from the root in force: its step up the mode's scale (the walk's seven tones),
    // read R 5 3 7 9 13 11 (steps 0 4 2 6 1 5 3); a tone outside the scale after them all
    const HIER=[0,4,2,6,1,5,3];
    const rankOf=(pc,root,scale)=>{ const st=scale.map(p=>((p-root)%12+12)%12).sort((a,b)=>a-b).indexOf(((pc-root)%12+12)%12); return st<0?7+(((pc-root)%12+12)%12):HIER.indexOf(st); };
    // a bar sampled finely round the circle: at each of NS places, the tones sounding there, in rank order
    const NS=384, slotCache=new Map();
    function slotsFor(b){ const B=barT(M.meter), key=b+'|'+B+'|'+M.ev.length+'|'+M.ev.map(e=>e.t+'.'+e.d+'.'+e.s+'.'+e.f).join(','); if(slotCache.has(key)) return slotCache.get(key);
      if(slotCache.size>8) slotCache.clear();
      const b0=b*B, scale=[...new Set(M.ev.map(e=>pcOf(e.s,e.f)))], out=[];
      for(let j=0;j<NS;j++){ const t=b0+(j+0.5)*B/NS, pcs=[...new Set(M.ev.filter(e=>e.t<=t&&t<e.t+e.d).map(e=>pcOf(e.s,e.f)))];
        const md=modeAt(t), root=md?md.root:((chordAt(t)||{}).root??pcs[0]); out.push(pcs.sort((a,c)=>rankOf(a,root,scale)-rankOf(c,root,scale))); }
      slotCache.set(key,out); return out; }
    let barShown=-1, dots=[], clock=0, lastSix=-1, shownKey='';
    function build(b){ barShown=b; while(dotsG.firstChild) dotsG.firstChild.remove(); dots=[];
      const B=barT(M.meter), b0=b*B, D=B/16, GR=strokeGrid();
      const ons=[...new Set(M.ev.filter(e=>e.t>=b0&&e.t<b0+B).map(e=>e.t))].sort((a,b)=>a-b);
      lbls.forEach(l=>{ l.pc=null; l.lv=0; });
      ons.forEach(t=>{ const i=Math.round((t-b0)/D), g=M.ev.filter(e=>e.t===t), up=!!(GR.find(q=>Math.abs(q.b*TPQ-t)<1e-6)||{}).up, big=g.length>1, [x,y]=at(i,R);
        const pc=big?((chordAt(t)||{}).root):pcOf(g[0].s,g[0].f), r=big?(up?6.5:8.5):6, gg=A('g',{class:'ckdot'},dotsG);
        A('circle',{cx:x,cy:y,r,fill:up?'var(--bg)':'currentColor',stroke:'currentColor','stroke-width':up?2.6:0},gg); dots.push({i,t,pc,g:gg,lv:0});
        if(lbls[i]){ lbls[i].pc=pc; lbls[i].dur=Math.max(...g.map(e=>e.d))/TPQ*60/drill.bpm; } });
      neck.setAttribute('points',dots.length>1?dots.map(d=>at(d.i,R).map(v=>v.toFixed(1)).join(',')).join(' '):''); }
    const TRAIL=1.1, FLOOR=0.06, REST=0.42;                              // the trail's fade (s), what a full turn leaves, stopped
    return {place, step(tk,playing){ const B=barT(M.meter), TT=total(), NB=Math.max(1,Math.round(TT/B)), now=performance.now()/1000, dt=Math.min(0.1,clock?now-clock:0.016); clock=now;
        const tw=((tk%TT)+TT)%TT, b=Math.floor(tw/B), key=b+'|'+M.ev.length+'|'+(M.ev[0]&&M.ev[0].id); if(b!==barShown||key!==shownKey){ shownKey=key; build(b); }
        const ph=(tw-b*B)/B, six=Math.floor(ph*16+1e-6), L=FIELD.lit, ink=inkColour(), bg=bgColour(), mid=mixRGB(bg,ink,0.5);
        const a=ph*2*Math.PI; hand.setAttribute('x2',(C+(R-14)*Math.sin(a)).toFixed(1)); hand.setAttribute('y2',(C-(R-14)*Math.cos(a)).toFixed(1));
        if(playing&&six!==lastSix){ dots.forEach(d=>{ if(d.i===six) d.lv=1; }); if(lbls[six]&&lbls[six].pc!=null){ lbls[six].lv=1; lbls[six].fx=1; } } lastSix=playing?six:-1;
        const colOf=pc=>L>0.001?mixRGB(ink,valRGB(pc),L):ink, k6=Math.exp(-dt/0.35);
        dots.forEach(d=>{ d.lv*=k6; const c=colOf(d.pc), dim=mixRGB(bg,c,0.55), col=rgbS(mixRGB(dim,c,Math.max(d.lv,playing?0:0.6)));
          d.g.style.color=col; d.g.style.transform='scale('+(1+0.4*d.lv).toFixed(3)+')'; });
        lbls.forEach(l=>{ l.fx=(l.fx||0)*Math.exp(-dt/Math.max(0.1,0.4*(l.dur||0.4)));   // (a half note stays flexed longer than an eighth)
           l.e.style.transform=l.fx>0.005?'scale('+(1+0.7*l.fx).toFixed(3)+')':''; l.lv*=Math.exp(-dt/0.6); l.e.style.fill=l.pc==null||l.lv<0.01?'':rgbS(mixRGB(mid,colOf(l.pc),Math.min(1,l.lv*1.15))); });
        // the canvas, at the box's size on screen (zoomed or not): the mode's glow, then the sweep
        { const n=Math.round(Math.min(2400,box.getBoundingClientRect().width*Math.min(2,window.devicePixelRatio||1))); if(n>0&&n!==px){ px=n; cv.width=cv.height=n; } }
        if(!px) return; const sc=px/S; cx.setTransform(1,0,0,1,0,0); cx.clearRect(0,0,px,px); cx.setTransform(sc,0,0,sc,0,0);
        // the page's own ground behind the clock, so whatever passes under it (the hand's knuckles in low positions) sits back
        { const bgc=bg.join(','), gd=cx.createRadialGradient(C,C,R+22,C,C,C); gd.addColorStop(0,'rgba('+bgc+',0.92)'); gd.addColorStop(1,'rgba('+bgc+',0)');
          cx.fillStyle='rgba('+bgc+',0.92)'; cx.beginPath(); cx.arc(C,C,R+22,0,2*Math.PI); cx.fill(); cx.fillStyle=gd; cx.beginPath(); cx.arc(C,C,C,0,2*Math.PI); cx.fill(); }
        const mc=curMode?valRGB(curMode.root):(curChord?valRGB(curChord.root):null);
        if(mc&&L>0.001){ const gg=cx.createRadialGradient(C,C,0,C,C,R+30), c=mc.join(',');
          gg.addColorStop(0,'rgba('+c+','+(0.55*L).toFixed(3)+')'); gg.addColorStop(0.62,'rgba('+c+','+(0.22*L).toFixed(3)+')'); gg.addColorStop(1,'rgba('+c+',0)');
          cx.fillStyle=gg; cx.beginPath(); cx.arc(C,C,R+30,0,2*Math.PI); cx.fill(); }
        // each sliver of the ring: behind the hand, this bar's tones lit by how long ago the hand passed; ahead of it, the last
        // bar's, a full turn older (stopped: this bar, resting dim)
        const cur=slotsFor(b), prev=playing?slotsFor((b-1+NB)%NB):cur, secBar=B/TPQ*60/drill.bpm, jh=ph*NS, cols=new Map();
        cx.lineCap='butt';
        for(let j=0;j<NS;j++){ const behind=j+0.5<=jh, sl=playing?(behind?cur[j]:prev[j]):cur[j]; if(!sl||!sl.length) continue;
          let lv=REST; if(playing){ const age=((jh-(j+0.5))/NS+(behind?0:1))*secBar; lv=FLOOR+(1-FLOOR)*Math.exp(-age/TRAIL); }
          const a0=-Math.PI/2+j*2*Math.PI/NS, a1=a0+2*Math.PI/NS+0.004;
          sl.forEach((pc,k)=>{ let c=cols.get(pc); if(!c){ c=colOf(pc); cols.set(pc,c); }
            cx.strokeStyle=rgbS(mixRGB(bg,c,lv)); cx.lineWidth=Math.max(2.6,6.5-0.8*k); cx.beginPath(); cx.arc(C,C,R-k*7.5,a0,a1); cx.stroke(); }); }
      }};
  })():null;
  const lowest=a=>a.slice().sort((x,y)=>(openMidi(x.s)+x.f)-(openMidi(y.s)+y.f))[0];

  /* ---------- the hooks the drill pages call ---------- */
  function show(){
    if(show.done) return; show.done=true;
    let saved=null; try{ saved=JSON.parse(localStorage.getItem('custom-drill-1')||'null'); }catch(err){}
    if(PRE) M=presetModel(); else try{ M=saved?fromFile(saved):example(); }catch(err){ M=example(); }
    // the ring opens on D as Re, Re at 12 o'clock (as the Chords page does); a drill's own chord symbols then turn it
    let s0=0, f0=99; for(let s=0;s<NSTR;s++) for(let f=0;f<12;f++) if(pcOf(s,f)===5&&f<f0){ s0=s; f0=f; }
    pagePhi({anchor:{s:s0,f:f0,deg:'re'},top:PRE?'do':'re'}); RING.goal=RING.m=RING.t=0;
    normalize(); syncCtl(); markPal(); textEl.value=serialize(); setPulse(); compile(); useC();
    const d0=doAt(0); if(d0!==null&&d0!==PHI.doPc){ orient(d0); MORPH=null; FIELD.mx=-1; } lastDo=d0===null?undefined:d0;
    if(PRE==='csm'){ drumNames(); orient(PHI.doPc,true); MORPH=null; FIELD.mx=-1; if(CONST) CONST.mount(); }   // the mode's root (an anti's too) at 12 o'clock; the root constellation over the board
    refresh(); if(!DRILL) tabDraw(null); showMsg(); stepNow(true); }
  /* ---------- THE E SHAPE (BOOK.preset 'csm'): a mode's chord, barred in the E shape on its root on the low E, strummed for
     two bars (D · D U · U D, the hand letting go on the & of 4), set against that mode's semimode walk of an octave, played in
     position — up four tones (the fourth held), on up four more, and back down the same way. Seven modes, each on its own
     root along the low E; in G_Do: E_La open, F♯_Ti at the 2nd fret, G_Do the 3rd, A_Re the 5th, B_Mi the 7th, C_Fa the 8th,
     D_Sol the 10th. The ring sets the orientation: turned, the whole set moves along the neck with it.
     The position: a major mode (Do, Fa, Sol) has its root under the second finger, a minor or diminished one (Re, Mi, La,
     Ti) under the first; a root at the nut plays in open position. In position each finger keeps its fret — the walk stays on
     a string while its next tone lies in the hand's four frets, crossing to the next string when it does not (reaching a
     fret back with the first finger, or on with the fourth, where it must). Options: the mode; the lower octave, the upper
     or both; up then down or down then up; the chords in or out. ---------- */
  let keyWatch=null, modePaint=null, CONST=null, STRIP=null, soundNow=new Set(); const BOARD_DROP=250;   // board units the fretboard sits lower on the E Shape, under the clock
  const OPT={mode:'Do',anti:false,oct:'lower',dir:'updown',chords:true};   // anti: the root the anti of OPT.mode (its tritone partner), the frames OPT.mode's
  try{ Object.assign(OPT,JSON.parse(localStorage.getItem('csm-opts')||'{}')); }catch(err){}
  let KEY=10;                                                            // Do's pitch (from A): G
  try{ const k=+localStorage.getItem('eshape-key'); if(localStorage.getItem('eshape-key')!==null&&k>=0&&k<12) KEY=k; }catch(err){}
  const MODE7=[['Do',0,'maj'],['Re',2,'min'],['Mi',4,'min'],['Fa',5,'maj'],['Sol',7,'maj'],['La',9,'min'],['Ti',11,'dim']];
  const MAJ=[0,2,4,5,7,9,11], FRAMES=[['Ti',['Ti','Do','Re']],['Mi',['Mi','Fa','Sol']],['La',['La','Ti','Do']],['Re',['Re','Mi','Fa']],['Sol',['Sol','La']]];
  const flatKey=k=>[1,4,6,8,11].includes(k), pcName=(pc,k)=>(flatKey(k)?LETTER_B:LETTER)[((pc%12)+12)%12];
  const LOWE=NSTR-1;
  // the mode's root on the low E, its position, and its two octaves' walk: [string (1–6), fret, finger, frame] each
  function layout(key,mode){ const om=s=>Math.round(openMidi(s));       // (an open string's pitch, whole)
    const [syl,semi,q]=MODE7.find(m=>m[0]===mode), root=(key+semi)%12, rf=((root-pcOf(LOWE,0))%12+12)%12;
    let open=rf===0, p=open?0:(q==='maj'?rf-1:rf), lo=p, hi=open?4:p+3; const p0=p; const fin=f=>f===0?0:(open?Math.min(4,f):Math.max(1,Math.min(4,f-p+1)));
    const base=om(LOWE)+rf, out=[]; let s=LOWE, prev=null;
    for(let i=0;i<15;i++){ const m=base+12*Math.floor((MAJ.indexOf(semi)+i)/7)+MAJ[(MAJ.indexOf(semi)+i)%7]-semi, here=m-om(s);
      // a half step stays on its string where the hand can reach it (a fret on with the fourth finger)
      if(i>0&&here>hi&&s>0){ const nxt=m-om(s-1), half=m-prev===1&&here<=hi+1; if(!half&&(nxt>=lo-1||here>hi+1)) s--; }
      prev=m;
      const f=m-om(s);
      // reached past the hand's frets (a half step kept on its string): the hand moves up to take it under the fourth finger,
      // and the tones already on this string past its new first fret are fingered from there
      if(f>hi){ p=f-3; lo=p; hi=p+3; open=false; out.forEach(n=>{ if(n.str===s+1&&n.f>lo) n.g=fin(n.f); }); }
      out.push({str:s+1,f,g:fin(f)}); }
    // the frame each string is played in: of the five, the one holding most of its tones (a tie: the one led by its tone at
    // the hand's first fret, or the fret after)
    const solOf=m=>SYL[MAJ.indexOf((((m-69)-key)%12+12)%12)];
    out.forEach(n=>{ n.syl=solOf(om(n.str-1)+n.f); });
    for(let st=1;st<=NSTR;st++){ const on=out.filter(n=>n.str===st); if(!on.length) continue; const sy=on.map(n=>n.syl);
      const at=[p,p+1].map(f=>{ const k=((pcOf(st-1,f)-key)%12+12)%12; return MAJ.includes(k)?SYL[MAJ.indexOf(k)]:null; }).find(x=>x);
      let best=null, bs=-1; FRAMES.forEach(([h,set])=>{ const sc=sy.filter(x=>set.includes(x)).length+(h===at?0.5:0); if(sc>bs){ bs=sc; best=h; } });
      on.forEach(n=>{ n.fr=best; }); }
    return {syl,q,root,rf,p:p0,lower:out.slice(0,8),upper:out.slice(7,15)}; }
  /* AN ANTI'S E SHAPE: an anti root plays its tritone partner's frames — the whole set laid out as if Do stood a tritone away
     (the orientation itself unmoved: the walk's tones keep their own valences, ~ names and all, on the ring and in the TAB) */
  const walkDo=()=>OPT.anti?(KEY+6)%12:KEY, curL=()=>layout(walkDo(),OPT.mode);
  // a name in the frames (the partner's) as the field hears it: a tritone on — Do → ~Do … and Fa ↔ Ti
  const antiName=n=>{ const sm=(SYLPC[SYL.indexOf(n)]+6)%12, i=SYLPC.indexOf(sm); return [i>=0?SYL[i]:'~'+SYL[SYLPC.indexOf((sm+6)%12)],sm]; };
  const drumNames=()=>{ if(typeof ROLL!=='undefined'&&ROLL&&ROLL.names) ROLL.names(OPT.anti?antiName:null,OPT.anti?'anti':''); };
  // where the hand is along the board (board units, from its knuckles' side to the far finger), for what sits above it
  function handSpan(){ if(PRE!=='csm') return null; const L=curL(), a=L.p<=1?FB.x0-90:cellL(L.p)-50, b=cellR(Math.min(FMAX,L.p+4))+10; return [a,b]; }
  const toScreenX=x=>{ const m=fb.getScreenCTM(); if(!m) return null; const p=fb.createSVGPoint(); p.x=x; p.y=FB.top; return p.matrixTransform(m).x; };
  // the E-shape grip on the root's fret: {string:[fret, finger]} and the strings a strum takes (down, up)
  function grip(L){ const r=L.rf, o=r===0;
    if(L.q==='dim') return {G:o?{6:[0,0],5:[1,1],4:[2,2],3:[0,0]}:{6:[r,1],5:[r+1,2],4:[r+2,3],3:[r,1]}, DN:[6,5,4,3], UP:[3,4]};
    const G=o?{6:[0,0],5:[2,2],4:[2,3],3:L.q==='maj'?[1,1]:[0,0],2:[0,0],1:[0,0]}:{6:[r,1],5:[r+2,3],4:[r+2,4],3:L.q==='maj'?[r+1,2]:[r,1],2:[r,1],1:[r,1]};
    return {G, DN:[6,5,4,3,2,1], UP:[1,2,3]}; }
  const modeName=(mode,key)=>{ const L=layout(key,mode); return pcName(L.root,key)+'_'+mode; };
  function presetModel(){
    const m=fresh(); m.title='The E Shape'; m.bpm=drill.bpm; const ev=[], BAR=96; let t=0;
    const L=curL(), Gp=grip(L);
    const add=(t0,d,str,f,g,fr)=>{ const e={t:t0,d,s:str-1,f}; if(g&&f>0) e.g=g; if(fr) e.fr=fr; ev.push(e); };
    function chords(){ const hits=[]; for(let b=0;b<2;b++) [[0,Gp.DN],[24,Gp.DN],[36,Gp.UP],[60,Gp.UP],[72,Gp.DN]].forEach(([x,ss])=>hits.push([t+b*BAR+x,ss]));
      const end=t+BAR+84;                                                // the & of 4: the barre let go
      for(let str=1;str<=6;str++){ if(!Gp.G[str]) continue; const ts=hits.filter(h=>h[1].includes(str)).map(h=>h[0]);
        ts.forEach((x,i)=>add(x,(i<ts.length-1?ts[i+1]:end)-x,str,Gp.G[str][0],Gp.G[str][1])); }
      t+=2*BAR; }
    // a walk over the octaves chosen: up through them all and back down (or down through them all and back up) — with Both,
    // the lower octave then the upper going up, the upper then the lower coming down; each bar three eighths and a held tone
    function walk(octs){ const up=[[0,1,2,3],[4,5,6,7]], dn=[[7,6,5,4],[3,2,1,0]], ups=[], dns=[];
      octs.forEach(o=>up.forEach(ix=>ups.push([o,ix]))); octs.slice().reverse().forEach(o=>dn.forEach(ix=>dns.push([o,ix])));
      (OPT.dir==='updown'?ups.concat(dns):dns.concat(ups)).forEach(([o,ix])=>{ [[0,12],[12,12],[24,12],[36,60]].forEach(([x,d],j)=>{ const n=L[o][ix[j]]; add(t+x,d,n.str,n.f,n.g,n.fr); }); t+=BAR; }); }
    if(OPT.chords) chords(); walk(OPT.oct==='both'?['lower','upper']:[OPT.oct]);
    const nm=pcName(L.root,KEY)+(L.q==='min'?'m':L.q==='dim'?'°':'');
    m.ev=ev; m.bars=t/BAR; m.ch=[Object.assign(chordOf(nm,(OPT.anti?'~':'')+L.syl),{t:0})]; m.key=KEY; return m; }
  if(PRE){ Array.from(panel.children).forEach(c=>{ c.style.display='none'; });
    const row=document.createElement('div'); row.className='cuRow cuOpts';
    const seg=(lbl,key,items)=>{ const w=document.createElement('span'); w.className='cuLbl'; w.textContent=lbl+' ';
      const sg=document.createElement('span'); sg.className='cseg'; items.forEach(([v,n])=>{ const b=document.createElement('button'); b.type='button'; b.textContent=n; b.dataset.v=JSON.stringify(v);
        b.addEventListener('click',()=>{ OPT[key]=v; if(key==='mode') OPT.anti=false; try{ localStorage.setItem('csm-opts',JSON.stringify(OPT)); }catch(err){} mark(); regen(); }); sg.appendChild(b); });
      w.appendChild(sg); row.appendChild(w); return sg; };
    const segs=[seg('Mode','mode',MODE7.map(([m])=>[m,m])),seg('Octave','oct',[['lower','Lower'],['upper','Upper'],['both','Both']]),seg('Walk','dir',[['updown','Up · Down'],['downup','Down · Up']]),seg('Chords','chords',[[true,'On'],[false,'Off']])];
    const keys=['mode','oct','dir','chords'];
    // the bank of modes named in the orientation in force: G_Do, A_Re … (or, the ring turned, G♯_Do, A♯_Re …)
    // the bank in the order the roots lie along the low E, nut to body
    function relabel(){ const bs=[...segs[0].querySelectorAll('button')]; bs.sort((a,b)=>layout(KEY,JSON.parse(a.dataset.v)).rf-layout(KEY,JSON.parse(b.dataset.v)).rf).forEach(b=>segs[0].appendChild(b));
      segs[0].querySelectorAll('button').forEach(b=>{ const md=JSON.parse(b.dataset.v), nm=modeName(md,KEY), i=nm.indexOf('_');
      b.innerHTML=nm.slice(0,i)+'<span class="cuSub">_'+md+'</span>'; b.title=nm; }); }
    // the bank in colour: each mode its root's colour (g(x) on), the one chosen lit in it
    let paintKey='';
    function paintModes(){ const key=FIELD.on+'|'+FIELD.lit.toFixed(2)+'|'+OPT.mode+'|'+OPT.anti+'|'+KEY; if(key===paintKey) return; paintKey=key;
      const ink=inkColour(), bg=bgColour(), L=FIELD.on?FIELD.lit:0;
      segs[0].querySelectorAll('button').forEach(b=>{ const md=JSON.parse(b.dataset.v), semi=MODE7.find(x=>x[0]===md)[1], c=mixRGB(ink,relRGB((semi+10)%12),L), on=md===OPT.mode&&!OPT.anti;
        b.title=L>0.001?modeName(md,KEY):pcName(layout(KEY,md).root,KEY);
        b.style.color=L>0.001?(on?rgbS(L>0.5?bg:ink):rgbS(c)):''; b.style.background=on?(L>0.001?rgbS(c):''):''; b.style.borderColor=on&&L>0.001?rgbS(c):''; b.style.boxShadow=on&&L>0.001?'0 0 14px '+rgbS(c):''; }); }
    relabel(); segs[0].classList.add('cuModes'); modePaint=paintModes;
    /* G(X) OFF: no solfège anywhere on the page — no drum, no syllables in the TAB or on the chord, the mode bank by its
       letters alone — and the fretboard, in place of its grey paint, carries every fret's letter (both names where a tone has
       two). The letters fade in as the field fades out. */
    document.body.classList.add('csmPage'); boardLetters=true;
    fb.setAttribute('viewBox','-10 -'+(100+BOARD_DROP)+' 1000 '+(380+BOARD_DROP));   // (the hand's headroom grown by BOARD_DROP; below, just the thumb and the dots)
    { const css=document.createElement('style'); css.textContent='body.csmPage:not(.gxOn) #frameLbl, body.csmPage:not(.gxOn) .cuSylFix, body.csmPage:not(.gxOn) .cuChord .cuSyl, body.csmPage:not(.gxOn) .cuModes .cuSub{ display:none !important } @keyframes gxWipe{ 0%{ transform:translateX(-140%) rotate(0deg) } 11%,100%{ transform:translateX(140%) } } @keyframes gxRim{ 0%,1%{ color:var(--mid); border-color:var(--mid); box-shadow:none } 5%{ color:var(--gxg); border-color:var(--gxg); box-shadow:0 0 14px -2px var(--gxg) } 14%,100%{ color:var(--mid); border-color:var(--mid); box-shadow:none } } body.csmPage #gx, body.csmPage .gxCopy{ position:relative; overflow:hidden; isolation:isolate } body.csmPage:not(.gxOn) #gx, body.csmPage:not(.gxOn) .gxCopy{ animation:gxRim 5s ease-out infinite } body.csmPage:not(.gxOn) #gx::after, body.csmPage:not(.gxOn) .gxCopy::after{ content:""; position:absolute; inset:-2px; z-index:-1; pointer-events:none; background:linear-gradient(120deg, transparent 32%, var(--gxg) 50%, transparent 68%); opacity:.9; transform:translateX(-140%); animation:gxWipe 5s cubic-bezier(.45,0,.25,1) infinite } @media (prefers-reduced-motion: reduce){ body.csmPage:not(.gxOn) #gx, body.csmPage:not(.gxOn) #gx::after, body.csmPage:not(.gxOn) .gxCopy, body.csmPage:not(.gxOn) .gxCopy::after{ animation:none } body.csmPage:not(.gxOn) #gx::after, body.csmPage:not(.gxOn) .gxCopy::after{ display:none } } .fbLetters text{ fill:var(--ink); stroke:var(--bg); stroke-width:3px; paint-order:stroke; stroke-linejoin:round; text-anchor:middle; dominant-baseline:central; font-weight:600 }'; document.head.appendChild(css); }
    const lettersG=el('g',{class:'fbLetters','pointer-events':'none',opacity:0},null); fb.insertBefore(lettersG,paintG.nextSibling);
    for(let st=0;st<NSTR;st++) for(let f=0;f<=FMAX;f++){ const pc=pcOf(st,f), a=LETTER[pc], b=LETTER_B[pc], t=el('text',{x:tipX(f).toFixed(1),y:FB.strY[st],'font-size':a===b?11:8.5},lettersG); t.textContent=a===b?a:a+'/'+b; }
    (function letters(){ lettersG.setAttribute('opacity',(0.85*(1-FIELD.lit)).toFixed(3)); requestAnimationFrame(letters); })();
    /* THE CURVE: g(x) drawn as a line over the circle laid flat — x from 0 (Re, where g is 1) round to 2π — the twelve
       chromatic letters at their places along it (π/6 apart, from Re), each in its colour under the field: the seven
       diatonic tones in theirs, the five antis greatly dimmed under Diatonic, in their own (anti) colours without it, every
       one lighting up while it sounds, a bead on the curve at its value. The radians marked 0, π/2, π, 3π/2. A live g(x)
       button at its left reads "g(x) =": it is what raises the curve (and the valences) from the flat line. Level with
       the rhythm clock's centre; a double click brings it up to fill the screen. Letters spelled from the mode: the
       diatonic ones in order from the root's letter, an anti as the diatonic tone above it lowered (or below it raised,
       where that would take a double flat). */
    STRIP=(()=>{ const NSV='http://www.w3.org/2000/svg', VW=640, VH=250, X0=28, X1=VW-18, MID=104, AMP=74, LY=212, RY=240;
      const A=(t,a,par)=>{ const e=document.createElementNS(NSV,t); for(const k in a) e.setAttribute(k,a[k]); par.appendChild(e); return e; };
      const box=document.createElement('div'); box.className='csmPlotBox';
      const gxc=document.createElement('button'); gxc.type='button'; gxc.className='gx gxCopy'; gxc.title='g(x): the tonal field — what raises the curve'; gxc.innerHTML='g(x)';
      gxc.addEventListener('click',e=>{ e.stopPropagation(); document.getElementById('gx').click(); }); gxc.addEventListener('dblclick',e=>e.stopPropagation());
      const eq=document.createElement('span'); eq.className='csmEq'; eq.textContent='=';
      const lead=document.createElement('div'); lead.className='csmLead'; lead.appendChild(gxc); lead.appendChild(eq); box.appendChild(lead);
      const sv=document.createElementNS(NSV,'svg'); sv.setAttribute('viewBox','0 0 '+VW+' '+VH); sv.setAttribute('class','csmPlot'); sv.setAttribute('preserveAspectRatio','xMinYMid meet'); sv.setAttribute('aria-label','g(x) over the circle, with the twelve chromatic letters'); box.appendChild(sv);
      document.querySelector('.wrap').appendChild(box); if(typeof SURF!=='undefined'&&SURF) SURF.attach(box,'plot');
      const xOf=k=>X0+(X1-X0)*k/12, yOf=g=>MID-AMP*g;
      const gid='gp'+Math.random().toString(36).slice(2,6), defs=A('defs',{},sv), grad=A('linearGradient',{id:gid,gradientUnits:'userSpaceOnUse',x1:X0,y1:0,x2:X1,y2:0},defs);
      const NST=48, stops=Array.from({length:NST+1},(_,i)=>A('stop',{offset:(i/NST).toFixed(4)},grad));
      // the frame: the hinge (g = 0), the reach (±1) faint, a tick at each seat, the radians under the letters
      A('line',{x1:X0,y1:MID,x2:X1,y2:MID,class:'gpHinge'},sv); [1,-1].forEach(g=>A('line',{x1:X0,y1:yOf(g),x2:X1,y2:yOf(g),class:'gpReach'},sv));
      for(let k=0;k<=12;k++) A('line',{x1:xOf(k),y1:MID-4,x2:xOf(k),y2:MID+4,class:'gpTick'},sv);
      [['0',0],['π/2',3],['π',6],['3π/2',9],['2π',12]].forEach(([t,k])=>{ const e=A('text',{x:xOf(k),y:RY,class:'gpRad'},sv); e.textContent=t; });
      // what sounds, under the curve: a tone off the axis fills its own lobe (between the zero crossings either side of it),
      // fading to clear at the hinge; a tone on the axis (no area) a thin dashed line through it
      const cp=A('clipPath',{id:gid+'c'},defs); A('rect',{x:X0,y:-20,width:X1-X0,height:VH+40},cp);
      const areaG=A('g',{'clip-path':'url(#'+gid+'c)'},sv);
      const curve=A('path',{d:'',class:'gpCurve',stroke:'url(#'+gid+')'},sv), beadG=A('g',{'clip-path':'url(#'+gid+'c)'},sv);
      // the twelve letters, each at its seat from Re as the Ring's letters stand (sliding as they turn), twice over so the one
      // at the seam shows at both ends; drag them along and the Ring's letters turn with them, settling on a seat
      const letG=A('g',{class:'gpLetters'},sv); A('rect',{x:X0-20,y:LY-22,width:X1-X0+40,height:46,fill:'transparent',class:'gpGrab'},letG);
      const cells=Array.from({length:12},(_,pc)=>{ const fg=A('linearGradient',{id:gid+'f'+pc,gradientUnits:'userSpaceOnUse',x1:0,y1:0,x2:0,y2:MID},defs), s0=A('stop',{offset:0,'stop-opacity':0.85},fg), s1=A('stop',{offset:1,'stop-opacity':0},fg);
        return {pc,ts:[0,1].map(()=>A('text',{x:0,y:LY,class:'gpLet'},letG)),bs:[0,1].map(()=>A('circle',{cx:0,cy:MID,r:7,opacity:0},beadG)),
          area:A('path',{d:'',fill:'url(#'+gid+'f'+pc+')',opacity:0},areaG),dash:[0,1].map(()=>A('line',{x1:0,y1:yOf(1),x2:0,y2:yOf(-1),class:'gpAxis',opacity:0},areaG)),fg,s0,s1,lv:0,flex:0}; });
      const css=document.createElement('style'); css.textContent='.csmPlotBox{ position:absolute; z-index:4; display:flex; align-items:center; gap:10px; -webkit-user-select:none; user-select:none } .zoomLayer > .csmPlotBox{ top:auto !important; left:auto !important; width:auto !important; height:auto !important } .zoomLayer > .csmPlotBox .csmLead{ display:none } .csmLead{ display:flex; align-items:center; gap:8px; flex:none } .csmEq{ font-family:var(--serif); font-style:italic; font-size:22px; color:var(--mid) } .gxCopy{ width:40px; height:40px; font-size:15px } .csmPlot{ flex:1 1 auto; min-width:0; height:100%; overflow:visible } .gpHinge{ stroke:var(--mid); stroke-width:1; opacity:.55 } .gpReach{ stroke:var(--mid); stroke-width:1; stroke-dasharray:2 5; opacity:.3 } .gpTick{ stroke:var(--mid); stroke-width:1; opacity:.5 } .gpRad{ fill:var(--mid); font-family:var(--serif); font-style:italic; font-size:14px; text-anchor:middle } .gpCurve{ fill:none; stroke-width:3.2; stroke-linejoin:round; stroke-linecap:round } .gpLet{ font-family:var(--sans); font-weight:800; font-size:21px; text-anchor:middle; dominant-baseline:central; transform-box:fill-box; transform-origin:center; pointer-events:none } .gpGrab{ cursor:ew-resize } .gpAxis{ stroke-width:1.6; stroke-dasharray:3 4 }';
      document.head.appendChild(css);
      const NAT={C:3,D:5,E:7,F:8,G:10,A:0,B:2}, LET7=['C','D','E','F','G','A','B'], ACC={'-2':'𝄫','-1':'♭','0':'','1':'♯','2':'𝄪'};
      const accOf=(pc,L)=>{ let a=((pc-NAT[L])%12+12)%12; if(a>6) a-=12; return a; };
      function spell(L){ const r=L.root, nm=pcName(r,walkDo()), l0=LET7.indexOf(nm[0]), scale=[...new Set(L.lower.map(n=>pcOf(n.str-1,n.f)))].sort((a,b)=>((a-r)%12+12)%12-((b-r)%12+12)%12), out={};
        scale.forEach((pc,i)=>{ const Lt=LET7[(l0+i)%7]; out[pc]=[Lt,accOf(pc,Lt)]; });
        for(let k=0;k<12;k++){ const pc=(r+k)%12; if(out[pc]) continue; const up=out[(pc+1)%12], dn=out[(pc+11)%12];
          out[pc]=up&&up[1]-1>=-1?[up[0],up[1]-1]:dn?[dn[0],dn[1]+1]:[up[0],up[1]-1]; }
        const name={}; for(const pc in out) name[pc]=out[pc][0]+(ACC[String(out[pc][1])]||''); return name; }
      let key='', shapeKey='', dia=new Set();
      function build(){ const L=curL(), k=L.root+'|'+OPT.mode+'|'+OPT.anti+'|'+KEY+'|'+PHI.doPc; if(k===key) return; key=k; const nm=spell(L); dia=new Set(L.lower.map(n=>pcOf(n.str-1,n.f)));
        cells.forEach(c=>{ c.dia=dia.has(c.pc); c.ts.forEach(t=>{ t.textContent=nm[c.pc]; t.setAttribute('font-size',nm[c.pc].length>1?18:21); }); }); }
      // a drag along the letters turns the Ring's letters seat by seat (with g(x) on, the orientation with them), as a drag
      // round the Ring's own letters does
      { let drag=null; const seatW=()=>{ const m=sv.getScreenCTM(); return m?(X1-X0)/12*m.a:1; };
        const grab=letG.querySelector('.gpGrab');
        grab.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); if(T.on&&typeof ringStops==='function'&&ringStops()) stopAll(); drag={x:e.clientX,off:LET.off,was:PHI.doPc,id:e.pointerId}; try{ grab.setPointerCapture(e.pointerId); }catch(err){} });
        grab.addEventListener('pointermove',e=>{ if(!drag) return; const want=drag.off+Math.round((e.clientX-drag.x)/seatW()), step=want-LET.off; if(!step) return;
          LET.off=want; if(FIELD.on) PHI.doPc=((PHI.doPc-step)%12+12)%12; ringMoved(); });
        const end=()=>{ if(drag&&drag.was!==PHI.doPc) GHOST.doPc=drag.was; drag=null; };
        grab.addEventListener('pointerup',end); grab.addEventListener('pointercancel',end); grab.addEventListener('dblclick',e=>e.stopPropagation()); }
      function place(sz,top,W){ const left=sz+24, w=Math.max(260,W-left), h=Math.min(sz*0.62,w*0.36), cy=top+sz/2;
        box.style.left=left.toFixed(0)+'px'; box.style.width=w.toFixed(0)+'px'; box.style.height=h.toFixed(0)+'px'; box.style.top=(cy-h*MID/VH-h*0.0).toFixed(0)+'px'; }   // the curve's hinge level with the clock's centre
      let clock=0;
      (function frame(now){ const dt=Math.min(0.1,clock?(now-clock)/1000:0.016); clock=now; build();
        const L=FIELD.lit, ink=inkColour(), bg=bgColour(), mid=mixRGB(bg,ink,0.5), gry=mixRGB(bg,ink,0.55);
        // the curve, its height and colour with g(x)'s light (flat and grey without it); mid-morph, the field as the ring has it
        const sk=L.toFixed(3)+'|'+FIELD.mx.toFixed(4)+'|'+FIELD.re.toFixed(3)+'|'+FIELD.reA.toFixed(3)+'|'+diatonic+'|'+bg.join();
        if(sk!==shapeKey){ shapeKey=sk; let d=''; for(let i=0;i<=240;i++){ const k=12*i/240; d+=(i?'L':'M')+xOf(k).toFixed(1)+' '+yOf(L*fieldAt(k,false)).toFixed(2); } curve.setAttribute('d',d);
          stops.forEach((s,i)=>{ const c=fieldRGB(12*i/NST,false); s.setAttribute('stop-color',rgbS(mixRGB(gry,c,L))); }); }
        const gA=s=>L*fieldAt(s,false);
        cells.forEach(c=>{ const on=soundNow.has(c.pc); if(on&&c.lv<0.5) c.flex=1; if(on) c.lv=1; else c.lv*=Math.exp(-dt/0.35); c.flex*=Math.exp(-dt/0.22);
          const raw=SOLF_RGB[((c.pc-(PHI.doPc+2))%12+12)%12], col=mixRGB(ink,raw,L), base=c.dia?0.62:(diatonic?0.16:0.72), lit=c.dia||!diatonic?1:0.55;
          const v=base+(lit-base)*c.lv, show=mixRGB(bg,L>0.001?col:(c.dia?ink:mid),v), cs=rgbS(L>0.001?col:ink), vis=c.dia||!diatonic?1:0.5;
          // its seat from Re as the Ring's letters stand now (eased as they turn): here and a turn along, so the seam shows both
          const p=(((c.pc+LET.offA-FIELD.re)%12)+12)%12, g=gA(p), axis=Math.abs(g)<0.06*Math.max(L,0.001)||L<0.05;
          [p,p-12<-0.45?p+12:p-12].forEach((q,j)=>{ const t=c.ts[j], b=c.bs[j], edge=Math.max(0,Math.min(1,(q+0.45)/0.3,(12.45-q)/0.3));
            t.setAttribute('x',xOf(q).toFixed(1)); t.style.opacity=edge.toFixed(3); t.style.fill=rgbS(show);
            t.style.transform='scale('+(1+0.12*c.lv+0.25*c.flex).toFixed(3)+')'; t.style.filter=c.lv>0.02&&edge>0?'drop-shadow(0 0 '+(7*c.lv).toFixed(1)+'px '+cs+')':'';
            b.setAttribute('cx',xOf(q).toFixed(1)); b.setAttribute('cy',yOf(g).toFixed(2)); b.setAttribute('fill',cs); b.setAttribute('opacity',(c.lv*vis).toFixed(3)); b.setAttribute('r',(5+3*c.lv).toFixed(2));
            const dl=c.dash[j]; dl.setAttribute('x1',xOf(q).toFixed(1)); dl.setAttribute('x2',xOf(q).toFixed(1)); dl.style.stroke=cs; dl.setAttribute('opacity',(0.9*c.lv*vis).toFixed(3)); });
          // its lobe, filled while it sounds: from the zero crossing before it to the one after, faded to clear at the hinge
          if(c.lv>0.01&&!axis){ const sg=Math.sign(g); let a=p, z=p; for(let n=0;n<80&&Math.sign(gA(a-0.05))===sg;n++) a-=0.05; for(let n=0;n<80&&Math.sign(gA(z+0.05))===sg;n++) z+=0.05;
            let d=''; [0,12,-12].forEach(o=>{ if(z+o<-0.5||a+o>12.5) return; d+='M'+xOf(a+o).toFixed(1)+' '+MID; for(let s=a;s<=z+1e-6;s+=0.05) d+=' L'+xOf(s+o).toFixed(1)+' '+yOf(gA(s)).toFixed(2); d+=' L'+xOf(z+o).toFixed(1)+' '+MID+' Z'; });
            c.area.setAttribute('d',d); c.fg.setAttribute('y1',yOf(g>0?1:-1)*1+0); c.fg.setAttribute('y1',yOf(sg*Math.max(Math.abs(g),0.2)).toFixed(1)); c.fg.setAttribute('y2',MID);
            c.s0.setAttribute('stop-color',cs); c.s1.setAttribute('stop-color',cs); c.area.setAttribute('opacity',(c.lv*vis).toFixed(3)); }
          else c.area.setAttribute('opacity',0); });
        gxc.setAttribute('aria-pressed',FIELD.on);
        requestAnimationFrame(frame); })(0);
      return {place}; })();
    /* FULL SCREEN, the Ring or the curve: a live g(x) button and its equation over it */
    { const head=document.createElement('div'); head.className='zoomGxHead'; const eqn=document.getElementById('eqn'), eqc=eqn?eqn.cloneNode(true):null;
      if(eqc){ eqc.removeAttribute('id'); head.appendChild(eqc); }
      const b=document.createElement('button'); b.type='button'; b.className='gx gxCopy'; b.textContent='g(x)'; b.addEventListener('click',e=>{ e.stopPropagation(); document.getElementById('gx').click(); }); b.addEventListener('dblclick',e=>e.stopPropagation()); head.appendChild(b);
      const css=document.createElement('style'); css.textContent='.zoomGxHead{ position:fixed; top:14px; left:0; right:0; z-index:61; display:none; align-items:center; justify-content:center; gap:14px; pointer-events:none } .zoomGxHead > *{ pointer-events:auto } body.zoomed .zoomGxHead.show{ display:flex }'; document.head.appendChild(css);
      document.body.appendChild(head);
      (function sync(){ const k=typeof SURF!=='undefined'&&SURF?SURF.kind:null, sh=k==='ring'||k==='plot'; head.classList.toggle('show',sh); if(document.body.classList.contains('zoomHead')!==sh){ document.body.classList.toggle('zoomHead',sh); dispatchEvent(new Event('resize')); } if(eqc&&eqn) eqc.className=eqn.className; b.setAttribute('aria-pressed',FIELD.on); requestAnimationFrame(sync); })(); }
    { const css=document.createElement('style'); css.textContent='.cuModes button{ font-variant-numeric:tabular-nums } .cuModes .cuSub{ font-family:var(--serif); font-style:italic; font-weight:500; opacity:.8 } .cuOpts{ flex-wrap:wrap; row-gap:10px }'; document.head.appendChild(css); }
    // THE RING TURNED (g(x) on: the orientation moved): once it has come to rest, the whole set is built afresh there
    let keyWant=null, keyAt=0;
    keyWatch=()=>{ if(PHI.doPc===KEY){ keyWant=null; return; } const now=performance.now();
      if(PHI.doPc!==keyWant){ keyWant=PHI.doPc; keyAt=now; return; } if(now-keyAt<350) return;
      KEY=PHI.doPc; keyWant=null; try{ localStorage.setItem('eshape-key',String(KEY)); }catch(err){} relabel(); regen(); };
    function mark(){ segs.forEach((sg,i)=>sg.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.v===JSON.stringify(OPT[keys[i]])&&!(i===0&&OPT.anti)))); paintKey=''; }
    function regen(){ const was=T.on; drumNames(); orient(KEY,true); if(was) stopAll(); M=presetModel(); normalize(); textEl.value=serialize(); syncCtl(); rebuild(); if(was) run(); afterFit.forEach(f=>{ try{ f(); }catch(err){} }); }
    panel.appendChild(row); mark(); tabPanel.style.cursor='default';
    // the drum, just above the fretboard
    // the drum, large, over the right of the hand's headroom, its lowest row just above the strings (on a phone, in the
    // flow above the fretboard)
    const box=document.getElementById('frameLbl'); if(box&&box.classList.contains('roll')){ const fp=fb.parentElement, wrap=document.querySelector('.wrap'); box.classList.add('big'); fp.parentNode.insertBefore(box,fp);
      wrap.style.position='relative'; const narrow=matchMedia('(max-width:640px)');
      const place=()=>{ if(!box.offsetParent) return;   // hidden (g(x) off): placed when it shows again
        if(narrow.matches){ box.style.position=''; box.style.left=box.style.top=''; box.style.margin='10px 0 6px 4px'; return; }
        const m=fb.getScreenCTM(); if(!m) return; const p=fb.createSVGPoint(); p.x=0; p.y=FB.top; const by=p.matrixTransform(m).y, W=wrap.getBoundingClientRect();
        p.y=fb.viewBox.baseVal.y; const pb=document.querySelector('.csmPlotBox'), pr=pb&&pb.parentNode===wrap?pb.getBoundingClientRect():null, ty=Math.max(p.matrixTransform(m).y,pr?pr.bottom+10*ZOOM:-1e9), rh=Math.max(18,Math.min(62,((by-ty)/ZOOM-18)/3));   // (below the curve, above the board)
        box.style.setProperty('--rh',rh.toFixed(1)+'px'); box.style.fontSize='';
        box.style.position='absolute'; box.style.margin='0'; box.style.zIndex='3'; box.style.pointerEvents='none';
        const bw=box.offsetWidth, hs=handSpan(); let left=0.5*W.width/ZOOM;
        if(hs){ const OP=(box.offsetParent||wrap).getBoundingClientRect(), hl=toScreenX(hs[0]), hr=toScreenX(hs[1]), ck=document.querySelector('.cuClock'), cb=ck?ck.getBoundingClientRect():null, B=bw*ZOOM;
          // (screen px) between the hand and the clock, or the clock and the page's edge
          const lo=(cb&&cb.left<hl?cb.right:W.left)+12, hi=(cb&&cb.left>hr?cb.left:W.right)-12, roomR=hi-hr, roomL=hl-lo, mid=W.left+0.5*W.width;
          const x=roomR>=roomL?Math.max(hr+12,Math.min(hi-B,mid)):Math.max(lo,Math.min(hl-12-B,mid)); left=(x-OP.left)/ZOOM; }
        box.style.left=left.toFixed(1)+'px'; box.style.top=((by-W.top)/ZOOM-box.offsetHeight-14).toFixed(1)+'px'; };
      afterFit.push(place); addEventListener('resize',place); narrow.addEventListener('change',place); new ResizeObserver(place).observe(fp); setTimeout(place,0); setTimeout(place,600);
      let gxWas=document.body.classList.contains('gxOn'); new MutationObserver(()=>{ const on=document.body.classList.contains('gxOn'); if(on===gxWas) return; gxWas=on; if(on){ place(); requestAnimationFrame(place); setTimeout(place,120); } }).observe(document.body,{attributes:true,attributeFilter:['class']}); }
    /* THE ROOT CONSTELLATION: the E shape's root and its octaves — on the low E, the high e (the same fret) and the D string
       (two frets on) — three rings sliding along the board together, in the colour of the root's valence. Grab any of them
       and the constellation drags smoothly to any of the twelve places; let go and it settles onto the nearest fret, the
       hand following to set up the shape there. A root the ring gives a diatonic valence takes that mode (as the mode bank
       would), its root at 12 o'clock; an anti's root goes to 12 o'clock too, its shape and frames its tritone partner's. */
    CONST=(()=>{ const NSV='http://www.w3.org/2000/svg', g=document.createElementNS(NSV,'g'); g.setAttribute('class','csmRoots');
      const PTS=[[LOWE,0],[0,0],[Math.max(0,NSTR-3),2]];                   // [string, frets above the root]: low E, high e, D
      const hits=document.createElementNS(NSV,'g'); hits.setAttribute('class','csmRootHits');
      const dots=PTS.map(([s,o])=>{ const c=document.createElementNS(NSV,'circle'); c.setAttribute('r','10'); c.setAttribute('cy',FB.strY[s]); g.appendChild(c);
        const h=document.createElementNS(NSV,'circle'); h.setAttribute('r','12'); h.setAttribute('cy',FB.strY[s]); hits.appendChild(h); return {s,o,c,h}; });
      const css=document.createElement('style'); css.textContent='.csmRoots circle{ fill-opacity:.16; stroke-width:3; pointer-events:none } .csmRootHits circle{ fill:transparent; stroke:none; cursor:grab; pointer-events:all; touch-action:none } .csmRootHits.drag circle{ cursor:grabbing } body.csmDrag, body.csmDrag *{ cursor:grabbing !important; -webkit-user-select:none; user-select:none }';
      document.head.appendChild(css);
      const UMAX=11;                                                       // the root's twelve places along the low E: open to the 11th
      // a fret position (fractional) to the board, where a fingertip stops it — just behind its fret wire — and back
      const ringX=n=>cellR(n)-Math.min(20,0.5*(cellR(n)-cellL(n)));      // a ring's edge about 10 units off its fret's wire
      const xAt=v=>{ v=Math.max(0,Math.min(FMAX,v)); const n=Math.min(FMAX-1,Math.floor(v)), a=ringX(n), b=ringX(n+1); return a+(v-n)*(b-a); };
      const vAt=x=>{ if(x<=ringX(0)) return 0; for(let n=0;n<FMAX;n++){ const a=ringX(n), b=ringX(n+1); if(x<b) return n+(x-a)/(b-a); } return FMAX; };
      const svgX=e=>{ const m=fb.getScreenCTM(); if(!m) return null; const p=fb.createSVGPoint(); p.x=e.clientX; p.y=e.clientY; return p.matrixTransform(m.inverse()).x; };
      let u=null, drag=null, snap=null, lastT=0, colKey='';
      const target=()=>curL().rf;
      function paint(){ const L=FIELD.lit, ink=inkColour(), pc=drag?pcOf(LOWE,Math.round(u)):curL().root, col=L>0.001?mixRGB(ink,valRGB(pc),L):ink, k=rgbS(col);
        if(k!==colKey){ colKey=k; dots.forEach(d=>{ d.c.setAttribute('stroke',k); d.c.setAttribute('fill',k); }); }
        dots.forEach(d=>{ const x=xAt(u+d.o).toFixed(2); d.c.setAttribute('cx',x); d.h.setAttribute('cx',x); }); }
      function frame(now){ const dt=Math.min(0.1,lastT?(now-lastT)/1000:0.016); lastT=now;
        // the rings under the fingers (just beneath the hand's front layer); their grips over everything
        const front=fb.querySelectorAll('.hlHand')[1]||null; if(front&&g.nextSibling!==front) fb.insertBefore(g,front); else if(!front&&g.parentNode!==fb) fb.appendChild(g);
        if(hits!==fb.lastChild) fb.appendChild(hits);
        if(u===null) u=target();
        if(snap){ const k=Math.min(1,(now-snap.t0)/snap.ms), e=k*k*(3-2*k); u=snap.a+(snap.b-snap.a)*e; if(k>=1){ u=snap.b; const f=snap.b; snap=null; land(f); } }
        else if(!drag){ const tg=target(); u+=(tg-u)*(1-Math.exp(-dt/0.12)); if(Math.abs(tg-u)<1e-3) u=tg; }
        paint(); requestAnimationFrame(frame); }
      // let go on fret f: the mode whose root the ring puts there, or an anti's
      function land(f){ const rel=((pcOf(LOWE,f)-KEY)%12+12)%12, i=MAJ.indexOf(rel), mode=i>=0?SYL[i]:SYL[MAJ.indexOf((rel+6)%12)], anti=i<0;
        if(mode===OPT.mode&&anti===OPT.anti) return;
        OPT.mode=mode; OPT.anti=anti; try{ localStorage.setItem('csm-opts',JSON.stringify(OPT)); }catch(err){} mark(); regen(); }
      hits.addEventListener('pointerdown',e=>{ const x=svgX(e); if(x===null) return; e.preventDefault(); e.stopPropagation();
        const c=e.target.closest('circle'), d=dots.find(q=>q.h===c)||dots[0]; snap=null;
        drag={id:e.pointerId,off:vAt(x)-(u+d.o)}; hits.classList.add('drag'); document.body.classList.add('csmDrag'); try{ hits.setPointerCapture(e.pointerId); }catch(err){} });
      hits.addEventListener('pointermove',e=>{ if(!drag) return; const x=svgX(e); if(x===null) return; u=Math.max(0,Math.min(UMAX,vAt(x)-drag.off)); });
      const end=e=>{ if(!drag) return; drag=null; hits.classList.remove('drag'); document.body.classList.remove('csmDrag'); try{ hits.releasePointerCapture(e.pointerId); }catch(err){}
        const b=Math.max(0,Math.min(UMAX,Math.round(u))); snap={a:u,b,t0:performance.now(),ms:110+140*Math.abs(b-u)}; };
      hits.addEventListener('pointerup',end); hits.addEventListener('pointercancel',end);
      hits.addEventListener('click',e=>e.stopPropagation());
      let mounted=false;
      return {mount(){ if(mounted) return; mounted=true; fb.appendChild(g); fb.appendChild(hits); requestAnimationFrame(frame); }}; })();
  }
  // the drill a first visit opens on: two bars, a chord and its relative (the orientation the same, the mode moving)
  function example(){ const m=fresh(); m.title='Custom'; const save=M; M=m;
    const {out}=parse('C_Do e 5:3 4:2 3:0 2:1 q 5:3+4:2+3:0+2:1+1:0 r | Am e 5:0 4:2 3:2 2:1 q 5:0+4:2+3:2+2:1+1:0 r'); m.ev=out.ev; m.ch=out.ch; m.bars=out.bars; M=save; return m; }
  return {show, run, tab:tabDraw, step, nextSeg:null,
    cells:()=>null, rootNow:()=>curMode?curMode.root:(curChord?curChord.root:null), bass:()=>rootHeld,
    // for testing
    _:{parse,serialize,model:()=>M,compile:()=>compile(),cur,pal,
      load(t,meter){ if(meter) M.meter=meter; const {out,errs}=parse(t); M.ev=out.ev; M.ch=out.ch; M.bars=out.bars; normalize(); textEl.value=serialize(); rebuild();
        return {errs,warn:C.warn||[],fing:M.ev.map(e=>(e.s+1)+':'+e.f+'>'+(C.fing?C.fing[e.id]:'-')).join(' '),pls:(C.pls||[]).map(pl=>pl.map(q=>q.g+'@'+(q.s+1)+':'+q.f+(q.barre?'B':'')).join(' '))}; }}}; }
