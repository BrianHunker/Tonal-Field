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
  // the hinge (g = 0) and its ticks as the app draws them: a solid circle and 120 ticks (every tenth longer), their
  // widths in screen pixels whatever the ring's size, so they stay sharp; the guide circles likewise
  [VAL.R0+VAL.K,VAL.R0-VAL.K].forEach(r=>el('circle',{cx:RG.c,cy:RG.c,r,fill:'none',class:'inkS','stroke-width':1,'vector-effect':'non-scaling-stroke','stroke-dasharray':'1.5 4',opacity:0.13},valDeco));
  const hinge=valG.querySelector('circle'); if(hinge){ hinge.removeAttribute('stroke-dasharray'); hinge.setAttribute('class','inkS'); hinge.setAttribute('stroke-width',1); hinge.setAttribute('vector-effect','non-scaling-stroke'); hinge.setAttribute('opacity',0.3); }
  const tk=el('g',{'shape-rendering':'geometricPrecision'},valG);
  for(let t=0;t<120;t++){ const a=t*Math.PI/60, big=t%10===0, r1=VAL.R0-(big?1.92:0.96), r2=VAL.R0+(big?1.92:0.96);
    el('line',{x1:RG.c+r1*Math.sin(a),y1:RG.c-r1*Math.cos(a),x2:RG.c+r2*Math.sin(a),y2:RG.c-r2*Math.cos(a),class:'inkS','stroke-width':big?1.2:1,'vector-effect':'non-scaling-stroke',opacity:big?0.42:0.16},tk); }
  // the ring's size on screen, in device pixels (stepped, so a few pixels' change doesn't repaint)
  const measure=()=>{ const w=ringSvg.getBoundingClientRect().width*(window.devicePixelRatio||1); valPx=Math.max(256,Math.min(2400,64*Math.ceil(w/64))); };
  measure(); if(window.ResizeObserver) new ResizeObserver(measure).observe(ringSvg); }
function ringRebind(){ valKey=''; }
function shapeField(){
  if(!valImg) valSetup();
  const chain=RING.m>=0.5, bg=bgColour(), on=FIELD.mx>=0, mid=ordMid(), key=(on?FIELD.mx.toFixed(4)+'|'+fieldD(chain).toFixed(3):'-')+'|'+bg.join()+'|'+chain+'|'+diatonic+'|'+(FLAT_OFF?FIELD.lit.toFixed(3):'')+'|'+valPx+(mid?'|'+RING.m.toFixed(4)+'|'+FIELD.re.toFixed(3)+'|'+FIELD.reC.toFixed(3):''); if(key===valKey) return; valKey=key;
  // the order changing: the two curves blended seat by seat in the screen's own seats (the group is not turned), the
  // colours crossfaded; where the orders share a tone the curves already agree, elsewhere the value passes through zero
  const w=RING.m, vAt=mid?(k=>(1-w)*fieldAt(k-FIELD.re,false)+w*fieldAt(k-FIELD.reC,true)):(k=>fieldAt(k,chain)),
        cAt=mid?(k=>mixRGB(fieldRGB(k-FIELD.re,false),fieldRGB(k-FIELD.reC,true),w)):(k=>fieldRGB(k,chain));
  // FLAT_OFF: the field's height and colour scale with g(x)'s light — at none, a flat grey circle on the hinge
  const A=FLAT_OFF?FIELD.lit:1, gry=mixRGB(bg,inkColour(),0.55), cm=c=>FLAT_OFF?mixRGB(gry,c,FIELD.lit):c, f2=v=>v.toFixed(2);
  const at=(k,r)=>{ const a=k*Math.PI/6; return [RG.c+r*Math.sin(a),RG.c-r*Math.cos(a)]; }, rOf=k=>VAL.R0+VAL.K*A*vAt(k);
  const cv=valCv, S=valPx, sc=S/(2*RG.c), ctx=cv.getContext('2d'); if(cv.width!==S){ cv.width=S; cv.height=S; }
  ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,S,S); ctx.setTransform(sc,0,0,sc,0,0); ctx.lineCap='round';
  const rgba=(c,a)=>'rgba('+Math.round(c[0])+','+Math.round(c[1])+','+Math.round(c[2])+','+a.toFixed(3)+')';
  ctx.lineWidth=0.0248*VAL.R0;                                       // the app's stroke: 0.0062 of its width, its hinge a quarter of it
  for(let i=0;i<1080;i++){ const k=12*i/1080, v=vAt(k), cc=cm(cAt(k)), al=A*(diatonic&&v<-1e-9?0.9:0.35+0.65*Math.abs(v));
    const [x1,y1]=at(k,VAL.R0), [x2,y2]=at(k,VAL.R0+VAL.K*A*v); if(Math.hypot(x2-x1,y2-y1)<0.05) continue;
    const gr=ctx.createLinearGradient(x1,y1,x2,y2); gr.addColorStop(0,rgba(cc,0)); gr.addColorStop(1,rgba(cc,al));
    ctx.strokeStyle=gr; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
  // the curve: a hairline, 1.3 screen pixels whatever the size
  ctx.lineWidth=1.3*(window.devicePixelRatio||1)/sc; let p=at(0,rOf(0));
  for(let i=1;i<=720;i++){ const k=12*i/720, v=vAt(k), q=at(k,rOf(k)), c=mixRGB(gry,cm(cAt(k)),Math.min(1,0.25+0.9*Math.abs(v)));
    ctx.strokeStyle=rgba(c,0.95); ctx.beginPath(); ctx.moveTo(p[0],p[1]); ctx.lineTo(q[0],q[1]); ctx.stroke(); p=q; }
  valImg.setAttribute('href',cv.toDataURL());
  // the tones' dots: each sits on its own seat with its own value; mid-morph, one whose seat changes fades out to the hinge and in again
  valDots.forEach((dt,k)=>{ let j, op=1;
    if(mid){ const sa=FIELD.re+k, sc=FIELD.reC+7*k; j=ordSeat(sa,sc); op=ordFade(sa,sc); } else j=chain?7*k:k;
    const [x,y]=at(j,rOf(j)); dt.setAttribute('cx',f2(x)); dt.setAttribute('cy',f2(y)); dt.setAttribute('opacity',op.toFixed(3)); dt.setAttribute('fill',rgbS(cm(mid?relRGB(k):fieldRGB(j,chain)))); });
}

