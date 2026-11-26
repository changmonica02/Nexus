function exchangeCategory(item) {
  if (
    item.status === "stale" ||
    item.issues.some((i) =>
      ["revision_conflict", "preview_changed"].includes(i.type),
    )
  )
    return "conflict";
  if (item.issues.some((i) => i.type === "invalid")) return "invalid";
  if (item.bucket === "review") return "review";
  return item.safeAction === "new"
    ? "new"
    : item.safeAction === "unchanged"
      ? "unchanged"
      : "modified";
}

module.exports = { exchangeCategory };
