import type {Grid} from './land-generator.mjs';
export function exportGlobalTerrainSnapshot(state:{grid:Grid;oceanSeed:number;revision:number}):unknown;
export function importGlobalTerrainSnapshot(value:unknown):{grid:Grid;oceanSeed:number;revision:number;geography:{ocean:Uint8Array;gridCoastline:{start:number[];end:number[]}[]}};
