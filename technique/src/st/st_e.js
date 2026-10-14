
/*@COPY:708-729*/
// the TAB's width: the loop at a readable spacing (two bars fill the page); a longer loop runs wider than the page, its panel
// then scrolls and follows the playhead while it plays
const tabPanel=document.getElementById('tabPanel'), gridG=el('g',{},tab); let CW_MIN=23.5;   // a page may widen it (sixteenths need the room)
function layoutTab(bars){
  const E=8*bars; TB.cw=Math.max(CW_MIN,(886-TB.x0)/E); TB.s1=TB.x1=TB.x0+E*TB.cw+(TB.tail||0);
  const W=Math.max(900,Math.round(TB.s1+14)); tab.setAttribute('viewBox','0 0 '+W+' 226'); tab.style.width=(100*W/900).toFixed(2)+'%'; tab.style.maxWidth=W>900?'none':'';
  tabPanel.classList.toggle('wide',W>900); if(W<=900) tabPanel.scrollLeft=0;
  rows.forEach(r=>r.setAttribute('x2',TB.s1));
  while(gridG.firstChild) gridG.removeChild(gridG.firstChild);
  for(let b=1;b<bars;b++){ if(b===TB.repeatBar) continue; const x=TB.barX?TB.barX(b):TB.x0+8*b*TB.cw; el('line',{x1:x,y1:TB.rowY[0],x2:x,y2:TB.rowY[NSTR-1],class:'inkS','stroke-width':1},gridG); }
  const re=TB.repeatX||TB.s1; [[re,4],[re-6,1]].forEach(([x,w])=>el('line',{x1:x,y1:TB.rowY[0],x2:x,y2:TB.rowY[NSTR-1],class:'inkS','stroke-width':w},gridG));
  DOTS.map(midY).forEach(y=>el('circle',{cx:re-12,cy:y,r:2.4,class:'ink'},gridG));
  for(let b=0;b<4*bars;b++){ const xb=TB.x0+TB.cw/2+b*2*TB.cw; el('line',{x1:xb-5,y1:TB.floor+1.5,x2:xb+5,y2:TB.floor+1.5,class:'faintS','stroke-width':2,'stroke-linecap':'round'},gridG); }
}
function followHead(x){ if(!tabPanel.classList.contains('wide')) return;
  const k=tab.clientWidth/(TB.s1+14), want=Math.max(0,x*k-0.3*tabPanel.clientWidth), d=want-tabPanel.scrollLeft;
  tabPanel.scrollLeft+=Math.abs(d)>0.4*tabPanel.clientWidth?d*0.16:d; }   // at the repeat it sweeps back to the start rather than jumping
layoutTab(2);
/*@COPY:755-793*/
const curPlan=()=>{ const s=T.on&&T.shown; return s?s.plan:(DRILL?DRILL.plan:null); };
// the TAB of the current drill: each number on its own string's line; bends as curved arrows marked ½, a release back down
// to the fret in parentheses, a prebend a straight arrow up from a picked number; slides a line from number to number;
// hammer-ons and pull-offs an arc marked H or P. No drill: an empty staff.
function buildTabNotes(){
  while(noteG.firstChild) noteG.removeChild(noteG.firstChild);
  tabNotes=[];
  const D=(T.on&&T.shown)?T.shown.D:DRILL;
  rows.forEach((r,i)=>r.classList.toggle('sel',!!D&&(D.lo.s===i||D.hi.s===i))); rowLbls.forEach((l,i)=>l.classList.toggle('sel',!!D&&(D.lo.s===i||D.hi.s===i)));
  if(!D) return;
  const plan=D.plan, stemTop=TB.rowY[NSTR-1]+10, stemLong=26, stemShort=13, slurPts=[];
  FIG.forEach((e,i)=>{
    const n=plan[i], x=xBeat(e.s), y=TB.rowY[n.string], prev=plan[(i+FIG.length-1)%FIG.length], first=BAR_START(i);
    let mark;
    if(D.means==='bend'){
      const lo=D.lo.f, bent=n.push>0;
      if(first&&!bent) mark=numberAt(x,y,String(lo));
      else if(first&&bent){ mark=numberAt(x,y,String(lo));
        el('line',{x1:x,y1:y-9,x2:x,y2:TB.topY+6,class:'inkS','stroke-width':1.3},noteG); arrowHead(x,TB.topY,-1);
        const t=el('text',{x,y:TB.topY-10,class:'bendLbl'},noteG); t.textContent='½'; mark.extra=[t]; }
      else if(bent){ const x0=x-TB.cw+10;
        el('path',{d:'M'+x0+' '+(y-2)+' Q'+x+' '+(y-2)+' '+x+' '+(TB.topY+6),class:'curve'},noteG); arrowHead(x,TB.topY,-1);
        const k=el('rect',{x:x-7,y:TB.topY-17,width:14,height:13,rx:2,class:'knock'},noteG);
        const t=el('text',{x,y:TB.topY-10,class:'bendLbl'},noteG); t.textContent='½'; mark={bar:k,num:t}; }
      else{ const x0=x-TB.cw+10;
        el('path',{d:'M'+x0+' '+(TB.topY+2)+' Q'+x+' '+(TB.topY+2)+' '+x+' '+(y-14),class:'curve'},noteG); arrowHead(x,y-9,1);
        mark=numberAt(x,y,'('+lo+')'); }
    }else{
      mark=numberAt(x,y,String(n.fret));
      if(D.means==='slide'&&!first){ const xp=xBeat(FIG[(i+FIG.length-1)%FIG.length].s), up=n.fret>prev.fret;
        el('line',{x1:xp+9,y1:up?y+4:y-4,x2:x-9,y2:up?y-4:y+4,class:'inkS','stroke-width':1.3,'stroke-linecap':'round'},noteG); }
    }
    slurPts.push({x,y,leg:(D.means==='slide'&&!first)||n.kind==='ham'||n.kind==='pull',lbl:n.kind==='ham'?'H':(n.kind==='pull'?'P':'')});
    tabNotes.push(mark);
    const half=e.d>=2;
    el('line',{x1:x,y1:stemTop,x2:x,y2:stemTop+(half?stemShort:stemLong),class:'inkS','stroke-width':1.3},noteG);
    if(!half&&i%2===0) el('rect',{x:x-0.65,y:stemTop+stemLong-3.5,width:TB.cw+1.3,height:3.5,class:'ink'},noteG);
  });
  { let g0=-1; const arc=(xa,xb,y)=>el('path',{d:'M'+(xa+3)+' '+(y-11)+' Q'+((xa+xb)/2)+' '+(y-11-Math.min(16,6+(xb-xa)*0.12))+' '+(xb-3)+' '+(y-11),class:'curve'},noteG);
    slurPts.forEach((q,i)=>{ if(q.lbl){ const t=el('text',{x:i>0?(slurPts[i-1].x+q.x)/2:q.x-16,y:q.y-24,class:'bendLbl'},noteG); t.textContent=q.lbl; }
      if(i===0&&q.leg&&q.lbl){ arc(q.x-34,q.x,q.y); if(!(slurPts[1]&&slurPts[1].leg)) return; }
      if(q.leg){ if(g0<0) g0=Math.max(0,i-1); if(i===slurPts.length-1||!slurPts[i+1].leg){ arc(slurPts[g0].x,q.x,q.y); g0=-1; } } }); }
}
const head=el('line',{x1:TB.x0,y1:TB.rowY[0]-10,x2:TB.x0,y2:TB.rowY[NSTR-1]+10,class:'headS','stroke-width':1.5,visibility:'hidden'},tab);
/*@COPY:824-988*/
