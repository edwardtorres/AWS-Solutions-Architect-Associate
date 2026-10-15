import { useEffect, useMemo, useState } from 'react';
import { BUILDING_BY_ID } from '../../data';
import type { Question } from '../../content/types';
import { loadShared, type Shared } from '../../content/store';
import { DEFAULT_ENV } from '../../game/env';
import type { AttemptSummary } from '../../game/engine';
import { inspectionAvailability, placementAvailability, startupAvailability, type Availability } from '../../game/lifecycle';
import { BADGE_BY_ID } from '../../game/badges';
import { RULES } from '../../game/scoring';
import { attemptRandom } from '../../lib/rng';
import { hrefFor, hrefNotes } from '../../lib/route';
import { loadQuestions } from '../../questions/pool';
import { present } from '../../questions/present';
import type { ActiveAttempt, AttemptKind } from '../../save/schema';
import { useSaveStore, useSnapshot } from '../../save/context';
import { QuestionCard } from './QuestionCard';
import { ResultCard, type ResultItem } from './ResultView';

const TITLE: Record<AttemptKind, string> = { startup: 'Start-up check', inspection: 'Inspection', placement: 'Placement check' };

const INTRO: Record<AttemptKind, string[]> = {
  startup: [
    `${RULES.startup.total} questions about this building. Answer both correctly to start construction.`,
    'There is no daily limit and a miss costs nothing: you get new questions on the next try. Start-up answers earn XP but do not count towards your readiness.',
  ],
  inspection: [
    `${RULES.inspection.total} questions from this building. ${RULES.inspection.need} or more correct commissions it.`,
    'You see the key only after the last answer. If you fail twice in one local day, inspections for this building lock until tomorrow, so re-read the notes after a miss.',
  ],
  placement: [
    `${RULES.placement.total} questions on design decisions beyond your portfolio project. All ${RULES.placement.total} must be correct to place this building.`,
    'You get one placement attempt per building per local day. Starting counts as today’s attempt, even if you stop. Placing commissions the building and unlocks what depends on it.',
  ],
};

interface Done {
  summary: AttemptSummary;
  items: ResultItem[];
  seed: number;
  kind: AttemptKind;
}

function availability(kind: AttemptKind, id: string, save: ReturnType<typeof useSnapshot>['save'], today: string): Availability {
  if (kind === 'startup') return startupAvailability(save, id, DEFAULT_ENV);
  if (kind === 'inspection') return inspectionAvailability(save, id, DEFAULT_ENV, today);
  return placementAvailability(save, id, DEFAULT_ENV, today);
}

export default function AttemptPage({ kind, buildingId }: { kind: AttemptKind; buildingId: string | null }) {
  const store = useSaveStore();
  const { save } = useSnapshot();
  const building = buildingId ? BUILDING_BY_ID.get(buildingId) : undefined;
  const [bank, setBank] = useState<readonly Question[] | null>(null);
  const [shared, setShared] = useState<Shared | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void Promise.all([loadQuestions(), loadShared()]).then(([q, s]) => {
      if (live) {
        setBank(q);
        setShared(s);
      }
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [done, buildingId, kind]);

  const lookup = useMemo(() => {
    const m = new Map((bank ?? []).map((q) => [q.id, q]));
    return (id: string) => m.get(id);
  }, [bank]);

  const active: ActiveAttempt | null = save.game.active && save.game.active.kind === kind && save.game.active.building === buildingId ? save.game.active : null;

  /** Builds the result list from the active attempt, then settles it. */
  const finish = () => {
    const a = store.getSnapshot().save.game.active;
    if (!a) return;
    const items: ResultItem[] = a.questionIds.flatMap((id) => {
      const q = lookup(id);
      const ans = a.answers[id];
      return q && ans ? [{ question: q, chosen: ans.chosen, correct: ans.correct }] : [];
    });
    const summary = store.completeAttempt();
    if (summary) setDone({ summary, items, seed: a.seed, kind: a.kind });
  };

  if (!building) {
    return (
      <p>
        That building does not exist. <a className="inline-link" href="#/map">Back to the city map</a>.
      </p>
    );
  }
  const back = hrefFor({ view: 'map', building: building.id });

  if (done) {
    const s = done.summary;
    return (
      <section aria-labelledby="attempt-title" data-district={building.district}>
        <p className="text-sm text-[var(--fg-muted)]">{building.name}</p>
        <h2 id="attempt-title" className="text-3xl font-semibold">
          {TITLE[done.kind]}: {s.passed ? 'passed' : 'not passed'}
        </h2>
        <div role="status" className="mt-2 rounded-xl border-2 border-[var(--accent)] bg-[rgba(245,185,66,0.12)] p-3" data-testid="summary">
          <p className="font-semibold">
            {s.correct} of {s.total} correct (needed {s.need}). +{s.xpFromAnswers + s.bonus} XP{s.bonus > 0 ? ` (including ${s.bonus} for commissioning)` : ''}.
          </p>
          {s.started && <p>Construction has started: the building is under construction. Next: an inspection.</p>}
          {s.commissioned && <p>{done.kind === 'placement' ? 'Placed and commissioned.' : 'Commissioned.'} Buildings that depended on it are now surveyed.</p>}
          {!s.passed && done.kind === 'startup' && <p>Re-read the notes, then try again with new questions.</p>}
          {!s.passed && done.kind === 'inspection' && !s.locked && <p>You may try again today. One more failure today locks inspections for this building until tomorrow.</p>}
          {s.locked && <p>Inspections for this building are locked until tomorrow (your local date changes at midnight). Use the time to re-read the notes.</p>}
          {!s.passed && done.kind === 'placement' && <p>Today’s placement attempt for this building is used. You can try again tomorrow.</p>}
          {s.newBadges.length > 0 && <p>New badge: {s.newBadges.map((id) => BADGE_BY_ID.get(id)?.name ?? id).join(', ')}.</p>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a className="btn" href={back}>
            Back to the building
          </a>
          <a className="btn" href={hrefNotes(building.id)}>
            Open the notes
          </a>
          <a className="btn" href="#/progress">
            Progress
          </a>
        </div>
        <h3 className="mt-6 text-2xl font-semibold">Your answers and the key</h3>
        <ol className="mt-2 grid gap-4">
          {done.items.map((item, i) => (
            <ResultCard key={item.question.id} item={item} index={i} seed={done.seed} shared={shared} />
          ))}
        </ol>
      </section>
    );
  }

  if (!bank) return <p role="status">Loading questions…</p>;

  if (active) {
    const nextId = active.questionIds.find((id) => !active.answers[id]);
    const q = nextId ? lookup(nextId) : undefined;
    const position = active.questionIds.filter((id) => active.answers[id]).length + 1;
    if (!q) {
      // Every question was answered but the attempt was not settled (the page was closed first).
      return (
        <section aria-labelledby="attempt-title" data-district={building.district}>
          <h2 id="attempt-title" className="text-3xl font-semibold">
            {TITLE[kind]}
          </h2>
          <p className="mt-2">You answered every question. See the result to settle this attempt.</p>
          <button type="button" className="btn mt-3" onClick={finish}>
            See the result
          </button>
        </section>
      );
    }
    return (
      <section aria-labelledby="attempt-title" data-district={building.district}>
        <p className="text-sm text-[var(--fg-muted)]">{building.name}</p>
        <h2 id="attempt-title" className="text-3xl font-semibold">
          {TITLE[kind]}
        </h2>
        <div className="mt-3">
          <QuestionCard
            key={q.id}
            presented={present(q, attemptRandom(active.seed, q.id))}
            position={position}
            total={active.questionIds.length}
            onSubmit={(chosen) => {
              store.submitAnswer(q.id, chosen, lookup);
              const a = store.getSnapshot().save.game.active;
              if (a && a.questionIds.every((id) => a.answers[id])) finish();
            }}
          />
        </div>
        <div className="mt-3">
          {!leaving ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setLeaving(true);
              }}
            >
              Leave this attempt
            </button>
          ) : (
            <div role="alertdialog" aria-labelledby="leave-title" className="rounded-xl border-2 border-[var(--accent)] p-3">
              <p id="leave-title" className="font-semibold">Leave this attempt?</p>
              <p className="mt-1 max-w-prose text-sm">
                {kind === 'inspection' && 'Leaving an unfinished inspection counts as a failed inspection. '}
                {kind === 'placement' && 'Today’s placement attempt stays used. '}
                {kind === 'startup' && 'Nothing is lost; you will get new questions next time. '}
                Answers you already gave keep their XP.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    store.abandonAttempt();
                    setLeaving(false);
                    window.location.hash = back;
                  }}
                >
                  Yes, leave
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setLeaving(false);
                  }}
                >
                  Keep going
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  const avail = availability(kind, building.id, save, store.today());
  const other = save.game.active;
  return (
    <section aria-labelledby="attempt-title" data-district={building.district}>
      <p className="text-sm text-[var(--fg-muted)]">{building.name}</p>
      <h2 id="attempt-title" className="text-3xl font-semibold">
        {TITLE[kind]}
      </h2>
      {INTRO[kind].map((t) => (
        <p key={t} className="mt-2 max-w-prose">
          {t}
        </p>
      ))}
      {problem && (
        <p role="alert" className="mt-3 rounded-xl border-2 border-[#f87171] p-3">
          {problem}
        </p>
      )}
      {avail.ok ? (
        <button
          type="button"
          className="btn mt-4"
          onClick={() => {
            void store.startAttempt(kind, building.id, bank).then((r) => {
              if (!r.ok) setProblem(r.availability.message);
            });
          }}
        >
          Begin {TITLE[kind].toLowerCase()}
        </button>
      ) : (
        <div role="status" className="mt-4 rounded-xl border-2 border-[var(--line)] p-3" data-testid="unavailable" data-code={avail.code}>
          <p>{avail.message}</p>
          {avail.code === 'active-attempt' && other && (
            <p className="mt-2">
              <a className="inline-link" href={hrefFor({ view: other.kind === 'inspection' ? 'inspect' : other.kind === 'placement' ? 'place' : 'startup', building: null, param: other.building })}>
                Go to the attempt in progress
              </a>
            </p>
          )}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <a className="btn" href={back}>
          Back to the building
        </a>
        <a className="btn" href={hrefNotes(building.id)}>
          Open the notes
        </a>
      </div>
    </section>
  );
}
