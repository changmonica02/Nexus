// Nexus owns loading status. Keep this seam for native generation and heightmap tools.
export function showLoading(): void {
  document.getElementById("optionsContainer")?.setAttribute("aria-busy", "true");
}
export function hideLoading(): void {
  document.getElementById("optionsContainer")?.removeAttribute("aria-busy");
}
