  const mx=FIELD.mx, old=mx>=0&&mx<0.5, fade=mx>=0?Math.abs(1-2*mx):1, chainL=RING.m>=0.5;   // the names: the old set fades out as the new fades in
  const bR=old?FIELD.reA:FIELD.re, bC=old?FIELD.reCA:FIELD.reC;
  const TRIO=[]; for(let k=0;k<12;k++) if(!SOLF[k][0].startsWith('~')) TRIO.push(k);   // the seven diatonic places
  valDots.forEach((d,k)=>d.setAttribute('r',TRIO.includes(k)?3.2:2.2));
  TRIO.forEach((k,i)=>{ const sa=bR+k, sc=bC+7*k, pc=ordSeat(sa,sc), of=ordFade(sa,sc), v=fieldAt(chainL?sc-FIELD.reC:sa-FIELD.re,chainL)*of, r=VAL.R0+VAL.K*v*(FLAT_OFF?FIELD.lit:1)-16, a=pc*Math.PI/6, t=valLbls[i], name=SOLF[k][0];
    if(t.textContent!==name) t.textContent=name; t.style.fill=rgbS(relRGB(k));
    t.setAttribute('x',(RG.c+r*Math.sin(a)).toFixed(1)); t.setAttribute('y',(RG.c-r*Math.cos(a)).toFixed(1)); t.setAttribute('opacity',(FIELD.lit*fade*of).toFixed(3)); });