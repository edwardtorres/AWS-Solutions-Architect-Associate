import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PwaUpdatePrompt from './PwaUpdatePrompt';

const registration = vi.hoisted(() => ({
  needRefresh: false,
  setNeedRefresh: vi.fn(),
  updateServiceWorker: vi.fn(),
}));

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [registration.needRefresh, registration.setNeedRefresh],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: registration.updateServiceWorker,
  }),
}));

describe('PwaUpdatePrompt', () => {
  beforeEach(() => {
    registration.needRefresh = false;
    registration.setNeedRefresh.mockReset();
    registration.updateServiceWorker.mockReset();
  });

  it('shows nothing while the current version is up to date', () => {
    render(<PwaUpdatePrompt />);
    expect(screen.queryByTestId('update-prompt')).toBeNull();
  });

  it('offers to reload into a downloaded new version', () => {
    registration.needRefresh = true;
    render(<PwaUpdatePrompt />);
    expect(screen.getByRole('status')).toHaveTextContent('A new version is ready.');
    fireEvent.click(screen.getByRole('button', { name: 'Reload to update' }));
    expect(registration.updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('hides the prompt when the player chooses Later', () => {
    registration.needRefresh = true;
    render(<PwaUpdatePrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(registration.setNeedRefresh).toHaveBeenCalledWith(false);
    expect(registration.updateServiceWorker).not.toHaveBeenCalled();
  });
});
