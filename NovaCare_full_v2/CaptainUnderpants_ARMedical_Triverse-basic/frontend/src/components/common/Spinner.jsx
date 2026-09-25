// src/components/common/Spinner.jsx
import { Loader2 } from 'lucide-react';

const Spinner = ({ size = 16, label }) => (
  <span className="inline-flex items-center gap-2 font-mono text-xs text-ink/60">
    <Loader2 size={size} className="animate-spin" />
    {label && <span>{label}</span>}
  </span>
);

export default Spinner;
