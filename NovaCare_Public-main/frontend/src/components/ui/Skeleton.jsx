export default function Skeleton({ className = '' }) {
  return (
    <div className={`relative overflow-hidden bg-hud-panel border border-hud-border/10 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-hud-cyan/5 to-transparent" />
    </div>
  )
}
