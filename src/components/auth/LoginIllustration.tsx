// A self-contained SVG illustration for the login page's right panel — a stylized dashboard
// window (bar chart, donut, trend line) floating over a few soft blurred shapes, entirely in
// the app's plum/rose/amber palette (see chart-colors.ts) so it reads as "this app" rather
// than generic stock art. No external assets/images — just inline SVG, safe to inline at
// build time and free of any network dependency.
export function LoginIllustration() {
  return (
    <svg viewBox="0 0 480 480" className="h-full w-full max-h-[420px] max-w-[420px]" role="img" aria-label="Illustration of a data analytics dashboard">
      <defs>
        <linearGradient id="li-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F39F5A" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#451952" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="li-bar1" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#662549" />
          <stop offset="100%" stopColor="#AE445A" />
        </linearGradient>
        <linearGradient id="li-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FBE3CB" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* soft background blobs */}
      <circle cx="90" cy="380" r="90" fill="url(#li-bg)" />
      <circle cx="410" cy="90" r="70" fill="#F39F5A" opacity="0.18" />
      <circle cx="60" cy="70" r="46" fill="#AE445A" opacity="0.15" />

      {/* floating decorative ring + square */}
      <circle cx="420" cy="360" r="22" fill="none" stroke="#F39F5A" strokeWidth="6" opacity="0.5" />
      <rect x="30" y="200" width="26" height="26" rx="6" fill="#662549" opacity="0.3" transform="rotate(18 43 213)" />

      {/* dashboard window */}
      <g transform="translate(60 90)">
        <rect x="0" y="0" width="360" height="260" rx="18" fill="url(#li-card)" stroke="#451952" strokeOpacity="0.08" />
        {/* title bar */}
        <rect x="0" y="0" width="360" height="34" rx="18" fill="#451952" opacity="0.9" />
        <rect x="0" y="18" width="360" height="16" fill="#451952" opacity="0.9" />
        <circle cx="20" cy="17" r="5" fill="#F39F5A" />
        <circle cx="38" cy="17" r="5" fill="#FBE3CB" />
        <circle cx="56" cy="17" r="5" fill="#AE445A" />

        {/* bar chart, left half */}
        <g transform="translate(24 64)">
          <rect x="0" y="110" width="26" height="40" rx="4" fill="url(#li-bar1)" />
          <rect x="34" y="80" width="26" height="70" rx="4" fill="#AE445A" />
          <rect x="68" y="50" width="26" height="100" rx="4" fill="#F39F5A" />
          <rect x="102" y="95" width="26" height="55" rx="4" fill="#662549" />
          <line x1="-8" y1="150" x2="140" y2="150" stroke="#451952" strokeOpacity="0.15" strokeWidth="2" />
        </g>

        {/* trend line, top of the bars */}
        <polyline
          points="24,108 58,90 92,100 126,70 160,84"
          fill="none"
          stroke="#2ECC71"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(24 64)"
        />
        {[
          [24, 108],
          [58, 90],
          [92, 100],
          [126, 70],
          [160, 84],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x + 24} cy={y + 64} r="4" fill="#2ECC71" />
        ))}

        {/* donut chart, right half */}
        <g transform="translate(268 130)">
          <circle r="52" fill="none" stroke="#FBE3CB" strokeWidth="18" />
          <circle
            r="52"
            fill="none"
            stroke="#662549"
            strokeWidth="18"
            strokeDasharray="163 327"
            strokeDashoffset="0"
            transform="rotate(-90)"
          />
          <circle
            r="52"
            fill="none"
            stroke="#F39F5A"
            strokeWidth="18"
            strokeDasharray="98 327"
            strokeDashoffset="-163"
            transform="rotate(-90)"
          />
          <circle
            r="52"
            fill="none"
            stroke="#AE445A"
            strokeWidth="18"
            strokeDasharray="66 327"
            strokeDashoffset="-261"
            transform="rotate(-90)"
          />
        </g>
      </g>
    </svg>
  )
}
