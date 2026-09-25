// ============================================================================
//  ⚠️  LEGACY — severity-badge styled card from the old wound/burn/CPR
//  scenario picker. Replaced by components/care/PhaseCard.jsx for the new
//  six-phase workflow grid. Retained per migration instructions; currently
//  unreferenced by any page or route.
// ============================================================================
// src/components/workflow/WorkflowCard.jsx
import { ChevronRight } from 'lucide-react';

const WorkflowCard = ({ icon: Icon, name, description, severities = [], accent = 'primary', onClick }) => {
  const accentBg = accent === 'primary' ? 'bg-primary' : 'bg-accent';
  return (
    <button
      onClick={onClick}
      className="group text-left card-glass p-5 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-lg transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`w-12 h-12 grid place-items-center ${accentBg} border-2 border-ink rounded-xl shadow-brutal-sm group-hover:rotate-3 transition`}>
          {Icon && <Icon size={22} strokeWidth={2.5} className="text-white" />}
        </div>
        <ChevronRight className="text-ink/40 group-hover:text-ink group-hover:translate-x-1 transition" size={20} />
      </div>

      <h3 className="font-display font-bold text-xl mt-4 leading-tight">{name}</h3>
      <p className="text-sm text-ink/70 mt-1">{description}</p>

      {severities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {severities.map((s) => (
            <span key={s} className="chip">{s}</span>
          ))}
        </div>
      )}
    </button>
  );
};

export default WorkflowCard;
