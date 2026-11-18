# Continents-first generator: stage 1 (experimental)

This is an isolated prototype at `experiments/spherical-grid/continent-layout-v2.mjs`.
It does not replace the existing editor or change stored `nexus-global-map` v1 settings,
snapshots, or worldMap worker. There is NO automatic preview generation.

## Public API
- `planContinentalAreas(seed, worldType)`
- `generateContinentsFirst({seed,worldType})` where `worldType` is
  `ocean`, `earthlike`, or `land`.

## Rules
- Ocean: four continents; large 6–9% of total planet area (0–1),
  large-medium 4–6% (1–2), medium 2.5–4% (remaining).
- Earthlike: six continents; large 7.5–11% (0–1),
  large-medium 5–7.5% (2), medium 3.3–5% (remaining),
  small-medium 1.5–3.3% (1–2).
- Land: six continents; large 11–16% (1),
  large-medium 7–11% (2), medium 4.5–7% (2),
  small-medium 1.5–3.3% (1).
- All percentages refer to **the entire spherical surface**, not just land.
- Area budgets are sampled independently per continent and fitted using actual
  weighted spherical Grid-cell areas, not projected template bounding boxes.
- The **visible non-overlapping area** of every accepted continent must stay
  within its size class. Existing-occupancy overlap <=18%; pairwise overlap
  <=12% of the smaller continental footprint. Failed placements are retried;
  no invalid fallback is accepted.
- Only Azgaar continent recipes are used: continents, pangea, oldWorld,
  shattered. Each candidate must have a dominant connected land component.
- There is no mandatory global 25/32/45% target, background continent halo
  or rank-based forced sea-level filling.
- Ocean baseline is negative. Islands and archipelagos are not generated
  in this stage. Plate/seabed generation is not yet connected.
- A failed size/placement should throw rather than report a partially
  completed map as successful.

## Caveats and next steps
- Grid resolution is 36,002 cells: boundaries are necessarily coarse.
- Strict overlap is not equivalent to a full narrow-isthmus, strait
  preservation or land-bridge diagnostic. Add connectivity/strait analysis
  before switching the editor to the new generator.
- Current worker, UI form, old `landPercent` and `continentCores`
  settings intentionally remain on the legacy generator during review.
- After stage-one acceptance: stage 2 adds the user-specified two island
  classes and archipelago budgets, followed by stage 3 tectonics/seabed.
- Request images explicitly to run the manual-only preview workflow.
