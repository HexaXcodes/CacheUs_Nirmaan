// src/components/care/WorkflowDetailPanel.jsx
// Section 9 of the spec: purpose, what NovaCare checks, step count, duration,
// requirements, medical boundary, and the Start CTA. Renders identically for
// every phase — the content all comes from the generic workflow shape.
import { ArrowRight, Camera, ScanLine, Clock, ListChecks, Lock, ScanEye } from 'lucide-react';
import SafetyDisclaimer from '../common/SafetyDisclaimer';
import { estimateDuration, tierLabel, perceptionBadge } from '../../data/careWorkflowsMeta';

const WorkflowDetailPanel = ({ workflow, tier, deviceTypes, selectedDevice, onDeviceChange, onStart, starting }) => {
  if (!workflow) return null;
  const launchable = tier === 'available' || tier === 'beta';
  const stepCount = workflow.steps?.length || 0;
  const badge = perceptionBadge(workflow.id, selectedDevice);

  return (
    <div className="mt-6 animate-slide-up">
      <div className="card-glass p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
          <div>
            <p className="label-display">Selected</p>
            <h3 className="font-display font-bold text-2xl sm:text-3xl">{workflow.name}</h3>
            <p className="text-ink/70 mt-1 max-w-xl">{workflow.description}</p>
          </div>
          <span className={`shrink-0 inline-flex items-center px-2.5 py-1 border-2 border-ink rounded-md font-mono text-[10px] uppercase tracking-[0.2em] ${
            tier === 'available' ? 'bg-emerald-200 text-emerald-900' : tier === 'beta' ? 'bg-amber-200 text-amber-900' : 'bg-ink/10 text-ink/60'
          }`}>
            {tierLabel(tier)}
          </span>
        </div>

        {/* At-a-glance stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          <div className="card-glass-sm p-3 flex items-center gap-2">
            <ListChecks size={16} className="text-primary" />
            <div>
              <p className="font-mono text-[9px] uppercase text-ink/50">Steps</p>
              <p className="font-display font-bold text-sm">{stepCount}</p>
            </div>
          </div>
          <div className="card-glass-sm p-3 flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            <div>
              <p className="font-mono text-[9px] uppercase text-ink/50">Approx. duration</p>
              <p className="font-display font-bold text-sm">{estimateDuration(stepCount)}</p>
            </div>
          </div>
          <div className="card-glass-sm p-3 flex items-center gap-2">
            <Camera size={16} className="text-primary" />
            <div>
              <p className="font-mono text-[9px] uppercase text-ink/50">Requires</p>
              <p className="font-display font-bold text-sm">{workflow.requiresAR ? 'Camera + AR' : 'None'}</p>
            </div>
          </div>
        </div>

        {/* Device variant selector, if applicable (e.g. inhaler MDI/DPI/soft-mist) */}
        {deviceTypes?.length > 0 && (
          <div className="mb-5">
            <p className="label-display mb-2">Your device type</p>
            <div className="flex flex-wrap gap-2">
              {deviceTypes.map((d) => (
                <button
                  key={d}
                  onClick={() => onDeviceChange(d)}
                  className={`px-3 py-1.5 border-2 border-ink rounded-lg font-mono text-xs uppercase tracking-wider transition ${
                    selectedDevice === d ? 'bg-primary text-white' : 'bg-white/70 hover:bg-white'
                  }`}
                >
                  {d.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step list preview */}
        {stepCount > 0 && (
          <div className="mb-5">
            <p className="label-display mb-2">Steps</p>
            <ol className="grid sm:grid-cols-2 gap-1.5">
              {workflow.steps.map((s, i) => (
                <li key={s.id} className="flex items-center gap-2 text-sm px-3 py-2 bg-white/50 border border-ink/10 rounded-lg">
                  <span className="font-mono text-xs text-ink/40 w-6 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <span className="truncate">{s.title}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <SafetyDisclaimer variant={workflow.category === 'diabetes' ? 'prescription' : 'general'} className="mb-5" />

        <div className="flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[10px] uppercase tracking-wider ${
              badge.level === 'real'
                ? 'bg-emerald-200 text-emerald-900'
                : badge.level === 'experimental'
                  ? 'bg-amber-200 text-amber-900'
                  // 'manual-fallback' (inhaler, currently) and 'mock' both
                  // render neutral — no color should suggest live ML is
                  // doing anything when it isn't.
                  : 'bg-ink/10 text-ink/60'
            }`}
          >
            <ScanEye size={12} strokeWidth={2.5} />
            {badge.label}
          </span>
        </div>

        <div className="flex justify-end mt-3">
          {launchable ? (
            <button onClick={onStart} disabled={starting} className="btn-primary">
              {starting ? 'Starting…' : 'Start Guided Session'}
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          ) : (
            <button disabled className="btn-ghost opacity-60 cursor-not-allowed">
              <Lock size={16} strokeWidth={2.5} />
              {tierLabel(tier)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowDetailPanel;
