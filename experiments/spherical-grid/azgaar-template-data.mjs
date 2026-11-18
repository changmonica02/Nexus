// Template scripts adapted from Azgaar's Fantasy Map Generator (MIT).
// Copyright 2017-2024 Max Haniyeu (Azgaar).
// See azgaar-template-LICENSE.txt for the original license and attribution.
// Source: https://github.com/Azgaar/Fantasy-Map-Generator/blob/master/src/data/heightmap-templates.ts
// These are recipes, not standalone geographical objects.
export const AZGAAR_TEMPLATE_SCRIPTS = Object.freeze({
  "continents": "Hill 1 80-85 60-80 40-60\nHill 1 80-85 20-30 40-60\nHill 6-7 15-30 25-75 15-85\nMultiply 0.6 land 0 0\nHill 8-10 5-10 15-85 20-80\nRange 1-2 30-60 5-15 25-75\nRange 1-2 30-60 80-95 25-75\nRange 0-3 30-60 80-90 20-80\nStrait 2 vertical 0 0\nStrait 1 vertical 0 0\nSmooth 3 0 0 0\nTrough 3-4 15-20 15-85 20-80\nTrough 3-4 5-10 45-55 45-55\nPit 3-4 10-20 15-85 20-80\nMask 4 0 0 0",
  "pangea": "Hill 1-2 25-40 15-50 0-10\nHill 1-2 5-40 50-85 0-10\nHill 1-2 25-40 50-85 90-100\nHill 1-2 5-40 15-50 90-100\nHill 8-12 20-40 20-80 48-52\nSmooth 2 0 0 0\nMultiply 0.7 land 0 0\nTrough 3-4 25-35 5-95 10-20\nTrough 3-4 25-35 5-95 80-90\nRange 5-6 30-40 10-90 35-65",
  "oldWorld": "Range 3 70 15-85 20-80\nHill 2-3 50-70 15-45 20-80\nHill 2-3 50-70 65-85 20-80\nHill 4-6 20-25 15-85 20-80\nMultiply 0.5 land 0 0\nSmooth 2 0 0 0\nRange 3-4 20-50 15-35 20-45\nRange 2-4 20-50 65-85 45-80\nStrait 3-7 vertical 0 0\nTrough 6-8 20-50 15-85 45-65\nPit 5-6 20-30 10-90 10-90",
  "shattered": "Hill 8 35-40 15-85 30-70\nTrough 10-20 40-50 5-95 5-95\nRange 5-7 30-40 10-90 20-80\nPit 12-20 30-40 15-85 20-80",
  "volcano": "Hill 1 90-100 44-56 40-60\nMultiply 0.8 50-100 0 0\nRange 1.5 30-55 45-55 40-60\nSmooth 3 0 0 0\nHill 1.5 35-45 25-30 20-75\nHill 1 35-55 75-80 25-75\nHill 0.5 20-25 10-15 20-25\nMask 3 0 0 0",
  "highIsland": "Hill 1 90-100 65-75 47-53\nAdd 7 all 0 0\nHill 5-6 20-30 25-55 45-55\nRange 1 40-50 45-55 45-55\nMultiply 0.8 land 0 0\nMask 3 0 0 0\nSmooth 2 0 0 0\nTrough 2-3 20-30 20-30 20-30\nTrough 2-3 20-30 60-80 70-80\nHill 1 10-15 60-60 50-50\nHill 1.5 13-16 15-20 20-75\nRange 1.5 30-40 15-85 30-40\nRange 1.5 30-40 15-85 60-70\nPit 3-5 10-30 15-85 20-80",
  "lowIsland": "Hill 1 90-99 60-80 45-55\nHill 1-2 20-30 10-30 10-90\nSmooth 2 0 0 0\nHill 6-7 25-35 20-70 30-70\nRange 1 40-50 45-55 45-55\nTrough 2-3 20-30 15-85 20-30\nTrough 2-3 20-30 15-85 70-80\nHill 1.5 10-15 5-15 20-80\nHill 1 10-15 85-95 70-80\nPit 5-7 15-25 15-85 20-80\nMultiply 0.4 20-100 0 0\nMask 4 0 0 0",
  "peninsula": "Range 2-3 20-35 40-50 0-15\nAdd 5 all 0 0\nHill 1 90-100 10-90 0-5\nAdd 13 all 0 0\nHill 3-4 3-5 5-95 80-100\nHill 1-2 3-5 5-95 40-60\nTrough 5-6 10-25 5-95 5-95\nSmooth 3 0 0 0\nInvert 0.4 both 0 0",
  "archipelago": "Add 11 all 0 0\nRange 2-3 40-60 20-80 20-80\nHill 5 15-20 10-90 30-70\nHill 2 10-15 10-30 20-80\nHill 2 10-15 60-90 20-80\nSmooth 3 0 0 0\nTrough 10 20-30 5-95 5-95\nStrait 2 vertical 0 0\nStrait 2 horizontal 0 0"
});
export const CONTINENT_TEMPLATES = Object.freeze(['continents','pangea','oldWorld','shattered']);
export const ISLAND_TEMPLATES = Object.freeze(['volcano','highIsland','lowIsland','peninsula']);
export const ARCHIPELAGO_TEMPLATES = Object.freeze(['archipelago']);
