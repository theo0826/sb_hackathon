# Reusable garment masters

## Active model: `garment-masters-v2.glb`

Three Y-up, independently editable roots: `GARMENT_tee`, `GARMENT_hoodie`,
`GARMENT_varsity`. The body and sleeves now share a continuous subdivided mesh.
The base meshes are the CC0 MakeHuman Community shirt by MakeHuman/Elvaerwyn and
fisherman sweater by Margaret Toigo (MRT). Hood, pocket, ribs, varsity seam cuts
and snaps are adaptations prepared in this project.

Source and license records: `assets/garment-sources/README.md` and accompanying
`.mhclo` files. Offline build: `node tools/build-garment-masters.mjs`.
The model is approximately 2.56 MB, with UVs, smooth normals and embedded geometry.
No remote textures, decoders, AI calls or external model-hosting requests are needed.
The home animation and design editor use this same model.

Each preview owns cloned geometry/materials and its fabric texture. A cached spatial
index projects print vertices onto the actual front/back triangles, including the
hoodie's pocket, without raycasting the entire garment on each edit. Original UVs
remain available; customer print coordinates and factory pattern conversion stay
in `lib/production-mapping.ts` and have not been replaced by the mesh UV layout.

These remain static visual previews: no cloth simulation, size grading or cutting
approval is implied. See `docs/GARMENT-MODEL-UPGRADE.md` for verification.

## Previous Higgsfield export (inactive reference)

`garment-masters.glb` contains three static, independently editable roots:
`GARMENT_tee`, `GARMENT_hoodie`, `GARMENT_varsity`.

Created in the private Higgsfield 3D Jutsu project for Seongbuk Fit, revision 3.
No user photos, API keys, emails or order records were uploaded. The file is self-contained,
without external texture URLs. It is served from this local Next.js server; the running
site does not contact Higgsfield. The server must remain bound to loopback.

The Blender source uses metres and Z up. The browser preserves its converted root rotation
and uses scale `1 / .34` to match the existing preview coordinate convention. Material names
`Fabric` and `Rib` accept the customer's colour. The body is separately named for print projection.
Each viewer clones geometry and materials; disposal does not affect the cached master.

These are visual garment mockups, not measurement-accurate patterns, graded sizes, a cloth
simulation, or verified cutting files. Customer UV and factory sewing pattern conversions remain
separate in `lib/production-mapping.ts`.
