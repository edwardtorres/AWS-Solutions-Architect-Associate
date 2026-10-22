import { STORAGE_KEY } from './schema';

/** The stored save text exactly as it is, for the crash screen. Null when nothing is stored or storage is blocked. */
export function readRawSave(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
