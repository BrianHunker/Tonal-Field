/* THE MORPH: every point of the circle goes straight from its old value to its new one, all at the same rate; the colours
   blend the same way. A tritone (π) morph is the fold, g → −g, so half way through the circle lies flat. */
const fieldW=(x,chain)=>chain?Math.cos(x*Math.PI/6):gOf(x*Math.PI/6);
const fieldD=chain=>chain?FIELD.reC-FIELD.reCA:FIELD.re-FIELD.reA;          // the old Re, in seats from the new one (negated)
function fieldAt(p,chain){ const m=FIELD.mx; if(m<0) return fieldW(p,chain); const d=fieldD(chain); return (1-m)*fieldW(p+d,chain)+m*fieldW(p,chain); }
function fieldRGB(p,chain){ const C=chain?chainRGB:relRGB, m=FIELD.mx; if(m<0) return C(p); return mixRGB(C(p+fieldD(chain)),C(p),m); }
// THE FIELD'S LOOK (after the app's older, finer ring): each sliver of a lobe is shaded from nothing at the hinge circle to its
// colour at the curve, the more strongly the farther the curve stands from the hinge — so a lobe has depth, deepest at its
// tip, and the inward (anti) lobes darken toward their own tips the same way; the curve itself is drawn in the colour
// faded by its height, grey where it crosses the hinge. Faint guide circles at the curve's reach, the hinge drawn with ticks.
let valDefs=null, valGrads=[], valDeco=null;
function valSetup(){
  if(valDefs) return; valDefs=el('defs',{},valG); valG.insertBefore(valDefs,valG.firstChild);
  for(let i=0;i<VAL.N;i++){ const g=el('radialGradient',{id:'vg'+i,gradientUnits:'userSpaceOnUse',cx:RG.c,cy:RG.c,r:VAL.R0+VAL.K+4},valDefs);
    valGrads.push([g,el('stop',{offset:0},g),el('stop',{offset:1},g)]); valFills[i].setAttribute('fill','url(#vg'+i+')'); }
  valDeco=el('g',{'pointer-events':'none'},valG); valG.insertBefore(valDeco,valFills[0].parentNode);
  [VAL.R0+VAL.K,VAL.R0-VAL.K].forEach(r=>el('circle',{cx:RG.c,cy:RG.c,r,fill:'none',class:'faintS','stroke-width':0.8,'stroke-dasharray':'1.5 4',opacity:0.6},valDeco));
  const tk=el('g',{},valG);
  for(let t=0;t<120;t++){ const a=t*Math.PI/60, big=t%10===0, r1=VAL.R0-(big?2.6:1.3), r2=VAL.R0+(big?2.6:1.3);
    el('line',{x1:RG.c+r1*Math.sin(a),y1:RG.c-r1*Math.cos(a),x2:RG.c+r2*Math.sin(a),y2:RG.c-r2*Math.cos(a),class:'inkS','stroke-width':big?0.9:0.6,opacity:big?0.42:0.18},tk); }
  valLines.forEach(L=>L.setAttribute('stroke-width',1.6)); }
function ringRebind(){ if(!valDefs) return; valFills.forEach((f,i)=>{ f.removeAttribute('fill'); f.setAttribute('fill','url(#vg'+i+')'); }); valKey=''; }
function shapeField(){
  const chain=RING.m>=0.5, bg=bgColour(), on=FIELD.mx>=0, key=(on?FIELD.mx.toFixed(4)+'|'+fieldD(chain).toFixed(3):'-')+'|'+bg.join()+'|'+chain+'|'+diatonic+'|'+(FLAT_OFF?FIELD.lit.toFixed(3):''); if(key===valKey) return; valKey=key;
  valSetup();
  // FLAT_OFF: the field's height and colour scale with g(x)'s light — at none, a flat grey circle on the hinge
  const A=FLAT_OFF?FIELD.lit:1, gry=mixRGB(bg,inkColour(),0.55), cm=c=>FLAT_OFF?mixRGB(gry,c,FIELD.lit):c, Rg=VAL.R0+VAL.K+4;
  const at=(k,r)=>{ const a=k*Math.PI/6; return [RG.c+r*Math.sin(a),RG.c-r*Math.cos(a)]; }, rOf=k=>VAL.R0+VAL.K*A*fieldAt(k,chain), f2=v=>v.toFixed(2);
  for(let i=0;i<VAL.N;i++){ const k0=12*i/VAL.N, k1=12*(i+1.4)/VAL.N, k2=12*(i+1)/VAL.N, km=12*(i+.5)/VAL.N, rgb=cm(fieldRGB(km,chain)), v=fieldAt(km,chain);   // each wedge overlaps the next a little: opaque, so no seams
    const [a,b]=at(k0,VAL.R0), [d,e]=at(k1,VAL.R0), [f,g]=at(k1,rOf(k1)), [h,j]=at(k0,rOf(k0)), [x2,y2]=at(k2,rOf(k2));
    valFills[i].setAttribute('d','M'+f2(a)+' '+f2(b)+'L'+f2(d)+' '+f2(e)+'L'+f2(f)+' '+f2(g)+'L'+f2(h)+' '+f2(j)+'Z');
    // the sliver's shading: the page at the hinge, the colour at the curve — as strong as the curve stands high
    const rE=rOf(km), o0=Math.min(VAL.R0,rE)/Rg, o1=Math.max(VAL.R0,rE)/Rg, tip=rgbS(mixRGB(bg,rgb,(0.35+0.65*Math.abs(v))*A)), base=rgbS(bg), [, s0, s1]=valGrads[i];
    s0.setAttribute('offset',o0.toFixed(4)); s1.setAttribute('offset',Math.max(o0+0.001,o1).toFixed(4));
    s0.setAttribute('stop-color',rE<VAL.R0?tip:base); s1.setAttribute('stop-color',rE<VAL.R0?base:tip);
    const L=valLines[i]; L.setAttribute('x1',f2(h)); L.setAttribute('y1',f2(j)); L.setAttribute('x2',f2(x2)); L.setAttribute('y2',f2(y2)); L.setAttribute('stroke',rgbS(mixRGB(gry,rgb,Math.min(1,0.25+0.9*Math.abs(v))))); }
  valDots.forEach((dt,k)=>{ const j=chain?7*k:k, [x,y]=at(j,rOf(j)); dt.setAttribute('cx',f2(x)); dt.setAttribute('cy',f2(y)); dt.setAttribute('fill',rgbS(cm(fieldRGB(j,chain)))); });
}
