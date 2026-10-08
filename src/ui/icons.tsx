import type { BuildingState } from '../data';

const common = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

export function StateIcon({ state }: { state: BuildingState }) {
  switch (state) {
    case 'planned':
      return (
        <svg {...common}>
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case 'surveyed':
      return (
        <svg {...common}>
          <path d="M5 21V4" />
          <path d="M5 5h12l-3 4 3 4H5" />
        </svg>
      );
    case 'under_construction':
      return (
        <svg {...common}>
          <path d="M3 21h18" />
          <path d="M6 21V9l8-5v17" />
          <path d="M14 8h6l-2 4" />
          <path d="M20 12v4" />
        </svg>
      );
    case 'commissioned':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12.5 3 3 5-6" />
        </svg>
      );
  }
}

export function CloseIcon() {
  return (
    <svg {...common} width={22} height={22}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function RoadIcon() {
  return (
    <svg {...common} width={16} height={16}>
      <path d="M8 3 5 21M16 3l3 18M12 4v3M12 11v3M12 18v3" />
    </svg>
  );
}
