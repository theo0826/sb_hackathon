/* Supplied GSAP 3.12.2 timeline. build() preserved verbatim. */
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unused-expressions -- Preserve the supplied timeline verbatim. */
export function initializeOnboarding(root, gsap){
  var FULL='흰색 맨투맨에 네이비 포인트 넣어서 만들어줘';
  var $=function(id){return root.querySelector('#'+id);};
  var stage=$('stage'),ptext=$('ptext'),send=$('send'),prompt=$('prompt'),garment=$('garment'),vid=$('gVid'),orbit=$('orbit'),
      cursor=$('cursor'),sheet=$('sheet'),dChk=$('doneChk'),dEnd=$('doneEnd'),lgN=$('lgNavy'),lgL=$('lgLime'),lgW=$('lgWord'),lgT=$('lgLine'),pauseBtn=$('pause');
  var LN=lgN.getTotalLength(), LL=lgL.getTotalLength();
  var pieces=Array.prototype.slice.call(root.querySelectorAll('.piece'));
  var thumbs=Array.prototype.slice.call(root.querySelectorAll('#thumbs img'));
  var tl=null, paused=false, SPEED=1;
  function typed(n){
    if(n<=0){ptext.innerHTML='<span class="ph">만들고 싶은 단체복을 말해주세요</span>';return;}
    ptext.textContent=FULL.slice(0,n); var c=document.createElement('span'); c.className='caret'; ptext.appendChild(c);
  }
  function center(el){var s=stage.getBoundingClientRect(),r=el.getBoundingClientRect();return {x:r.left-s.left+r.width*.55,y:r.top-s.top+r.height*.55};}
  function toCenter(el,W,H,cy){return {x:W*.5-(el.offsetLeft+el.offsetWidth/2), y:H*cy-(el.offsetTop+el.offsetHeight/2)};}
  function build(){
    if(tl) tl.kill();
    var W=stage.clientWidth,H=stage.clientHeight,narrow=W<560;
    var startW=narrow?.8:.56, endW=narrow?.5:.4, endL=narrow?.04:.05, endT='50%';
    gsap.set(prompt,{width:W*startW,left:'50%',top:'50%',xPercent:-50,yPercent:-50,opacity:1});
    gsap.set(sheet,{xPercent:-50,yPercent:-50});
    typed(FULL.length); var pSend=center(send);
    tl=gsap.timeline({repeat:-1,repeatDelay:.5,defaults:{ease:'power2.inOut'}}); tl.timeScale(SPEED);
    tl.call(function(){typed(0);gsap.set(send,{background:'#ECEEF2'});},null,0)
      .set(prompt,{width:W*startW,left:'50%',top:'50%',xPercent:-50,yPercent:-50,scale:1,transformOrigin:'0% 50%',opacity:1},0)
      .set([garment,orbit,sheet,dChk].concat(pieces,thumbs),{opacity:0},0).set(dEnd,{opacity:0},0).set(lgN,{strokeDasharray:LN,strokeDashoffset:LN,opacity:0},0).set(lgL,{strokeDasharray:LL,strokeDashoffset:LL,opacity:0},0).set([lgW,lgT],{opacity:0,y:6},0)
      .set(garment,{scale:.92,x:24},0)
      .set(sheet,{scale:.94},0)
      .set(cursor,{x:W*.7,y:H*.88,opacity:0,scale:1},0);
    var o={n:0};
    tl.to(o,{n:FULL.length,duration:1.6,ease:'none',onUpdate:function(){typed(Math.round(o.n));}},.3)
      .to(cursor,{opacity:1,duration:.25},1.3)
      .to(cursor,{x:pSend.x,y:pSend.y,duration:.7},1.4)
      .set(send,{background:'#041E41'},1.9)
      .to(cursor,{scale:.82,duration:.09,yoyo:true,repeat:1,ease:'none'},2.2)
      .to(send,{scale:.86,duration:.09,yoyo:true,repeat:1,ease:'none'},2.2)
      // prompt moves left, garment enters on the right
      .to(prompt,{left:W*endL,top:endT,xPercent:0,scale:endW/startW,duration:.9,ease:'power3.inOut'},2.45)
      .to(cursor,{x:W*.64,y:H*.42,duration:.85},2.45)
      .call(function(){try{vid.currentTime=0;vid.playbackRate=SPEED;var pr=vid.play();if(pr&&pr.catch)pr.catch(function(){});}catch(e){}},null,2.7)
      .to(garment,{opacity:1,duration:.6},2.75)
      .to(garment,{scale:1,x:0,duration:.9,ease:'power3.out'},2.75)
      .to(orbit,{opacity:1,duration:.4},3.4)
      // look around
      .to(cursor,{x:W*.69,duration:1.1,ease:'sine.inOut'},3.1)
      .to(cursor,{x:W*.6,duration:1.6,ease:'sine.inOut'},4.2)
      .to(cursor,{opacity:0,duration:.3},5.6)
      // spread into pattern pieces
      .to([garment,orbit,prompt],{opacity:0,duration:.4},6.0)
      .fromTo(pieces,{opacity:0,scale:.3,x:function(i,el){return toCenter(el,W,H,.45).x;},y:function(i,el){return toCenter(el,W,H,.45).y;}},
                     {opacity:1,scale:1,x:0,y:0,rotation:0,duration:.8,stagger:.06,ease:'power3.out'},6.1)
      // pieces gather into one stacked pattern in the centre (front on top, sleeves fanned, rib at the neck)
      .call(function(){[1,3,4,0,2].forEach(function(k,z){pieces[k].style.zIndex=3+z;});},null,7.2)
      .to(pieces,{x:function(i,el){var t=[[0,0],[0,.01],[0,-.155],[-.105,.03],[.105,.03]][i];return W*(.5+t[0])-(el.offsetLeft+el.offsetWidth/2);},
                  y:function(i,el){var t=[[0,0],[0,.01],[0,-.155],[-.105,.03],[.105,.03]][i];return H*(.36+t[1])-(el.offsetTop+el.offsetHeight/2);},
                  scale:function(i){return [.78,.78,.62,.8,.8][i];},rotation:function(i){return [0,0,0,-20,20][i];},
                  duration:1,stagger:.05,ease:'power3.inOut'},7.3)
      .set(lgN,{opacity:1},8.2)
      .to(lgN,{strokeDashoffset:0,duration:1.5,ease:'sine.inOut'},8.2)
      .set(lgL,{opacity:1},9.45)
      .to(lgL,{strokeDashoffset:0,duration:.7,ease:'sine.out'},9.45)
      .fromTo(lgW,{opacity:0,y:10},{opacity:1,y:0,duration:.8,ease:'power2.out'},10.3)
      .fromTo(lgT,{opacity:0,y:10},{opacity:1,y:0,duration:.8,ease:'power2.out'},10.6)
      .to(pieces.concat([lgN,lgL,lgW,lgT]),{opacity:0,duration:.6,ease:'power1.inOut'},12.6)

  }
  function finalFrame(){
    if(tl) tl.kill();
    gsap.set(pieces.concat([garment,orbit,prompt,cursor]),{opacity:0});
    gsap.set(sheet,{opacity:1,xPercent:-50,yPercent:-50,scale:1}); gsap.set(thumbs,{opacity:1});
    gsap.set([sheet,dChk],{opacity:0}); gsap.set([lgN,lgL],{strokeDashoffset:0,opacity:1}); gsap.set([lgW,lgT],{opacity:1});
  }
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function start(){ if(!window.gsap) return; if(reduce){finalFrame();pauseBtn.hidden=true;} else build(); }
  function togglePause(){
    paused=!paused; pauseBtn.setAttribute('aria-pressed',String(paused));
    pauseBtn.querySelector('span').textContent=paused?'모션 다시 보기':'모션 멈추기';
    if(tl){ paused?tl.pause():tl.play(); } else if(!paused) build();
    if(paused) vid.pause();
    else if(tl && tl.time()>=2.7 && tl.time()<6) vid.play().catch(function(){});
  }
  pauseBtn.addEventListener('click',togglePause);
  var rt; function resize(){clearTimeout(rt);rt=setTimeout(function(){if(!reduce){build(); if(paused) tl.pause();}},250);} window.addEventListener('resize',resize);
  start();
  return function(){ clearTimeout(rt); if(tl) tl.kill(); vid.pause(); window.removeEventListener('resize',resize); pauseBtn.removeEventListener('click',togglePause); };
}
