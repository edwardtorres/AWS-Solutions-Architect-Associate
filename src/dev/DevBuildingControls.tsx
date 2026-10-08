// SAA_DEV_HOOKS_SENTINEL: dev builds only (see src/dev/devHooks.ts).
import { DEV_SENTINEL } from './devHooks';
import { useSaveStore, useSnapshot } from '../save/context';
import type { StoredState } from '../save/schema';

export default function DevBuildingControls({ id }: { id: string }) {
  const store = useSaveStore();
  const current = useSnapshot().save.buildings[id]?.state ?? '';
  return (
    <section className="mt-4 rounded-xl border-2 border-dashed border-pink-400 p-3" aria-label="Developer controls" data-dev-marker={DEV_SENTINEL}>
      <h3 className="text-sm font-semibold text-pink-300">DEV ONLY: force stored state</h3>
      <label className="mt-1 block text-sm">
        <span className="mr-2">Stored progress</span>
        <select
          className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--bg)] px-2 text-base"
          value={current}
          onChange={(e) => {
            const v = e.target.value;
            store.setBuildingState(id, v === '' ? null : (v as StoredState));
          }}
        >
          <option value="">none (derived: planned or surveyed)</option>
          <option value="under_construction">under construction</option>
          <option value="commissioned">commissioned</option>
        </select>
      </label>
    </section>
  );
}
