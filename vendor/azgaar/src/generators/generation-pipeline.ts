// Canonical generation sequence, as a declared pipeline instead of a hand-written call list. See docs/architecture/generation-pipeline.md.
import { GraphOverride } from "@/generators/graph-override";
import { Pipeline, type PipelineStep } from "@/generators/pipeline";
import { Population } from "@/generators/population-generator";
import type { GridGraph } from "@/types/GridGraph";
import { Coordinates } from "./coordinates";

const generationPipelineSteps = [
  { id: "grid", run: ({ graph }) => Grid.prepare(graph) },
  { id: "heightmap", run: () => HeightmapGenerator.generate() },
  { id: "markupGrid", run: () => Features.markupGrid() },
  { id: "depressionLakes", run: () => Grid.addDeepDepressionLakes() },
  { id: "nearSeaLakes", run: () => Grid.openNearSeaLakes() },
  { id: "mapSize", run: () => Coordinates.generate() },
  { id: "temperatures", run: () => Temperature.generate() },
  { id: "precipitation", run: () => Precipitation.generate() },
  { id: "clearPack", run: () => Pack.clear() },
  { id: "clearGraphOverride", run: () => GraphOverride.clear() },
  { id: "regraph", run: () => Pack.generate() },
  { id: "markupPack", run: () => Features.markupPack() },
  { id: "defaultRuler", run: () => Measurers.createDefaultRuler() },
  { id: "rivers", run: () => Rivers.generate() },
  { id: "biomes", run: () => Biomes.generate() },
  { id: "featureGroups", run: () => Features.defineGroups() },
  { id: "ice", run: () => Ice.generate() },
  { id: "goods", run: () => Goods.generate() },
  { id: "rankCells", run: () => Population.rankCells() },
  { id: "cultures", run: () => Cultures.generate() },
  { id: "culturesExpand", run: () => Cultures.expand() },
  { id: "burgs", run: () => Burgs.generate() },
  { id: "states", run: () => States.generate() },
  { id: "routes", run: () => Routes.generate() },
  { id: "religions", run: () => Religions.generate() },
  { id: "burgsSpecify", run: () => Burgs.specify() },
  { id: "stateStatistics", run: () => States.collectStatistics() },
  { id: "stateForms", run: () => States.defineStateForms() },
  { id: "provinces", run: () => Provinces.generate() },
  { id: "provincePoles", run: () => Provinces.getPoles() },
  { id: "riversSpecify", run: () => Rivers.specify() },
  { id: "featureNames", run: () => Features.defineNames() },
  { id: "markets", run: () => Markets.generate() },
  { id: "production", run: () => Production.produce() },
  { id: "taxes", run: () => States.collectTaxes() },
  { id: "military", run: () => Military.generate() },
  { id: "markers", run: () => Markers.generate() },
  { id: "zones", run: () => Zones.generate() },
  { id: "addedLabels", run: () => AddedLabels.initiate() },
  { id: "journeys", run: () => Journeys.generate() }
] as const satisfies PipelineStep<string, GenerationContext>[];

type GenerationPipelineStepId = (typeof generationPipelineSteps)[number]["id"];

export type GenerationContext = {
  graph?: GridGraph; // pre-created grid to use instead of generating one
};
export const GenerationPipeline = new Pipeline<GenerationPipelineStepId, GenerationContext>(
  "Generation Pipeline",
  generationPipelineSteps
);

/** Geography never calls a civilization/economy generator. Index zero means unassigned,
 * not a generated entity; keep the native indexed-array contract for old tools and IO. */
export function initializeEmptyCivilization(): void {
  const n = pack.cells.i.length;
  for (const key of ["culture", "burg", "state", "religion", "province", "good", "market"] as const)
    pack.cells[key] = new Uint16Array(n);
  pack.cells.s = new Int16Array(n);
  pack.cells.pop = new Float32Array(n);
  pack.cells.routes = {};
  pack.cultures = [{i: 0, name: "Wildlands", base: 1, shield: "round", type: "Generic"} as typeof pack.cultures[number]];
  pack.states = [{i: 0, name: "Neutrals", salesTax: 0, pollTax: 0, treasury: 0, provinces: []} as typeof pack.states[number]];
  pack.religions = [{i: 0, name: "No religion"} as typeof pack.religions[number]];
  pack.burgs = [0 as unknown as typeof pack.burgs[number]];
  pack.provinces = [0 as unknown as typeof pack.provinces[number]];
  pack.routes = []; pack.goods = []; pack.markets = []; pack.deals = [];
  pack.markers = []; pack.zones = []; pack.relief = []; pack.addedLabels = []; pack.journeys = [];
}

// Same geographic ordering as the canonical pipeline, with empty indexed collections
// initialized before rivers (names/editors may read culture zero).
export const naturalGenerationSteps: readonly PipelineStep<string, GenerationContext>[] = [
  ...generationPipelineSteps.slice(0, 13),
  {id: "emptyCivilization", run: initializeEmptyCivilization},
  ...generationPipelineSteps.slice(13, 17),
  {id: "naturalRiverNames", run: () => {
    for (const river of pack.rivers) {
      river.parent = Rivers.getParent(river.i); river.basin = Rivers.getBasin(river.i);
      river.name = `River ${river.i}`; river.type = "River";
    }
  }},
  {id: "naturalFeatureNames", run: () => {
    for (const feature of pack.features) if (feature && !feature.name) feature.name = `${feature.type} ${feature.i}`;
  }}
];
export const NaturalGenerationPipeline = new Pipeline("Natural Geography", naturalGenerationSteps);

const erasePipelineSteps = [
  { id: "markupGrid", run: () => Features.markupGrid() },
  { id: "depressionLakes", run: ({ erosion }) => erosion && Grid.addDeepDepressionLakes() },
  { id: "nearSeaLakes", run: ({ erosion }) => erosion && Grid.openNearSeaLakes() },
  { id: "temperatures", run: () => Temperature.generate() },
  { id: "precipitation", run: () => Precipitation.generate() },
  { id: "regraph", run: () => Pack.generate() },
  { id: "markupPack", run: () => Features.markupPack() },
  { id: "rivers", run: ({ erosion }) => Rivers.generate(erosion) },
  { id: "biomes", run: () => Biomes.define() },
  { id: "featureGroups", run: () => Features.defineGroups() },
  { id: "ice", run: () => Ice.generate() },
  { id: "goods", run: () => Goods.generate() },
  { id: "rankCells", run: () => Population.rankCells() },
  { id: "cultures", run: () => Cultures.generate() },
  { id: "culturesExpand", run: () => Cultures.expand() },
  { id: "burgs", run: () => Burgs.generate() },
  { id: "states", run: () => States.generate() },
  { id: "routes", run: () => Routes.generate() },
  { id: "religions", run: () => Religions.generate() },
  { id: "burgsSpecify", run: () => Burgs.specify() },
  { id: "stateStatistics", run: () => States.collectStatistics() },
  { id: "stateForms", run: () => States.defineStateForms() },
  { id: "provinces", run: () => Provinces.generate() },
  { id: "provincePoles", run: () => Provinces.getPoles() },
  { id: "riversSpecify", run: () => Rivers.specify() },
  { id: "featureNames", run: () => Features.defineNames() },
  { id: "markets", run: () => Markets.generate() },
  { id: "production", run: () => Production.produce() },
  { id: "taxes", run: () => States.collectTaxes() },
  { id: "military", run: () => Military.generate() },
  { id: "markers", run: () => Markers.generate() },
  { id: "zones", run: () => Zones.generate() }
] as const satisfies PipelineStep<GenerationPipelineStepId, EraseContext>[];

type EraseContext = { erosion: boolean };
export const ErasePipeline = new Pipeline<GenerationPipelineStepId, EraseContext>(
  "Erase Heightmap",
  erasePipelineSteps
);

declare global {
  // biome-ignore lint/suspicious/noRedeclare: exposed on window for legacy JS
  var GenerationPipeline: import("@/generators/pipeline").Pipeline<GenerationPipelineStepId, GenerationContext>;
}
window.GenerationPipeline = GenerationPipeline;

