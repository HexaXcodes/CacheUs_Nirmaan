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
// src/components/ar/StepRenderer.jsx
// ============================================================================
//  Picks which overlays to render for the current step.
//  Decoupled from MarkerTracker so it can be reused inside any marker.
// ============================================================================

import { HighlightCircle, DirectionalArrow, FloatingText, StepBadge } from './OverlayObjects';
import { SEVERITY_COLORS, DEFAULT_COLORS } from './arConfig';

/**
 * @param {Object}  props
 * @param {Object}  props.step      One step from the workflow:
 *   { id, title, instruction, highlightPosition, objectPosition, color }
 * @param {string}  props.severity  'mild' | 'moderate' | 'severe'
 * @param {number}  props.totalSteps
 */
const StepRenderer = ({ step, severity, totalSteps }) => {
  if (!step) return null;

  // Color resolution priority: explicit step.color → severity color → default
  const accent =
    step.color ||
    SEVERITY_COLORS[severity] ||
    DEFAULT_COLORS.highlight;

  // Severe scenarios get an alert-red highlight regardless of step.color,
  // unless the step explicitly overrides.
  const highlightColor = step.color || (severity === 'severe' ? SEVERITY_COLORS.severe : accent);

  return (
    <a-entity scale="1.2 1.2 1.2">
      <HighlightCircle
        position={step.highlightPosition || '0 0.01 0'}
        color={highlightColor}
        radius={0.7}
      />
      <DirectionalArrow
        position={step.objectPosition || '0 0.8 0'}
        color={accent}
      />
      <FloatingText
        position="0 1.6 0"
        text={step.title || ''}
      />
      <StepBadge
        position="0 2.4 0"
        number={step.id || '?'}
        color={accent}
      />
    </a-entity>
  );
};

export default StepRenderer;
