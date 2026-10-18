import { useEffect, useMemo, useState } from 'react';
import type { Question, ConfusePair } from '../../content/types';
import { loadShared, type Shared } from '../../content/store';
import { BUILDINGS, BUILDING_BY_ID, BULLET_BY_ID, FAMILY_NAME } from '../../data';
import { familyStats, MIN_BULLET_ANSWERS, rankBullets, rankTraps, WEAK_BELOW } from '../../game/weak';
import { LAB_META } from '../../labs/meta';
import { hrefConfuse, hrefFor, hrefLab, hrefNotes, hrefPuzzle, hrefWorkbench } from '../../lib/route';
import { loadQuestions } from '../../questions/pool';
import { QUESTION_META } from '../../questions/meta';
import { useSaveStore, useSnapshot } from '../../save/context';

const ALL_BULLETS = BUILDINGS.flatMap((b) => b.bullets);
const BUILDING_OF_BULLET = new Map(BUILDINGS.flatMap((b) => b.bullets.map((x) => [x, b] as const)));
const PUZZLE_FOR_BULLET = new Map<string, string>();
for (const m of QUESTION_META.values()) {
  if (!m.id.startsWith('puzzle-')) continue;
  for (const b of m.bullets) if (!PUZZLE_FOR_BULLET.has(b)) PUZZLE_FOR_BULLET.set(b, m.id);
}
const SHOWN = 30;

const pct = (n: number, d: number) => `${Math.round((n / d) * 100)}%`;

export default function WeakSpotsPage() {
  const store = useSaveStore();
  const { save } = useSnapshot();
  const [bank, setBank] = useState<readonly Question[] | null>(null);
  const [shared, setShared] = useState<Shared | null>(null);

  useEffect(() => {
    let live = true;
    store.backfillStats(QUESTION_META);
    void Promise.all([loadQuestions(), loadShared()]).then(([q, s]) => {
      if (live) {
        setBank(q);
        setShared(s);
      }
    });
    return () => {
      live = false;
    };
  }, [store]);

  const g = save.game;
  const ranked = useMemo(() => rankBullets(g.byBullet, ALL_BULLETS), [g.byBullet]);
  const withData = ranked.filter((r) => r.n > 0);
  const traps = useMemo(() => rankTraps(g.traps), [g.traps]);
  const families = useMemo(() => familyStats(g.byBullet, BUILDINGS), [g.byBullet]);
  const pairTitle = (id: string): string => (shared?.confuse as ConfusePair[] | undefined)?.find((p) => p.id === id)?.title ?? id;
  const byId = useMemo(() => new Map((bank ?? []).map((q) => [q.id, q])), [bank]);

  return (
    <section aria-labelledby="weak-title">
      <h2 id="weak-title" className="text-3xl font-semibold">
        Weak Spots
      </h2>
      <p className="mt-2 max-w-prose">
        Built from your recent counted answers (inspections, placements, puzzles, labs, reviews and mocks): the last 10 per outline bullet. A score rests on its number of answers, and a bullet with
        under {MIN_BULLET_ANSWERS} shows “not enough data”. Weak means under {Math.round(WEAK_BELOW * 100)}%.
      </p>

      <h3 className="mt-6 text-2xl font-semibold">Bullets, weakest first</h3>
      {withData.length === 0 ? (
        <p className="mt-2" data-testid="weak-empty">
          No counted answers yet. Take an inspection or a review and this fills in.
        </p>
      ) : (
        <ol className="mt-2 grid gap-2" data-testid="weak-bullets">
          {withData.slice(0, SHOWN).map((r) => {
            const b = BUILDING_OF_BULLET.get(r.bullet);
            const bullet = BULLET_BY_ID.get(r.bullet);
            const puzzle = PUZZLE_FOR_BULLET.get(r.bullet);
            const lab = LAB_META.find((l) => l.bullets.includes(r.bullet));
            const weak = r.accuracy !== null && r.accuracy < WEAK_BELOW;
            return (
              <li key={r.bullet} className="rounded-xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.6)] p-3" data-testid="weak-row" data-weak={weak ? 'true' : 'false'}>
                <p className="font-semibold">
                  {r.bullet} <span className="font-normal">{bullet?.text}</span>
                </p>
                <p className="mt-1 text-sm" data-testid="weak-score">
                  {r.accuracy === null ? `Not enough data (${r.n} answer${r.n === 1 ? '' : 's'})` : `${r.correct} of ${r.n} right (${pct(r.correct, r.n)})${weak ? ': weak' : ''}`}
                </p>
                <div className="mt-1 flex flex-wrap gap-2 text-sm">
                  {b && (
                    <a className="inline-link inline-flex min-h-11 items-center" href={hrefNotes(b.id)}>
                      Notes: {b.name}
                    </a>
                  )}
                  {puzzle && (
                    <a className="inline-link inline-flex min-h-11 items-center" href={hrefPuzzle(puzzle)}>
                      A puzzle
                    </a>
                  )}
                  {lab && (
                    <a className="inline-link inline-flex min-h-11 items-center" href={hrefLab(lab.id)}>
                      Lab {lab.n}: {lab.title}
                    </a>
                  )}
                  {b && (
                    <a className="inline-link inline-flex min-h-11 items-center" href={hrefWorkbench(b.id)}>
                      Workbench
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {withData.length > SHOWN && (
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Showing the {SHOWN} weakest of {withData.length} bullets with data.
        </p>
      )}
      <p className="mt-2 text-sm text-[var(--fg-muted)]">{ranked.length - withData.length} bullets have no counted answers yet.</p>

      <h3 className="mt-6 text-2xl font-semibold">Don&rsquo;t-confuse pairs you miss most</h3>
      {traps.length === 0 ? (
        <p className="mt-2" data-testid="traps-empty">
          No misses on a don&rsquo;t-confuse question yet.
        </p>
      ) : (
        <ul className="mt-2 grid gap-2" data-testid="weak-traps">
          {traps.slice(0, 12).map((t) => (
            <li key={t.pair}>
              <a className="inline-flex min-h-11 flex-wrap items-center gap-2 underline underline-offset-4" href={hrefConfuse(t.pair)}>
                {pairTitle(t.pair)}
                <span className="text-sm text-[var(--fg-muted)]">
                  missed {t.miss} of {t.n}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-6 text-2xl font-semibold">Service families</h3>
      <p className="mt-1 max-w-prose text-sm text-[var(--fg-muted)]">
        The outline repeats services across domains, so each family pools the bullets of all its buildings. A family needs 10 answers before it is judged.
      </p>
      <ul className="mt-2 grid gap-1" data-testid="weak-families">
        {families.map((f) => (
          <li key={f.family} className="flex min-h-11 flex-wrap items-center gap-2" data-weak={f.weak ? 'true' : 'false'}>
            <a className="underline underline-offset-4" href={`#/atlas`}>
              {FAMILY_NAME[f.family as keyof typeof FAMILY_NAME] ?? f.family}
            </a>
            <span className="text-sm">{f.accuracy === null ? `not enough data (${f.n} answers)` : `${f.correct} of ${f.n} right (${pct(f.correct, f.n)})`}</span>
            {f.weak && <span className="chip border-2 border-[var(--accent)]">Weak</span>}
          </li>
        ))}
      </ul>

      <h3 className="mt-6 text-2xl font-semibold">Your flagged questions</h3>
      {g.flags.length === 0 ? (
        <p className="mt-2" data-testid="flags-empty">
          You have not flagged any question.
        </p>
      ) : (
        <ul className="mt-2 grid gap-2" data-testid="weak-flags">
          {g.flags.map((f) => {
            const q = byId.get(f.questionId);
            const b = q ? BUILDING_BY_ID.get(q.building) : undefined;
            return (
              <li key={f.id} className="rounded-xl border border-[var(--line)] p-2">
                <p className="text-sm">{q ? q.stem : f.questionId}</p>
                {f.note && <p className="mt-1 text-sm text-[var(--fg-muted)]">Your note: {f.note}</p>}
                {b && (
                  <a className="inline-link inline-flex min-h-11 items-center text-sm" href={hrefFor({ view: 'notes', building: null, param: b.id })}>
                    Notes: {b.name}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
