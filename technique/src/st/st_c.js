
/*@COPY:378-394*/
strLines.forEach(l=>l.classList.add('strDim'));
/* the board's three layers, dimmest to brightest (g(x) on): PAINT, every string and fret in its tone's field colour (antis
   left unmarked under Diatonic mode); GLOW, every place the chosen hearing lives under φ; SPOTLIGHT, each finger lighting
   the fret it is over and its neighbours, a 3 × 3 block. With g(x) off nothing is painted and the spotlight is grey. */
const cellX0=f=>f===0?FB.x0:cellL(f), cellX1=f=>f===0?FB.nut:cellR(f);
const glowDefs=el('defs',{},fb), glowF=el('filter',{id:'cellGlow',filterUnits:'userSpaceOnUse',x:0,y:0,width:990,height:304},glowDefs);   // in user space: a level line has no height to measure a region by
el('feGaussianBlur',{stdDeviation:2.6},glowF);
const glowG=el('g',{'pointer-events':'none'}), paintG=el('g',{'pointer-events':'none'});
fb.insertBefore(glowG,strLines[0]); fb.appendChild(paintG);
const CELLS=[];
for(let s=0;s<NSTR;s++) for(let f=0;f<=FMAX;f++){ const y=FB.strY[s], x1=cellX0(f)+(f?1.2:0), x2=cellX1(f)-(f?1.2:2);
  CELLS.push({s,f,lv:0,glow:el('line',{x1,y1:y,x2,y2:y,'stroke-width':FB.gauge[s]+7,'stroke-linecap':'round',filter:'url(#cellGlow)',opacity:0},glowG),
    paint:el('line',{x1,y1:y,x2,y2:y,'stroke-width':FB.gauge[s]+0.4,'stroke-linecap':'butt',opacity:0},paintG)}); }
const cellAt=(s,f)=>CELLS[s*(FMAX+1)+f];
const fretAt=x=>{ for(let f=1;f<FMAX;f++){ const a=tipX(f), b=tipX(f+1); if(x<b) return Math.max(1,f+(x-a)/(b-a)); } return FMAX; };   // a position along the neck, in frets
/*@COPY:428-469*/
/*@COPY:470-487*/
// the hand: four numbered fingers and the thumb, each one clickable and draggable while playback is stopped
const fingers=[];
const markG=el('g',{},fb);                                              // the pulsing marks of the frets a pairing can still take
const MARKS=CELLS.map(c=>{ const x=c.f?tipX(c.f):(FB.x0+FB.nut)/2, y=FB.strY[c.s]; const m=el('circle',{cx:x,cy:y,r:9.5,class:'cellMk',visibility:'hidden'},markG); return m; });
for(let f=1;f<=4;f++){
  const fret=POSITION+f-1, x=tipX(fret);
  const guide=el('line',{x1:x,y1:FB.hover+17,x2:x,y2:FB.strY[0]-6,class:'guide'},fb);
  const c=el('path',{d:fingerPath(x,FB.hover,0),class:'fingerC'},fb);
  const t=el('text',{x:x,y:FB.hover,class:'fingerN'},fb); t.textContent=f;
  fingers.push({f,fret,home:x,x,y:hoverY(FB.strY[0]),c,t,guide});
}
const thumbG=el('g',{class:'thumbG'},fb);
el('rect',{x:-17,y:-11,width:34,height:22,rx:11,class:'fingerC'},thumbG);
const thumbT=el('text',{x:0,y:0,class:'fingerN'},thumbG); thumbT.textContent='T';
let thumbX=null;
function placeThumb(shift,H){ const tx=tipXf((H||HAND).thumb+(shift||0)); thumbX=thumbX===null||reduce?tx:thumbX+(tx-thumbX)*0.25; thumbG.setAttribute('transform','translate('+thumbX.toFixed(1)+' '+(FB.bot+44)+')'); }
/*@COPY:511-593*/
// the open strings: their cells lie between the board's edge and the nut, clickable like any fret
const hitG=el('g',{},fb);
CELLS.forEach(c=>{ const h=el('rect',{x:cellX0(c.f),y:FB.strY[c.s]-12,width:cellX1(c.f)-cellX0(c.f),height:24,class:'hit'},hitG); h.addEventListener('click',e=>{ e.stopPropagation(); clickCell(c.s,c.f); }); });
fb.appendChild(markG);
fingers.forEach(F=>{ fb.appendChild(F.guide); fb.appendChild(F.c); fb.appendChild(F.t); });
fb.appendChild(thumbG);
