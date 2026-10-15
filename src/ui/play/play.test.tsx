import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Question } from '../../content/types';
import { SaveContext } from '../../save/context';
import { createSaveStore } from '../../save/store';
import { present } from '../../questions/present';
import { mulberry32 } from '../../lib/rng';
import { QuestionCard } from './QuestionCard';
import { ResultCard } from './ResultView';

const mk = (format: 'mc' | 'mr'): Question => ({
  id: 'gatehouse-001',
  building: 'gatehouse',
  bullets: ['1.2-K3'],
  format,
  select: format === 'mc' ? 1 : 2,
  difficulty: 2,
  stem: 'Which is right?',
  options: [
    { text: 'Right one', correct: true, why: 'Meets the requirement.' },
    { text: format === 'mc' ? 'Wrong A' : 'Right two', correct: format === 'mr', why: format === 'mc' ? 'Fails cost.' : 'Also meets it.' },
    { text: 'Wrong B', correct: false, why: 'Fails security.' },
    { text: 'Wrong C', correct: false, why: 'Fails availability.' },
    ...(format === 'mr' ? [{ text: 'Wrong D', correct: false, why: 'Fails speed.' }] : []),
  ],
  tags: ['trap:sg-vs-nacl'],
  evidence: [{ src: 'vpc-security-groups', text: 'x' }],
});

describe('QuestionCard', () => {
  it('multiple choice: radios, one answer, submit enabled after a choice', async () => {
    const onSubmit = vi.fn();
    render(<QuestionCard presented={present(mk('mc'), mulberry32(1))} position={1} total={5} onSubmit={onSubmit} />);
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    const submit = screen.getByRole('button', { name: /Submit/ });
    expect(submit).toBeDisabled();
    await userEvent.click(screen.getByLabelText(/Right one/));
    expect(submit).toBeEnabled();
    await userEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledWith([0]);
  });

  it('multiple response: checkboxes, submit needs exactly the stated count', async () => {
    const onSubmit = vi.fn();
    render(<QuestionCard presented={present(mk('mr'), mulberry32(2))} position={5} total={5} onSubmit={onSubmit} />);
    expect(screen.getByText('Choose 2 answers.')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: /Submit and finish/ });
    await userEvent.click(screen.getByLabelText(/Right one/));
    expect(submit).toBeDisabled();
    await userEvent.click(screen.getByLabelText(/Wrong B/));
    await userEvent.click(screen.getByLabelText(/Wrong C/));
    expect(submit).toBeDisabled(); // three selected
    await userEvent.click(screen.getByLabelText(/Wrong C/));
    expect(submit).toBeEnabled();
    await userEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledWith(expect.arrayContaining([0, 2]));
  });

  it('works by keyboard: space selects a focused option and enter submits', async () => {
    const onSubmit = vi.fn();
    render(<QuestionCard presented={present(mk('mc'), mulberry32(3))} position={1} total={2} onSubmit={onSubmit} />);
    await userEvent.tab();
    await userEvent.keyboard(' ');
    expect(screen.getAllByRole('radio').some((r) => (r as HTMLInputElement).checked)).toBe(true);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('keeps the shuffled order stable for the same seed and changes it for another', () => {
    const order = (seed: number) => present(mk('mc'), mulberry32(seed)).options.map((o) => o.index).join();
    expect(order(7)).toBe(order(7));
    const orders = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(order));
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe('ResultCard', () => {
  const store = createSaveStore({ knownIds: new Set(['gatehouse']), storage: null, now: () => '2026-01-01T00:00:00.000Z' });
  const shared = { sources: new Map([['vpc-security-groups', { id: 'vpc-security-groups', url: 'https://docs.aws.amazon.com/x', title: 'Security groups', kind: 'aws' as const }]]), glossary: [], confuse: [{ id: 'sg-vs-nacl', title: 'Security groups vs network ACLs', required: true, home: 'gatehouse', items: [], choose: [] }], renamed: [] };

  it('shows my answer beside the key, every explanation, sources and the confuse link', () => {
    const q = mk('mc');
    render(
      <SaveContext.Provider value={store}>
        <ol>
          <ResultCard item={{ question: q, chosen: [2], correct: false }} index={0} seed={5} shared={shared} />
        </ol>
      </SaveContext.Provider>,
    );
    expect(screen.getByTestId('my-answer')).toHaveTextContent('Wrong B');
    expect(screen.getByTestId('the-key')).toHaveTextContent('Right one');
    for (const why of ['Meets the requirement.', 'Fails cost.', 'Fails security.', 'Fails availability.']) expect(screen.getByText(new RegExp(why))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Security groups' })).toHaveAttribute('href', 'https://docs.aws.amazon.com/x');
    expect(screen.getByRole('link', { name: 'Security groups vs network ACLs' })).toHaveAttribute('href', '#/confuse/sg-vs-nacl');
  });

  it('flags a question with a note, lists it, and removes it', async () => {
    const q = mk('mc');
    render(
      <SaveContext.Provider value={store}>
        <ol>
          <ResultCard item={{ question: q, chosen: [1], correct: false }} index={0} seed={5} shared={shared} />
        </ol>
      </SaveContext.Provider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Flag this question' }));
    await userEvent.type(screen.getByLabelText(/What is wrong or unclear/), 'Unclear stem');
    await userEvent.click(screen.getByRole('button', { name: 'Save flag' }));
    expect(store.getSnapshot().save.game.flags).toHaveLength(1);
    expect(store.getSnapshot().save.game.flags[0]).toMatchObject({ questionId: 'gatehouse-001', note: 'Unclear stem', myAnswer: [1] });
    const done = screen.getByTestId('flag-done');
    await userEvent.click(within(done).getByRole('button', { name: 'Remove flag' }));
    expect(store.getSnapshot().save.game.flags).toHaveLength(0);
  });
});
