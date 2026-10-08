import { lazy, Suspense } from 'react';
import { CityMap } from './ui/CityMap';
import { navigate, useRoute } from './lib/route';
import { useSaveStore, useSnapshot } from './save/context';

// Code-split by feature: only the map ships in the first load.
const DetailPanel = lazy(() => import('./ui/DetailPanel'));
const Atlas = lazy(() => import('./ui/Atlas'));
const SaveMenu = lazy(() => import('./ui/SaveMenu'));
const DevToolbar = import.meta.env.DEV ? lazy(() => import('./dev/DevToolbar')) : null;

const NOTICE: Record<string, string | undefined> = {
  'corrupt-recovered':
    'Your saved progress could not be read, so a fresh save was started. The unreadable data was kept in this browser in case it can be recovered.',
  'future-readonly':
    'This save was written by a newer version of the app. It is loaded read-only and will not be overwritten. Update the app, or import a backup to replace it.',
  'storage-unavailable': 'This browser is blocking storage, so progress will not be kept after you close the page.',
};

export default function App() {
  const route = useRoute();
  const store = useSaveStore();
  const snapshot = useSnapshot();
  const notice = NOTICE[snapshot.status];

  const closePanel = () => {
    navigate({ view: route.view, building: null });
  };

  return (
    <>
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Skip to content
      </a>
      <header className="border-b border-[var(--line)] bg-[rgba(11,26,43,0.85)]">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <div>
            <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">Region Builder</h1>
            <p className="text-sm text-[var(--fg-muted)]">AWS Certified Solutions Architect – Associate (SAA-C03)</p>
          </div>
          <nav aria-label="Views" className="flex gap-2 sm:ml-auto">
            <a
              href="#/map"
              className="btn"
              aria-current={route.view === 'map' ? 'page' : undefined}
              onClick={() => store.setUi({ view: 'map' })}
            >
              City map
            </a>
            <a
              href="#/atlas"
              className="btn"
              aria-current={route.view === 'atlas' ? 'page' : undefined}
              onClick={() => store.setUi({ view: 'atlas' })}
            >
              Service Atlas
            </a>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-[1500px] px-4 py-4 outline-none">
        {notice && (
          <p role="status" className="mb-4 rounded-xl border-2 border-[var(--accent)] bg-[rgba(245,185,66,0.12)] p-3 text-sm">
            {notice}
          </p>
        )}
        <h2 className="visually-hidden">{route.view === 'map' ? 'City map' : 'Service Atlas'}</h2>
        {route.view === 'map' ? (
          <CityMap view={route.view} activeId={route.building} />
        ) : (
          <Suspense fallback={<p>Loading the atlas…</p>}>
            <Atlas view={route.view} activeId={route.building} />
          </Suspense>
        )}
        <Suspense fallback={null}>
          <SaveMenu />
        </Suspense>
        <footer className="mt-8 pb-8 text-xs text-[var(--fg-muted)]">
          Outline source: the official AWS exam guide for SAA-C03 (docs.aws.amazon.com). Study notes, questions and labs arrive in later steps.
        </footer>
      </main>

      {route.building && (
        <Suspense fallback={null}>
          <DetailPanel buildingId={route.building} view={route.view} onClose={closePanel} />
        </Suspense>
      )}
      {DevToolbar && (
        <Suspense fallback={null}>
          <DevToolbar />
        </Suspense>
      )}
    </>
  );
}
