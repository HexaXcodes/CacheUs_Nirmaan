// src/components/common/SafetyDisclaimer.jsx
// NovaCare is procedural guidance, not a diagnostic or prescribing system.
// This component is the one place that copy lives, so it stays consistent
// everywhere it's shown (workflow detail, AR panel, dashboard, etc).
import { ShieldAlert } from 'lucide-react';

const SafetyDisclaimer = ({ variant = 'general', className = '' }) => {
  const text =
    variant === 'prescription'
      ? "Use only according to your existing prescription or clinician's instructions."
      : variant === 'unsupported'
      ? "This situation is outside NovaCare's supported guidance. Please consult a qualified healthcare professional."
      : 'NovaCare provides procedural guidance and does not replace professional medical care.';

  return (
    <div className={`flex items-start gap-2 p-3 bg-ink/5 border-2 border-ink/20 rounded-lg ${className}`}>
      <ShieldAlert size={14} className="text-ink/50 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
      <p className="font-mono text-[10px] leading-relaxed text-ink/60">{text}</p>
    </div>
  );
};

export default SafetyDisclaimer;
