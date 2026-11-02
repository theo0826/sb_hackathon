/** @typedef {[string, string]} PhrasePair */

/** @type {PhrasePair[]} */
export const MATERIAL_PHRASES = [
  // 2026-10-30 추가: 가죽 계열 (인조가죽이 '가죽'보다 먼저)
  [/인조\s*가죽|페이크\s*레더|비건\s*레더|faux\s*leather|vegan\s*leather|pu\s*leather|레자/i, 'faux_leather'],
  [/스웨이드|suede|세무/i, 'suede'],
  [/가죽|레더|leather/i, 'leather'],
  [/헤비\s*스웻|heavy\s*sweat/i, 'heavy_sweat_fleece'],
  [/브러시드\s*플리스|brushed\s*fleece/i, 'brushed_fleece'],
  [/프렌치\s*테리|french\s*terry/i, 'french_terry'],
  [/코튼\s*저지|cotton\s*jersey/i, 'cotton_jersey'],
  [/인터록|interlock/i, 'cotton_interlock'],
  [/피케|pique/i, 'pique_cotton'],
  [/와플|waffle\s*knit|thermal/i, 'thermal_waffle'],
  [/폴리\s*플리스|polyester\s*fleece/i, 'polyester_fleece'],
  [/소프트\s*쉘|softshell/i, 'softshell_knit'],
  [/리브\s*니트|rib\s*knit/i, 'rib_knit'],
  [/울\s*니트|wool\s*knit/i, 'wool_knit'],
  [/팝린|poplin/i, 'cotton_poplin'],
  [/옥스포드|oxford/i, 'oxford'],
  [/샴브레이|chambray/i, 'chambray'],
  [/플란넬|flannel/i, 'flannel_brushed'],
  [/코듀로이|corduroy/i, 'corduroy'],
  [/타슬란|taslan|nylon/i, 'nylon_taslan'],
  [/데님|denim/i, 'denim'],
  [/린넨|linen/i, 'linen'],
  [/면\s*티|면티|코튼\s*티/i, 'cotton_jersey'],
  [/면/i, 'cotton_jersey'],
  [/플리스|fleece/i, 'brushed_fleece'],
  [/니트|knit/i, 'wool_knit'],
  [/테리|terry/i, 'french_terry'],
];

/** @type {PhrasePair[]} */
export const COLOR_PHRASES = [
  [/헤더\s*그레이|heather\s*gray|멜란지/i, 'heather_gray'],
  [/라이트\s*그레이|light\s*gray/i, 'light_gray'],
  [/워시드\s*블랙|washed\s*black/i, 'washed_black'],
  [/다크\s*네이비|dark\s*navy/i, 'dark_navy'],
  [/포레스트|forest\s*green/i, 'forest_green'],
  [/스카이\s*블루|sky\s*blue/i, 'sky_blue'],
  [/버건디|burgundy/i, 'burgundy'],
  [/머스타드|mustard/i, 'mustard'],
  [/라벤더|lavender/i, 'lavender'],
  [/코발트|cobalt/i, 'cobalt'],
  [/코랄|coral/i, 'coral'],
  [/마룬|maroon/i, 'maroon'],
  [/차콜|charcoal/i, 'charcoal'],
  [/네이비|navy/i, 'navy'],
  [/올리브|olive/i, 'olive'],
  [/초록|녹색|그린|(?<!forest\s)green/i, 'green'],
  [/베이지|beige|카키|khaki/i, 'beige'],
  [/크림|아이보리|ivory|cream/i, 'cream'],
  [/탄|camel|tan/i, 'tan'],
  [/퍼플|purple|보라/i, 'purple'],
  [/오렌지|orange/i, 'orange'],
  [/핑크|pink/i, 'pink'],
  [/레드|red|빨/i, 'red'],
  [/틸|teal/i, 'teal'],
  [/블랙|black|검정|검은/i, 'black'],
  [/화이트|white|흰/i, 'white'],
  [/그레이|gray|grey|회색/i, 'heather_gray'],
];

/** @type {PhrasePair[]} */
export const NECK_PHRASES = [
  // 2026-10-30 추가
  [/라이더|rider|바이커|biker|모토\s*자켓|motorcycle\s*jacket/i, 'rider_collar'],
  [/숄\s*카라|shawl\s*collar/i, 'shawl_collar'],
  [/라펠|테일러드|블레이저|blazer|notch(?:ed)?\s*lapel|lapel/i, 'notched_lapel'],
  [/퍼넬\s*넥|funnel\s*neck/i, 'funnel_neck'],
  [/카울\s*넥|cowl\s*neck/i, 'cowl_neck'],
  [/스퀘어\s*넥|square\s*neck/i, 'square_neck'],
  [/피터\s*팬|peter\s*pan/i, 'peter_pan'],
  [/후드|hoodie|hood/i, 'hood'],
  [/카라\s*티/i, 'polo'],
  [/(?<!티)셔츠|남방|dress\s*shirt|button[- ]?(?:up|down)\s*shirt|oxford\s*shirt/i, 'shirt_collar'],
  [/헨리|henley/i, 'henley'],
  [/모크\s*넥|mock\s*neck/i, 'mock_neck'],
  [/차이나\s*카라|밴드\s*카라|mandarin/i, 'mandarin'],
  [/보트\s*넥|boat\s*neck/i, 'boat_neck'],
  [/스쿱\s*넥|scoop\s*neck/i, 'scoop_neck'],
  [/폴로|polo/i, 'polo'],
  [/터틀|목폴라|turtleneck/i, 'turtleneck'],
  [/v\s*넥|v-neck|브이넥/i, 'v_neck'],
  [/크루\s*넥|crew\s*neck|라운드\s*넥/i, 'crew'],
];

/** @type {PhrasePair[]} */
export const FIT_PHRASES = [
  [/오버\s*핏|oversized|오버핏/i, 'oversized'],
  [/슬림\s*핏|slim\s*fit|슬림핏/i, 'slim'],
  [/릴랙스|relaxed/i, 'relaxed'],
  [/박시|boxy/i, 'boxy'],
];

/** 2026-10-20 추가: 여밈, 무늬, 장식 (Python garment/tree/explicit_map.py 와 같음) */
/** @type {PhrasePair[]} */
export const CLOSURE_PHRASES = [
  // 2026-10-30 추가 (구체적인 것이 먼저)
  [/비대칭\s*지퍼|asymmetric(?:al)?\s*zip|라이더|rider|바이커|biker/i, 'asymmetric_zip'],
  [/쿼터\s*집|quarter\s*zip/i, 'quarter_zip'],
  [/히든\s*지퍼|숨은\s*지퍼|hidden\s*zip|concealed\s*zip/i, 'hidden_zip'],
  [/사선\s*지퍼|대각선?\s*지퍼|diagonal\s*zip/i, 'diagonal_zip'],
  [/옆\s*지퍼|사이드\s*지퍼|side\s*zip/i, 'side_zip'],
  [/어깨\s*지퍼|shoulder\s*zip/i, 'shoulder_zip'],
  [/토글|떡볶이\s*단추|더플|toggle|duffle/i, 'toggle_front'],
  [/후크|훅\s*단추|hook\s*(?:and|&)\s*eye|hook\s*front/i, 'hook_front'],
  [/랩\s*(?:자켓|재킷|코트|탑|블라우스|셔츠)|wrap\s*(?:jacket|coat|top|front)/i, 'wrap_tie'],
  [/반\s*집업|하프\s*집업|half\s*zip|quarter\s*zip/i, 'half_zip'],
  [/집업|zip[- ]?up|full\s*zip|지퍼/i, 'full_zip'],
  [/단추|버튼\s*업|button[- ]?up|button\s*front/i, 'button_front'],
  [/스냅|snap/i, 'snap_front'],
];

/** @type {PhrasePair[]} */
export const SURFACE_PHRASES = [
  [/스트라이프|줄무늬|단가라|stripe/i, 'stripe'],
  [/체크|깅엄|타탄|plaid|check|gingham|tartan/i, 'check'],
  [/타이\s*다이|tie[- ]?dye/i, 'tie_dye'],
  [/카모|camo|꽃무늬|플로럴|floral|도트|polka/i, 'all_over'],
  [/그래픽|프린트|프린팅|graphic|printed/i, 'graphic'],
];

/** @type {PhrasePair[]} */
export const DECORATION_PHRASES = [
  [/자수|embroider/i, 'embroidery'],
  [/와펜|패치|patch/i, 'patch'],
  [/레터링|lettering/i, 'lettering'],
];

export const P_CLOSURE = 'category/top/closure';
export const P_SURFACE = 'category/top/surface_pattern';
export const P_DECORATION = 'category/top/decoration';

export const P_NONE_MAT = 'category/top/split/none/material';
export const P_NONE_COL = 'category/top/split/none/color';

/**
 * @param {string} text
 * @param {PhrasePair[]} pairs
 * @returns {string|undefined}
 */
export function firstMatch(text, pairs) {
  for (const [re, id] of pairs) {
    if (re.test(text)) return id;
  }
  return undefined;
}

// 2026-10-30 추가: 아우터 세부 (문장에 있을 때만 고정. 없으면 prior 의 "없음")
//   [정규식, 경로, 값]. 같은 경로는 위에 있는 것이 먼저
export const OUTER_PHRASES = [
  [/반\s*안감|half\s*lin(?:ed|ing)/i, 'category/top/lining', 'half'],
  [/메[시쉬]\s*안감|mesh\s*lin(?:ed|ing)/i, 'category/top/lining', 'mesh'],
  [/(?:누빔|퀼팅|퀼티드)\s*안감|quilted\s*lin(?:ed|ing)/i, 'category/top/lining', 'quilted'],
  [/양털|보아|셰르파|쉐르파|sherpa|shearling\s*lin/i, 'category/top/lining', 'sherpa'],
  [/(?:기모|플리스|후리스)\s*안감|fleece[\s-]*lin(?:ed|ing)/i, 'category/top/lining', 'fleece'],
  [/(?:풀|전체)\s*안감|fully\s*lined|full\s*lining|안감\s*있/i, 'category/top/lining', 'full'],
  [/안감\s*없|언라인드|unlined/i, 'category/top/lining', 'none'],
  [/경량\s*패딩|라이트\s*패딩|light(?:weight)?\s*(?:padding|puffer|padded)/i, 'category/top/insulation', 'light_padding'],
  [/롱\s*패딩|구스\s*다운|덕\s*다운|헤비\s*다운|heavy\s*down|goose\s*down/i, 'category/top/insulation', 'heavy_down'],
  [/다이아몬드\s*퀼팅|diamond\s*quilt/i, 'category/top/insulation', 'diamond_quilt'],
  [/패딩|푸퍼|퍼퍼|숏\s*패딩|puffer|padded|down\s*jacket|(?:퀼팅|퀼티드)(?!\s*안감)|quilted(?!\s*lin)/i, 'category/top/insulation', 'channel_quilt'],
  [/허리\s*(?:스트링|조임\s*끈|끈)|웨이스트\s*스트링|drawcord\s*waist|waist\s*drawcord|drawstring\s*waist/i, 'category/top/waist_detail', 'drawcord_waist'],
  [/허리\s*밴딩|고무\s*허리|elastic\s*waist/i, 'category/top/waist_detail', 'elastic_waist'],
  [/벨트|벨티드|belt(?:ed)?\b/i, 'category/top/waist_detail', 'belt'],
  [/(?:허리|사이드)\s*조절\s*탭|cinch\s*tab|side\s*adjust(?:er|ment)?\s*tab/i, 'category/top/waist_detail', 'cinch_tabs'],
  [/견장|에폴렛|epaulet/i, 'category/top/epaulette', 'epaulettes'],
  [/건\s*플랩|gun\s*flap/i, 'category/top/storm_flap', 'gun_flap'],
  [/스톰\s*플랩|지퍼\s*덮개|storm\s*flap|zip(?:per)?\s*flap/i, 'category/top/storm_flap', 'front_flap'],
  [/사이드\s*벤트|양쪽\s*(?:뒤)?트임|side\s*vents?/i, 'category/top/back_vent', 'side_vents'],
  [/센터\s*벤트|뒤\s*트임|center\s*vent|back\s*vent/i, 'category/top/back_vent', 'center_vent'],
];
