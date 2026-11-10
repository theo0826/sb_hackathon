// GSAP timeline supplied by the design team for the November 10 onboarding.
export function initializeOnboarding(root, gsap) {
  var FULL='흰색 맨투맨에 네이비 포인트 넣어서 만들어줘';
  var CAPS=['원하는 옷을 말로 설명해요','AI가 바로 디자인해줘요','공장에서 쓰는 도안으로 바뀌어요','성북 공장이 원단으로 만들어요','완성된 옷이 집으로 와요'];
  var $=function(id){return root.querySelector('#'+id);};
  var stage=$('stage'),ptext=$('ptext'),send=$('send'),prompt=$('prompt'),garment=$('garment'),vid=$('gVid'),orbit=$('orbit'),
      cursor=$('cursor'),dig=$('dig'),real=$('real'),rin=$('rin'),rbg=$('rbg'),tbl=$('tbl'),scan=$('scan'),
      pk=$('pk'),doorBg=$('doorBg'),bxw=$('bxw'),bxOpen=$('bxOpen'),bxFold=$('bxFold'),bxClosed=$('bxClosed'),cam=$('cam'),endBg=$('endBg'),endLogo=$('endLogo'),endTx=$('endT'),endDx=$('endD'),
      capN=$('capN'),capT=$('capT'),pauseBtn=$('pause');
  var all=function(s){return Array.prototype.slice.call(root.querySelectorAll(s));};
  var dots=all('#capDots i'), dps=all('.dp'), rcs=all('.rc'), sbxs=all('.sbx');
  var tl=null, captionTween=null, paused=false, SPEED=1, cur=0;

  function step(n){
    if(n===cur) return; cur=n;
    capN.textContent=n; capT.textContent=CAPS[n-1];
    dots.forEach(function(d,i){d.classList.toggle('on',i===n-1);});
    captionTween?.kill();
    captionTween=gsap.fromTo(capT,{opacity:0,y:6},{opacity:1,y:0,duration:.35,ease:'power2.out'});
  }
  function typed(n){
    if(n<=0){ptext.innerHTML='<span class="ph">만들고 싶은 단체복을 말해주세요</span>';return;}
    ptext.textContent=FULL.slice(0,n); var c=document.createElement('span'); c.className='caret'; ptext.appendChild(c);
  }
  function center(el){var s=stage.getBoundingClientRect(),r=el.getBoundingClientRect();return {x:r.left-s.left+r.width*.55,y:r.top-s.top+r.height*.55};}
  function build(){
    if(tl) tl.kill();
    var W=stage.clientWidth,H=stage.clientHeight,narrow=W<560;
    // 재단대 사진(3:2) 영역을 무대 가운데에 맞춤
    var bw=(W/H>=1.5&&W/1.5-H<H*.12)?W:(H/(W/1.5)<=1.08?H*1.5:Math.min(W,H*1.5)), bh=bw/1.5, bl=(W-bw)/2, bt=(H-bh)/2;
    sbxs.forEach(function(s){s.style.left=bl+'px';s.style.top=bt+'px';s.style.width=bw+'px';s.style.height=bh+'px';});
    var startW=narrow?.8:.56, endW=narrow?.5:.4, endL=narrow?.04:.05, endT='50%';
    gsap.set(prompt,{width:W*startW,left:'50%',top:'50%',xPercent:-50,yPercent:-50,scale:1,opacity:1});
    typed(FULL.length); var pSend=center(send);
    // 상자 사진(1448x1086, cover) 좌표 → 무대 좌표
    var ps=Math.max(W/1448,H/1086), pox=(W-1448*ps)/2, poy=(H-1086*ps)/2;
    function P(x,y){return {x:pox+x*ps,y:poy+y*ps};}
    // 닫힌 상자를 열린 상자 몸통에 맞춤(아래 가운데 기준) → 같은 상자가 닫히는 것처럼
    var k1=1, cB=P(703,952), oB=P(703,952);
    var cA=P(703.5,664.0);
    var dC=P(733,783), opn=P(700,520);
    // 현관 상자 자리에 착지 (닫힌 상자 그대로 크기·위치만)
    var LS=0.7036, Lt=P(723.6,767.9), LX=Lt.x-cA.x, LY=Lt.y-cA.y;
    gsap.set(endLogo,{clearProps:'transform'});
    var bq=P(634,783), blx=Lt.x+LS*(bq.x-cA.x), bly=Lt.y+LS*(bq.y-cA.y);
    var sc=P(705,948); $('bsh').style.cssText='left:'+(sc.x-430*ps)+'px;top:'+(sc.y-40*ps)+'px;width:'+(860*ps)+'px;height:'+(80*ps)+'px';
    function toMid(el,cy){return {x:(W*.5-bl)-(el.offsetLeft+el.offsetWidth/2), y:(H*cy-bt)-(el.offsetTop+el.offsetHeight/2)};}
    tl=gsap.timeline({repeat:-1,repeatDelay:.4,defaults:{ease:'power2.inOut'}}); tl.timeScale(SPEED);
    tl.call(function(){typed(0);gsap.set(send,{background:'#ECEEF2'});step(1);},null,0.0)
      .set(prompt,{width:W*startW,left:'50%',top:'50%',xPercent:-50,yPercent:-50,scale:1,transformOrigin:'0% 50%',opacity:1},0.0)
      .set([garment,orbit,dig,real,scan,pk,doorBg,endBg,endLogo,endTx,endDx,bxOpen,bxFold,bxClosed].concat(dps,rcs),{opacity:0},0.0)
      .set(rbg,{opacity:1},0.0)
      .set(rcs,{x:0,y:0,scale:1,rotation:0},0.0)
      .set(bxClosed,{scale:k1,x:oB.x-cB.x,y:oB.y-cB.y,transformOrigin:cB.x+'px '+cB.y+'px'},0.0)
      .set(endLogo,{x:0,y:14,scale:1},0.0).set(cam,{x:0,y:0,scale:1,transformOrigin:blx+'px '+bly+'px'},0.0).set([endTx,endDx],{y:12},0.0)
      .set(bxw,{opacity:1,x:0,y:H*.75,scale:1,scaleY:1,transformOrigin:cA.x+'px '+cA.y+'px'},0.0)

      .set(doorBg,{scale:1.18,transformOrigin:dC.x+'px '+dC.y+'px'},0.0)
      .set(real,{x:-W},0.0).set(rin,{x:W},0.0).set(tbl,{opacity:1},0.0).set(scan,{x:0},0.0)
      .set(garment,{scale:.92,x:24,y:0},0.0)
      .set(cursor,{x:W*.7,y:H*.88,opacity:0,scale:1},0.0);
    var o={n:0};
    // ① 말로 주문
    tl.to(o,{n:FULL.length,duration:1.6,ease:'none',onUpdate:function(){typed(Math.round(o.n));}},.3)
      .to(cursor,{opacity:1,duration:.25},1.3)
      .to(cursor,{x:pSend.x,y:pSend.y,duration:.7},1.4)
      .set(send,{background:'#041E41'},1.9)
      .to(cursor,{scale:.82,duration:.09,yoyo:true,repeat:1,ease:'none'},2.2)
      .to(send,{scale:.86,duration:.09,yoyo:true,repeat:1,ease:'none'},2.2)
    // ② AI 디자인
      .call(function(){step(2);},null,2.45)
      .to(prompt,{left:W*endL,top:endT,xPercent:0,scale:endW/startW,duration:.9,ease:'power3.inOut'},2.45)
      .to(cursor,{x:W*.64,y:H*.42,duration:.85},2.45)
      .call(function(){vid.currentTime=0;vid.playbackRate=SPEED;vid.play().catch(()=>{});},null,2.7)
      .to(garment,{opacity:1,duration:.6},2.75)
      .to(garment,{scale:1,x:0,duration:.9,ease:'power3.out'},2.75)
      .to(orbit,{opacity:1,duration:.4},3.4)
      .to(cursor,{x:W*.69,duration:1.1,ease:'sine.inOut'},3.1)
      .to(cursor,{x:W*.6,duration:1.2,ease:'sine.inOut'},4.2)
      .to(cursor,{opacity:0,duration:.3},5.2)
    // ③ 디지털 도안이 펼쳐짐 (재단대와 같은 배치)
      .call(function(){step(3);},null,5.6)
      .to([garment,orbit,prompt],{opacity:0,duration:.5},5.6)
      .to(dig,{opacity:1,duration:.6,ease:'power1.out'},5.7)
      .fromTo(dps,{opacity:0,scale:.35,x:function(i,el){return toMid(el,.5).x;},y:function(i,el){return toMid(el,.5).y;}},
                  {opacity:1,scale:1,x:0,y:0,duration:1.1,stagger:.035,ease:'power3.out'},5.8)
    // ④ 같은 자리에서 실제 원단으로 (왼→오 스캔)
      .call(function(){step(4);},null,7.9)
      .set(real,{opacity:1},7.9).set(rcs,{opacity:1},7.9).set(scan,{opacity:1,x:0},7.9)
      .to(real,{x:0,duration:1.6,ease:'sine.inOut'},7.95)
      .to(rin,{x:0,duration:1.6,ease:'sine.inOut'},7.95)
      .to(scan,{x:W,duration:1.6,ease:'sine.inOut'},7.95)
      .to(scan,{opacity:0,duration:.25},9.4)
      .set(dig,{opacity:0},9.6)
    // ⑤ 하나의 장면으로: 빈 상자가 올라옴 → 원단이 상자 속으로 → 그 자리에 맨투맨 → 뚜껑 닫힘 → 같은 상자가 현관 앞으로
      .set(pk,{opacity:1},9.8)
      .to(tbl,{opacity:0,duration:.6,ease:'sine.inOut'},9.85)
      .to(rbg,{opacity:0,duration:.6,ease:'sine.inOut'},9.85)
      .set(bxOpen,{opacity:1},10.1)
      .to(bxw,{y:0,duration:.9,ease:'power3.out'},10.1)
      .call(function(){step(5);},null,10.7)
      .to(rcs,{x:function(i,el){return (opn.x-bl)-(el.offsetLeft+el.offsetWidth/2);},y:function(i,el){return (opn.y-bt)-(el.offsetTop+el.offsetHeight/2);},
               scale:.12,duration:1.0,stagger:.02,ease:'power2.inOut'},10.05)
      .to(bxFold,{opacity:1,duration:.5,ease:'sine.inOut'},10.75)
      .set(bxOpen,{opacity:0},11.3)
      .to(rcs,{opacity:0,duration:.3,ease:'sine.in'},10.85)
    // 뚜껑 닫힘
      .to(bxw,{scaleY:.965,duration:.1,yoyo:true,repeat:1,ease:'sine.inOut'},11.45)
      .to(bxFold,{opacity:0,duration:.18,ease:'none'},11.5)
      .to(bxClosed,{opacity:1,duration:.18,ease:'none'},11.47)

    // 같은 상자가 작아지며 현관 앞으로 (카메라가 뒤로 빠지는 느낌)
      .to(bxw,{x:LX,y:LY,scale:LS,duration:1.0,ease:'power2.inOut'},11.8)
      .to(doorBg,{opacity:1,scale:1,duration:1.0,ease:'power2.inOut'},11.85)
    // 도착 체크
    // 엔딩 카드: 여운 → 블러·밝은 오버레이 → 로고 → 슬로건 → 배송 완료 (시간차)
      .to(endBg,{opacity:1,duration:.9,ease:'sine.inOut'},13.25)
      .to(endLogo,{opacity:1,y:0,duration:.8,ease:'power2.out'},13.6)
      .to(endTx,{opacity:1,y:0,duration:.8,ease:'power2.out'},14.2)
      .to(endDx,{opacity:1,y:0,duration:.8,ease:'power2.out'},14.7)
      .to(pk,{opacity:0,duration:.7,ease:'power1.inOut'},17.8);
  }
  function finalFrame(){
    if(tl) tl.kill();
    gsap.set([garment,orbit,prompt,cursor,dig,real,scan],{opacity:0});
    gsap.set([pk,doorBg,endBg,endLogo,endTx,endDx],{opacity:1}); gsap.set(bxw,{opacity:0}); gsap.set([endLogo,endTx,endDx],{clearProps:'transform'});
    gsap.set(bxClosed,{opacity:1});
    capN.textContent='✓'; capT.textContent='말로 주문하면 성북 공장이 만들어 집으로 보내줘요';
    dots.forEach(function(d){d.classList.add('on');});
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let disposed = false;
  let resizeTimer;
  const images = all('#stage img');
  vid.muted = true;
  pauseBtn.hidden = reducedMotion;
  pauseBtn.setAttribute('aria-pressed', 'false');
  pauseBtn.querySelector('span').textContent = '모션 멈추기';
  Promise.allSettled(images.map(image => image.decode())).then(() => {
    if (disposed) return;
    if (reducedMotion) finalFrame();
    else {
      build();
      if (paused) tl.pause();
    }
  });

  function togglePause() {
    paused = !paused;
    pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseBtn.querySelector('span').textContent = paused ? '모션 다시 보기' : '모션 멈추기';
    tl?.paused(paused);
    captionTween?.paused(paused);
    if (paused) vid.pause();
    else if (tl && tl.time() >= 2.7 && tl.time() < 5.6) vid.play().catch(() => {});
  }

  function resize() {
    if (reducedMotion || !tl) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      vid.pause();
      const position = tl.time();
      cur = 0;
      build();
      tl.pause(position);
      if (position >= 2.7 && position < 5.6) {
        vid.currentTime = position - 2.7;
        if (!paused) vid.play().catch(() => {});
      }
      if (!paused) tl.play();
      captionTween?.paused(paused);
    }, 250);
  }

  pauseBtn.addEventListener('click', togglePause);
  window.addEventListener('resize', resize);
  return () => {
    disposed = true;
    clearTimeout(resizeTimer);
    tl?.kill();
    captionTween?.kill();
    vid.pause();
    window.removeEventListener('resize', resize);
    pauseBtn.removeEventListener('click', togglePause);
  };
}
