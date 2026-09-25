// src/data/careWorkflowsMeta.js
// Frontend-only presentation metadata layered on top of the backend's generic
// workflow config (GET /api/workflows). The backend marks every workflow it
// has fully specified as `supported: true` — but that only means the step
// data + ML *contract* exist, not that the perception model is production
// ready yet. This file is where the product decides what's actually safe to
// let a patient START today vs. preview as a roadmap item, WITHOUT touching
// backend code. Only flip a tier to 'available' once the real ML model backs
// it end to end.
import {
  Wind, HeartPulse, Syringe, Droplets, PillBottle, Bandage
} from 'lucide-react';

// 'available'   -> fully launchable now. Verification is real rule-based CV
//                  for workflows in PERCEPTION_LEVEL ('real'; see below) and
//                  a dev-simulated demo for everything else ('mock') — which
//                  one is always disclosed via perceptionBadge(), never
//                  implied by this tier alone.
// 'beta'        -> launchable, but flagged as still-maturing
// 'coming_soon' -> visible for education/roadmap only, Start is disabled
export const AVAILABILITY = {
  inhaler_technique: 'available',
  bp_measurement: 'available',
  insulin_injection: 'available',
  glucose_measurement: 'available',
  eye_drops: 'available',
  nasal_spray: 'available',
  nebulizer: 'available',
  wound_dressing: 'available',
  ors_preparation: 'available'
};

// Which workflows run real pretrained-CV + rule-engine verification
// (Level B, see docs/RESEARCH.md) versus the dev-simulated mock demo
// (Level C). Anything not listed here defaults to 'mock'.
export const PERCEPTION_LEVEL = {
  bp_measurement: 'real',
  eye_drops: 'real',
  nasal_spray: 'real',
  // Generic hand/face presence+proximity rules only — never claiming to
  // detect the device/wound itself (no dataset exists for that, see
  // docs/RESEARCH.md). Device-specific steps within these workflows are
  // still routed to manual confirm (see ruleEngine.js's manual-step list).
  glucose_measurement: 'real',
  nebulizer: 'real',
  wound_dressing: 'real',
  // insulin_injection stays mock/demo deliberately — RESEARCH.md frames
  // that as a safety choice, not just a data gap: a false "correct" on
  // injection technique is the worst failure mode for this prototype.
  //
  // inhaler_technique is deliberately NOT listed here — unlike every other
  // entry above, its real-vs-mock split isn't per-workflow, it's per
  // DEVICE (see below). Falling through to the 'mock' default for an
  // unrecognized/missing device is exactly right: mdi/dpi/soft_mist have no
  // model backing them, and getting this wrong once already produced a
  // real bug (the frame classifier silently running — and never settling
  // "correct" — against device steps its 8 classes don't cover).
};

// Phase 1's model (see ml-service/ + docs/PHASE_1_ML_INTEGRATION.md) was
// trained on ONE specific pMDI-without-spacer technique breakdown — its 8
// classes only line up with this ONE device variant's steps. mdi/dpi/
// soft_mist keep their pre-existing mock/demo behavior; only this device
// gets the real model.
export const INHALER_ML_DEVICE = 'pmdi_no_spacer';

export const perceptionLevelFor = (workflowId, device) => {
  if (workflowId === 'inhaler_technique') {
    return device === INHALER_ML_DEVICE ? 'real' : 'mock';
  }
  return PERCEPTION_LEVEL[workflowId] || 'mock';
};

// For the remaining Level C workflows (still no rule-verified verdict — no
// dataset, see docs/RESEARCH.md), the AR box no longer has to drift
// randomly: generic pretrained hand/face detection is legitimate and
// available, so the guide is anchored to the real body part performing the
// step, even though correctness is still confirmed via the Simulate
// buttons, never claimed from tracking alone. Only applies to workflows
// NOT in PERCEPTION_LEVEL as 'real' — those get full rule-based tracking
// instead (see ruleEngine.js).
export const BODY_ANCHOR = {
  insulin_injection: 'hand',
  ors_preparation: 'hand'
};

export const bodyAnchorFor = (workflowId) => BODY_ANCHOR[workflowId] || null;

// Per-workflow badge text overrides — for when 'real' shouldn't all read as
// equal-confidence. A hand-written geometric rule you can read line-by-line
// is a different kind of claim than a model fit on 32 examples from one
// person's one demonstration; the badge says so rather than lumping both
// under the same "ML-assisted verification (rule-based)" copy. See
// docs/PHASE_1_ML_INTEGRATION.md for the full accuracy/limitation
// disclosure this badge text is summarizing.
//
// inhaler_technique specifically: live testing found the model settling
// "correct" with no inhaler in frame at all (no background/nothing class —
// see docs/PHASE_1_ML_INTEGRATION.md's "0 of 8 classes confirmed" section),
// so every step in this workflow was moved to MANUAL_OVERRIDE_STEPS
// (ruleEngine.js). The badge below reflects that current reality — it must
// NOT read as "some live model verification is still happening here."
const PERCEPTION_BADGE_OVERRIDE = {
  inhaler_technique: 'Manual confirmation only — frame classifier integrated but not yet reliable enough for live verification (see docs)'
};

// Badge copy shown before Start and inside the live guidance panel — never
// "AI-verified" for real steps, never a fabricated confidence number for
// mock ones. `device` matters for inhaler_technique specifically — see
// perceptionLevelFor().
export const perceptionBadge = (workflowId, device) => {
  const level = perceptionLevelFor(workflowId, device);
  if (level === 'real' && PERCEPTION_BADGE_OVERRIDE[workflowId]) {
    // 'manual-fallback': a real trained model is integrated, but every step
    // is currently routed to manual confirm (see comment above) — styled
    // the same neutral/inactive color as 'mock' in GuidancePanel.jsx /
    // WorkflowDetailPanel.jsx, deliberately NOT the amber 'experimental'
    // tier, so the color can't imply partial live ML verification either.
    return { level: 'manual-fallback', label: PERCEPTION_BADGE_OVERRIDE[workflowId] };
  }
  return level === 'real'
    ? { level: 'real', label: 'ML-assisted verification (rule-based)' }
    : { level: 'mock', label: 'Demo / Prototype' };
};

// What object/device the mock perception layer should say it's "looking for"
// in the AR demo — purely cosmetic copy, never a real detection claim.
export const SUBJECT_LABEL = {
  inhaler_technique: 'inhaler',
  bp_measurement: 'blood pressure cuff',
  insulin_injection: 'insulin pen',
  glucose_measurement: 'glucometer',
  eye_drops: 'eye drop bottle',
  nasal_spray: 'nasal spray',
  nebulizer: 'nebulizer',
  wound_dressing: 'dressing',
  ors_preparation: 'ORS sachet'
};

// The six phases as the product is framed to patients. Each maps to one or
// more backend workflow ids — Phase 5 and 6 are intentionally multi-workflow
// so we don't duplicate a whole page per sub-procedure.
export const PHASES = [
  {
    phase: 1,
    category: 'respiratory',
    title: 'Inhaler Technique',
    tagline: "Verify the steps of your prescribed inhaler technique with guided visual assistance.",
    icon: Wind,
    workflowIds: ['inhaler_technique']
  },
  {
    phase: 2,
    category: 'cardiovascular',
    title: 'Blood Pressure Measurement',
    tagline: "Check that you're following the correct procedure when taking a home blood-pressure measurement.",
    icon: HeartPulse,
    workflowIds: ['bp_measurement']
  },
  {
    phase: 3,
    category: 'diabetes',
    title: 'Insulin Injection Technique',
    tagline: 'Guided assistance for performing an existing prescribed insulin injection.',
    icon: Syringe,
    workflowIds: ['insulin_injection']
  },
  {
    phase: 4,
    category: 'diabetes_monitoring',
    title: 'Glucose Measurement',
    tagline: 'Guided assistance for correctly performing a glucometer measurement.',
    icon: Droplets,
    workflowIds: ['glucose_measurement']
  },
  {
    phase: 5,
    category: 'medication_delivery',
    title: 'Medication Delivery',
    tagline: 'Step-by-step assistance for supported medication-delivery procedures.',
    icon: PillBottle,
    workflowIds: ['eye_drops', 'nasal_spray', 'nebulizer']
  },
  {
    phase: 6,
    category: 'home_procedure',
    title: 'Low-Risk Home Procedures',
    tagline: 'Guided low-risk home procedures — minor dressing, topical application, ORS preparation.',
    icon: Bandage,
    workflowIds: ['wound_dressing', 'ors_preparation']
  }
];

export const tierLabel = (tier) => {
  if (tier === 'available') return 'AVAILABLE';
  if (tier === 'beta') return 'BETA';
  return 'COMING SOON';
};

export const isLaunchable = (tier) => tier === 'available' || tier === 'beta';

// Roughly ~12s/step is a reasonable guided-session estimate for the "approx.
// duration" line in the workflow detail view — purely descriptive, not timed.
export const estimateDuration = (stepCount) => {
  const mins = Math.max(1, Math.round((stepCount * 25) / 60));
  return `~${mins} min`;
};
