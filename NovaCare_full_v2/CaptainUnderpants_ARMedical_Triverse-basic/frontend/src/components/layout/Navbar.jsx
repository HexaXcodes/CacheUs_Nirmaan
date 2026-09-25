// src/components/layout/Navbar.jsx
import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Activity, User as UserIcon, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { medicationService } from '../../services/medicationService';

const NavLink = ({ to, children, icon: Icon, active }) => (
  <Link
    to={to}
    className={[
      'inline-flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition',
      active
        ? 'bg-ink text-bone'
        : 'text-ink/70 hover:bg-ink/5'
    ].join(' ')}
  >
    {Icon && <Icon size={14} strokeWidth={2.5} />}
    {children}
  </Link>
);

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    medicationService.today()
      .then((res) => {
        if (cancelled) return;
        const due = (res.schedule || []).filter((s) => s.status === 'pending').length;
        setDueCount(due);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-bone/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Brand */}
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 grid place-items-center bg-primary border-2 border-ink rounded-lg shadow-brutal-sm group-hover:rotate-3 transition">
            <Activity size={16} strokeWidth={3} className="text-white" />
          </div>
          <div className="font-display font-bold text-lg leading-none">
            Nova<span className="text-primary">Care</span>
          </div>
        </Link>

        {/* Links — only when logged in */}
        {user && (
          <nav className="hidden sm:flex items-center gap-1">
            <NavLink to="/dashboard" icon={Activity} active={pathname === '/dashboard'}>Dashboard</NavLink>
            <div className="relative">
              <NavLink to="/workflow" icon={Activity} active={pathname.startsWith('/workflow') || pathname.startsWith('/ar')}>Care</NavLink>
              {dueCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 grid place-items-center bg-urgent text-white rounded-full text-[9px] font-bold border border-ink">
                  {dueCount}
                </span>
              )}
            </div>
            <NavLink to="/upload" icon={FileText} active={pathname.startsWith('/upload')}>Records</NavLink>
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/70 border-2 border-ink rounded-lg">
                <UserIcon size={14} strokeWidth={2.5} />
                <span className="font-mono text-xs">{user.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink text-bone rounded-lg text-xs font-mono uppercase tracking-wider hover:bg-ink/80 transition"
                title="Sign out"
              >
                <LogOut size={14} strokeWidth={2.5} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <Link to="/login" className="text-xs font-mono uppercase tracking-wider px-3 py-1.5 bg-ink text-bone rounded-lg">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
