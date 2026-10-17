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
        if(one){ put(toks,one[0]); toks.push(grp.map(e=>tone(e,e.d)).join('+'));   // (its length is written by the ties) one.slice(1).forEach(v=>{ put(toks,v); toks.push('~'); });
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
    const FG=fingering(evs), plan=[], fig=[], hands=[], sets=[], opens=[], pls=[], strumAt=new Set();
    let lastH=null;
    FG.frames.forEach((F,k)=>{
      const S=FG.path[k], L=S?S.L:[];
      const bar=L.filter(x=>x.g===1).length>1?{f:L.find(x=>x.g===1).f,low:Math.max(...L.filter(x=>x.g===1).map(x=>x.s))}:null;
      const pl=L.filter(x=>!(bar&&x.g===1)).map(x=>({g:x.g,s:x.s,f:x.f})); if(bar) pl.push({g:1,s:bar.low,f:bar.f,barre:true});
      const H=pl.length?handFor(pl):(lastH?cloneHand(lastH):handFor([],Math.max(1,(evs.find(e=>e.f>0)||{f:1}).f-1),NSTR-1));
      if(pl.length) lastH=H; hands.push(H); pls.push(pl); sets.push(new Set(L.map(x=>x.g)));
      opens.push(F.snd.filter(e=>e.f===0).map(e=>e.s));
      const nw=F.nw.slice().sort((a,b)=>b.s-a.s), nextT=k<FG.frames.length-1?FG.frames[k+1].t:TT+FG.frames[0].t;
      const spread=nw.length>1?Math.min(STRUM*drill.bpm/60,0.6*(nextT-F.t)/TPQ/(nw.length-1)):0;
      if(nw.length>1) strumAt.add(F.t);
      nw.forEach((e,i)=>{ const off=i*spread;
        plan.push({string:e.s,fret:e.f,pitch:e.f,push:0,finger:e.f>0?(FG.fing[e.id]||0):0,frame:k,pick:true,glide:false,pre:false,kind:'pick',hi:false,
          vel:Math.pow(0.96,i),line:nw.length===1,ev:e.id,t:e.t,len:e.d,off:e.d/TPQ-off});
        fig.push({s:e.t/TPQ+off}); }); });
    // where each tone's string is next struck: room to still it at its end, or not
    plan.forEach(p=>{ const later=plan.filter(q=>q.string===p.string&&q.t>p.t).map(q=>q.t), first=Math.min(...plan.filter(q=>q.string===p.string).map(q=>q.t));
      const nt=later.length?Math.min(...later):first+TT; p.gap=(nt-(p.t+p.len))/TPQ; });
    fig.forEach((e,i)=>{ e.d=i<fig.length-1?fig[i+1].s-e.s:LOOPB-e.s+fig[0].s; });
    const g=fig.reduce((a,e,i)=>gcd(a,Math.round(plan[i].t)),TPQ), strokes=Math.min(4,Math.max(2,TPQ/g));   // (the pick runs on its own strokes: strokeGrid)
    const D={chord:true,custom:true,walk:true,art:'custom',dir:'up',means:'pick',ham:false,pull:false,plan,bars:M.bars,
      frames:[{string:plan[0].string,tones:[],pl:pls[0],hand:hands[0]}],
      lo:{s:plan[0].string,f:plan[0].fret,g:plan[0].finger},hi:{s:plan[Math.min(1,plan.length-1)].string,f:plan[Math.min(1,plan.length-1)].fret,g:plan[Math.min(1,plan.length-1)].finger}};
    C={D,fig,hands,sets,opens,pls,frames:FG.frames,fing:FG.fing,warn:FG.warn,strokes,strumAt,loop:LOOPB};
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
  function orient(doPc){ if(doPc===null||doPc===PHI.doPc) return; let s0=0, f0=99; for(let s=0;s<NSTR;s++) for(let f=0;f<12;f++) if(pcOf(s,f)===doPc&&f<f0){ s0=s; f0=f; }
    pagePhi({anchor:{s:s0,f:f0,deg:'do'},top:'re'}); }
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
    TB.cw=Math.max(23.5,(886-TB.x0)/(2*Q),13*TPQ/(2*ms)); TB.s1=TB.x1=TB.x0+2*Q*TB.cw; TB.boff=0;
    const W=Math.max(900,Math.round(TB.s1+14)); tab.setAttribute('viewBox','0 -34 '+W+' 272'); tab.style.width=(100*W/900).toFixed(2)+'%'; tab.style.maxWidth=W>900?'none':'';
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
      const g=C&&C.fing?C.fing[n.ev]:0; if(g&&n.fret>0&&M.ev.find(e=>e.id===n.ev&&e.g)){ const fl=el('text',{x:x+3.8*txt.length+5,y:y+6,class:'cuFing'},noteG); fl.textContent=g; o.extra=[fl]; }
      const x0=x+3.8*txt.length+5, x1=xT(n.t+n.len)-7;
      durBars.push(x1>x0+1?el('line',{x1:x0,y1:y,x2:x1,y2:y,class:'cuDur'},durG):null); });
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
    M.ch.forEach((c,i)=>{ const x0=xT(c.t)-TB.cw/2, nx=i<M.ch.length-1?xT(M.ch[i+1].t)-TB.cw/2:TB.s1, id='cuG'+c.id;
      const gr=el('linearGradient',{id,x1:0,y1:0,x2:1,y2:0},bgG), s0=el('stop',{offset:0},gr); el('stop',{offset:1,'stop-opacity':0},gr);
      const r=el('rect',{x:x0,y:yT,width:Math.max(1,nx-x0),height:yB-yT,fill:'url(#'+id+')',opacity:0},bgG);
      const t=el('text',{x:xT(c.t)-6,y:laneY,class:'cuChord'},noteG), L=el('tspan',{},t), S=el('tspan',{class:'cuSyl',dx:5},t);
      L.textContent=c.name; chordArt.push({c,s0,r,L,S}); });
    placeCursor(); paintChords(); }
  // the chord symbols' colours: their root's function under the orientation in force where they stand (g(x) on)
  function paintChords(cur){ const L=FIELD.lit, ink=inkColour();
    chordArt.forEach(a=>{ const d0=doAt(a.c.t), dp=d0===null?PHI.doPc:d0, k=((a.c.root-(dp+2))%12+12)%12, col=relRGB(k), on=a.c===cur;   // the colour the TAB's numbers take (Diatonic filtering as they do)
      a.s0.setAttribute('stop-color',rgbS(col)); a.r.setAttribute('opacity',(L*(on?0.36:0.12)).toFixed(3));
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
   +'#tab .cuBarNo{ font-size:10px; fill:var(--mid) } #tab:focus{ outline:none } #tabPanel{ cursor:text }';
    document.head.appendChild(st); }
  const titleIn=$q('cuTitle'), meterIn=$q('cuMeter'), barsEl=$q('cuBars'), palEl=$q('cuPal'), dotB=$q('cuDot'), tripB=$q('cuTrip'), chordIn=$q('cuChord'), textEl=$q('cuText'), msgEl=$q('cuMsg'), fileIn=$q('cuFile');
  // keys typed in the panel stay in the panel (the hand's finger keys, the ring's, Space)
  panel.addEventListener('keydown',e=>{ e.stopPropagation(); },false);
  const markPal=()=>{ palEl.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.v===pal.v)); dotB.classList.toggle('on',pal.dot); tripB.classList.toggle('on',pal.trip); };
  // the page around it: one page, no Prev/Next or Hold; the header names the drill
  ['means','pageCt','hold','clear'].forEach(id=>{ const e=$q(id); if(e) e.style.display='none'; }); { const p=$q('prev'); if(p) p.parentElement.style.display='none'; }
  tab.setAttribute('tabindex','0'); tab.setAttribute('aria-label','The drill in TAB: click a string and type a fret');
  tab.style.outline='none';

  /* ---------- changes: every edit goes through here (undo, the text, the save in the browser) ---------- */
  const UNDO=[], REDO=[]; const snap=()=>JSON.stringify({M,cur});
  function edit(fn,opts){ opts=opts||{}; if(T.on) stopAll(); UNDO.push(snap()); if(UNDO.length>200) UNDO.shift(); REDO.length=0;
    fn(); normalize(); if(!opts.keepText) textEl.value=serialize(); rebuild(); }
  function undo(redo){ const A=redo?REDO:UNDO, Bk=redo?UNDO:REDO; if(!A.length) return; if(T.on) stopAll(); Bk.push(snap()); const o=JSON.parse(A.pop()); M=o.M; Object.assign(cur,o.cur); normalize(); textEl.value=serialize(); syncCtl(); rebuild(); }
  function store(){ try{ localStorage.setItem('custom-drill-1',JSON.stringify(fileOf())); }catch(err){} }
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
  tab.addEventListener('keydown',e=>{
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
  tab.addEventListener('pointerdown',e=>{ const p=svgPt(tab,e), TT=total();
    if(p.x<TB.x0-20) return;
    let t=tOfX(p.x); const ons=[...new Set(M.ev.map(v=>v.t).concat(M.ch.map(c=>c.t)))], near=ons.find(o=>Math.abs(xT(o)-p.x)<10);
    if(near!==undefined) t=near; else{ const g=pal.grid(); t=Math.round(t/g)*g; }
    cur.t=Math.max(0,Math.min(TT,t));
    if(p.y<TB.rowY[0]-14){ setTimeout(()=>{ chordIn.focus(); chordIn.select(); },0); cursorMoved(); return; }
    let s=0; TB.rowY.forEach((y,i)=>{ if(Math.abs(y-p.y)<Math.abs(TB.rowY[s]-p.y)) s=i; }); cur.s=s;
    setTimeout(()=>tab.focus(),0); cursorMoved(); });
  // the board: a fret clicked is written at the cursor, on that string (the hand's own posing is not used here)
  fb.parentElement.addEventListener('click',e=>{ if(!e.target.closest||!e.target.closest('#fb')) return;
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
    return {D:C.D,grid:strokeGrid(),pass:0,plan:C.D.plan,fig:C.fig,hand:cloneHand(C.hands[0]),hands:C.hands,chords:C.sets,chord:C.sets[0],si:0,custom:false,mode:'pick',strs:{},plant:true,xt:0,lead,
      place(s,t){ s.count=B/TPQ; s.countStart=t; s.loopStart=t+s.count*T.beat; s.loops=Infinity; s.end=Infinity; },
      showBar(s){ T.shown=s; }}; }
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
  let shownK=-2, shownDo=null, rootHeld=null, curChord=null, wasOn=false;
  function stepNow(force){ if(force) shownK=-2; step(null,false); }
  function step(st,live){
    if(wasOn&&!T.on){ TAB_LIT=null; shownK=-2; placeCursor(); } wasOn=T.on;
    if(!DRILL&&!noteG.firstChild&&M.ch.length) tabDraw(null);           // (the page redrew an empty TAB: the chord lane back)
    const playing=!!(T.on&&st&&st.s&&st.s.D&&st.s.D.custom);
    let tk;
    if(playing){ tk=st.count?0:st.ph*TPQ; }
    else if(T.on) return;
    else tk=cur.t;
    // the orientation in force, and the chord
    // a chord symbol's orientation is applied as its span is entered; between, the ring is the listener's to turn
    const dp=doAt(Math.min(tk,total()-1e-3)); if(dp!==null&&dp!==lastDo){ lastDo=dp; orient(dp); }
    curChord=M.ch.length?chordAt(tk):null;
    // what is sounding: lit on the board and in the TAB
    const snd=playing&&st.count?[]:soundingAt(tk); INST=new Set(snd.map(e=>e.s*(FMAX+1)+e.f));
    if(playing){ const ids=new Set(snd.map(e=>e.id)); TAB_LIT=new Set(); C.D.plan.forEach((n,i)=>{ if(ids.has(n.ev)) TAB_LIT.add(i); }); } else TAB_LIT=null;
    // the mode's light, from the chord's root: where the root sounds lowest now, else lowest in the chord's span, else
    // the root nearest the hand
    rootHeld=null;
    if(curChord){ const r=curChord.root, isR=e=>pcOf(e.s,e.f)===r, nx=M.ch[M.ch.indexOf(curChord)+1];
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
    paintChords(curChord); }
  const lowest=a=>a.slice().sort((x,y)=>(openMidi(x.s)+x.f)-(openMidi(y.s)+y.f))[0];

  /* ---------- the hooks the drill pages call ---------- */
  function show(){
    if(show.done) return; show.done=true;
    let saved=null; try{ saved=JSON.parse(localStorage.getItem('custom-drill-1')||'null'); }catch(err){}
    try{ M=saved?fromFile(saved):example(); }catch(err){ M=example(); }
    // the ring opens on D as Re, Re at 12 o'clock (as the Chords page does); a drill's own chord symbols then turn it
    let s0=0, f0=99; for(let s=0;s<NSTR;s++) for(let f=0;f<12;f++) if(pcOf(s,f)===5&&f<f0){ s0=s; f0=f; }
    pagePhi({anchor:{s:s0,f:f0,deg:'re'},top:'re'}); RING.goal=RING.m=RING.t=0;
    normalize(); syncCtl(); markPal(); textEl.value=serialize(); setPulse(); compile(); useC();
    const d0=doAt(0); if(d0!==null&&d0!==PHI.doPc){ orient(d0); MORPH=null; FIELD.mx=-1; } lastDo=d0===null?undefined:d0;
    refresh(); if(!DRILL) tabDraw(null); showMsg(); stepNow(true); }
  // the drill a first visit opens on: two bars, a chord and its relative (the orientation the same, the mode moving)
  function example(){ const m=fresh(); m.title='Custom'; const save=M; M=m;
    const {out}=parse('C_Do e 5:3 4:2 3:0 2:1 q 5:3+4:2+3:0+2:1+1:0 r | Am e 5:0 4:2 3:2 2:1 q 5:0+4:2+3:2+2:1+1:0 r'); m.ev=out.ev; m.ch=out.ch; m.bars=out.bars; M=save; return m; }
  return {show, run, tab:tabDraw, step, nextSeg:null,
    cells:()=>null, rootNow:()=>curChord?curChord.root:null, bass:()=>rootHeld,
    // for testing
    _:{parse,serialize,model:()=>M,compile:()=>compile(),cur,pal,
      load(t,meter){ if(meter) M.meter=meter; const {out,errs}=parse(t); M.ev=out.ev; M.ch=out.ch; M.bars=out.bars; normalize(); textEl.value=serialize(); rebuild();
        return {errs,warn:C.warn||[],fing:M.ev.map(e=>(e.s+1)+':'+e.f+'>'+(C.fing?C.fing[e.id]:'-')).join(' '),pls:(C.pls||[]).map(pl=>pl.map(q=>q.g+'@'+(q.s+1)+':'+q.f+(q.barre?'B':'')).join(' '))}; }}}; }
