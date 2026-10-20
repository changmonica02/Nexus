// @vitest-environment jsdom
import {describe,expect,it,vi} from 'vitest';
vi.mock('@/components/layers',()=>({Layers:{draw:vi.fn()}}));
vi.mock('@/components/zoom',()=>({constrainZoom:vi.fn(),setTranslateExtent:vi.fn(),setZoomExtent:vi.fn(),zoomTo:vi.fn()}));
vi.mock('@/renderers/draw-legend',()=>({fitLegendBox:vi.fn()}));
import {containScale,applyZoomExtent,useContainViewport} from './canvas';
import {setViewportSize} from './viewport';
import {setZoomExtent} from './zoom';
describe('Nexus complete map presentation',()=>{
 it.each([[390,600,1600,400],[390,600,400,1600],[1000,600,500,500],[820,1180,1600,900]])('contains all map edges in %s × %s', (vw,vh,w,h)=>{
   const scale=containScale(vw,vh,w,h);
   expect(w*scale).toBeLessThanOrEqual(vw+0.0001);
   expect(h*scale).toBeLessThanOrEqual(vh+0.0001);
   expect(Math.max(w*scale/vw,h*scale/vh)).toBeCloseTo(1);
 });
 it('uses the fit as floor without rewriting stored project or app preferences',()=>{
   const config={map:{graph:{width:1600,height:400}},app:{zoomExtent:{min:1,max:20}}};
   vi.stubGlobal('options',config);setViewportSize(390,600);
   const before=JSON.stringify(config);useContainViewport();applyZoomExtent();
   expect(setZoomExtent).toHaveBeenLastCalledWith(390/1600,20);
   expect(JSON.stringify(config)).toBe(before);
   vi.unstubAllGlobals();
 });
});
