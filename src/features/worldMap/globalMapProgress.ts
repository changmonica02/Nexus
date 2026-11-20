export const generationStages=['land','relief','tectonics','seafloor','islands','ocean','climate','hydrology','ecosystems','drawing','save','complete'] as const;
export type GenerationProgress={stage:typeof generationStages[number];fraction:number};
export function isGenerationProgress(value:unknown):value is GenerationProgress{
 const p=value as GenerationProgress;return !!p&&generationStages.includes(p.stage)&&Number.isFinite(p.fraction)&&p.fraction>=0&&p.fraction<=1;
}
const labels:Record<GenerationProgress['stage'],[string,string]>={land:['配置大陸與島群','Placing continents and islands'],relief:['塑造山脈與谷地','Shaping mountains and valleys'],tectonics:['推導板塊與地殼','Inferring plates and crust'],seafloor:['塑造海底地形','Shaping the seafloor'],islands:['生成火山島鏈','Generating volcanic island chains'],ocean:['推演表層洋流','Simulating surface currents'],climate:['計算十二個月氣候','Calculating twelve months of climate'],hydrology:['推導河流與湖泊','Routing rivers and lakes'],ecosystems:['推導生態分布','Deriving ecosystems'],drawing:['準備地圖顯示','Preparing map display'],save:['儲存世界觀與地圖','Saving world and map'],complete:['推演完成','World generation complete']};
export const generationStageLabel=(progress:GenerationProgress,language:string)=>labels[progress.stage][language==='zh-TW'?0:1];
