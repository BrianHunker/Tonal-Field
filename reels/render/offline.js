(function(){
  /* the engine's AudioContext is an OfflineAudioContext that renders only as far as the virtual clock has gone */
  var LEN=+(window.__OFF_SECS||95);
  var nat=Object.getOwnPropertyDescriptor(BaseAudioContext.prototype,'currentTime');
  Object.defineProperty(BaseAudioContext.prototype,'currentTime',{configurable:true,get:function(){ return nat.get.call(this); }});
  function OAC(){ var c=new OfflineAudioContext({numberOfChannels:2,length:Math.round(48000*LEN),sampleRate:48000});
    c.__t=0; c.__started=false; window.__oac=c;
    Object.defineProperty(c,'state',{configurable:true,get:function(){ return 'running'; }});   /* the clock decides; to the engine it is always running */
    c.resume=function(){ return Promise.resolve(); };          /* the clock, not the engine, decides when it renders */
    c.close=function(){ return Promise.resolve(); };
    c.createMediaStreamDestination=function(){ var g=c.createGain(); g.stream=null; return g; };
    return c; }
  window.AudioContext=OAC; window.webkitAudioContext=OAC;
  function audioTo(c){ var q=128/48000, t=Math.ceil(c.__t/q)*q;
    if(t<=nat.get.call(c)+1e-9)return Promise.resolve();
    return new Promise(function(res){ c.suspend(t).then(res);
      if(!c.__started){ c.__started=true; c.__done=c.startRendering(); } else OfflineAudioContext.prototype.resume.call(c); }); }
  /* a frame is cut into sub-steps so the transport's 8 ms tick reads an audio clock that moves with it */
  window.__step=function(ms){
    var c=window.__oac; if(!c){ __advance(ms); return Promise.resolve(); }
    var SUB=4, n=Math.max(1,Math.round(ms/SUB)), d=ms/n, i=0;
    return new Promise(function(done){
      (function next(){ if(i>=n){ __advance(0); done(); return; }
        i++; __advance(d,true); c.__t+=d/1000; audioTo(c).then(next); })();
    });
  };
  window.__finish=function(){ var c=window.__oac; OfflineAudioContext.prototype.resume.call(c);
    return c.__done.then(function(buf){ var n=buf.length, L=buf.getChannelData(0), R=buf.getChannelData(1), pk=0;
      for(var i=0;i<n;i++){ pk=Math.max(pk,Math.abs(L[i]),Math.abs(R[i])); }
      var out=new Int16Array(n*2), g=pk>0.98?0.98/pk:1; for(var j=0;j<n;j++){ out[2*j]=Math.max(-32767,Math.min(32767,L[j]*g*32767)); out[2*j+1]=Math.max(-32767,Math.min(32767,R[j]*g*32767)); }
      window.__pcm=new Uint8Array(out.buffer); return {n:n,peak:pk,gain:g}; }); };
  window.__pcmChunk=function(i,sz){ var u=window.__pcm.subarray(i,i+sz), s=''; for(var k=0;k<u.length;k+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(k,k+0x8000)); return btoa(s); };
})();
