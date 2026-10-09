import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Question } from '../content/types';
import { parseHash } from '../lib/route';
import QuestionBrowser from './QuestionBrowser';
import Settings from './Settings';

const q = (id: string, tags: string[] = []): Question => ({
  id,
  building: 'gatehouse',
  bullets: ['1.1-K1'],
  format: 'mc',
  select: 1,
  difficulty: 2,
  stem: `Stem for ${id}`,
  options: [
    { text: 'Right answer', correct: true, why: 'Because it meets the requirement.' },
    { text: 'Wrong one', correct: false, why: 'Fails the cost requirement.' },
    { text: 'Wrong two', correct: false, why: 'Fails the security requirement.' },
    { text: 'Wrong three', correct: false, why: 'Fails the availability requirement.' },
  ],
  tags,
  evidence: [{ src: 'iam', text: 'x' }],
});

describe('question access', () => {
  it('has no route to the answer key', () => {
    for (const hash of ['#/questions', '#/browse', '#/questions/gatehouse', '#/answers']) {
      expect(parseHash(hash).view).toBe('map');
    }
  });

  it('shows a warning before the browser opens, and can be cancelled', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    expect(screen.queryByText(/Stem for/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Browse questions' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/less meaningful/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Browse questions' }));
    await user.click(screen.getByRole('button', { name: 'I understand, open the browser' }));
    expect(await screen.findByRole('button', { name: 'Close the browser' })).toBeInTheDocument();
  });

  it('lists questions by building, hides answers until asked, and never lists the mock reserve', async () => {
    const user = userEvent.setup();
    render(<QuestionBrowser questions={[q('gatehouse-a'), q('gatehouse-reserve', ['mock-reserve'])]} />);
    await user.selectOptions(screen.getByLabelText('Building'), 'gatehouse');
    expect(screen.getByText('Stem for gatehouse-a')).toBeInTheDocument();
    expect(screen.queryByText('Stem for gatehouse-reserve')).toBeNull();
    expect(screen.queryByText(/Because it meets the requirement/)).toBeNull();
    await user.click(screen.getByRole('radio', { name: /Right answer/ }));
    await user.click(screen.getByRole('button', { name: 'Show answer' }));
    expect(screen.getByText(/Because it meets the requirement/)).toBeInTheDocument();
    expect(screen.getByText(/Your choice is correct/)).toBeInTheDocument();
    expect(screen.getByText(/Fails the cost requirement/)).toBeInTheDocument();
  });
});
