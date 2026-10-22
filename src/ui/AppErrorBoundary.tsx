import { Component, type ReactNode } from 'react';
import { downloadText } from '../save/download';
import { readRawSave } from '../save/rawSave';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Catches a crash anywhere in the app and offers the raw save before a reload. It reads storage directly and does not
 * depend on the save context, so it still works when the crash came from the app's own state.
 */
export default class AppErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  exportRaw(): void {
    const raw = readRawSave();
    if (raw === null) return;
    downloadText('region-builder-save-raw.json', raw);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    const hasSave = readRawSave() !== null;
    return (
      <main id="main" className="mx-auto max-w-prose p-4 sm:p-6" role="alert">
        <h1 className="font-display text-3xl font-semibold">Something went wrong</h1>
        <p className="mt-3 text-sm">
          The app stopped while it was drawing this page. Your save is still stored in this browser unless you clear site data.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {hasSave ? (
            <button type="button" className="btn" onClick={() => this.exportRaw()}>
              Export raw save
            </button>
          ) : (
            <p className="text-sm">No save was found in this browser.</p>
          )}
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            Reload
          </button>
          <a className="btn" href="#/map" onClick={() => this.setState({ failed: false })}>
            Back to the map
          </a>
        </div>
      </main>
    );
  }
}
