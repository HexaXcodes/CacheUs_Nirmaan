// src/components/dashboard/UpNextCard.jsx
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Card from '../common/Card';

const UpNextCard = ({ phase }) => {
  if (!phase) return null;
  const Icon = phase.icon;
  return (
    <Card>
      <p className="label-display mb-3">Up Next</p>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 grid place-items-center bg-primary border-2 border-ink rounded-xl shadow-brutal-sm shrink-0">
          {Icon && <Icon size={20} strokeWidth={2.5} className="text-white" />}
        </div>
        <div className="min-w-0">
          <p className="font-display font-bold text-lg leading-tight">{phase.title}</p>
          <p className="text-xs text-ink/60 mt-0.5">Step-by-step guided verification</p>
        </div>
      </div>
      <Link to="/workflow" className="btn-primary w-full mt-4 py-2.5">
        Start <ArrowRight size={16} strokeWidth={2.5} />
      </Link>
    </Card>
  );
};

export default UpNextCard;
