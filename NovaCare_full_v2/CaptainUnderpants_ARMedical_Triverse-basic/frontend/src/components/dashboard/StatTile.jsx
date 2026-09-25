// src/components/dashboard/StatTile.jsx
const StatTile = ({ label, value, icon: Icon, accent = 'primary' }) => {
  const accentBg = accent === 'primary' ? 'bg-primary' : 'bg-accent';
  return (
    <div className="card-glass-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 grid place-items-center ${accentBg} border-2 border-ink rounded-lg shadow-brutal-sm flex-shrink-0`}>
        {Icon && <Icon size={18} strokeWidth={2.5} className="text-white" />}
      </div>
      <div className="min-w-0">
        <div className="label-display truncate">{label}</div>
        <div className="font-display font-bold text-xl leading-tight">{value}</div>
      </div>
    </div>
  );
};

export default StatTile;
