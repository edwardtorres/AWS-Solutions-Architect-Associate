export type PersistenceState = 'granted' | 'not-granted' | 'unsupported';

/** Whether the browser has already agreed to keep this site's data. */
export async function persistenceState(): Promise<PersistenceState> {
  const manager = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  if (!manager || typeof manager.persisted !== 'function') return 'unsupported';
  try {
    return (await manager.persisted()) ? 'granted' : 'not-granted';
  } catch {
    return 'unsupported';
  }
}

/** Asks the browser to keep this site's data. The browser decides; the answer is shown, not assumed. */
export async function requestPersistence(): Promise<PersistenceState> {
  const manager = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  if (!manager || typeof manager.persist !== 'function') return 'unsupported';
  try {
    return (await manager.persist()) ? 'granted' : 'not-granted';
  } catch {
    return 'unsupported';
  }
}
