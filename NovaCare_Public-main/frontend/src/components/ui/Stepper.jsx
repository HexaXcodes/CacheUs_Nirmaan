export default function Stepper({ steps, current }) {
  return (
    <div className="flex items-center overflow-x-auto pb-1">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 flex items-center justify-center font-mono text-xs font-bold border-2 shrink-0 transition-all
              ${i < current
                ? 'bg-hud-cyan border-hud-cyan text-hud-bg'
                : i === current
                  ? 'bg-transparent border-hud-cyan text-hud-cyan shadow-glow'
                  : 'bg-transparent border-hud-dim text-hud-dim'}`}>
              {i < current ? '/' : String(i + 1).padStart(2, '0')}
            </div>
            <span className={`hidden sm:block text-xs font-mono mt-1 whitespace-nowrap tracking-wider
              ${i === current ? 'text-hud-cyan' : i < current ? 'text-hud-muted' : 'text-hud-dim'}`}>
              {s}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-6 h-px mx-1 shrink-0 transition-all ${i < current ? 'bg-hud-cyan' : 'bg-hud-dim'}`} />
          )}
        </div>
      ))}
    </div>
  )
}
