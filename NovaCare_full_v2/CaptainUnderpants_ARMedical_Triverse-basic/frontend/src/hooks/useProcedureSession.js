// src/hooks/useProcedureSession.js
// ============================================================================
//  Reusable workflow state machine, generic across ALL six phases (inhaler,
//  BP, insulin, glucose, medication delivery, home procedures) — nothing in
//  here is specific to any one procedure. It:
//    1. Starts a ProcedureSession on the backend (POST /api/sessions)
//    2. Drives a perception service for AR anchor coordinates — real
//       (MediaPipe + rule engine, Level B) or mock (dev-simulated, Level C),
//       chosen per-workflow via PERCEPTION_LEVEL in careWorkflowsMeta.js
//    3. Applies verification results — auto (real rule settling) or
//       simulated (dev buttons) or user-attested (manual-confirm steps) —
//       through the SAME contract (POST /api/ml/mock or /api/ml/verification)
//    4. Advances through workflow.steps exactly as the backend's
//       deterministic workflow engine dictates (nextStep / workflowComplete)
//
//  STATE MACHINE
//  -------------
//  IDLE -> DETECTING -> TARGET_DETECTED -> GUIDING -> VERIFYING
//     -> CORRECT -> (NEXT_STEP -> DETECTING...) | COMPLETE
//     -> INCORRECT -> (retry) -> GUIDING
//     -> UNCERTAIN -> (retry) -> GUIDING
//
//  Real vs mock only changes WHERE a verdict comes from — the state machine,
//  session model, and backend ML contract are identical either way.
// ============================================================================
import { useEffect, useRef, useState, useCallback } from 'react';
import { sessionService } from '../services/sessionService';
import { mlService } from '../services/mlService';
import { aiService } from '../services/aiService';
import MockPerceptionService from '../services/perception/mockPerceptionService';
import RealPerceptionService from '../services/perception/RealPerceptionService';
import AnchoredGuideService from '../services/perception/AnchoredGuideService';
import InhalerFrameModelService from '../services/perception/InhalerFrameModelService';
import { isManualStep } from '../services/perception/ruleEngine';
import { SUBJECT_LABEL, perceptionLevelFor, bodyAnchorFor } from '../data/careWorkflowsMeta';

export const STATES = {
  IDLE: 'IDLE',
  DETECTING: 'DETECTING',
  TARGET_DETECTED: 'TARGET_DETECTED',
  GUIDING: 'GUIDING',
  VERIFYING: 'VERIFYING',
  CORRECT: 'CORRECT',
  INCORRECT: 'INCORRECT',
  UNCERTAIN: 'UNCERTAIN',
  COMPLETE: 'COMPLETE',
  ERROR: 'ERROR'
};

const randomConfidence = (status) => {
  if (status === 'correct') return +(0.85 + Math.random() * 0.13).toFixed(2);
  if (status === 'incorrect') return +(0.6 + Math.random() * 0.3).toFixed(2);
  return +(0.3 + Math.random() * 0.25).toFixed(2); // uncertain
};

export function useProcedureSession({ workflow, device, mock = true, videoEl = null }) {
  const [state, setState] = useState(STATES.IDLE);
  const [session, setSession] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [anchor, setAnchor] = useState(null); // latest perception frame
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [error, setError] = useState(null);

  const perceptionRef = useRef(null);
  const detectTimerRef = useRef(null);
  const verifiedRef = useRef(false); // guards against double-submitting one settled verdict
  const stateRef = useRef(state);
  stateRef.current = state;
  // videoEl/session read via ref inside startPerception's guard + service
  // construction, not the closed-over values — startPerception gets called
  // from submitVerification's 700ms-delayed setTimeout, which can hold a
  // stale closure (most likely to actually bite on the very first
  // transition in a session, e.g. inhaler's manual identify_device ->
  // real remove_cap, since videoEl/session are still "fresh" that early).
  // Refs are the same object identity across every render, so `.current`
  // is always the latest value regardless of which closure is running.
  const videoElRef = useRef(videoEl);
  videoElRef.current = videoEl;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  // Same reasoning, applied to startPerception itself: submitVerification's
  // 700ms-delayed setTimeout calls startPerception(nextStepId) to advance —
  // if THAT closure (submitVerification, captured earlier) is stale, it can
  // resolve `startPerception` to a stale version too. Assigned right after
  // startPerception's own definition below, every render, so `.current` is
  // always the version from the render that just happened, not whichever
  // render's closure the delayed callback happens to be running from.
  const startPerceptionRef = useRef(null);

  const steps = workflow?.steps || [];
  const currentStep = steps[stepIndex] || null;
  const subjectLabel = SUBJECT_LABEL[workflow?.id] || 'device';
  // Device-aware for inhaler_technique specifically — its model only
  // covers ONE device variant's steps (see careWorkflowsMeta.js); every
  // other workflow's level only ever depended on workflow id.
  const perceptionLevel = workflow ? perceptionLevelFor(workflow.id, device) : 'mock';
  const anchorTarget = workflow ? bodyAnchorFor(workflow.id) : null;
  const needsVideo = perceptionLevel === 'real' || !!anchorTarget;
  const manualStepAvailable =
    perceptionLevel === 'real' && !!currentStep && isManualStep(workflow?.id, currentStep.id) && state === STATES.GUIDING;

  const stopPerception = useCallback(() => {
    perceptionRef.current?.stop();
    perceptionRef.current = null;
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
  }, []);

  // Shared submit path for every verdict source: dev-simulated (mock),
  // real-rule-settled (auto), and user-attested (manual-confirm). Only the
  // *source* of {status, confidence, errorCode, perception} differs.
  const submitVerification = useCallback(
    async ({ status, confidence, errorCode, perception }) => {
      if (!session || !currentStep) return;
      setState(STATES.VERIFYING);
      try {
        const payload = {
          workflowId: workflow.id,
          sessionId: session._id,
          stepId: currentStep.id,
          status,
          confidence,
          errorCode,
          perception,
          timestamp: new Date().toISOString()
        };

        const call = mock ? mlService.mock : mlService.verify;
        const res = await call(payload);
        setSession(res.session);

        if (status === 'correct') {
          setState(STATES.CORRECT);
          setExplanation(null);
          if (res.workflowComplete || !res.nextStep) {
            stopPerception();
            setTimeout(() => setState(STATES.COMPLETE), 700);
          } else {
            const nextIdx = steps.findIndex((s) => s.id === res.nextStep);
            const resolvedIdx = nextIdx === -1 ? stepIndex + 1 : nextIdx;
            setTimeout(() => {
              setStepIndex(resolvedIdx);
              startPerceptionRef.current?.(steps[resolvedIdx]?.id);
            }, 700);
          }
        } else if (status === 'incorrect') {
          setState(STATES.INCORRECT);
        } else {
          setState(STATES.UNCERTAIN);
        }
      } catch (err) {
        setError(err.message || 'Verification failed.');
        setState(STATES.ERROR);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, currentStep, workflow?.id, mock, steps, stepIndex, stopPerception]
  );

  const anchorToPerceptionPayload = (frame, confidence) =>
    frame
      ? {
          objects: [{ label: subjectLabel, confidence, bbox: [frame.x, frame.y, frame.width, frame.height] }],
          landmarks: frame.landmarks || [],
          boundingBoxes: []
        }
      : undefined;

  const startPerception = useCallback(
    (stepIdOverride) => {
      stopPerception();
      const activeStepId = stepIdOverride || currentStep?.id;
      verifiedRef.current = false;

      // Shared by every perception service that emits a real `rule`
      // (RealPerceptionService and InhalerFrameModelService) — both use the
      // same {status, confidence, errorCode, stalled} shape, so this
      // settle-and-submit logic doesn't need to know which one is driving
      // it. AnchoredGuideService/MockPerceptionService never set `rule`
      // fields that satisfy `shouldSubmit`, so they safely fall through to
      // Simulate-button-only verification without hitting this at all.
      const handleRuleFrame = (frame) => {
        setAnchor(frame);

        const ruleStatus = frame.rule?.status;
        // Settle on a clean correct/incorrect verdict, OR — after a stall
        // timeout (RealPerceptionService) or a genuinely settled
        // low-confidence window (InhalerFrameModelService) — on a stalled
        // 'uncertain' verdict, so the user always lands on a Retry button
        // instead of "auto-verifying…" forever.
        const shouldSubmit =
          !frame.rule?.manual &&
          (ruleStatus === 'correct' || ruleStatus === 'incorrect' || (ruleStatus === 'uncertain' && frame.rule?.stalled)) &&
          stateRef.current === STATES.GUIDING &&
          !verifiedRef.current;

        if (shouldSubmit) {
          verifiedRef.current = true;
          submitVerification({
            status: ruleStatus,
            confidence: frame.rule.confidence,
            errorCode: frame.rule.errorCode,
            perception: anchorToPerceptionPayload(frame, frame.rule.confidence)
          });
        }
      };

      if (workflow?.id === 'inhaler_technique' && perceptionLevel === 'real') {
        // Frame-classifier-backed (see ml-service/ +
        // docs/PHASE_1_ML_INTEGRATION.md) — needs a live session id to
        // proxy predictions through, not just a video element. Only reached
        // when perceptionLevel resolved 'real', i.e. device ===
        // INHALER_ML_DEVICE — every other inhaler device variant falls
        // through to the generic mock branch below, same as before this
        // model existed (its 8 classes don't cover mdi/dpi/soft_mist).
        if (!videoElRef.current || !activeStepId || !sessionRef.current?._id) return;
        const activeStepTitle = steps.find((s) => s.id === activeStepId)?.title;
        const svc = new InhalerFrameModelService({
          sessionId: sessionRef.current._id,
          workflowId: workflow.id,
          stepId: activeStepId,
          stepTitle: activeStepTitle,
          videoEl: videoElRef.current
        });
        perceptionRef.current = svc;
        svc.start(handleRuleFrame);
      } else if (perceptionLevel === 'real') {
        if (!videoElRef.current || !activeStepId || !workflow?.id) return; // wait for camera / step to be ready
        const activeStepTitle = steps.find((s) => s.id === activeStepId)?.title;
        const svc = new RealPerceptionService({
          workflowId: workflow.id,
          stepId: activeStepId,
          stepTitle: activeStepTitle,
          objectLabel: subjectLabel,
          videoEl: videoElRef.current
        });
        perceptionRef.current = svc;
        svc.start(handleRuleFrame);
      } else if (anchorTarget && videoElRef.current) {
        // Short imperative phrase (e.g. "Apply the dressing" -> "Apply
        // dressing") for the on-camera callout — the full instruction is
        // already in the guidance card below, this is a quick "do this
        // here" cue. AnchoredGuideService derives the phrase itself via the
        // shared shortActionPhrase() helper.
        const anchorStepTitle = steps.find((s) => s.id === activeStepId)?.title || subjectLabel;
        const svc = new AnchoredGuideService({ target: anchorTarget, label: subjectLabel, stepTitle: anchorStepTitle, videoEl: videoElRef.current });
        perceptionRef.current = svc;
        svc.start((frame) => setAnchor(frame));
      } else {
        const svc = new MockPerceptionService({ objectLabel: subjectLabel });
        perceptionRef.current = svc;
        svc.start((frame) => setAnchor(frame));
      }

      setState(STATES.DETECTING);
      detectTimerRef.current = setTimeout(() => {
        setState(STATES.TARGET_DETECTED);
        detectTimerRef.current = setTimeout(() => setState(STATES.GUIDING), 500);
      }, 1100);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stopPerception, subjectLabel, perceptionLevel, anchorTarget, workflow?.id, videoEl, currentStep?.id, steps, submitVerification, session?._id]
  );
  startPerceptionRef.current = startPerception;

  // Bootstrap: create the session once we have a resolved workflow. Does
  // NOT start perception directly — a real-perception workflow may not have
  // a live videoEl yet (camera armed after this fires), so a separate
  // effect below starts perception once both session and (for real) video
  // are ready.
  useEffect(() => {
    if (!workflow || !workflow.id) return;
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        const res = await sessionService.create({ workflowId: workflow.id, device });
        if (cancelled) return;
        setSession(res.session);
        setStepIndex(0);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not start session.');
          setState(STATES.ERROR);
        }
      }
    })();

    return () => {
      cancelled = true;
      stopPerception();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow?.id, device]);

  // Starts perception exactly once per session: immediately for workflows
  // with no camera dependency (no rule engine AND no body anchor), or as
  // soon as the camera's video element becomes live for the ones that need
  // real landmark tracking (real Level B, or Level C's anchored guide box).
  // Guarded by a ref (not just the dep array) so perception isn't restarted
  // — losing its in-progress DETECTING/GUIDING timers — every time videoEl
  // changes for a workflow that never needed it in the first place.
  //
  // Keyed on session?._id, NOT the session object itself — `session` gets a
  // brand new object reference from setSession() after EVERY verdict
  // submission (correct/incorrect/uncertain, including the very first
  // manual confirm), even though it's still the same session. Keying on
  // the object would reset perceptionStartedRef and re-fire
  // startPerception(steps[0]?.id) after every single verdict, racing the
  // correct per-step startPerception(...) call from submitVerification and
  // yanking the AR anchor back to step 0 mid-session — exactly the
  // flickering-between-steps bug this once caused. _id is a stable ObjectId
  // for the life of one session, so it only changes when a genuinely new
  // session starts.
  const perceptionStartedRef = useRef(false);
  useEffect(() => {
    perceptionStartedRef.current = false;
  }, [session?._id]);

  useEffect(() => {
    if (!session?._id || !workflow?.id || perceptionStartedRef.current) return;
    if (needsVideo && !videoEl) return;
    perceptionStartedRef.current = true;
    startPerception(steps[0]?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?._id, videoEl, perceptionLevel, anchorTarget]);

  const simulate = useCallback(
    (status) => {
      submitVerification({
        status,
        confidence: randomConfidence(status),
        errorCode: status === 'incorrect' ? 'technique_mismatch' : undefined,
        perception: anchorToPerceptionPayload(anchor, randomConfidence(status))
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [submitVerification, anchor]
  );

  // User explicitly attests a step the rule engine honestly can't verify
  // (see MANUAL_OVERRIDE_STEPS / docs/RESEARCH.md §5) — never presented as
  // an ML verdict.
  const confirmManual = useCallback(() => {
    submitVerification({ status: 'correct', confidence: 1, errorCode: undefined, perception: undefined });
  }, [submitVerification]);

  const retry = useCallback(() => {
    verifiedRef.current = false;
    perceptionRef.current?.resetStall?.(); // fresh stall window, not an instant re-timeout
    setState(STATES.GUIDING);
  }, []);

  const explain = useCallback(
    async (language = 'en') => {
      if (!workflow || !currentStep) return;
      setExplaining(true);
      try {
        const res = await aiService.explainStep({ workflowId: workflow.id, stepId: currentStep.id, language, device });
        setExplanation(res);
      } catch (err) {
        setExplanation({ explanation: 'Could not load an explanation right now.', error: true });
      } finally {
        setExplaining(false);
      }
    },
    [workflow, currentStep, device]
  );

  const exit = useCallback(async () => {
    stopPerception();
    if (session && session.status === 'in_progress') {
      try {
        await sessionService.update(session._id, { status: 'abandoned' });
      } catch {
        /* best-effort */
      }
    }
  }, [session, stopPerception]);

  return {
    state,
    session,
    steps,
    stepIndex,
    currentStep,
    totalSteps: steps.length,
    anchor,
    subjectLabel,
    perceptionLevel,
    manualStepAvailable,
    explanation,
    explaining,
    error,
    actions: { simulate, retry, explain, exit, confirmManual }
  };
}
