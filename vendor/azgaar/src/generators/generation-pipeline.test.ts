// @vitest-environment jsdom
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import "./pack-generator";
import { Coordinates } from "./coordinates";
import { GenerationPipeline } from "./generation-pipeline";

beforeEach(()=>{vi.stubGlobal("pack",{});vi.stubGlobal("INFO",false);vi.stubGlobal("TIME",false);vi.stubGlobal("performance",{now:()=>0,measure:()=>{}});});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("a new world clears the previous map's collections before rebuilding its graph", async () => {
  const noop = () => {};
  vi.stubGlobal("Grid", { prepare: noop, addDeepDepressionLakes: noop, openNearSeaLakes: noop });
  vi.stubGlobal("HeightmapGenerator", { generate: noop });
  vi.stubGlobal("Features", { markupGrid: noop });
  vi.stubGlobal("Temperature", { generate: noop });
  vi.stubGlobal("Precipitation", { generate: noop });
  vi.spyOn(Coordinates, "generate").mockImplementation(noop);
  const previous = {
    relief: [{ type: "mount", x: 10, y: 10, s: 5 }],
    journeys: [{ i: 0, name: "Previous quest", segments: [] }],
    markers: [{ i: 1, lock: true }]
  };
  vi.stubGlobal("pack", previous);
  let next: typeof pack | undefined;
  vi.spyOn(Pack, "generate").mockImplementation(() => {
    next = pack;
    throw new Error("Stop at the new graph");
  });

  await expect(GenerationPipeline.run({})).rejects.toThrow("Stop at the new graph");

  expect(next).not.toBe(previous);
  expect(next).toEqual({});
  expect(previous.journeys[0].name).toBe("Previous quest");
});


test("natural generation runs geography with no civilization or economic generators", async () => {
  const {NaturalGenerationPipeline}=await import('./generation-pipeline');
  const calls:string[]=[];
  const module=(name:string,methods:string[])=>Object.fromEntries(methods.map(method=>[method,()=>calls.push(name+'.'+method)]));
  vi.stubGlobal('Grid',module('Grid',['prepare','addDeepDepressionLakes','openNearSeaLakes']));
  for(const name of ['HeightmapGenerator','Temperature','Precipitation','Biomes','Ice'])vi.stubGlobal(name,module(name,['generate']));
  vi.stubGlobal('Features',module('Features',['markupGrid','markupPack','defineGroups']));
  vi.stubGlobal('Measurers',module('Measurers',['createDefaultRuler']));
  vi.stubGlobal('Rivers',{generate:()=>calls.push('Rivers.generate')});
  vi.spyOn(Coordinates,'generate').mockImplementation(()=>{});
  vi.spyOn(Pack,'generate').mockImplementation(()=>{pack.cells={i:[0,1,2]} as typeof pack.cells;pack.features=[];pack.rivers=[];});
  for(const name of ['Cultures','Burgs','States','Religions','Routes','Goods','Markets','Production','Military','Zones','Markers','Journeys'])
    vi.stubGlobal(name,new Proxy({}, {get:()=>()=>{throw Error('Civilization generator called: '+name);}}));
  await NaturalGenerationPipeline.run({});
  expect(calls).toContain('Rivers.generate');expect(calls).toContain('Biomes.generate');
  expect(pack.cultures.map(c=>c.i)).toEqual([0]);expect(pack.states.map(s=>s.i)).toEqual([0]);
  expect(pack.religions.map(r=>r.i)).toEqual([0]);expect(pack.routes).toEqual([]);expect(pack.markets).toEqual([]);
  expect(Array.from(pack.cells.pop)).toEqual([0,0,0]);expect(Array.from(pack.cells.culture)).toEqual([0,0,0]);
});
