/**
 * Disputed or unverified claims that must never appear in app text or questions.
 * Add an entry when two allowed sources disagree or a claim cannot be verified;
 * record the contradiction in content/contradictions.json so it can be shown both ways.
 */
export interface BannedTerm {
  /** Case-insensitive substring or phrase. */
  term: string;
  reason: string;
}

export const BANNED_TERMS: readonly BannedTerm[] = [];
