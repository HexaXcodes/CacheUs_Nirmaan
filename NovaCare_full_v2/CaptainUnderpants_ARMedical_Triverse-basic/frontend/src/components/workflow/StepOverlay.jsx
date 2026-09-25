// ============================================================================
//  ⚠️  LEGACY — part of the old severity-based (mild/moderate/severe)
//  wound/burn/CPR workflow model. NOT used by the new six-phase procedure
//  workflow engine (see src/data/careWorkflowsMeta.js, WorkflowContext, and
//  pages/WorkflowSelect.jsx). Retained per migration instructions; currently
//  unreferenced by any page or route.
// ============================================================================
// src/components/workflow/StepOverlay.jsx
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Phone, Sparkles, Info, X, CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import SeverityBadge from '../common/SeverityBadge';
import { useStepExplanation } from '../../hooks/useStepExplanation';

const StepOverlay = ({
  workflowName,
  severity,
  steps = [],
  currentStep = 0,
  onPrev,
  onNext,
  onExit,
  emergencyNumber = '112',
  callEmergency = false
}) => {
  const step = steps[currentStep];
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [allStepsOpen, setAllStepsOpen] = useState(false);

  const { data: explanation, loading: explLoading } = useStepExplanation({
    workflowName,
    severity,
    step
  });

  const total = steps.length;
  const progress = total ? ((currentStep + 1) / total) * 100 : 0;

  return (
    <>
      {/* Top status bar */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-[10000]">
        <div className="px-3 py-1.5 bg-bone/90 backdrop-blur border-2 border-ink rounded-lg shadow-brutal-sm flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">{workflowName}</span>
          <SeverityBadge severity={severity} />
        </div>
        <button
          onClick={onExit}
          className="w-9 h-9 grid place-items-center bg-bone/90 backdrop-blur border-2 border-ink rounded-lg shadow-brutal-sm hover:bg-bone"
          title="Exit"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Emergency CTA */}
      {callEmergency && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[10000]">
          <a href={`tel:${emergencyNumber}`} className="btn-danger animate-pulse-slow">
            <Phone size={18} strokeWidth={3} />
            CALL {emergencyNumber} NOW
          </a>
        </div>
      )}

      {/* Bottom step panel */}
      <div className="fixed inset-x-0 bottom-0 z-[10000] p-3 sm:p-4 pointer-events-none">
        <div className="card-glass animate-slide-up pointer-events-auto overflow-hidden">

          {/* ── All-steps accordion ── */}
          <button
            onClick={() => setAllStepsOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 pt-3 pb-2 border-b-2 border-ink/10 hover:bg-ink/5 transition"
          >
            <div className="flex items-center gap-3">
              <span className="label-display">All steps</span>
              {/* Dot indicators */}
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i < currentStep
                        ? 'bg-primary'
                        : i === currentStep
                        ? 'bg-primary w-4'
                        : 'bg-ink/20'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-ink/50">{Math.round(progress)}%</span>
              {allStepsOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </div>
          </button>

          {/* Expanded step list */}
          {allStepsOpen && (
            <div className="px-4 py-3 border-b-2 border-ink/10 space-y-1 max-h-48 overflow-y-auto scrollbar-hide">
              {steps.map((s, i) => {
                const done = i < currentStep;
                const active = i === currentStep;
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 px-3 py-2 rounded-xl transition cursor-pointer ${
                      active
                        ? 'bg-primary/10 border-2 border-primary/40'
                        : done
                        ? 'opacity-50'
                        : 'hover:bg-ink/5'
                    }`}
                    onClick={() => {
                      // navigate directly to a step via onNext/onPrev
                      if (i < currentStep) Array.from({ length: currentStep - i }).forEach(() => onPrev());
                      else if (i > currentStep) Array.from({ length: i - currentStep }).forEach(() => onNext());
                      setAllStepsOpen(false);
                    }}
                  >
                    {done
                      ? <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" strokeWidth={2.5} />
                      : <Circle size={16} className={`shrink-0 mt-0.5 ${active ? 'text-primary' : 'text-ink/30'}`} strokeWidth={2.5} />
                    }
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold leading-tight ${active ? 'text-ink' : done ? 'text-ink/50 line-through' : 'text-ink/80'}`}>
                        {s.title}
                      </p>
                      <p className="text-xs text-ink/60 mt-0.5 leading-snug line-clamp-2">
                        {s.instruction}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Current step detail ── */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="label-display">Step {currentStep + 1} of {total}</span>
              <div className="flex-1 h-1 bg-ink/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {step ? (
              <>
                <h3 className="font-display font-bold text-lg sm:text-xl text-ink leading-tight">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-ink/80 leading-relaxed">{step.instruction}</p>

                {/* Why this matters */}
                <button
                  onClick={() => setExplainerOpen(v => !v)}
                  className="mt-3 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary hover:text-primary-600"
                >
                  <Sparkles size={12} strokeWidth={2.5} />
                  {explainerOpen ? 'Hide explanation' : 'Why this matters?'}
                </button>

                {explainerOpen && (
                  <div className="mt-2 p-3 bg-accent/20 border-2 border-ink rounded-xl">
                    {explLoading && <p className="font-mono text-xs text-ink/60">thinking…</p>}
                    {explanation?.why && (
                      <p className="text-sm text-ink leading-relaxed">{explanation.why}</p>
                    )}
                    {explanation?.warnings?.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {explanation.warnings.map((w, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-urgent">
                            <Info size={12} className="shrink-0 mt-0.5" />
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {explanation?.personalizedNote && (
                      <div className="mt-2 pt-2 border-t border-ink/20">
                        <p className="label-display mb-1">For this patient</p>
                        <p className="text-sm text-ink/80">{explanation.personalizedNote}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-ink/60 font-mono text-sm">No active step.</p>
            )}
          </div>

          {/* ── Nav ── */}
          <div className="px-4 pb-4 flex items-center gap-2">
            <button onClick={onPrev} disabled={currentStep === 0} className="btn-ghost flex-1 py-2">
              <ChevronLeft size={16} strokeWidth={2.5} /> Back
            </button>
            <button onClick={onNext} disabled={currentStep >= total - 1} className="btn-primary flex-[2] py-2">
              Next Step <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default StepOverlay;
