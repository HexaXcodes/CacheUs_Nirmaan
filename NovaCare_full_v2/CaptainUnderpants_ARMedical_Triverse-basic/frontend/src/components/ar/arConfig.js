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
// src/components/ar/arConfig.js
// ============================================================================
//  Single source of truth for AR module configuration.
//  Adjust here only — never hardcode URLs / values inside components.
// ============================================================================

// CDN script URLs.
// Pinned versions for stability — do NOT use "latest".
export const AFRAME_CDN =
  '/lib/aframe.min.js';

export const ARJS_CDN =
  '/lib/aframe-ar.js';

// Marker presets.
// Hiro is the default AR.js training marker — works out of the box.
// Add custom .patt files under public/markers/ and reference them via "url".
export const MARKERS = {
  hiro: { type: 'preset', value: 'hiro' },
  kanji: { type: 'preset', value: 'kanji' },
  wound:   { type: 'pattern', value: '/markers/pattern-wound.patt' },
  burn:    { type: 'pattern', value: '/markers/pattern-burn.patt' },
  cardiac: { type: 'pattern', value: '/markers/pattern-cardiac.patt' }
};

// Hiro is AR.js's built-in preset — zero file loading, guaranteed detection.
// Using it for all workflows for demo reliability.
export const WORKFLOW_TO_MARKER = {
  wound_care: 'hiro',
  burn_care:  'hiro',
  cpr:        'hiro',
};

// AR.js scene parameters.
export const SCENE_PARAMS = {
  sourceType: 'webcam',
  sourceWidth: 640,
  sourceHeight: 480,
  debugUIEnabled: false,
  trackingMethod: 'best',
};

// Renderer params — keep GPU usage modest.
export const RENDERER_PARAMS = {
  antialias: true,
  alpha: true,
  precision: 'mediump',
  logarithmicDepthBuffer: false
};

// Per-severity color palette for overlays
export const SEVERITY_COLORS = {
  mild:     '#22C55E', // green
  moderate: '#F59E0B', // amber
  severe:   '#EF4444'  // red
};

// Default overlay colors when severity unknown
export const DEFAULT_COLORS = {
  highlight: '#55B0DD',
  arrow:     '#91C0FA',
  text:      '#FFFFFF',
  textBg:    '#0A0F14'
};
