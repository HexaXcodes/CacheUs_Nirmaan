import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLang } from '../../context/LanguageContext'

export default function PatientHeader({ onMenuClick }) {
  const { user } = useAuth()
  const { lang, changeLang, LANGS } = useLang()

  return (
    <header className="bg-[#F5F9FF]/80 border-b border-hud-line/60 sticky top-0 z-40 backdrop-blur-md px-4 py-3 flex items-center justify-between relative">
      {/* Visual cybernetic corner brackets inside header */}
      <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-hud-cyan opacity-40" />
      <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-hud-cyan opacity-40" />
      <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-hud-cyan opacity-40" />
      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-hud-cyan opacity-40" />

      {/* Left: Hamburger & Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 border border-hud-dim hover:border-hud-cyan hover:shadow-glow transition-all rounded-none bg-hud-surface/40 group relative"
          aria-label="Open Navigation"
        >
          {/* Subtle glowing marker dots */}
          <span className="absolute top-0 left-0 w-1 h-1 bg-hud-cyan/40" />
          <span className="absolute bottom-0 right-0 w-1 h-1 bg-hud-cyan/40" />
          
          <div className="w-4 h-0.5 bg-hud-cyan mb-1 group-hover:bg-hud-cyanB transition-colors" />
          <div className="w-4 h-0.5 bg-hud-cyan mb-1 group-hover:bg-hud-cyanB transition-colors" />
          <div className="w-4 h-0.5 bg-hud-cyan group-hover:bg-hud-cyanB transition-colors" />
        </button>

        <div className="flex items-center gap-2 sm:gap-3 pl-1">
          <div className="w-6 h-6 border border-hud-cyan flex items-center justify-center relative">
            <span className="absolute w-1 h-1 bg-hud-cyan top-0 left-0" />
            <span className="absolute w-1 h-1 bg-hud-cyan bottom-0 right-0" />
            <div className="w-2.5 h-2.5 bg-hud-cyan animate-pulse" />
          </div>
          <div>
            <Link to="/" className="font-mono font-black text-hud-cyan tracking-[0.25em] text-sm block leading-none hover:text-hud-cyanB transition-colors">
              NOVACARE
            </Link>
            <span className="font-mono text-[8px] text-hud-ink3 tracking-widest mt-0.5 block">
              SYS.PT_SECURE_NODE // SECURE_SYNC
            </span>
          </div>
        </div>
      </div>

      {/* Right: Language, Role & Profile preview */}
      <div className="flex items-center gap-2.5">
        <select
          value={lang}
          onChange={e => changeLang(e.target.value)}
          className="bg-hud-panel border border-hud-dim text-hud-muted font-mono text-[10px] px-2 py-1.5 focus:outline-none focus:border-hud-cyan cursor-pointer rounded-none hover:bg-hud-surface/85 transition"
        >
          {Object.entries(LANGS).map(([v, lbl]) => (
            <option key={v} value={v} className="bg-hud-panel">{lbl}</option>
          ))}
        </select>

        <span className="border border-hud-cyan text-hud-cyan font-mono text-[9px] px-2 py-0.5 font-bold tracking-wider select-none bg-hud-cyan/5">
          PT
        </span>

        {user?.name && (
          <span className="hidden sm:block font-mono text-[10px] text-hud-muted tracking-widest bg-hud-surface2/30 border border-hud-line/45 px-2.5 py-1 max-w-[120px] truncate select-none">
            {user.name.toUpperCase()}
          </span>
        )}
      </div>
    </header>
  )
}
