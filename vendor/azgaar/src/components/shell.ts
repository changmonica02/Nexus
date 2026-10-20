// The app window itself: the SVG layer scaffold, browser-level behaviours
import { alertDialog, confirmationDialog } from "@/components/dialog/dialog-helpers";
import { Layers } from "@/components/layers";
import { Pins } from "@/components/pins";
import { showDataTip } from "@/components/tooltips";
import { Controllers } from "@/controllers";
import { findEl } from "@/utils";
import { fitMapToScreen } from "./canvas";

/** Wire the window up: the svg layer scaffold and the browser-level behaviours around it. Called by boot() */
export function initShell(): void {
  Layers.init(); // create the svg layer groups the renderers draw into

  window.addEventListener("resize", onResize);
  window.addEventListener("vite:preloadError", onChunkLoadError);
  document.addEventListener("touchstart", onTitlebarButtonTouch, { capture: true, passive: true });
  initAssistantBubble();
}

/** Keep the next unpinned map request in step with the browser window. */
function onResize(): void {
  Options.set(config => {
    if (Pins.rolls("mapWidth") && window.innerWidth > 0) config.generation.graph.width = window.innerWidth;
    if (Pins.rolls("mapHeight") && window.innerHeight > 0) config.generation.graph.height = window.innerHeight;
  });
  fitMapToScreen();
}

/** The assistant's call button: always in the markup, shown only when the preference says so */
function initAssistantBubble(): void {
  const bubble = findEl("assistantBubble");
  if (!bubble) return;

  bubble.addEventListener("click", () => Controllers.Assistant.toggle());
  bubble.addEventListener("mouseover", showDataTip);
}

/**
 * touch-punch preventDefaults touch sequences started on a dialog titlebar (the drag handle),
 * so taps on the titlebar buttons never produce a click. Stop the sequence from reaching it
 */
function onTitlebarButtonTouch(event: TouchEvent): void {
  const target = event.target as HTMLElement | null;
  if (target?.closest?.(".ui-dialog-titlebar button")) event.stopPropagation();
}

/**
 * Each release replaces the content-hashed chunk files on the server, so a page opened before
 * the release 404s when it lazy-loads a chunk it has not requested yet ("Failed to fetch
 * dynamically imported module"). Offer a reload to pick up the new build. Offline the same error
 * means the chunk was never precached (it was not in the build the worker installed), so say that
 */
function onChunkLoadError(): void {
  if (!navigator.onLine) {
    alertDialog({
      title: "You are offline",
      message: "This part of the app was not downloaded before the connection was lost. Reconnect and try again"
    });
    return;
  }

  confirmationDialog({
    title: "New version released",
    message:
      "This part of the app failed to load because a new version was released while the page was open.<br />Reload the page to get the new version. If you have unsaved changes, save the map first",
    confirm: "Reload",
    cancel: "Not now",
    onConfirm: () => {
      location.reload();
    }
  });
}

/** The app is a static site, but it fetches assets: opening index.html from disk cannot work */
export function warnIfServerless(): boolean {
  if (location.hostname) return false;

  const wiki = "https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Run-FMG-locally";
  alertDialog({
    title: "Loading error",
    width: "28em",
    message: /* html */ `Fantasy Map Generator cannot run serverless. Follow the <a href="${wiki}" target="_blank">instructions</a> on how you can easily run a local web-server`
  });
  return true;
}
