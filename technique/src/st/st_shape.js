/* THE MORPH: every point of the circle goes straight from its old value to its new one, all at the same rate; the colours
   blend the same way. A tritone (π) morph is the fold, g → −g, so half way through the circle lies flat. */
const fieldW=(x,chain)=>chain?Math.cos(x*Math.PI/6):gOf(x*Math.PI/6);
const fieldD=chain=>chain?FIELD.reC-FIELD.reCA:FIELD.re-FIELD.reA;          // the old Re, in seats from the new one (negated)
function fieldAt(p,chain){ const m=FIELD.mx; if(m<0) return fieldW(p,chain); const d=fieldD(chain); return (1-m)*fieldW(p+d,chain)+m*fieldW(p,chain); }
function fieldRGB(p,chain){ const C=chain?chainRGB:relRGB, m=FIELD.mx; if(m<0) return C(p); return mixRGB(C(p+fieldD(chain)),C(p),m); }
function shapeField(){
  const chain=RING.m>=0.5, bg=bgColour(), on=FIELD.mx>=0, key=(on?FIELD.mx.toFixed(4)+'|'+fieldD(chain).toFixed(3):'-')+'|'+bg.join()+'|'+chain+'|'+diatonic+'|'+(FLAT_OFF?FIELD.lit.toFixed(3):''); if(key===valKey) return; valKey=key;
  // FLAT_OFF: the field's height and colour scale with g(x)'s light — at none, a flat grey circle on the hinge
  const A=FLAT_OFF?FIELD.lit:1, gry=mixRGB(bg,inkColour(),0.55), cm=c=>FLAT_OFF?mixRGB(gry,c,FIELD.lit):c;
  const at=(k,r)=>{ const a=k*Math.PI/6; return [RG.c+r*Math.sin(a),RG.c-r*Math.cos(a)]; }, rOf=k=>VAL.R0+VAL.K*A*fieldAt(k,chain), f2=v=>v.toFixed(2);
  for(let i=0;i<VAL.N;i++){ const k0=12*i/VAL.N, k1=12*(i+1.4)/VAL.N, k2=12*(i+1)/VAL.N, rgb=cm(fieldRGB(12*(i+.5)/VAL.N,chain));   // each wedge overlaps the next a little: opaque, so no seams
    const [a,b]=at(k0,VAL.R0), [d,e]=at(k1,VAL.R0), [f,g]=at(k1,rOf(k1)), [h,j]=at(k0,rOf(k0)), [x2,y2]=at(k2,rOf(k2));
    valFills[i].setAttribute('d','M'+f2(a)+' '+f2(b)+'L'+f2(d)+' '+f2(e)+'L'+f2(f)+' '+f2(g)+'L'+f2(h)+' '+f2(j)+'Z');
    valFills[i].setAttribute('fill',rgbS(mixRGB(bg,rgb,0.32*A)));                   // the petals' wash: 32% of the colour over the page
    const L=valLines[i]; L.setAttribute('x1',f2(h)); L.setAttribute('y1',f2(j)); L.setAttribute('x2',f2(x2)); L.setAttribute('y2',f2(y2)); L.setAttribute('stroke',rgbS(rgb)); }
  valDots.forEach((dt,k)=>{ const j=chain?7*k:k, [x,y]=at(j,rOf(j)); dt.setAttribute('cx',f2(x)); dt.setAttribute('cy',f2(y)); dt.setAttribute('fill',rgbS(cm(fieldRGB(j,chain)))); });
}
