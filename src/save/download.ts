/** Saves a text file through a temporary object URL. */
export function downloadText(filename: string, text: string, type = 'application/json'): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export const BACKUP_FILENAME = 'region-builder-save.json';

/** Downloads the save as a backup and records the export, so the backup reminder resets. */
export function exportBackup(store: { exportJson(): string; setUi(patch: { lastExportAt: string }): void }, now: Date): void {
  downloadText(BACKUP_FILENAME, store.exportJson());
  store.setUi({ lastExportAt: now.toISOString() });
}
