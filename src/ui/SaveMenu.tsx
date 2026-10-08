import { useRef, useState } from 'react';
import { useSaveStore, useSnapshot } from '../save/context';

function download(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
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

export default function SaveMenu() {
  const store = useSaveStore();
  const snapshot = useSnapshot();
  const [pasted, setPasted] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const doImport = (text: string) => {
    const res = store.importJson(text);
    setMessage(res.message);
    if (res.ok) setPasted('');
  };

  return (
    <details className="mt-8 rounded-2xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.72)] p-3 sm:p-4">
      <summary className="flex min-h-11 cursor-pointer items-center font-display text-xl font-semibold">Save and backup</summary>
      <p className="mt-2 max-w-prose text-sm text-[var(--fg-muted)]">
        Progress is stored only in this browser (save format version {snapshot.save.version}). Safari can clear storage for sites you have not opened for
        about a week, so export a backup now and then.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn"
          onClick={() => {
            download('region-builder-save.json', store.exportJson());
            setMessage('Backup downloaded.');
          }}
        >
          Export backup
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            fileRef.current?.click();
          }}
        >
          Import from file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          tabIndex={-1}
          aria-label="Choose a backup file to import"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            void file.text().then(doImport);
          }}
        />
      </div>
      <label className="mt-3 block text-sm font-semibold" htmlFor="paste-save">
        Or paste a backup
      </label>
      <textarea
        id="paste-save"
        className="mt-1 min-h-24 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] p-2 font-mono text-base"
        value={pasted}
        onChange={(e) => {
          setPasted(e.target.value);
        }}
        placeholder='{"app":"saa-region-builder", ...}'
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="btn" disabled={pasted.trim() === ''} onClick={() => { doImport(pasted); }}>
          Import pasted backup
        </button>
        <button
          type="button"
          className="btn"
          data-danger="true"
          onClick={() => {
            if (!confirmReset) {
              setConfirmReset(true);
              setMessage('Tap Reset again to erase all progress on this device.');
              return;
            }
            store.reset();
            setConfirmReset(false);
            setMessage('Progress reset.');
          }}
        >
          {confirmReset ? 'Tap again to erase everything' : 'Reset progress'}
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-2 min-h-6 text-sm text-[var(--accent)]">
        {message}
      </p>
    </details>
  );
}
