/** Binary review policy. Memory level and forgotten-box membership are independent. */
export type MemoryLevel = 'general' | 'fuzzy' | 'forgotten';
export type BinaryResponse = 1 | 3;
export interface BinaryReviewState {
  level: MemoryLevel;
  inForgottenBox: boolean;
}
export const BINARY_INTERVALS = { general: 604800, fuzzy: 259200, forgotten: 86400 } as const;
export function binaryIntervalSeconds(level: MemoryLevel, rating: BinaryResponse): number {
  if (rating === 1) return 60;
  if (rating !== 3) throw new Error('Invalid binary response');
  return BINARY_INTERVALS[level];
}
/** Calculate duration from the pre-answer level; leaving the box never promotes memory. */
export function binaryReviewTransition(before: BinaryReviewState, rating: BinaryResponse) {
  const seconds = binaryIntervalSeconds(before.level, rating);
  if (rating === 1) return { level: 'forgotten' as const, inForgottenBox: true, seconds };
  const level: MemoryLevel = before.inForgottenBox ? 'forgotten' :
    before.level === 'forgotten' ? 'fuzzy' : 'general';
  return { level, inForgottenBox: false, seconds };
}
/** Existing classification is passed through without changing stored due dates. */
export function legacyBinaryReviewState(forgotten: boolean): BinaryReviewState {
  return { level: forgotten ? 'forgotten' : 'general', inForgottenBox: forgotten };
}
