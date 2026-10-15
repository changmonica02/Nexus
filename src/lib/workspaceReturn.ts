/** Only local paths may be used as a trash return destination. Never loop into trash. */
export function trashReturn(from: string | null) {
  if (
    !from?.startsWith("/") ||
    from.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(from)
  )
    return "/";
  const url = new URL(from, "https://nexus.invalid");
  return url.origin === "https://nexus.invalid" &&
    url.pathname.replace(/\/+$/, "") !== "/trash"
    ? url.pathname + url.search + url.hash
    : "/";
}
