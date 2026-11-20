// Nexus global planet Grid contract, independently validated before editor integration.
// Frequency 60 => 10 * 60^2 + 2 = exactly 36,002 stable spherical cells.
import {RADIUS_KM} from './grid.mjs';
import {buildIrregularSphere} from '../../src/features/worldMap/core/irregularSphere.mjs';

export const GLOBAL_GRID_FREQUENCY = 60;
export const GLOBAL_GRID_CELLS = 36_002;
export const HEIGHT_MIN = -100;
export const HEIGHT_MAX = 100;
export const HEIGHT_METRES_PER_STEP = 100;
export const SEA_LEVEL = 0;
export const PLANET_RADIUS_KM = RADIUS_KM;
export const GRID_FORMAT_VERSION = 2;

let topology;
export function createGlobalGrid() {
 topology??=buildIrregularSphere(GLOBAL_GRID_FREQUENCY);
 const grid={points:topology.points.map(p=>p.slice()),triangles:topology.triangles.map(f=>f.slice()),neighbors:topology.neighbors.map(n=>n.slice()),areas:topology.areas.slice(),heights:new Float32Array(GLOBAL_GRID_CELLS)};
 if (grid.points.length !== GLOBAL_GRID_CELLS) throw Error('Global Grid cell-count contract failed');
 return grid;
}
export function assertGlobalGrid(grid) {
 if (!grid || grid.points?.length !== GLOBAL_GRID_CELLS ||
     grid.heights?.length !== GLOBAL_GRID_CELLS ||
     grid.neighbors?.length !== GLOBAL_GRID_CELLS ||
     grid.areas?.length !== GLOBAL_GRID_CELLS)
   throw RangeError('Expected the fixed 36,002-cell global Grid');
}
