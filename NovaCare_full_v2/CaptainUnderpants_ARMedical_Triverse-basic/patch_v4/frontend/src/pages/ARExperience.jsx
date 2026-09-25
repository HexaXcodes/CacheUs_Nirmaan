// src/pages/ARExperience.jsx
// ============================================================================
//  Markerless AR guidance. No QR/marker scan is required — the camera feed
//  simply plays, and <ARAnchor /> is positioned from ML perception
//  coordinates. Real (Level B: MediaPipe + rule engine) for bp_measurement,
//  eye_drops, nasal_spray; mock/dev-simulated (Level C) for everything else
//  — see PERCEPTION_LEVEL in data/careWorkflowsMeta.js and
//  hooks/useProcedureSession.js for the branch point.
// ============================================================================
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import CameraFeed from '../components/ar/CameraFeed';
import ARAnchor from '../components/ar/ARAnchor';
import GuidancePanel from '../components/ar/GuidancePanel';
import { useWorkflow } from '../context/WorkflowContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useProcedureSession, STATES } from '../hooks/useProcedureSession';
import { perceptionLevelFor, bodyAnchorFor } from '../data/careWorkflowsMeta';

const ANCHOR_STATUS = {
  [STATES.DETECTING]: 'detecting',
  [STATES.TARGET_DETECTED]: 'guiding',
  [STATES.GUIDING]: 'guiding',
  [STATES.VERIFYING]: 'verifying',
  [STATES.CORRECT]: 'correct',
  [STATES.INCORRECT]: 'incorrect',
  [STATES.UNCERTAIN]: 'uncertain'
};

const ARExperience = () => {
  const { user } = useAuth();
  const { selectedWorkflow, selectedDevice, reset } = useWorkflow();
  const { lang, setLang, languages, t } = useLanguage();
  const navigate = useNavigate();
  const [cameraReady, setCameraReady] = useState(false);
  const [videoEl, setVideoEl] = useState(null);

  const {
    state,
    stepIndex,
    currentStep,
    totalSteps,
    anchor,
    subjectLabel,
    perceptionLevel,
    manualStepAvailable,
    explanation,
    explaining,
    actions
  } = useProcedureSession({
    workflow: user ? selectedWorkflow : null,
    device: selectedDevice,
    // Real (Level B) perception submits through the genuine /ml/verification
    // contract; everything else is still the dev-simulated demo endpoint.
    mock: perceptionLevelFor(selectedWorkflow?.id) !== 'real',
    videoEl
  });

  // Lock body scroll while AR is active
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!user) return <Navigate to="/login" state={{ from: { pathname: '/workflow' } }} replace />;
  if (!selectedWorkflow || selectedWorkflow.error) return <Navigate to="/workflow" replace />;

  const handleExit = async () => {
    await actions.exit();
    reset();
    navigate('/workflow');
  };

  // A finished session (all steps correct/confirmed) goes back to the
  // dashboard rather than the workflow picker — an abandoned/exited one
  // still returns to /workflow so the user can pick up or try again.
  const handleFinish = () => {
    reset();
    navigate('/dashboard');
  };

  const anchorStatus = ANCHOR_STATUS[state] || 'guiding';
  const showAnchor = cameraReady && state !== STATES.COMPLETE && anchor;
  // Anchored (Level C) steps get the circle+callout style — real tracking,
  // no verified verdict. Real (Level B) steps keep the rectangle, since the
  // box itself IS the verified region there.
  const anchorShape = perceptionLevel !== 'real' && bodyAnchorFor(selectedWorkflow?.id) ? 'circle' : 'box';

  return (
    <div className="fixed inset-0 bg-black overflow-hidden" style={{ zIndex: 2 }}>
      <CameraFeed onReady={() => setCameraReady(true)} onVideoReady={setVideoEl} onExit={handleExit}>
        {showAnchor && (
          <ARAnchor
            target={subjectLabel}
            x={anchor.x}
            y={anchor.y}
            width={anchor.width}
            height={anchor.height}
            landmarks={anchor.landmarks}
            status={anchorStatus}
            label={anchor.object || subjectLabel}
            instruction={anchor.instruction}
            tracked={anchor.tracked ?? true}
            shape={anchorShape}
          />
        )}
      </CameraFeed>

      {cameraReady && (
        <GuidancePanel
          workflowName={selectedWorkflow.name}
          medicalBoundary={selectedWorkflow.medicalBoundary}
          step={currentStep}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          state={state}
          subjectLabel={subjectLabel}
          perceptionLevel={perceptionLevel}
          manualStepAvailable={manualStepAvailable}
          lang={lang}
          setLang={setLang}
          languages={languages}
          t={t}
          explanation={explanation}
          explaining={explaining}
          onExplain={actions.explain}
          onSimulate={actions.simulate}
          onRetry={actions.retry}
          onConfirmManual={actions.confirmManual}
          onExit={handleExit}
          onDone={handleFinish}
          mockMode={perceptionLevel !== 'real'}
        />
      )}
    </div>
  );
};

export default ARExperience;
