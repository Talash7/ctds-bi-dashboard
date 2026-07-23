// Full-bleed "analytics command center" background for the login page — a dark navy canvas
// with a faint data-grid, glowing plum/rose/amber blobs, and a scattering of abstract chart
// shapes (bars, a donut, a trend line, a scatter of small stat cards/user icons) rendered as
// inline SVG/CSS so there's no stock photo or network dependency. Deliberately low-contrast
// and spread out — this is background texture behind a glass card, not a focal illustration.
export function LoginBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0c0716]">
      {/* base gradient wash */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a0f28] via-[#0c0716] to-[#170a12]" />

      {/* faint data-grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(243,159,90,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(243,159,90,0.5) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      {/* glow blobs */}
      <div className="absolute -left-24 -top-24 size-[420px] rounded-full bg-[#AE445A] opacity-[0.22] blur-3xl" />
      <div className="absolute right-[-160px] top-1/3 size-[480px] rounded-full bg-[#451952] opacity-40 blur-3xl" />
      <div className="absolute bottom-[-140px] left-1/4 size-[380px] rounded-full bg-[#F39F5A] opacity-[0.18] blur-3xl" />

      {/* scattered abstract chart shapes */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="lb-bar" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#662549" />
            <stop offset="100%" stopColor="#AE445A" />
          </linearGradient>
        </defs>

        {/* top-left bar cluster */}
        <g transform="translate(120 120)" opacity="0.5">
          <rect x="0" y="60" width="22" height="70" rx="4" fill="url(#lb-bar)" />
          <rect x="30" y="30" width="22" height="100" rx="4" fill="#F39F5A" />
          <rect x="60" y="80" width="22" height="50" rx="4" fill="#9B59B6" />
          <rect x="90" y="10" width="22" height="120" rx="4" fill="#662549" />
        </g>

        {/* bottom-right donut ring */}
        <g transform="translate(1380 700)" opacity="0.55">
          <circle r="70" fill="none" stroke="#FBE3CB" strokeOpacity="0.15" strokeWidth="20" />
          <circle
            r="70"
            fill="none"
            stroke="#F39F5A"
            strokeWidth="20"
            strokeLinecap="round"
            strokeDasharray="180 440"
            transform="rotate(-90)"
          />
          <circle
            r="70"
            fill="none"
            stroke="#AE445A"
            strokeWidth="20"
            strokeLinecap="round"
            strokeDasharray="110 440"
            strokeDashoffset="-180"
            transform="rotate(-90)"
          />
        </g>

        {/* trend line, upper right */}
        <g transform="translate(1080 160)" opacity="0.55">
          <polyline
            points="0,90 60,50 120,70 180,10 240,40 300,-10"
            fill="none"
            stroke="#2ECC71"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {[
            [0, 90],
            [60, 50],
            [120, 70],
            [180, 10],
            [240, 40],
            [300, -10],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#2ECC71" />
          ))}
        </g>

        {/* small floating stat cards */}
        <g transform="translate(200 660)" opacity="0.4">
          <rect width="120" height="72" rx="10" fill="#FBE3CB" fillOpacity="0.08" stroke="#FBE3CB" strokeOpacity="0.2" />
          <circle cx="24" cy="24" r="10" fill="#F39F5A" />
          <rect x="44" y="18" width="56" height="6" rx="3" fill="#FBE3CB" fillOpacity="0.4" />
          <rect x="16" y="46" width="88" height="6" rx="3" fill="#FBE3CB" fillOpacity="0.25" />
        </g>
        <g transform="translate(1240 380)" opacity="0.35">
          <rect width="96" height="60" rx="10" fill="#FBE3CB" fillOpacity="0.08" stroke="#FBE3CB" strokeOpacity="0.2" />
          <circle cx="20" cy="20" r="8" fill="#3498DB" />
          <rect x="36" y="15" width="46" height="5" rx="2.5" fill="#FBE3CB" fillOpacity="0.4" />
          <rect x="14" y="38" width="70" height="5" rx="2.5" fill="#FBE3CB" fillOpacity="0.25" />
        </g>

        {/* floating user/people glyphs */}
        {[
          [520, 90],
          [860, 640],
          [60, 420],
          [1460, 210],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`} opacity="0.28">
            <circle r="14" fill="none" stroke="#FBE3CB" strokeWidth="2.5" />
            <circle cy="-4" r="5" fill="none" stroke="#FBE3CB" strokeWidth="2.5" />
            <path d="M -8 8 Q 0 -2 8 8" fill="none" stroke="#FBE3CB" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        ))}
      </svg>
    </div>
  )
}
