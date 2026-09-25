// ============================================================================
//  ⚠️  LEGACY — QR/marker-based AR.js prototype (AR.js + A-Frame + .patt files).
//  NOT used by the new markerless workflow engine. The primary AR experience
//  is now pages/ARExperience.jsx + components/ar/{CameraFeed,ARAnchor,
//  GuidancePanel}.jsx, driven by hooks/useProcedureSession.js and normalized
//  ML perception coordinates instead of a physical marker.
//
//  Retained (not deleted) per migration instructions in case anything still
//  depends on it, and as a reference for the old interaction model. Safe to
//  remove once nobody imports it — this file is currently unreferenced by
//  any page or route.
// ============================================================================
// src/components/workflow/ARScene.jsx
//
// ============================================================================
//  ⚠️  PLACEHOLDER COMPONENT — REPLACE WITH REAL AR.JS IMPLEMENTATION
// ============================================================================
//
//  This file is the SINGLE integration point for the AR module.
//  The AR engineer should replace the body of this component with the AR.js
//  + A-Frame scene. Do NOT change the public props — pages and contexts depend
//  on this contract.
//
//  PROPS CONTRACT
//  --------------
//    workflow        { id, name }              // current scenario meta
//    severity        'mild' | 'moderate' | 'severe'
//    currentStep     number                    // 0-indexed step pointer
//    steps           Array<step>               // full step list
//    onMarkerFound   (markerId: string) => void
//    onStepComplete  (stepIndex: number) => void
//
//  The placeholder simulates a camera viewport so the rest of the UI can be
//  built and tested without AR hardware.
// ============================================================================

import { useEffect } from 'react';
import { Camera, Crosshair } from 'lucide-react';

const ARScene = ({
  workflow,
  severity,
  currentStep = 0,
  steps = [],
  onMarkerFound,
  onStepComplete
}) => {
  // Simulate marker detection for demo purposes (DEV-only). The real AR.js
  // implementation will fire onMarkerFound when an AR marker is detected.
  useEffect(() => {
    if (!onMarkerFound || !workflow) return;
    const t = setTimeout(() => onMarkerFound(workflow.id), 1500);
    return () => clearTimeout(t);
  }, [workflow?.id, onMarkerFound]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-ink">
      {/* Faux camera feed — gradient + scan lines so the placeholder looks intentional */}
      <div className="absolute inset-0 bg-gradient-to-br from-ink via-primary/20 to-ink" />
      <div
        className="absolute inset-0 opacity-30 mix-blend-overlay"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0, transparent 3px, rgba(255,255,255,0.04) 3px, rgba(255,255,255,0.04) 4px)'
        }}
      />

      {/* Center crosshair — visual cue for the user to point at marker */}
      <div className="absolute inset-0 grid place-items-center pointer-events-none">
        <div className="relative w-48 h-48">
          <div className="absolute inset-0 border-2 border-accent/60 rounded-3xl animate-pulse-slow" />
          <div className="absolute inset-4 border border-accent/30 rounded-2xl" />
          <Crosshair className="absolute inset-0 m-auto text-accent" size={32} strokeWidth={1.5} />
        </div>
      </div>

      {/* Top-left badge */}
      <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-1.5 bg-bone/90 backdrop-blur border-2 border-ink rounded-lg shadow-brutal-sm">
        <Camera size={14} strokeWidth={2.5} />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]">AR Placeholder</span>
      </div>

      {/* Bottom-left scenario meta */}
      <div className="absolute bottom-4 left-4 text-bone font-mono text-xs">
        <div>scenario: {workflow?.name || '—'}</div>
        <div>severity: {severity || '—'}</div>
        <div>step: {currentStep + 1}/{steps.length || '?'}</div>
      </div>
    </div>
  );
};

export default ARScene;
