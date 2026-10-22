export interface InstallContext {
  /** An iPhone or iPad (including iPadOS, which reports itself as a Mac with touch). */
  ios: boolean;
  /** Already running from the home screen, so there is nothing to install. */
  standalone: boolean;
}

/** Reads the browser fields that decide which install help to show. Pure: pass the navigator and matchMedia in. */
export function installContext(ua: string, maxTouchPoints: number, standalone: boolean): InstallContext {
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
  return { ios, standalone };
}

export function currentInstallContext(): InstallContext {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return { ios: false, standalone: false };
  const nav = navigator as Navigator & { standalone?: boolean };
  const displayStandalone = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  const standalone = displayStandalone || nav.standalone === true;
  return installContext(navigator.userAgent, navigator.maxTouchPoints, standalone);
}
