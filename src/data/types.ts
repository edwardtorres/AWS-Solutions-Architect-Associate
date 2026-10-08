export type FamilyId =
  | 'security-identity'
  | 'networking-content-delivery'
  | 'compute'
  | 'storage'
  | 'database'
  | 'application-integration'
  | 'analytics'
  | 'management-governance'
  | 'migration';

/** The four exam domains are districts; foundations live in the Founders' Square. */
export type DistrictId = 'citadel' | 'harbor' | 'express' | 'treasury' | 'square';
export type IslandId = 'A' | 'B' | 'C';

/** planned = locked, surveyed = idle, under_construction = running, commissioned = certified. */
export type BuildingState = 'planned' | 'surveyed' | 'under_construction' | 'commissioned';

export type PortfolioTech = 's3-static-hosting' | 'cloudfront' | 'lambda' | 'api-gateway' | 'dynamodb';

export interface PortfolioTag {
  tech: PortfolioTech;
  /** How the tech appears in the SAA-level skill (never a basic definition). */
  note: string;
}

export interface AzureTag {
  /** The Azure service or concept, as named on the Microsoft Learn comparison page. */
  concept: string;
  /** The AWS service or concept it is compared with. */
  aws: string;
  /** Microsoft Learn comparison page, or null while the source is unverified. */
  sourceUrl: string | null;
  status: 'sourced' | 'needs-verification';
  /** Which earlier certification the Azure concept comes from. */
  background: 'AZ-900' | 'PL-300/DP-600';
}

export interface BuildingDef {
  id: string;
  /** Themed name. */
  name: string;
  /** The real skill, shown next to the themed name. */
  skill: string;
  district: DistrictId;
  /** Task statement id (e.g. "1.1"), or null for a Foundation. */
  task: string | null;
  /** Outline bullet ids, e.g. "1.1-K4". Empty for Foundations. */
  bullets: string[];
  families: FamilyId[];
  /** In-scope service names, exactly as listed in the exam guide. */
  services: string[];
  start?: true;
  /** Why a Foundation exists (required for Foundations). */
  foundationReason?: string;
  portfolio?: PortfolioTag[];
  azure?: AzureTag[];
}

export interface Building extends BuildingDef {
  /** Cosmetic Availability Zone placement; null for the Founders' Square. */
  island: IslandId | null;
}

export interface Road {
  from: string;
  to: string;
  /** One line: why `from` is a prerequisite of `to`. */
  reason: string;
}

export interface District {
  id: DistrictId;
  name: string;
  /** Exam domain number, or null for the Square. */
  domain: number | null;
  tagline: string;
}
