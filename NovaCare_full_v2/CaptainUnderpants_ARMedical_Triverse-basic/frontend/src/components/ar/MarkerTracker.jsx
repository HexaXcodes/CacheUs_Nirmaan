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
// src/components/ar/MarkerTracker.jsx
// ============================================================================
//  Wraps an <a-marker> element and exposes its found/lost events as React
//  callbacks. Children are rendered as overlays anchored to the marker.
// ============================================================================

import { useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { useMarkerEvents } from './useMarkerEvents';
import { MARKERS } from './arConfig';

/**
 * @param {string}   markerKey      Key from MARKERS in arConfig.js
 * @param {Function} onFound        (markerId) => void
 * @param {Function} onLost         (markerId) => void
 * @param {ReactNode} children       Overlay objects rendered when marker visible
 */
const MarkerTracker = forwardRef(function MarkerTracker(
  { markerKey = 'hiro', onFound, onLost, children },
  ref
) {
  const markerRef = useRef(null);
  const [isFound, setIsFound] = useState(false);

  useImperativeHandle(ref, () => ({
    isFound: () => isFound,
    el: () => markerRef.current
  }));

  useMarkerEvents(
    markerRef,
    {
      onFound: (id) => { setIsFound(true);  onFound?.(id); },
      onLost:  (id) => { setIsFound(false); onLost?.(id); }
    },
    markerKey,
    true
  );

  const marker = MARKERS[markerKey] || MARKERS.hiro;

  // Build the right marker attributes based on its type
  const markerAttrs =
    marker.type === 'preset'
      ? { preset: marker.value }
      : { type: 'pattern', url: marker.value };

  // patternRatio only applies to custom pattern markers; omit for presets
  const extraAttrs = marker.type === 'pattern' ? { patternRatio: '0.5' } : {};

  return (
    <a-marker
      ref={markerRef}
      {...markerAttrs}
      {...extraAttrs}
      emitevents="true"
      raycaster="objects: .clickable"
      cursor="fuse: false; rayOrigin: mouse"
    >
      {children}
    </a-marker>
  );
});

export default MarkerTracker;
