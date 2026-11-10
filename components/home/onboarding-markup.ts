// Film markup from the supplied November 10 onboarding.
export const filmMarkup = String.raw`
  <div class="stage" id="stage" role="img" aria-label="원하는 옷을 말로 입력하면 AI가 맨투맨을 디자인하고, 공장용 도안으로 바뀐 뒤 성북 봉제공장에서 만들어 집으로 배송되는 과정">
    <svg class="orbit" id="orbit" viewBox="0 0 300 40" aria-hidden="true"><ellipse cx="150" cy="20" rx="140" ry="13" fill="none" stroke="#B3D214" stroke-width="1.6" stroke-dasharray="6 5"/><path d="M8 20 l7 -4.5 v9 z" fill="#B3D214"/><path d="M292 20 l-7 -4.5 v9 z" fill="#B3D214"/></svg>
    <div class="garment" id="garment"><video id="gVid" src="img/sweat_turn.mp4" muted playsinline preload="auto"></video></div>

    <!-- scene 3: 디지털 도안 (재단대 사진과 같은 배치) -->
    <div class="dig" id="dig">
      <div class="sbx"><div class="dsheet"></div>
        <img class="dp" src="img/dp0.webp" alt="" style="left:16.927%;top:11.328%;width:23.568%">
        <img class="dp" src="img/dp1.webp" alt="" style="left:41.081%;top:11.23%;width:23.438%">
        <img class="dp" src="img/dp2.webp" alt="" style="left:64.518%;top:12.109%;width:15.365%">
        <img class="dp" src="img/dp3.webp" alt="" style="left:80.404%;top:12.207%;width:14.909%">
        <img class="dp" src="img/dp4.webp" alt="" style="left:6.576%;top:17.188%;width:7.747%">
        <img class="dp" src="img/dp5.webp" alt="" style="left:6.706%;top:47.363%;width:4.753%">
        <img class="dp" src="img/dp6.webp" alt="" style="left:11.523%;top:47.461%;width:4.753%">
        <img class="dp" src="img/dp7.webp" alt="" style="left:34.18%;top:56.836%;width:22.005%">
        <img class="dp" src="img/dp8.webp" alt="" style="left:6.641%;top:57.422%;width:25.716%">
        <img class="dp" src="img/dp9.webp" alt="" style="left:58.203%;top:57.715%;width:16.992%">
        <img class="dp" src="img/dp10.webp" alt="" style="left:76.172%;top:57.715%;width:17.188%">
        <img class="dp" src="img/dp11.webp" alt="" style="left:13.477%;top:65.527%;width:20.898%">
        <img class="dp" src="img/dp12.webp" alt="" style="left:7.161%;top:67.285%;width:2.669%">
        <img class="dp" src="img/dp13.webp" alt="" style="left:10.091%;top:67.285%;width:2.734%">
        <img class="dp" src="img/dp14.webp" alt="" style="left:34.375%;top:69.141%;width:11.263%">
        <img class="dp" src="img/dp15.webp" alt="" style="left:45.443%;top:69.141%;width:11.263%">
      </div>
    </div>
    <!-- scene 4: 재단대 위 실제 원단 (스캔) → 조각이 모여 실물 맨투맨 -->
    <div class="real" id="real"><div class="rin" id="rin"><div class="rbg" id="rbg" style="background-image:url(img/table.jpg)"></div>
      <div class="sbx"><img class="tbl" id="tbl" src="img/table.jpg" alt="">
        <img class="rc" src="img/rp0.webp" alt="" style="left:16.927%;top:11.328%;width:23.568%">
        <img class="rc" src="img/rp1.webp" alt="" style="left:41.081%;top:11.23%;width:23.438%">
        <img class="rc" src="img/rp2.webp" alt="" style="left:64.518%;top:12.109%;width:15.365%">
        <img class="rc" src="img/rp3.webp" alt="" style="left:80.404%;top:12.207%;width:14.909%">
        <img class="rc" src="img/rp4.webp" alt="" style="left:6.576%;top:17.188%;width:7.747%">
        <img class="rc" src="img/rp5.webp" alt="" style="left:6.706%;top:47.363%;width:4.753%">
        <img class="rc" src="img/rp6.webp" alt="" style="left:11.523%;top:47.461%;width:4.753%">
        <img class="rc" src="img/rp7.webp" alt="" style="left:34.18%;top:56.836%;width:22.005%">
        <img class="rc" src="img/rp8.webp" alt="" style="left:6.641%;top:57.422%;width:25.716%">
        <img class="rc" src="img/rp9.webp" alt="" style="left:58.203%;top:57.715%;width:16.992%">
        <img class="rc" src="img/rp10.webp" alt="" style="left:76.172%;top:57.715%;width:17.188%">
        <img class="rc" src="img/rp11.webp" alt="" style="left:13.477%;top:65.527%;width:20.898%">
        <img class="rc" src="img/rp12.webp" alt="" style="left:7.161%;top:67.285%;width:2.669%">
        <img class="rc" src="img/rp13.webp" alt="" style="left:10.091%;top:67.285%;width:2.734%">
        <img class="rc" src="img/rp14.webp" alt="" style="left:34.375%;top:69.141%;width:11.263%">
        <img class="rc" src="img/rp15.webp" alt="" style="left:45.443%;top:69.141%;width:11.263%">
      </div>
    </div></div>
    <div class="scan" id="scan"></div>
    <!-- scene 5: 하나의 상자가 끝까지 이어짐 (열린 상자 → 닫힘 → 현관 앞) -->
    <div class="pk" id="pk">
      <div class="cam" id="cam">
      <img class="pkimg" id="doorBg" src="img/door_empty.webp" alt="">
      <div class="bxw" id="bxw">
        <div class="bsh" id="bsh"></div>
        <img class="pkimg" id="bxOpen" src="img/cut_open_empty.webp" alt="">
        <img class="pkimg" id="bxFold" src="img/cut_open_full.webp" alt="">
        <div class="bxcw" id="bxCW"><img class="pkimg" id="bxClosed" src="img/cut_closed.webp" alt=""></div>
      </div>
      </div>
      <div class="endc" id="endC">
        <div class="endbg" id="endBg"></div>
        <svg class="endlogo2" id="endLogo" viewBox="0 0 88 26" fill="none" aria-label="한땀"><path d="M3.00201 16.4709L12.3108 7.14121C12.7641 6.68876 13.073 6.112 13.1984 5.48393C13.3238 4.85586 13.26 4.20471 13.0152 3.61289C12.7704 3.02106 12.3555 2.51517 11.8231 2.15922C11.2906 1.80328 10.6646 1.61328 10.0241 1.61328C9.38364 1.61328 8.75757 1.80328 8.22512 2.15922C7.69268 2.51517 7.2778 3.02106 7.03298 3.61289C6.78816 4.20471 6.7244 4.85586 6.84979 5.48393C6.97517 6.112 7.28406 6.68876 7.73735 7.14121L23.5723 22.997C24.4424 23.8394 25.6088 24.3059 26.8198 24.2961C28.0309 24.2863 29.1895 23.8008 30.0458 22.9445C30.9022 22.0881 31.3876 20.9295 31.3975 19.7185C31.4073 18.5074 30.9407 17.3411 30.0984 16.4709L20.7896 7.14121C20.3363 6.68876 20.0274 6.112 19.902 5.48393C19.7766 4.85586 19.8404 4.20471 20.0852 3.61289C20.33 3.02106 20.7449 2.51517 21.2773 2.15922C21.8098 1.80328 22.4358 1.61328 23.0763 1.61328C23.7168 1.61328 24.3428 1.80328 24.8753 2.15922C25.4077 2.51517 25.8226 3.02106 26.0674 3.61289C26.3123 4.20471 26.376 4.85586 26.2506 5.48393C26.1252 6.112 25.8163 6.68876 25.3631 7.14121L9.52812 22.997C8.65797 23.8394 7.49161 24.3059 6.28058 24.2961C5.06956 24.2863 3.91092 23.8008 3.05457 22.9445C2.19822 22.0881 1.71277 20.9295 1.70294 19.7185C1.69311 18.5074 2.15968 17.3411 3.00201 16.4709Z" stroke="#041E41" stroke-width="2.61" stroke-linejoin="round"/><path d="M3.00201 16.4713L10.0241 9.44922L15.245 14.6701" stroke="#B3D214" stroke-width="2.61" stroke-linejoin="round"/><path d="M57.4496 0.949557V19.4384H61.1364V11.4596H64.3829V8.43315H61.1364V0.949557M41.6295 3.48077V6.34215H56.184V3.48077H50.7364V0.894531H47.0771V3.48077M48.9205 7.19506C45.3438 7.19506 42.8126 9.1485 42.8126 11.9824C42.8126 14.8437 45.3438 16.7697 48.9205 16.7697C52.4972 16.7697 55.0284 14.8437 55.0284 11.9824C55.0284 9.1485 52.4972 7.19506 48.9205 7.19506ZM48.9205 9.9739C50.4337 9.9739 51.4792 10.6617 51.4792 11.9824C51.4792 13.303 50.4337 13.9908 48.9205 13.9908C47.3798 13.9908 46.3343 13.303 46.3343 11.9824C46.3343 10.6617 47.3798 9.9739 48.9205 9.9739ZM45.1237 18.0353V25.2712H62.0168V22.3548H48.7829V18.0353M68.1523 16.1644V25.4363H84.9628V16.1644M81.3586 19.0257V22.5474H71.7565V19.0257M81.2761 0.922044V15.0363H84.9628V9.47866H87.6041V6.47972H84.9628V0.922044M65.4009 2.54532V14.0734H66.6665C68.7851 14.0734 70.3258 14.0459 72.3067 13.6607L72.0316 10.6617C70.9036 10.8818 69.9131 10.9919 68.8676 11.0469V5.43421H71.8115V2.54532M72.9946 2.54532V14.0734H74.3427C77.4517 14.0734 78.7448 14.0459 80.3681 13.6332L80.0655 10.6342C78.965 10.9369 78.002 11.0194 76.4612 11.0469V5.43421H79.6253V2.54532" fill="#041E41"/></svg>
        <p class="endt" id="endT">말로 주문하면, 성북 공장이 만들어요</p>
        <p class="endd" id="endD"><span><svg viewBox="0 0 24 24" fill="none" stroke="#041E41" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>배송 완료</p>
      </div>
    </div>

    <div class="prompt" id="prompt">
      <p class="ptext" id="ptext"><span class="ph">만들고 싶은 단체복을 말해주세요</span></p>
      <div class="pbar"><span class="pchip">+ 로고 · 이미지</span>
        <span class="send" id="send"><svg width="50%" height="50%" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M6 11l6-6 6 6"/></svg></span></div>
    </div>
    <svg class="cursor" id="cursor" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 2 L3 19 L8 14.5 L11.5 22 L14.5 20.6 L11 13.3 L17.5 13 Z" fill="#191F28" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>
  </div>
  <div class="cap" aria-live="polite"><span class="cap-n" id="capN">1</span><span class="cap-t" id="capT">원하는 옷을 말로 설명해요</span><span class="cap-dots" id="capDots"><i class="on"></i><i></i><i></i><i></i><i></i></span></div>
  <button class="ctrl" type="button" id="pause" aria-pressed="false"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg><span>모션 멈추기</span></button>
`;
