import { useMemo, useState } from 'react';
import { KIND_LABEL, TIER_LABEL, TIERS, reference, score, type BuilderData, type CheckResult, type Kind, type Placed, type Tier } from '../../puzzles/architecture-builder/def';
import type { PuzzleModule, Scenario } from '../../puzzles/types';
import type { Shared } from '../../content/store';
import { useSaveStore } from '../../save/context';
import { ExhibitView } from './ExhibitView';

const SHORT: Record<Kind, string> = { alb: 'ALB', app: 'App', nat: 'NAT', 'db-primary': 'DB primary', 'db-standby': 'DB standby', cache: 'Cache', queue: 'SQS' };
const zoneName = (az: number) => (az < 0 ? 'Regional' : `Zone ${String.fromCharCode(65 + az)}`);
const cellLabel = (tier: Tier, az: number) => (tier === 'regional' ? TIER_LABEL.regional : `${TIER_LABEL[tier]}, ${zoneName(az)}`);

interface Props {
  module: PuzzleModule;
  scenario: Scenario<unknown>;
  shared: Shared | null;
  backHref: string;
  nextId: string | null;
}

/** Architecture Builder: tap a component, then tap a cell; tap a placed component to remove it. Scored by explicit sourced checks. */
export default function BuilderPuzzle({ module, scenario, shared, backHref, nextId }: Props) {
  const store = useSaveStore();
  const data = scenario.data as BuilderData;
  const exhibit = useMemo(() => module.def.exhibit(scenario.data), [module, scenario]);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [selected, setSelected] = useState<Kind | null>(null);
  const [result, setResult] = useState<{ checks: CheckResult[]; ok: boolean; xp: number } | null>(null);
  const [showRef, setShowRef] = useState(false);

  const remaining = (k: Kind) => (data.palette.find((p) => p.kind === k)?.count ?? 0) - placed.filter((p) => p.kind === k).length;
  const accepts = (k: Kind, tier: Tier) => (k === 'queue' ? tier === 'regional' : tier !== 'regional');
  const zones = Array.from({ length: data.azs }, (_, i) => i);

  const put = (tier: Tier, az: number) => {
    if (!selected || !accepts(selected, tier) || remaining(selected) <= 0) return;
    setPlaced((p) => [...p, { kind: selected, tier, az }]);
    if (remaining(selected) <= 1) setSelected(null);
  };
  const remove = (index: number) => {
    setPlaced((p) => p.filter((_, i) => i !== index));
  };
  const check = () => {
    const checks = score(data, placed);
    const ok = checks.every((c) => c.pass);
    const r = store.playPuzzle({ id: scenario.id, building: scenario.building, difficulty: scenario.difficulty, correct: ok, bullets: scenario.bullets });
    setResult({ checks, ok, xp: r?.xp ?? 0 });
  };
  const reset = () => {
    setResult(null);
    setPlaced([]);
    setSelected(null);
    setShowRef(false);
  };

  const cell = (tier: Tier, az: number) => {
    const items = placed.map((p, i) => ({ p, i })).filter(({ p }) => p.tier === tier && p.az === az);
    return (
      <div key={`${tier}-${az}`} className="board-cell" data-testid={`cell-${tier}-${az}`}>
        <button
          type="button"
          className="btn w-full"
          disabled={!selected || !accepts(selected, tier) || remaining(selected) <= 0 || result !== null}
          aria-label={`Place ${selected ? KIND_LABEL[selected] : 'the selected component'} in ${cellLabel(tier, az)}`}
          onClick={() => {
            put(tier, az);
          }}
        >
          {tier === 'regional' ? 'Regional' : zoneName(az)}
        </button>
        <ul className="mt-1 grid gap-1">
          {items.map(({ p, i }) => (
            <li key={i}>
              <button type="button" className="chip remove-chip w-full" disabled={result !== null} onClick={() => { remove(i); }}>
                {SHORT[p.kind]}
                <span className="visually-hidden"> (tap to remove from {cellLabel(tier, az)})</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="mt-3 grid gap-4">
      <p className="max-w-prose">{scenario.story}</p>
      <ExhibitView exhibit={exhibit} />

      <section aria-labelledby="palette-h" className="rounded-2xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.72)] p-3">
        <h3 id="palette-h" className="text-lg font-semibold">
          1. Pick a component
        </h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {data.palette.map((p) => (
            <li key={p.kind}>
              <button
                type="button"
                className="btn"
                aria-pressed={selected === p.kind}
                disabled={remaining(p.kind) <= 0 || result !== null}
                onClick={() => {
                  setSelected(selected === p.kind ? null : p.kind);
                }}
              >
                {SHORT[p.kind]} ({remaining(p.kind)} left)
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">{selected ? `Selected: ${KIND_LABEL[selected]}. Now tap a cell below.` : 'Tap a component, then tap the cell where it goes. Tap a placed component to take it back.'}</p>
      </section>

      <section aria-labelledby="board-h" className="rounded-2xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.72)] p-3">
        <h3 id="board-h" className="text-lg font-semibold">
          2. Build the design
        </h3>
        <div className="mt-2 grid gap-3">
          {TIERS.filter((t) => t !== 'regional').map((tier) => (
            <div key={tier}>
              <p className="font-semibold">{TIER_LABEL[tier]}</p>
              <div className="board-row" data-azs={data.azs}>
                {zones.map((az) => cell(tier, az))}
              </div>
            </div>
          ))}
          <div>
            <p className="font-semibold">{TIER_LABEL.regional}</p>
            <div className="board-row" data-azs={1}>
              {cell('regional', -1)}
            </div>
          </div>
        </div>
      </section>

      {!result ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" disabled={placed.length === 0} onClick={check}>
            Check my design
          </button>
          <button type="button" className="btn" disabled={placed.length === 0} onClick={reset}>
            Clear the board
          </button>
          <a className="btn" href={backHref}>
            Back to the Workbench
          </a>
        </div>
      ) : (
        <div data-testid="puzzle-result">
          <div role="status" className="rounded-xl border-2 border-[var(--accent)] bg-[rgba(245,185,66,0.12)] p-3">
            <p className="text-lg font-semibold" data-testid="puzzle-verdict">{result.ok ? 'Every requirement is met.' : 'Not every requirement is met.'} +{result.xp} XP</p>
            <p className="text-sm">Full credit needs every check to pass. Puzzles are practice and never commission a building.</p>
          </div>
          <ol className="mt-3 grid gap-2">
            {result.checks.map((c) => (
              <li key={c.id} className="rounded-lg border border-[var(--line)] p-2 text-sm" data-pass={c.pass ? 'true' : 'false'}>
                <p className="font-semibold">{c.pass ? 'Met' : 'Not met'}: {c.need}</p>
                <p>{c.detail}</p>
                <p className="text-[var(--fg-muted)]">
                  {c.rules.map((rid) => {
                    const rule = module.def.rules.find((r) => r.id === rid);
                    const src = rule ? shared?.sources.get(rule.src) : undefined;
                    return rule ? (
                      <span key={rid} className="block">
                        Rule: {rule.text}{' '}
                        {src && (
                          <a className="inline-flex min-h-11 items-center underline underline-offset-4" href={src.url} target="_blank" rel="noreferrer noopener">
                            {src.title}
                          </a>
                        )}
                      </span>
                    ) : null;
                  })}
                </p>
              </li>
            ))}
          </ol>
          {!result.ok && (
            <div className="mt-3">
              <button type="button" className="btn" onClick={() => { setShowRef((v) => !v); }}>
                {showRef ? 'Hide one solution' : 'Show one solution'}
              </button>
              {showRef && (
                <ul className="mt-2 text-sm" data-testid="reference-solution">
                  {(reference(data) ?? []).map((p, i) => (
                    <li key={i}>{KIND_LABEL[p.kind]}: {cellLabel(p.tier, p.az)}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={reset}>
              Try again
            </button>
            {nextId && (
              <a className="btn" href={`#/puzzle/${nextId}`}>
                Next puzzle
              </a>
            )}
            <a className="btn" href={backHref}>
              Back to the Workbench
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
