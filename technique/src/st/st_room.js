/* THE ROOM: the strings sound in a room — the site's studio room (ir/studio-room.js, the impulse the lessons use: image
   sources and ray tracing, about a second to die away, the highs first). The strings' sound is sent through it and back
   under the dry sound; the click stays dry. Its level is the gear's Room slider (a moderate 30 at first, remembered).
   The impulse file is fetched beside the page; until it has come (or where it cannot), a soft synthetic room stands in. */
(()=>{
  if(typeof ensureCtx!=='function') return;
  let R=0.3; try{ const v=localStorage.getItem('tech-room'); if(v!==null&&isFinite(+v)) R=Math.max(0,Math.min(1,+v)); }catch(e){}
  let conv=null, wet=null, real=false;
  const level=r=>0.55*r;                                                  // the wet send at the slider's value
  function roomBuf(){ const D=window.TF_ROOM_IR; if(!D||!D.ch||!ctx) return null;
    const sr=ctx.sampleRate, ratio=D.sr/sr, n=Math.floor(D.n/ratio), buf=ctx.createBuffer(2,n,sr);
    for(let c=0;c<2;c++){ const bin=atob(D.ch[c]), m=bin.length>>1, src=new Float32Array(m);
      for(let i=0;i<m;i++){ let v=bin.charCodeAt(2*i)|(bin.charCodeAt(2*i+1)<<8); if(v>32767) v-=65536; src[i]=v/32767; }
      const d=buf.getChannelData(c);
      for(let k=0;k<n;k++){ const x=k*ratio, i0=Math.floor(x), f=x-i0; d[k]=i0+1<m?src[i0]*(1-f)+src[i0+1]*f:(i0<m?src[i0]:0); } }
    return buf; }
  function synthBuf(){ const sr=ctx.sampleRate, L=Math.floor(sr*2.2), b=ctx.createBuffer(2,L,sr);
    for(let ch=0;ch<2;ch++){ const d=b.getChannelData(ch), cf=1-Math.exp(-2*Math.PI*4800/sr); let lp=0;
      for(let k=0;k<L;k++){ const t=k/sr; lp+=cf*((Math.random()*2-1)-lp); d[k]=lp*Math.exp(-t/0.6)*(k<500?k/500:1); } }
    return b; }
  function attach(){
    if(!ctx||conv||!stringBus||!master) return;
    const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=140;
    conv=ctx.createConvolver(); const b=roomBuf(); conv.buffer=b||synthBuf(); real=!!b;
    wet=ctx.createGain(); wet.gain.value=level(R);
    stringBus.connect(hp); hp.connect(conv); conv.connect(wet); wet.connect(master); }
  function upgrade(){ if(conv&&!real){ const b=roomBuf(); if(b){ conv.buffer=b; real=true; } } }
  const orig=ensureCtx;
  ensureCtx=function(){ return orig.apply(this,arguments).then(r=>{ attach(); return r; }); };
  // the impulse, fetched beside the page (a published page sits one folder below the site; its source two)
  if(!window.TF_ROOM_IR){ const paths=['../ir/studio-room.js','../../ir/studio-room.js']; let k=0;
    const next=()=>{ if(k>=paths.length) return; const s=document.createElement('script'); s.src=paths[k++]; s.async=true;
      s.onload=()=>{ if(window.TF_ROOM_IR) upgrade(); else next(); }; s.onerror=()=>{ s.remove(); next(); }; document.head.appendChild(s); };
    next(); }
  // the gear: Room, under the strings' own level
  const after=document.getElementById('volString'), row0=after&&after.closest('.mixRow');
  if(row0){ const row=document.createElement('div'); row.className='mixRow';
    row.innerHTML='<span class="name">Room</span><input type="range" id="volRoom" min="0" max="100" aria-label="Room reverb"><b id="volRoomV"></b><span></span>';
    row0.after(row); const sl=row.querySelector('input'), out=row.querySelector('b');
    const show=()=>{ sl.value=Math.round(R*100); out.textContent=Math.round(R*100); }; show();
    sl.addEventListener('input',()=>{ R=+sl.value/100; out.textContent=sl.value; try{ localStorage.setItem('tech-room',String(R)); }catch(e){}
      if(wet&&ctx) wet.gain.setTargetAtTime(level(R),ctx.currentTime,0.04); }); }
})();
