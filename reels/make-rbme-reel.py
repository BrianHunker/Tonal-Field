# Rebuilds reels/right-before-my-eyes-reel.html from lessons/right-before-my-eyes.html (run from the repo root).
import json,re,copy,sys
src='lessons/right-before-my-eyes.html'; out='reels/right-before-my-eyes-reel.html'
L=json.loads(sys.argv[1]) if len(sys.argv)>1 else {}
s=open(src).read()
m=re.search(r'var BOOT_CFG=(\{.*?\});\n',s,re.S); B=json.loads(m.group(1))
allv=copy.deepcopy(B['views']['6'])
# one view: ALL
lay=L.get('layout',{"ring":{"x":0.2,"y":0.0,"w":0.6,"h":0.6},"fret":{"x":0.0,"y":0.62,"w":1.0,"h":0.42},"tab":{"x":0.0,"y":1.06,"w":1.0,"h":0.42}})
for k in ('guide','lessons','seq','keyboard','string','spectrogram','staff','fmap','notepad'): allv[k]=False
allv.update(plotRing=True,surface=True,tab=True)
for k,v in lay.items(): allv['layout'][k]=v
allv['tab_']={"lines":1,"mpl":1,"first":0,"capoRel":True}
su=allv['state']['surface']; su.update(labelScale=2.4,frets=7,cellW=None,cellH=None,panX=0,panY=0,capo=0,colSel=None,rowSel=None,lefty=False)
B['views']={'1':allv}; B['views'].update({str(k):None for k in range(2,8)}); B['bootView']=1
for k in ('seq','keyboard','string','spectrogram','staff','guide','lessons'): B['view'][k]=False
B['view'].update(plotRing=True,surface=True,tab=True,bare=True); B['view']['layout']=copy.deepcopy(allv['layout'])
B['surface'].update(labelScale=2.4,frets=7,cellW=None,panX=0,panY=0)
B['tab']={"lines":1,"mpl":1,"first":0,"capoRel":True}
B['sequence']=copy.deepcopy(allv['state']['seq']['snap'])
B['field']['phi']=allv['state']['ring']['phi']; B['field']['topPc']=allv['state']['ring']['topPc']
s=s[:m.start(1)]+json.dumps(B,ensure_ascii=False,separators=(',',':'))+s[m.end(1):]
s=re.sub(r'var VIEW_NAME=\{[^}]*\};','var VIEW_NAME={"1": "ALL"};',s,1)
s=re.sub(r'(<button class="toggle view-btn" data-view="[2-6]"[^\n]*\n)','',s)
s=s.replace('<title>Right Before My Eyes — Tonal Field</title>','<title>Right Before My Eyes — reel</title>')
CSS='''<style id="reelCSS">
/* reel: one black 9:16 stage — url, g(x), ring, fretboard, TAB */
html,body{background:#000 !important;overflow:hidden;}
body.reel{width:1080px;height:1920px;position:absolute;left:0;top:0;transform-origin:0 0;margin:0;}
body.reel .header{background:#000 !important;border:none !important;justify-content:center !important;padding:56px 0 6px !important;}
body.reel .header > *:not(.site-link){display:none !important;}
body.reel .header .site-link{font-size:34px !important;letter-spacing:0.06em;color:#d8d4c8 !important;text-decoration:none;position:static !important;margin:0 auto;}
body.reel .global-toolbar{display:flex !important;background:#000 !important;border:none !important;justify-content:center !important;padding:10px 0 26px !important;}
body.reel .global-toolbar > *:not(.gx){display:none !important;}
body.reel .gx{font-size:28px !important;margin:0 auto;white-space:nowrap;}
body.reel, body.reel #desk, body.reel .win, body.reel .win-body, body.reel .panel, body.reel #fretWrap, body.reel #tabScroll{background:#000 !important;border-color:transparent !important;box-shadow:none !important;}
body.reel .win{border:none !important;}
</style>
'''
s=s.replace('</head>',CSS+'</head>',1)
JS='''<script id="reelJS">
(function(){
  document.body.classList.add('reel');
  function fit(){ var k=Math.min(window.innerWidth/1080,window.innerHeight/1920); document.body.style.transform='scale('+k+')';
    document.body.style.left=Math.max(0,(window.innerWidth-1080*k)/2)+'px'; }
  fit(); window.addEventListener('resize',fit);
  /* the stage's own layout, in stage pixels: ring, then a fretboard of frets 0-6 filling the width, then one TAB line */
  var REEL_TAB_K=2.3, RING=600, GAP=14;
  var _tss=tabScaleSet; tabScaleSet=function(){ _tss(REEL_TAB_K); };
  function reelLayout(){
    try{
      FB_BAND=0; tabScaleSet(); var desk=document.getElementById('desk'), DW=desk?desk.clientWidth:1080, DH=1920-(desk?desk.getBoundingClientRect().top/ (parseFloat((document.body.style.transform.match(/scale\(([^)]+)\)/)||[0,1])[1])||1):200);
      winL.ring={x:Math.round((DW-RING)/2),y:0,w:RING,h:RING}; winPlace('ring');
      var y=RING+GAP; winL.fret={x:0,y:y,w:DW,h:500}; winPlace('fret');
      var fp=document.getElementById('fretPanel'), w=fp.clientWidth-22, cw=w/fbFrets, H=Math.round(fbStrings*cw/FB_PHI+fbFootH());
      winL.fret.h=Math.ceil(winChromeAround(fretCv,fp)+H+4); winPlace('fret');
      fbCellW=cw; fbCellH=null; fbPanX=0; fbPanY=0; fretViewH=H; sizeFret();
      y+=winL.fret.h+GAP;
      var tabH=Math.ceil(tabLineH()+winChromeAround(document.getElementById('tabScroll'),document.getElementById('tabPanel')));
      winL.tab={x:0,y:y,w:DW,h:tabH}; winPlace('tab');
      requestFret(); if(typeof tabRequest==='function')tabRequest(); if(typeof draw==='function')draw();
    }catch(e){ console.error(e); }
  }
  window.reelLayout=reelLayout;
  setTimeout(reelLayout,400); setTimeout(reelLayout,1200);
  window.addEventListener('resize',function(){ setTimeout(reelLayout,60); });
  /* space starts and stops the loop wherever the focus is */
  document.addEventListener('keydown',function(e){ if(e.key===' '||e.code==='Space'){ if(document.activeElement&&/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))return;
    e.preventDefault(); e.stopPropagation(); if(typeof ensureAC==='function')ensureAC(); var b=document.getElementById('seqPlayBtn'); if(b)b.click(); if(typeof tabRequest==='function')tabRequest(); } },true);
})();
</script>
'''
inner=JS.replace('<script id="reelJS">\n','').replace('</script>\n','')
k=s.rindex('})();\n</script>'); s=s[:k]+'/* ===== reel ===== */\n'+inner+s[k:]
import os; os.makedirs('reels',exist_ok=True); open(out,'w').write(s); print('wrote',out,len(s))
