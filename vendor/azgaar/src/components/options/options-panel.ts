// The collapsible panel on the right and the sticked menu below it
import { showExportPane } from "@/components/options/io-panes";
import { changeViewMode } from "@/components/options/view-mode";
import { resetZoom } from "@/components/zoom";
import { Controllers } from "@/controllers";
import { ensureEl, findEl } from "@/utils/nodeUtils";

const TAB_CONTENT: Record<string, string> = {
  layersTab: "layersContent",
  styleTab: "styleContent",
  optionsTab: "optionsContent",
  toolsTab: "toolsContent"
};

export function showOptions(event?: Event): void {
  ensureEl("options").style.display = "block";
  ensureEl("optionsTrigger").style.display = "none";
  event?.stopPropagation();
}

export function hideOptions(event?: Event): void {
  ensureEl("options").style.display = "none";
  ensureEl("optionsTrigger").style.display = "block";
  event?.stopPropagation();
}

export function toggleOptions(event?: Event): void {
  if (ensureEl("options").style.display === "none") showOptions(event);
  else hideOptions(event);
}

/** Open the panel on the given tab */
export function openTab(id: string): void {
  showOptions();
  selectTab(id);
}

/** Show the clicked tab, hiding whichever was open. Tools swaps in the customization menu instead */
function selectTab(id: string): void {
  const active = ensureEl("options").querySelector(".tab > button.active");
  if (active?.id === id) return;
  if (active?.id === "styleTab") void Controllers.StyleEditor.close();

  active?.classList.remove("active");
  ensureEl(id).classList.add("active");
  for (const content of ensureEl("options").querySelectorAll<HTMLElement>(".tabcontent")) {
    content.style.display = "none";
  }

  const shown = id === "toolsTab" && customization === 1 ? "customizationMenu" : TAB_CONTENT[id];
  if (shown) ensureEl(shown).style.display = "block";
  if (id === "styleTab") void Controllers.StyleEditor.open();
}

/** Keep every `<x>Input` and its `<x>Output` showing the same value */
function onPanelInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (target.closest("[data-option]")) return;
  const { id, value } = target;

  if (id.endsWith("Input")) {
    const output = findEl<HTMLOutputElement>(`${id.slice(0, -5)}Output`);
    if (output) output.value = value;
  } else if (id.endsWith("Output")) {
    const input = findEl<HTMLInputElement>(`${id.slice(0, -6)}Input`);
    if (input) input.value = value;
  }
}

function initialize(): void {
  $("#optionsContainer").draggable({ handle: ".drag-trigger", snap: "svg", snapMode: "both" });
  $("#exitCustomization").draggable({ handle: "div" });
  $("#mapLayers").disableSelection();

  ensureEl("options")
    .querySelector("div.tab")
    ?.addEventListener("click", event => {
      const target = event.target as HTMLElement;
      if (target.tagName === "BUTTON") selectTab(target.id);
    });

  for (const id of ["options", "dialogs"]) {
    ensureEl(id).addEventListener("input", onPanelInput);
  }

  ensureEl("sticked").addEventListener("click", event => {
    const id = (event.target as HTMLElement).id;
    if (id === "exportButton") showExportPane();
    else if (id === "zoomReset") resetZoom(1000);
    else if (id === "searchButton") Controllers.Omnibar.open();
  });

  ensureEl("viewMode").addEventListener("click", changeViewMode);
}

initialize();

// Legacy seam: legacy hotkeys reach these by name from inline markup
declare global {
  // biome-ignore lint/suspicious/noRedeclare: legacy seam
  var toggleOptions: (event?: Event) => void;
  interface Window {
    showOptions: typeof showOptions;
    hideOptions: typeof hideOptions;
  }
}
window.toggleOptions = toggleOptions;
window.showOptions = showOptions;
window.hideOptions = hideOptions;

