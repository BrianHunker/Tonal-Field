/* THE MORPH: every point of the circle goes straight from its old value to its new one, all at the same rate; the colours
   blend the same way. A tritone (π) morph is the fold, g → −g, so half way through the circle lies flat. */
const fieldW=(x,chain)=>chain?Math.cos(x*Math.PI/6):gOf(x*Math.PI/6);
const fieldD=chain=>chain?FIELD.reC-FIELD.reCA:FIELD.re-FIELD.reA;          // the old Re, in seats from the new one (negated)
function fieldAt(p,chain){ const m=FIELD.mx; if(m<0) return fieldW(p,chain); const d=fieldD(chain); return (1-m)*fieldW(p+d,chain)+m*fieldW(p,chain); }
function fieldRGB(p,chain){ const C=chain?chainRGB:relRGB, m=FIELD.mx; if(m<0) return C(p); return mixRGB(C(p+fieldD(chain)),C(p),m); }
// THE FIELD'S LOOK, drawn as the app draws its ring: 1080 radial strokes round the circle, each fading from clear at the
// hinge to the tone's colour at the curve (opacity 0.35 + 0.65·|g|; an anti under Diatonic 0.9), each stroke wider than the gap
// between them, so neighbours overlap and the colour compounds — a solid, rounded lobe, nearly full colour most of the way
// in and falling clear only near the hinge, its colour turning smoothly round the circle; inward lobes the same. Then the
// curve as a hairline in the colour faded by its height. It is painted on a canvas, at the ring's size on screen, and shown
// inside the ring as an image; the field's group is turned as a whole, so it is repainted only when its shape changes (a
// morph, the order, Diatonic, the light) or the ring's size on screen does (zoomed). Faint guide circles at the curve's
// reach, the hinge drawn with ticks.
let valDeco=null, valImg=null, valCv=null, valPx=0;
function valSetup(){
  if(valImg) return; const fillG=valFills[0].parentNode, lineG=valLines[0].parentNode;
  valImg=el('image',{x:0,y:0,width:2*RG.c,height:2*RG.c,preserveAspectRatio:'none','pointer-events':'none'},valG); valG.insertBefore(valImg,fillG);
  fillG.style.display=lineG.style.display='none'; valCv=document.createElement('canvas');
  valDeco=el('g',{'pointer-events':'none'},valG); valG.insertBefore(valDeco,valImg);
  [VAL.R0+VAL.K,VAL.R0-VAL.K].forEach(r=>el('circle',{cx:RG.c,cy:RG.c,r,fill:'none',class:'faintS','stroke-width':0.8,'stroke-dasharray':'1.5 4',opacity:0.6},valDeco));
  const tk=el('g',{},valG);
  for(let t=0;t<120;t++){ const a=t*Math.PI/60, big=t%10===0, r1=VAL.R0-(big?2.6:1.3), r2=VAL.R0+(big?2.6:1.3);
    el('line',{x1:RG.c+r1*Math.sin(a),y1:RG.c-r1*Math.cos(a),x2:RG.c+r2*Math.sin(a),y2:RG.c-r2*Math.cos(a),class:'inkS','stroke-width':big?0.9:0.6,opacity:big?0.42:0.18},tk); }
  // the ring's size on screen, in device pixels (stepped, so a few pixels' change doesn't repaint)
  const measure=()=>{ const w=ringSvg.getBoundingClientRect().width*(window.devicePixelRatio||1); valPx=Math.max(256,Math.min(2400,64*Math.ceil(w/64))); };
  measure(); if(window.ResizeObserver) new ResizeObserver(measure).observe(ringSvg); }
function ringRebind(){ valKey=''; }
function shapeField(){
  if(!valImg) valSetup();
  const chain=RING.m>=0.5, bg=bgColour(), on=FIELD.mx>=0, key=(on?FIELD.mx.toFixed(4)+'|'+fieldD(chain).toFixed(3):'-')+'|'+bg.join()+'|'+chain+'|'+diatonic+'|'+(FLAT_OFF?FIELD.lit.toFixed(3):'')+'|'+valPx; if(key===valKey) return; valKey=key;
  // FLAT_OFF: the field's height and colour scale with g(x)'s light — at none, a flat grey circle on the hinge
  const A=FLAT_OFF?FIELD.lit:1, gry=mixRGB(bg,inkColour(),0.55), cm=c=>FLAT_OFF?mixRGB(gry,c,FIELD.lit):c, f2=v=>v.toFixed(2);
  const at=(k,r)=>{ const a=k*Math.PI/6; return [RG.c+r*Math.sin(a),RG.c-r*Math.cos(a)]; }, rOf=k=>VAL.R0+VAL.K*A*fieldAt(k,chain);
  const cv=valCv, S=valPx, sc=S/(2*RG.c), ctx=cv.getContext('2d'); if(cv.width!==S){ cv.width=S; cv.height=S; }
  ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,S,S); ctx.setTransform(sc,0,0,sc,0,0); ctx.lineCap='round';
  const rgba=(c,a)=>'rgba('+Math.round(c[0])+','+Math.round(c[1])+','+Math.round(c[2])+','+a.toFixed(3)+')';
  ctx.lineWidth=0.0248*VAL.R0;                                       // the app's stroke: 0.0062 of its width, its hinge a quarter of it
  for(let i=0;i<1080;i++){ const k=12*i/1080, v=fieldAt(k,chain), cc=cm(fieldRGB(k,chain)), al=A*(diatonic&&v<-1e-9?0.9:0.35+0.65*Math.abs(v));
    const [x1,y1]=at(k,VAL.R0), [x2,y2]=at(k,VAL.R0+VAL.K*A*v); if(Math.hypot(x2-x1,y2-y1)<0.05) continue;
    const gr=ctx.createLinearGradient(x1,y1,x2,y2); gr.addColorStop(0,rgba(cc,0)); gr.addColorStop(1,rgba(cc,al));
    ctx.strokeStyle=gr; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
  // the curve: a hairline, 1.3 screen pixels whatever the size
  ctx.lineWidth=1.3*(window.devicePixelRatio||1)/sc; let p=at(0,rOf(0));
  for(let i=1;i<=720;i++){ const k=12*i/720, v=fieldAt(k,chain), q=at(k,rOf(k)), c=mixRGB(gry,cm(fieldRGB(k,chain)),Math.min(1,0.25+0.9*Math.abs(v)));
    ctx.strokeStyle=rgba(c,0.95); ctx.beginPath(); ctx.moveTo(p[0],p[1]); ctx.lineTo(q[0],q[1]); ctx.stroke(); p=q; }
  valImg.setAttribute('href',cv.toDataURL());
  valDots.forEach((dt,k)=>{ const j=chain?7*k:k, [x,y]=at(j,rOf(j)); dt.setAttribute('cx',f2(x)); dt.setAttribute('cy',f2(y)); dt.setAttribute('fill',rgbS(cm(fieldRGB(j,chain)))); });
}

