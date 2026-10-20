// @vitest-environment jsdom
import {afterEach,expect,test,vi} from 'vitest';
import {existsSync} from 'node:fs';
import {Layers} from '@/components/layers';
import {drawHeightmapView as drawHeightmap} from '@/renderers/draw-heightmap';
import {naturalCatalog,naturalConfig,previewNaturalHeightmap,applyNaturalView} from './nexus-natural';
vi.mock('@/components/layers',()=>({Layers:{set:vi.fn()}}));
vi.mock('@/renderers/draw-heightmap',()=>({drawHeights:()=> 'data:image/png;base64,AA==',drawHeightmapView:vi.fn()}));
vi.mock('@/renderers/heightmap-color-schemes',()=>({HeightmapColorSchemes:{get:()=>()=> '#000'}}));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
test('all 14 procedural scripts and 23 precreated raster resources are selectable',()=>{
 const all=naturalCatalog();expect(all.filter(t=>t.kind==='procedural')).toHaveLength(14);
 const rasters=all.filter(t=>t.kind==='precreated');expect(rasters).toHaveLength(23);
 for(const t of rasters)expect(existsSync(`public/heightmaps/${t.id}.png`),t.id).toBe(true);
 expect(new Set(all.map(t=>t.id)).size).toBe(37);
});
test('invalid sources and excessive resources fail before generating',()=>{
 for(const input of [{template:'missing'},{width:0},{height:5000},{points:100000},{equator:Infinity},{precipitation:-1}])expect(()=>naturalConfig(input)).toThrow();
 expect(naturalConfig({template:'world',seed:'unchanged'})).toMatchObject({naturalOnly:true,template:'world',seed:'unchanged'});
});
test('preview uses a separate grid and restores PRNG and retained generator references on failure',async()=>{
 const original=Math.random,current={cells:{h:[25]}},project={name:'manual'},clear=vi.fn();
 vi.stubGlobal('grid',current);vi.stubGlobal('pack',project);
 vi.stubGlobal('Grid',{generate:vi.fn(()=>{Math.random=()=>.1;return {cells:{h:[0]},cellsX:1,cellsY:1};})});
 vi.stubGlobal('HeightmapGenerator',{fromTemplate:()=>{throw Error('preview failed');},clearData:clear});
 await expect(previewNaturalHeightmap({template:'continents'})).rejects.toThrow('preview failed');
 expect(Math.random).toBe(original);expect(grid).toBe(current);expect(pack).toBe(project);expect(clear).toHaveBeenCalledOnce();
});
test('view and contour options change rendering without touching data or styles',()=>{
 vi.stubGlobal('options',{map:{}});
 const data={manualRivers:[{name:'custom'}]},style={heightmap:'manual'};vi.stubGlobal('pack',data);vi.stubGlobal('styles',style);
 applyNaturalView('contours',['rivers','borders','untrusted'],10,true);
 expect(Layers.set).toHaveBeenCalledWith(['heightmap','rivers','borders']);
 expect(drawHeightmap).toHaveBeenCalledWith({contourInterval:10,contourLabels:true});
 expect(pack).toBe(data);expect(styles).toBe(style);expect(data.manualRivers[0].name).toBe('custom');
});
