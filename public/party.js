// Celebration on open: rotates between confetti, balloons, fireworks, sparkles. Pure canvas, ~4 s.
(function(){
  const C=["#1E4D2B","#2E7A44","#5AA36F","#C8C372","#E0B34A","#FFFFFF"];
  const cv=document.createElement("canvas"); cv.id="party"; cv.style.cssText="position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:50"; document.body.appendChild(cv);
  const ctx=cv.getContext("2d"); let W,Hh; const fit=()=>{ W=cv.width=innerWidth*devicePixelRatio; Hh=cv.height=innerHeight*devicePixelRatio; ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); }; fit(); addEventListener("resize",fit);
  const rnd=(a,b)=>a+Math.random()*(b-a); const pick=a=>a[Math.floor(Math.random()*a.length)];
  let parts=[], t0=0, mode="", raf=0, dur=4200;

  const modes={
    confetti(){ for(let i=0;i<220;i++) parts.push({x:innerWidth/2,y:innerHeight*0.35,vx:rnd(-9,9),vy:rnd(-16,-4),g:0.35,w:rnd(6,12),h:rnd(4,8),r:rnd(0,6.3),vr:rnd(-.2,.2),c:pick(C),life:1});
      return (p,dt)=>{ p.vy+=p.g; p.x+=p.vx; p.y+=p.vy; p.vx*=0.99; p.r+=p.vr; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r); ctx.fillStyle=p.c; ctx.globalAlpha=Math.min(1,(dur-dt)/800); ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore(); }; },
    balloons(){ for(let i=0;i<18;i++) parts.push({x:rnd(20,innerWidth-20),y:innerHeight+rnd(0,300),vy:rnd(-2.2,-1.2),sw:rnd(0,6.3),r:rnd(16,26),c:pick(C.slice(0,5))});
      return (p,dt)=>{ p.y+=p.vy; p.sw+=0.03; const x=p.x+Math.sin(p.sw)*12; ctx.globalAlpha=Math.min(1,(dur-dt)/600);
        ctx.strokeStyle="rgba(0,0,0,.35)"; ctx.beginPath(); ctx.moveTo(x,p.y+p.r); ctx.quadraticCurveTo(x+6,p.y+p.r+30,x-4,p.y+p.r+60); ctx.stroke();
        ctx.fillStyle=p.c; ctx.beginPath(); ctx.ellipse(x,p.y,p.r,p.r*1.2,0,0,6.3); ctx.fill(); ctx.fillStyle="rgba(255,255,255,.35)"; ctx.beginPath(); ctx.ellipse(x-p.r*.35,p.y-p.r*.4,p.r*.22,p.r*.35,-.5,0,6.3); ctx.fill();
        ctx.fillStyle=p.c; ctx.beginPath(); ctx.moveTo(x,p.y+p.r*1.2); ctx.lineTo(x-5,p.y+p.r*1.2+8); ctx.lineTo(x+5,p.y+p.r*1.2+8); ctx.fill(); }; },
    fireworks(){ const bursts=[]; const spawn=()=>{ const bx=rnd(innerWidth*.2,innerWidth*.8), by=rnd(innerHeight*.12,innerHeight*.4), c=pick(C.slice(1)); for(let i=0;i<70;i++){ const a=rnd(0,6.3), s=rnd(2,7); parts.push({x:bx,y:by,vx:Math.cos(a)*s,vy:Math.sin(a)*s,c,life:1,g:0.08}); } };
      spawn(); let n=1; const timer=setInterval(()=>{ if(n++>=5) clearInterval(timer); else spawn(); },600);
      return (p,dt)=>{ p.vy+=p.g; p.x+=p.vx; p.y+=p.vy; p.vx*=0.985; p.vy*=0.985; p.life-=0.014; if(p.life<=0) return; ctx.globalAlpha=Math.max(0,p.life); ctx.fillStyle=p.c; ctx.beginPath(); ctx.arc(p.x,p.y,2.4,0,6.3); ctx.fill(); }; },
    sparkles(){ for(let i=0;i<160;i++) parts.push({x:rnd(0,innerWidth),y:rnd(-innerHeight,0),vy:rnd(1.5,4),s:rnd(3,8),tw:rnd(0,6.3),c:pick(["#C8C372","#E0B34A","#FFFFFF","#5AA36F"])});
      return (p,dt)=>{ p.y+=p.vy; p.tw+=0.2; const k=(Math.sin(p.tw)+1)/2; ctx.globalAlpha=Math.min(1,(dur-dt)/700)*(0.4+0.6*k); ctx.fillStyle=p.c; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.tw/3); ctx.beginPath(); for(let i=0;i<4;i++){ ctx.lineTo(0,-p.s); ctx.lineTo(p.s*.3,-p.s*.3); ctx.rotate(Math.PI/2); } ctx.closePath(); ctx.fill(); ctx.restore(); }; }
  };
  function run(which){
    if(matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cancelAnimationFrame(raf); parts=[]; mode=which||pick(Object.keys(modes)); const draw=modes[mode](); t0=performance.now();
    const loop=()=>{ const dt=performance.now()-t0; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.globalAlpha=1; parts.forEach(p=>draw(p,dt)); if(dt<dur) raf=requestAnimationFrame(loop); else ctx.clearRect(0,0,innerWidth,innerHeight); };
    raf=requestAnimationFrame(loop);
  }
  window.party=run;
  addEventListener("load",()=>setTimeout(()=>run(),300));
})();
