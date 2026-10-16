/** Retained IndexedDB store names only. No Quiz UI, listeners, retries or uploads.
 * Historical records and offline decisions remain untouched for future explicit recovery. */
export const QUIZ_STORES = ["quiz_attempts", "quiz_states", "quiz_outbox"];
