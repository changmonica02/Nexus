/** Binary review policy. Memory level and forgotten-box membership are independent. */
export type MemoryLevel = 'general' | 'fuzzy' | 'forgotten';
export type BinaryResponse = 1 | 3;
export interface BinaryReviewState {
  level: MemoryLevel;
  inForgottenBox: boolean;
}
export type BinaryIntervals = Record<MemoryLevel,[number,number]>;
export const defaultBinaryIntervals = ():BinaryIntervals => ({general:[60,604800],fuzzy:[60,259200],forgotten:[60,86400]});
export function binaryIntervalSeconds(level: MemoryLevel, rating: BinaryResponse, intervals:BinaryIntervals=defaultBinaryIntervals()): number {
  if (rating !== 1 && rating !== 3) throw new Error('Invalid binary response');
  const seconds=intervals[level][rating===1?0:1];
  if(!Number.isSafeInteger(seconds)||seconds<1||seconds>315360000)throw new Error('Invalid binary interval');
  return seconds;
}
/** Calculate duration from the pre-answer level; leaving the box never promotes memory. */
export function binaryReviewTransition(before: BinaryReviewState, rating: BinaryResponse, intervals:BinaryIntervals=defaultBinaryIntervals()) {
  const seconds = binaryIntervalSeconds(before.level, rating, intervals);
  if (rating === 1) return { level: 'forgotten' as const, inForgottenBox: true, seconds };
  const level: MemoryLevel = before.inForgottenBox ? 'forgotten' :
    before.level === 'forgotten' ? 'fuzzy' : 'general';
  return { level, inForgottenBox: false, seconds };
}
/** Existing classification is passed through without changing stored due dates. */
export function legacyBinaryReviewState(forgotten: boolean): BinaryReviewState {
  return { level: forgotten ? 'forgotten' : 'general', inForgottenBox: forgotten };
}
