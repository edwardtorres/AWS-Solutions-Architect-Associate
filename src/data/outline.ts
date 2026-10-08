import outline from '../../scripts/official-outline.json';

export type BulletType = 'knowledge' | 'skill';

export interface OutlineBullet {
  id: string;
  type: BulletType;
  text: string;
}
export interface OutlineTask {
  id: string;
  title: string;
  bullets: OutlineBullet[];
}
export interface OutlineDomain {
  id: number;
  name: string;
  weightPercent: number;
  tasks: OutlineTask[];
}

/** Official SAA-C03 outline, recorded verbatim in scripts/official-outline.json. */
export const OUTLINE_DOMAINS: readonly OutlineDomain[] = outline.domains as OutlineDomain[];

export const OUTLINE_TASKS: readonly OutlineTask[] = OUTLINE_DOMAINS.flatMap((d) => d.tasks);

export const BULLET_BY_ID: ReadonlyMap<string, OutlineBullet> = new Map(
  OUTLINE_TASKS.flatMap((t) => t.bullets).map((b) => [b.id, b]),
);

export const TASK_BY_ID: ReadonlyMap<string, OutlineTask> = new Map(OUTLINE_TASKS.map((t) => [t.id, t]));
