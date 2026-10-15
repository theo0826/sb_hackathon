# Garment model upgrade — 2026-10-15

The original preview assembled a torso, sleeve cylinders and separate trim pieces.
Its shoulder intersections and segmented folds were visible in the editor and home.

The active model is now a locally served GLB made from CC0 MakeHuman Community
garment assets. The main torso and sleeves share mesh topology, with smooth vertex
normals and subdivision performed once during asset preparation. Waist shaping is
looser; long sleeves relax toward the body. Added details include a fabric hood,
kangaroo pocket, rib cuffs/waist, contrasting varsity sleeves and snap buttons.
Varsity material boundaries cut through polygons to avoid stair-stepped seams.

The existing page layout, glass styling, logo and home animation choreography are
preserved. Both the home and editor now load the same masters. Studio environment
lighting is generated locally with Three.js RoomEnvironment, without a remote HDRI.

Artwork follows the actual mesh through a cached XY triangle index. This works
with GLTF multi-material groups and front/back viewing, and includes the pocket
as a print receiver. The projection cache is keyed by the immutable master; each
viewer still clones its disposable geometry/materials. The factory conversion
continues to use its existing frozen customer UV coordinates and mock templates.

Licensing/provenance: `assets/garment-sources/README.md`. Runtime asset:
`public/models/garment-masters-v2.glb`, approximately 2.56 MB. Rebuild offline with
`node tools/build-garment-masters.mjs`. No new runtime package was installed.

Verification covers self-contained assets, three upright garments, front/back
print placement, projected depth versus independent ray intersections, preserved
UV attributes and isolated resource disposal. Actual desktop/mobile browser views
are inspected for the editor and home. TypeScript, ESLint and production build
are checked separately.

Final results: model tests, TypeScript and ESLint pass. Webpack production build
passes (`npm run build -- --webpack`). The default Turbopack build repeatedly
fails when starting its CSS-processing child process, including outside the
sandbox; no build configuration was changed to conceal that limitation.
Home inspection at 1440/768/390 px: 0 FAIL, 2 existing WARN (nine animated
elements; italic logo mark). Editor desktop views and a 390 px back view were
visually inspected; no horizontal overflow was observed. Screenshots and report:
`.taste-skill/garment-upgrade/`. The existing glass/style exceptions were reused.
Visual critique: shoulder joins are continuous and the varsity seam is clean;
home choreography and responsive sizing remain intact. Surface folds and hood
construction are still simplified; this is a reusable prototype preview.

Limitations: the hood and varsity are visual adaptations of the long-sleeve mesh,
not scanned commercial garments. The asset is not a sewing pattern or a calibrated
fit/cloth simulation. No paid AI generation or deployment is part of this change.
