// src/components/care/PhaseCard.jsx
import { ChevronRight, Sparkles } from 'lucide-react';
import { tierLabel } from '../../data/careWorkflowsMeta';

const TIER_STYLE = {
  available: 'bg-emerald-200 text-emerald-900',
  beta: 'bg-amber-200 text-amber-900',
  coming_soon: 'bg-ink/10 text-ink/60'
};

const PhaseCard = ({ phase, category, title, tagline, icon: Icon, tier, onClick, active }) => (
  <button
    onClick={onClick}
    className={`group text-left card-glass p-5 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-lg transition-all ${active ? 'ring-4 ring-primary/30' : ''}`}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="w-12 h-12 grid place-items-center bg-primary border-2 border-ink rounded-xl shadow-brutal-sm group-hover:rotate-3 transition">
        {Icon && <Icon size={22} strokeWidth={2.5} className="text-white" />}
      </div>
      <ChevronRight className="text-ink/40 group-hover:text-ink group-hover:translate-x-1 transition" size={20} />
    </div>

    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50 mt-4">
      Phase {String(phase).padStart(2, '0')} · {category.replace(/_/g, ' ')}
    </p>
    <h3 className="font-display font-bold text-xl mt-1 leading-tight">{title}</h3>
    <p className="text-sm text-ink/70 mt-1.5">{tagline}</p>

    <div className="flex items-center gap-2 mt-4">
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 border-2 border-ink rounded-md font-mono text-[10px] uppercase tracking-[0.2em] ${TIER_STYLE[tier]}`}>
        {tier === 'available' && <Sparkles size={10} />}
        {tierLabel(tier)}
      </span>
    </div>
  </button>
);

export default PhaseCard;
