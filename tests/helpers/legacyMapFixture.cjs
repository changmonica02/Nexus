const path=require('node:path');
// Existing fork tests continue to create native legacy projects, independently
// of the product's new default creation flow (covered by globalMapEditor).
exports.legacyMapCreatorPlugin={name:'legacy-map-fixture',setup(build){
 build.onResolve({filter:/WorldMapCreator$/},()=>({path:path.join(__dirname,'../fixtures/AzgaarMapCreator.tsx')}));
}};
