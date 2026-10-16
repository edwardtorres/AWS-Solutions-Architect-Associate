import { useMemo } from 'react';
import { BUILDINGS, DISTRICTS, OUTLINE_DOMAINS } from '../data';
import { BADGES } from '../game/badges';
import { systemClock, today as todayKey } from '../game/day';
import { DEFAULT_ENV } from '../game/env';
import { computeReadiness, ACCURACY_WINDOW, COVERAGE_WINDOW, MIN_ANSWERS } from '../game/readiness';
import { rankFor, RANKS } from '../game/ranks';
import { streakInfo } from '../game/streak';
import { STREAK_DAY_QUESTIONS } from '../game/scoring';
import { QUESTION_META } from '../questions/meta';
import { useSnapshot } from '../save/context';
import { useBuildingStates } from './useBuildingStates';

const pct = (v: number | null): string => (v === null ? '—' : `${Math.round(v * 100)}%`);

export default function ProgressPage() {
  const { save } = useSnapshot();
  const states = useBuildingStates();
  const g = save.game;
  const info = rankFor(g.xp);
  const today = todayKey(systemClock);
  const streak = streakInfo(g.days, today);
  const readiness = useMemo(() => computeReadiness(g.recent, QUESTION_META, DEFAULT_ENV), [g.recent]);
  const commissioned = BUILDINGS.filter((b) => states.get(b.id) === 'commissioned').length;
  const answeredToday = g.days[today] ?? 0;

  return (
    <section aria-labelledby="progress-title">
      <h2 id="progress-title" className="text-3xl font-semibold">
        Progress
      </h2>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <section aria-labelledby="rank-h" className="rounded-2xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.72)] p-4">
          <h3 id="rank-h" className="text-xl font-semibold">
            Rank
          </h3>
          <p className="mt-1 text-2xl font-semibold" data-testid="rank-name">{info.rank.name}</p>
          <p className="text-sm text-[var(--fg-muted)]" data-testid="xp-total">{g.xp.toLocaleString('en-US')} XP</p>
          {info.next ? (
            <>
              <progress className="meter mt-2" value={info.into} max={info.span} aria-label={`Progress to ${info.next.name}`} />
              <p className="mt-1 text-sm">
                {(info.next.xp - g.xp).toLocaleString('en-US')} XP to {info.next.name}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm">Top rank reached.</p>
          )}
          <p className="mt-2 text-sm text-[var(--fg-muted)]">Ranks: {RANKS.map((r) => `${r.name} ${r.xp.toLocaleString('en-US')}`).join(' · ')}</p>
        </section>

        <section aria-labelledby="streak-h" className="rounded-2xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.72)] p-4">
          <h3 id="streak-h" className="text-xl font-semibold">
            Streak
          </h3>
          <p className="mt-1 text-2xl font-semibold" data-testid="streak">
            {streak.current} {streak.current === 1 ? 'day' : 'days'}
          </p>
          <p className="text-sm text-[var(--fg-muted)]">Best: {Math.max(g.bestStreak, streak.current)} days</p>
          <p className="mt-2 text-sm">
            {streak.countedToday
              ? 'Today counts.'
              : `Answer ${Math.max(0, STREAK_DAY_QUESTIONS - answeredToday)} more question${STREAK_DAY_QUESTIONS - answeredToday === 1 ? '' : 's'} today to count it (${answeredToday} of ${STREAK_DAY_QUESTIONS} so far).`}
          </p>
        </section>
      </div>

      <section aria-labelledby="ready-h" className="mt-4 rounded-2xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.72)] p-4">
        <h3 id="ready-h" className="text-xl font-semibold">
          Readiness
        </h3>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Per domain: accuracy over your last {ACCURACY_WINDOW} inspection and placement answers, times the share of the domain’s exam-guide bullets you answered correctly in your last {COVERAGE_WINDOW}. A domain shows “—” until it has {MIN_ANSWERS} such answers. Start-up checks never count. The overall figure weights the domains 30 / 26 / 24 / 20 and shows “—” until all four have a value.
        </p>
        <p className="mt-3 text-lg">
          Overall: <strong data-testid="readiness-overall">{pct(readiness.overall)}</strong>
        </p>
        <ul className="mt-2 grid gap-3">
          {readiness.domains.map((d) => {
            const dom = OUTLINE_DOMAINS.find((o) => o.id === d.domain);
            return (
              <li key={d.domain} data-testid={`readiness-d${d.domain}`}>
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-semibold">
                    Domain {d.domain}: {dom?.name ?? ''} ({dom?.weightPercent}%)
                  </span>
                  <span data-testid="readiness-value">{pct(d.value)}</span>
                  <span className="text-sm text-[var(--fg-muted)]">
                    {d.answers} answer{d.answers === 1 ? '' : 's'}
                    {d.value !== null ? ` · accuracy ${pct(d.accuracy)} · coverage ${pct(d.coverage)}` : ''}
                  </span>
                </p>
                <progress className="meter mt-1" value={Math.round((d.value ?? 0) * 100)} max={100} aria-label={`Domain ${d.domain} readiness`} />
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="city-h" className="mt-4 rounded-2xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.72)] p-4">
        <h3 id="city-h" className="text-xl font-semibold">
          City
        </h3>
        <p className="mt-1" data-testid="city-count">
          {commissioned} of {BUILDINGS.length} buildings commissioned.
        </p>
        <ul className="mt-2 grid gap-1 text-sm">
          {DISTRICTS.map((d) => {
            const ids = BUILDINGS.filter((b) => b.district === d.id);
            const n = ids.filter((b) => states.get(b.id) === 'commissioned').length;
            return (
              <li key={d.id}>
                {d.name}: {n} of {ids.length}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="badges-h" className="mt-4 rounded-2xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.72)] p-4">
        <h3 id="badges-h" className="text-xl font-semibold">
          Badges
        </h3>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {BADGES.map((b) => {
            const at = g.badges[b.id];
            return (
              <li key={b.id} className="rounded-lg border border-[var(--line)] p-2" data-earned={at ? 'true' : 'false'}>
                <p className="font-semibold">
                  {b.name} <span className="chip">{at ? `Earned ${at.slice(0, 10)}` : 'Not yet'}</span>
                </p>
                <p className="text-sm text-[var(--fg-muted)]">{b.description}</p>
              </li>
            );
          })}
        </ul>
      </section>
    </section>
  );
}
