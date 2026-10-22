import { useState } from 'react';
import { backupDue, hasProgress, readSnooze, writeSnooze } from '../save/backup';
import { exportBackup } from '../save/download';
import { useSaveStore, useSnapshot } from '../save/context';
import { browserStorage } from '../save/store';

/** Reminds the player to export a backup after seven days without one. "Later" hides it for 24 hours. */
export default function BackupBanner() {
  const store = useSaveStore();
  const snapshot = useSnapshot();
  const [now] = useState(() => Date.now());
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(() => readSnooze(browserStorage()));
  const due = backupDue({
    now,
    lastExportAt: snapshot.save.ui.lastExportAt,
    hasProgress: hasProgress(snapshot.save),
    snoozedUntil,
  });
  if (!due) return null;
  return (
    <section
      aria-labelledby="backup-title"
      data-testid="backup-banner"
      className="mb-4 rounded-xl border-2 border-[var(--accent)] bg-[rgba(245,185,66,0.12)] p-3 text-sm"
    >
      <p id="backup-title" className="font-semibold">
        Back up your progress
      </p>
      <p className="mt-1">
        Progress lives in this browser. Export a backup file now, so you can restore it if the browser clears its data.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" className="btn" onClick={() => exportBackup(store, new Date())}>
          Export now
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setSnoozedUntil(writeSnooze(browserStorage(), Date.now()))}
        >
          Later
        </button>
      </div>
    </section>
  );
}
