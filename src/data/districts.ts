import type { District, DistrictId } from './types';

export const DISTRICTS: readonly District[] = [
  { id: 'square', name: "Founders' Square", domain: null, tagline: 'Background the exam assumes: start here.' },
  { id: 'citadel', name: 'The Citadel', domain: 1, tagline: 'Walls, gates and vaults: design secure architectures.' },
  { id: 'harbor', name: 'Harbor & Levees', domain: 2, tagline: 'Redundancy, failover and decoupling: design resilient architectures.' },
  { id: 'express', name: 'Express Quarter', domain: 3, tagline: 'Transit, caches and fast stores: design high-performing architectures.' },
  { id: 'treasury', name: 'The Treasury', domain: 4, tagline: 'Spend wisely: design cost-optimized architectures.' },
];

export const DISTRICT_BY_ID: Record<DistrictId, District> = Object.fromEntries(
  DISTRICTS.map((d) => [d.id, d]),
) as Record<DistrictId, District>;

export const DISTRICT_BY_DOMAIN: Record<number, DistrictId> = { 1: 'citadel', 2: 'harbor', 3: 'express', 4: 'treasury' };
