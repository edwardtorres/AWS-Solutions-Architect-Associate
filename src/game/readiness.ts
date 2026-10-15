import type { LogEntry, LogKind } from '../save/schema';
import type { GameEnv } from './env';

/** Window sizes (recorded in CLAUDE.md). */
export const ACCURACY_WINDOW = 30;
export const COVERAGE_WINDOW = 100;
export const MIN_ANSWERS = 10;

/** Answer kinds that count towards readiness. Start-up checks never do. */
export const COUNTED_KINDS: ReadonlySet<LogKind> = new Set<LogKind>(['inspection', 'placement', 'review', 'puzzle', 'lab', 'mock']);

/** The few facts about a question readiness needs; generated into src/questions/meta.ts. */
export interface QMeta {
  id: string;
  building: string;
  bullets: readonly string[];
  difficulty: 1 | 2 | 3;
}

export interface DomainReadiness {
  domain: number;
  answers: number;
  accuracy: number | null;
  coverage: number | null;
  /** accuracy x coverage as a 0 to 1 share, or null while the domain has fewer than MIN_ANSWERS counted answers. */
  value: number | null;
}

export interface Readiness {
  domains: DomainReadiness[];
  /** Weighted 30/26/24/20 over the four domains; null until every domain has a value. */
  overall: number | null;
}

export function computeReadiness(log: readonly LogEntry[], meta: ReadonlyMap<string, QMeta>, env: GameEnv): Readiness {
  const domains: DomainReadiness[] = [];
  const domainNumbers = Object.keys(env.weights).map(Number).sort((a, b) => a - b);
  for (const d of domainNumbers) {
    const bulletsOfDomain = new Set(env.buildingIds.filter((b) => env.domainOf(b) === d).flatMap((b) => env.bulletsOf(b)));
    const entries = log.filter((e) => COUNTED_KINDS.has(e[3])).flatMap((e) => {
      const m = meta.get(e[0]);
      return m && env.domainOf(m.building) === d ? [{ m, correct: e[1] === 1 }] : [];
    });
    const answers = entries.length;
    if (answers < MIN_ANSWERS || bulletsOfDomain.size === 0) {
      domains.push({ domain: d, answers, accuracy: null, coverage: null, value: null });
      continue;
    }
    const recent = entries.slice(-ACCURACY_WINDOW);
    const accuracy = recent.filter((e) => e.correct).length / recent.length;
    const covered = new Set<string>();
    for (const e of entries.slice(-COVERAGE_WINDOW)) if (e.correct) for (const b of e.m.bullets) if (bulletsOfDomain.has(b)) covered.add(b);
    const coverage = covered.size / bulletsOfDomain.size;
    domains.push({ domain: d, answers, accuracy, coverage, value: accuracy * coverage });
  }
  let overall: number | null = null;
  if (domains.length > 0 && domains.every((x) => x.value !== null)) {
    const total = domainNumbers.reduce((n, d) => n + (env.weights[d] as number), 0);
    overall = domains.reduce((n, x) => n + (x.value as number) * ((env.weights[x.domain] as number) / total), 0);
  }
  return { domains, overall };
}
