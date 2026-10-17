import { useEffect, useMemo, useState } from 'react';
import type { Question } from '../../content/types';
import { loadShared, type Shared } from '../../content/store';
import { SERVICE_PLANS } from '../../../content/labs/services';
import { DEBRIEF_SIZE, LAB_XP, type Lab, type LabStep } from '../../labs/types';
import { EXPORT_WARNING, exportLabNotes } from '../../labs/export';
import { loadLab, loadTemplate } from '../../labs/load';
import { LAB_META_BY_ID } from '../../labs/meta';
import { attemptRandom } from '../../lib/rng';
import { hrefConfuse, hrefLab, hrefFor } from '../../lib/route';
import { loadQuestions } from '../../questions/pool';
import { present } from '../../questions/present';
import { useSaveStore, useSnapshot } from '../../save/context';
import { BUILDING_BY_ID } from '../../data';
import { QuestionCard } from '../play/QuestionCard';
import { ResultCard, type ResultItem } from '../play/ResultView';
import { BillsBadge, PlanBadge, PlanExplain } from './badges';
import { downloadText } from './download';

const KIND_TITLE = { do: 'Do', check: 'Check', cleanup: 'Clean up', verify: 'Verify nothing billable remains' } as const;

function Step({ lab, step, index, shared }: { lab: Lab; step: LabStep; index: number; shared: Shared | null }) {
  const store = useSaveStore();
  const { save } = useSnapshot();
  const p = save.labs.progress[lab.id];
  const ticked = p?.steps[step.id] === true;
  const note = p?.notes[step.id] ?? '';
  const [open, setOpen] = useState(false);
  const src = shared?.sources.get(step.src);
  const trap = lab.traps.find((t) => t.step === step.id);
  const costs = (step.costs ?? []).map((id) => lab.costs.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c);
  const kind = step.kind ?? 'do';
  return (
    <li id={`step-${step.id}`} className="rounded-xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.6)] p-3" data-testid="lab-step" data-ticked={ticked ? 'true' : 'false'}>
      <label className="flex min-h-11 items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-6 w-6 shrink-0"
          checked={ticked}
          onChange={(e) => {
            store.setLabStep(lab.id, step.id, e.target.checked);
          }}
          aria-label={`Step ${index + 1} done`}
        />
        <span>
          <span className="font-semibold">Step {index + 1}.</span> {step.text}
        </span>
      </label>
      <div className="mt-1 flex flex-wrap gap-2 pl-9 text-sm">
        {kind !== 'do' && <span className="chip">{KIND_TITLE[kind]}</span>}
        {step.optional && <span className="chip">Optional</span>}
        {costs.map((c) => (
          <BillsBadge key={c.id} resource={c.resource} basis={c.basis} />
        ))}
        {step.sensitive && <span className="chip border-2 border-[var(--accent)]">Private values on this screen</span>}
      </div>
      <div className="pl-9">
        {costs.map((c) => (
          <p key={c.id} className="mt-1 text-sm">
            <strong>Bills while it exists ({c.resource}):</strong> {c.basis}
          </p>
        ))}
        {step.alt && (
          <p className="mt-1 text-sm">
            <strong>Free or cheaper way:</strong> {step.alt}
          </p>
        )}
        {step.checkpoint && (
          <p className="mt-1 text-sm" data-testid="checkpoint">
            <strong>You should see:</strong> {step.checkpoint}
          </p>
        )}
        {step.code && (
          <div className="mt-1">
            <pre tabIndex={0} aria-label="CloudShell command" className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--line)] bg-[rgba(0,0,0,0.3)] p-2 text-sm"><code>{step.code}</code></pre>
            <button
              type="button"
              className="btn mt-1"
              onClick={() => {
                try {
                  void navigator.clipboard.writeText(step.code ?? '');
                } catch {
                  /* clipboard blocked: select the text by hand */
                }
              }}
            >
              Copy the command
            </button>
          </div>
        )}
        {step.sensitive && (
          <p className="mt-1 text-sm text-[var(--fg-muted)]" data-testid="sensitive-warning">
            This screen shows account IDs, ARNs, keys or email addresses. Do not paste them into a problem note.
          </p>
        )}
        {trap && (
          <div className="mt-2 rounded-lg border-2 border-[var(--accent)] bg-[rgba(245,185,66,0.1)] p-2 text-sm" data-testid="trap">
            <p>
              <strong>Trap you&rsquo;ll see:</strong> {trap.text}{' '}
              <a className="inline-link" href={hrefConfuse(trap.pair)}>
                Open the don&rsquo;t-confuse page
              </a>
            </p>
          </div>
        )}
        <p className="mt-1 text-sm">
          Source:{' '}
          {src ? (
            <a className="inline-link" href={src.url} target="_blank" rel="noreferrer noopener">
              {src.title}
            </a>
          ) : (
            step.src
          )}
        </p>
        <details className="mt-1 text-sm">
          <summary className="min-h-11 cursor-pointer py-2">What the page says</summary>
          <p className="mt-1 max-w-prose italic">“{step.quote}”</p>
        </details>
        <div className="mt-1">
          <button
            type="button"
            className="btn"
            aria-expanded={open}
            onClick={() => {
              setOpen(!open);
            }}
          >
            {note ? 'Edit the problem note' : 'Report a problem'}
          </button>
          {note && !open && <span className="ml-2 text-sm" data-testid="note-saved">Problem noted.</span>}
          {open && (
            <div className="mt-2">
              <label className="grid gap-1 text-sm font-semibold">
                What did not match? (saved in this browser; exported with “Export lab notes”)
                <textarea
                  className="min-h-24 rounded-lg border-2 border-[var(--line)] bg-transparent p-2 font-normal"
                  value={note}
                  maxLength={1000}
                  onChange={(e) => {
                    store.setLabNote(lab.id, step.id, e.target.value);
                  }}
                />
              </label>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">{EXPORT_WARNING}</p>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function TemplateView({ name }: { name: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void loadTemplate(name).then((t) => {
      if (live) setText(t);
    });
    return () => {
      live = false;
    };
  }, [name]);
  return (
    <details className="mt-2 rounded-xl border-2 border-[var(--line)] p-2" data-testid="template">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">Template: {name}</summary>
      {text === null ? (
        <p role="status">Loading the template…</p>
      ) : (
        <>
          <div className="mt-1 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn"
              onClick={() => {
                try {
                  void navigator.clipboard.writeText(text);
                } catch {
                  /* clipboard blocked: select the text by hand */
                }
              }}
            >
              Copy the template
            </button>
            <button
              type="button"
              className="btn"
              data-testid="download-template"
              onClick={() => {
                downloadText(name, text);
              }}
            >
              Download {name}
            </button>
          </div>
          <pre tabIndex={0} aria-label={`Template ${name}`} className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--line)] bg-[rgba(0,0,0,0.3)] p-2 text-xs"><code>{text}</code></pre>
        </>
      )}
    </details>
  );
}

function Debrief({ lab, shared }: { lab: Lab; shared: Shared | null }) {
  const store = useSaveStore();
  const { save } = useSnapshot();
  const [bank, setBank] = useState<readonly Question[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void loadQuestions().then((q) => {
      if (live) setBank(q);
    });
    return () => {
      live = false;
    };
  }, []);
  const lookup = useMemo(() => {
    const m = new Map((bank ?? []).map((q) => [q.id, q]));
    return (id: string) => m.get(id);
  }, [bank]);
  const meta = LAB_META_BY_ID.get(lab.id);
  const d = save.labs.progress[lab.id]?.debrief;
  if (!meta) return null;
  const ref = { id: meta.id, bullets: meta.bullets, required: meta.required };

  if (!bank) return <p role="status">Loading questions…</p>;
  if (!d || d.finishedAt) {
    const items: ResultItem[] = d?.finishedAt
      ? d.questionIds.flatMap((id) => {
          const q = lookup(id);
          const a = d.answers[id];
          return q && a ? [{ question: q, chosen: a.chosen, correct: a.correct }] : [];
        })
      : [];
    return (
      <div>
        {d?.finishedAt && (
          <div role="status" className="mb-3 rounded-xl border-2 border-[var(--accent)] bg-[rgba(245,185,66,0.12)] p-3" data-testid="debrief-summary">
            <p className="font-semibold">
              Debrief: {d.correct} of {d.questionIds.length} correct. These answers count towards your readiness; no building changed.
            </p>
          </div>
        )}
        {problem && <p role="alert" className="mb-2 rounded-xl border-2 border-[#f87171] p-3">{problem}</p>}
        <button
          type="button"
          className="btn"
          data-testid="start-debrief"
          onClick={() => {
            void store.startDebrief(ref, bank).then((r) => {
              setProblem(r.ok ? null : r.message);
            });
          }}
        >
          {d?.finishedAt ? 'Take another debrief' : `Start the ${DEBRIEF_SIZE}-question debrief`}
        </button>
        {items.length > 0 && (
          <ol className="mt-4 grid gap-4">
            {items.map((item, i) => (
              <ResultCard key={item.question.id} item={item} index={i} seed={d?.seed ?? 0} shared={shared} />
            ))}
          </ol>
        )}
      </div>
    );
  }
  const nextId = d.questionIds.find((id) => !d.answers[id]);
  const q = nextId ? lookup(nextId) : undefined;
  if (!q) return <p role="status">Loading the next question…</p>;
  return (
    <QuestionCard
      key={q.id}
      presented={present(q, attemptRandom(d.seed, q.id))}
      position={d.questionIds.filter((id) => d.answers[id]).length + 1}
      total={d.questionIds.length}
      onSubmit={(chosen) => {
        store.submitDebriefAnswer(lab.id, q.id, chosen, lookup);
      }}
    />
  );
}

export default function LabPage({ labId }: { labId: string | null }) {
  const store = useSaveStore();
  const { save } = useSnapshot();
  const meta = labId ? LAB_META_BY_ID.get(labId) : undefined;
  const [lab, setLab] = useState<Lab | null>(null);
  const [shared, setShared] = useState<Shared | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    if (labId) {
      void Promise.all([loadLab(labId), loadShared()]).then(([l, s]) => {
        if (live) {
          setLab(l);
          setShared(s);
        }
      });
    }
    return () => {
      live = false;
    };
  }, [labId]);

  if (!meta) {
    return (
      <p>
        That lab does not exist. <a className="inline-link" href="#/labs">Back to the labs</a>.
      </p>
    );
  }
  if (!lab) return <p role="status">Loading the lab…</p>;

  const p = save.labs.progress[lab.id];
  const steps = lab.steps.map((s, i) => ({ s, i }));
  const main = steps.filter(({ s }) => (s.kind ?? 'do') === 'do' || s.kind === 'check');
  const cleanup = steps.filter(({ s }) => s.kind === 'cleanup');
  const verify = steps.filter(({ s }) => s.kind === 'verify');
  const missing = meta.required.filter((id) => !p?.steps[id]);
  const noteCount = Object.keys(p?.notes ?? {}).length;
  const needs = meta.needs.map((id) => LAB_META_BY_ID.get(id)).filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <article aria-labelledby="lab-title">
      <p className="text-sm text-[var(--fg-muted)]">
        <a className="inline-link" href="#/labs">
          All labs
        </a>{' '}
        · Lab {lab.n}
      </p>
      <h2 id="lab-title" className="text-3xl font-semibold">
        {lab.title}
      </h2>
      <p className="mt-2 max-w-prose">{lab.goal}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-sm">
        <PlanBadge plan={meta.plan} />
        <span className="chip">{lab.minutes} min</span>
        {lab.costs.map((c) => (
          <BillsBadge key={c.id} resource={c.resource} basis={c.basis} />
        ))}
      </div>
      <PlanExplain plan={meta.plan} services={lab.services} />

      <section className="mt-4 rounded-2xl border-2 border-[var(--line)] p-3" aria-labelledby="lab-before">
        <h3 id="lab-before" className="text-xl font-semibold">
          Before you start
        </h3>
        <ul className="mt-1 grid list-disc gap-1 pl-5 text-sm">
          <li>Use your dedicated lab account, not your portfolio account. Stay in one Region.</li>
          {needs.length > 0 && (
            <li>
              Finish first:{' '}
              {needs.map((n, i) => (
                <span key={n.id}>
                  {i > 0 && ', '}
                  <a className="inline-link" href={hrefLab(n.id)}>
                    Lab {n.n}
                  </a>
                  {save.labs.progress[n.id]?.completedAt ? ' (complete)' : ''}
                </span>
              ))}
              .
            </li>
          )}
          <li>
            Mapped buildings:{' '}
            {lab.buildings.map((b, i) => (
              <span key={b}>
                {i > 0 && ', '}
                <a className="inline-link" href={hrefFor({ view: 'map', building: b })}>
                  {BUILDING_BY_ID.get(b)?.name ?? b}
                </a>
              </span>
            ))}
            .
          </li>
          <li>
            Services: {lab.services.map((s) => `${s}${SERVICE_PLANS[s]?.plan === 'free' ? ' (Free plan: confirmed)' : SERVICE_PLANS[s]?.plan === 'paid' ? ' (Paid plan only)' : ' (Free plan: not confirmed)'}`).join('; ')}.
          </li>
          {(lab.templates ?? []).length > 0 && <li>Scaffolding comes from a CloudFormation template; deleting its stack is the cleanup.</li>}
          <li>Nothing here states prices. Anything marked “bills while running” keeps billing until you delete it.</li>
        </ul>
      </section>

      {(lab.templates ?? []).length > 0 && (
        <section className="mt-4" aria-labelledby="lab-templates">
          <h3 id="lab-templates" className="text-xl font-semibold">
            CloudFormation templates
          </h3>
          <p className="mt-1 max-w-prose text-sm">Copy or download the template, then create the stack as the steps say. Deleting the stack is the cleanup. Read the template before you use it.</p>
          {(lab.templates ?? []).map((t) => (
            <TemplateView key={t} name={t} />
          ))}
        </section>
      )}

      <h3 className="mt-6 text-2xl font-semibold">Steps</h3>
      <ol className="mt-2 grid gap-3" data-testid="lab-steps">
        {main.map(({ s, i }) => (
          <Step key={s.id} lab={lab} step={s} index={i} shared={shared} />
        ))}
      </ol>
      <h3 className="mt-6 text-2xl font-semibold" id="cleanup-title">
        Cleanup checklist
      </h3>
      <ol className="mt-2 grid gap-3" aria-labelledby="cleanup-title" data-testid="lab-cleanup">
        {cleanup.map(({ s, i }) => (
          <Step key={s.id} lab={lab} step={s} index={i} shared={shared} />
        ))}
      </ol>
      <h3 className="mt-6 text-2xl font-semibold" id="verify-title">
        Verify nothing billable remains
      </h3>
      <ol className="mt-2 grid gap-3" aria-labelledby="verify-title" data-testid="lab-verify">
        {verify.map(({ s, i }) => (
          <Step key={s.id} lab={lab} step={s} index={i} shared={shared} />
        ))}
      </ol>

      <section className="mt-6 rounded-2xl border-2 border-[var(--line)] p-3 sm:p-4" aria-labelledby="lab-finish" data-testid="lab-finish">
        <h3 id="lab-finish" className="text-2xl font-semibold">
          Finish
        </h3>
        {p?.completedAt ? (
          <p role="status" data-testid="lab-complete">
            Lab complete. Fixed XP was paid once ({LAB_XP} XP). No building changed.
          </p>
        ) : (
          <>
            <p className="max-w-prose text-sm">
              Completion is self-reported. Tick the whole cleanup checklist and the verification step first, so nothing billable is left behind. It earns {LAB_XP} XP once and never commissions a building.
            </p>
            {missing.length > 0 && <p className="mt-1 text-sm text-[var(--fg-muted)]">Still to tick: {missing.length} cleanup or verification step{missing.length === 1 ? '' : 's'}.</p>}
            {message && <p role="alert" className="mt-2 rounded-xl border-2 border-[#f87171] p-2 text-sm">{message}</p>}
            <button
              type="button"
              className="btn mt-2"
              disabled={missing.length > 0}
              data-testid="complete-lab"
              onClick={() => {
                const r = store.completeLab({ id: meta.id, bullets: meta.bullets, required: meta.required });
                setMessage(r.ok ? null : r.message);
              }}
            >
              Mark this lab complete
            </button>
          </>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn"
            data-testid="export-notes"
            onClick={() => {
              downloadText(`${lab.id}-notes.txt`, exportLabNotes([{ lab, progress: store.getSnapshot().save.labs.progress[lab.id] }], store.today()));
            }}
          >
            Export lab notes
          </button>
          <span className="text-sm text-[var(--fg-muted)]">{noteCount} problem note{noteCount === 1 ? '' : 's'} on this lab. {EXPORT_WARNING}</span>
        </div>
      </section>

      <section className="mt-6" aria-labelledby="lab-debrief">
        <h3 id="lab-debrief" className="text-2xl font-semibold">
          Debrief
        </h3>
        {p?.completedAt ? (
          <>
            <p className="mt-1 max-w-prose text-sm">
              {DEBRIEF_SIZE} questions from this lab&rsquo;s outline bullets. Full credit only; the key shows after the last answer. They count towards readiness like inspection answers.
            </p>
            <div className="mt-2">
              <Debrief lab={lab} shared={shared} />
            </div>
          </>
        ) : (
          <p className="mt-1 text-sm text-[var(--fg-muted)]" data-testid="debrief-locked">
            The debrief opens once the lab is marked complete.
          </p>
        )}
      </section>
    </article>
  );
}
