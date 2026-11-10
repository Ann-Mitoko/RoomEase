const base = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const SearchIcon = (p) => (<svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
export const MenuIcon = (p) => (<svg {...base} {...p}><path d="M4 6h16M4 12h16M4 18h16" /></svg>);
export const UserIcon = (p) => (<svg {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>);
export const ChevronLeft = (p) => (<svg {...base} {...p}><path d="m15 18-6-6 6-6" /></svg>);
export const ChevronRight = (p) => (<svg {...base} {...p}><path d="m9 18 6-6-6-6" /></svg>);
export const ArrowRight = (p) => (<svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const CloseIcon = (p) => (<svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const CheckIcon = (p) => (<svg {...base} {...p}><path d="m5 12 5 5 9-10" /></svg>);

export const StarIcon = (p) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />
  </svg>
);

export const HeartIcon = ({ filled, ...p }) => (
  <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true" {...p}>
    <path
      d="M16 28C7 22 2 16.5 2 11a7 7 0 0 1 14-2 7 7 0 0 1 14 2c0 5.5-5 11-14 17z"
      fill={filled ? '#ff385c' : 'rgba(0,0,0,.45)'}
      stroke="#fff"
      strokeWidth="2.2"
    />
  </svg>
);

export const Logo = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="9" fill="#ff385c" />
    <path d="M7.5 15.5 16 8l8.5 7.5V25h-5.5v-6.5h-6V25H7.5z" fill="#fff" />
  </svg>
);
