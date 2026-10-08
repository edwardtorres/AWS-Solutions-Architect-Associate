import type { FamilyId } from './types';

export interface FamilyInfo {
  id: FamilyId;
  name: string;
}

export const FAMILIES: readonly FamilyInfo[] = [
  { id: 'security-identity', name: 'Security & Identity' },
  { id: 'networking-content-delivery', name: 'Networking & Content Delivery' },
  { id: 'compute', name: 'Compute' },
  { id: 'storage', name: 'Storage' },
  { id: 'database', name: 'Database' },
  { id: 'application-integration', name: 'Application Integration' },
  { id: 'analytics', name: 'Analytics' },
  { id: 'management-governance', name: 'Management & Governance' },
  { id: 'migration', name: 'Migration' },
];

export const FAMILY_NAME: Record<FamilyId, string> = Object.fromEntries(FAMILIES.map((f) => [f.id, f.name])) as Record<
  FamilyId,
  string
>;

/**
 * Maps the exam guide's in-scope service categories onto the nine study families.
 * `null` = no family (Machine Learning, Media Services). Documented deviation: the
 * nine families have no home for Cost Management, Containers, Serverless or
 * Developer Tools, so they fold into the closest family.
 */
export const CATEGORY_TO_FAMILY: Record<string, FamilyId | null> = {
  Analytics: 'analytics',
  'Application Integration': 'application-integration',
  'AWS Cost Management': 'management-governance',
  Compute: 'compute',
  Containers: 'compute',
  Database: 'database',
  'Developer Tools': 'management-governance',
  'Front-End Web and Mobile': 'application-integration',
  'Machine Learning': null,
  'Management and Governance': 'management-governance',
  'Media Services': null,
  'Migration and Transfer': 'migration',
  'Networking and Content Delivery': 'networking-content-delivery',
  'Security, Identity, and Compliance': 'security-identity',
  Serverless: 'compute',
  Storage: 'storage',
};

/** Services the guide lists under two categories (so either family is acceptable). */
export const SERVICE_EXTRA_FAMILIES: Record<string, FamilyId[]> = {
  'Amazon Redshift': ['analytics', 'database'],
};
