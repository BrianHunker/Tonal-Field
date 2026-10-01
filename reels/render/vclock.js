(function(){
  /* a virtual clock: nothing moves until __advance(ms) moves it, so every frame is exactly 1/30 s apart */
  var vt=0, base=Date.now(); window.__rST=window.setTimeout.bind(window);
  performance.now=function(){ return vt; };
  Date.now=function(){ return base+vt; };
  var timers=new Map(), tid=1, rafs=[], rid=1;
  window.setTimeout=function(fn,d){ var a=[].slice.call(arguments,2), id=tid++; if(typeof fn!=='function')return id; timers.set(id,{t:vt+Math.max(0,+d||0),fn:fn,a:a,iv:0,seq:id}); return id; };
  window.setInterval=function(fn,d){ var a=[].slice.call(arguments,2), id=tid++; d=Math.max(1,+d||0); timers.set(id,{t:vt+d,fn:fn,a:a,iv:d,seq:id}); return id; };
  window.clearTimeout=window.clearInterval=function(id){ timers.delete(id); };
  window.requestAnimationFrame=function(fn){ var id=rid++; rafs.push({id:id,fn:fn}); return id; };
  window.cancelAnimationFrame=function(id){ rafs=rafs.filter(function(r){ return r.id!==id; }); };
  Object.defineProperty(BaseAudioContext.prototype,'currentTime',{configurable:true,get:function(){ if(this.__vt0===undefined)this.__vt0=vt; return (vt-this.__vt0)/1000; }});
  window.__vt=function(){ return vt; };
  window.__advance=function(ms,noRaf){
    var end=vt+ms, guard=0;
    for(;;){ var best=null,bid=null; timers.forEach(function(t,id){ if(t.t<=end&&(!best||t.t<best.t||(t.t===best.t&&t.seq<best.seq))){ best=t; bid=id; } });
      if(!best||++guard>20000)break; if(best.t>vt)vt=best.t; if(best.iv)best.t+=best.iv; else timers.delete(bid);
      try{ best.fn.apply(window,best.a); }catch(e){ console.error(e); } }
    vt=end; if(noRaf)return; var rs=rafs; rafs=[]; rs.forEach(function(r){ try{ r.fn(vt); }catch(e){ console.error(e); } });
  };
})();
