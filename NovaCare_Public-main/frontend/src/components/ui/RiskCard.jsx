const TIERS = {
  GREEN: {
    bg: 'bg-tier-gbg', border: 'border-tier-green', text: 'text-tier-green',
    label: 'LOW RISK', code: 'TIER-01', shadow: 'shadow-glow-g',
    bar: 'bg-tier-green',
  },
  AMBER: {
    bg: 'bg-tier-abg', border: 'border-tier-amber', text: 'text-tier-amber',
    label: 'MEDIUM RISK', code: 'TIER-02', shadow: '',
    bar: 'bg-tier-amber',
  },
  RED: {
    bg: 'bg-tier-rbg', border: 'border-tier-red', text: 'text-tier-red',
    label: 'HIGH RISK', code: 'TIER-03', shadow: 'shadow-glow-r',
    bar: 'bg-tier-red',
  },
}

export default function RiskCard({ tier, score, explanation, action, headline }) {
  const t = TIERS[(tier || '').toUpperCase()] || TIERS.GREEN
  const pct = score != null ? Math.min(100, Math.round(score)) : 0

  return (
    <div className={`relative ${t.bg} border-2 ${t.border} p-6 space-y-4 ${t.shadow}`}>
      {/* Corner decorations */}
      <span className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 ${t.border}`} />
      <span className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 ${t.border}`} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-hud-muted tracking-widest">{t.code} / STATUS</p>
          <p className={`text-2xl font-black font-mono tracking-widest ${t.text} text-glow mt-1`}>
            {t.label}
          </p>
        </div>
        {score != null && (
          <div className="text-right">
            <p className="font-mono text-xs text-hud-muted">COMPOSITE</p>
            <p className={`text-3xl font-black font-mono ${t.text}`}>{Math.round(score)}</p>
            <p className="font-mono text-xs text-hud-muted">/100</p>
          </div>
        )}
      </div>

      {/* Score bar */}
      {score != null && (
        <div className="space-y-1">
          <div className="h-2 bg-hud-dim w-full">
            <div className={`h-full ${t.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
          </div>
          <p className="font-mono text-xs text-hud-muted">RISK INDEX: {pct}%</p>
        </div>
      )}

      {headline && (
        <p className={`font-semibold text-sm ${t.text} uppercase tracking-wide`}>{headline}</p>
      )}
      {explanation && (
        <p className="text-hud-text text-sm leading-relaxed border-l-2 border-hud-dim pl-3">
          {explanation}
        </p>
      )}
      {action && (
        <div className={`border-l-4 ${t.border} pl-3 font-mono text-xs ${t.text} uppercase tracking-wide`}>
          ACTION: {action}
        </div>
      )}
    </div>
  )
}
