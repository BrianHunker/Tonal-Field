/* Gables Guitar Studio — the drill book: shared code for the designer, the drill page, the student pages and the overview.
   ── what a drill is ──────────────────────────────────────────────────────────────────────────────────────────────────────
   Everything is built on the five ways one note and its octave(s) sit inside four frets of six strings in standard tuning.
   Each is named by the bass string its root stands on and the way its octave leans from it:
     E forward — root on the low E string, octave two strings over and 2 frets toward the bridge, double octave on the high E
     E back    — root on the low E string, octave three strings over and 3 frets toward the nut, double octave on the high E
     A forward — root on the A string, octave on the G string, 2 frets toward the bridge
     A back    — root on the A string, octave on the B string, 2 frets toward the nut
     D forward — root on the D string, octave on the B string, 3 frets toward the bridge
   (D back would be the top of E forward; G and higher roots are already inside the E shapes. That is why there are five.)
   The same rule — a root and every octave of it inside four frets, dropping any shape inside another — run on the bass's
   four strings (E A D G) gives three: E forward, E back, A forward. A drill carries its instrument (P.inst); every shape,
   frame and glyph below reads the strings from it.
   A drill = an anchor, a position on the neck, a mode (which function the root is), a range of the four-fret box, a harmonic
   structure (which tones), a direction, and timing. From those the tones are found on the fretboard, ordered by pitch, and
   written as a sequence for the Tonal Field tool. */
(function(G){
'use strict';

/* ── strings: 1 is the high E, 6 the low E. Pitches in the tool's own numbering (the low E open is 16; pitch mod 12 is the
      pitch class, E = 4). ── */
var LETTERS=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
/* ── the instruments: open pitches by string number, string names, and the anchors ([string, fret offset within the box]).
      Keyboard has no fretboard drills; its students get songs and other routine items. ── */
var INSTRUMENTS={
  guitar:{ id:'guitar', name:'Guitar', drills:true, open:{1:40,2:35,3:31,4:26,5:21,6:16}, names:{1:'high E',2:'B',3:'G',4:'D',5:'A',6:'low E'},
    anchors:[ { id:'E>', root:6, word:'E forward', glyph:'E▸', tones:[[6,0],[4,2],[1,0]] },
              { id:'E<', root:6, word:'E back',    glyph:'E◂', tones:[[6,3],[3,0],[1,3]] },
              { id:'A>', root:5, word:'A forward', glyph:'A▸', tones:[[5,0],[3,2]] },
              { id:'A<', root:5, word:'A back',    glyph:'A◂', tones:[[5,2],[2,0]] },
              { id:'D>', root:4, word:'D forward', glyph:'D▸', tones:[[4,0],[2,3]] } ] },
  bass:{ id:'bass', name:'Bass', drills:true, open:{1:19,2:14,3:9,4:4}, names:{1:'G',2:'D',3:'A',4:'E'},
    anchors:[ { id:'E>', root:4, word:'E forward', glyph:'E▸', tones:[[4,0],[2,2]] },
              { id:'E<', root:4, word:'E back',    glyph:'E◂', tones:[[4,3],[1,0]] },
              { id:'A>', root:3, word:'A forward', glyph:'A▸', tones:[[3,0],[1,2]] } ] },
  keyboard:{ id:'keyboard', name:'Keyboard', drills:false }
};
function instOf(x){ var k=(x&&typeof x==='object')?x.inst:x; return INSTRUMENTS[k]&&INSTRUMENTS[k].drills?INSTRUMENTS[k]:INSTRUMENTS.guitar; }
/* the strings in use: set from the drill at each entry point (everything here runs synchronously) */
var INST, OPEN, NS, STRING_NAME, ANCHORS, STRIDX, IDXSTR;
function use(x){ var I=instOf(x); if(I===INST)return I; INST=I; OPEN=I.open; STRING_NAME=I.names; ANCHORS=I.anchors; NS=Object.keys(OPEN).length;
  STRIDX={}; IDXSTR=[]; for(var k=0;k<NS;k++){ STRIDX[NS-k]=k; IDXSTR.push(NS-k); } return I; }   /* index 0 is the lowest string */
use('guitar');
function anchorOf(id,inst){ if(inst!==undefined)use(inst); for(var i=0;i<ANCHORS.length;i++) if(ANCHORS[i].id===id) return ANCHORS[i]; return ANCHORS[0]; }
function rootOffset(A){ for(var i=0;i<A.tones.length;i++) if(A.tones[i][0]===A.root) return A.tones[i][1]; return 0; }

/* ── the seven functions: semitones above Do, the tool's colours, and the mode letters the tool's sequencer uses ── */
var FN=[ {n:'Do',s:0,c:'#22BB22',v:'d'}, {n:'Re',s:2,c:'#FF8800',v:'r'}, {n:'Mi',s:4,c:'#2255FF',v:'m'}, {n:'Fa',s:5,c:'#FFD700',v:'f'},
         {n:'Sol',s:7,c:'#EE0000',v:'s'}, {n:'La',s:9,c:'#9a4fc4',v:'l'}, {n:'Ti',s:11,c:'#FF00FF',v:'t'} ];
var ANTI={1:{n:'~Do',c:'#005500'},3:{n:'~Re',c:'#aa5500'},6:{n:'~Sol',c:'#880000'},8:{n:'~La',c:'#4b0082'},10:{n:'~Mi',c:'#001188'}};
function fnByName(n){ for(var i=0;i<FN.length;i++) if(FN[i].n===n) return FN[i]; return null; }
function nameOfRel(rel){ rel=((rel%12)+12)%12; for(var i=0;i<FN.length;i++) if(FN[i].s===rel) return FN[i]; return ANTI[rel]; }

/* a position is the fret of the index finger in the drill's opening hand shape (0: open). Drills saved before index positions
   (no P.pv) keep their old meaning, the fret where the anchor's four-fret box starts. */
var POSITIONS=Array.apply(null,{length:21}).map(function(_,i){ return i; }).concat(['chromatic','modal']);
var MODES=['Do','Re','Mi','Fa','Sol','La','Ti','Chromatic'];
/* ranges: an A or D anchor spans one octave, so its frame has a middle, an attic above and a basement below; an E anchor spans
   two octaves from the low E to the high E, so it divides into its lower and upper octave instead */
var RANGES=[ {id:'central',name:'Central',hint:'between the anchor’s octaves',two:true}, {id:'attic',name:'Attic',hint:'above the top octave',two:true},
             {id:'basement',name:'Basement',hint:'below the root',two:true},
             {id:'lower',name:'Lower Octave',hint:'from the root on the low E to its octave',three:true}, {id:'upper',name:'Upper Octave',hint:'from the octave up to the high E',three:true},
             {id:'all',name:'All',hint:'the whole frame',two:true,three:true} ];
function rangesFor(anchorId,inst){ if(inst!==undefined)use(inst); var three=anchorOf(anchorId).tones.length===3; return RANGES.filter(function(r){ return three?r.three:r.two; }); }
function fitRange(P){ use(P); var ok=rangesFor(P.anchor).some(function(r){ return r.id===P.range; }); if(ok)return P.range;
  return anchorOf(P.anchor).tones.length===3?({central:'lower',basement:'lower',attic:'upper'}[P.range]||'all'):({lower:'central',upper:'central'}[P.range]||'all'); }
var STRUCTURES=[ {id:'octave',name:'Octave'}, {id:'mode',name:'Mode'}, {id:'triad',name:'Triad'}, {id:'tetrachord',name:'Tetrachord shape'},
                 {id:'do-pent',name:'Do Pentatonic'}, {id:'la-pent',name:'La Pentatonic'}, {id:'chromatic',name:'Chromatic'}, {id:'custom',name:'Custom'} ];
var DIRECTIONS=[ {id:'updown',name:'Up & down'}, {id:'downup',name:'Down & up'}, {id:'up',name:'Up'}, {id:'down',name:'Down'} ];
var SUBDIVISIONS=[ {id:4,name:'Quarters'}, {id:8,name:'Eighths'}, {id:12,name:'Triplets'}, {id:16,name:'Sixteenths'} ];
var ARTICULATIONS=['Down strokes','Up strokes','Alternate','Cross picking','Sweep picking','Strumming 1:1','Strumming 2:1'];

/* the fingering preference, where the key does not fit one four-fret window: SHIFT never stretches (no major frames; a two-tone
   frame and a shift keep the coming half steps together, and the shifted string does not change the position); STRETCH takes
   three tones per string (major frames), and the position drifts with the B–G tuning and the Fa–Ti mismatch. Chromatic drills
   take the four-tone frame on every string. Ids kept from before: 'half' is Shift, 'three' is Stretch. */
var FRAMES=[ {id:'half',name:'Shift'}, {id:'three',name:'Stretch'} ];
function defaults(){ return { anchor:'E>', position:5, start:1, end:5, loop:true, daily:1, mode:'Do', frame:'half', range:'central', structure:'mode', custom:[1,0,0,0,0,0,0,0,0,0,0,0],
                               dir:'updown', bpm:60, sub:8, artic:'Alternate' }; }

/* ── one frame: the anchor placed with its box starting at fret w, and every tone of the key between (and around) its
      octaves given a string. The frame flexes with the fingering rule:
        'half'  — keep the half steps (Mi–Fa, Ti–Do) together on one string; a tone may lean a fret outside the anchor's box
        'three' — three tones on every string between the anchor's strings
        (chromatic drills are strung separately: strictly four semitones per string)
      The anchors never move. Among all the ways to string the tones from the root up to the top anchor, the one with the
      fewest broken rules wins, then the narrowest span of frets. ── */
function placeScale(pitches,fixed,w,rule){
  /* pitches ascending; fixed[pitch]=string for the anchor tones. Returns [{pitch,string,fret}] or null. */
  var best=null, bestCost=Infinity, n=pitches.length, cur=new Array(n);
  function cost(){
    var frets=cur.map(function(c){return c.fret;}), lo=Math.min.apply(null,frets), hi=Math.max.apply(null,frets), c=0;
    var split=0, per={};
    for(var i=0;i<n;i++){ per[cur[i].string]=(per[cur[i].string]||0)+1;
      if(i>0&&pitches[i]-pitches[i-1]===1&&cur[i].string!==cur[i-1].string)split++; }
    var dev=0, s0=STRIDX[cur[0].string], s1=STRIDX[cur[n-1].string];
    var T=(rule==='four')?4:3;
    for(var k=s0;k<s1;k++) dev+=Math.abs((per[IDXSTR[k]]||0)-T)*(rule!=='half'?(NS-(k-s0)):1);   /* every string from the root's up to (not) the top anchor's, empty ones too; three per string fills from the root string up */
    var lean=0; for(var j=0;j<n;j++){ if(cur[j].fret<w)lean+=w-cur[j].fret; if(cur[j].fret>w+3)lean+=cur[j].fret-(w+3); }
    var stretch=0; if(rule==='half'){ var lo1={}, hi1={}; for(var m=0;m<n;m++){ var st=cur[m].string, f1=cur[m].fret; lo1[st]=Math.min(lo1[st]===undefined?99:lo1[st],f1); hi1[st]=Math.max(hi1[st]===undefined?-99:hi1[st],f1); }
      for(var st2 in lo1) if(hi1[st2]-lo1[st2]>=4) stretch++; }   /* Shift: a string spanning five frets is a stretch */
    if(rule!=='half') c=1000*dev+100*split;
    else c=100000*stretch+1000*split+100*dev;
    return c+20*(hi-lo)+5*lean;
  }
  function go(i,sIdx){
    if(i===n){ var c=cost(); if(c<bestCost){ bestCost=c; best=cur.slice(); } return; }
    var p=pitches[i];
    if(fixed[p]!==undefined){ var fs=STRIDX[fixed[p]]; if(fs<sIdx)return; cur[i]={pitch:p,string:fixed[p],fret:p-OPEN[fixed[p]]}; go(i+1,fs); return; }
    var limit=NS-1; for(var q=i+1;q<n;q++) if(fixed[pitches[q]]!==undefined){ limit=STRIDX[fixed[pitches[q]]]; break; }
    for(var si=sIdx;si<=limit;si++){ var st=IDXSTR[si], f=p-OPEN[st]; if(f<0||f<w-2||f>w+6)continue;
      cur[i]={pitch:p,string:st,fret:f}; go(i+1,si); }
  }
  go(0,0);
  return best;
}
function boxAt(P,w,modeName){
  use(P);
  var A=anchorOf(P.anchor);
  var anchorCells=A.tones.map(function(t){ return {string:t[0],fret:w+t[1],pitch:OPEN[t[0]]+w+t[1]}; });
  var root=anchorCells.filter(function(c){ return c.string===A.root; })[0], rootPc=root.pitch%12;
  var chromatic=(modeName==='Chromatic');
  var F=chromatic?null:fnByName(modeName), doPc=chromatic?null:((rootPc-F.s)%12+12)%12;
  /* which pitch classes, as semitones above the root */
  var rel=[];
  var modeRel=chromatic?[0,1,2,3,4,5,6,7,8,9,10,11]:FN.map(function(f){ return ((f.s-F.s)%12+12)%12; }).sort(function(a,b){return a-b;});
  switch(P.structure){
    case 'octave': rel=[0]; break;
    case 'mode': rel=modeRel; break;
    case 'triad': rel=chromatic?[0]:[modeRel[0],modeRel[2],modeRel[4]]; break;
    case 'tetrachord': rel=chromatic?[0]:[modeRel[0],modeRel[2],modeRel[4],modeRel[6]]; break;
    case 'do-pent': case 'la-pent': rel=chromatic?modeRel:FN.filter(function(f){ return f.n!=='Fa'&&f.n!=='Ti'; }).map(function(f){ return ((f.s-F.s)%12+12)%12; }); break;
    case 'chromatic': rel=[0,1,2,3,4,5,6,7,8,9,10,11]; break;
    case 'custom': rel=[]; (P.custom||[]).forEach(function(on,i){ if(on)rel.push(i); }); if(rel.indexOf(0)<0)rel.unshift(0); break;
    default: rel=modeRel;
  }
  var lo=Math.min.apply(null,anchorCells.map(function(c){return c.pitch;})), hi=Math.max.apply(null,anchorCells.map(function(c){return c.pitch;}));
  var three=anchorCells.length===3, mid=three?lo+12:hi;
  /* the frame: every cell the drill may use, one per pitch */
  var frame=[], fMin=w, fMax=w+3;
  var chromFrame=chromatic||P.structure==='chromatic'||P.structure==='custom';   /* chromatic: four tones on every string, each string leaning a fret back as the fourths climb */
  var keyRel=chromFrame?null:modeRel, frameRel=chromFrame?[0,1,2,3,4,5,6,7,8,9,10,11]:modeRel;
  var all=null;
  if(chromFrame){
    /* chromatic: strictly four semitones on every string, from the root up (and down), so each string in fourths starts a fret
       further back (a fret further on, going down); the octaves land wherever the count puts them, not on the anchor's
       strings. The top string takes any extra tone needed to reach the top of the anchor's range; a string that would run
       below the nut keeps the tone instead. */
    all=[]; var rs=STRIDX[A.root], si=rs, cnt=0;
    for(var pu=root.pitch;;pu++){
      if(cnt>=4&&si<NS-1&&pu-OPEN[IDXSTR[si+1]]>=0){ si++; cnt=0; }
      if(cnt>=4&&si===NS-1&&pu>hi)break;
      if(pu>hi+30)break;
      all.push({pitch:pu,string:IDXSTR[si],fret:pu-OPEN[IDXSTR[si]]}); cnt++;
      if(si===NS-1&&cnt>=4&&pu>=hi)break;
    }
    si=rs; cnt=0;
    for(var pd=root.pitch-1;;pd--){
      if(cnt===0){ if(si===0)break; si--; }
      var fd=pd-OPEN[IDXSTR[si]]; if(fd<0)break;
      all.push({pitch:pd,string:IDXSTR[si],fret:fd}); cnt=(cnt+1)%4;
    }
    var core=all.filter(function(c){ return c.pitch>=lo&&c.pitch<=hi; });
    fMin=Math.min.apply(null,core.map(function(c){return c.fret;})); fMax=Math.max.apply(null,core.map(function(c){return c.fret;}));
    frameRel=null;
  }
  if(frameRel){
    var pitches=[]; for(var p=lo;p<=hi;p++) if(frameRel.indexOf(((p-rootPc)%12+12)%12)>=0) pitches.push(p);
    var fixed={}; anchorCells.forEach(function(c){ fixed[c.pitch]=c.string; });
    var placed=placeScale(pitches,fixed,w,chromFrame?'four':(P.frame==='three'?'three':'half'));
    if(placed){ frame=placed; fMin=Math.min.apply(null,placed.map(function(c){return c.fret;})); fMax=Math.max.apply(null,placed.map(function(c){return c.fret;})); }
  }
  if(!all&&!frame.length){ for(var s0=1;s0<=NS;s0++) for(var f0=w;f0<=w+3;f0++){ var p0=OPEN[s0]+f0; if(p0>=lo&&p0<=hi) frame.push({pitch:p0,string:s0,fret:f0}); } }
  /* below the root and above the top anchor: the strings outside the anchor, within the frame's frets */
  var topStr=anchorCells.filter(function(c){return c.pitch===hi;})[0].string;
  var outer={};
  if(!all) for(var s=1;s<=NS;s++) for(var f=fMin;f<=fMax;f++){ var pp=OPEN[s]+f;
    var ok=(pp<lo&&STRIDX[s]<=STRIDX[A.root])||(pp>hi&&STRIDX[s]>=STRIDX[topStr]);
    if(!ok)continue; if(keyRel&&keyRel.indexOf(((pp-rootPc)%12+12)%12)<0)continue;
    var prev=outer[pp], fc=(fMin+fMax)/2; if(!prev||Math.abs(f-fc)<Math.abs(prev.fret-fc)) outer[pp]={pitch:pp,string:s,fret:f}; }
  if(!all) all=frame.concat(Object.keys(outer).map(function(k){ return outer[k]; }));
  var cells=[];
  all.forEach(function(c){ var p=c.pitch, r=((p-rootPc)%12+12)%12; if(rel.indexOf(r)<0)return;
    var rg=fitRange(P);
    if(rg==='central'&&(p<lo||p>hi))return;
    if(rg==='attic'&&p<hi)return;
    if(rg==='basement'&&p>lo)return;
    if(rg==='lower'&&(p<lo||p>mid))return;
    if(rg==='upper'&&(p<mid||p>hi))return;
    if(three&&(p<lo||p>hi))return;   /* an E anchor's frame is its two octaves: nothing below the low root or above the high one */
    var nm=chromatic?{n:LETTERS[p%12],c:'#c9c5ba'}:nameOfRel(p%12-doPc);
    cells.push({string:c.string,fret:c.fret,pitch:p,anchor:anchorCells.some(function(a){return a.pitch===p;}),name:nm.n,color:nm.c}); });
  if(all.length){ var fs=cells.length?cells.map(function(c){return c.fret;}):[fMin,fMax]; fMin=Math.min(fMin,Math.min.apply(null,fs)); fMax=Math.max(fMax,Math.max.apply(null,fs)); }
  cells.sort(function(a,b){ return a.pitch-b.pitch; });
  var gw=Math.min(w,fMin), gn=Math.max(w+3,fMax)-gw+1;
  return { w:w, gw:gw, gn:gn, cells:cells, anchorCells:anchorCells, root:root, rootPc:rootPc, mode:modeName, doPc:doPc };
}

/* ── the hand: the index fret of the opening hand shape. From the first string the drill plays, go up the strings while every
      tone still fits under four fingers (the whole key, not just the tones chosen: a triad or a narrower range leaves the hand
      where it is). ── */
function handPos(P,b){
  var full=boxAt(Object.assign({},P,{structure:(P.mode==='Chromatic'||P.structure==='chromatic'||P.structure==='custom')?'chromatic':'mode',range:'all'}),b.w,b.mode);
  var played=b.cells.length?b.cells:full.cells; if(!played.length) return b.w;
  var s0=Math.max.apply(null,played.map(function(c){ return c.string; })), lo=99, hi=-99;
  for(var s=s0;s>=1;s--){ var fs=full.cells.filter(function(c){ return c.string===s; }).map(function(c){ return c.fret; }); if(!fs.length) continue;
    var l=Math.min(lo,Math.min.apply(null,fs)), h=Math.max(hi,Math.max.apply(null,fs));
    if(h-l>3&&lo<99) break; lo=l; hi=h; if(h-l>3) break; }
  return lo<99?lo:b.w;
}
/* the anchor's box start that puts the index at position N (the offset is found away from the nut, then checked where it lands) */
function boxFor(P,N,mode){
  N=Math.max(0,N); var t=boxAt(P,10,mode), d=handPos(P,t)-10, w=Math.max(0,N-d), b=boxAt(P,w,mode);
  if(handPos(P,b)===N) return b;
  var best=b, bd=Math.abs(handPos(P,b)-N);
  for(var k=Math.max(0,N-5);k<=N+5;k++){ var c=boxAt(P,k,mode), e=Math.abs(handPos(P,c)-N); if(e<bd){ best=c; bd=e; if(!e)break; } }
  return best;
}
function posOf(P,b){ return P.pv>=2?handPos(P,b):b.w; }

/* ── the boxes a drill visits: one, or a run of them from position P.start to position P.end (either way).
      chromatic shift: the box moves a fret at a time; modal shift: the root walks along its string through the tones of the
      key, each box in the mode of its new root. With P.loop (the default) the run comes back to its start and repeats. ── */
function boxes(P){
  use(P);
  var A=anchorOf(P.anchor), ro=rootOffset(A), a=Math.max(0,+P.start||0), e=Math.max(0,(P.end===undefined||P.end==='')?a:+P.end), d=e>=a?1:-1, out=[], v2=P.pv>=2;
  var at=function(N,mode){ return v2?boxFor(P,N,mode):boxAt(P,N,mode); };
  if(P.position==='chromatic'){ for(var w=a;d>0?w<=e:w>=e;w+=d){ var bx=at(w,P.mode); if(!out.length||out[out.length-1].w!==bx.w)out.push(bx); } }
  else if(P.position==='modal'){
    var b0=at(a,P.mode); out.push(b0);
    if(P.mode!=='Chromatic'){
      var doPc=b0.doPc, rootFret=b0.w+ro;
      for(var guard=0;guard<40;guard++){
        var f=rootFret, F=null;
        do{ f+=d; var pc=(OPEN[A.root]+f)%12; F=FN.filter(function(x){ return (doPc+x.s)%12===pc; })[0]; }while(!F&&f>=0&&f<=40);
        var w2=f-ro; if(!F||w2<0) break;
        var nb=boxAt(P,w2,F.n), np=posOf(P,nb); if(d>0?np>e:np<e) break;
        rootFret=f; out.push(nb);
      }
    }
  }
  else return [at(P.position==='open'?0:+P.position,P.mode)];
  if(P.loop!==false&&out.length>2) out=out.concat(out.slice(1,-1).reverse());   /* there and back; the loop closes on the start */
  return out;
}
function isShift(P){ return P.position==='chromatic'||P.position==='modal'; }

/* ── the order of the tones. Up & down (and down & up) turn so that every change of direction starts on a beat: the turning
      tone is played twice — it ends one run and begins the next — when the run alone would leave the turn off the beat
      (a one-octave diatonic run in eighths: eight up, eight down, two bars), and once when that is what lands on the beat
      (an odd count). Given the bar (per = cells in a 4/4 bar), the choice that also makes the lap fill whole bars wins. ── */
function ordered(cells,dir,per){
  var up=cells.slice();
  if(dir==='up')return up;
  if(dir==='down')return up.slice().reverse();
  if(up.length<2)return up;
  var dn=up.slice().reverse(), n=up.length, rep=false;
  if(per){ var bt=Math.max(1,per/4), score=function(L){ return ((2*L)%per===0?2:0)+(L%bt===0?1:0); }; rep=score(n)>score(n-1); }
  if(rep) return dir==='downup'?dn.concat(up):up.concat(dn);   /* each run complete: the turning tones are played twice */
  if(dir==='downup')return dn.concat(dn.slice(1,-1).reverse());   /* down, then back up to just below the start */
  return up.concat(up.slice(1,-1).reverse());   /* up, then back down to just above the start: it loops seamlessly */
}

/* ── the drill as notes for the tool's sequencer (voice = string − 1) ── */
function sequence(P){
  var B=boxes(P), notes=[], modes=[], col=0;
  B.forEach(function(b){
    if(b.mode!=='Chromatic'){ var F=fnByName(b.mode); modes.push({col:col,anchor:b.rootPc,val:F.v}); }
    ordered(b.cells,P.dir,+P.sub||8).forEach(function(c){ notes.push({start:col,dur:1,pitch:c.pitch,vel:96,voice:c.string-1}); col++; });
  });
  var per=+P.sub||8, loop=!(isShift(P)&&P.loop===false);
  /* the loop restarts on a downbeat: as many full laps as it takes to fill whole bars (up to eight) */
  if(loop&&col%per){ var k=1; while(k<8&&(k*col)%per)k++; if((k*col)%per===0&&k>1){ var n0=notes.slice(), m0=modes.slice();
      for(var j=1;j<k;j++){ n0.forEach(function(x){ var y=Object.assign({},x); y.start+=j*col; notes.push(y); }); m0.forEach(function(x){ var y=Object.assign({},x); y.col+=j*col; modes.push(y); }); }
      col*=k; } }
  var bars=Math.max(1,Math.ceil(col/per));
  return { notes:notes, modes:modes, length:col, per:per, bars:bars, boxes:B, loop:loop };
}

/* ── names ── */
function rootName(b){ return LETTERS[b.rootPc]; }
/* the name: what is played and where it is anchored — the tonality, the structure, the root string and the lean.
   "Do modal scale anchored on the A string leaning back". Everything else (key, position, range, direction, timing) is the
   description's. */
var NOUN={octave:'octaves',mode:'modal scale',triad:'triad',tetrachord:'tetrachord','do-pent':'pentatonic','la-pent':'pentatonic',chromatic:'chromatic scale',custom:'custom set'};
function title(P){
  use(P); var A=anchorOf(P.anchor), noun=NOUN[P.structure]||'modal scale';
  var head=P.mode==='Chromatic'?(noun==='chromatic scale'?'Chromatic scale':'Chromatic '+noun):(P.mode+' '+noun);
  return head+' anchored on the '+STRING_NAME[A.root]+' string leaning '+(/>$/.test(A.id)?'forward':'back');
}
/* the description: the key and where on the neck, then range, direction, timing, articulation and daily minutes */
function where(P){ var b=boxes(P)[0], key=P.mode==='Chromatic'?LETTERS[b.rootPc]+' root':(LETTERS[b.rootPc]+' as '+P.mode);
  var span=' from position '+P.start+' to '+P.end+(P.loop!==false?', looping':', once');
  var pn=handPos(P,b), here=pn===0?'open position':'position '+pn;
  return key+' · '+(P.position==='chromatic'?'chromatic shift'+span:(P.position==='modal'?'modal shift'+span:here+' · root at fret '+b.root.fret)); }
function summary(P){
  var R=RANGES.filter(function(r){return r.id===fitRange(P);})[0], D=DIRECTIONS.filter(function(d){return d.id===P.dir;})[0], S=SUBDIVISIONS.filter(function(s){return s.id===+P.sub;})[0];
  var dm=+P.daily||1;
  return where(P)+' · '+R.name+' range · '+D.name+' · '+P.bpm+' bpm '+S.name.toLowerCase()+' · '+P.artic+' · '+dm+' min a day';
}

/* ── the notes the designer writes for the student (a starting point: edit before submitting) ── */
function autoNotes(P){
  var B=boxes(P), A=anchorOf(P.anchor), b=B[0], L=[];
  var place=b.root.fret===0?'open':'at fret '+b.root.fret;
  var octs=b.anchorCells.filter(function(c){ return c.string!==A.root; }).map(function(c){ return STRING_NAME[c.string]+' string, fret '+c.fret; });
  L.push('Anchor: '+A.word+'. The root, '+rootName(b)+', is on the '+STRING_NAME[A.root]+' string '+place+'; its octave'+(octs.length>1?'s':'')+': '+octs.join(' and ')+'.');
  if(P.mode!=='Chromatic') L.push('The root is '+P.mode+'. Every tone in this drill is named by its function in that orientation.');
  var names=ordered(b.cells,'up').map(function(c){ return c.name; });
  if(names.length) L.push('Tones, low to high: '+names.join(' ')+'.');
  var R=RANGES.filter(function(r){return r.id===fitRange(P);})[0];
  L.push('Range: '+R.name+' — '+R.hint+'.');
  var pn=handPos(P,b); L.push(pn===0?'Open position: the open strings stand in for the index finger.':'Position '+pn+': the index finger starts at fret '+pn+'.');
  if(P.mode!=='Chromatic'&&P.structure!=='chromatic'&&P.structure!=='custom') L.push(P.frame==='three'?'Fingering: stretch — three tones on every string; the hand drifts as it climbs.':'Fingering: shift — no stretches; where the key doesn’t fit the four frets, a string shifts to keep its half step together, and the position stays.');
  else L.push('Fingering: four tones on every string; each string up starts a fret further back.');
  var way=(+P.end>=+P.start)?'up':'down', back=(P.loop!==false)?' Then come back the same way to position '+P.start+', and repeat.':'';
  if(P.position==='chromatic') L.push('Play the drill at position '+P.start+', then move the whole drill '+way+' one fret at a time to position '+P.end+'.'+back);
  if(P.position==='modal') L.push('Play the drill at position '+P.start+', then walk the root '+way+' its string to the next tone of the key and play it again, to position '+P.end+': the shape stays, the root takes a new function each time.'+back);
  var S=SUBDIVISIONS.filter(function(s){return s.id===+P.sub;})[0];
  L.push('Timing: '+S.name.toLowerCase()+' at '+P.bpm+' bpm, '+P.artic.toLowerCase()+'. Keep the pulse steady before adding speed.');
  L.push('Listen to your own tone on every note.');
  return L.join('\n');
}

/* ── the fretboard glyph: the instrument's strings (the highest on top), the box's four frets, the nut at the left when it is in view ── */
function glyphSVG(P,opts){
  /* Frets are the spaces between the wires: fret f sits between wire f−1 and wire f, and the nut is wire 0. An open string
     (fret 0) is drawn just left of the nut. So a frame that starts at fret 1 has the nut as its left edge, and one that holds
     open strings has a narrow open column, then the nut. */
  opts=opts||{}; use(P); var A=anchorOf(P.anchor), size=opts.size||1, cw=22*size, sh=13*size, padL=14*size, padT=8*size, padR=8*size, padB=(opts.frets?16:8)*size;
  var b=opts.box||null, w=b?b.w:0, lo=b?b.gw:1, hi=b?b.gw+b.gn-1:4;   /* the frets shown: the frame's, at least the anchor's four */
  var openCol=(lo===0), first=Math.max(1,lo), ow=openCol?cw*0.75:0, nCells=hi-first+1;
  var x0=padL+ow, W=x0+nCells*cw+padR, H=padT+(NS-1)*sh+padB;
  function fx(f){ return f===0?padL+ow/2:x0+(f-first+0.5)*cw; }
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+A.word+'">';
  for(var i=0;i<NS;i++) s+='<line x1="'+padL+'" x2="'+(x0+nCells*cw)+'" y1="'+(padT+i*sh)+'" y2="'+(padT+i*sh)+'" stroke="currentColor" stroke-opacity=".55" stroke-width="'+(1+0.2*i)+'"/>';
  for(var j=0;j<=nCells;j++){ var nut=(b&&j===0&&first===1); s+='<line x1="'+(x0+j*cw)+'" x2="'+(x0+j*cw)+'" y1="'+padT+'" y2="'+(padT+(NS-1)*sh)+'" stroke="currentColor" stroke-opacity="'+(nut?'.95':'.35')+'" stroke-width="'+(nut?3.5*size:1)+'"/>'; }
  if(opts.frets&&b){ for(var f=lo;f<=hi;f++) s+='<text x="'+fx(f)+'" y="'+(H-3*size)+'" font-size="'+(9*size)+'" text-anchor="middle" fill="currentColor" fill-opacity=".6" font-family="IBM Plex Mono,monospace">'+f+'</text>'; }
  function xy(st,fret){ return [fx(fret), padT+(st-1)*sh]; }
  if(b&&opts.tones){
    b.cells.forEach(function(c){ if(c.anchor)return; var p=xy(c.string,c.fret); s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+(4.2*size)+'" fill="'+c.color+'" stroke="#000" stroke-width="'+(0.8*size)+'"/>'; });
    b.cells.forEach(function(c){ if(!c.anchor)return; var p=xy(c.string,c.fret); s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+(5.6*size)+'" fill="'+c.color+'" stroke="#fff" stroke-width="'+(1.2*size)+'"/>'; });
    return s+'</svg>';
  }
  A.tones.forEach(function(t){ var p=xy(t[0],(b?w:1)+t[1]);   /* the bare shape (the anchor picker): drawn from fret 1 */
    s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+(5.6*size)+'" fill="#3ddc4a" stroke="#000" stroke-width="'+(1.2*size)+'"/>'; });
  return s+'</svg>';
}

/* ── the back end: the Google Sheet's web app, or, with no address set, a demo kept in this browser ── */
function api(action,payload){
  payload=payload||{}; payload.action=action;
  var URL=G.STUDIO_API||'';
  if(!URL) return Promise.resolve(demo(payload));
  return fetch(URL,{method:'POST',body:JSON.stringify(payload)}).then(function(r){ return r.json(); });
}
function demoDB(){ var e={students:[],drills:[],checks:[],songs:[]}; try{ var d=JSON.parse(localStorage.getItem('studio-demo')||'')||e; d.songs=d.songs||[]; return d; }catch(x){ return e; } }
function demoSave(db){ try{ localStorage.setItem('studio-demo',JSON.stringify(db)); }catch(e){} }
function rid(n){ var c='abcdefghjkmnpqrstuvwxyz23456789',s=''; for(var i=0;i<n;i++)s+=c.charAt(Math.floor(Math.random()*c.length)); return s; }
/* the same answers the Google Sheet gives (apps-script.gs), kept in this browser */
function demo(p){
  var db=demoDB(), a=p.action, today=ymd(new Date());
  function stu(sid){ return db.students.filter(function(x){return x.sid===sid;})[0]; }
  function full(s){ return ((s.first||s.name||'')+' '+(s.last||'')).trim(); }
  function split(n){ n=String(n||'').trim().replace(/\s+/g,' '); var i=n.indexOf(' '); return i<0?[n,'']:[n.slice(0,i),n.slice(i+1)]; }
  function prof(s,teacher){ var o={sid:s.sid,name:(s.first||s.name||'').trim(),track:!!s.track,inst:s.inst||'guitar',hand:s.hand==='left'?'left':'right',about:s.about||'',since:s.since||today};
    if(teacher){ o.status=s.status==='former'?'former':'current'; o.day=(s.day===''||s.day==null)?'':+s.day; o.time=s.time||''; o.routineAt=s.routineAt||'';
      if(!o.routineAt) db.drills.forEach(function(d){ if(d.sid===s.sid&&d.at&&d.at>o.routineAt)o.routineAt=d.at; });
      o.first=o.name; o.last=s.last||''; o.name=full(s); o.email=s.email||''; o.phone=s.phone||''; } return o; }
  function touch(sid){ var t=stu(sid); if(t){ var n=new Date(); t.routineAt=ymd(n)+'T'+String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0'); } }
  function songs(sid){ return db.songs.filter(function(x){ return !sid||x.sid===sid; }); }
  function dr(d){ var o=JSON.parse(JSON.stringify(d)); o.status=o.status||''; return o; }
  if(a==='student'){ var s=stu(p.sid); if(!s)return {ok:false,error:'no such student'};
    return {ok:true,student:prof(s),drills:db.drills.filter(function(d){return d.sid===p.sid;}).map(dr),checks:db.checks.filter(function(c){return c.sid===p.sid;}),opens:[],songs:songs(p.sid)}; }
  if(a==='optin'){ var so=stu(p.sid); if(!so)return {ok:false,error:'no such student'}; so.track=!!p.on; demoSave(db); return {ok:true,track:so.track}; }
  if(a==='about'){ var sa=stu(p.sid); if(!sa)return {ok:false,error:'no such student'}; sa.about=String(p.text||'').slice(0,2000); demoSave(db); return {ok:true,about:sa.about}; }
  if(a==='song'){ if(!stu(p.sid))return {ok:false,error:'no such student'}; var les=/^lessons\/[\w-]+\.html$/.test(String(p.lesson||''))?p.lesson:'';
    if(p.rid){ var sg=db.songs.filter(function(x){ return x.rid===p.rid&&x.sid===p.sid; })[0]; if(!sg)return {ok:false,error:'no such song'};
      if(p.remove){ db.songs=db.songs.filter(function(x){ return x!==sg; }); demoSave(db); return {ok:true,songs:songs(p.sid)}; }
      if(p.title!==undefined)sg.title=String(p.title).slice(0,120); if(p.artist!==undefined)sg.artist=String(p.artist).slice(0,120); if(p.lesson!==undefined)sg.lesson=les;
      if(p.status==='done'||p.status==='learning'){ sg.status=p.status; sg.finished=p.status==='done'?today:''; }
      demoSave(db); return {ok:true,songs:songs(p.sid),rid:sg.rid}; }
    var t=String(p.title||'').trim(); if(!t)return {ok:false,error:'no title'};
    var ns={rid:rid(8),sid:p.sid,title:t.slice(0,120),artist:String(p.artist||'').slice(0,120),lesson:les,status:p.status==='done'?'done':'learning',started:today,finished:p.status==='done'?today:''};
    db.songs.push(ns); demoSave(db); return {ok:true,songs:songs(p.sid),rid:ns.rid}; }
  if(a==='drill'){ var d=db.drills.filter(function(x){return x.did===p.did;})[0]; if(!d)return {ok:false,error:'no such drill'};
    var o=dr(d), sd=stu(d.sid)||{}; o.track=!!sd.track; o.hand=sd.hand==='left'?'left':'right'; o.inst=sd.inst||'guitar';
    if(o.params&&o.params.kind==='song'){ var so2=db.songs.filter(function(x){ return x.rid===o.params.rid; })[0]; if(so2)o.song=so2; }
    return {ok:true,drill:o}; }
  if(a==='check'){ db.checks=db.checks.filter(function(c){ return !(c.sid===p.sid&&c.did===p.did&&c.week===p.week&&c.day===+p.day); });
    if(p.on)db.checks.push({sid:p.sid,did:p.did,week:p.week,day:+p.day}); demoSave(db); return {ok:true}; }
  if(a==='open') return {ok:true};
  /* the teacher's (the demo has no passphrase) */
  if(a==='ping') return {ok:true};
  if(a==='students') return {ok:true,students:db.students.map(function(s){ return prof(s,true); })};
  if(a==='assign'){ var nm=String(p.student||'').trim().replace(/\s+/g,' '); if(!nm&&!p.sid)return {ok:false,error:'no student name'};
    var st=db.students.filter(function(x){ return p.sid?x.sid===p.sid:full(x).toLowerCase()===nm.toLowerCase(); })[0]; if(p.sid&&!st)return {ok:false,error:'no such student'};
    if(!st){ var sp0=split(nm); st={sid:rid(10),first:sp0[0],last:sp0[1],inst:INSTRUMENTS[p.inst]?p.inst:'guitar',hand:p.hand==='left'?'left':'right',since:today}; db.students.push(st); }
    var ex=p.ex?+p.ex:db.drills.filter(function(d){return d.sid===st.sid;}).length+1, did=rid(8);
    db.drills.push({did:did,sid:st.sid,date:p.date,ex:ex,title:p.title,params:p.params,notes:p.notes,status:''}); touch(st.sid); demoSave(db); return {ok:true,sid:st.sid,did:did,ex:ex,name:full(st),inst:st.inst||'guitar'}; }
  if(a==='overview') return {ok:true,students:db.students.map(function(s){ return prof(s,true); }),drills:db.drills.map(dr),checks:db.checks,opens:[],songs:songs(null)};
  if(a==='update'){ var du=db.drills.filter(function(x){return x.did===p.did;})[0]; if(!du)return {ok:false,error:'no such drill'};
    ['date','title','params','notes'].forEach(function(k){ if(p[k]!==undefined)du[k]=p[k]; }); if(p.ex)du.ex=+p.ex; if(p.status!==undefined)du.status=p.status==='retired'?'retired':'';
    touch(du.sid); demoSave(db); return {ok:true,did:du.did,sid:du.sid}; }
  if(a==='remove'){ var dx=db.drills.filter(function(x){return x.did===p.did;})[0]; if(dx)touch(dx.sid); var n0=db.drills.length; db.drills=db.drills.filter(function(x){return x.did!==p.did;}); db.checks=db.checks.filter(function(c){return c.did!==p.did;}); demoSave(db); return n0>db.drills.length?{ok:true}:{ok:false,error:'no such drill'}; }
  if(a==='profile'){ var pf=String(p.first||'').trim().slice(0,60), pl=String(p.last||'').trim().slice(0,60), pn=(pf+' '+pl).trim(); if(!pf)return {ok:false,error:'no first name'};
    if(db.students.some(function(x){ return x.sid!==p.sid&&full(x).toLowerCase()===pn.toLowerCase(); }))return {ok:false,error:'another student already has that first and last name'};
    var sp=p.sid?stu(p.sid):null; if(p.sid&&!sp)return {ok:false,error:'no such student'};
    if(!sp){ sp={sid:rid(10),since:today}; db.students.push(sp); }
    sp.first=pf; sp.last=pl; delete sp.name; sp.inst=INSTRUMENTS[p.inst]?p.inst:'guitar'; sp.hand=p.hand==='left'?'left':'right'; sp.email=String(p.email||'').trim(); sp.phone=String(p.phone||'').trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(String(p.since||'')))sp.since=p.since;
    sp.status=p.status==='former'?'former':'current'; sp.day=/^[0-6]$/.test(String(p.day))?+p.day:''; sp.time=/^\d{1,2}:\d{2}$/.test(String(p.time||''))?p.time:''; demoSave(db); return {ok:true,sid:sp.sid}; }
  if(a==='notify'){ var sn=stu(p.sid); if(!sn)return {ok:false,error:'no such student'}; if(!sn.email)return {ok:false,error:'no email on this student’s profile'};
    try{ console.log('[demo] email to '+sn.email+': '+p.subject+'\n'+p.body); }catch(e){} return {ok:true,to:sn.email,left:99,demo:true}; }
  return {ok:false,error:'unknown action'};
}

/* ── routine items: a drill (built here), a song from the student's repertoire, or any other assignment (improvisation,
      ear training…). Each has its daily minutes; each either opens a page (the drill, the song's lesson, a link) or the
      page's own stopwatch. ── */
var ITEM_KINDS=[ {id:'drill',name:'Drill',label:'Warm-up'}, {id:'song',name:'Song',label:'Repertoire'}, {id:'task',name:'Other',label:'Practice'} ];
var TASK_LABELS=['Improvisation','Technique','Ear training','Reading','Rhythm','Writing','Listening','Other'];
function kindOf(d){ var k=d&&d.params&&d.params.kind; return (k==='song'||k==='task')?k:'drill'; }
function itemLabel(d){ var k=kindOf(d); if(k==='task')return (d.params.label||'Practice'); return k==='song'?'Repertoire':'Warm-up'; }
function minutesOf(d){ return Math.max(0.5,+(d&&d.params&&d.params.daily)||1); }
function lessonOf(file){ var L=G.LESSONS||[]; for(var i=0;i<L.length;i++) if(L[i].file===file) return L[i]; return null; }
function initials(name){ var w=String(name||'').replace(/[_.\-]+/g,' ').trim().split(/\s+/).filter(Boolean); if(!w.length)return '?';
  return (w[0].charAt(0)+(w.length>1?w[w.length-1].charAt(0):'')).toUpperCase(); }
/* the routine: the items still in it, in the order they were assigned */
function byAssigned(a,b){ return (a.date+'|'+String(a.ex).padStart(4,'0'))<(b.date+'|'+String(b.ex).padStart(4,'0'))?-1:1; }
function routine(drills){ return (drills||[]).filter(function(d){ return d.status!=='retired'; }).sort(byAssigned); }
function itemTitle(d,songs){ if(d.title)return d.title; if(kindOf(d)==='drill')return title(Object.assign(defaults(),d.params||{})); if(kindOf(d)==='song'){ var s=(songs||[]).filter(function(x){ return x.rid===d.params.rid; })[0]; return songTitle(s); } return itemLabel(d); }
function firstName(n){ if(n&&typeof n==='object')n=n.first||n.name; return String(n||'').split(/[\s_]+/)[0]||String(n||''); }
/* what the Designer and the Overview send a student: an email with the routine, a text with the link */
function message(student,link,drills,songs){
  var R=routine(drills), tot=R.reduce(function(t,d){ return t+minutesOf(d); },0), hi='Hi '+firstName(student);
  var lines=R.map(function(d,i){ return (i+1)+'. '+itemLabel(d)+' · '+itemTitle(d,songs)+' — '+minutesOf(d)+' min'; });
  return { subject:'Your practice this week',
           body:hi+',\n\nYour practice routine is ready'+(R.length?':\n\n'+lines.join('\n')+'\n\nAbout '+Math.round(tot)+' minutes a day.':'.')+'\n\nOpen your page to start: '+link+'\n\n— Brian\nGables Guitar Studio',
           text:hi+'! Your practice for this week is ready: '+link }; }
function smsHref(phone,text){ return 'sms:'+String(phone||'').replace(/[^\d+]/g,'')+'?&body='+encodeURIComponent(text); }   /* ?& works on iPhone and Android */
var WEEKDAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
function clock12(t){ var m=/^(\d{1,2}):(\d{2})$/.exec(t||''); if(!m)return ''; var h=+m[1], ap=h<12?'am':'pm'; h=h%12||12; return h+(m[2]==='00'?'':':'+m[2])+' '+ap; }
function lessonSlot(st){ if(st.day===''||st.day==null)return ''; return WEEKDAYS[+st.day]+'s'+(st.time?' at '+clock12(st.time):''); }
function songTitle(s){ return s?(s.title+(s.artist?' — '+s.artist:'')):'A removed song'; }

/* ── a day's star: empty, or filled from the bottom up by a fraction (0–1, in tenths) ── */
var _starN=0;
function starSVG(frac,size,label){
  size=size||28; frac=Math.max(0,Math.min(1,frac||0)); var id='st'+(++_starN), pc=(100*frac).toFixed(0);
  var path='M12 2.2l2.95 6.3 6.85.8-5.08 4.68 1.38 6.77L12 17.3l-6.1 3.45 1.38-6.77L2.2 9.3l6.85-.8z';
  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" role="img" aria-label="'+(label||(pc+'%'))+'"><defs><linearGradient id="'+id+'" x1="0" y1="1" x2="0" y2="0">'
    +'<stop offset="'+pc+'%" stop-color="#e2c46a"/><stop offset="'+pc+'%" stop-color="#e2c46a" stop-opacity="0"/></linearGradient></defs>'
    +'<path d="'+path+'" fill="url(#'+id+')" stroke="'+(frac>=1?'#e2c46a':'#6f6c65')+'" stroke-width="1.4" stroke-linejoin="round"/></svg>';
}
/* the share of a day's assigned time a tracked student played, to the nearest tenth */
function dayFrac(opens,did,date,daily){ var s=0; (opens||[]).forEach(function(o){ if(o.did===did&&o.date===date)s+=(+o.play||0); });
  return { secs:s, frac:Math.min(1,Math.round(10*s/(60*Math.max(0.25,+daily||1)))/10) }; }

/* ── weeks: Monday's date, local time ── */
function ymd(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function mondayOf(d){ d=new Date(d.getFullYear(),d.getMonth(),d.getDate()); var k=(d.getDay()+6)%7; d.setDate(d.getDate()-k); return d; }
function weekKey(d){ return ymd(mondayOf(d||new Date())); }
function addDays(key,n){ var p=key.split('-'); var d=new Date(+p[0],+p[1]-1,+p[2]); d.setDate(d.getDate()+n); return ymd(d); }

function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function base(){ return location.href.replace(/[^\/]*([?#].*)?$/,''); }

G.Studio={ INSTRUMENTS:INSTRUMENTS, instOf:instOf, anchorsFor:function(inst){ return instOf(inst).anchors||[]; }, anchorOf:anchorOf, FN:FN, POSITIONS:POSITIONS, MODES:MODES, RANGES:RANGES, STRUCTURES:STRUCTURES,
  DIRECTIONS:DIRECTIONS, FRAMES:FRAMES, rangesFor:rangesFor, fitRange:fitRange, SUBDIVISIONS:SUBDIVISIONS, ARTICULATIONS:ARTICULATIONS, defaults:defaults, boxes:boxes, ordered:ordered, sequence:sequence,
  ITEM_KINDS:ITEM_KINDS, TASK_LABELS:TASK_LABELS, kindOf:kindOf, itemLabel:itemLabel, minutesOf:minutesOf, lessonOf:lessonOf, initials:initials, songTitle:songTitle, WEEKDAYS:WEEKDAYS, clock12:clock12, lessonSlot:lessonSlot, routine:routine, byAssigned:byAssigned, itemTitle:itemTitle, firstName:firstName, message:message, smsHref:smsHref,
  handPos:handPos, posOf:posOf, title:title, where:where, summary:summary, isShift:isShift, starSVG:starSVG, dayFrac:dayFrac, autoNotes:autoNotes, glyphSVG:glyphSVG, api:api, weekKey:weekKey, addDays:addDays, ymd:ymd, esc:esc, base:base,
  isDemo:function(){ return !G.STUDIO_API; } };
})(window);
