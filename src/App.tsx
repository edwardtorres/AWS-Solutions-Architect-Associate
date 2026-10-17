import { lazy, Suspense } from 'react';
import { CityMap } from './ui/CityMap';
import { navigate, useRoute } from './lib/route';
import { useSaveStore, useSnapshot } from './save/context';
import { rankFor } from './game/ranks';

// Code-split by feature: only the map ships in the first load.
const DetailPanel = lazy(() => import('./ui/DetailPanel'));
const Atlas = lazy(() => import('./ui/Atlas'));
const SaveMenu = lazy(() => import('./ui/SaveMenu'));
const Settings = lazy(() => import('./ui/Settings'));
const NotesPage = lazy(() => import('./ui/notes/NotesPage'));
const GlossaryPage = lazy(() => import('./ui/notes/GlossaryPage'));
const ConfusePage = lazy(() => import('./ui/notes/ConfusePage'));
const AttemptPage = lazy(() => import('./ui/play/AttemptPage'));
const ProgressPage = lazy(() => import('./ui/ProgressPage'));
const WorkbenchPage = lazy(() => import('./ui/puzzles/WorkbenchPage'));
const PuzzlePage = lazy(() => import('./ui/puzzles/PuzzlePage'));
const LabsPage = lazy(() => import('./ui/labs/LabsPage'));
const LabPage = lazy(() => import('./ui/labs/LabPage'));
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
  const rank = rankFor(snapshot.save.game.xp);

  const closePanel = () => {
    navigate({ view: route.view, building: null, param: null });
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
          <nav aria-label="Views" className="flex flex-wrap gap-2 sm:ml-auto">
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
            <a href="#/progress" className="btn" aria-current={route.view === 'progress' ? 'page' : undefined} data-testid="rank-chip">
              {rank.rank.name} · {snapshot.save.game.xp.toLocaleString('en-US')} XP
            </a>
            <a href="#/labs" className="btn" aria-current={route.view === 'labs' || route.view === 'lab' ? 'page' : undefined}>
              Labs
            </a>
            <a href="#/glossary" className="btn" aria-current={route.view === 'glossary' ? 'page' : undefined}>
              Glossary
            </a>
            <a href="#/confuse" className="btn" aria-current={route.view === 'confuse' ? 'page' : undefined}>
              Don&rsquo;t confuse
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
        {(route.view === 'map' || route.view === 'atlas') && (
          <h2 className="visually-hidden">{route.view === 'map' ? 'City map' : 'Service Atlas'}</h2>
        )}
        {route.view === 'map' && <CityMap view="map" activeId={route.building} />}
        <Suspense fallback={<p role="status">Loading…</p>}>
          {route.view === 'atlas' && <Atlas view="atlas" activeId={route.building} />}
          {route.view === 'notes' && <NotesPage buildingId={route.param ?? null} />}
          {route.view === 'glossary' && <GlossaryPage termId={route.param ?? null} />}
          {route.view === 'confuse' && <ConfusePage pairId={route.param ?? null} />}
          {route.view === 'startup' && <AttemptPage key={`s-${route.param}`} kind="startup" buildingId={route.param ?? null} />}
          {route.view === 'inspect' && <AttemptPage key={`i-${route.param}`} kind="inspection" buildingId={route.param ?? null} />}
          {route.view === 'place' && <AttemptPage key={`p-${route.param}`} kind="placement" buildingId={route.param ?? null} />}
          {route.view === 'progress' && <ProgressPage />}
          {route.view === 'workbench' && <WorkbenchPage key={route.param} buildingId={route.param ?? null} />}
          {route.view === 'labs' && <LabsPage />}
          {route.view === 'lab' && <LabPage key={route.param} labId={route.param ?? null} />}
          {route.view === 'puzzle' && <PuzzlePage key={route.param} scenarioId={route.param ?? null} />}
        </Suspense>
        <Suspense fallback={null}>
          <SaveMenu />
          <Settings />
        </Suspense>
        <footer className="mt-8 pb-8 text-xs text-[var(--fg-muted)]">
          Outline source: the official AWS exam guide for SAA-C03 (docs.aws.amazon.com). Spaced review and the mock exam arrive in later steps.
        </footer>
      </main>

      {route.building && (route.view === 'map' || route.view === 'atlas') && (
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
