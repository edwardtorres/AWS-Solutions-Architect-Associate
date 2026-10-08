import { createContext, useContext, useSyncExternalStore } from 'react';
import { BUILDINGS } from '../data';
import { browserStorage, createSaveStore, type SaveStore, type Snapshot } from './store';

export function createAppStore(): SaveStore {
  return createSaveStore({ knownIds: new Set(BUILDINGS.map((b) => b.id)), storage: browserStorage() });
}

export const SaveContext = createContext<SaveStore | null>(null);

export function useSaveStore(): SaveStore {
  const store = useContext(SaveContext);
  if (!store) throw new Error('SaveContext is missing');
  return store;
}

export function useSnapshot(): Snapshot {
  const store = useSaveStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
