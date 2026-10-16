# CC0 garment source meshes

Downloaded 2026-10-15 from the MakeHuman Community **Shirts 01** pack:
https://static.makehumancommunity.org/assets/assetpacks/shirts01.html

Official archive: https://files2.makehumancommunity.org/asset_packs/shirts01/shirts01_cc0.zip

- `crude_male_shirt.obj`: MakeHuman, edited by Elvaerwyn. The accompanying
  `elvs_crude_t-shirt_male.mhclo` declares `# license CC0`.
- `sweater_fisherman.obj`: Margaret Toigo (MRT). The accompanying
  `toigo_fisherman_sweater.mhclo` declares `# license CC0`.

Only the two mesh assets are used. No MakeHuman application code or external textures
are included in the browser bundle. The metadata files are retained as provenance.

`node tools/build-garment-masters.mjs` runs entirely offline and produces
`public/models/garment-masters-v2.glb`. Changes include Catmull–Clark subdivision,
looser waist shaping, relaxed sleeves, restrained folds, rib bindings, a hood and
kangaroo pocket, and a varsity variant with cream sleeves and snap buttons.
These variants are project adaptations; they are not original MakeHuman products.

Source code repository: https://github.com/makehumancommunity/makehuman
Asset licensing: https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.ASSETS.md
CC0 terms: https://creativecommons.org/publicdomain/zero/1.0/
