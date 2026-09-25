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
// src/components/ar/useMarkerEvents.js
// ============================================================================
//  Hook for binding markerFound / markerLost events to A-Frame markers.
//  Handles cleanup so the AR scene doesn't leak listeners on remount.
// ============================================================================

import { useEffect, useRef } from 'react';

/**
 * Attaches markerFound/markerLost listeners to a ref'd <a-marker> element.
 *
 * @param {React.RefObject} markerRef - ref to the <a-marker> DOM node
 * @param {Object}   handlers
 * @param {Function} handlers.onFound  (markerId: string) => void
 * @param {Function} handlers.onLost   (markerId: string) => void
 * @param {string}   markerId           identifier passed to callbacks
 * @param {boolean}  enabled            disable when false (cleans up)
 */
export const useMarkerEvents = (
  markerRef,
  { onFound, onLost } = {},
  markerId = 'hiro',
  enabled = true
) => {
  // Stash the latest callbacks in refs so we don't re-bind listeners
  // every time the parent re-renders with new closures.
  const onFoundRef = useRef(onFound);
  const onLostRef  = useRef(onLost);
  useEffect(() => { onFoundRef.current = onFound; }, [onFound]);
  useEffect(() => { onLostRef.current  = onLost;  }, [onLost]);

  useEffect(() => {
    if (!enabled) return;
    const el = markerRef?.current;
    if (!el) return;

    const handleFound = () => onFoundRef.current?.(markerId);
    const handleLost  = () => onLostRef.current?.(markerId);

    el.addEventListener('markerFound', handleFound);
    el.addEventListener('markerLost',  handleLost);

    return () => {
      el.removeEventListener('markerFound', handleFound);
      el.removeEventListener('markerLost',  handleLost);
    };
  }, [markerRef, markerId, enabled]);
};

/**
 * Pulses a callback at a given interval while the marker is visible.
 * Useful for "step complete after N seconds of holding" UX.
 */
export const useMarkerHoldTimer = (isFound, ms, callback) => {
  const cbRef = useRef(callback);
  useEffect(() => { cbRef.current = callback; }, [callback]);

  useEffect(() => {
    if (!isFound || !ms) return;
    const t = setTimeout(() => cbRef.current?.(), ms);
    return () => clearTimeout(t);
  }, [isFound, ms]);
};
