/* CHORD SHAPES, found rather than listed. A chord is a root and a set of intervals above it. A shape is one way to stop
   it on the strings: each string either unplayed or stopped at a fret (0 open) on one of the chord's tones; the strings
   played run unbroken from the lowest to the highest (unplayed strings only at the edges); the lowest sounds the root;
   every tone is present (a seventh chord may leave out its fifth); the stopped frets lie within four frets. Each is then
   fingered as a hand would: fingers in order of fret, low strings first on a shared fret, a finger's number following
   its fret where it can; when four fingers are not enough, the first finger lays a barre across its fret. Ordered up the
   neck; at one place, the lowest bass first, then fewest fingers, then most strings. Strings: index 0 the highest; pcs
   their open pitch classes; opt.open their open pitches (midi), for the bass. */
function chordShapes(rootPc,ivs,pcs,opt){
  opt=opt||{}; const NS=pcs.length, maxFret=opt.maxFret||15, minStr=opt.minStrings||Math.min(4,NS), SPAN=opt.span||3;
  const tones=new Set(ivs.map(i=>((rootPc+i)%12+12)%12)), five=((rootPc+7)%12), need=new Set(tones);
  if(ivs.length>=4&&ivs.includes(7)) need.delete(five);                // a seventh chord may leave its fifth out
  const opts=pcs.map(pc=>{ const o=[]; for(let f=0;f<=maxFret;f++) if(tones.has((pc+f)%12)) o.push(f); return o; });
  const out=[];
  // lo: the lowest string played (highest index), hi: the highest played; every string between them is played
  for(let lo=NS-1;lo>=0;lo--) for(let hi=lo-(minStr-1);hi>=0;hi--){
    const strs=[]; for(let s=lo;s>=hi;s--) strs.push(s);
    const rootF=opts[lo].filter(f=>(pcs[lo]+f)%12===rootPc);
    const rec=(i,fr,mn,mx)=>{
      if(i===strs.length){ const got=new Set(strs.map((s,k)=>(pcs[s]+fr[k])%12)); for(const t of need) if(!got.has(t)) return;
        out.push(strs.map((s,k)=>({s,f:fr[k]}))); return; }
      const s=strs[i], cand=i===0?rootF:opts[s];
      for(const f of cand){ let a=mn, b=mx; if(f>0){ a=Math.min(a,f); b=Math.max(b,f); if(b-a>SPAN) continue; } fr.push(f); rec(i+1,fr,a,b); fr.pop(); } };
    rec(0,[],99,-1); }
  // finger each; keep those four fingers (and a barre) can stop
  const shapes=[];
  for(const v of out){ const fing=fingerShape(v); if(fing) shapes.push({bass:(opt.open?opt.open[v[0].s]:0)+v[0].f,notes:v,pl:fing.pl,barre:fing.barre,pos:Math.min(99,...v.filter(n=>n.f>0).map(n=>n.f)),chart:chartOf(v,NS)}); }
  // a shape is dropped when another stops the same notes, rings more strings and needs no more fingers: the fuller one costs
  // the hand nothing more
  const key=sh=>new Set(sh.notes.map(n=>n.s+':'+n.f));
  const K=shapes.map(key);
  const keep=shapes.filter((a,i)=>!shapes.some((b,j)=>j!==i&&b.notes.length>a.notes.length&&b.pl.length<=a.pl.length&&[...K[i]].every(k=>K[j].has(k))));
  keep.forEach(sh=>{ if(sh.pos===99) sh.pos=0; });
  shapes.length=0; shapes.push(...keep);
  shapes.sort((a,b)=>a.pos-b.pos||a.bass-b.bass||a.pl.length-b.pl.length||b.notes.length-a.notes.length||(a.barre?1:0)-(b.barre?1:0));
  return shapes;
}
// the chart, as chord charts are written: low string to high, x unplayed
function chartOf(v,NS){ const c=Array(NS).fill('x'); v.forEach(n=>{ c[NS-1-n.s]=n.f>9?'('+n.f+')':String(n.f); }); return c.join(''); }
// fingers for a shape's stopped notes: in order of fret, the lower string first on a shared fret; finger n tries for fret
// (lowest + n − 1); a barre when more than four notes are stopped or the order runs past the fourth finger
function fingerShape(v){
  const st=v.filter(n=>n.f>0).sort((a,b)=>a.f-b.f||b.s-a.s);
  if(!st.length) return {pl:[],barre:false};
  const mn=st[0].f, assign=list=>{ const out=[]; let prev=0; for(const n of list){ const g=Math.max(prev+1,1+n.f-mn); if(g>4) return null; out.push({g,s:n.s,f:n.f}); prev=g; } return out; };
  const plain=st.length<=4?assign(st):null;
  if(plain) return {pl:plain,barre:false};
  // a barre: the first finger across the lowest fret, from the lowest string stopped there up through the highest strings;
  // every string it crosses must be played and stopped at that fret or above
  const atMn=st.filter(n=>n.f===mn), lowS=Math.max(...atMn.map(n=>n.s));
  if(v.some(n=>n.s<=lowS&&n.f<mn)) return null;
  const rest=assign2(st.filter(n=>n.f>mn),mn); if(!rest) return null;
  return {pl:[{g:1,s:lowS,f:mn,barre:true}].concat(rest),barre:true};
}
function assign2(list,mn){ const out=[]; let prev=1; for(const n of list){ const g=Math.max(prev+1,1+n.f-mn); if(g>4) return null; out.push({g,s:n.s,f:n.f}); prev=g; } return out; }
if(typeof module!=='undefined') module.exports={chordShapes};
