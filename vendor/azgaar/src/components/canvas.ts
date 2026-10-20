import { select } from "d3";
import { Layers } from "@/components/layers";
import { setViewportSize, viewport } from "@/components/viewport";
import { constrainZoom, setTranslateExtent, setZoomExtent, zoomTo } from "@/components/zoom";
import { fitLegendBox } from "@/renderers/draw-legend";
import { findEl } from "@/utils/nodeUtils";

// Transient Nexus presentation only. Never serialize this flag or overwrite project preferences.
let containViewport = false;
export function useContainViewport(): void { containViewport = true; }
export function containScale(width: number, height: number, mapWidth: number, mapHeight: number): number {
  return Math.min(width / mapWidth, height / mapHeight);
}

/** Resize everything that covers the whole map to the graph extent */
export function applyGraphSize(): void {
  const { width, height } = options.map.graph;

  const cover = (selector: string, child: string) =>
    select(selector).selectAll(child).attr("x", 0).attr("y", 0).attr("width", width).attr("height", height);

  cover("#landmass", "rect");
  cover("#oceanPattern", "rect");
  cover("#oceanLayers", "rect");
  cover("#fogging", "rect");
  select("#deftemp").select("mask#fog > rect").attr("width", width).attr("height", height);
  select("#deftemp").select("mask#water > rect").attr("width", width).attr("height", height);
}

/**
 * The zoom floor is the scale at which the map covers the viewport, derived from the two of them:
 * a map larger than the window zooms out until it fits, a smaller one in until it covers. It is
 * also what the panel shows, so the control never claims a limit the canvas does not enforce.
 * Rounded up, so the rounding itself cannot leave a hairline of canvas at the edge
 */
export function applyZoomExtent(): void {
  const { width, height } = options.map.graph;
  if (containViewport) {
    const fit = containScale(viewport.width, viewport.height, width, height);
    setZoomExtent(fit, Math.max(fit, options.app.zoomExtent.max));
    constrainZoom();
    return;
  }
  const cover = Math.ceil(Math.max(viewport.width / width, viewport.height / height) * 1000) / 1000;

  Options.set(o => (o.app.zoomExtent.min = cover));
  const input = findEl<HTMLInputElement>("zoomExtentMin");
  if (input) input.value = String(cover);

  setZoomExtent(cover, options.app.zoomExtent.max);
  constrainZoom(); // d3 applies a new extent to gestures only; the current view has to be pulled in
}

/** Set the map window on screen and re-fit everything drawn in screen space */
export function setViewport(width: number, height: number): void {
  setViewportSize(width, height);
  select("#map").attr("width", viewport.width).attr("height", viewport.height);

  setTranslateExtent(0, 0, options.map.graph.width, options.map.graph.height);
  applyZoomExtent();

  const showViewport = (id: string, value: number) => {
    const input = findEl<HTMLInputElement>(id);
    if (input) input.value = String(value);
  };
  showViewport("viewportWidth", viewport.width);
  showViewport("viewportHeight", viewport.height);

  Layers.draw("scaleBar");
  fitLegendBox();
}

/**
 * The viewport a map opens at, and the one a window resize settles on: the size the user set if
 * they set one, otherwise the whole browser window. The extent does not bound it - a map smaller
 * than the window is scaled up to cover it, never letterboxed
 */
export function fitMapToScreen(): void {
  const kept = containViewport ? null : options.app.viewport;
  const wanted = kept ?? { width: window.innerWidth, height: window.innerHeight };

  // a hidden or headless tab reports no size, which would collapse the viewport
  const width = wanted.width > 0 ? wanted.width : options.map.graph.width;
  const height = wanted.height > 0 ? wanted.height : options.map.graph.height;
  const previous = {x:(viewport.width/2-viewport.x)/viewport.scale,y:(viewport.height/2-viewport.y)/viewport.scale,scale:viewport.scale};
  const atFit = Math.abs(viewport.scale-containScale(viewport.width,viewport.height,options.map.graph.width,options.map.graph.height))<0.001;
  setViewport(width, height);
  if (containViewport) zoomTo(atFit?options.map.graph.width/2:previous.x,atFit?options.map.graph.height/2:previous.y,atFit?containScale(width,height,options.map.graph.width,options.map.graph.height):previous.scale,0);
}

