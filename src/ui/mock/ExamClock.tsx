import { useEffect, useState } from 'react';
import { clockText, remainingMs } from '../../game/mock';
import type { MockActive } from '../../save/schema';

/** The time left, computed from the saved start time every second. Calls `onExpire` once when it reaches zero. */
export function ExamClock({ active, onExpire }: { active: Pick<MockActive, 'startedAt' | 'durationMs'>; onExpire: () => void }) {
  const [left, setLeft] = useState(() => remainingMs(active, new Date()));
  useEffect(() => {
    let fired = false;
    const tick = () => {
      const ms = remainingMs(active, new Date());
      setLeft(ms);
      if (ms <= 0 && !fired) {
        fired = true;
        onExpire();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [active, onExpire]);
  const low = left <= 10 * 60_000;
  return (
    <p role="timer" aria-label="Time left" className={`font-mono text-lg font-semibold ${low ? 'text-[#f87171]' : ''}`} data-testid="mock-clock" data-low={low ? 'true' : 'false'}>
      {clockText(left)}
    </p>
  );
}
