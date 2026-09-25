/** Free practice never accepts or writes a scheduler state. */
export function shuffleCards<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function advanceFreeQueue<T>(queue: T[], passed: boolean): T[] {
  if (!queue.length) return queue;
  return passed ? queue.slice(1) : [...queue.slice(1), queue[0]];
}
