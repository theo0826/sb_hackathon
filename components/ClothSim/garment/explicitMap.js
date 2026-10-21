/** @typedef {[string, string]} PhrasePair */

/** @type {PhrasePair[]} */
export const MATERIAL_PHRASES = [
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
