export type Grid={points:number[][];triangles:number[][];neighbors:number[][];heights:Int8Array;areas:Float64Array};
export function createLandLayout(settings:{seed:number;landPercent:number;continentCores:number}):{grid:Grid;oceanSeed:number;settings:unknown;stage:string};
