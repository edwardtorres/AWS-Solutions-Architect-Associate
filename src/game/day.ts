/**
 * Local-day helpers. A "day" is a calendar date (YYYY-MM-DD) in the player's time zone.
 * Day arithmetic works on calendar components, never on 24-hour spans, so the two days a year
 * that are 23 or 25 hours long behave like any other day.
 */
export type DayKey = string;

export function localDay(at: Date, timeZone?: string): DayKey {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function parts(day: DayKey): [number, number, number] {
  const [y, m, d] = day.split('-').map(Number);
  return [y as number, m as number, d as number];
}

export function addDays(day: DayKey, n: number): DayKey {
  const [y, m, d] = parts(day);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${String(t.getUTCFullYear()).padStart(4, '0')}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

/** Whole calendar days from a to b (b - a). */
export function dayDiff(a: DayKey, b: DayKey): number {
  const [ay, am, ad] = parts(a);
  const [by, bm, bd] = parts(b);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export interface Clock {
  now: () => Date;
  /** IANA zone; undefined means the browser's zone. */
  timeZone?: string;
}

export const systemClock: Clock = { now: () => new Date() };
export const today = (clock: Clock): DayKey => localDay(clock.now(), clock.timeZone);
