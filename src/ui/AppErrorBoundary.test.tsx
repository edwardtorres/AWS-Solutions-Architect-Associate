import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppErrorBoundary from './AppErrorBoundary';
import { STORAGE_KEY } from '../save/schema';

function Broken(): ReactNode {
  throw new Error('render failed');
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    // React logs the caught error; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders the app when nothing fails', () => {
    render(
      <AppErrorBoundary>
        <p>the city</p>
      </AppErrorBoundary>,
    );
    expect(screen.getByText('the city')).toBeInTheDocument();
  });

  it('offers the raw save after a crash when one is stored', () => {
    window.localStorage.setItem(STORAGE_KEY, '{"version":6}');
    render(
      <AppErrorBoundary>
        <Broken />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Export raw save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });

  it('says so, without an export button, when no save is stored', () => {
    render(
      <AppErrorBoundary>
        <Broken />
      </AppErrorBoundary>,
    );
    expect(screen.queryByRole('button', { name: 'Export raw save' })).toBeNull();
    expect(screen.getByText('No save was found in this browser.')).toBeInTheDocument();
  });

  it('can return to the map without a reload', () => {
    render(
      <AppErrorBoundary>
        <Broken />
      </AppErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('link', { name: 'Back to the map' }));
    // The child is still broken, so the fallback comes back; the point is that the link resets the boundary without throwing.
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
