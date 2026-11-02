// Shows the room's real photo if `room.images[variant]` exists; otherwise draws a
// tidy illustrated room so the UI looks finished before real photos are added.

const PALETTES = [
  ['#f6e7d8', '#e9c9a8', '#c9774a'],
  ['#e3ecf4', '#b9cfe3', '#4f7fae'],
  ['#e8f0e4', '#c3d9bb', '#5e8f52'],
  ['#f4e4ee', '#e2b8d1', '#b0568a'],
  ['#f7efd2', '#ecd98d', '#c29a1b'],
  ['#e5e2f4', '#c1bae3', '#6a5bb5'],
];

export default function RoomImage({ room, variant = 0, className = '' }) {
  const photo = room.images?.[variant];
  if (photo) return <img className={`room-img ${className}`} src={photo} alt={`Room ${room.room_number}`} loading="lazy" />;

  const [wall, floor, accent] = PALETTES[(room.room_id + variant) % PALETTES.length];
  const beds = Math.min(room.capacity || 1, 4);
  const flip = variant % 2 === 1;
  const bedW = beds === 1 ? 170 : beds === 2 ? 125 : 88;
  const gap = 14;
  const total = beds * bedW + (beds - 1) * gap;
  const startX = (400 - total) / 2;
  const showWindow = variant % 3 !== 2;

  return (
    <svg className={`room-img ${className}`} viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Illustration of room ${room.room_number}`}>
      <rect width="400" height="400" fill={wall} />
      <rect y="270" width="400" height="130" fill={floor} />
      <rect y="266" width="400" height="6" fill="#00000012" />
      {showWindow && (
        <g transform={`translate(${flip ? 60 : 250} 60)`}>
          <rect width="90" height="110" rx="6" fill="#fff" opacity=".95" />
          <rect x="6" y="6" width="78" height="98" rx="3" fill="#cfe6f7" />
          <path d="M45 6v98M6 55h78" stroke="#fff" strokeWidth="4" />
        </g>
      )}
      <g transform={`translate(${flip ? 250 : 60} 70)`}>
        <rect width="70" height="52" rx="4" fill="#fff" opacity=".9" />
        <path d="M10 40l16-16 12 12 10-8 14 12" stroke={accent} strokeWidth="3" fill="none" opacity=".7" />
      </g>
      {Array.from({ length: beds }).map((_, i) => {
        const x = startX + i * (bedW + gap);
        return (
          <g key={i} transform={`translate(${x} 215)`}>
            <rect y="42" width={bedW} height="60" rx="6" fill="#00000014" transform="translate(0 6)" />
            <rect y="0" width="10" height="100" rx="3" fill="#7a5a3e" />
            <rect x={bedW - 10} y="14" width="10" height="86" rx="3" fill="#7a5a3e" />
            <rect x="6" y="38" width={bedW - 12} height="48" rx="8" fill="#fff" />
            <rect x="6" y="62" width={bedW - 12} height="24" rx="8" fill={accent} />
            <rect x="14" y="26" width={Math.min(52, bedW - 40)} height="20" rx="8" fill="#fff" stroke="#00000014" />
            <rect x="6" y="86" width="8" height="18" rx="2" fill="#7a5a3e" />
            <rect x={bedW - 14} y="86" width="8" height="18" rx="2" fill="#7a5a3e" />
          </g>
        );
      })}
      {(room.amenities || []).includes('Study desk') && (
        <g transform={`translate(${flip ? 20 : 300} 238)`}>
          <rect width="76" height="8" rx="3" fill="#7a5a3e" />
          <rect x="6" y="8" width="6" height="42" fill="#7a5a3e" />
          <rect x="64" y="8" width="6" height="42" fill="#7a5a3e" />
          <rect x="22" y="-14" width="30" height="18" rx="2" fill="#333" opacity=".85" />
        </g>
      )}
    </svg>
  );
}
