"""Deterministic reel render: python3 reels/render/render.py <reel page> <seconds>
The page runs on a virtual clock (vclock.js) with an OfflineAudioContext (offline.js): every frame is exactly 1/30 s,
and the audio renders sample-accurately on the same clock. Writes out/v_only.mp4, out/a.raw (s16le 48k stereo) and
out/render.json (downbeat_s, audio_at_frame0) for the final mux: trim the audio by audio_at_frame0, end at
downbeat_s + phrase length."""
import asyncio, os, sys, json, subprocess, base64
from playwright.async_api import async_playwright
S=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.join(S,'out'); os.makedirs(OUT,exist_ok=True)
PAGE=sys.argv[1]; SECS=float(sys.argv[2]); FPS=30
VC=open(S+'/vclock.js').read(); OFF=open(S+'/offline.js').read()
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    ctx=await b.new_context(viewport={'width':1080,'height':1920},device_scale_factor=1)
    await ctx.add_init_script(f"window.__OFF_SECS={SECS+4};"); await ctx.add_init_script(VC); await ctx.add_init_script(OFF)
    pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    await pg.goto('file://'+os.path.abspath(PAGE))
    for i in range(240):
      await pg.evaluate("()=>__advance(1000/60)")
      if i%20==0: await pg.wait_for_timeout(100)
    await pg.evaluate("()=>{ tf.audio().ensureAC(); }")
    for i in range(20): await pg.evaluate("()=>Promise.race([__step(1000/30).then(()=>'ok'),new Promise(r=>__rST(()=>r('TIMEOUT'),5000))])"); await pg.wait_for_timeout(30)   # the string worklet loads
    v0=await pg.evaluate("()=>__vt()"); print('pre-roll ok',flush=True)
    await pg.evaluate("()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true}))")
    a0=await pg.evaluate("()=>__oac.currentTime")
    ff=subprocess.Popen(['ffmpeg','-y','-v','error','-f','image2pipe','-framerate',str(FPS),'-i','-','-c:v','libx264','-preset','slow','-crf','14','-pix_fmt','yuv420p','-r',str(FPS),OUT+'/v_only.mp4'],stdin=subprocess.PIPE)
    log=[]; n=int(round(SECS*FPS))
    for i in range(n):
      ff.stdin.write(await pg.screenshot(type='jpeg',quality=95))
      log.append(await pg.evaluate("()=>[__vt(),tf.seq().playing,tf.head().pos(),__oac.currentTime]"))
      r=await pg.evaluate("()=>Promise.race([__step(1000/30).then(()=>'ok'),new Promise(r=>__rST(()=>r('TIMEOUT'),5000))])")
      if r!='ok': print('step timeout at frame',i,await pg.evaluate("()=>[__oac.state,__oac.currentTime,__oac.__t]"),flush=True)
      if i%300==0: print('frame',i,'/',n,'pos',round(log[-1][2],2),'audio t',round(log[-1][3],3),flush=True)
    ff.stdin.close(); ff.wait()
    print('finishing',flush=True); info=await pg.evaluate("()=>__finish()"); print('rendered',info,flush=True); n2=info['n']*4
    with open(OUT+'/a.raw','wb') as fh:
      for i in range(0,n2,1<<21): fh.write(base64.b64decode(await pg.evaluate(f"()=>__pcmChunk({i},{1<<21})")))
    k=next(i for i,s in enumerate(log) if s[1] and s[2]>0.2)
    dv=(log[k][0]-log[k][2]*125.0-log[0][0])/1000          # downbeat in video time
    a_at_frame0=log[0][3]                                    # audio time at video frame 0
    json.dump({'downbeat_s':dv,'audio_at_frame0':a_at_frame0,'peak':info['peak'],'gain':info['gain']},open(OUT+'/render.json','w'))
    print('downbeat',round(dv,4),'s; audio time at frame 0',round(a_at_frame0,4),'; peak',round(info['peak'],3),'errs',errs[:4])
    await b.close()
asyncio.run(main())
