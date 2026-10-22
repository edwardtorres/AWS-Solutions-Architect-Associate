import { useRegisterSW } from 'virtual:pwa-register/react';

/** Shown when a new version of the app has been downloaded. Reloading applies it; nothing is lost because saves are local. */
export default function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div role="status" data-testid="update-prompt" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border-2 border-[var(--accent)] p-3 text-sm">
      <span>A new version is ready.</span>
      <button type="button" className="btn" onClick={() => void updateServiceWorker(true)}>
        Reload to update
      </button>
      <button type="button" className="btn" onClick={() => setNeedRefresh(false)}>
        Later
      </button>
    </div>
  );
}
