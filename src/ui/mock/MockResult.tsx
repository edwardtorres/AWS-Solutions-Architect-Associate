import { useMemo } from 'react';
import { BULLET_BY_ID, OUTLINE_DOMAINS } from '../../data';
import { freshnessReason, pctText, scoreOf } from '../../game/mock';
import { hrefConfuse, hrefMock } from '../../lib/route';
import { useSnapshot } from '../../save/context';
import { ResultCard, type ResultItem } from '../play/ResultView';
import { useBank } from './useBank';

export default function MockResult({ id }: { id: string | null }) {
  const { save } = useSnapshot();
  const { bank, shared, lookup } = useBank();
  const record = save.game.mock.history.find((m) => m.id === id);

  const bullets = useMemo(() => {
    if (!record || !bank) return [];
    const stats = new Map<string, { correct: number; total: number }>();
    for (const qid of record.questionIds) {
      const q = lookup(qid);
      if (!q) continue;
      const right = (() => {
        const chosen = record.chosen[qid] ?? [];
        const keyed = q.options.flatMap((o, i) => (o.correct ? [i] : []));
        return chosen.length === keyed.length && keyed.every((k) => chosen.includes(k));
      })();
      for (const b of q.bullets) {
        const cur = stats.get(b) ?? { correct: 0, total: 0 };
        stats.set(b, { correct: cur.correct + (right ? 1 : 0), total: cur.total + 1 });
      }
    }
    return [...stats.entries()].map(([bullet, s]) => ({ bullet, ...s })).sort((a, b) => a.correct / a.total - b.correct / b.total || b.total - a.total || (a.bullet < b.bullet ? -1 : 1));
  }, [record, bank, lookup]);

  if (!record) {
    return (
      <section aria-labelledby="mock-result-title">
        <h2 id="mock-result-title" className="text-3xl font-semibold">
          Mock result
        </h2>
        <p className="mt-2">
          That mock is not in your history. <a className="inline-link" href={hrefMock()}>Back to the mock exam page</a>.
        </p>
      </section>
    );
  }
  const items: ResultItem[] = bank
    ? record.questionIds.flatMap((qid) => {
        const q = lookup(qid);
        if (!q) return [];
        const chosen = record.chosen[qid] ?? [];
        const keyed = q.options.flatMap((o, i) => (o.correct ? [i] : []));
        return [{ question: q, chosen, correct: chosen.length === keyed.length && keyed.every((k) => chosen.includes(k)) }];
      })
    : [];
  const traps = Object.entries(record.trapMisses).sort((a, b) => b[1] - a[1]);
  const title = (pair: string) => shared?.confuse.find((p) => p.id === pair)?.title ?? pair;

  return (
    <section aria-labelledby="mock-result-title">
      <h2 id="mock-result-title" className="text-3xl font-semibold">
        Mock result
      </h2>
      <div role="status" className="mt-2 rounded-xl border-2 border-[var(--accent)] bg-[rgba(245,185,66,0.12)] p-3" data-testid="mock-score">
        <p className="text-2xl font-semibold" data-testid="mock-overall">
          {pctText(record.correct, record.total)} raw ({record.correct} of {record.total})
        </p>
        <p className="mt-1 text-sm">{record.expired ? 'The timer ran out and the mock was submitted automatically; unanswered questions count as wrong. ' : 'Unanswered questions count as wrong. '}No building changed.</p>
      </div>
      <p className="mt-2 max-w-prose text-sm" data-testid="mock-result-scaled-note">
        <strong>720 is a scaled score, not a percentage.</strong> The real exam scales your results to 100&ndash;1,000 and scoring is compensatory, so a raw percentage cannot predict it exactly. All {record.total} questions are scored here; on the real exam 15 of its 65 are unscored and unidentified.
      </p>
      <p className="mt-2 max-w-prose text-sm" data-testid="mock-result-freshness">
        {freshnessReason(record)} It drew {record.reserveUsed} question{record.reserveUsed === 1 ? '' : 's'} held back for mocks.
      </p>

      <h3 className="mt-6 text-2xl font-semibold">By domain</h3>
      <table className="mt-2 w-full max-w-xl border-collapse text-sm" data-testid="mock-domains">
        <thead>
          <tr className="text-left">
            <th className="border-b border-[var(--line)] py-1">Domain</th>
            <th className="border-b border-[var(--line)] py-1">Correct</th>
            <th className="border-b border-[var(--line)] py-1">Raw</th>
          </tr>
        </thead>
        <tbody>
          {OUTLINE_DOMAINS.map((d) => {
            const v = record.domains[String(d.id)];
            return (
              <tr key={d.id}>
                <td className="border-b border-[var(--line)] py-1">
                  {d.id}. {d.name} ({d.weightPercent}%)
                </td>
                <td className="border-b border-[var(--line)] py-1">{v ? `${v[0]} of ${v[1]}` : '–'}</td>
                <td className="border-b border-[var(--line)] py-1">{v ? pctText(v[0], v[1]) : '–'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1 text-sm text-[var(--fg-muted)]">Overall {Math.round(scoreOf(record) * 100)}%.</p>

      <h3 className="mt-6 text-2xl font-semibold">Outline bullets, weakest first</h3>
      {!bank ? (
        <p role="status">Loading…</p>
      ) : (
        <ol className="mt-2 grid gap-1" data-testid="mock-bullets">
          {bullets.slice(0, 15).map((b) => (
            <li key={b.bullet} className="text-sm">
              <strong>{b.bullet}</strong> {BULLET_BY_ID.get(b.bullet)?.text}: {b.correct} of {b.total} right ({pctText(b.correct, b.total)})
            </li>
          ))}
        </ol>
      )}
      {bullets.length > 15 && (
        <details className="mt-2 text-sm">
          <summary className="min-h-11 cursor-pointer py-2">All {bullets.length} bullets in this mock</summary>
          <ol className="mt-1 grid gap-1">
            {bullets.slice(15).map((b) => (
              <li key={b.bullet}>
                <strong>{b.bullet}</strong> {BULLET_BY_ID.get(b.bullet)?.text}: {b.correct} of {b.total} ({pctText(b.correct, b.total)})
              </li>
            ))}
          </ol>
        </details>
      )}

      <h3 className="mt-6 text-2xl font-semibold">Don&rsquo;t-confuse pairs you fell for</h3>
      {traps.length === 0 ? (
        <p className="mt-2" data-testid="mock-traps-none">
          None in this mock.
        </p>
      ) : (
        <ul className="mt-2 grid gap-1" data-testid="mock-traps">
          {traps.map(([pair, n]) => (
            <li key={pair}>
              <a className="inline-flex min-h-11 items-center underline underline-offset-4" href={hrefConfuse(pair)}>
                {title(pair)} ({n} miss{n === 1 ? '' : 'es'})
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <a className="btn" href={hrefMock()}>
          All mocks and ready to book
        </a>
        <a className="btn" href="#/weak">
          Weak Spots
        </a>
        <a className="btn" href="#/review">
          Daily review
        </a>
      </div>

      <h3 className="mt-6 text-2xl font-semibold">Every question, with the key</h3>
      <ol className="mt-2 grid gap-4" data-testid="mock-items">
        {items.map((item, i) => (
          <ResultCard key={item.question.id} item={item} index={i} seed={record.seed} shared={shared} />
        ))}
      </ol>
    </section>
  );
}
