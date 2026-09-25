// src/pages/WorkflowSelect.jsx
// "Care Workflows" — six phases, each generic through the same workflow
// engine and the same detail/step-list rendering. Route stays /workflow.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import Card from '../components/common/Card';
import Spinner from '../components/common/Spinner';
import ErrorMsg from '../components/common/ErrorMsg';
import SafetyDisclaimer from '../components/common/SafetyDisclaimer';
import PhaseCard from '../components/care/PhaseCard';
import WorkflowDetailPanel from '../components/care/WorkflowDetailPanel';
import { useWorkflow } from '../context/WorkflowContext';
import { useAuth } from '../context/AuthContext';
import { PHASES, AVAILABILITY, tierLabel } from '../data/careWorkflowsMeta';

const WorkflowSelect = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { catalog, catalogLoading, catalogError, selectedWorkflow, selectWorkflow, reset } = useWorkflow();

  const [activePhase, setActivePhase] = useState(null); // one of PHASES
  const [activeSubId, setActiveSubId] = useState(null); // for multi-workflow phases
  const [resolving, setResolving] = useState(false);
  const [device, setDevice] = useState(null);
  const [error, setError] = useState(null);
  const [launching, setLaunching] = useState(false);

  // Map catalog entries by id for quick lookup (name/description/deviceTypes/supported)
  const catalogById = useMemo(() => {
    const m = {};
    catalog.forEach((w) => { m[w.id] = w; });
    return m;
  }, [catalog]);

  const phaseTier = (phase) => {
    // A multi-workflow phase shows its best available tier.
    const tiers = phase.workflowIds.map((id) => AVAILABILITY[id] || 'coming_soon');
    if (tiers.includes('available')) return 'available';
    if (tiers.includes('beta')) return 'beta';
    return 'coming_soon';
  };

  const resolveAndShow = async (workflowId) => {
    setError(null);
    setResolving(true);
    try {
      const wf = catalogById[workflowId];
      const initialDevice = wf?.deviceTypes?.[0] || null;
      setDevice(initialDevice);
      await selectWorkflow(workflowId, initialDevice);
      setActiveSubId(workflowId);
    } catch (err) {
      setError(err.message || 'Could not load this workflow.');
    } finally {
      setResolving(false);
    }
  };

  const handlePickPhase = (phase) => {
    reset();
    setActiveSubId(null);
    setActivePhase(phase);
    if (phase.workflowIds.length === 1) {
      resolveAndShow(phase.workflowIds[0]);
    }
  };

  const handleDeviceChange = async (d) => {
    setDevice(d);
    if (activeSubId) {
      setResolving(true);
      try {
        await selectWorkflow(activeSubId, d);
      } finally {
        setResolving(false);
      }
    }
  };

  const handleStart = async () => {
    if (!user) {
      // Guided sessions are tied to a patient's own history — sign in first.
      navigate('/login', { state: { from: { pathname: '/workflow' } } });
      return;
    }
    setLaunching(true);
    try {
      navigate('/ar');
    } finally {
      setLaunching(false);
    }
  };

  const activeTier = activeSubId ? (AVAILABILITY[activeSubId] || 'coming_soon') : null;

  return (
    <PageShell>
      <div className="mb-8">
        <p className="label-display mb-2">Care</p>
        <h1 className="font-display font-bold text-3xl sm:text-5xl leading-[0.95]">
          Choose your <span className="text-primary">care workflow</span>.
        </h1>
        <p className="text-ink/70 mt-2 max-w-2xl">
          Guided, visual assistance for prescribed treatments and medical devices — verified through
          camera-based technique checking, not diagnosis.
        </p>
      </div>

      {catalogLoading ? (
        <Spinner label="loading care workflows…" />
      ) : (
        <>
          <ErrorMsg className="mb-4">{catalogError || error}</ErrorMsg>

          {/* Six-phase grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PHASES.map((phase) => (
              <PhaseCard
                key={phase.phase}
                phase={phase.phase}
                category={phase.category}
                title={phase.title}
                tagline={phase.tagline}
                icon={phase.icon}
                tier={phaseTier(phase)}
                active={activePhase?.phase === phase.phase}
                onClick={() => handlePickPhase(phase)}
              />
            ))}
          </div>

          {/* Multi-workflow sub-picker (Phase 5 & 6) */}
          {activePhase && activePhase.workflowIds.length > 1 && (
            <div className="mt-6 animate-slide-up">
              <Card>
                <p className="label-display mb-3">{activePhase.title} — choose a procedure</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {activePhase.workflowIds.map((id) => {
                    const wf = catalogById[id];
                    const tier = AVAILABILITY[id] || 'coming_soon';
                    return (
                      <button
                        key={id}
                        onClick={() => resolveAndShow(id)}
                        className={`text-left p-3 border-2 border-ink rounded-xl transition ${
                          activeSubId === id ? 'bg-primary/10 shadow-brutal-sm' : 'bg-white/60 hover:bg-white'
                        }`}
                      >
                        <p className="font-display font-semibold text-sm">{wf?.name || id.replace(/_/g, ' ')}</p>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-ink/50 mt-1">{tierLabel(tier)}</p>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {resolving && (
            <div className="mt-6"><Spinner label="loading workflow…" /></div>
          )}

          {!resolving && selectedWorkflow && !selectedWorkflow.error && selectedWorkflow.supported !== false && (
            <WorkflowDetailPanel
              workflow={selectedWorkflow}
              tier={activeTier}
              deviceTypes={catalogById[activeSubId]?.deviceTypes}
              selectedDevice={device}
              onDeviceChange={handleDeviceChange}
              onStart={handleStart}
              starting={launching}
            />
          )}

          {!resolving && selectedWorkflow?.supported === false && (
            <div className="mt-6 animate-slide-up">
              <Card className="flex items-start gap-3">
                <Lock className="text-ink/40 shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="font-display font-semibold">Not yet supported</p>
                  <SafetyDisclaimer variant="unsupported" className="mt-2" />
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
};

export default WorkflowSelect;
