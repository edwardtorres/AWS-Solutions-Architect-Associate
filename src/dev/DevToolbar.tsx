// SAA_DEV_HOOKS_SENTINEL: dev builds only (see src/dev/devHooks.ts).
import { BUILDINGS, GRAPH } from '../data';
import { DEV_SENTINEL } from './devHooks';
import { useSaveStore } from '../save/context';
import { topologicalOrder } from '../lib/graph';

export default function DevToolbar() {
  const store = useSaveStore();
  const seed = globalThis.__SAA_SEED__;

  /** Commissions the first `n` buildings in prerequisite order, starts one construction after. */
  const demo = (n: number) => {
    store.reset();
    const order = topologicalOrder(GRAPH) ?? [];
    order.slice(0, n).forEach((id) => {
      store.setBuildingState(id, 'commissioned');
    });
    const next = order[n];
    if (next) store.setBuildingState(next, 'under_construction');
  };

  return (
    <aside
      aria-label="Developer toolbar"
      data-dev-marker={DEV_SENTINEL}
      className="fixed bottom-2 left-2 z-50 flex max-w-[calc(100vw-1rem)] flex-wrap items-center gap-1.5 rounded-xl border-2 border-dashed border-pink-400 bg-[rgba(30,5,25,0.9)] p-1.5 text-xs text-pink-200"
    >
      <strong>DEV</strong>
      <span>seed: {seed ?? 'none'}</span>
      <button type="button" className="btn !min-h-11 !px-2 text-xs" onClick={() => { demo(14); }}>
        Demo: 14 built
      </button>
      <button type="button" className="btn !min-h-11 !px-2 text-xs" onClick={() => { demo(BUILDINGS.length); }}>
        All built
      </button>
      <button type="button" className="btn !min-h-11 !px-2 text-xs" onClick={() => { store.reset(); }}>
        Reset
      </button>
    </aside>
  );
}
