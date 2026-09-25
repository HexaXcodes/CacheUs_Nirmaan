import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLang } from '../../context/LanguageContext'

const NAV_LINKS = {
  asha: [
    { to: '/asha',             label: 'DASHBOARD'       },
    { to: '/asha/new-patient', label: 'REG PATIENT'     },
    { to: '/asha/screening',   label: 'SCREENING'       },
  ],
  patient: [
    { to: '/patient',      label: 'DASHBOARD'   },
    { to: '/patient/diet', label: 'DIET ADVICE' },
  ],
  doctor: [
    { to: '/doctor',            label: 'DASHBOARD' },
    { to: '/doctor/heatmap',    label: 'HEATMAP'   },
    { to: '/doctor/patients',   label: 'PATIENTS'  },
    { to: '/doctor/campaigns',  label: 'CAMPAIGNS' },
    { to: '/doctor/risk-calc',  label: 'RISK CALC' },
  ],
}

const ROLE_TAG = { asha: 'AW', patient: 'PT', doctor: 'DR' }
const ROLE_COLOR = {
  asha:    'border-tier-green text-tier-green',
  patient: 'border-hud-cyan  text-hud-cyan',
  doctor:  'border-hud-blue  text-hud-blue',
}

export default function Navbar() {
  const { role, user, logout } = useAuth()
  const { lang, changeLang, LANGS } = useLang()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const links = NAV_LINKS[role] || []

  const handleLogout = () => { logout(); navigate('/') }

  const isActive = (to) =>
    location.pathname === to ||
    (to !== '/' + role && location.pathname.startsWith(to))

  return (
    <nav className="bg-hud-bg border-b border-hud-border/20 sticky top-0 z-40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-12">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-7 h-7 border-2 border-hud-cyan flex items-center justify-center group-hover:shadow-glow transition-all">
              <div className="w-2.5 h-2.5 bg-hud-cyan" />
            </div>
            <span className="font-mono font-black text-hud-cyan tracking-[0.25em] text-sm hidden sm:block">
              NOVACARE
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(l => (
              <Link key={l.to} to={l.to}
                className={`px-3 py-1.5 font-mono text-xs tracking-widest border transition-all
                  ${isActive(l.to)
                    ? 'border-hud-cyan text-hud-cyan bg-hud-cyan/10 shadow-glow'
                    : 'border-transparent text-hud-muted hover:border-hud-border/40 hover:text-hud-text'}`}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <select value={lang} onChange={e => changeLang(e.target.value)}
              className="hidden sm:block bg-hud-panel border border-hud-dim text-hud-muted font-mono text-xs px-2 py-1 focus:outline-none focus:border-hud-cyan">
              {Object.entries(LANGS).map(([v, lbl]) => (
                <option key={v} value={v} className="bg-hud-panel">{lbl}</option>
              ))}
            </select>

            <span className={`hidden sm:block border font-mono text-xs px-2 py-0.5 ${ROLE_COLOR[role] || 'border-hud-dim text-hud-dim'}`}>
              {ROLE_TAG[role] || role?.toUpperCase()}
            </span>

            {user?.name && (
              <span className="hidden lg:block font-mono text-xs text-hud-muted max-w-[100px] truncate">
                {user.name.toUpperCase()}
              </span>
            )}

            <button onClick={handleLogout}
              className="hidden sm:block border border-tier-red text-tier-red font-mono text-xs px-3 py-1 hover:bg-tier-red hover:text-white transition-all tracking-widest">
              EXIT
            </button>

            {/* Hamburger */}
            <button onClick={() => setOpen(!open)} className="md:hidden p-2 border border-hud-dim hover:border-hud-cyan transition-all">
              <div className="w-4 h-px bg-hud-muted mb-1" />
              <div className="w-4 h-px bg-hud-muted mb-1" />
              <div className="w-4 h-px bg-hud-muted" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-hud-border/20 bg-hud-surface px-4 py-3 space-y-1">
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
              className={`block px-3 py-2 font-mono text-xs tracking-widest border transition-all
                ${isActive(l.to)
                  ? 'border-hud-cyan text-hud-cyan bg-hud-cyan/10'
                  : 'border-transparent text-hud-muted hover:border-hud-dim hover:text-hud-text'}`}>
              {l.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-hud-border/20 flex items-center justify-between">
            <select value={lang} onChange={e => changeLang(e.target.value)}
              className="bg-hud-panel border border-hud-dim text-hud-muted font-mono text-xs px-2 py-1 focus:outline-none">
              {Object.entries(LANGS).map(([v, lbl]) => (
                <option key={v} value={v} className="bg-hud-panel">{lbl}</option>
              ))}
            </select>
            <button onClick={handleLogout}
              className="border border-tier-red text-tier-red font-mono text-xs px-3 py-1 hover:bg-tier-red hover:text-white transition-all tracking-widest">
              EXIT SYSTEM
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
