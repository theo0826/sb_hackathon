# ClothSim 트리 도면 현황

트리 `garment/assets/trees/v0_seed.js` 의 모든 선택지를, 실제로 모양이나 화면에 반영되는지 기준으로 표시한 표입니다.
자동 생성 (2026-10-30). 트리를 바꾸면 다시 만들어야 합니다.

## 표시 뜻

| 표시 | 뜻 |
|---|---|
| C | C++ 엔진이 실제 도면(패턴, 치수)을 다르게 만듦 |
| J | 도면은 같고 화면(원단 질감, 색, 무늬, 부자재)만 JS 에서 다르게 그림 |
| A | 근사: 가장 가까운 지원 모양으로 대신 그림. 경고 문구가 남음. **채워 넣어야 할 도면** |
| R | 기록만: 선택은 clothData 토큰에 남지만 모양과 화면에는 반영 안 됨. **채워 넣어야 할 도면** |

## 합계: C 66 / J 900 / A 159 / R 374 (선택지 1499개)

(2026-11-01 손으로 고침: silk_satin, velvet, wool_tweed, mesh 는 v2 부터 전용 질감이 있어 A 28칸을 J 로. shirt_collar 는 C 가 맞고, 실행 경고 "polo 로 근사" 쪽을 고침)

(2026-10-31 손으로 고침: 원단 wool_melton, gabardine, cotton_canvas 와 색 5개 행 추가. J +106, R +3)

색 선택지(J)는 같은 31색이 여러 곳에 반복되므로 표에서는 한 번만 묶어 적었습니다.


### `/garment/category`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| top | Top | R | 기록만 |

### `/garment/category/top/size`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| xs | XS | C | C++ 치수 |
| s | S | C | C++ 치수 |
| m | M | C | C++ 치수 |
| l | L | C | C++ 치수 |
| xl | XL | C | C++ 치수 |

### `/garment/category/top/fit`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| regular | Regular fit | C | C++ 도면 |
| slim | Slim fit | C | C++ 도면 |
| relaxed | Relaxed fit | C | C++ 도면 |
| boxy | Boxy fit | C | C++ 도면 |
| oversized | Oversized fit | C | C++ 도면 |

### `/garment/category/top/neck`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| crew | Crew neck | C | C++ 도면 |

### `/garment/category/top/neck/crew/neck_finish`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| rib_band | Rib band | J | C++ 원단 선택 (모양 같음) |
| binding | Binding | J | C++ 원단 선택 (모양 같음) |
| self_fabric | Self-fabric band | J | C++ 원단 선택 (모양 같음) |
| raw | Raw edge | J | C++ 원단 선택 (모양 같음) |
| v_stitch | V-stitch insert | J | C++ 원단 선택 (모양 같음) |

### `/garment/category/top/neck`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| v_neck | V-neck | C | C++ 도면 |

### `/garment/category/top/neck/v_neck/v_finish`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| rib_band | Rib band | J | C++ 원단 선택 (모양 같음) |
| mitered | Mitered rib | J | C++ 원단 선택 (모양 같음) |
| binding | Binding | J | C++ 원단 선택 (모양 같음) |

### `/garment/category/top/neck`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| turtleneck | Turtleneck | C | C++ 도면 |

### `/garment/category/top/neck/turtleneck/turtle_fold`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| folded | Folded | R | 기록만 |
| single | Single layer | R | 기록만 |

### `/garment/category/top/neck`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| polo | Polo collar | C | C++ 도면 |

### `/garment/category/top/neck/polo/polo_collar`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| flat_knit | Flat knit collar | J | C++ 원단 선택 (모양 같음) |
| tipped | Tipped collar | J | C++ 원단 선택 (모양 같음) |
| self_fabric | Self-fabric collar | J | C++ 원단 선택 (모양 같음) |
| woven | Woven collar | J | C++ 원단 선택 (모양 같음) |

### `/garment/category/top/neck/polo/button_count`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| two | 2 buttons | J | JS 부자재 표시 |
| three | 3 buttons | J | JS 부자재 표시 |
| four | 4 buttons | J | JS 부자재 표시 |

### `/garment/category/top/neck/polo/button_material`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| plastic | Plastic buttons | J | JS 부자재 표시 |
| horn | Horn buttons | J | JS 부자재 표시 |
| metal | Metal buttons | J | JS 부자재 표시 |
| shell | Mother-of-pearl buttons | J | JS 부자재 표시 |
| wood | Wooden buttons | J | JS 부자재 표시 |
| covered | Fabric covered buttons | J | JS 부자재 표시 |

### `/garment/category/top/neck/polo/button_color`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tonal | Tonal | J | JS 부자재 표시 |
| contrast | Contrast | J | JS 부자재 표시 |
| white | White | J | JS 부자재 표시 |
| black | Black | J | JS 부자재 표시 |
| natural | Natural | J | JS 부자재 표시 |

### `/garment/category/top/neck`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| hood | Hood | C | C++ 도면 |

### `/garment/category/top/neck/hood/hood_panels`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| two_panel | Two-panel hood | C | C++ 도면 |
| three_panel | Three-panel hood | C | C++ 도면 |

### `/garment/category/top/neck/hood/drawstring`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| yes | With drawstring | J | JS 부자재 표시 |

### `/garment/category/top/neck/hood/drawstring/yes/drawstring_tip`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| metal_aglet | Metal aglet | J | JS 부자재 표시 |
| plastic_aglet | Plastic aglet | J | JS 부자재 표시 |
| knot | Knotted end | J | JS 부자재 표시 |
| silicone | Silicone tip | J | JS 부자재 표시 |
| bead | Bead / stopper | J | JS 부자재 표시 |

### `/garment/category/top/neck/hood/drawstring/yes/eyelet`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| metal_grommet | Metal grommet | J | JS 부자재 표시 |
| stitched | Stitched buttonhole | J | JS 부자재 표시 |
| tonal_grommet | Tonal coated grommet | J | JS 부자재 표시 |

### `/garment/category/top/neck/hood/drawstring/yes/drawstring_color`

색 31개, 모두 J (JS 색. 2026-10-31 brown, dark_brown, khaki, yellow, mint 추가)

### `/garment/category/top/neck/hood/drawstring`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| flat | Flat drawstring | J | JS 부자재 표시 |

### `/garment/category/top/neck/hood/drawstring/flat/drawstring_tip`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| metal_aglet | Metal aglet | J | JS 부자재 표시 |
| plastic_aglet | Plastic aglet | J | JS 부자재 표시 |
| knot | Knotted end | J | JS 부자재 표시 |
| silicone | Silicone tip | J | JS 부자재 표시 |
| bead | Bead / stopper | J | JS 부자재 표시 |

### `/garment/category/top/neck/hood/drawstring/flat/eyelet`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| metal_grommet | Metal grommet | J | JS 부자재 표시 |
| stitched | Stitched buttonhole | J | JS 부자재 표시 |
| tonal_grommet | Tonal coated grommet | J | JS 부자재 표시 |

### `/garment/category/top/neck/hood/drawstring/flat/drawstring_color`

색 31개, 모두 J (JS 색. 2026-10-31 brown, dark_brown, khaki, yellow, mint 추가)

### `/garment/category/top/neck/hood/drawstring`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| no | No drawstring | J | JS 부자재 표시 |

### `/garment/category/top/neck/hood/hood_lining`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | Unlined | R | 기록만 |
| self | Self-lined | R | 기록만 |
| jersey | Jersey lined | R | 기록만 |
| sherpa | Sherpa lined | R | 기록만 |

### `/garment/category/top/neck/hood/hood_shape`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| rounded | Rounded | R | 기록만 |
| peaked | Peaked | R | 기록만 |
| oversized | Oversized | R | 기록만 |

### `/garment/category/top/neck`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| shirt_collar | Shirt collar | C | C++ 도면 |

### `/garment/category/top/neck/shirt_collar/collar_style`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| point | Point collar | C | C++ 도면 |
| spread | Spread collar | C | C++ 도면 |
| button_down | Button-down collar | C | C++ 도면 |
| cutaway | Cutaway collar | C | C++ 도면 |
| camp | Camp collar | C | C++ 도면 |
| club | Club collar | C | C++ 도면 |
| wing | Wing collar | A | 근사 → point (신규) |
| tab | Tab collar | A | 근사 → point (신규) |
| pin | Pin collar | A | 근사 → point (신규) |
| hidden_button_down | Hidden button-down | A | 근사 → point (신규) |

### `/garment/category/top/neck`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| mandarin | Mandarin collar | A | 근사 → turtleneck |
| henley | Henley | A | 근사 → crew |

### `/garment/category/top/neck/henley/button_count`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| two | 2 buttons | J | JS 부자재 표시 |
| three | 3 buttons | J | JS 부자재 표시 |
| four | 4 buttons | J | JS 부자재 표시 |
| five | 5 buttons | J | JS 부자재 표시 |

### `/garment/category/top/neck/henley/button_material`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| plastic | Plastic buttons | J | JS 부자재 표시 |
| horn | Horn buttons | J | JS 부자재 표시 |
| metal | Metal buttons | J | JS 부자재 표시 |
| shell | Mother-of-pearl buttons | J | JS 부자재 표시 |
| wood | Wooden buttons | J | JS 부자재 표시 |
| covered | Fabric covered buttons | J | JS 부자재 표시 |

### `/garment/category/top/neck/henley/button_color`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tonal | Tonal | J | JS 부자재 표시 |
| contrast | Contrast | J | JS 부자재 표시 |
| white | White | J | JS 부자재 표시 |
| black | Black | J | JS 부자재 표시 |
| natural | Natural | J | JS 부자재 표시 |

### `/garment/category/top/neck`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| mock_neck | Mock neck | A | 근사 → turtleneck |
| boat_neck | Boat neck | A | 근사 → crew |
| scoop_neck | Scoop neck | A | 근사 → crew |
| rider_collar | Rider collar | A | 근사 → turtleneck (신규) |
| notched_lapel | Notched lapel | A | 근사 → v_neck (신규) |
| shawl_collar | Shawl collar | A | 근사 → v_neck (신규) |
| funnel_neck | Funnel neck | A | 근사 → turtleneck (신규) |
| cowl_neck | Cowl neck | A | 근사 → turtleneck (신규) |
| square_neck | Square neck | A | 근사 → crew (신규) |
| peter_pan | Peter Pan collar | A | 근사 → crew (신규) |
| halter | Halter neck | A | 근사 → crew (신규) |
| off_shoulder | Off-shoulder | A | 근사 → crew (신규) |
| keyhole | Keyhole neck | A | 근사 → crew (신규) |
| sailor_collar | Sailor collar | A | 근사 → v_neck (신규) |
| bow_neck | Bow neck | A | 근사 → crew (신규) |
| ruffle_collar | Ruffle collar | A | 근사 → crew (신규) |

### `/garment/category/top/sleeve`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| set_in | Set-in sleeve | C | C++ 도면 |

### `/garment/category/top/sleeve/set_in/sleeve_length`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| long | Long sleeve | R | 기록만 |
| three_quarter | Three-quarter sleeve | R | 기록만 |
| elbow | Elbow sleeve | R | 기록만 |
| short | Short sleeve | R | 기록만 |
| cap | Cap sleeve | R | 기록만 |

### `/garment/category/top/sleeve/set_in/cuff`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| rib | Rib cuff | C | C++ 도면 |
| open | Open hem | C | C++ 도면 |
| barrel | Barrel cuff | A | 근사 → rib |

### `/garment/category/top/sleeve/set_in/cuff/barrel/cuff_buttons`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| one | One button | R | 기록만 |
| two | Two buttons | R | 기록만 |

### `/garment/category/top/sleeve/set_in/cuff/barrel/sleeve_placket`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tower | Tower placket | R | 기록만 |
| plain | Plain slit | R | 기록만 |

### `/garment/category/top/sleeve/set_in/cuff`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| french | French cuff | A | 근사 → rib |
| elastic | Elastic cuff | A | 근사 → rib |
| thumbhole | Thumbhole cuff | A | 근사 → rib |
| raw | Raw edge | A | 근사 → open |
| zip_cuff | Zip cuff | A | 근사 → open (신규) |
| snap_cuff | Snap cuff | A | 근사 → open (신규) |
| adjustable_tab | Adjustable tab cuff | A | 근사 → open (신규) |
| storm_cuff | Storm cuff | A | 근사 → rib (신규) |
| rolled | Rolled cuff | A | 근사 → open (신규) |

### `/garment/category/top/sleeve/set_in/sleeve_detail`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | None | R | 기록만 |
| elbow_patch | Elbow patches | R | 기록만 |
| roll_tab | Roll-up tab | R | 기록만 |
| sleeve_print | Sleeve print | R | 기록만 |
| stripe_tape | Stripe tape | R | 기록만 |
| zip_pocket | Sleeve zip pocket | R | 기록만 |

### `/garment/category/top/sleeve`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| raglan | Raglan sleeve | C | C++ 도면 |

### `/garment/category/top/sleeve/raglan/sleeve_length`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| long | Long sleeve | R | 기록만 |
| three_quarter | Three-quarter sleeve | R | 기록만 |
| elbow | Elbow sleeve | R | 기록만 |
| short | Short sleeve | R | 기록만 |
| cap | Cap sleeve | R | 기록만 |

### `/garment/category/top/sleeve/raglan/cuff`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| rib | Rib cuff | C | C++ 도면 |
| open | Open hem | C | C++ 도면 |
| barrel | Barrel cuff | A | 근사 → rib |

### `/garment/category/top/sleeve/raglan/cuff/barrel/cuff_buttons`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| one | One button | R | 기록만 |
| two | Two buttons | R | 기록만 |

### `/garment/category/top/sleeve/raglan/cuff/barrel/sleeve_placket`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tower | Tower placket | R | 기록만 |
| plain | Plain slit | R | 기록만 |

### `/garment/category/top/sleeve/raglan/cuff`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| french | French cuff | A | 근사 → rib |
| elastic | Elastic cuff | A | 근사 → rib |
| thumbhole | Thumbhole cuff | A | 근사 → rib |
| raw | Raw edge | A | 근사 → open |
| zip_cuff | Zip cuff | A | 근사 → open (신규) |
| snap_cuff | Snap cuff | A | 근사 → open (신규) |
| adjustable_tab | Adjustable tab cuff | A | 근사 → open (신규) |
| storm_cuff | Storm cuff | A | 근사 → rib (신규) |
| rolled | Rolled cuff | A | 근사 → open (신규) |

### `/garment/category/top/sleeve/raglan/sleeve_detail`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | None | R | 기록만 |
| elbow_patch | Elbow patches | R | 기록만 |
| roll_tab | Roll-up tab | R | 기록만 |
| sleeve_print | Sleeve print | R | 기록만 |
| stripe_tape | Stripe tape | R | 기록만 |
| zip_pocket | Sleeve zip pocket | R | 기록만 |

### `/garment/category/top/sleeve`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| sleeveless | Sleeveless | C | C++ 도면 |

### `/garment/category/top/sleeve/sleeveless/back_style`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| regular | Regular back | C | C++ 도면 |
| racerback | Racerback | C | C++ 도면 |

### `/garment/category/top/sleeve/sleeveless/armhole_finish`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| binding | Binding | J | C++ 원단 선택 (모양 같음) |
| rib | Rib band | J | C++ 원단 선택 (모양 같음) |
| raw | Raw edge | J | C++ 원단 선택 (모양 같음) |

### `/garment/category/top/sleeve`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| drop_shoulder | Drop-shoulder sleeve | A | 근사 → set_in |

### `/garment/category/top/sleeve/drop_shoulder/sleeve_length`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| long | Long sleeve | R | 기록만 |
| three_quarter | Three-quarter sleeve | R | 기록만 |
| elbow | Elbow sleeve | R | 기록만 |
| short | Short sleeve | R | 기록만 |
| cap | Cap sleeve | R | 기록만 |

### `/garment/category/top/sleeve/drop_shoulder/cuff`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| rib | Rib cuff | C | C++ 도면 |
| open | Open hem | C | C++ 도면 |
| barrel | Barrel cuff | A | 근사 → rib |

### `/garment/category/top/sleeve/drop_shoulder/cuff/barrel/cuff_buttons`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| one | One button | R | 기록만 |
| two | Two buttons | R | 기록만 |

### `/garment/category/top/sleeve/drop_shoulder/cuff/barrel/sleeve_placket`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tower | Tower placket | R | 기록만 |
| plain | Plain slit | R | 기록만 |

### `/garment/category/top/sleeve/drop_shoulder/cuff`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| french | French cuff | A | 근사 → rib |
| elastic | Elastic cuff | A | 근사 → rib |
| thumbhole | Thumbhole cuff | A | 근사 → rib |
| raw | Raw edge | A | 근사 → open |
| zip_cuff | Zip cuff | A | 근사 → open (신규) |
| snap_cuff | Snap cuff | A | 근사 → open (신규) |
| adjustable_tab | Adjustable tab cuff | A | 근사 → open (신규) |
| storm_cuff | Storm cuff | A | 근사 → rib (신규) |
| rolled | Rolled cuff | A | 근사 → open (신규) |

### `/garment/category/top/sleeve/drop_shoulder/sleeve_detail`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | None | R | 기록만 |
| elbow_patch | Elbow patches | R | 기록만 |
| roll_tab | Roll-up tab | R | 기록만 |
| sleeve_print | Sleeve print | R | 기록만 |
| stripe_tape | Stripe tape | R | 기록만 |
| zip_pocket | Sleeve zip pocket | R | 기록만 |

### `/garment/category/top/sleeve`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| dolman | Dolman / batwing sleeve | A | 근사 → raglan |

### `/garment/category/top/sleeve/dolman/sleeve_length`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| long | Long sleeve | R | 기록만 |
| three_quarter | Three-quarter sleeve | R | 기록만 |
| elbow | Elbow sleeve | R | 기록만 |
| short | Short sleeve | R | 기록만 |
| cap | Cap sleeve | R | 기록만 |

### `/garment/category/top/sleeve/dolman/cuff`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| rib | Rib cuff | C | C++ 도면 |
| open | Open hem | C | C++ 도면 |
| barrel | Barrel cuff | A | 근사 → rib |

### `/garment/category/top/sleeve/dolman/cuff/barrel/cuff_buttons`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| one | One button | R | 기록만 |
| two | Two buttons | R | 기록만 |

### `/garment/category/top/sleeve/dolman/cuff/barrel/sleeve_placket`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tower | Tower placket | R | 기록만 |
| plain | Plain slit | R | 기록만 |

### `/garment/category/top/sleeve/dolman/cuff`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| french | French cuff | A | 근사 → rib |
| elastic | Elastic cuff | A | 근사 → rib |
| thumbhole | Thumbhole cuff | A | 근사 → rib |
| raw | Raw edge | A | 근사 → open |
| zip_cuff | Zip cuff | A | 근사 → open (신규) |
| snap_cuff | Snap cuff | A | 근사 → open (신규) |
| adjustable_tab | Adjustable tab cuff | A | 근사 → open (신규) |
| storm_cuff | Storm cuff | A | 근사 → rib (신규) |
| rolled | Rolled cuff | A | 근사 → open (신규) |

### `/garment/category/top/sleeve/dolman/sleeve_detail`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | None | R | 기록만 |
| elbow_patch | Elbow patches | R | 기록만 |
| roll_tab | Roll-up tab | R | 기록만 |
| sleeve_print | Sleeve print | R | 기록만 |
| stripe_tape | Stripe tape | R | 기록만 |
| zip_pocket | Sleeve zip pocket | R | 기록만 |

### `/garment/category/top/sleeve`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| puff_sleeve | Puff sleeve | A | 근사 → set_in (신규) |

### `/garment/category/top/sleeve/puff_sleeve/sleeve_length`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| long | Long sleeve | R | 기록만 (신규) |
| three_quarter | Three-quarter sleeve | R | 기록만 (신규) |
| elbow | Elbow sleeve | R | 기록만 (신규) |
| short | Short sleeve | R | 기록만 (신규) |
| cap | Cap sleeve | R | 기록만 (신규) |

### `/garment/category/top/sleeve/puff_sleeve/cuff`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| rib | Rib cuff | C | C++ 도면 (신규) |
| open | Open hem | C | C++ 도면 (신규) |
| barrel | Barrel cuff | A | 근사 → rib (신규) |

### `/garment/category/top/sleeve/puff_sleeve/cuff/barrel/cuff_buttons`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| one | One button | R | 기록만 (신규) |
| two | Two buttons | R | 기록만 (신규) |

### `/garment/category/top/sleeve/puff_sleeve/cuff/barrel/sleeve_placket`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tower | Tower placket | R | 기록만 (신규) |
| plain | Plain slit | R | 기록만 (신규) |

### `/garment/category/top/sleeve/puff_sleeve/cuff`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| french | French cuff | A | 근사 → rib (신규) |
| elastic | Elastic cuff | A | 근사 → rib (신규) |
| thumbhole | Thumbhole cuff | A | 근사 → rib (신규) |
| raw | Raw edge | A | 근사 → open (신규) |
| zip_cuff | Zip cuff | A | 근사 → open (신규) |
| snap_cuff | Snap cuff | A | 근사 → open (신규) |
| adjustable_tab | Adjustable tab cuff | A | 근사 → open (신규) |
| storm_cuff | Storm cuff | A | 근사 → rib (신규) |
| rolled | Rolled cuff | A | 근사 → open (신규) |

### `/garment/category/top/sleeve/puff_sleeve/sleeve_detail`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | None | R | 기록만 (신규) |
| elbow_patch | Elbow patches | R | 기록만 (신규) |
| roll_tab | Roll-up tab | R | 기록만 (신규) |
| sleeve_print | Sleeve print | R | 기록만 (신규) |
| stripe_tape | Stripe tape | R | 기록만 (신규) |
| zip_pocket | Sleeve zip pocket | R | 기록만 (신규) |

### `/garment/category/top/sleeve`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| bishop_sleeve | Bishop sleeve | A | 근사 → set_in (신규) |

### `/garment/category/top/sleeve/bishop_sleeve/sleeve_length`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| long | Long sleeve | R | 기록만 (신규) |
| three_quarter | Three-quarter sleeve | R | 기록만 (신규) |
| elbow | Elbow sleeve | R | 기록만 (신규) |
| short | Short sleeve | R | 기록만 (신규) |
| cap | Cap sleeve | R | 기록만 (신규) |

### `/garment/category/top/sleeve/bishop_sleeve/cuff`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| rib | Rib cuff | C | C++ 도면 (신규) |
| open | Open hem | C | C++ 도면 (신규) |
| barrel | Barrel cuff | A | 근사 → rib (신규) |

### `/garment/category/top/sleeve/bishop_sleeve/cuff/barrel/cuff_buttons`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| one | One button | R | 기록만 (신규) |
| two | Two buttons | R | 기록만 (신규) |

### `/garment/category/top/sleeve/bishop_sleeve/cuff/barrel/sleeve_placket`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tower | Tower placket | R | 기록만 (신규) |
| plain | Plain slit | R | 기록만 (신규) |

### `/garment/category/top/sleeve/bishop_sleeve/cuff`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| french | French cuff | A | 근사 → rib (신규) |
| elastic | Elastic cuff | A | 근사 → rib (신규) |
| thumbhole | Thumbhole cuff | A | 근사 → rib (신규) |
| raw | Raw edge | A | 근사 → open (신규) |
| zip_cuff | Zip cuff | A | 근사 → open (신규) |
| snap_cuff | Snap cuff | A | 근사 → open (신규) |
| adjustable_tab | Adjustable tab cuff | A | 근사 → open (신규) |
| storm_cuff | Storm cuff | A | 근사 → rib (신규) |
| rolled | Rolled cuff | A | 근사 → open (신규) |

### `/garment/category/top/sleeve/bishop_sleeve/sleeve_detail`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | None | R | 기록만 (신규) |
| elbow_patch | Elbow patches | R | 기록만 (신규) |
| roll_tab | Roll-up tab | R | 기록만 (신규) |
| sleeve_print | Sleeve print | R | 기록만 (신규) |
| stripe_tape | Stripe tape | R | 기록만 (신규) |
| zip_pocket | Sleeve zip pocket | R | 기록만 (신규) |

### `/garment/category/top/sleeve`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| bell_sleeve | Bell sleeve | A | 근사 → set_in (신규) |

### `/garment/category/top/sleeve/bell_sleeve/sleeve_length`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| long | Long sleeve | R | 기록만 (신규) |
| three_quarter | Three-quarter sleeve | R | 기록만 (신규) |
| elbow | Elbow sleeve | R | 기록만 (신규) |
| short | Short sleeve | R | 기록만 (신규) |
| cap | Cap sleeve | R | 기록만 (신규) |

### `/garment/category/top/sleeve/bell_sleeve/cuff`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| rib | Rib cuff | C | C++ 도면 (신규) |
| open | Open hem | C | C++ 도면 (신규) |
| barrel | Barrel cuff | A | 근사 → rib (신규) |

### `/garment/category/top/sleeve/bell_sleeve/cuff/barrel/cuff_buttons`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| one | One button | R | 기록만 (신규) |
| two | Two buttons | R | 기록만 (신규) |

### `/garment/category/top/sleeve/bell_sleeve/cuff/barrel/sleeve_placket`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tower | Tower placket | R | 기록만 (신규) |
| plain | Plain slit | R | 기록만 (신규) |

### `/garment/category/top/sleeve/bell_sleeve/cuff`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| french | French cuff | A | 근사 → rib (신규) |
| elastic | Elastic cuff | A | 근사 → rib (신규) |
| thumbhole | Thumbhole cuff | A | 근사 → rib (신규) |
| raw | Raw edge | A | 근사 → open (신규) |
| zip_cuff | Zip cuff | A | 근사 → open (신규) |
| snap_cuff | Snap cuff | A | 근사 → open (신규) |
| adjustable_tab | Adjustable tab cuff | A | 근사 → open (신규) |
| storm_cuff | Storm cuff | A | 근사 → rib (신규) |
| rolled | Rolled cuff | A | 근사 → open (신규) |

### `/garment/category/top/sleeve/bell_sleeve/sleeve_detail`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | None | R | 기록만 (신규) |
| elbow_patch | Elbow patches | R | 기록만 (신규) |
| roll_tab | Roll-up tab | R | 기록만 (신규) |
| sleeve_print | Sleeve print | R | 기록만 (신규) |
| stripe_tape | Stripe tape | R | 기록만 (신규) |
| zip_pocket | Sleeve zip pocket | R | 기록만 (신규) |

### `/garment/category/top/sleeve`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| kimono_sleeve | Kimono sleeve | A | 근사 → raglan (신규) |

### `/garment/category/top/sleeve/kimono_sleeve/sleeve_length`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| long | Long sleeve | R | 기록만 (신규) |
| three_quarter | Three-quarter sleeve | R | 기록만 (신규) |
| elbow | Elbow sleeve | R | 기록만 (신규) |
| short | Short sleeve | R | 기록만 (신규) |
| cap | Cap sleeve | R | 기록만 (신규) |

### `/garment/category/top/sleeve/kimono_sleeve/cuff`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| rib | Rib cuff | C | C++ 도면 (신규) |
| open | Open hem | C | C++ 도면 (신규) |
| barrel | Barrel cuff | A | 근사 → rib (신규) |

### `/garment/category/top/sleeve/kimono_sleeve/cuff/barrel/cuff_buttons`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| one | One button | R | 기록만 (신규) |
| two | Two buttons | R | 기록만 (신규) |

### `/garment/category/top/sleeve/kimono_sleeve/cuff/barrel/sleeve_placket`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tower | Tower placket | R | 기록만 (신규) |
| plain | Plain slit | R | 기록만 (신규) |

### `/garment/category/top/sleeve/kimono_sleeve/cuff`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| french | French cuff | A | 근사 → rib (신규) |
| elastic | Elastic cuff | A | 근사 → rib (신규) |
| thumbhole | Thumbhole cuff | A | 근사 → rib (신규) |
| raw | Raw edge | A | 근사 → open (신규) |
| zip_cuff | Zip cuff | A | 근사 → open (신규) |
| snap_cuff | Snap cuff | A | 근사 → open (신규) |
| adjustable_tab | Adjustable tab cuff | A | 근사 → open (신규) |
| storm_cuff | Storm cuff | A | 근사 → rib (신규) |
| rolled | Rolled cuff | A | 근사 → open (신규) |

### `/garment/category/top/sleeve/kimono_sleeve/sleeve_detail`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | None | R | 기록만 (신규) |
| elbow_patch | Elbow patches | R | 기록만 (신규) |
| roll_tab | Roll-up tab | R | 기록만 (신규) |
| sleeve_print | Sleeve print | R | 기록만 (신규) |
| stripe_tape | Stripe tape | R | 기록만 (신규) |
| zip_pocket | Sleeve zip pocket | R | 기록만 (신규) |

### `/garment/category/top/sleeve`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| flutter_sleeve | Flutter sleeve | A | 근사 → set_in (신규) |

### `/garment/category/top/sleeve/flutter_sleeve/sleeve_length`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| long | Long sleeve | R | 기록만 (신규) |
| three_quarter | Three-quarter sleeve | R | 기록만 (신규) |
| elbow | Elbow sleeve | R | 기록만 (신규) |
| short | Short sleeve | R | 기록만 (신규) |
| cap | Cap sleeve | R | 기록만 (신규) |

### `/garment/category/top/sleeve/flutter_sleeve/cuff`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| rib | Rib cuff | C | C++ 도면 (신규) |
| open | Open hem | C | C++ 도면 (신규) |
| barrel | Barrel cuff | A | 근사 → rib (신규) |

### `/garment/category/top/sleeve/flutter_sleeve/cuff/barrel/cuff_buttons`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| one | One button | R | 기록만 (신규) |
| two | Two buttons | R | 기록만 (신규) |

### `/garment/category/top/sleeve/flutter_sleeve/cuff/barrel/sleeve_placket`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tower | Tower placket | R | 기록만 (신규) |
| plain | Plain slit | R | 기록만 (신규) |

### `/garment/category/top/sleeve/flutter_sleeve/cuff`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| french | French cuff | A | 근사 → rib (신규) |
| elastic | Elastic cuff | A | 근사 → rib (신규) |
| thumbhole | Thumbhole cuff | A | 근사 → rib (신규) |
| raw | Raw edge | A | 근사 → open (신규) |
| zip_cuff | Zip cuff | A | 근사 → open (신규) |
| snap_cuff | Snap cuff | A | 근사 → open (신규) |
| adjustable_tab | Adjustable tab cuff | A | 근사 → open (신규) |
| storm_cuff | Storm cuff | A | 근사 → rib (신규) |
| rolled | Rolled cuff | A | 근사 → open (신규) |

### `/garment/category/top/sleeve/flutter_sleeve/sleeve_detail`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | None | R | 기록만 (신규) |
| elbow_patch | Elbow patches | R | 기록만 (신규) |
| roll_tab | Roll-up tab | R | 기록만 (신규) |
| sleeve_print | Sleeve print | R | 기록만 (신규) |
| stripe_tape | Stripe tape | R | 기록만 (신규) |
| zip_pocket | Sleeve zip pocket | R | 기록만 (신규) |

### `/garment/category/top/sleeve`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| cold_shoulder | Cold shoulder | A | 근사 → set_in (신규) |

### `/garment/category/top/sleeve/cold_shoulder/sleeve_length`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| long | Long sleeve | R | 기록만 (신규) |
| three_quarter | Three-quarter sleeve | R | 기록만 (신규) |
| elbow | Elbow sleeve | R | 기록만 (신규) |
| short | Short sleeve | R | 기록만 (신규) |
| cap | Cap sleeve | R | 기록만 (신규) |

### `/garment/category/top/sleeve/cold_shoulder/cuff`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| rib | Rib cuff | C | C++ 도면 (신규) |
| open | Open hem | C | C++ 도면 (신규) |
| barrel | Barrel cuff | A | 근사 → rib (신규) |

### `/garment/category/top/sleeve/cold_shoulder/cuff/barrel/cuff_buttons`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| one | One button | R | 기록만 (신규) |
| two | Two buttons | R | 기록만 (신규) |

### `/garment/category/top/sleeve/cold_shoulder/cuff/barrel/sleeve_placket`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tower | Tower placket | R | 기록만 (신규) |
| plain | Plain slit | R | 기록만 (신규) |

### `/garment/category/top/sleeve/cold_shoulder/cuff`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| french | French cuff | A | 근사 → rib (신규) |
| elastic | Elastic cuff | A | 근사 → rib (신규) |
| thumbhole | Thumbhole cuff | A | 근사 → rib (신규) |
| raw | Raw edge | A | 근사 → open (신규) |
| zip_cuff | Zip cuff | A | 근사 → open (신규) |
| snap_cuff | Snap cuff | A | 근사 → open (신규) |
| adjustable_tab | Adjustable tab cuff | A | 근사 → open (신규) |
| storm_cuff | Storm cuff | A | 근사 → rib (신규) |
| rolled | Rolled cuff | A | 근사 → open (신규) |

### `/garment/category/top/sleeve/cold_shoulder/sleeve_detail`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | None | R | 기록만 (신규) |
| elbow_patch | Elbow patches | R | 기록만 (신규) |
| roll_tab | Roll-up tab | R | 기록만 (신규) |
| sleeve_print | Sleeve print | R | 기록만 (신규) |
| stripe_tape | Stripe tape | R | 기록만 (신규) |
| zip_pocket | Sleeve zip pocket | R | 기록만 (신규) |

### `/garment/category/top/closure`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | No opening | C | C++ 도면 |
| full_zip | Full zip | C | C++ 도면 |

### `/garment/category/top/closure/full_zip/zipper_type`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| coil | Coil zipper | J | JS 부자재 표시 |
| metal | Metal zipper | J | JS 부자재 표시 |
| vislon | Molded plastic zipper | J | JS 부자재 표시 |
| invisible | Concealed zipper | J | JS 부자재 표시 |
| two_way | Two-way zipper | J | JS 부자재 표시 |

### `/garment/category/top/closure/full_zip/zipper_color`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tonal | Tonal | J | JS 부자재 표시 |
| black | Black | J | JS 부자재 표시 |
| white | White | J | JS 부자재 표시 |
| silver | Silver metal | J | JS 부자재 표시 |
| gold | Gold metal | J | JS 부자재 표시 |
| contrast | Contrast color | J | JS 부자재 표시 |

### `/garment/category/top/closure/full_zip/zipper_puller`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| standard | Standard puller | R | 기록만 |
| cord | Cord puller | R | 기록만 |
| leather | Leather tab | R | 기록만 |
| ring | Ring puller | R | 기록만 |

### `/garment/category/top/closure/full_zip/zip_garage`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| yes | With zipper garage | R | 기록만 |
| no | No zipper garage | R | 기록만 |

### `/garment/category/top/closure`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| half_zip | Half zip | C | C++ 도면 |

### `/garment/category/top/closure/half_zip/zipper_type`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| coil | Coil zipper | J | JS 부자재 표시 |
| metal | Metal zipper | J | JS 부자재 표시 |
| vislon | Molded plastic zipper | J | JS 부자재 표시 |
| invisible | Concealed zipper | J | JS 부자재 표시 |

### `/garment/category/top/closure/half_zip/zipper_color`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tonal | Tonal | J | JS 부자재 표시 |
| black | Black | J | JS 부자재 표시 |
| white | White | J | JS 부자재 표시 |
| silver | Silver metal | J | JS 부자재 표시 |
| gold | Gold metal | J | JS 부자재 표시 |
| contrast | Contrast color | J | JS 부자재 표시 |

### `/garment/category/top/closure/half_zip/zipper_puller`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| standard | Standard puller | R | 기록만 |
| cord | Cord puller | R | 기록만 |
| leather | Leather tab | R | 기록만 |
| ring | Ring puller | R | 기록만 |

### `/garment/category/top/closure/half_zip/zip_garage`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| yes | With zipper garage | R | 기록만 |
| no | No zipper garage | R | 기록만 |

### `/garment/category/top/closure`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| button_front | Button front | A | 근사 → full_zip |

### `/garment/category/top/closure/button_front/button_count`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| five | 5 buttons | J | JS 부자재 표시 |
| six | 6 buttons | J | JS 부자재 표시 |
| seven | 7 buttons | J | JS 부자재 표시 |
| eight | 8 buttons | J | JS 부자재 표시 |

### `/garment/category/top/closure/button_front/button_material`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| plastic | Plastic buttons | J | JS 부자재 표시 |
| horn | Horn buttons | J | JS 부자재 표시 |
| metal | Metal buttons | J | JS 부자재 표시 |
| shell | Mother-of-pearl buttons | J | JS 부자재 표시 |
| wood | Wooden buttons | J | JS 부자재 표시 |
| covered | Fabric covered buttons | J | JS 부자재 표시 |

### `/garment/category/top/closure/button_front/button_color`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tonal | Tonal | J | JS 부자재 표시 |
| contrast | Contrast | J | JS 부자재 표시 |
| white | White | J | JS 부자재 표시 |
| black | Black | J | JS 부자재 표시 |
| natural | Natural | J | JS 부자재 표시 |

### `/garment/category/top/closure/button_front/placket_style`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| standard | Standard placket | J | JS 부자재 표시 |
| hidden | Hidden placket | J | JS 부자재 표시 |
| french | French front | J | JS 부자재 표시 |

### `/garment/category/top/closure`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| half_button | Half button placket | A | 근사 → half_zip |

### `/garment/category/top/closure/half_button/button_count`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| two | 2 buttons | J | JS 부자재 표시 |
| three | 3 buttons | J | JS 부자재 표시 |
| four | 4 buttons | J | JS 부자재 표시 |
| five | 5 buttons | J | JS 부자재 표시 |

### `/garment/category/top/closure/half_button/button_material`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| plastic | Plastic buttons | J | JS 부자재 표시 |
| horn | Horn buttons | J | JS 부자재 표시 |
| metal | Metal buttons | J | JS 부자재 표시 |
| shell | Mother-of-pearl buttons | J | JS 부자재 표시 |
| wood | Wooden buttons | J | JS 부자재 표시 |
| covered | Fabric covered buttons | J | JS 부자재 표시 |

### `/garment/category/top/closure/half_button/button_color`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tonal | Tonal | J | JS 부자재 표시 |
| contrast | Contrast | J | JS 부자재 표시 |
| white | White | J | JS 부자재 표시 |
| black | Black | J | JS 부자재 표시 |
| natural | Natural | J | JS 부자재 표시 |

### `/garment/category/top/closure`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| snap_front | Snap front | A | 근사 → full_zip |

### `/garment/category/top/closure/snap_front/snap_color`

색 31개, 모두 J (JS 색. 2026-10-31 brown, dark_brown, khaki, yellow, mint 추가)

### `/garment/category/top/closure`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| quarter_zip | Quarter zip | A | 근사 → half_zip (신규) |

### `/garment/category/top/closure/quarter_zip/zipper_type`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| coil | Coil zipper | J | JS 부자재 표시 (신규) |
| metal | Metal zipper | J | JS 부자재 표시 (신규) |
| vislon | Molded plastic zipper | J | JS 부자재 표시 (신규) |
| invisible | Concealed zipper | J | JS 부자재 표시 (신규) |

### `/garment/category/top/closure/quarter_zip/zipper_color`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tonal | Tonal | J | JS 부자재 표시 (신규) |
| black | Black | J | JS 부자재 표시 (신규) |
| white | White | J | JS 부자재 표시 (신규) |
| silver | Silver metal | J | JS 부자재 표시 (신규) |
| gold | Gold metal | J | JS 부자재 표시 (신규) |
| contrast | Contrast color | J | JS 부자재 표시 (신규) |

### `/garment/category/top/closure/quarter_zip/zipper_puller`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| standard | Standard puller | R | 기록만 (신규) |
| cord | Cord puller | R | 기록만 (신규) |
| leather | Leather tab | R | 기록만 (신규) |
| ring | Ring puller | R | 기록만 (신규) |

### `/garment/category/top/closure/quarter_zip/zip_garage`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| yes | With zipper garage | R | 기록만 (신규) |
| no | No zipper garage | R | 기록만 (신규) |

### `/garment/category/top/closure`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| asymmetric_zip | Asymmetric zip | A | 근사 → full_zip (신규) |

### `/garment/category/top/closure/asymmetric_zip/zipper_type`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| coil | Coil zipper | J | JS 부자재 표시 (신규) |
| metal | Metal zipper | J | JS 부자재 표시 (신규) |
| vislon | Molded plastic zipper | J | JS 부자재 표시 (신규) |
| invisible | Concealed zipper | J | JS 부자재 표시 (신규) |
| two_way | Two-way zipper | J | JS 부자재 표시 (신규) |

### `/garment/category/top/closure/asymmetric_zip/zipper_color`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tonal | Tonal | J | JS 부자재 표시 (신규) |
| black | Black | J | JS 부자재 표시 (신규) |
| white | White | J | JS 부자재 표시 (신규) |
| silver | Silver metal | J | JS 부자재 표시 (신규) |
| gold | Gold metal | J | JS 부자재 표시 (신규) |
| contrast | Contrast color | J | JS 부자재 표시 (신규) |

### `/garment/category/top/closure/asymmetric_zip/zipper_puller`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| standard | Standard puller | R | 기록만 (신규) |
| cord | Cord puller | R | 기록만 (신규) |
| leather | Leather tab | R | 기록만 (신규) |
| ring | Ring puller | R | 기록만 (신규) |

### `/garment/category/top/closure/asymmetric_zip/zip_garage`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| yes | With zipper garage | R | 기록만 (신규) |
| no | No zipper garage | R | 기록만 (신규) |

### `/garment/category/top/closure`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| hidden_zip | Hidden zip placket | A | 근사 → full_zip (신규) |

### `/garment/category/top/closure/hidden_zip/zipper_type`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| coil | Coil zipper | J | JS 부자재 표시 (신규) |
| metal | Metal zipper | J | JS 부자재 표시 (신규) |
| vislon | Molded plastic zipper | J | JS 부자재 표시 (신규) |
| invisible | Concealed zipper | J | JS 부자재 표시 (신규) |
| two_way | Two-way zipper | J | JS 부자재 표시 (신규) |

### `/garment/category/top/closure/hidden_zip/zipper_color`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tonal | Tonal | J | JS 부자재 표시 (신규) |
| black | Black | J | JS 부자재 표시 (신규) |
| white | White | J | JS 부자재 표시 (신규) |
| silver | Silver metal | J | JS 부자재 표시 (신규) |
| gold | Gold metal | J | JS 부자재 표시 (신규) |
| contrast | Contrast color | J | JS 부자재 표시 (신규) |

### `/garment/category/top/closure/hidden_zip/zipper_puller`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| standard | Standard puller | R | 기록만 (신규) |
| cord | Cord puller | R | 기록만 (신규) |
| leather | Leather tab | R | 기록만 (신규) |
| ring | Ring puller | R | 기록만 (신규) |

### `/garment/category/top/closure/hidden_zip/zip_garage`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| yes | With zipper garage | R | 기록만 (신규) |
| no | No zipper garage | R | 기록만 (신규) |

### `/garment/category/top/closure`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| diagonal_zip | Diagonal zip | A | 근사 → full_zip (신규) |

### `/garment/category/top/closure/diagonal_zip/zipper_type`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| coil | Coil zipper | J | JS 부자재 표시 (신규) |
| metal | Metal zipper | J | JS 부자재 표시 (신규) |
| vislon | Molded plastic zipper | J | JS 부자재 표시 (신규) |
| invisible | Concealed zipper | J | JS 부자재 표시 (신규) |
| two_way | Two-way zipper | J | JS 부자재 표시 (신규) |

### `/garment/category/top/closure/diagonal_zip/zipper_color`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tonal | Tonal | J | JS 부자재 표시 (신규) |
| black | Black | J | JS 부자재 표시 (신규) |
| white | White | J | JS 부자재 표시 (신규) |
| silver | Silver metal | J | JS 부자재 표시 (신규) |
| gold | Gold metal | J | JS 부자재 표시 (신규) |
| contrast | Contrast color | J | JS 부자재 표시 (신규) |

### `/garment/category/top/closure/diagonal_zip/zipper_puller`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| standard | Standard puller | R | 기록만 (신규) |
| cord | Cord puller | R | 기록만 (신규) |
| leather | Leather tab | R | 기록만 (신규) |
| ring | Ring puller | R | 기록만 (신규) |

### `/garment/category/top/closure/diagonal_zip/zip_garage`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| yes | With zipper garage | R | 기록만 (신규) |
| no | No zipper garage | R | 기록만 (신규) |

### `/garment/category/top/closure`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| side_zip | Side zip | A | 근사 → none (신규) |

### `/garment/category/top/closure/side_zip/zipper_type`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| coil | Coil zipper | J | JS 부자재 표시 (신규) |
| metal | Metal zipper | J | JS 부자재 표시 (신규) |
| vislon | Molded plastic zipper | J | JS 부자재 표시 (신규) |
| invisible | Concealed zipper | J | JS 부자재 표시 (신규) |

### `/garment/category/top/closure/side_zip/zipper_color`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tonal | Tonal | J | JS 부자재 표시 (신규) |
| black | Black | J | JS 부자재 표시 (신규) |
| white | White | J | JS 부자재 표시 (신규) |
| silver | Silver metal | J | JS 부자재 표시 (신규) |
| gold | Gold metal | J | JS 부자재 표시 (신규) |
| contrast | Contrast color | J | JS 부자재 표시 (신규) |

### `/garment/category/top/closure/side_zip/zipper_puller`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| standard | Standard puller | R | 기록만 (신규) |
| cord | Cord puller | R | 기록만 (신규) |
| leather | Leather tab | R | 기록만 (신규) |
| ring | Ring puller | R | 기록만 (신규) |

### `/garment/category/top/closure/side_zip/zip_garage`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| yes | With zipper garage | R | 기록만 (신규) |
| no | No zipper garage | R | 기록만 (신규) |

### `/garment/category/top/closure`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| shoulder_zip | Shoulder zip | A | 근사 → none (신규) |

### `/garment/category/top/closure/shoulder_zip/zipper_type`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| coil | Coil zipper | J | JS 부자재 표시 (신규) |
| metal | Metal zipper | J | JS 부자재 표시 (신규) |
| vislon | Molded plastic zipper | J | JS 부자재 표시 (신규) |
| invisible | Concealed zipper | J | JS 부자재 표시 (신규) |

### `/garment/category/top/closure/shoulder_zip/zipper_color`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tonal | Tonal | J | JS 부자재 표시 (신규) |
| black | Black | J | JS 부자재 표시 (신규) |
| white | White | J | JS 부자재 표시 (신규) |
| silver | Silver metal | J | JS 부자재 표시 (신규) |
| gold | Gold metal | J | JS 부자재 표시 (신규) |
| contrast | Contrast color | J | JS 부자재 표시 (신규) |

### `/garment/category/top/closure/shoulder_zip/zipper_puller`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| standard | Standard puller | R | 기록만 (신규) |
| cord | Cord puller | R | 기록만 (신규) |
| leather | Leather tab | R | 기록만 (신규) |
| ring | Ring puller | R | 기록만 (신규) |

### `/garment/category/top/closure/shoulder_zip/zip_garage`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| yes | With zipper garage | R | 기록만 (신규) |
| no | No zipper garage | R | 기록만 (신규) |

### `/garment/category/top/closure`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| toggle_front | Toggle front | A | 근사 → full_zip (신규) |
| hook_front | Hook and eye front | A | 근사 → full_zip (신규) |
| wrap_tie | Wrap tie front | A | 근사 → full_zip (신규) |
| double_breasted | Double-breasted | A | 근사 → full_zip (신규) |

### `/garment/category/top/closure/double_breasted/button_count`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| four | 4 buttons | J | JS 부자재 표시 (신규) |
| six | 6 buttons | J | JS 부자재 표시 (신규) |
| eight | 8 buttons | J | JS 부자재 표시 (신규) |

### `/garment/category/top/closure/double_breasted/button_material`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| plastic | Plastic buttons | J | JS 부자재 표시 (신규) |
| horn | Horn buttons | J | JS 부자재 표시 (신규) |
| metal | Metal buttons | J | JS 부자재 표시 (신규) |
| shell | Mother-of-pearl buttons | J | JS 부자재 표시 (신규) |
| wood | Wooden buttons | J | JS 부자재 표시 (신규) |
| covered | Fabric covered buttons | J | JS 부자재 표시 (신규) |

### `/garment/category/top/closure/double_breasted/button_color`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tonal | Tonal | J | JS 부자재 표시 (신규) |
| contrast | Contrast | J | JS 부자재 표시 (신규) |
| white | White | J | JS 부자재 표시 (신규) |
| black | Black | J | JS 부자재 표시 (신규) |
| natural | Natural | J | JS 부자재 표시 (신규) |

### `/garment/category/top/closure`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| velcro_front | Hook-and-loop front | A | 근사 → full_zip (신규) |
| lace_up | Lace-up front | A | 근사 → half_zip (신규) |

### `/garment/category/top/pocket`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | No pocket | C | C++ 도면 |
| kangaroo | Kangaroo pocket | C | C++ 도면 |

### `/garment/category/top/pocket/kangaroo/pocket_closure`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| open | Open | R | 기록만 |
| zip | Zipped | R | 기록만 |
| snap | Snap | R | 기록만 |

### `/garment/category/top/pocket`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| split_kangaroo | Split kangaroo pocket | C | C++ 도면 |

### `/garment/category/top/pocket/split_kangaroo/pocket_closure`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| open | Open | R | 기록만 |
| zip | Zipped | R | 기록만 |
| snap | Snap | R | 기록만 |

### `/garment/category/top/pocket`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| chest_patch | Chest patch pocket | C | C++ 도면 |

### `/garment/category/top/pocket/chest_patch/pocket_flap`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | No flap | R | 기록만 |
| flap | Flap | R | 기록만 |
| button_flap | Button flap | R | 기록만 |

### `/garment/category/top/pocket/chest_patch/pocket_shape`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| square | Square | R | 기록만 |
| rounded | Rounded | R | 기록만 |
| pointed | Pointed | R | 기록만 |

### `/garment/category/top/pocket`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| dual_chest | Dual chest pockets | C | C++ 도면 |

### `/garment/category/top/pocket/dual_chest/pocket_flap`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | No flap | R | 기록만 |
| flap | Flap | R | 기록만 |
| button_flap | Button flap | R | 기록만 |

### `/garment/category/top/pocket/dual_chest/pocket_shape`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| square | Square | R | 기록만 |
| rounded | Rounded | R | 기록만 |
| pointed | Pointed | R | 기록만 |

### `/garment/category/top/pocket`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| side_seam | Side seam pockets | C | C++ 도면 |

### `/garment/category/top/pocket/side_seam/pocket_closure`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| open | Open | R | 기록만 |
| zip | Zipped | R | 기록만 |
| snap | Snap | R | 기록만 |

### `/garment/category/top/pocket`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| zip_chest | Zip chest pocket | A | 근사 → chest_patch |
| welt | Welt pockets | A | 근사 → side_seam |
| pouch_zip | Zipped pouch pocket | A | 근사 → kangaroo |
| cargo | Cargo pockets | A | 근사 → dual_chest (신규) |
| hand_warmer | Hand-warmer pockets | A | 근사 → side_seam (신규) |
| flap_chest | Flap chest pockets | A | 근사 → dual_chest (신규) |
| inner_pocket | Inner pocket only | A | 근사 → none (신규) |

### `/garment/category/top/hem`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| rib | Rib hem band | C | C++ 도면 |
| straight | Straight hem | C | C++ 도면 |

### `/garment/category/top/hem/straight/side_slit`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | No slits | R | 기록만 |
| short | Short slits | R | 기록만 |

### `/garment/category/top/hem`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| raw | Raw edge hem | C | C++ 도면 |
| curved | Curved hem | C | C++ 도면 |
| drop_tail | Drop-tail hem | A | 근사 → straight |
| drawcord_hem | Drawcord hem | A | 근사 → straight |
| cropped_raw | Cropped raw hem | A | 근사 → raw |
| peplum | Peplum hem | A | 근사 → straight (신규) |
| asymmetric_hem | Asymmetric hem | A | 근사 → straight (신규) |
| elastic_hem | Elastic hem | A | 근사 → rib (신규) |
| step_hem | Step hem | A | 근사 → straight (신규) |

### `/garment/category/top/split`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | Single fabric | C | C++ 도면 |

### `/garment/category/top/split/none/material`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| cotton_jersey | Cotton jersey | J | JS 원단 질감 |
| french_terry | French terry | J | JS 원단 질감 |
| brushed_fleece | Brushed fleece | J | JS 원단 질감 |
| rib_knit | Rib knit | J | JS 원단 질감 |
| wool_knit | Wool knit | J | JS 원단 질감 |
| cotton_poplin | Cotton poplin | J | JS 원단 질감 |
| oxford | Oxford cloth | J | JS 원단 질감 |
| denim | Denim | J | JS 원단 질감 |
| nylon_taslan | Nylon taslan | J | JS 원단 질감 |
| linen | Linen | J | JS 원단 질감 |
| cotton_interlock | Cotton interlock | J | JS 원단 질감 |
| pique_cotton | Pique cotton | J | JS 원단 질감 |
| thermal_waffle | Thermal waffle knit | J | JS 원단 질감 |
| polyester_fleece | Polyester fleece | J | JS 원단 질감 |
| heavy_sweat_fleece | Heavy sweat fleece | J | JS 원단 질감 |
| chambray | Chambray | J | JS 원단 질감 |
| flannel_brushed | Brushed flannel | J | JS 원단 질감 |
| corduroy | Corduroy | J | JS 원단 질감 |
| softshell_knit | Softshell knit | J | JS 원단 질감 |
| leather | Leather | J | JS 원단 질감 (신규) |
| faux_leather | Faux leather | J | JS 원단 질감 (신규) |
| suede | Suede | J | JS 원단 질감 (신규) |
| silk_satin | Silk satin | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| velvet | Velvet | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| wool_tweed | Wool tweed | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| mesh | Mesh | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| wool_melton | Wool melton | J | JS 원단 질감 (신규 2026-10-31, 기존 질감 변형) |
| gabardine | Gabardine | J | JS 원단 질감 (신규 2026-10-31, 기존 질감 변형) |
| cotton_canvas | Cotton canvas | J | JS 원단 질감 (신규 2026-10-31, 기존 질감 변형) |

### `/garment/category/top/split/none/color`

색 31개, 모두 J (JS 색. 2026-10-31 brown, dark_brown, khaki, yellow, mint 추가)

### `/garment/category/top/split`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| chest | Split at chest | C | C++ 도면 |

### `/garment/category/top/split/chest/upper_material`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| cotton_jersey | Cotton jersey | J | JS 원단 질감 |
| french_terry | French terry | J | JS 원단 질감 |
| brushed_fleece | Brushed fleece | J | JS 원단 질감 |
| rib_knit | Rib knit | J | JS 원단 질감 |
| wool_knit | Wool knit | J | JS 원단 질감 |
| cotton_poplin | Cotton poplin | J | JS 원단 질감 |
| oxford | Oxford cloth | J | JS 원단 질감 |
| denim | Denim | J | JS 원단 질감 |
| nylon_taslan | Nylon taslan | J | JS 원단 질감 |
| linen | Linen | J | JS 원단 질감 |
| cotton_interlock | Cotton interlock | J | JS 원단 질감 |
| pique_cotton | Pique cotton | J | JS 원단 질감 |
| thermal_waffle | Thermal waffle knit | J | JS 원단 질감 |
| polyester_fleece | Polyester fleece | J | JS 원단 질감 |
| heavy_sweat_fleece | Heavy sweat fleece | J | JS 원단 질감 |
| chambray | Chambray | J | JS 원단 질감 |
| flannel_brushed | Brushed flannel | J | JS 원단 질감 |
| corduroy | Corduroy | J | JS 원단 질감 |
| softshell_knit | Softshell knit | J | JS 원단 질감 |
| leather | Leather | J | JS 원단 질감 (신규) |
| faux_leather | Faux leather | J | JS 원단 질감 (신규) |
| suede | Suede | J | JS 원단 질감 (신규) |
| silk_satin | Silk satin | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| velvet | Velvet | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| wool_tweed | Wool tweed | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| mesh | Mesh | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| wool_melton | Wool melton | J | JS 원단 질감 (신규 2026-10-31, 기존 질감 변형) |
| gabardine | Gabardine | J | JS 원단 질감 (신규 2026-10-31, 기존 질감 변형) |
| cotton_canvas | Cotton canvas | J | JS 원단 질감 (신규 2026-10-31, 기존 질감 변형) |

### `/garment/category/top/split/chest/upper_color`

색 31개, 모두 J (JS 색. 2026-10-31 brown, dark_brown, khaki, yellow, mint 추가)

### `/garment/category/top/split/chest/lower_material`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| cotton_jersey | Cotton jersey | J | JS 원단 질감 |
| french_terry | French terry | J | JS 원단 질감 |
| brushed_fleece | Brushed fleece | J | JS 원단 질감 |
| rib_knit | Rib knit | J | JS 원단 질감 |
| wool_knit | Wool knit | J | JS 원단 질감 |
| cotton_poplin | Cotton poplin | J | JS 원단 질감 |
| oxford | Oxford cloth | J | JS 원단 질감 |
| denim | Denim | J | JS 원단 질감 |
| nylon_taslan | Nylon taslan | J | JS 원단 질감 |
| linen | Linen | J | JS 원단 질감 |
| cotton_interlock | Cotton interlock | J | JS 원단 질감 |
| pique_cotton | Pique cotton | J | JS 원단 질감 |
| thermal_waffle | Thermal waffle knit | J | JS 원단 질감 |
| polyester_fleece | Polyester fleece | J | JS 원단 질감 |
| heavy_sweat_fleece | Heavy sweat fleece | J | JS 원단 질감 |
| chambray | Chambray | J | JS 원단 질감 |
| flannel_brushed | Brushed flannel | J | JS 원단 질감 |
| corduroy | Corduroy | J | JS 원단 질감 |
| softshell_knit | Softshell knit | J | JS 원단 질감 |
| leather | Leather | J | JS 원단 질감 (신규) |
| faux_leather | Faux leather | J | JS 원단 질감 (신규) |
| suede | Suede | J | JS 원단 질감 (신규) |
| silk_satin | Silk satin | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| velvet | Velvet | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| wool_tweed | Wool tweed | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| mesh | Mesh | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| wool_melton | Wool melton | J | JS 원단 질감 (신규 2026-10-31, 기존 질감 변형) |
| gabardine | Gabardine | J | JS 원단 질감 (신규 2026-10-31, 기존 질감 변형) |
| cotton_canvas | Cotton canvas | J | JS 원단 질감 (신규 2026-10-31, 기존 질감 변형) |

### `/garment/category/top/split/chest/lower_color`

색 31개, 모두 J (JS 색. 2026-10-31 brown, dark_brown, khaki, yellow, mint 추가)

### `/garment/category/top/split`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| waist | Split at waist | C | C++ 도면 |

### `/garment/category/top/split/waist/upper_material`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| cotton_jersey | Cotton jersey | J | JS 원단 질감 |
| french_terry | French terry | J | JS 원단 질감 |
| brushed_fleece | Brushed fleece | J | JS 원단 질감 |
| rib_knit | Rib knit | J | JS 원단 질감 |
| wool_knit | Wool knit | J | JS 원단 질감 |
| cotton_poplin | Cotton poplin | J | JS 원단 질감 |
| oxford | Oxford cloth | J | JS 원단 질감 |
| denim | Denim | J | JS 원단 질감 |
| nylon_taslan | Nylon taslan | J | JS 원단 질감 |
| linen | Linen | J | JS 원단 질감 |
| cotton_interlock | Cotton interlock | J | JS 원단 질감 |
| pique_cotton | Pique cotton | J | JS 원단 질감 |
| thermal_waffle | Thermal waffle knit | J | JS 원단 질감 |
| polyester_fleece | Polyester fleece | J | JS 원단 질감 |
| heavy_sweat_fleece | Heavy sweat fleece | J | JS 원단 질감 |
| chambray | Chambray | J | JS 원단 질감 |
| flannel_brushed | Brushed flannel | J | JS 원단 질감 |
| corduroy | Corduroy | J | JS 원단 질감 |
| softshell_knit | Softshell knit | J | JS 원단 질감 |
| leather | Leather | J | JS 원단 질감 (신규) |
| faux_leather | Faux leather | J | JS 원단 질감 (신규) |
| suede | Suede | J | JS 원단 질감 (신규) |
| silk_satin | Silk satin | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| velvet | Velvet | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| wool_tweed | Wool tweed | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| mesh | Mesh | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| wool_melton | Wool melton | J | JS 원단 질감 (신규 2026-10-31, 기존 질감 변형) |
| gabardine | Gabardine | J | JS 원단 질감 (신규 2026-10-31, 기존 질감 변형) |
| cotton_canvas | Cotton canvas | J | JS 원단 질감 (신규 2026-10-31, 기존 질감 변형) |

### `/garment/category/top/split/waist/upper_color`

색 31개, 모두 J (JS 색. 2026-10-31 brown, dark_brown, khaki, yellow, mint 추가)

### `/garment/category/top/split/waist/lower_material`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| cotton_jersey | Cotton jersey | J | JS 원단 질감 |
| french_terry | French terry | J | JS 원단 질감 |
| brushed_fleece | Brushed fleece | J | JS 원단 질감 |
| rib_knit | Rib knit | J | JS 원단 질감 |
| wool_knit | Wool knit | J | JS 원단 질감 |
| cotton_poplin | Cotton poplin | J | JS 원단 질감 |
| oxford | Oxford cloth | J | JS 원단 질감 |
| denim | Denim | J | JS 원단 질감 |
| nylon_taslan | Nylon taslan | J | JS 원단 질감 |
| linen | Linen | J | JS 원단 질감 |
| cotton_interlock | Cotton interlock | J | JS 원단 질감 |
| pique_cotton | Pique cotton | J | JS 원단 질감 |
| thermal_waffle | Thermal waffle knit | J | JS 원단 질감 |
| polyester_fleece | Polyester fleece | J | JS 원단 질감 |
| heavy_sweat_fleece | Heavy sweat fleece | J | JS 원단 질감 |
| chambray | Chambray | J | JS 원단 질감 |
| flannel_brushed | Brushed flannel | J | JS 원단 질감 |
| corduroy | Corduroy | J | JS 원단 질감 |
| softshell_knit | Softshell knit | J | JS 원단 질감 |
| leather | Leather | J | JS 원단 질감 (신규) |
| faux_leather | Faux leather | J | JS 원단 질감 (신규) |
| suede | Suede | J | JS 원단 질감 (신규) |
| silk_satin | Silk satin | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| velvet | Velvet | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| wool_tweed | Wool tweed | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| mesh | Mesh | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| wool_melton | Wool melton | J | JS 원단 질감 (신규 2026-10-31, 기존 질감 변형) |
| gabardine | Gabardine | J | JS 원단 질감 (신규 2026-10-31, 기존 질감 변형) |
| cotton_canvas | Cotton canvas | J | JS 원단 질감 (신규 2026-10-31, 기존 질감 변형) |

### `/garment/category/top/split/waist/lower_color`

색 31개, 모두 J (JS 색. 2026-10-31 brown, dark_brown, khaki, yellow, mint 추가)

### `/garment/category/top/split`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| chest_band | Chest band colorblock | C | C++ 도면 |

### `/garment/category/top/split/chest_band/upper_material`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| cotton_jersey | Cotton jersey | J | JS 원단 질감 |
| french_terry | French terry | J | JS 원단 질감 |
| brushed_fleece | Brushed fleece | J | JS 원단 질감 |
| rib_knit | Rib knit | J | JS 원단 질감 |
| wool_knit | Wool knit | J | JS 원단 질감 |
| cotton_poplin | Cotton poplin | J | JS 원단 질감 |
| oxford | Oxford cloth | J | JS 원단 질감 |
| denim | Denim | J | JS 원단 질감 |
| nylon_taslan | Nylon taslan | J | JS 원단 질감 |
| linen | Linen | J | JS 원단 질감 |
| cotton_interlock | Cotton interlock | J | JS 원단 질감 |
| pique_cotton | Pique cotton | J | JS 원단 질감 |
| thermal_waffle | Thermal waffle knit | J | JS 원단 질감 |
| polyester_fleece | Polyester fleece | J | JS 원단 질감 |
| heavy_sweat_fleece | Heavy sweat fleece | J | JS 원단 질감 |
| chambray | Chambray | J | JS 원단 질감 |
| flannel_brushed | Brushed flannel | J | JS 원단 질감 |
| corduroy | Corduroy | J | JS 원단 질감 |
| softshell_knit | Softshell knit | J | JS 원단 질감 |
| leather | Leather | J | JS 원단 질감 (신규) |
| faux_leather | Faux leather | J | JS 원단 질감 (신규) |
| suede | Suede | J | JS 원단 질감 (신규) |
| silk_satin | Silk satin | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| velvet | Velvet | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| wool_tweed | Wool tweed | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| mesh | Mesh | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| wool_melton | Wool melton | J | JS 원단 질감 (신규 2026-10-31, 기존 질감 변형) |
| gabardine | Gabardine | J | JS 원단 질감 (신규 2026-10-31, 기존 질감 변형) |
| cotton_canvas | Cotton canvas | J | JS 원단 질감 (신규 2026-10-31, 기존 질감 변형) |

### `/garment/category/top/split/chest_band/upper_color`

색 31개, 모두 J (JS 색. 2026-10-31 brown, dark_brown, khaki, yellow, mint 추가)

### `/garment/category/top/split/chest_band/band_material`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| cotton_jersey | Cotton jersey | R | 기록만 |
| french_terry | French terry | R | 기록만 |
| brushed_fleece | Brushed fleece | R | 기록만 |
| rib_knit | Rib knit | R | 기록만 |
| wool_knit | Wool knit | R | 기록만 |
| cotton_poplin | Cotton poplin | R | 기록만 |
| oxford | Oxford cloth | R | 기록만 |
| denim | Denim | R | 기록만 |
| nylon_taslan | Nylon taslan | R | 기록만 |
| linen | Linen | R | 기록만 |
| cotton_interlock | Cotton interlock | R | 기록만 |
| pique_cotton | Pique cotton | R | 기록만 |
| thermal_waffle | Thermal waffle knit | R | 기록만 |
| polyester_fleece | Polyester fleece | R | 기록만 |
| heavy_sweat_fleece | Heavy sweat fleece | R | 기록만 |
| chambray | Chambray | R | 기록만 |
| flannel_brushed | Brushed flannel | R | 기록만 |
| corduroy | Corduroy | R | 기록만 |
| softshell_knit | Softshell knit | R | 기록만 |
| leather | Leather | R | 기록만 (신규) |
| faux_leather | Faux leather | R | 기록만 (신규) |
| suede | Suede | R | 기록만 (신규) |
| silk_satin | Silk satin | R | 기록만 (신규) |
| velvet | Velvet | R | 기록만 (신규) |
| wool_tweed | Wool tweed | R | 기록만 (신규) |
| mesh | Mesh | R | 기록만 (신규) |
| wool_melton | Wool melton | R | 기록만 (신규, 2026-10-31) |
| gabardine | Gabardine | R | 기록만 (신규, 2026-10-31) |
| cotton_canvas | Cotton canvas | R | 기록만 (신규, 2026-10-31) |

### `/garment/category/top/split/chest_band/band_color`

색 31개, 모두 J (JS 색. 2026-10-31 brown, dark_brown, khaki, yellow, mint 추가)

### `/garment/category/top/split/chest_band/lower_material`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| cotton_jersey | Cotton jersey | J | JS 원단 질감 |
| french_terry | French terry | J | JS 원단 질감 |
| brushed_fleece | Brushed fleece | J | JS 원단 질감 |
| rib_knit | Rib knit | J | JS 원단 질감 |
| wool_knit | Wool knit | J | JS 원단 질감 |
| cotton_poplin | Cotton poplin | J | JS 원단 질감 |
| oxford | Oxford cloth | J | JS 원단 질감 |
| denim | Denim | J | JS 원단 질감 |
| nylon_taslan | Nylon taslan | J | JS 원단 질감 |
| linen | Linen | J | JS 원단 질감 |
| cotton_interlock | Cotton interlock | J | JS 원단 질감 |
| pique_cotton | Pique cotton | J | JS 원단 질감 |
| thermal_waffle | Thermal waffle knit | J | JS 원단 질감 |
| polyester_fleece | Polyester fleece | J | JS 원단 질감 |
| heavy_sweat_fleece | Heavy sweat fleece | J | JS 원단 질감 |
| chambray | Chambray | J | JS 원단 질감 |
| flannel_brushed | Brushed flannel | J | JS 원단 질감 |
| corduroy | Corduroy | J | JS 원단 질감 |
| softshell_knit | Softshell knit | J | JS 원단 질감 |
| leather | Leather | J | JS 원단 질감 (신규) |
| faux_leather | Faux leather | J | JS 원단 질감 (신규) |
| suede | Suede | J | JS 원단 질감 (신규) |
| silk_satin | Silk satin | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| velvet | Velvet | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| wool_tweed | Wool tweed | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| mesh | Mesh | J | JS 원단 질감 (신규, 2026-10-30 전용 질감 추가) |
| wool_melton | Wool melton | J | JS 원단 질감 (신규 2026-10-31, 기존 질감 변형) |
| gabardine | Gabardine | J | JS 원단 질감 (신규 2026-10-31, 기존 질감 변형) |
| cotton_canvas | Cotton canvas | J | JS 원단 질감 (신규 2026-10-31, 기존 질감 변형) |

### `/garment/category/top/split/chest_band/lower_color`

색 31개, 모두 J (JS 색. 2026-10-31 brown, dark_brown, khaki, yellow, mint 추가)

### `/garment/category/top/construction/yoke`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | No yoke | R | 기록만 |
| back_yoke | Back yoke | R | 기록만 |
| split_yoke | Split back yoke | R | 기록만 |
| front_back_yoke | Front and back yoke | R | 기록만 |

### `/garment/category/top/construction/back_pleat`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | No pleat | R | 기록만 |
| box | Box pleat | R | 기록만 |
| side | Side pleats | R | 기록만 |
| locker_loop | Center pleat with locker loop | R | 기록만 |

### `/garment/category/top/construction/side_panel`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | No side panel | R | 기록만 |
| side_panel | Side panels | R | 기록만 |
| gusset | Underarm gusset | R | 기록만 |
| side_rib | Side rib inserts | R | 기록만 |

### `/garment/category/top/construction/shoulder`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| standard | Standard shoulder | R | 기록만 |
| drop | Dropped shoulder | R | 기록만 |
| forward | Forward shoulder seam | R | 기록만 |
| saddle | Saddle shoulder | R | 기록만 |

### `/garment/category/top/construction/lining`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | Unlined | R | 기록만 (신규) |
| half | Half lining | R | 기록만 (신규) |
| full | Full lining | R | 기록만 (신규) |
| mesh | Mesh lining | R | 기록만 (신규) |
| quilted | Quilted lining | R | 기록만 (신규) |
| sherpa | Sherpa lining | R | 기록만 (신규) |
| fleece | Fleece lining | R | 기록만 (신규) |

### `/garment/category/top/construction/insulation`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | No padding | R | 기록만 (신규) |
| light_padding | Light padding | R | 기록만 (신규) |
| channel_quilt | Channel quilted padding | R | 기록만 (신규) |
| diamond_quilt | Diamond quilted padding | R | 기록만 (신규) |
| heavy_down | Heavy down | R | 기록만 (신규) |

### `/garment/category/top/construction/waist_detail`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | None | R | 기록만 (신규) |
| drawcord_waist | Waist drawcord | R | 기록만 (신규) |
| elastic_waist | Elastic waist | R | 기록만 (신규) |
| belt | Belt | R | 기록만 (신규) |
| cinch_tabs | Side cinch tabs | R | 기록만 (신규) |

### `/garment/category/top/construction/epaulette`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | None | R | 기록만 (신규) |
| epaulettes | Epaulettes | R | 기록만 (신규) |

### `/garment/category/top/construction/storm_flap`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | None | R | 기록만 (신규) |
| front_flap | Front storm flap | R | 기록만 (신규) |
| gun_flap | Gun flap | R | 기록만 (신규) |

### `/garment/category/top/construction/back_vent`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | No vent | R | 기록만 (신규) |
| center_vent | Center vent | R | 기록만 (신규) |
| side_vents | Side vents | R | 기록만 (신규) |

### `/garment/category/top/stitching/seam_type`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| overlock | Overlock | R | 기록만 |
| double_needle | Double needle | R | 기록만 |
| flatlock | Flatlock | R | 기록만 |
| single_needle | Single needle | R | 기록만 |
| coverstitch | Coverstitch | R | 기록만 |
| french_seam | French seam | R | 기록만 |

### `/garment/category/top/stitching/thread_color`

색 31개, 모두 J (JS 색. 2026-10-31 brown, dark_brown, khaki, yellow, mint 추가)

### `/garment/category/top/stitching/thread_color/contrast/contrast_thread_color`

색 31개, 모두 J (JS 색. 2026-10-31 brown, dark_brown, khaki, yellow, mint 추가)

### `/garment/category/top/stitching/topstitch`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | None | R | 기록만 |
| single | Single topstitch | R | 기록만 |
| double | Double topstitch | R | 기록만 |

### `/garment/category/top/surface/surface_pattern`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| solid | Solid | J | JS 무늬 |
| heather | Heather melange | J | JS 무늬 |
| stripe | Stripes | J | JS 무늬 |

### `/garment/category/top/surface/surface_pattern/stripe/stripe_direction`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| horizontal | Horizontal | J | JS 무늬 |
| vertical | Vertical | J | JS 무늬 |
| diagonal | Diagonal | J | JS 무늬 |

### `/garment/category/top/surface/surface_pattern/stripe/stripe_color`

색 31개, 모두 J (JS 색. 2026-10-31 brown, dark_brown, khaki, yellow, mint 추가)

### `/garment/category/top/surface/surface_pattern`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| check | Check / plaid | J | JS 무늬 |

### `/garment/category/top/surface/surface_pattern/check/check_type`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| gingham | Gingham | J | JS 무늬 |
| tartan | Tartan | J | JS 무늬 |
| buffalo | Buffalo check | J | JS 무늬 |
| windowpane | Windowpane | J | JS 무늬 |
| houndstooth | Houndstooth | J | JS 무늬 |

### `/garment/category/top/surface/surface_pattern/check/check_scale`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| small | Small | J | JS 무늬 |
| medium | Medium | J | JS 무늬 |
| large | Large | J | JS 무늬 |

### `/garment/category/top/surface/surface_pattern/check/check_color`

색 31개, 모두 J (JS 색. 2026-10-31 brown, dark_brown, khaki, yellow, mint 추가)

### `/garment/category/top/surface/surface_pattern`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| graphic | Graphic print | R | 기록만 (무늬 없음) |

### `/garment/category/top/surface/surface_pattern/graphic/print_position`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| chest_center | Center chest | R | 기록만 |
| left_chest | Left chest | R | 기록만 |
| full_front | Full front | R | 기록만 |
| back | Back | R | 기록만 |
| back_neck | Back neck | R | 기록만 |
| sleeve | Sleeve | R | 기록만 |

### `/garment/category/top/surface/surface_pattern/graphic/print_method`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| screen | Screen print | R | 기록만 |
| puff | Puff print | R | 기록만 |
| dtg | Direct to garment | R | 기록만 |
| heat_transfer | Heat transfer | R | 기록만 |
| discharge | Discharge print | R | 기록만 |
| embroidery | Embroidery | R | 기록만 |

### `/garment/category/top/surface/surface_pattern/graphic/print_size`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| small | Small | R | 기록만 |
| medium | Medium | R | 기록만 |
| large | Large | R | 기록만 |

### `/garment/category/top/surface/surface_pattern/graphic/print_color`

색 31개, 모두 J (JS 색. 2026-10-31 brown, dark_brown, khaki, yellow, mint 추가)

### `/garment/category/top/surface/surface_pattern`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| all_over | All-over print | R | 기록만 (무늬 없음) |

### `/garment/category/top/surface/surface_pattern/all_over/motif`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| floral | Floral | R | 기록만 |
| camo | Camouflage | R | 기록만 |
| abstract | Abstract | R | 기록만 |
| logo_repeat | Logo repeat | R | 기록만 |
| paisley | Paisley | R | 기록만 |
| polka_dot | Polka dots | R | 기록만 |

### `/garment/category/top/surface/surface_pattern`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| tie_dye | Tie-dye | R | 기록만 (무늬 없음) |

### `/garment/category/top/surface/surface_pattern/tie_dye/tie_dye_style`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| spiral | Spiral | R | 기록만 |
| crumple | Crumple | R | 기록만 |
| dip | Dip dye | R | 기록만 |
| ice | Ice dye | R | 기록만 |

### `/garment/category/top/surface/finish`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | No treatment | J | JS 가공 표현 |
| garment_wash | Garment washed | J | JS 가공 표현 |
| enzyme_wash | Enzyme washed | J | JS 가공 표현 |
| acid_wash | Acid wash | J | JS 가공 표현 |
| pigment_dye | Pigment dyed | J | JS 가공 표현 |
| brushed | Brushed surface | J | JS 가공 표현 |
| distressed | Distressed | J | JS 가공 표현 |

### `/garment/category/top/surface/finish/distressed/distress_level`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| light | Light | R | 기록만 |
| heavy | Heavy | R | 기록만 |

### `/garment/category/top/decoration/decoration`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| none | None | R | 기록만 |
| embroidery | Embroidery | R | 기록만 |

### `/garment/category/top/decoration/decoration/embroidery/embroidery_position`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| left_chest | Left chest | R | 기록만 |
| center_chest | Center chest | R | 기록만 |
| sleeve | Sleeve | R | 기록만 |
| back | Back | R | 기록만 |
| hem | Hem | R | 기록만 |

### `/garment/category/top/decoration/decoration/embroidery/embroidery_size`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| small | Small | R | 기록만 |
| medium | Medium | R | 기록만 |
| large | Large | R | 기록만 |

### `/garment/category/top/decoration/decoration/embroidery/embroidery_color`

색 31개, 모두 J (JS 색. 2026-10-31 brown, dark_brown, khaki, yellow, mint 추가)

### `/garment/category/top/decoration/decoration`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| patch | Patch | R | 기록만 |

### `/garment/category/top/decoration/decoration/patch/patch_type`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| woven | Woven patch | R | 기록만 |
| chenille | Chenille patch | R | 기록만 |
| leather | Leather patch | R | 기록만 |
| rubber | Rubber patch | R | 기록만 |

### `/garment/category/top/decoration/decoration/patch/patch_position`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| left_chest | Left chest | R | 기록만 |
| sleeve | Sleeve | R | 기록만 |
| hem | Hem | R | 기록만 |
| back | Back | R | 기록만 |

### `/garment/category/top/decoration/decoration`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| hem_label | Hem flag label | R | 기록만 |
| lettering | Lettering | R | 기록만 |

### `/garment/category/top/decoration/decoration/lettering/lettering_style`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| print | Printed | R | 기록만 |
| embroidery | Embroidered | R | 기록만 |
| felt | Felt applique | R | 기록만 |
| puff | Puff print | R | 기록만 |

### `/garment/category/top/decoration/decoration/lettering/lettering_position`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| chest | Chest | R | 기록만 |
| back | Back | R | 기록만 |
| sleeve | Sleeve | R | 기록만 |

### `/garment/category/top/decoration/neck_label`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| woven | Woven label | R | 기록만 |
| printed | Printed label | R | 기록만 |
| none | No label | R | 기록만 |

### `/garment/category`

| 선택지 | 이름 | 표시 | 상태 |
|---|---|---|---|
| bottom | Bottom | R | 기록만 |
| dress | Dress | R | 기록만 |
| outerwear | Outerwear | R | 기록만 |

## 채워 넣기 우선순위 (제안, 확정 아님)

1. closure: asymmetric_zip, quarter_zip, hidden_zip, double_breasted (지퍼와 여밈 위치는 앞판 분할선과 직결)
2. neck: rider_collar, notched_lapel, shawl_collar (라펠이 있는 칼라)
3. sleeve: puff, bishop, bell (소매 패턴 곡선만 바꾸면 됨)
4. 원단 질감: silk_satin, velvet, wool_tweed, mesh (JS 렌더러 표만 추가)
5. 나머지 R (안감, 패딩, 허리, 견장 등)

