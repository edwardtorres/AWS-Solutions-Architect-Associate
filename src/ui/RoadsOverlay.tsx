import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { BUILDING_BY_ID, ROADS, type Road } from '../data';

interface Props {
  containerRef: RefObject<HTMLDivElement | null>;
  cardRefs: RefObject<Map<string, HTMLButtonElement>>;
  /** 'selected' draws roads for the focused building only; 'all' draws every road. */
  mode: 'selected' | 'all';
  focusId: string | null;
}

interface Point {
  x: number;
  y: number;
  w: number;
  h: number;
}

const DISTRICT_COLOR: Record<string, string> = {
  citadel: '#a78bfa',
  harbor: '#2dd4bf',
  express: '#fb923c',
  treasury: '#facc15',
  square: '#94a3b8',
};

export function useIsDesktop(): boolean {
  const query = '(min-width: 768px)';
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => {
      setMatches(mql.matches);
    };
    mql.addEventListener('change', onChange);
    return () => {
      mql.removeEventListener('change', onChange);
    };
  }, []);
  return matches;
}

/** Decorative: roads are listed (with reasons) in each building's panel, so this is aria-hidden. */
export function RoadsOverlay({ containerRef, cardRefs, mode, focusId }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [points, setPoints] = useState<Map<string, Point>>(new Map());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      const box = container.getBoundingClientRect();
      const next = new Map<string, Point>();
      cardRefs.current?.forEach((el, id) => {
        const r = el.getBoundingClientRect();
        next.set(id, { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height });
      });
      setSize({ w: box.width, h: box.height });
      setPoints(next);
    };
    measure();
    const ro = new ResizeObserver(() => {
      measure();
    });
    ro.observe(container);
    void document.fonts?.ready.then(() => {
      measure();
    });
    return () => {
      ro.disconnect();
    };
  }, [containerRef, cardRefs]);

  const roads: Road[] =
    mode === 'all' ? [...ROADS] : focusId ? ROADS.filter((r) => r.from === focusId || r.to === focusId) : [];

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute left-0 top-0 z-10"
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
    >
      {roads.map((r) => {
        const a = points.get(r.from);
        const b = points.get(r.to);
        if (!a || !b) return null;
        const down = b.y >= a.y;
        const x1 = a.x + a.w / 2;
        const y1 = down ? a.y + a.h : a.y;
        const x2 = b.x + b.w / 2;
        const y2 = down ? b.y : b.y + b.h;
        const dy = Math.max(40, Math.abs(y2 - y1) / 2) * (down ? 1 : -1);
        const incoming = r.to === focusId;
        const color = mode === 'all' ? (DISTRICT_COLOR[BUILDING_BY_ID.get(r.from)?.district ?? 'square'] ?? '#94a3b8') : incoming ? '#ffd98a' : '#e0f2fe';
        return (
          <g key={`${r.from}>${r.to}`}>
            <path
              d={`M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`}
              fill="none"
              stroke={color}
              strokeWidth={mode === 'all' ? 1.5 : 3}
              strokeOpacity={mode === 'all' ? 0.45 : 0.95}
              strokeDasharray={incoming && mode !== 'all' ? '7 5' : undefined}
              strokeLinecap="round"
            />
            <circle cx={x2} cy={y2} r={mode === 'all' ? 2.5 : 4.5} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}
