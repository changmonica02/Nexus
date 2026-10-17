/** Legacy exchange adapter only. Runtime/editor records use the single core_concept kind. */
export function mergeCoreConcepts<
  T extends {
    id: string;
    kind?: unknown;
    body?: unknown;
    sense_id?: unknown;
    entry_id?: unknown;
  },
>(rows: T[]): T[] {
  const result: T[] = [],
    groups = new Map<string, T[]>();
  for (const row of rows) {
    if (
      !["learning_decomposition", "mnemonic_scenario"].includes(
        String(row.kind),
      )
    ) {
      result.push(row);
      continue;
    }
    const key = JSON.stringify([row.entry_id ?? null, row.sense_id ?? null]);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  for (const group of groups.values()) {
    group.sort(
      (a, b) =>
        (a.kind === "learning_decomposition" ? 0 : 1) -
          (b.kind === "learning_decomposition" ? 0 : 1) ||
        a.id.localeCompare(b.id),
    );
    result.push({
      ...group[0],
      kind: "core_concept",
      body: group.map((r) => String(r.body ?? "")).join("\n\n"),
    });
  }
  return groups.size ? result.sort((a, b) => a.id.localeCompare(b.id)) : result;
}
