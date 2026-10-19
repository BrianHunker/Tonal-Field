import re, sys, os
D=os.path.dirname(os.path.abspath(__file__))
src=open(os.path.join(D,'..','chain-drills.html')).read().split('\n')
def L(a,b): return '\n'.join(src[a-1:b])
def must(s,a,b,n=1):
    assert s.count(a)==n,(s.count(a),a[:70]); return s.replace(a,b)
def block(a,b):
    t=L(a,b)
    if (a,b)==(378,394):
        t=must(t,"const cellL=n=>n===0?FB.x0:FB.nut+(n-1)*FB.cw;","// real fret spacing: the 12th fret is the octave, half the string; each fret a semitone shorter than the last\nconst SCALE=2*FB.n*FB.cw, fretX=n=>FB.nut+SCALE*(1-Math.pow(2,-n/12));\nconst cellL=n=>n===0?FB.x0:fretX(n-1);")
        t=must(t,"const cellR=n=>n===0?FB.nut:FB.nut+n*FB.cw;","const cellR=n=>n===0?FB.nut:fretX(n);")
        t=must(t,"const tipXf=fr=>{ const n=Math.floor(fr); return tipX(n)+(fr-n)*FB.cw; };","const tipXf=fr=>{ const n=Math.floor(fr); return tipX(n)+(fr-n)*(tipX(n+1)-tipX(n)); };")
        t=must(t,"el('line',{x1:FB.nut+k*FB.cw,y1:FB.top,x2:FB.nut+k*FB.cw,y2:FB.bot,","el('line',{x1:fretX(k),y1:FB.top,x2:fretX(k),y2:FB.bot,")
    if (a,b)==(428,469):
        t=must(t,"function drawVib(snap,fx,fy,bx,by,t){","function drawVib(snap,fx,fy,bx,by,t,E){ const BL=E?E.blur:blurEl, SB=E?E.strobe:strobeEl;   // E: another string's own band and strobe")
        t=must(t,"blurEl.setAttribute('d',band+' Z'); blurEl.setAttribute('visibility','visible');","BL.setAttribute('d',band+' Z'); BL.setAttribute('visibility','visible');")
        t=must(t,"strobeEl.setAttribute('d',line); strobeEl.setAttribute('visibility','visible'); } else strobeEl.setAttribute('visibility','hidden');","SB.setAttribute('d',line); SB.setAttribute('visibility','visible'); } else SB.setAttribute('visibility','hidden');")
    if (a,b)==(824,988):
        t=must(t,"const vg=ctx.createGain(); vg.gain.value=0.19*(0.35+0.65*PLUCK_V); vg.connect(voiceIn);",
          "const vg=ctx.createGain(); vg.gain.value=0.19*(0.35+0.65*PLUCK_V);\n  // the strings a little apart, as a stereo pair of mics hears them: the low E left of centre, the high e right (a bass in the middle)\n  if(ctx.createStereoPanner&&!BASS){ const pn=ctx.createStereoPanner(); pn.pan.value=0.3*(1-2*gauge); vg.connect(pn); pn.connect(voiceIn); } else vg.connect(voiceIn);")
    if (a,b)==(511,593):
        t=must(t,"function around(s,t){","""function around(s,t){
  if(s.grid) return aroundGrid(s,t);                                    // a segment with its own strokes (Custom: each beat cut as it is played)""")
        t=must(t,"const PICK_LIFT=16,","""// s.grid: the loop's strokes, [{b (beats into the loop), up, struck}], in order — around t, the one before and the one after
function aroundGrid(s,t){
  const G=s.grid, n=G.length, b=(t-s.loopStart)/T.beat, cyc=Math.floor(b/LOOP), ph=b-cyc*LOOP;
  let i=-1; for(let k=0;k<n;k++){ if(G[k].b<=ph+1e-9) i=k; else break; }
  const at=(k,c)=>{ const g=G[((k%n)+n)%n], cc=c+Math.floor(k/n); return (cc<0||cc>=s.loops)?null:{t:s.loopStart+(cc*LOOP+g.b)*T.beat, up:g.up, struck:g.struck}; };
  return i<0?[at(n-1,cyc-1),at(0,cyc)]:[at(i,cyc),at(i+1,cyc)];
}
const PICK_LIFT=16,""")
    if (a,b)==(599,622):
        t=must(t,"""   Fa Do Sol Re La Mi Ti reads clockwise). Changing it, the even places keep their seats and the odd ones swing half way round.
   On the chain, g(x) is a single wave, g = cos θ (the 7/12 and 5/12 winds land on the same points there), and the morph
   between hearings is a plain rotation of it, one seat per tick. */""","""   Fa Do Sol Re La Mi Ti reads clockwise). On the twelve seats the two winds land on the same points (a 7-cycle wave sampled
   twelve times is a −5-cycle wave), so there g is ONE wave: g(k) = cos(5kπ/6), five cycles an octave. A step of one
   semitone moves its phase 150°; a step of ±5 semitones moves it 30°, one seat of the slow wave. Ordering the tones by −5
   (seat k takes the tone −5k: A, E, B … clockwise) unwinds the five-cycle wave into one: on the chain g = cos θ, one lobe.
   The change is a MORPH, not a journey: where the two orders put the same tone (−5k = k: every other seat) the seat holds
   still, value and all; on each of the other six the two orders differ by a tritone (−5k − k = −6k = 6), so the value sinks
   through the hinge to nothing and the tone hands its seat to its tritone partner, whose value — the same size, opposite
   sign (g(x+π) = −g(x)) — grows back in its place. ±5 is its own inverse (5·5 = 25 = 1), so going back is the same fold.
   The departing names fade as their value reaches zero and the arriving ones fade in as it returns. */""")
        t=must(t,"const lerpPos=(a,b,m)=>{ const d=((b-a+6)%12+12)%12-6; return a+d*m; };","""const lerpPos=(a,b,m)=>{ const d=((b-a+6)%12+12)%12-6; return a+d*m; };
// a seat mid-morph: a place the two orders share (to within a seat's drift) is held; one they don't swaps at halfway, faded
const ordSwap=(a,c)=>Math.abs(((c-a+6)%12+12)%12-6)>3;
const ordSeat=(a,c)=>{ const m=RING.m; if(m<=0) return a; if(m>=1) return c; return ordSwap(a,c)?(m<0.5?a:c):lerpPos(a,c,m); };
const ordFade=(a,c)=>(RING.m>0&&RING.m<1&&ordSwap(a,c))?Math.abs(1-2*RING.m):1;
const ordMid=()=>RING.m>1e-4&&RING.m<1-1e-4;""")
        t=must(t,"rDots[pc].setAttribute('cx',x.toFixed(2)); rDots[pc].setAttribute('cy',y.toFixed(2)); rLbls[pc].setAttribute('transform','translate('+lx.toFixed(2)+' '+ly.toFixed(2)+')'); } }",
          "rDots[pc].setAttribute('cx',x.toFixed(2)); rDots[pc].setAttribute('cy',y.toFixed(2)); rLbls[pc].setAttribute('transform','translate('+lx.toFixed(2)+' '+ly.toFixed(2)+')');\n    const o=ordFade(pc+LET.offA,7*pc+LET.offC).toFixed(3); rDots[pc].setAttribute('opacity',o); rLbls[pc].setAttribute('opacity',o); } }")
        t=must(t,"const ringPos=pc=>RING.m<=0?pc:lerpPos(pc,fifth(pc),RING.m);",
          "const ringPos=pc=>{ const a=pc+LET.offA, c=7*Math.round(pc)+LET.offC; return ordSeat(a,c); };   // a pitch's seat on screen: the letters turned by LET; mid-change, held or swapped (ordSeat)")
    if (a,b)==(630,641):
        t=re.sub(r"const FIELD=\{on:true[^\n]*","const FIELD={on:false,lit:0,re:5,reC:11,target:5,u:0,m:null,mx:-1,reA:5,reCA:11};   // re: Re's seat on screen (chromatic); reC: on the chain; mx: a morph's progress (−1 none) from the orientation at reA / reCA",t)
        t=re.sub(r"const tickOf=[^\n]*\n","",t); t=re.sub(r"const trio=[^\n]*\n","",t)
        t=must(t,"const relRGB=k=>{ k=((k%12)+12)%12; const i=Math.floor(k), f=k-i, a=SOLF_RGB[i], b=SOLF_RGB[(i+1)%12];",
          "const SOLF_DIA=SOLF.map(([n],i)=>n.startsWith('~')?[112,112,112]:SOLF_RGB[i]);   // Diatonic mode: the antis grey\nconst relRGB=k=>{ k=((k%12)+12)%12; const i=Math.floor(k), f=k-i, TB_=diatonic?SOLF_DIA:SOLF_RGB, a=TB_[i], b=TB_[(i+1)%12];")
        t=must(t,"const valRGB=pc=>morphRGB(pc-FIELD.re,FIELD.u);","const valRGB=pc=>{ const a=relRGB(pc+LET.offA-FIELD.re); return FIELD.mx<0?a:mixRGB(relRGB(pc+LET.offA-FIELD.reA),a,FIELD.mx); };   // mid-morph: the two orientations' colours, blended")
    if (a,b)==(644,671):
        i0=t.index('function shapeField(u){'); i1=t.index('\n}',i0)+2
        t=t[:i0]+open(os.path.join(D,'st_shape.js')).read()+t[i1:]
    if (a,b)==(672,688):
        t=must(t,"  if(chain!==wedgeChain) buildWedge();\n","  buildWedge();\n")
        t=must(t,"shapeField(FIELD.u);","shapeField();")
        t=must(t,"valG.setAttribute('opacity',(FIELD.lit*swing).toFixed(3));","valG.setAttribute('opacity',(FLAT_OFF?1:FIELD.lit).toFixed(3));")
        t=must(t,"valG.setAttribute('transform','rotate('+((chain?FIELD.reC:FIELD.re)*30).toFixed(2)+' '+RG.c+' '+RG.c+')');","valG.setAttribute('transform','rotate('+(ordMid()?0:(chain?FIELD.reC:FIELD.re)*30).toFixed(2)+' '+RG.c+' '+RG.c+')'); /* mid-morph: drawn in the screen's own seats */")
        i0=t.index('  const u=FIELD.u, fr='); i1=t.index("toFixed(3)); });",i0)+len("toFixed(3)); });")
        t=t[:i0]+open(os.path.join(D,'st_lbl.js')).read().rstrip('\n')+t[i1:]
    if (a,b)==(755,793):
        t=must(t,"plan=planFor(cfgOf(drill))","plan=curPlan()")
        t=must(t,"noteLv[i]=i===cur?","noteLv[i]=(TAB_LIT?cur>=0&&TAB_LIT.has(i):i===cur)?")
    return t
def fill(s):
    return re.sub(r"/\*@COPY:(\d+)-(\d+)\*/",lambda m:block(int(m.group(1)),int(m.group(2))),s)
js='\n'.join(fill(open(os.path.join(D,f)).read()) for f in ['st_a.js','st_b.js','st_c.js','st_d.js','st_e.js','st_f.js','st_zoom.js','st_room.js','st_g.js'])
page=fill(open(os.path.join(D,'st_page.html')).read().replace('/*@COPY:7-167*/','/*@COPY:12-167*/'))
page=page.replace('/*@JS*/',js)
open(os.path.join(D,'..','structures.html'),'w').write(page)
print(len(page.split('\n')),'lines')
dbg=page.replace('placeRing();\n})();',"placeRing(); window.__st=()=>{ const d=DRILL; return (d?('D '+d.lo.s+':'+d.lo.f+'g'+d.lo.g+' '+d.hi.s+':'+d.hi.f+'g'+d.hi.g+(d.hi.push?'^':'')+' '+d.means+(d.ham?' H':'')+(d.pull?' P':'')+' dir='+(d.dir||drill.dir)+(CUSTOM?' custom':' '+(SI+1)+'/'+SAMPLES.length)):'no drill')+' | P '+P.map(p=>p.g+'@'+p.s+':'+p.f).join(',')+' | hand '+[1,2,3,4].map(k=>HAND.f[k].string+':'+HAND.f[k].fret).join(' ')+' | hear '+(DRILL?hearingOf(DRILL):hearing); };\n})();")
assert dbg!=page
open(os.path.join(D,'..','structures-dbg.html'),'w').write(dbg)

# ---------- drill books: the same tool turned to a set of pages ----------
def walk_page(eyebrow,title,label,book,fmax=None,gx=None):
    p=open(os.path.join(D,'st_page.html')).read().replace('/*@COPY:7-167*/','/*@COPY:12-167*/')
    def rep(a,b):
        nonlocal p
        assert p.count(a)==1,(a[:60],p.count(a)); p=p.replace(a,b)
    rep('<title>Harmonic Structures</title>','<title>'+title+'</title>')
    rep('<p class="eyebrow">Harmonic structure</p>','<p class="eyebrow">'+eyebrow+'</p>')
    i0=p.index('  <div class="means" id="means">'); i1=p.index('  </div>\n',p.index('</div>',p.index('id="segMeans"')))+9
    p=p[:i0]+'  <div class="means frameRow" id="means">\n    <span class="mLbl">'+label+'</span>\n    <span class="frameLbl" id="frameLbl" aria-live="polite"></span>\n    <div id="segMeans" hidden></div>\n  </div>\n'+p[i0+len(p[i0:i1]):]
    rep('<span id="structName">Semitone</span><span class="caret" aria-hidden="true"></span>','<span id="structName">'+title+'</span>')
    rep('id="structBtn" class="structBtn"','id="structBtn" class="structBtn static" tabindex="-1"')
    rep('<button id="clear" class="pill"','<span class="pageCt" id="pageCt" aria-live="polite" title="Page">1/1</span>\n    <button id="clear" class="pill" hidden')
    rep('.valLbl{ pointer-events:auto }','.valLbl{ pointer-events:auto }\n.structBtn.static{ cursor:default; pointer-events:none } .structMenu{ display:none !important } #listen{ display:none !important }\n.frameLbl{ font-family:var(--serif); font-style:italic; font-weight:500; font-size:22px; color:var(--ink); letter-spacing:.01em } .frameLbl .us{ color:var(--mid); padding:0 .06em } .frameRow{ min-height:34px }\n.roll{ --rh:30px; height:calc(3 * var(--rh)); overflow:hidden; -webkit-mask-image:linear-gradient(transparent,#000 28%,#000 72%,transparent); mask-image:linear-gradient(transparent,#000 28%,#000 72%,transparent) } .rollIn{ transition:transform .5s cubic-bezier(.3,.75,.25,1) } .rollRow{ height:var(--rh); line-height:var(--rh); font-family:var(--serif); font-style:italic; font-weight:500; font-size:22px; white-space:nowrap; opacity:.55; display:grid; grid-template-columns:repeat(5,1.75em); justify-items:center; transition:opacity .5s } .rollRow.cur{ opacity:1; transform:none } .rollRow .us{ color:var(--mid); padding:0 .06em }\n@media (prefers-reduced-motion: reduce){ .rollIn, .rollRow{ transition:none } } .strRow{ display:flex; justify-content:flex-start; margin-top:6px } .semiHost{ margin-bottom:-26px; min-width:0; padding-top:16px } .tabCol{ min-width:0 } @media (max-width:640px){ .semiHost{ margin-bottom:6px } } @media (min-width:641px){ .stage{ grid-template-columns:minmax(0,3fr) minmax(200px,1fr) } } .semiHost > .mLbl, .semiHost > .frameLbl{ display:none } .semiLine{ position:relative; height:86px; margin-left:0 } .semiTrack{ position:absolute; inset:0; will-change:transform } .semiName{ position:absolute; top:19px; transform:translateX(-50%); font-family:var(--serif); font-style:italic; font-weight:500; font-size:26px; line-height:1; white-space:nowrap } .semiPill{ position:absolute; top:2px; height:63px; border:1.5px solid var(--mid); border-radius:999px; pointer-events:none } .semiCap{ position:absolute; top:-19px; left:0; right:0; text-align:center; font-size:12px; letter-spacing:.08em; text-transform:uppercase; font-weight:600; color:var(--mid) } .semiTri{ position:absolute; top:63.5px; height:0; border-top:1.5px solid var(--mid) } .semiTriLbl, .semiHs, .semiIv{ position:absolute; transform:translateX(-50%); color:var(--mid); white-space:nowrap; pointer-events:none } .semiTriLbl{ top:70px; font-size:12px } .semiIv{ top:44px; font-size:11px } .semiHs{ top:5px; font-size:11px } .stage{ align-items:stretch } .tabCol{ display:flex; flex-direction:column; gap:6px } .frameRow{ margin-top:4px } .strSel button{ min-width:2.3em; font-weight:600 } .hlHand{ opacity:.62 } .hlSkin{ fill:var(--bg); stroke:none } .hlLine{ fill:none; stroke:var(--ink); stroke-width:1.7; stroke-linejoin:round; stroke-linecap:round } .hlNail{ stroke-width:1.2; opacity:.55 } .hlCrease{ stroke-width:1.1; opacity:.35 } .hlHalo{ stroke:var(--bg); stroke-width:4.2; opacity:0 } .hlSel{ stroke:var(--ink); stroke-width:3.2 } .gripPanel{ margin-top:14px; border-top:1px solid var(--faint); padding-top:10px } .gripHd{ margin:0 0 8px; font-size:12px; letter-spacing:.08em; text-transform:uppercase; font-weight:600; color:var(--mid) } .gripRow{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:8px } .gripGrp{ width:52px; font-size:13px; color:var(--mid) } .gripBtn{ font:inherit; font-size:14px; font-weight:600; padding:5px 11px; border:1.5px solid var(--mid); border-radius:999px; background:var(--bg); color:var(--ink); cursor:pointer; min-width:44px } .gripBtn sub{ font-size:10px; font-weight:500; color:var(--mid); margin-left:1px } .gripBtn.on{ background:var(--ink); color:var(--bg); border-color:var(--ink) } .gripBtn.on sub{ color:var(--bg) } body.handOn .fingerC, body.handOn .fingerN, body.handOn .guide, body.handOn .thumbG{ display:none } .strSel.vert{ position:absolute; flex-direction:column-reverse; z-index:3; min-width:0 } .strSel.vert button{ min-width:0; padding:0; border-left:0; border-top:1px solid var(--mid); display:flex; align-items:center; justify-content:center; line-height:1 } .strSel.vert button:last-child{ border-top:0 }\n.pageCt{ font-weight:600; font-size:14px; color:var(--ink); min-width:2.6em; text-align:center; font-variant-numeric:tabular-nums }')
    p=fill(p)
    parts=[fill(open(os.path.join(D,f)).read()) for f in ['st_a.js','st_b.js','st_c.js','st_d.js','st_e.js','st_f.js','st_zoom.js','st_room.js','st_g.js']]
    g=parts[-1]; init="SAMPLES=sampling(); COMP=completions(); applySample(0);"
    assert g.count(init)==1
    g=g.replace(init,'const BOOK='+book.strip()+';\n'+open(os.path.join(D,'st_hand.js')).read()+'\n'+open(os.path.join(D,'st_walk.js')).read()+'\n'+open(os.path.join(D,'st_chordgen.js')).read()+'\n'+open(os.path.join(D,'st_custom.js')).read()+'\n'+open(os.path.join(D,'st_chords.js')).read()+"\napplySample(0);")
    a="try{ FIELD.on=localStorage.getItem('structures-gx')==='on'; }catch(err){}"; assert g.count(a)==1
    if gx:                                     # a page with its own g(x) memory, opening OFF for a first visit
        g=g.replace(a,"FIELD.on=false; try{ FIELD.on=localStorage.getItem('"+gx+"')==='on'; }catch(err){}   // g(x) off until the visitor turns it on")
        g=g.replace("localStorage.setItem('structures-gx',","localStorage.setItem('"+gx+"',")
    else:
        g=g.replace(a,"FIELD.on=true; try{ FIELD.on=localStorage.getItem('walk-gx')!=='off'; }catch(err){}   // g(x) on for the drill book")
        g=g.replace("localStorage.setItem('structures-gx',","localStorage.setItem('walk-gx',")
    parts[-1]=g
    js='\n'.join(parts)
    if fmax:                                   # a page whose board shows frets past the 12th (they are drawn where the true neck has them)
        assert js.count('const FMAX=12;')==1; js=js.replace('const FMAX=12;','const FMAX='+str(fmax)+';')
        n=js.count('for(let k=1;k<=FB.n;k++)'); assert n>=2,n; js=js.replace('for(let k=1;k<=FB.n;k++)','for(let k=1;k<=FMAX;k++)')
    return p.replace('/*@JS*/',js)
DBG="\napplySample(0); window.__T=()=>({si:T.si,n:T.segs.length,on:T.on,ahead:T.segs.length?T.segs[T.segs.length-1].end-ctx.currentTime:0}); window.__w=()=>({page:PAGE,doPc:PHI.doPc,off:LET.off,goal:RING.goal,bars:DRILL&&DRILL.bars,frames:DRILL&&DRILL.frames.map(F=>F.string+':'+F.tones.map(t=>t.fret).join(',')),plan:DRILL&&DRILL.plan.map(n=>n.string+':'+n.fret+'g'+n.finger).join(' '),P:P.map(p=>p.g+'@'+p.s+':'+p.f).join(','),hand:[1,2,3,4].map(k=>HAND.f[k].string+':'+HAND.f[k].fret).join(' '),gx:FIELD.on,label:(document.getElementById('frameLbl')||{}).textContent}); window.__fing=()=>fingers.map(F=>[Math.round(F.x),Math.round(F.y),F.isDown?1:0]); window.__fbY=FB.strY; window.__tip=n=>Math.round(tipX(n)); window.__cu=(typeof CHORDS!=='undefined'&&CHORDS&&CHORDS._)||null; window.__st2=()=>({on:T.on,ph:T.on&&ctx?stateAt(ctx.currentTime).ph:null,idx:T.on&&ctx?stateAt(ctx.currentTime).idx:null,doPc:PHI.doPc,inst:[...INST],lit:TAB_LIT?[...TAB_LIT]:null,P:P.map(q=>q.g+'@'+q.s+':'+q.f+(q.barre?'b':'')),hand:[1,2,3,4].map(k=>HAND.f[k].string+':'+HAND.f[k].fret),strokes:STROKES,loop:LOOP,pulse:PULSE&&PULSE.u});"
def book(name,eyebrow,title,label,pages,fmax=None,gx=None):
    wp=walk_page(eyebrow,title,label,pages,fmax,gx)
    open(os.path.join(D,'..',name+'.html'),'w').write(wp)
    open(os.path.join(D,'..',name+'-dbg.html'),'w').write(wp.replace("\napplySample(0);",DBG,1))
    print(name,len(wp.split('\n')),'lines')
# Frame Walk: walks of frames up the strings and back, or down and back
book('frame-walk','Drill Exercise 10/11/26','Frame Walk','Frame',"""{hand:true, labelAt:'fret5', roll:true, loops:1, pages:[                      // each page once, then the next (Hold repeats it)                                                            // up the strings and its mirror, in pairs
  {string:NSTR-1, fret:4,  deg:'ti',  dir:'up',   links:5},            // 1. G#_Ti on the low E: the TiDo_Re frame up and back (Re = B)
  {string:0,      fret:9,  deg:'mi',  dir:'down', links:5},            // 2. C#_Mi on the high e: page 1 inverted, down and back (Re = B)
  {string:NSTR-1, fret:5,  deg:'la',  dir:'up',   links:5},            // 3. A_La on the low E: the La_TiDo frame up and back (Re = D)
  {string:0,      fret:10, deg:'re',  dir:'down', links:5},            // 4. D_Re on the high e: page 3 inverted, down and back (Re = D)
  {string:NSTR-1, fret:5,  deg:'sol', dir:'up',   links:5},            // 5. A_Sol on the low E: the Sol_La_Ti frame up and back (Re = E)
  {string:0,      fret:10, deg:'do',  dir:'down', links:5}             // 6. D_Do on the high e, in the La_TiDo frame: page 5 inverted, down and back (Re = E)
]}""")
# Semimodes: four-tone modal walks on one string, out to the semitone and back, the mode lit at each end
book('hand-lab','Lab','Hand','Frame',"""{handLab:true, roll:true, loops:1, pages:[
  {string:NSTR-1, fret:4,  deg:'ti',  dir:'up',   links:5},
  {string:0,      fret:9,  deg:'mi',  dir:'down', links:5},
  {string:NSTR-1, fret:5,  deg:'la',  dir:'up',   links:5},
  {string:0,      fret:10, deg:'re',  dir:'down', links:5}]}""")
# Chords: a chord's shapes found on the strings, the hand gripping each
book('chords','Tool','Chords','Chord',"""{handLab:true, chords:true, loops:1, pages:[
  {string:NSTR-1, fret:4,  deg:'ti',  dir:'up',   links:5}]}""")
# Wish You Were Here: four open grips, one a bar, strummed in sixteenths (D_du D_du _ud_ Dudu)
book('wish-you-were-here','Drill Exercise 10/14/26','Wish You Were Here','Chord',"""{handLab:true, chords:true, loops:1, song:{bpm:60, pattern:'D_duD_dU_ud_Dudu', ring:{pc:10, deg:'do', top:'re'},
  bars:[['C','x32010'],['D','xx0232'],['Am','x02210'],['G','320033'],['D','xx0232'],['C','x32010'],['Am','x02210'],['G','320033']]}, pages:[
  {string:NSTR-1, fret:4,  deg:'ti',  dir:'up',   links:5}]}""")
book('semimodes','Drill Exercise 10/11/26','Semimodes','Semimode',"""{hand:true, loops:2, countEach:true, strings:true, pages:['do','sol','re','la','mi','ti','fa'].map(m=>(   // each function in turn at the open low E and at fret 12
  {kind:'seq', string:NSTR-1, mode:m, anchor:{s:NSTR-1,f:0,deg:m}, top:m, order:'alt', paint:[NSTR-1]}))}""")
# Custom: a drill written by hand, in TAB and as a line of text; chord symbols orient the ring
book('custom','Tool','Custom','Chord',"""{handLab:true, custom:true, loops:1, pages:[
  {string:NSTR-1, fret:4,  deg:'ti',  dir:'up',   links:5}]}""")
# The E Shape: a mode's E-shape barre on its root along the low E, strummed, set against its semimode walk in position; the
# seven modes, and the ring moving the whole set along the neck (to fret 14)
book('the-e-shape','Drill Exercise 10/18/26','The E Shape','Chord',"""{handLab:true, custom:true, preset:'csm', roll:true, loops:1,
  drum:[[['Ti','Do','Re'],[1,2,4]],[['Mi','Fa','Sol'],[1,2,4]],[['La','Ti','Do'],[1,3,4]],[['Re','Mi','Fa'],[1,3,4]],[['Sol','La'],[2,4]]], pages:[
  {string:NSTR-1, fret:4,  deg:'ti',  dir:'up',   links:5}]}""",fmax=14,gx='eshape-gx')
