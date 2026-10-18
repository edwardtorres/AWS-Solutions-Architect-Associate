import { useEffect, useMemo, useState } from 'react';
import type { Question } from '../../content/types';
import { loadShared, type Shared } from '../../content/store';
import { BUILDING_BY_ID } from '../../data';
import { BADGE_BY_ID } from '../../game/badges';
import { DEFAULT_ENV } from '../../game/env';
import { maintenanceStatus } from '../../game/maintenance';
import { DAILY_CAP, INTERVALS, MAINT_SET, remainingToday } from '../../game/review';
import type { ReviewSummary } from '../../game/reviewSession';
import { deriveState } from '../../save/state';
import { GRAPH, START_IDS } from '../../data';
import { attemptRandom } from '../../lib/rng';
import { hrefFor, hrefNotes } from '../../lib/route';
import { loadQuestions } from '../../questions/pool';
import { present } from '../../questions/present';
import { useSaveStore, useSnapshot } from '../../save/context';
import { QuestionCard } from '../play/QuestionCard';
import { ResultCard, type ResultItem } from '../play/ResultView';

const STARTS = new Set(START_IDS);

interface Done {
  summary: ReviewSummary;
  items: ResultItem[];
  seed: number;
}

/** The daily review (building null) or a maintenance set for one building. */
export default function ReviewPage({ buildingId }: { buildingId: string | null }) {
  const store = useSaveStore();
  const { save } = useSnapshot();
  const maintenance = buildingId !== null;
  const building = buildingId ? BUILDING_BY_ID.get(buildingId) : undefined;
  const [bank, setBank] = useState<readonly Question[] | null>(null);
  const [shared, setShared] = useState<Shared | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [plan, setPlan] = useState<{ due: number; dueTotal: number; available: number } | null>(null);

  useEffect(() => {
    let live = true;
    void Promise.all([loadQuestions(), loadShared(), import('../../questions/meta')]).then(([q, s, m]) => {
      if (live) {
        setBank(q);
        setShared(s);
        store.backfillStats(m.QUESTION_META);
      }
    });
    return () => {
      live = false;
    };
  }, [store]);

  const lookup = useMemo(() => {
    const m = new Map((bank ?? []).map((q) => [q.id, q]));
    return (id: string) => m.get(id);
  }, [bank]);

  const session =
    save.game.review && (maintenance ? save.game.review.kind === 'maintenance' && save.game.review.building === buildingId : save.game.review.kind === 'review') ? save.game.review : null;
  const today = store.today();

  useEffect(() => {
    let live = true;
    if (bank && !session && !maintenance) {
      void import('../../game/reviewDraw').then((m) => {
        const p = m.planReview(save, bank, today, { env: DEFAULT_ENV, clock: { now: () => new Date() } }, () => 0.5);
        if (live) setPlan({ due: p.due, dueTotal: p.dueTotal, available: p.questions.length });
      });
    }
    return () => {
      live = false;
    };
  }, [bank, session, maintenance, save, today]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [done]);

  const finish = () => {
    const s = store.getSnapshot().save.game.review;
    if (!s) return;
    const items: ResultItem[] = s.questionIds.flatMap((id) => {
      const q = lookup(id);
      const ans = s.answers[id];
      return q && ans ? [{ question: q, chosen: ans.chosen, correct: ans.correct }] : [];
    });
    const summary = store.completeReview();
    if (summary) setDone({ summary, items, seed: s.seed });
  };

  if (maintenance && !building) {
    return (
      <p>
        That building does not exist.{' '}
        <a className="inline-link" href="#/map">
          Back to the city map
        </a>
        .
      </p>
    );
  }
  const back = building ? hrefFor({ view: 'map', building: building.id }) : '#/map';
  const title = building ? `Maintenance: ${building.name}` : 'Daily review';

  if (done) {
    const s = done.summary;
    return (
      <section aria-labelledby="review-title">
        <h2 id="review-title" className="text-3xl font-semibold">
          {title}: done
        </h2>
        <div role="status" className="mt-2 rounded-xl border-2 border-[var(--accent)] bg-[rgba(245,185,66,0.12)] p-3" data-testid="review-summary">
          <p className="font-semibold">
            {s.correct} of {s.total} correct. +{s.xp} XP. These answers count towards your readiness; no building changed.
          </p>
          {s.newBadges.length > 0 && <p>New badge: {s.newBadges.map((id) => BADGE_BY_ID.get(id)?.name ?? id).join(', ')}.</p>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a className="btn" href={back}>
            {building ? 'Back to the building' : 'Back to the map'}
          </a>
          <a className="btn" href="#/weak">
            Weak Spots
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

  if (session) {
    const nextId = session.questionIds.find((id) => !session.answers[id]);
    const q = nextId ? lookup(nextId) : undefined;
    const answered = session.questionIds.filter((id) => session.answers[id]).length;
    if (!q) {
      return (
        <section aria-labelledby="review-title">
          <h2 id="review-title" className="text-3xl font-semibold">
            {title}
          </h2>
          <p className="mt-2">You answered every question. See the result.</p>
          <button type="button" className="btn mt-3" onClick={finish} data-testid="review-finish">
            See the result
          </button>
        </section>
      );
    }
    return (
      <section aria-labelledby="review-title">
        <h2 id="review-title" className="text-3xl font-semibold">
          {title}
        </h2>
        <div className="mt-3">
          <QuestionCard
            key={q.id}
            presented={present(q, attemptRandom(session.seed, q.id))}
            position={answered + 1}
            total={session.questionIds.length}
            onSubmit={(chosen) => {
              store.submitReviewAnswer(q.id, chosen, lookup);
              const s = store.getSnapshot().save.game.review;
              if (s && s.questionIds.every((id) => s.answers[id])) finish();
            }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn"
            data-testid="review-leave"
            onClick={() => {
              store.abandonReview();
              window.location.hash = back;
            }}
          >
            Leave for now
          </button>
          <span className="text-sm text-[var(--fg-muted)]">Nothing is lost: answers already given keep their XP, and the rest stay due.</span>
        </div>
      </section>
    );
  }

  if (maintenance && building) {
    const state = deriveState(building.id, save, GRAPH, STARTS);
    const st = maintenanceStatus(save, building.id, state);
    return (
      <section aria-labelledby="review-title">
        <p className="text-sm text-[var(--fg-muted)]">{building.name}</p>
        <h2 id="review-title" className="text-3xl font-semibold">
          {title}
        </h2>
        <p className="mt-2 max-w-prose">
          {MAINT_SET} questions from this building, your recent misses first. They count towards your readiness like any review answer, and they never remove the building&rsquo;s commissioning.
        </p>
        <p className="mt-2 text-sm" data-testid="maintenance-status">
          {state !== 'commissioned'
            ? 'Maintenance sets are for commissioned buildings, but you can still practise this one.'
            : st.n === 0
              ? 'No review or mock answers on this building yet.'
              : `Recent review and mock accuracy here: ${st.correct} of ${st.n} right${st.needed ? ' (below 60%: this building needs maintenance)' : ''}.`}
        </p>
        {problem && (
          <p role="alert" className="mt-3 rounded-xl border-2 border-[#f87171] p-3">
            {problem}
          </p>
        )}
        <button
          type="button"
          className="btn mt-4"
          data-testid="start-maintenance"
          onClick={() => {
            void store.startMaintenance(building.id, bank).then((r) => {
              setProblem(r.ok ? null : r.message);
            });
          }}
        >
          Begin the maintenance set
        </button>
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

  const left = remainingToday(save.game.reviewDay, today);
  return (
    <section aria-labelledby="review-title">
      <h2 id="review-title" className="text-3xl font-semibold">
        {title}
      </h2>
      <p className="mt-2 max-w-prose">
        Questions you have answered come back on a schedule: a miss the next day, then after {INTERVALS.join(', ')} days as your correct run grows. At most {DAILY_CAP} answers per local day; if fewer
        are due, the rest comes from your weakest bullets. Mock-exam-only questions are never reviewed.
      </p>
      <p className="mt-2 font-semibold" data-testid="review-plan">
        {plan === null
          ? 'Checking what is due…'
          : left === 0
            ? `Today’s cap of ${DAILY_CAP} is reached. Come back tomorrow.`
            : `${plan.dueTotal} due now; ${left} of ${DAILY_CAP} answers left today (${plan.due} due, ${plan.available - plan.due} from your weakest bullets).`}
      </p>
      {problem && (
        <p role="alert" className="mt-3 rounded-xl border-2 border-[#f87171] p-3">
          {problem}
        </p>
      )}
      <button
        type="button"
        className="btn mt-4"
        data-testid="start-review"
        disabled={left === 0 || (plan !== null && plan.available === 0)}
        onClick={() => {
          void store.startReview(bank).then((r) => {
            setProblem(r.ok ? null : r.message);
          });
        }}
      >
        Begin today’s review
      </button>
      <p className="mt-3 text-sm text-[var(--fg-muted)]">Review answers earn XP (a repeat earns a quarter), count towards your streak and your readiness, and never change a building.</p>
    </section>
  );
}
