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
      return (p,dt)=>{ p.y+=p.vy; p.tw+=0.2; const k=(Math.sin(p.tw)+1)/2; ctx.globalAlpha=Math.min(1,(dur-dt)/700)*(0.4+0.6*k); ctx.fillStyle=p.c; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.tw/3); ctx.beginPath(); for(let i=0;i<4;i++){ ctx.lineTo(0,-p.s); ctx.lineTo(p.s*.3,-p.s*.3); ctx.rotate(Math.PI/2); } ctx.closePath(); ctx.fill(); ctx.restore(); }; },
    hearts(){ for(let i=0;i<40;i++) parts.push({x:rnd(20,innerWidth-20),y:innerHeight+rnd(0,400),vy:rnd(-3,-1.5),sw:rnd(0,6.3),s:rnd(10,24),c:pick(["#C8C372","#E0B34A","#5AA36F","#2E7A44","#fff"])});
      return (p,dt)=>{ p.y+=p.vy; p.sw+=0.04; const x=p.x+Math.sin(p.sw)*14, s=p.s; ctx.globalAlpha=Math.min(1,(dur-dt)/600); ctx.fillStyle=p.c; ctx.beginPath(); ctx.moveTo(x,p.y+s*.6); ctx.bezierCurveTo(x-s,p.y-s*.2,x-s*.5,p.y-s,x,p.y-s*.3); ctx.bezierCurveTo(x+s*.5,p.y-s,x+s,p.y-s*.2,x,p.y+s*.6); ctx.fill(); }; },
    streamers(){ for(let i=0;i<40;i++) parts.push({x:rnd(0,innerWidth),y:rnd(-400,-20),vy:rnd(2,4.5),ph:rnd(0,6.3),len:rnd(60,140),c:pick(C.slice(1)),w:rnd(4,8)});
      return (p,dt)=>{ p.y+=p.vy; p.ph+=0.08; ctx.globalAlpha=Math.min(1,(dur-dt)/700); ctx.strokeStyle=p.c; ctx.lineWidth=p.w; ctx.lineCap="round"; ctx.beginPath(); for(let i=0;i<=12;i++){ const yy=p.y-i*(p.len/12), xx=p.x+Math.sin(p.ph+i*.6)*10; i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);} ctx.stroke(); }; },
    bubbles(){ for(let i=0;i<60;i++) parts.push({x:rnd(0,innerWidth),y:innerHeight+rnd(0,500),vy:rnd(-3,-1),r:rnd(8,30),sw:rnd(0,6.3),pop:rnd(0.55,0.95),done:false});
      return (p,dt)=>{ if(p.done) return; p.y+=p.vy; p.sw+=0.05; const x=p.x+Math.sin(p.sw)*8; if(dt/dur>p.pop&&Math.random()<0.02){ p.done=true; return; } ctx.globalAlpha=0.9; ctx.strokeStyle="rgba(200,195,114,.9)"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(x,p.y,p.r,0,6.3); ctx.stroke(); ctx.fillStyle="rgba(255,255,255,.15)"; ctx.fill(); ctx.fillStyle="rgba(255,255,255,.7)"; ctx.beginPath(); ctx.ellipse(x-p.r*.35,p.y-p.r*.35,p.r*.18,p.r*.3,-.6,0,6.3); ctx.fill(); }; },
    emojiRain(){ const E=["🍼","👶","🧸","🎈","🎀","🦆","🐑","⭐"]; for(let i=0;i<50;i++) parts.push({x:rnd(0,innerWidth),y:rnd(-innerHeight,-20),vy:rnd(2,5),e:pick(E),s:rnd(22,40),r:rnd(-.4,.4),vr:rnd(-.03,.03)});
      return (p,dt)=>{ p.y+=p.vy; p.r+=p.vr; ctx.globalAlpha=Math.min(1,(dur-dt)/600); ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r); ctx.font=`${p.s}px serif`; ctx.textAlign="center"; ctx.fillText(p.e,0,0); ctx.restore(); }; },
    photoPop(){ const img=photo(); parts.push({t:0}); // one big photo bouncing in, pulsing, then floating off
      return (p,dt)=>{ if(!img.complete||!img.naturalWidth) return; const k=dt/dur; const cx=innerWidth/2, cy=innerHeight*0.42;
        let sc = k<0.25 ? easeOutBack(k/0.25) : 1+Math.sin((k-0.25)*14)*0.08; let y=cy, a=1; if(k>0.8){ const q=(k-0.8)/0.2; y=cy-q*220; a=1-q; }
        const sz=Math.min(innerWidth,innerHeight)*0.36*sc; ctx.globalAlpha=Math.max(0,a); ctx.save(); ctx.translate(cx,y); ctx.rotate(Math.sin(k*10)*0.06); ctx.drawImage(img,-sz/2,-sz/2,sz,sz); ctx.restore(); }; },
    photoBounce(){ const img=photo(); for(let i=0;i<7;i++) parts.push({x:rnd(60,innerWidth-60),y:rnd(60,innerHeight-60),vx:rnd(-5,5)||3,vy:rnd(-5,5)||-3,s:rnd(64,120),r:rnd(0,6.3),vr:rnd(-.06,.06)});
      return (p,dt)=>{ if(!img.complete||!img.naturalWidth) return; p.x+=p.vx; p.y+=p.vy; p.r+=p.vr; const h=p.s/2; if(p.x<h||p.x>innerWidth-h) p.vx*=-1; if(p.y<h||p.y>innerHeight-h) p.vy*=-1; ctx.globalAlpha=Math.min(1,(dur-dt)/700); ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r); ctx.drawImage(img,-h,-h,p.s,p.s); ctx.restore(); }; }
  };
  function easeOutBack(x){ const c1=1.70158,c3=c1+1; return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2); }
  let _photo; function photo(){ if(_photo) return _photo; _photo=new Image(); _photo.src="/badge.png"; _photo.onerror=()=>{ _photo.src="/ram.svg"; }; return _photo; }
  // preload the photo so photo modes are ready on first open
  photo();
  function run(which){
    if(matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cancelAnimationFrame(raf); parts=[]; const last=localStorage.getItem("bp-party"); mode=which||pick(Object.keys(modes).filter(m=>m!==last)); localStorage.setItem("bp-party",mode); const draw=modes[mode](); t0=performance.now();
    const loop=()=>{ const dt=performance.now()-t0; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.globalAlpha=1; parts.forEach(p=>draw(p,dt)); if(dt<dur) raf=requestAnimationFrame(loop); else ctx.clearRect(0,0,innerWidth,innerHeight); };
    raf=requestAnimationFrame(loop);
  }
  window.party=run;
  addEventListener("load",()=>setTimeout(()=>run(),300));
})();
