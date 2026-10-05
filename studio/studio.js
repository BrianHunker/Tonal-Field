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
   A drill = an anchor, a position on the neck, a mode (which function the root is), a range of the four-fret box, a harmonic
   structure (which tones), a direction, and timing. From those the tones are found on the fretboard, ordered by pitch, and
   written as a sequence for the Tonal Field tool. */
(function(G){
'use strict';

/* ── strings: 1 is the high E, 6 the low E. Pitches in the tool's own numbering (the low E open is 16; pitch mod 12 is the
      pitch class, E = 4). ── */
var OPEN={1:40,2:35,3:31,4:26,5:21,6:16};
var LETTERS=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
var STRING_NAME={1:'high E',2:'B',3:'G',4:'D',5:'A',6:'low E'};

/* ── the five anchors: [string, fret offset within the box] ── */
var ANCHORS=[
  { id:'E>', root:6, word:'E forward', glyph:'E▸', tones:[[6,0],[4,2],[1,0]] },
  { id:'E<', root:6, word:'E back',    glyph:'E◂', tones:[[6,3],[3,0],[1,3]] },
  { id:'A>', root:5, word:'A forward', glyph:'A▸', tones:[[5,0],[3,2]] },
  { id:'A<', root:5, word:'A back',    glyph:'A◂', tones:[[5,2],[2,0]] },
  { id:'D>', root:4, word:'D forward', glyph:'D▸', tones:[[4,0],[2,3]] }
];
function anchorOf(id){ for(var i=0;i<ANCHORS.length;i++) if(ANCHORS[i].id===id) return ANCHORS[i]; return ANCHORS[0]; }
function rootOffset(A){ for(var i=0;i<A.tones.length;i++) if(A.tones[i][0]===A.root) return A.tones[i][1]; return 0; }

/* ── the seven functions: semitones above Do, the tool's colours, and the mode letters the tool's sequencer uses ── */
var FN=[ {n:'Do',s:0,c:'#22BB22',v:'d'}, {n:'Re',s:2,c:'#FF8800',v:'r'}, {n:'Mi',s:4,c:'#2255FF',v:'m'}, {n:'Fa',s:5,c:'#FFD700',v:'f'},
         {n:'Sol',s:7,c:'#EE0000',v:'s'}, {n:'La',s:9,c:'#9a4fc4',v:'l'}, {n:'Ti',s:11,c:'#FF00FF',v:'t'} ];
var ANTI={1:{n:'~Do',c:'#005500'},3:{n:'~Re',c:'#aa5500'},6:{n:'~Sol',c:'#880000'},8:{n:'~La',c:'#4b0082'},10:{n:'~Mi',c:'#001188'}};
function fnByName(n){ for(var i=0;i<FN.length;i++) if(FN[i].n===n) return FN[i]; return null; }
function nameOfRel(rel){ rel=((rel%12)+12)%12; for(var i=0;i<FN.length;i++) if(FN[i].s===rel) return FN[i]; return ANTI[rel]; }

var POSITIONS=['open'].concat(Array.apply(null,{length:20}).map(function(_,i){ return i+1; })).concat(['chromatic','modal']);
var MODES=['Do','Re','Mi','Fa','Sol','La','Ti','Chromatic'];
/* ranges: an A or D anchor spans one octave, so its frame has a middle, an attic above and a basement below; an E anchor spans
   two octaves from the low E to the high E, so it divides into its lower and upper octave instead */
var RANGES=[ {id:'central',name:'Central',hint:'between the anchor’s octaves',two:true}, {id:'attic',name:'Attic',hint:'above the top octave',two:true},
             {id:'basement',name:'Basement',hint:'below the root',two:true},
             {id:'lower',name:'Lower Octave',hint:'from the root on the low E to its octave',three:true}, {id:'upper',name:'Upper Octave',hint:'from the octave up to the high E',three:true},
             {id:'all',name:'All',hint:'the whole frame',two:true,three:true} ];
function rangesFor(anchorId){ var three=anchorOf(anchorId).tones.length===3; return RANGES.filter(function(r){ return three?r.three:r.two; }); }
function fitRange(P){ var ok=rangesFor(P.anchor).some(function(r){ return r.id===P.range; }); if(ok)return P.range;
  return anchorOf(P.anchor).tones.length===3?({central:'lower',basement:'lower',attic:'upper'}[P.range]||'all'):({lower:'central',upper:'central'}[P.range]||'all'); }
var STRUCTURES=[ {id:'octave',name:'Octave'}, {id:'mode',name:'Mode'}, {id:'triad',name:'Triad'}, {id:'tetrachord',name:'Tetrachord shape'},
                 {id:'do-pent',name:'Do Pentatonic'}, {id:'la-pent',name:'La Pentatonic'}, {id:'chromatic',name:'Chromatic'}, {id:'custom',name:'Custom'} ];
var DIRECTIONS=[ {id:'updown',name:'Up & down'}, {id:'up',name:'Up'}, {id:'down',name:'Down'} ];
var SUBDIVISIONS=[ {id:4,name:'Quarters'}, {id:8,name:'Eighths'}, {id:12,name:'Triplets'}, {id:16,name:'Sixteenths'} ];
var ARTICULATIONS=['Down strokes','Up strokes','Alternate','Cross picking','Sweep picking','Strumming 1:1','Strumming 2:1'];

var FRAMES=[ {id:'half',name:'Half steps together'}, {id:'three',name:'Three per string'} ];   /* chromatic drills always take four per string */
function defaults(){ return { anchor:'E>', position:5, start:1, mode:'Do', frame:'half', range:'central', structure:'mode', custom:[1,0,0,0,0,0,0,0,0,0,0,0],
                               dir:'updown', bpm:60, sub:8, artic:'Alternate' }; }

/* ── one frame: the anchor placed with its box starting at fret w, and every tone of the key between (and around) its
      octaves given a string. The frame flexes with the fingering rule:
        'half'  — keep the half steps (Mi–Fa, Ti–Do) together on one string; a tone may lean a fret outside the anchor's box
        'three' — three tones on every string between the anchor's strings
        (chromatic drills are strung separately: strictly four semitones per string)
      The anchors never move. Among all the ways to string the tones from the root up to the top anchor, the one with the
      fewest broken rules wins, then the narrowest span of frets. ── */
var STRIDX={6:0,5:1,4:2,3:3,2:4,1:5}, IDXSTR=[6,5,4,3,2,1];
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
    for(var k=s0;k<s1;k++) dev+=Math.abs((per[IDXSTR[k]]||0)-T)*(rule!=='half'?(6-(k-s0)):1);   /* every string from the root's up to (not) the top anchor's, empty ones too; three per string fills from the root string up */
    var lean=0; for(var j=0;j<n;j++){ if(cur[j].fret<w)lean+=w-cur[j].fret; if(cur[j].fret>w+3)lean+=cur[j].fret-(w+3); }
    if(rule!=='half') c=1000*dev+100*split;
    else c=1000*split+100*dev;
    return c+20*(hi-lo)+5*lean;
  }
  function go(i,sIdx){
    if(i===n){ var c=cost(); if(c<bestCost){ bestCost=c; best=cur.slice(); } return; }
    var p=pitches[i];
    if(fixed[p]!==undefined){ var fs=STRIDX[fixed[p]]; if(fs<sIdx)return; cur[i]={pitch:p,string:fixed[p],fret:p-OPEN[fixed[p]]}; go(i+1,fs); return; }
    var limit=5; for(var q=i+1;q<n;q++) if(fixed[pitches[q]]!==undefined){ limit=STRIDX[fixed[pitches[q]]]; break; }
    for(var si=sIdx;si<=limit;si++){ var st=IDXSTR[si], f=p-OPEN[st]; if(f<0||f<w-2||f>w+6)continue;
      cur[i]={pitch:p,string:st,fret:f}; go(i+1,si); }
  }
  go(0,0);
  return best;
}
function boxAt(P,w,modeName){
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
      if(cnt>=4&&si<5&&pu-OPEN[IDXSTR[si+1]]>=0){ si++; cnt=0; }
      if(cnt>=4&&si===5&&pu>hi)break;
      if(pu>hi+30)break;
      all.push({pitch:pu,string:IDXSTR[si],fret:pu-OPEN[IDXSTR[si]]}); cnt++;
      if(si===5&&cnt>=4&&pu>=hi)break;
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
  if(!all&&!frame.length){ for(var s0=1;s0<=6;s0++) for(var f0=w;f0<=w+3;f0++){ var p0=OPEN[s0]+f0; if(p0>=lo&&p0<=hi) frame.push({pitch:p0,string:s0,fret:f0}); } }
  /* below the root and above the top anchor: the strings outside the anchor, within the frame's frets */
  var topStr=anchorCells.filter(function(c){return c.pitch===hi;})[0].string;
  var outer={};
  if(!all) for(var s=1;s<=6;s++) for(var f=fMin;f<=fMax;f++){ var pp=OPEN[s]+f;
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

/* ── the boxes a drill visits: one, or a run of them (chromatic shift: up one fret at a time through the octave;
      modal shift: the root walks up its string through the key, each box in the mode of its new root) ── */
function boxes(P){
  var A=anchorOf(P.anchor), ro=rootOffset(A);
  if(P.position==='chromatic'){ var out=[]; for(var k=0;k<=12;k++) out.push(boxAt(P,P.start+k,P.mode)); return out; }
  if(P.position==='modal'){
    if(P.mode==='Chromatic') return [boxAt(P,P.start,P.mode)];
    var b0=boxAt(P,P.start,P.mode), doPc=b0.doPc, out2=[b0], w=P.start, rootFret=P.start+ro;
    var start=FN.indexOf(fnByName(P.mode));
    for(var j=1;j<=7;j++){
      var F=FN[(start+j)%7], target=(doPc+F.s)%12, f=rootFret+1;
      while(((OPEN[A.root]+f)%12)!==target) f++;
      rootFret=f; w=rootFret-ro; out2.push(boxAt(P,w,F.n));
    }
    return out2;
  }
  var w0=P.position==='open'?0:+P.position;
  return [boxAt(P,w0,P.mode)];
}

function ordered(cells,dir){
  var up=cells.slice();
  if(dir==='up')return up;
  if(dir==='down')return up.slice().reverse();
  if(up.length<2)return up;
  return up.concat(up.slice(1,-1).reverse());   /* up, then back down to just above the start: it loops seamlessly */
}

/* ── the drill as notes for the tool's sequencer (voice = string − 1) ── */
function sequence(P){
  var B=boxes(P), notes=[], modes=[], col=0;
  B.forEach(function(b){
    if(b.mode!=='Chromatic'){ var F=fnByName(b.mode); modes.push({col:col,anchor:b.rootPc,val:F.v}); }
    ordered(b.cells,P.dir).forEach(function(c){ notes.push({start:col,dur:1,pitch:c.pitch,vel:96,voice:c.string-1}); col++; });
  });
  var per=+P.sub||8, bars=Math.max(1,Math.ceil(col/per));
  return { notes:notes, modes:modes, length:col, per:per, bars:bars, boxes:B };
}

/* ── names ── */
function rootName(b){ return LETTERS[b.rootPc]; }
function title(P){
  var A=anchorOf(P.anchor), B=boxes(P), b=B[0], st=STRUCTURES.filter(function(s){return s.id===P.structure;})[0];
  var where=P.position==='open'?'open position':(P.position==='chromatic'?'chromatic shift from fret '+P.start:(P.position==='modal'?'modal shift from fret '+P.start:'root at fret '+b.root.fret));
  var modeTxt=P.mode==='Chromatic'?rootName(b):(rootName(b)+' as '+P.mode);
  return A.word+' · '+st.name+' · '+modeTxt+' · '+where;
}
function summary(P){
  var R=RANGES.filter(function(r){return r.id===fitRange(P);})[0], D=DIRECTIONS.filter(function(d){return d.id===P.dir;})[0], S=SUBDIVISIONS.filter(function(s){return s.id===+P.sub;})[0];
  return R.name+' range · '+D.name+' · '+P.bpm+' bpm '+S.name.toLowerCase()+' · '+P.artic;
}

/* ── the notes the designer writes for the student (a starting point: edit before submitting) ── */
function autoNotes(P){
  var A=anchorOf(P.anchor), B=boxes(P), b=B[0], L=[];
  var place=b.root.fret===0?'open':'at fret '+b.root.fret;
  var octs=b.anchorCells.filter(function(c){ return c.string!==A.root; }).map(function(c){ return STRING_NAME[c.string]+' string, fret '+c.fret; });
  L.push('Anchor: '+A.word+'. The root, '+rootName(b)+', is on the '+STRING_NAME[A.root]+' string '+place+'; its octave'+(octs.length>1?'s':'')+': '+octs.join(' and ')+'.');
  if(P.mode!=='Chromatic') L.push('The root is '+P.mode+'. Every tone in this drill is named by its function in that orientation.');
  var names=ordered(b.cells,'up').map(function(c){ return c.name; });
  if(names.length) L.push('Tones, low to high: '+names.join(' ')+'.');
  var R=RANGES.filter(function(r){return r.id===fitRange(P);})[0];
  L.push('Range: '+R.name+' — '+R.hint+'.');
  if(P.mode!=='Chromatic'&&P.structure!=='chromatic'&&P.structure!=='custom') L.push(P.frame==='three'?'Fingering: three tones on every string.':'Fingering: the half steps (Mi–Fa, Ti–Do) stay together on one string.');
  else L.push('Fingering: four tones on every string; each string up starts a fret further back.');
  if(P.position==='chromatic') L.push('When the box feels even, move the whole drill up one fret and play it again, through the octave.');
  if(P.position==='modal') L.push('When the box feels even, walk the root up its string to the next tone of the key and play the drill again from there: the box is the same shape, but the root takes a new function each time.');
  var S=SUBDIVISIONS.filter(function(s){return s.id===+P.sub;})[0];
  L.push('Timing: '+S.name.toLowerCase()+' at '+P.bpm+' bpm, '+P.artic.toLowerCase()+'. Keep the pulse steady before adding speed.');
  L.push('Listen to your own tone on every note.');
  return L.join('\n');
}

/* ── the fretboard glyph: six strings (high E on top), the box's four frets, the nut at the left when it is in view ── */
function glyphSVG(P,opts){
  opts=opts||{}; var A=anchorOf(P.anchor), size=opts.size||1, cw=22*size, sh=13*size, padL=18*size, padT=8*size, padR=8*size, padB=(opts.frets?16:8)*size;
  var b=opts.box||null, w=b?b.w:0, g=b?b.gw:0, nf=b?b.gn:4, W=padL+nf*cw+padR, H=padT+5*sh+padB;   /* the drawn frets: the frame's, at least the anchor's four */
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+A.word+'">';
  for(var i=0;i<6;i++) s+='<line x1="'+padL+'" x2="'+(padL+nf*cw)+'" y1="'+(padT+i*sh)+'" y2="'+(padT+i*sh)+'" stroke="currentColor" stroke-opacity=".55" stroke-width="'+(1+0.2*i)+'"/>';
  for(var j=0;j<=nf;j++){ var nut=(j===0&&b&&g===0); s+='<line x1="'+(padL+j*cw)+'" x2="'+(padL+j*cw)+'" y1="'+padT+'" y2="'+(padT+5*sh)+'" stroke="currentColor" stroke-opacity="'+(nut?'.95':'.35')+'" stroke-width="'+(nut?3:1)+'"/>'; }
  if(opts.frets&&b){ for(var k=0;k<nf;k++) s+='<text x="'+(padL+(k+0.5)*cw)+'" y="'+(H-3*size)+'" font-size="'+(9*size)+'" text-anchor="middle" fill="currentColor" fill-opacity=".6" font-family="IBM Plex Mono,monospace">'+(g+k)+'</text>'; }
  function xy(st,off){ return [padL+(off+0.5)*cw, padT+(st-1)*sh]; }
  if(b&&opts.tones){ b.cells.forEach(function(c){ if(c.anchor)return; var p=xy(c.string,c.fret-g); s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+(4.2*size)+'" fill="'+c.color+'" stroke="#000" stroke-width="'+(0.8*size)+'"/>'; }); }
  if(b&&opts.tones){ b.cells.forEach(function(c){ if(!c.anchor)return; var p=xy(c.string,c.fret-g);
      s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+(5.6*size)+'" fill="'+c.color+'" stroke="#fff" stroke-width="'+(1.2*size)+'"/>'; }); return s+'</svg>'; }
  A.tones.forEach(function(t){ var p=xy(t[0],t[1]+w-g), col=(b&&opts.tones)?(b.cells.filter(function(c){return c.string===t[0]&&c.fret===w+t[1];})[0]||{color:'#22BB22'}).color:'#3ddc4a';
    s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+(5.6*size)+'" fill="'+col+'" stroke="'+(opts.tones?'#fff':'#000')+'" stroke-width="'+(1.2*size)+'"/>'; });
  return s+'</svg>';
}

/* ── the back end: the Google Sheet's web app, or, with no address set, a demo kept in this browser ── */
function api(action,payload){
  payload=payload||{}; payload.action=action;
  var URL=G.STUDIO_API||'';
  if(!URL) return Promise.resolve(demo(payload));
  return fetch(URL,{method:'POST',body:JSON.stringify(payload)}).then(function(r){ return r.json(); });
}
function demoDB(){ try{ return JSON.parse(localStorage.getItem('studio-demo')||'')||{students:[],drills:[],checks:[]}; }catch(e){ return {students:[],drills:[],checks:[]}; } }
function demoSave(db){ try{ localStorage.setItem('studio-demo',JSON.stringify(db)); }catch(e){} }
function rid(n){ var c='abcdefghjkmnpqrstuvwxyz23456789',s=''; for(var i=0;i<n;i++)s+=c.charAt(Math.floor(Math.random()*c.length)); return s; }
function demo(p){
  var db=demoDB(), a=p.action;
  if(a==='student'){ var s=db.students.filter(function(x){return x.sid===p.sid;})[0]; if(!s)return {ok:false,error:'no such student'};
    return {ok:true,student:s,drills:db.drills.filter(function(d){return d.sid===p.sid;}),checks:db.checks.filter(function(c){return c.sid===p.sid;})}; }
  if(a==='drill'){ var d=db.drills.filter(function(x){return x.did===p.did;})[0]; return d?{ok:true,drill:d}:{ok:false,error:'no such drill'}; }
  if(a==='check'){ db.checks=db.checks.filter(function(c){ return !(c.sid===p.sid&&c.did===p.did&&c.week===p.week&&c.day===+p.day); });
    if(p.on)db.checks.push({sid:p.sid,did:p.did,week:p.week,day:+p.day}); demoSave(db); return {ok:true}; }
  if(a==='ping') return {ok:true};
  if(a==='students') return {ok:true,students:db.students};
  if(a==='assign'){ var nm=String(p.student||'').trim(); if(!nm)return {ok:false,error:'no student name'};
    var st=db.students.filter(function(x){return x.name.toLowerCase()===nm.toLowerCase();})[0]; if(!st){ st={sid:rid(10),name:nm}; db.students.push(st); }
    var ex=p.ex?+p.ex:db.drills.filter(function(d){return d.sid===st.sid;}).length+1, did=rid(8);
    db.drills.push({did:did,sid:st.sid,date:p.date,ex:ex,title:p.title,params:p.params,notes:p.notes}); demoSave(db); return {ok:true,sid:st.sid,did:did,ex:ex,name:st.name}; }
  if(a==='overview') return {ok:true,students:db.students,drills:db.drills,checks:db.checks};
  return {ok:false,error:'unknown action'};
}

/* ── weeks: Monday's date, local time ── */
function ymd(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function mondayOf(d){ d=new Date(d.getFullYear(),d.getMonth(),d.getDate()); var k=(d.getDay()+6)%7; d.setDate(d.getDate()-k); return d; }
function weekKey(d){ return ymd(mondayOf(d||new Date())); }
function addDays(key,n){ var p=key.split('-'); var d=new Date(+p[0],+p[1]-1,+p[2]); d.setDate(d.getDate()+n); return ymd(d); }

function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function base(){ return location.href.replace(/[^\/]*([?#].*)?$/,''); }

G.Studio={ OPEN:OPEN, ANCHORS:ANCHORS, anchorOf:anchorOf, FN:FN, POSITIONS:POSITIONS, MODES:MODES, RANGES:RANGES, STRUCTURES:STRUCTURES,
  DIRECTIONS:DIRECTIONS, FRAMES:FRAMES, rangesFor:rangesFor, fitRange:fitRange, SUBDIVISIONS:SUBDIVISIONS, ARTICULATIONS:ARTICULATIONS, defaults:defaults, boxes:boxes, ordered:ordered, sequence:sequence,
  title:title, summary:summary, autoNotes:autoNotes, glyphSVG:glyphSVG, api:api, weekKey:weekKey, addDays:addDays, ymd:ymd, esc:esc, base:base,
  isDemo:function(){ return !G.STUDIO_API; } };
})(window);
