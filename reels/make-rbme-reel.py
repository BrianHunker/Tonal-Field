# Rebuilds reels/right-before-my-eyes-reel.html from lessons/right-before-my-eyes.html (run from the repo root).
# The reel: one black 9:16 stage — url, g(x), the field (a line that winds into the ring), a fretboard of frets 0-6,
# one TAB measure at a time. 48 bars: the five 8-bar views in order, then a victory lap of the last one.
import json, re, copy

src = 'lessons/right-before-my-eyes.html'; out = 'reels/right-before-my-eyes-reel.html'
s = open(src).read()
m = re.search(r'var BOOT_CFG=(\{.*?\});\n', s, re.S); B = json.loads(m.group(1))

# ---- the sequence: views 1-5 in order, then view 5 again ------------------------------------------------------
SEC = [B['views'][k]['state']['seq']['snap'] for k in '12345'] + [B['views']['5']['state']['seq']['snap']]
BARS = 8 * len(SEC) + 2; DIV = 16 * BARS            # + the closing Do chord, held two bars
# chord of each 2-bar pair, with its solfege in D-flat (Do = D-flat) and its quality
CH = [dict(n='D♭', R='Do', T='Mi', F='Sol', minor=False), dict(n='F', R='Mi', T='Sol', F='Ti', minor=True),
      dict(n='B♭', R='La', T='Do', F='Mi', minor=True), dict(n='A♭', R='Sol', T='Ti', F='Re', minor=False)]
def label(sec, c):
    third = ('♭3rd' if c['minor'] else '3rd'); q = 'm' if c['minor'] else ''
    if sec == 0: return f"{c['n']} = Root = {c['R']}"
    if sec == 1: return f"{c['n']}5 = Root + 5th = {c['R']}{c['F']}"
    if sec == 2: return f"{c['n']}5 = Root + 5th + Octave = {c['R']}{c['F']}{c['R']}"
    return f"{c['n']}{q} = Root + {third} + 5th = {c['R']}{c['T']}{c['F']}"
notes, chords, modes, pm = [], [], [], []
for i, sn in enumerate(SEC):
    o = 128 * i
    for n in sn['notes']: q = dict(n); q['start'] += o; notes.append(q)
    for md in sn['modes']: q = dict(md); q['col'] += o; modes.append(q)
    for r in sn.get('pm', []): pm.append([r[0] + o, r[1] + o])
    for b in range(8):
        chords.append({'col': o + 16 * b, 'text': label(min(i, 3), CH[b // 2])})
    for col in range(0, 128, 2):                       # every other strike keeps its label off
        if col % 16: chords.append({'col': o + col, 'text': '', 'off': True})
# the close: one full Do chord (the R-5-R-3-5-R barre) struck on the downbeat after the last bar, held two bars
o = 128 * len(SEC); last = SEC[-1]
for n in [x for x in last['notes'] if x['start'] == 0]:
    q = dict(n); q['start'] = o; q['dur'] = 32; q['vel'] = 96; q.pop('sup', None); notes.append(q)
for md in [x for x in last['modes'] if x['col'] == 0]: q = dict(md); q['col'] = o; modes.append(q)
chords.append({'col': o, 'text': label(3, CH[0])})
chords.sort(key=lambda c: c['col'])

allv = copy.deepcopy(B['views']['6'])
for k in ('guide', 'lessons', 'seq', 'keyboard', 'string', 'spectrogram', 'staff', 'fmap', 'notepad'): allv[k] = False
allv.update(plotRing=True, surface=True, tab=True)
allv['layout'].update({"ring": {"x": 0.2, "y": 0.0, "w": 0.6, "h": 0.6}, "fret": {"x": 0.0, "y": 0.62, "w": 1.0, "h": 0.42},
                       "tab": {"x": 0.0, "y": 1.06, "w": 1.0, "h": 0.42}})
allv['tab_'] = {"lines": 1, "mpl": 1, "first": 0, "capoRel": True}
su = allv['state']['surface']; su.update(badgeIn=1, badgeOut=1, labelScale=2.4, frets=7, cellW=None, cellH=None, panX=0, panY=0, capo=0, colSel=None, rowSel=None, lefty=False)
allv['state']['ring']['wind'] = 0
snap = allv['state']['seq']['snap']
snap.update(bars=BARS, divs=DIV, notes=notes, chords=chords, modes=modes, pm=pm, od=[], ring=[], pedal=[], accomp=[], loop=False, loopA=0, loopB=DIV, strumMs=8)
allv['state']['seq']['pos'] = 0
B['views'] = {'1': allv}; B['views'].update({str(k): None for k in range(2, 8)}); B['bootView'] = 1
for k in ('seq', 'keyboard', 'string', 'spectrogram', 'staff', 'guide', 'lessons'): B['view'][k] = False
B['view'].update(plotRing=True, surface=True, tab=True, bare=True); B['view']['layout'] = copy.deepcopy(allv['layout'])
B['surface'].update(badgeIn=1, badgeOut=1, labelScale=2.4, frets=7, cellW=None, panX=0, panY=0)
B['tab'] = {"lines": 1, "mpl": 1, "first": 0, "capoRel": True}
B['sequence'] = copy.deepcopy(snap)
B['field'].update(phi=allv['state']['ring']['phi'], topPc=allv['state']['ring']['topPc'], diatonic=True, pentatonic=False, wind=0)
# mode lights: root 0.5, dominant 0.3, third 0.2
B['misc']['degLight'] = [0.5, 0.3, 0.2, 0, 0, 0, 0]
# the anti-pentatonic colours a good deal darker, so each stands apart from its pentatonic neighbour
def dark(h, k=0.55): return '#%02x%02x%02x' % tuple(int(int(h[i:i + 2], 16) * k) for i in (1, 3, 5))
B['labels']['colors'] = [dark(c) if nm.startswith('~') else c for nm, c in zip(B['labels']['names'], B['labels']['colors'])]

s = s[:m.start(1)] + json.dumps(B, ensure_ascii=False, separators=(',', ':')) + s[m.end(1):]
s = re.sub(r'var VIEW_NAME=\{[^}]*\};', 'var VIEW_NAME={"1": "ALL"};', s, 1)
s = re.sub(r'(<button class="toggle view-btn" data-view="[2-6]"[^\n]*\n)', '', s)
s = s.replace('<a class="site-link"', '<div id="reelQ"><span>Where do chords come from?</span></div>\n  <a class="site-link"', 1)
s = s.replace('<title>Right Before My Eyes — Tonal Field</title>', '<title>Right Before My Eyes — reel</title>')

CSS = '''<style id="reelCSS">
html,body{background:#000 !important;overflow:hidden;}
body.reel{width:1080px;height:1920px;position:absolute;left:0;top:0;transform-origin:0 0;margin:0;}
body.reel .header{background:#000 !important;border:none !important;justify-content:center !important;flex-direction:column !important;align-items:center !important;padding:34px 0 4px !important;}
body.reel .header > *:not(.site-link):not(#reelQ){display:none !important;}
#reelQ{display:block;width:1080px;text-align:center;white-space:nowrap;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:700;color:#f4f0e4;line-height:1.08;margin:0 0 8px;letter-spacing:0.005em;}
body.reel #tabScroll{overflow:hidden !important;}
body.reel .header .site-link{display:inline-block !important;transform:none !important;left:auto !important;font-size:40px !important;font-weight:700 !important;letter-spacing:0.05em;color:#ece8dc !important;text-decoration:none;position:static !important;margin:0 auto;}
body.reel .global-toolbar{display:flex !important;background:#000 !important;border:none !important;justify-content:center !important;padding:8px 0 24px !important;}
body.reel .global-toolbar > *:not(.gx){display:none !important;}
body.reel .gx{font-size:31.5px !important;margin:0 auto;white-space:nowrap;}
body.reel .gx #t-beat, body.reel .gx #t-res{opacity:1 !important;}
body.reel .gx .f-x{color:#cfcbc0 !important;}
body.reel #t-res .f-env{color:#e4e0d4 !important;} body.reel #t-res .f-car{color:#7ee0bf !important;}
body.reel, body.reel .win, body.reel .win-body, body.reel .panel, body.reel #fretWrap, body.reel #tabScroll{background:#000 !important;border-color:transparent !important;box-shadow:none !important;}
body.reel .win{border:none !important;}
#reelEnd{position:absolute;left:0;width:1080px;text-align:center;pointer-events:none;z-index:60;}
#reelEnd .tag{font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:700;font-size:42px;letter-spacing:0.04em;color:#ece8dc;margin-bottom:26px;}
#reelEnd img{display:block;margin:0 auto;}
</style>
'''
s = s.replace('</head>', CSS + '</head>', 1)

JS = r'''
(function(){
  document.body.classList.add('reel');
  /* readability at phone size; each can be tuned from the address: ?outline=0.08&letters=1.55&badges=2 */
  var _q=new URLSearchParams(location.search); function qn(k,d){ var v=parseFloat(_q.get(k)); return isFinite(v)?v:d; }
  tabFollowOnly=true; tabView=1; tabDpr=function(){ return dpr; };   /* one TAB line drawn, at the resolution it is seen */
  /* the field's band is 680 tall but the plot keeps the size it had at 600: the letter ring moves out, away from the badges */
  var BANDK=600/680; PLOT_SCALE=PLOT_SCALE*BANDK;
  ringDegreeWeights={root:qn('root',5.0), fifth:qn('fifth',3.0), third:qn('third',1.4)};   /* ?root=&fifth=&third= */
  tabDigitRing=true; tabDigitRingW=qn('outline',0.08); RING_LETTER_K=qn('letters',1.55)*BANDK; RING_BADGE_K=qn('badges',2.0)*BANDK;
  function fit(){ var k=Math.min(window.innerWidth/1080,window.innerHeight/1920); document.body.style.transform='scale('+k+')';
    document.body.style.left=Math.max(0,(window.innerWidth-1080*k)/2)+'px';
    /* the canvases draw at the size they are seen, not at the stage's full 1080 x 1920: a stage shrunk to a window
       at pixel ratio 2 would otherwise paint four times the pixels it shows, and the audio thread starves */
    dpr=Math.min(2,Math.max(0.5,(window.devicePixelRatio||1)*k)); }
  fit(); window.addEventListener('resize',fit);
  /* space starts and stops the loop wherever the focus is */
  document.addEventListener('keydown',function(e){ if(e.key===' '||e.code==='Space'){ if(document.activeElement&&/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))return;
    e.preventDefault(); e.stopPropagation(); if(typeof ensureAC==='function')ensureAC(); var b=document.getElementById('seqPlayBtn'); if(b)b.click(); if(typeof tabRequest==='function')tabRequest(); } },true);
  /* the field keeps all twelve colours: the diatonic blinders are for the fretboard alone */
  /* the field's band is the full width: the ring keeps its own square geometry (W), drawn shifted to the middle of a
     canvas as wide as the band (OFFX); while it is a line, every mapped point is scaled about the line's centre so the
     plot fills the band both ways, and that stretch eases off with the winding until the circle closes at its own size.
     Points move; lettering is placed by them, never stretched. */
  var OFFX=0, _st=null, _mapO=_map, _wpO=windPrep;
  _map=function(a,r){ if(a===_la&&r===_lr)return; _mapO(a,r);
    if(_st){ _lx=_st.mx+(_lx-_st.mx)*_st.sx+_st.dx; _ly=_st.my+(_ly-_st.my)*_st.sy+_st.dy; } };
  windPrep=function(){
    /* the engine's own windPrep, minus its canvas resizing: the band keeps one size, so the ring's cached layers live */
    _st=null;
    _u.k=(Math.abs(R0)<8)?1:Math.max(0,windK); _u.aB=Math.PI/2; _u.Rb=R0;
    var sFlat=(C-36)/(Math.PI*Math.max(20,Math.abs(R0))); _u.s=(sFlat<1)?1+(sFlat-1)*(1-_u.k):1; _u.ty=0; _la=null;
    var cw=Math.max(W,Math.round(cv.parentElement.clientWidth)), ch=W;
    var bw=Math.round(cw*dpr), bh=Math.round(ch*dpr); if(cv.width!==bw||cv.height!==bh){ cv.width=bw; cv.height=bh; cv.style.width=cw+'px'; cv.style.height=ch+'px'; }
    OFFX=(cw-W)/2;
    if(_u.k<0.999){
      var minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9, rads=[R0+A+W*(0.03+0.04*RING_BADGE_K),R0-A-W*(0.03+0.04*RING_BADGE_K),RL+W*(0.015+0.03*RING_LETTER_K),R0];   /* the curve, its badges past each peak and trough, and the letter row */
      for(var q=0;q<=96;q++){ var aq=_u.aB-Math.PI+1e-4+(TP-2e-4)*q/96;
        for(var z=0;z<rads.length;z++){ _la=null; _mapO(aq,rads[z]); if(_lx<minX)minX=_lx; if(_lx>maxX)maxX=_lx; if(_ly<minY)minY=_ly; if(_ly>maxY)maxY=_ly; } }
      var pad=18, f=1-_u.k, sxT=(W+2*OFFX-2*pad)/Math.max(1,maxX-minX), syT=(W-2*pad)/Math.max(1,maxY-minY);
      var mx=(minX+maxX)/2, my=(minY+maxY)/2;
      _st={mx:mx,my:my,sx:1+(sxT-1)*f,sy:1+(syT-1)*f,dx:(W/2-mx)*f,dy:(W/2+RING_UP-my)*f};
    }
    _la=null;
  };
  function shifted(fn){ return function(h){ var c=ctx, oS=c.setTransform, oR=c.resetTransform; c.save();
      var m=c.getTransform(); oS.call(c,m.a,m.b,m.c,m.d,m.e+OFFX*dpr,m.f);
      c.setTransform=function(a,b,cc,d,e,f){ if(typeof a==='object')return oS.call(c,a); return oS.call(c,a,b,cc,d,e+OFFX*dpr,f); };
      c.resetTransform=function(){ return oS.call(c,1,0,0,1,OFFX*dpr,0); };
      try{ return unblinded(function(){ return fn(h); }); } finally{ delete c.setTransform; delete c.resetTransform; c.restore(); } }; }
  var _rb=drawRingBase, _rt=drawRingTop, _rd=drawRingDynamic;
  drawRingBase=shifted(_rb); drawRingTop=shifted(_rt); drawRingDynamic=shifted(_rd);
  if(typeof seqRingBacklight==='function'){ var _bl=seqRingBacklight; seqRingBacklight=shifted(_bl); }
  /* the stage's own layout, in stage pixels */
  var REEL_TAB_K=2.1, RING=680, GAP=12;
  /* fretboard rows a little shorter than golden, applied where the board takes its dimensions so the numbers and dots stay on */
  var FB_ROWK=0.88, _fbD=fbDims; fbDims=function(vw){ var d=_fbD(vw); d.ch*=FB_ROWK; d.CH=d.ch*fbStrings; return d; };
  var _tss=tabScaleSet; tabScaleSet=function(){ _tss(REEL_TAB_K); };
  var LOGO=600, endBox=document.createElement('div'); endBox.id='reelEnd';
  endBox.innerHTML='<div class="tag">Stay tuned for more demos</div><img src="../icons/gg-512.png" width="'+LOGO+'" height="'+LOGO+'">';
  endBox.style.transform='translateY(-2400px)'; document.body.appendChild(endBox);
  var G=null, _scNow=0;
  function reelLayout(){
    try{
      FB_BAND=0; tabScaleSet(); fbNumPx=Math.round(TAB_FONT); FB_NUMH=Math.round(TAB_FONT*1.3);   /* fret numbers the size of the TAB's */ var desk=document.getElementById('desk'), DW=desk?desk.clientWidth:1080;
      winL.ring={x:0,y:0,w:DW,h:RING}; winPlace('ring'); ringMaxH=RING; sizeRing();
      var y=RING+GAP; winL.fret={x:0,y:y,w:DW,h:500}; winPlace('fret');
      var fp=document.getElementById('fretPanel'), w=fp.clientWidth-22, cw=w/fbFrets, chh=cw/FB_PHI*FB_ROWK, H=Math.round(fbStrings*chh+fbFootH());   /* rows a little shorter than golden */
      winL.fret.h=Math.ceil(winChromeAround(fretCv,fp)+H+4); winPlace('fret');
      fbCellW=cw; fbCellH=chh; fbPanX=0; fbPanY=0; fretViewH=H; sizeFret();
      y+=winL.fret.h+GAP;
      fitQ();
      var tabH=Math.ceil(TAB_TOP+TAB_ROW*(tabNStr()-1)+0.5*TAB_ROW+winChromeAround(document.getElementById('tabScroll'),document.getElementById('tabPanel')));   /* cut just below the low E: the playhead hangs a little past it */
      winL.tab={x:0,y:y,w:DW,h:tabH}; winPlace('tab');
      if(_scNow===0){   /* the resting geometry, measured before anything has moved */
        var k=parseFloat((document.body.style.transform.match(/scale\(([^)]+)\)/)||[0,1])[1])||1;
        var sl=document.getElementById('reelQ').getBoundingClientRect(), gq=document.querySelector('.gx').getBoundingClientRect(),
            rr=document.getElementById('win-ring').getBoundingClientRect(), fr=document.getElementById('win-fret').getBoundingClientRect();
        var linkTop=sl.top/k, gxBot=gq.bottom/k, ringTop=rr.top/k, ringH=rr.height/k, fretTop=fr.top/k, g=110;
        var dyH=960-(linkTop+gxBot)/2;                                   /* the question, url and equation to the centre */
        var dyR=(gxBot+dyH+g)-ringTop+28;                                  /* the ring just below them (measured: equal gaps, 132 px each) */
        var logoTop=(linkTop+dyH)-(g+(ringH-LOGO)/2)-LOGO+28;              /* the badge as far above as the ring is below */
        var tagH=endBox.querySelector('.tag').offsetHeight+26, boxTop=logoTop-tagH;
        endBox.style.top=Math.round(boxTop)+'px';
        G={dyH:dyH, dyR:dyR, dyB:1920-fretTop+60, inY:-(boxTop+tagH+LOGO+80)};
      }
      requestFret(); if(typeof tabRequest==='function')tabRequest(); if(typeof draw==='function')draw();
    }catch(e){ console.error(e); }
  }
  function fitQ(){ var q=document.getElementById('reelQ'); if(!q)return; var sp=q.querySelector('span'); q.style.fontSize='100px'; var w=sp.offsetWidth||1; q.style.fontSize=(100*1036/w).toFixed(2)+'px'; }
  window.reelLayout=reelLayout;
  setTimeout(reelLayout,400); setTimeout(reelLayout,1200);
  window.addEventListener('resize',function(){ setTimeout(reelLayout,60); });
  /* the choreography, read off the playhead (in sixteenths; a bar is 16):
     bars 1-16 the field lies flat as a line, E-flat/Re at both ends;
     bars 17-18 it winds into the ring, the two Re's meeting at the bottom; 19-20 it holds, inverted;
     bars 23-24 (the fourth chord, A-flat) it turns clockwise until E-flat/Re stands at the top; then it stays.
     bars 41-42, as the victory lap begins, everything scrolls down: fretboard and TAB off the bottom, the ring to the lower
     half, url and equation to the centre, and the studio's badge in from above, as far over the url as the ring is under the
     equation, with 'Stay tuned for more demos' over it.
     bars 25-26 (the Do chord of R-5-R-3) the waterline opens, rho 0.5 to 2.0, so the anti badges stand apart. Then the closing chord, held two bars. */
  function ease(u){ u=Math.max(0,Math.min(1,u)); return u*u*(3-2*u); }
  window.reelState=function(p){
    var bar=p/16;
    var wind=ease((bar-16)/2), turn=ease((bar-22)/2), sc=ease((bar-40)/2), rho=0.5+1.5*ease((bar-24)/2);
    return {wind:wind, off:Math.PI*turn, scroll:sc, rho:rho};   /* with the half-turn on: E-flat starts at the bottom of the ring, the seam */
  };
  var _last='';
  function choreo(){
    var st=reelState(typeof seqPos==='number'?seqPos:0), key=st.wind.toFixed(4)+'|'+st.off.toFixed(4)+'|'+st.scroll.toFixed(4)+'|'+st.rho.toFixed(4);
    if(key!==_last&&G){ _last=key; flipV=true; windK=st.wind; anchorOff=st.off; _scNow=st.scroll;
      var Rr=0.383, nf=Rr*(st.rho-1)/(st.rho+1); if(Math.abs(nf-rInF)>1e-6){ rInF=nf; geom(); }   /* the waterline: rho 0.5 -> 2.0 over the Do chord of R-5-R-3 */
      function ty(el,y){ if(el)el.style.transform=y?'translateY('+y.toFixed(1)+'px)':''; }
      var sc=st.scroll;
      ty(document.querySelector('.header'),G.dyH*sc); ty(document.querySelector('.global-toolbar'),G.dyH*sc);
      ty(document.getElementById('win-ring'),G.dyR*sc);
      ty(document.getElementById('win-fret'),G.dyB*sc); ty(document.getElementById('win-tab'),G.dyB*sc);
      endBox.style.transform='translateY('+(G.inY*(1-sc)).toFixed(1)+'px)';
      requestRing(); requestDraw(); }
    requestAnimationFrame(choreo);
  }
  requestAnimationFrame(choreo);
  window.reelSeek=function(p){ seqPos=p; if(typeof seqUpdateHead==='function')seqUpdateHead(); if(typeof tabRequest==='function')tabRequest(); requestFret(); requestLight(); };
})();
'''
k = s.rindex('})();\n</script>'); s = s[:k] + '/* ===== reel ===== */\n' + JS + s[k:]
import base64
ir = open('ir/studio-room.js').read()
s = s.replace('<script src="../ir/studio-room.js"></script>', '<script>' + ir + '</script>', 1)
logo = 'data:image/png;base64,' + base64.b64encode(open('icons/gg-512.png', 'rb').read()).decode()
s = s.replace("'../icons/gg-512.png'", "'" + logo + "'")
s = s.replace('src="../icons/gg-512.png"', 'src="' + logo + '"')
open(out, 'w').write(s); print('wrote', out, len(s), 'bars', BARS)
