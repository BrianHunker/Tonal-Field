/* THE HAND'S MECHANISM. One skeleton, in millimetres, on a real neck; everything drawn is read off it.
   A rigid palm carries the four knuckles (the metacarpal heads) in a fixed row, a little arched, and the thumb's base.
   Each finger is three bones from its knuckle: the knuckle turns it sideways (spread) and bends it; the middle joint and
   the end joint only bend, and the end joint cannot bend far while the middle one is straight. The thumb is
   its own chain from the palm's base. Every joint has its range; the bones have thickness and cannot pass through the
   neck or through one another.
   Placing the hand is one problem: find the palm's place and turn and every joint's angle so the fingertips reach their
   places, the thumb rests on the back of the neck, and the hand is as easy as it can be (joints near their middle). What
   the bones cannot reach, they do not reach: the tip stops short, and reachErr says by how much.
   World: x along the neck from the nut (toward the body), y across it from the high e (toward the low E), z up out of the
   fretboard's face. The hand is a left hand. */
function makeHand(G){
  const D2R=Math.PI/180;
  // bones: proximal, middle, distal phalanx (mm), and the finger's half-thickness along each
  const LEN=[[41,24,19],[46,28,20],[43,27,20],[34,20,18]];
  const RAD=[[9.5,8.5,7.6],[10,9,8],[9.5,8.6,7.7],[8.4,7.6,6.9]];
  // the knuckles on the palm (radial, distal, palmar) from the middle finger's: a rigid row, the little finger's set back
  // and the row arched a little toward the palm at its ends
  const MCP=[[21,-3,2.5],[0,0,0],[-19,-4,2],[-36,-13,5]];
  const SPLAY=[7,0,-6,-13].map(d=>d*D2R);                       // each finger's ray in the palm, straight out
  const THK=0.8;                                                  // a finger is flatter than it is wide: its thickness, front to back
  const DIPK=0.38;                                               // the end joint's share of the middle's bend, aiming a finger
  // thumb: its base on the palm, its metacarpal, the two phalanges
  const TB=[25,-55,13], TLEN=[46,32,27], TRAD=[12,10,9];
  // ranges: spread at the knuckle, bend at the knuckle, bend at the middle joint; thumb base (two ways), its two joints
  const LO=[], HI=[];
  const set=(i,a,b)=>{ LO[i]=a; HI[i]=b; };
  for(let i=0;i<3;i++){ set(i,-1e4,1e4); set(3+i,-1.4,1.4); }
  const SPR=[[-22,24],[-17,17],[-17,17],[-26,18]];
  for(let k=0;k<4;k++){ set(6+4*k,SPR[k][0]*D2R,SPR[k][1]*D2R); set(7+4*k,-25*D2R,92*D2R); set(8+4*k,0,112*D2R); set(9+4*k,-8*D2R,85*D2R); }
  set(22,-0.75,0.75); set(23,-0.75,0.75); set(24,-12*D2R,65*D2R); set(25,-25*D2R,85*D2R);
  const NQ=26;
  // the palm's resting turn: fingers pointing out of the board, the palm facing across the neck toward the low E
  const nrm=v=>{ const l=Math.hypot(v[0],v[1],v[2])||1; return [v[0]/l,v[1]/l,v[2]/l]; };
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const add=(a,b,s)=>[a[0]+b[0]*s,a[1]+b[1]*s,a[2]+b[2]*s];
  const U0=nrm([0,0.22,1]), P0=nrm(cross(cross(U0,[0,1,0]),U0)), R0=cross(U0,P0);
  function rot(w,v){ const th=Math.hypot(w[0],w[1],w[2]); if(th<1e-12) return v.slice(); const k=[w[0]/th,w[1]/th,w[2]/th], c=Math.cos(th), s=Math.sin(th), kv=cross(k,v), kd=dot(k,v);
    return [v[0]*c+kv[0]*s+k[0]*kd*(1-c), v[1]*c+kv[1]*s+k[1]*kd*(1-c), v[2]*c+kv[2]*s+k[2]*kd*(1-c)]; }
  // a fretting hand's ease: the knuckle a little bent, the middle joint well bent, the end joint held firmer
  const NEUT=[]; for(let k=0;k<4;k++){ NEUT[6+4*k]=0; NEUT[7+4*k]=25*D2R; NEUT[8+4*k]=90*D2R; NEUT[9+4*k]=30*D2R; } NEUT[22]=0; NEUT[23]=0; NEUT[24]=15*D2R; NEUT[25]=15*D2R;

  // forward: the whole skeleton from the parameters
  function fk(q){
    const w=[q[3],q[4],q[5]], r=rot(w,R0), u=rot(w,U0), p=rot(w,P0), t=[q[0],q[1],q[2]];
    const at=c=>add(add(add(t,r,c[0]),u,c[1]),p,c[2]);
    const F=[];
    for(let k=0;k<4;k++){
      const g=SPLAY[k]+q[6+4*k], f1=q[7+4*k], f2=q[8+4*k], f3=q[9+4*k], d=add([0,0,0],u,Math.cos(g)).map((v,j)=>v+r[j]*Math.sin(g));
      const dir=T=>{ const c=Math.cos(T), s=Math.sin(T); return [d[0]*c+p[0]*s, d[1]*c+p[1]*s, d[2]*c+p[2]*s]; };
      const T1=f1, T2=f1+f2, T3=T2+f3, L=LEN[k], c3=Math.cos(T3), s3=Math.sin(T3), d3=[d[0]*c3+p[0]*s3, d[1]*c3+p[1]*s3, d[2]*c3+p[2]*s3], pl3=[-d[0]*s3+p[0]*c3, -d[1]*s3+p[1]*c3, -d[2]*s3+p[2]*c3];
      const mcp=at(MCP[k]), pip=add(mcp,dir(T1),L[0]), dip=add(pip,dir(T2),L[1]), end=add(dip,d3,L[2]);
      // what touches is the fingertip's lowest flesh: its end when it points down at the board, the pad further back as it flattens
      const pt=d3[2]<0?end:add(dip,d3,L[2]*0.55), pad=[pt[0],pt[1],pt[2]-RAD[k][2]*THK];
      F.push({mcp,pip,dip,end,pad,j:[mcp,pip,dip,end],back:[-pl3[0],-pl3[1],-pl3[2]],dir3:d3,pal3:pl3}); }
    // the thumb: its metacarpal out from the base, then its two joints bending it toward the fingers
    const b=at(TB), m0=nrm(add(add(add([0,0,0],r,0.25),u,0.45),p,0.85)), e1=nrm(add(r,m0,-dot(r,m0)));
    const c00=nrm(add(add(u,r,-0.3),m0,-dot(add(u,r,-0.3),m0))), m=nrm(add(add(m0,e1,q[22]),c00,q[23]));
    const c=nrm(add(c00,m,-dot(c00,m)));
    const tdir=T=>[m[0]*Math.cos(T)+c[0]*Math.sin(T), m[1]*Math.cos(T)+c[1]*Math.sin(T), m[2]*Math.cos(T)+c[2]*Math.sin(T)];
    const tpal=T=>[-m[0]*Math.sin(T)+c[0]*Math.cos(T), -m[1]*Math.sin(T)+c[1]*Math.cos(T), -m[2]*Math.sin(T)+c[2]*Math.cos(T)];
    const tm=add(b,m,TLEN[0]), ti=add(tm,tdir(q[24]),TLEN[1]), S=q[24]+q[25], te=add(ti,tdir(S),TLEN[2]), tpad=add(add(ti,tdir(S),TLEN[2]*0.62),tpal(S),TRAD[2]*0.9);
    const Th={cmc:b,mcp:tm,ip:ti,end:te,pad:tpad,j:[b,tm,ti,te],back:tpal(S).map(v=>-v)};
    // the palm's outline points: the knuckles, the heel under the little finger, the wrist, the thumb's base
    const palm=[at([24,6,0]),at(MCP[0]),at(MCP[1]),at(MCP[2]),at(MCP[3]),at([-44,-20,6]),at([-30,-68,10]),at([-6,-78,10]),at([18,-72,10]),b];
    const wrist=at([-6,-78,4]);
    return {F,Th,palm,wrist,axes:{r,u,p},t};
  }

  // the neck in section at x: the fretboard's face (z = 0) between its edges, the back a half ellipse depth D below
  function neckSD(P){
    const x=P[0], yf=G.yFar(x), yn=G.yNear(x), hw=(yn-yf)/2, yc=(yn+yf)/2, Dp=G.depth(x), dy=P[1]-yc, z=P[2];
    if(z>=0) return Math.abs(dy)<=hw?z:Math.hypot(Math.abs(dy)-hw,z);
    const a=dy/hw, bb=z/Dp, rho=Math.hypot(a,bb), gr=Math.hypot(a/hw,bb/Dp)/(rho||1);
    if(Math.abs(dy)>hw&&z>-2) return Math.max(Math.abs(dy)-hw,(rho-1)/(gr||1));
    return (rho-1)/(gr||1);
  }
  function segDist(a,b,c,d){                                     // nearest distance between segments ab and cd
    const u=add(b,a,-1), v=add(d,c,-1), w=add(a,c,-1), A=dot(u,u), B=dot(u,v), C=dot(v,v), D=dot(u,w), E=dot(v,w), den=A*C-B*B;
    let s=den>1e-9?(B*E-C*D)/den:0; s=Math.max(0,Math.min(1,s)); let t=C>1e-9?(B*s+E)/C:0;
    if(t<0){ t=0; s=A>1e-9?Math.max(0,Math.min(1,-D/A)):0; } else if(t>1){ t=1; s=A>1e-9?Math.max(0,Math.min(1,(B-D)/A)):0; }
    const pa=add(a,u,s), pc=add(c,v,t); return Math.hypot(pa[0]-pc[0],pa[1]-pc[1],pa[2]-pc[2]); }
  const lerp=(a,b,s)=>[a[0]+(b[0]-a[0])*s,a[1]+(b[1]-a[1])*s,a[2]+(b[2]-a[2])*s];

  const PAIRS=[[0,0],[1,1],[2,2],[1,2],[2,1]];
  // what the hand is asked: for each finger {p:[x,y,z] (its pad's place), press, barre:{x,y0,y1}?} and the thumb's place
  let TG=null;
  function resid(q,out){
    const S=fk(q); let n=0; const put=v=>{ out[n++]=v; };
    const pen=(v,w)=>put(v>0?v*w:0);
    for(let k=0;k<4;k++){ const g=TG.f[k], Fk=S.F[k];
      if(g.barre){ const B=g.barre, z=RAD[k][1];            // a barre: the finger laid straight along its fret, across the strings it holds
        put((Fk.pad[0]-B.x)*1.2); put((Fk.pad[1]-B.y1)*1.0); put((Fk.pad[2]-0.5)*1.2);
        put((Fk.dip[0]-B.x)*1.0); put((Fk.dip[2]-z)*1.0); put((Fk.pip[0]-B.x)*0.8); put((Fk.pip[2]-z-1)*0.8); put(Math.max(0,Fk.pip[1]-B.y0)*0.8); }
      else if(g.press&&g.cell){ const C=g.cell, x=Fk.pad[0];   // pressing: anywhere in its fret's cell sounds the note, nearer the wire is cleaner
        put(x<C[0]?(C[0]-x)*1.4:(x>C[1]?(x-C[1])*1.4:0)); put((x-C[1])*0.12); put(Math.abs(Fk.pad[1]-g.p[1])>1.2?(Fk.pad[1]-g.p[1]-Math.sign(Fk.pad[1]-g.p[1])*1.2)*1.4:0); put((Fk.pad[2]-g.p[2])*1.4); for(let j=0;j<4;j++) put(0); }
      else { const w=g.press?1.4:0.35; put((Fk.pad[0]-g.p[0])*w); put((Fk.pad[1]-g.p[1])*w); put((Fk.pad[2]-g.p[2])*w); for(let j=0;j<5;j++) put(0); }
      // the bones keep out of the neck (the pressing pad only touches it)
      for(let s=0;s<3;s++) for(const tt of [0.15,0.6,1]){ const pt=lerp(Fk.j[s],Fk.j[s+1],tt), need=RAD[k][s]*THK*(s===2&&(g.press||g.barre)?0.9:1);
        pen(need-neckSD(pt),4); }
      if(g.press||g.barre) pen(Fk.pal3[2]-0.25,20); }
    // fingers side by side, never through one another
    for(let k=0;k<3;k++) for(const [s,s2] of PAIRS){
      const A=S.F[k].j, B=S.F[k+1].j; pen(RAD[k][s]+RAD[k+1][s2]-2.5-segDist(A[s],A[s+1],B[s2],B[s2+1]),3); }
    // the thumb on the back of the neck
    put((S.Th.pad[0]-TG.th[0])*TG.thw); put((S.Th.pad[1]-TG.th[1])*TG.thw); put((S.Th.pad[2]-TG.th[2])*TG.thw);
    for(let s=0;s<3;s++) for(const tt of [0.3,0.8]){ if(s===2&&tt===0.8) continue; pen(TRAD[s]-neckSD(lerp(S.Th.j[s],S.Th.j[s+1],tt)),4); }
    // the palm clear of the neck
    for(const pt of S.palm) pen(9-neckSD(pt),3);
    pen(11-neckSD(lerp(S.palm[2],S.wrist,0.45)),3);
    // spreads in order (no crossing at the knuckles), and the ring finger tied to its neighbours' bend
    for(let k=0;k<3;k++) pen((SPLAY[k+1]+q[10+4*k])-(SPLAY[k]+q[6+4*k])+1*D2R,25);
    pen(Math.abs(q[15]-q[11])-50*D2R,12); pen(Math.abs(q[15]-q[19])-40*D2R,12);
    for(let k=0;k<4;k++) pen(q[9+4*k]-(0.9*q[8+4*k]+12*D2R),12);   // the end joint does not bend far past the middle one
    // ease: every joint near its middle, the palm near its resting turn
    for(let i=6;i<NQ;i++) put((q[i]-NEUT[i])*3);
    const u=S.axes.u, p=S.axes.p; put((u[0]-U0[0])*10); put((u[1]-U0[1])*10); put((u[2]-U0[2])*10); put((p[0]-P0[0])*10); put((p[1]-P0[1])*10); put((p[2]-P0[2])*10);
    return n;
  }
  const clamp=q=>{ for(let i=0;i<NQ;i++) q[i]=Math.max(LO[i],Math.min(HI[i],q[i])); return q; };
  let q=null, buf=new Float64Array(400), buf2=new Float64Array(400);
  function cost(qq){ const n=resid(qq,buf2); let s=0; for(let i=0;i<n;i++) s+=buf2[i]*buf2[i]; return s; }
  function initQ(){
    const xs=TG.f.map(g=>g.barre?g.barre.x:g.p[0]), x0=(xs[0]+xs[1]+xs[2]+xs[3])/4;
    const z=new Array(NQ).fill(0); z[0]=x0; z[1]=G.yFar(x0)-17; z[2]=-9; for(let i=6;i<NQ;i++) z[i]=NEUT[i]; return z; }
  // Levenberg–Marquardt from where the hand was
  // one finger straight to its place, given the palm: its spread is the place's direction across the palm, its middle
  // joint's bend is fixed by how far the place is from the knuckle (the end joint following), its knuckle's bend aims it
  function padAt(k,f1,f2){ const T3=f1+f2+DIPK*f2, L=LEN[k], c=RAD[k][2]*THK;
    return [L[0]*Math.cos(f1)+L[1]*Math.cos(f1+f2)+0.7*L[2]*Math.cos(T3)-c*Math.sin(T3), L[0]*Math.sin(f1)+L[1]*Math.sin(f1+f2)+0.7*L[2]*Math.sin(T3)+c*Math.cos(T3)]; }
  const REACH=[0,1,2,3].map(k=>Array.from({length:129},(_,i)=>{ const P=padAt(k,0,i/128*HI[8+4*k]); return Math.hypot(P[0],P[1]); }));   // how far each bend of the middle joint reaches
  function aim(qq,k,T){
    const w=[qq[3],qq[4],qq[5]], r=rot(w,R0), u=rot(w,U0), p=rot(w,P0), m=MCP[k];
    const B=[qq[0]+r[0]*m[0]+u[0]*m[1]+p[0]*m[2], qq[1]+r[1]*m[0]+u[1]*m[1]+p[1]*m[2], qq[2]+r[2]*m[0]+u[2]*m[1]+p[2]*m[2]];
    const V=[T[0]-B[0],T[1]-B[1],T[2]-B[2]], tu=dot(V,u), tr=dot(V,r), tp=dot(V,p);
    let g=Math.atan2(tr,tu), rho=Math.hypot(tu,tr); if(tu<0){ g=Math.atan2(-tr,-tu); rho=-rho; }
    const a=Math.max(LO[6+4*k],Math.min(HI[6+4*k],g-SPLAY[k])); const dist=Math.hypot(rho,tp);
    const tb=REACH[k], NT=tb.length-1; let f2;
    if(dist>=tb[0]) f2=0; else if(dist<=tb[NT]) f2=HI[8+4*k]; else { let lo=0, hi=NT; while(hi-lo>1){ const mid=(lo+hi)>>1; if(tb[mid]>dist) lo=mid; else hi=mid; } f2=(lo+(tb[lo]-dist)/(tb[lo]-tb[hi]))/NT*HI[8+4*k]; }
    const P=padAt(k,0,f2), f1=Math.atan2(tp,rho)-Math.atan2(P[1],P[0]);
    qq[6+4*k]=a; qq[7+4*k]=Math.max(LO[7+4*k],Math.min(HI[7+4*k],f1)); qq[8+4*k]=f2; qq[9+4*k]=Math.min(HI[9+4*k],DIPK*f2); }
  function aimAll(qq){ for(let k=0;k<4;k++){ const g=TG.f[k]; let T;
      if(g.barre) T=[g.barre.x,g.barre.y1,0.5]; else if(g.press&&g.cell) T=[g.cell[1]-0.3*(g.cell[1]-g.cell[0]),g.p[1],g.p[2]]; else T=g.p;
      aim(qq,k,T); } }
  // Levenberg–Marquardt over some of the parameters (pre: a step run on the hand before it is scored)
  function lm(idx,iters,pre){
    const NP=idx.length, ev=(qq,out)=>{ if(pre){ qq=qq.slice(); pre(qq); } return resid(qq,out); };
    const n=ev(q,buf); let c0=0; for(let i=0;i<n;i++) c0+=buf[i]*buf[i];
    const J=new Float64Array(n*NP), rr=new Float64Array(n); let lam=0.3;
    for(let it=0;it<iters;it++){
      ev(q,buf); for(let i=0;i<n;i++) rr[i]=buf[i];
      for(let jj=0;jj<NP;jj++){ const j=idx[jj], h=j<3?0.05:1e-3, s=q[j]; q[j]=s+h; ev(q,buf); q[j]=s; for(let i=0;i<n;i++) J[i*NP+jj]=(buf[i]-rr[i])/h; }
      const A=new Float64Array(NP*NP), g=new Float64Array(NP);
      for(let i=0;i<n;i++){ const ri=rr[i]; for(let a=0;a<NP;a++){ const ja=J[i*NP+a]; if(!ja) continue; g[a]+=ja*ri; for(let b=a;b<NP;b++) A[a*NP+b]+=ja*J[i*NP+b]; } }
      for(let a=0;a<NP;a++) for(let b=0;b<a;b++) A[a*NP+b]=A[b*NP+a];
      let improved=false;
      for(let tries=0;tries<6&&!improved;tries++){
        const M=A.slice(), v=Array.from(g,x=>-x);
        for(let a=0;a<NP;a++) M[a*NP+a]+=lam*(A[a*NP+a]+1e-3)+1e-6;
        const d=gauss(M,v,NP); let sc=1; for(let a=0;a<NP;a++){ const lim=idx[a]<3?8:0.25; if(Math.abs(d[a])*sc>lim) sc=lim/Math.abs(d[a]); }   // small steps: the hand moves, it does not jump
        const qn=q.slice(); idx.forEach((j,a)=>{ qn[j]+=d[a]*sc; }); clamp(qn);
        const nn=ev(qn,buf2); let cn=0; for(let i=0;i<nn;i++) cn+=buf2[i]*buf2[i];
        if(cn<c0){ q=qn; c0=cn; lam=Math.max(1e-5,lam*0.35); improved=true; } else lam*=5; }
      if(!improved||c0<1e-6) break; }
    if(pre) pre(q);
    return c0; }
  const ALL=[...Array(NQ).keys()], PALM=[0,1,2,3,4,5,22,23,24,25];
  // from scratch: the palm (and thumb) found with every finger aimed straight at its place, from a few starting hands
  // (along the neck, turned toward the nut or the body); the best carried on, then everything settled together
  function solveFresh(targets,iters){
    TG=targets; const base=initQ(); let best=null, bc=1e99;
    for(const dx of [0,-15,15]) for(const tw of [0,-0.3,0.3]){ q=base.slice(); q[0]+=dx; q[4]=tw; const c=lm(PALM,18,aimAll); if(c<bc){ bc=c; best=q.slice(); } }
    q=best; lm(PALM,30,aimAll); return lm(ALL,iters||40); }
  // from where the hand was
  function solve(targets,iters){ TG=targets; if(!q) return solveFresh(targets); return lm(ALL,iters); }
  function gauss(M,v,N){
    for(let c=0;c<N;c++){ let piv=c; for(let r=c+1;r<N;r++) if(Math.abs(M[r*N+c])>Math.abs(M[piv*N+c])) piv=r;
      if(piv!==c){ for(let k=0;k<N;k++){ const t=M[c*N+k]; M[c*N+k]=M[piv*N+k]; M[piv*N+k]=t; } const t=v[c]; v[c]=v[piv]; v[piv]=t; }
      const d=M[c*N+c]||1e-12; for(let r=c+1;r<N;r++){ const f=M[r*N+c]/d; if(!f) continue; for(let k=c;k<N;k++) M[r*N+k]-=f*M[c*N+k]; v[r]-=f*v[c]; } }
    const x=new Array(N).fill(0); for(let r=N-1;r>=0;r--){ let s=v[r]; for(let k=r+1;k<N;k++) s-=M[r*N+k]*x[k]; x[r]=s/(M[r*N+r]||1e-12); } return x; }
  // how far each pressing finger stops short of its place (mm)
  function errs(){ const S=fk(q); return TG.f.map((g,k)=>{ const P=S.F[k].pad; if(g.barre) return Math.hypot(P[0]-g.barre.x,P[1]-g.barre.y1,P[2]-0.5);
    if(g.press&&g.cell){ const dx=P[0]<g.cell[0]?g.cell[0]-P[0]:Math.max(0,P[0]-g.cell[1]), dy=Math.max(0,Math.abs(P[1]-g.p[1])-1.2); return Math.hypot(dx,dy,P[2]-g.p[2]); }
    return Math.hypot(P[0]-g.p[0],P[1]-g.p[1],P[2]-g.p[2]); }); }
  return {solve, solveFresh, errs, pose:()=>fk(q), reset:()=>{ q=null; }, get q(){ return q&&q.slice(); }, set q(v){ q=v&&v.slice(); }, neckSD, RAD, TRAD, LEN, D2R};
}
