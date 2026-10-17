import { useEffect, useMemo, useState } from 'react';
import { BUILDING_BY_ID } from '../../data';
import { loadShared, type Shared } from '../../content/store';
import { DEFAULT_ENV } from '../../game/env';
import { workbenchAvailability } from '../../game/puzzle';
import { hrefFor, hrefWorkbench } from '../../lib/route';
import { loadScenario, loadWorkbench } from '../../puzzles/load';
import { PUZZLE_TYPE_NAME, type Answer, type Evaluation, type Field, type PuzzleModule, type Rule, type Scenario } from '../../puzzles/types';
import { useSaveStore, useSnapshot } from '../../save/context';
import { ExhibitView } from './ExhibitView';
import BuilderPuzzle from './BuilderPuzzle';

interface Loaded {
  module: PuzzleModule;
  scenario: Scenario<unknown>;
  next: string | null;
}

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

export default function PuzzlePage({ scenarioId }: { scenarioId: string | null }) {
  const { save } = useSnapshot();
  const [loaded, setLoaded] = useState<Loaded | null | undefined>(undefined);
  const [shared, setShared] = useState<Shared | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      const found = scenarioId ? await loadScenario(scenarioId) : null;
      const s = await loadShared();
      let next: string | null = null;
      if (found) {
        const mates = await loadWorkbench(found.scenario.building);
        const i = mates.findIndex((m) => m.scenario.id === found.scenario.id);
        next = mates.length > 1 ? (mates[(i + 1) % mates.length]?.scenario.id ?? null) : null;
      }
      if (live) {
        setShared(s);
        setLoaded(found ? { ...found, next } : null);
      }
    })();
    return () => {
      live = false;
    };
  }, [scenarioId]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [scenarioId]);

  if (loaded === undefined) return <p role="status">Loading puzzle…</p>;
  if (loaded === null) {
    return (
      <p>
        That puzzle does not exist. <a className="inline-link" href="#/map">Back to the city map</a>.
      </p>
    );
  }
  const { module, scenario } = loaded;
  const building = BUILDING_BY_ID.get(scenario.building);
  const avail = workbenchAvailability(save, scenario.building, { env: DEFAULT_ENV });
  const back = hrefWorkbench(scenario.building);
  const header = (
    <>
      <p className="text-sm text-[var(--fg-muted)]">
        {PUZZLE_TYPE_NAME[scenario.type]} · {building?.name} · level {scenario.difficulty}
      </p>
      <h2 className="text-3xl font-semibold leading-tight">{scenario.title}</h2>
    </>
  );
  if (!avail.ok) {
    return (
      <section aria-labelledby="puzzle-title" data-district={building?.district}>
        {header}
        <p role="status" className="mt-3 rounded-xl border-2 border-[var(--line)] p-3" data-testid="workbench-locked">
          {avail.message}
        </p>
        <a className="btn mt-3" href={hrefFor({ view: 'map', building: scenario.building })}>
          Back to the building
        </a>
      </section>
    );
  }
  if (scenario.type === 'architecture-builder') {
    return (
      <section data-district={building?.district}>
        {header}
        <BuilderPuzzle key={scenario.id} module={module} scenario={scenario} shared={shared} backHref={back} nextId={loaded.next} />
      </section>
    );
  }
  return (
    <section aria-labelledby="puzzle-title" data-district={building?.district}>
      {header}
      <FieldPuzzle key={scenario.id} module={module} scenario={scenario} shared={shared} backHref={back} nextId={loaded.next} />
    </section>
  );
}

function FieldPuzzle({ module, scenario, shared, backHref, nextId }: { module: PuzzleModule; scenario: Scenario<unknown>; shared: Shared | null; backHref: string; nextId: string | null }) {
  const store = useSaveStore();
  const fields: Field[] = useMemo(() => module.def.fields(scenario.data), [module, scenario]);
  const exhibit = useMemo(() => module.def.exhibit(scenario.data), [module, scenario]);
  const [chosen, setChosen] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<{ ok: boolean; xp: number; ev: Evaluation; mine: Answer; badges: string[] } | null>(null);

  const complete = fields.every((f) => (chosen[f.id]?.length ?? 0) >= 1);
  const toggle = (f: Field, id: string) => {
    setChosen((c) => {
      const cur = c[f.id] ?? [];
      return { ...c, [f.id]: f.multi ? (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]) : [id] };
    });
  };
  const submit = () => {
    const ev = module.def.evaluate(scenario.data);
    if (!ev) return;
    const ok = fields.every((f) => same(chosen[f.id] ?? [], ev.answer[f.id] ?? []));
    const r = store.playPuzzle({ id: scenario.id, building: scenario.building, difficulty: scenario.difficulty, correct: ok });
    setResult({ ok, xp: r?.xp ?? 0, ev, mine: chosen, badges: r?.newBadges ?? [] });
  };
  const ruleOf = (id: string): Rule | undefined => module.def.rules.find((r) => r.id === id) ?? module.def.scenarioRules?.(scenario.data).find((r) => r.id === id);
  const label = (f: Field, id: string) => f.options.find((o) => o.id === id)?.label ?? id;

  return (
    <div className="mt-3 grid gap-4">
      <p className="max-w-prose">{scenario.story}</p>
      <ExhibitView exhibit={exhibit} />
      {!result ? (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (complete) submit();
          }}
        >
          {fields.map((f) => (
            <fieldset key={f.id} className="rounded-2xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.72)] p-3">
              <legend className="px-1 text-lg">{f.prompt}</legend>
              <p className="text-sm text-[var(--fg-muted)]">{f.multi ? 'Choose every option that applies.' : 'Choose one.'}</p>
              <ul className="mt-2 grid gap-2">
                {f.options.map((o) => (
                  <li key={o.id}>
                    <label className="option-row" data-checked={(chosen[f.id] ?? []).includes(o.id) ? 'true' : 'false'}>
                      <input type={f.multi ? 'checkbox' : 'radio'} name={f.id} checked={(chosen[f.id] ?? []).includes(o.id)} onChange={() => { toggle(f, o.id); }} />
                      <span>{o.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          ))}
          <div>
            <button type="submit" className="btn" disabled={!complete}>
              Check my answer
            </button>
          </div>
        </form>
      ) : (
        <div data-testid="puzzle-result">
          <div role="status" className="rounded-xl border-2 border-[var(--accent)] bg-[rgba(245,185,66,0.12)] p-3">
            <p className="text-lg font-semibold" data-testid="puzzle-verdict">{result.ok ? 'Correct.' : 'Not quite.'} +{result.xp} XP</p>
            <p className="text-sm">Puzzles are practice: they earn XP and feed readiness, but never commission a building.</p>
            {result.badges.length > 0 && <p>New badge earned.</p>}
          </div>
          <dl className="mt-3 grid gap-2">
            {fields.map((f) => (
              <div key={f.id} className="rounded-lg border border-[var(--line)] p-2">
                <dt className="font-semibold">{f.prompt}</dt>
                <dd className="text-sm">Your answer: {(result.mine[f.id] ?? []).map((id) => label(f, id)).join(' | ') || '(none)'}</dd>
                <dd className="text-sm" data-testid={`computed-${f.id}`}>Computed answer: {(result.ev.answer[f.id] ?? []).map((id) => label(f, id)).join(' | ')}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-4 text-xl font-semibold">Why (rules applied, in order)</h3>
          <ol className="mt-2 grid gap-2">
            {result.ev.trace.map((t, i) => (
              <li key={i} className="rounded-lg border border-[var(--line)] p-2 text-sm">
                <p>{t.note}</p>
                {[t.rule, ...(t.also ?? [])].map((id) => {
                  const rule = ruleOf(id);
                  const src = rule ? shared?.sources.get(rule.src) : undefined;
                  return (
                    rule && (
                      <p key={id} className="mt-1 text-[var(--fg-muted)]">
                        Rule: {rule.text}
                        {src && (
                          <>
                            {' '}
                            <a className="inline-flex min-h-11 items-center underline underline-offset-4" href={src.url} target="_blank" rel="noreferrer noopener">
                              {src.title}
                            </a>
                          </>
                        )}
                      </p>
                    )
                  );
                })}
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setResult(null);
                setChosen({});
              }}
            >
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
      {!result && (
        <a className="btn justify-self-start" href={backHref}>
          Back to the Workbench
        </a>
      )}
    </div>
  );
}
