export default function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-hud-bg/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="hud-panel w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-hud-border/20">
          <div>
            <p className="hud-label mb-0.5">SYSTEM PANEL</p>
            <h2 className="text-hud-cyan font-mono font-bold uppercase tracking-wider">{title}</h2>
          </div>
          <button onClick={onClose}
            className="text-hud-muted hover:text-hud-cyan font-mono text-xl leading-none border border-hud-dim hover:border-hud-cyan w-8 h-8 flex items-center justify-center transition-all">
            X
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
