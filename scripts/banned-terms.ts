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

export const BANNED_TERMS: readonly BannedTerm[] = [
  { term: 'GRS and GZRS synchronously', reason: 'Learn pages disagree on sync vs async replication to the secondary region (content/contradictions.json: c-azure-grs-sync-async).' },
  { term: 'request costs 80 percent', reason: 'AWS pages disagree on the S3 Express One Zone request-cost reduction (content/contradictions.json: c-s3-express-request-cost).' },
  { term: 'request costs 50 percent', reason: 'AWS pages disagree on the S3 Express One Zone request-cost reduction (content/contradictions.json: c-s3-express-request-cost).' },
];
