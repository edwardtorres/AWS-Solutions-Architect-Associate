import { useEffect, useState } from 'react';
import { currentInstallContext } from '../lib/platform';
import { persistenceState, requestPersistence, type PersistenceState } from '../save/persist';

type Shown = PersistenceState | 'checking';

const TEXT: Record<Shown, string> = {
  checking: 'Checking whether the browser keeps this save…',
  granted: 'The browser has agreed to keep this site’s data.',
  'not-granted': 'The browser has not agreed to keep this site’s data. It may clear the data when it needs space or when the site is unused.',
  unsupported: 'This browser does not report whether it keeps site data.',
};

function InstallHelp() {
  const [install] = useState(() => currentInstallContext());
  if (install.standalone) return <p className="text-sm">This app is installed. Open it from its home-screen icon.</p>;
  if (!install.ios) return <p className="text-sm">Your browser may offer an install option in its address bar or menu.</p>;
  return (
    <div>
      <p className="text-sm font-semibold">Install on iPhone</p>
      <ol className="mt-1 list-decimal pl-5 text-sm">
        <li>Open this page in Safari.</li>
        <li>Tap the Share button.</li>
        <li>Tap Add to Home Screen, then Add.</li>
      </ol>
    </div>
  );
}

/** Save protection: whether the browser keeps the save, how to ask for it, and how to install the app. */
export default function SaveProtection() {
  const [state, setState] = useState<Shown>('checking');

  useEffect(() => {
    let active = true;
    void persistenceState().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const ask = async (): Promise<void> => {
    setState('checking');
    setState(await requestPersistence());
  };

  return (
    <section aria-labelledby="protect-heading" className="mt-2" data-testid="save-protection">
      <h3 id="protect-heading" className="text-lg font-semibold">
        Save protection
      </h3>
      <p className="mt-2 text-sm" data-testid="persist-status" role="status">
        {TEXT[state]}
      </p>
      {state !== 'unsupported' && (
        <button type="button" className="btn mt-2" onClick={() => void ask()}>
          Ask the browser to keep my save
        </button>
      )}
      <p className="mt-3 text-sm text-[var(--fg-muted)]">
        Safari may clear site data for sites you have not used for a while. Installing the app and exporting a backup both protect your progress.
      </p>
      <div className="mt-3">
        <InstallHelp />
      </div>
    </section>
  );
}
