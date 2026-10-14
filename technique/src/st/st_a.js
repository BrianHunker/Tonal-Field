(function(){
'use strict';
/*@COPY:287-289*/

/* ---------- Harmonic Structures: one tool, Semitone first ----------
   Three things set a drill, each in one place: the HAND chooses the frequencies (fingers paired to frets, or open strings),
   the RING sets the orientation φ, and the LISTEN chooser sets which hearing of those frequencies is drilled (it morphs φ
   one tick, the hand staying put). The orientation is set, then drilled: nothing changes φ while playback runs.
   A drill is a set of pairings. Play is enabled exactly when the pairings complete the structure. Advancing is how the
   tool runs: after 4 loops the next sample's pairings replace the current ones, unless Hold is on. Every drill reverses. */
/*@COPY:304-312*/
const openMidi=i=>69+12*Math.log2(STRINGS[i].hz/440);
const midiOf=(s,f)=>Math.round(openMidi(s))+f;
const FMAX=12;                                                          // the board shows frets 0–12
let FIG=[{s:0,d:.5},{s:.5,d:.5},{s:1,d:.5},{s:1.5,d:.5},{s:2,d:.5},{s:2.5,d:.5},{s:3,d:.5},{s:3.5,d:.5},{s:4,d:2},{s:6,d:2}];   // bar 1 eight eighths, bar 2 two halves: the two tones alternate, so the loop reverses
let BAR_START=i=>i===0||i===8;
let LOOP=8, STROKES=2; const COUNT=4, LEAD=0.06, SLIDE_T=0.09, ADV_LOOPS=4;
const catchT=()=>Math.min(0.06,0.15*T.beat/2);
const POSITION=5;
const drill={dir:'up',plant:true,bpm:70,click:true,hold:false};
const SYL=['Do','Re','Mi','Fa','Sol','La','Ti'], SYLPC=[0,2,4,5,7,9,11];
const PHI={doPc:3,root:0};                                             // Do's pitch (semitones above A; 3 = C) and the modal root, by syllable
const HEAR={tido:{lo:11,names:['Ti','Do']},mifa:{lo:4,names:['Mi','Fa']}};
let hearing='tido', diatonic=true;
let FLAT_OFF=false, SEG_EACH=false;                                     // SEG_EACH: every pass of a drill is its own segment, with its own count-in                                                    // a page whose field, g(x) going off, flattens to a grey circle rather than fading
const relOf=pc=>(((pc-PHI.doPc)%12)+12)%12;
const sylOf=pc=>{ const k=SYLPC.indexOf(relOf(pc)); return k<0?null:SYL[k]; };
const hearingOf=D=>{ if(!D) return null; const r=relOf(pcOf(D.lo.s,D.lo.f)); return r===11?'tido':(r===4?'mifa':null); };
const LETTER=['A','A♯','B','C','C♯','D','D♯','E','F','F♯','G','G♯'], LETTER_B=['A','B♭','B','C','D♭','D','E♭','E','F','G♭','G','A♭'];
const nameOf=m=>{ const pc=((m-69)%12+12)%12, flat=[1,6,8,11,4].includes(PHI.doPc)||PHI.doPc===8; return (flat?LETTER_B:LETTER)[pc]+(Math.floor(m/12)-1); };

/* ---------- where the structure lives ----------
   A semitone is two tones a semitone apart: along one string (frets f, f+1), or across to the neighbouring string within
   a hand's reach (the upper tone on the higher string, up to 4 frets back). Under the field, only those heard in the chosen
   hearing count: Ti–Do (the lower tone Ti) or Mi–Fa. With g(x) off there is no field and every semitone counts. */
const ALL_SEMI=(()=>{ const out=[];
  for(let s=0;s<NSTR;s++) for(let f=0;f<FMAX;f++) out.push({lo:{s,f},hi:{s,f:f+1}});
  for(let s=0;s<NSTR-1;s++){ const sl=s+1, sh=s;
    for(let f=0;f<=FMAX;f++){ const g=midiOf(sl,f)+1-midiOf(sh,0); if(g>=0&&g<=FMAX&&Math.abs(f-g)<=4) out.push({lo:{s:sl,f},hi:{s:sh,f:g}}); } }
  return out; })();
function instances(){ if(!FIELD.on) return ALL_SEMI; const lo=HEAR[hearing].lo; return ALL_SEMI.filter(r=>relOf(pcOf(r.lo.s,r.lo.f))===lo); }

/* ---------- the hand ----------
   One rule: neighbouring fingers stay within [same fret, LIM] semitones of each other (1–2: 3, 2–3: 2, 3–4: 3; together the
   8-semitone span), never crossing; two fingers on one string need a fret between them; the thumb stays within ±3 of
   finger 2. Dragging a finger past a limit pushes or pulls its neighbour, which can push or pull the next: drag far enough
   and the whole hand travels. Fingers snap to strings and to the spot behind a fret; the thumb slides freely. */
const LIM=[0,3,2,3];
const reach=(a,b)=>{ let r=0; for(let k=a;k<b;k++) r+=LIM[k]; return r; };
function fingersFit(a,fa,sa,b,fb,sb){
  if(a===b) return false; if(a>b) return fingersFit(b,fb,sb,a,fa,sa);
  const gap=fb-fa; if(gap<0) return false; if(sa===sb&&gap<1) return false;
  return gap<=reach(a,b);
}
const HAND={f:[null,{fret:5,string:0},{fret:6,string:0},{fret:7,string:0},{fret:8,string:0}],thumb:5.5};
const cloneHand=H=>({f:H.f.map(x=>x&&{fret:x.fret,string:x.string}),thumb:H.thumb});
let P=[];                                                              // the pairings: {g: finger (0 = open string), s, f}
let MEANS='pick', DRILL=null, SEL=null;                                // DRILL: the complete structure, its plan built
let SAMPLES=[], SI=0, CUSTOM=false;                                    // the sampling Advance walks; CUSTOM: the drill was edited
const paired=g=>P.some(p=>p.g===g);
function unpair(g){ if(!g) return; const n=P.length; P=P.filter(p=>p.g!==g); if(P.length!==n) DRILL=null; }
// a finger dragged: it is held where it is; placed fingers that can no longer share the hand with it are let go (the
// farthest first); the hand then forms around what is left — rigid if nothing else is placed, stretched only as needed
function dragTo(k,s,f){
  unpair(k);
  const fits=()=>{ const fx=P.filter(p=>p.g).concat([{g:k,s,f}]); for(let i=0;i<fx.length;i++) for(let j=i+1;j<fx.length;j++) if(!fingersFit(fx[i].g,fx[i].f,fx[i].s,fx[j].g,fx[j].f,fx[j].s)) return false; return true; };
  while(!fits()){ const far=P.filter(p=>p.g).sort((a,b)=>Math.abs(b.g-k)-Math.abs(a.g-k))[0]; unpair(far.g); }
  const H=handFor(P.filter(p=>p.g).concat([{g:k,s,f}])); HAND.f=H.f; HAND.thumb=H.thumb;
}
function relayout(){ const H=handFor(P); HAND.f=H.f; HAND.thumb=H.thumb; }
// a resting hand for a set of placements: the placed fingers where they are, the others one to a fret around them, on the
// string of the nearest placed finger
// the hand as the placements make it: nothing placed, the resting shape — four fingers on four neighbouring frets, at base
// (or where finger 1 is now); placed fingers where they are, the others one to a fret around the nearest placed one. A
// stretch appears only where two placed fingers need it, and goes as soon as one of them is let go.
function handFor(pl,base,str){
  const H={f:[null,null,null,null,null],thumb:0}, fixed={};
  if(!pl.some(p=>p.g)){ let b=Math.round(base!==undefined?base:HAND.f[1].fret); b=Math.max(1,Math.min(FMAX-3,b)); const s=str!==undefined?str:HAND.f[1].string;
    for(let k=1;k<=4;k++) H.f[k]={fret:b+k-1,string:s}; H.thumb=b+0.5; return H; }
  pl.forEach(p=>{ if(p.g&&!fixed[p.g]) fixed[p.g]={fret:p.f,string:p.s}; });   // a sliding finger: where it starts
  const ks=Object.keys(fixed).map(Number);
  for(let k=1;k<=4;k++){
    if(fixed[k]){ H.f[k]={fret:fixed[k].fret,string:fixed[k].string}; continue; }
    const a=ks.reduce((b,x)=>Math.abs(x-k)<Math.abs(b-k)?x:b,ks[0]);
    H.f[k]={fret:fixed[a].fret+(k-a),string:fixed[a].string};
  }
  for(let k=2;k<=4;k++) if(!fixed[k]){ const same=H.f[k].string===H.f[k-1].string; H.f[k].fret=Math.max(H.f[k].fret,H.f[k-1].fret+(same?1:0)); }
  for(let k=3;k>=1;k--) if(!fixed[k]){ const same=H.f[k].string===H.f[k+1].string; H.f[k].fret=Math.min(H.f[k].fret,H.f[k+1].fret-(same?1:0)); }
  for(let k=1;k<=4;k++) if(!fixed[k]) H.f[k].fret=Math.max(1,Math.min(FMAX,H.f[k].fret));
  H.thumb=(H.f[1].fret+H.f[2].fret)/2;
  return H;
}

/* ---------- pairing ----------
   A completion is one way of playing the structure: its two tones, each with its finger (0: open), and the means of the
   step between them — pick (fret), slide (one finger carries the length) or bend (one finger, the upper tone a push of
   the lower fret; a prebend is the bend with the upper tone on the downbeat). A finger or fret pulses if and only if it
   belongs to at least one completion still possible given the pairings made and the hand's limits. */
function completions(){
  const out=[];
  for(const r of instances()){ const L=r.lo, H=r.hi, same=L.s===H.s;
    const gl=L.f?[1,2,3,4]:[0], gh=H.f?[1,2,3,4]:[0];
    for(const a of gl) for(const b of gh){ if(a&&b&&!fingersFit(a,L.f,L.s,b,H.f,H.s)) continue; if(!a&&!b) continue;
      out.push({r,lo:{s:L.s,f:L.f,g:a},hi:{s:H.s,f:H.f,g:b},means:'pick'}); }
    if(same&&L.f>=1) for(let a=1;a<=4;a++){
      out.push({r,lo:{s:L.s,f:L.f,g:a},hi:{s:H.s,f:H.f,g:a},means:'slide'});
      out.push({r,lo:{s:L.s,f:L.f,g:a},hi:{s:H.s,f:L.f,g:a,push:1},means:'bend'}); }
  }
  return out;
}
const placementsOf=c=>{ const a=[c.lo]; if(!(c.hi.s===c.lo.s&&c.hi.f===c.lo.f&&c.hi.g===c.lo.g)) a.push(c.hi); return a; };
const samePl=(p,q)=>p.g===q.g&&p.s===q.s&&p.f===q.f;
function consistent(c){
  const pl=placementsOf(c);
  return P.every(p=>pl.some(q=>samePl(p,q))||(c.means==='bend'&&p.g===c.lo.g&&p.s===c.lo.s&&p.f===c.lo.f+1));   // a finger on the upper tone may bend it from the fret below
}
const realized=c=>placementsOf(c).every(q=>P.some(p=>samePl(p,q)));
let COMP=[];
function candidates(){
  const C=COMP.filter(c=>c.means===MEANS&&consistent(c));
  const fingers=new Set(), cells=new Map();
  if(!FIELD.on&&!P.length) return {C,fingers,cells};                    // without the field nothing is preferred until the first pairing
  C.forEach(c=>placementsOf(c).forEach(q=>{ if(P.some(p=>samePl(p,q))) return;
    if(q.g) fingers.add(q.g); const k=q.s+':'+q.f; if(!cells.has(k)) cells.set(k,new Set()); cells.get(k).add(q.g); }));
  return {C,fingers,cells};
}
