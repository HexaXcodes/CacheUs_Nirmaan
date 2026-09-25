// Original NovaCare hero visual: a softly lit pulse ribbon over layered
// translucent light-forms. Pure SVG + CSS (no 3D library, no copied
// product imagery). The draw-on animation and drifting glows are disabled
// automatically under prefers-reduced-motion via the global rule in
// clinical.css, and this component adds no motion once painted (a single
// looping stroke reveal), so it never competes for attention with page
// content or camera views elsewhere in the app.
export default function PulseRibbon({ className = '' }) {
  return (
    <svg
      className={`nc-pulse-ribbon ${className}`}
      viewBox="0 0 440 260"
      role="img"
      aria-label="A gentle pulse line moving through soft light, representing guided care"
    >
      <defs>
        <radialGradient id="nc-glow-a" cx="30%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#4db5dd" stopOpacity=".35" />
          <stop offset="100%" stopColor="#4db5dd" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="nc-glow-b" cx="75%" cy="70%" r="60%">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity=".28" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="nc-ribbon-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4db5dd" stopOpacity=".2" />
          <stop offset="45%" stopColor="#8bdbf5" />
          <stop offset="55%" stopColor="#8bdbf5" />
          <stop offset="100%" stopColor="#4db5dd" stopOpacity=".2" />
        </linearGradient>
      </defs>

      <circle cx="140" cy="95" r="130" fill="url(#nc-glow-a)" />
      <circle cx="320" cy="175" r="120" fill="url(#nc-glow-b)" />

      {/* Layered translucent forms, evoking depth without a literal object */}
      <ellipse cx="190" cy="150" rx="150" ry="58" fill="#0f2233" opacity=".55" />
      <ellipse cx="230" cy="130" rx="120" ry="46" fill="#123049" opacity=".55" />

      {/* The pulse line itself: calm baseline that lifts into a heartbeat and settles */}
      <path
        className="nc-pulse-path"
        d="M0,150 L70,150 L95,150 L110,95 L128,205 L146,60 L164,150 L200,150 L440,150"
        fill="none"
        stroke="url(#nc-ribbon-stroke)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="nc-pulse-dot" cx="146" cy="60" r="5" fill="#eaf7fc" />
    </svg>
  )
}
