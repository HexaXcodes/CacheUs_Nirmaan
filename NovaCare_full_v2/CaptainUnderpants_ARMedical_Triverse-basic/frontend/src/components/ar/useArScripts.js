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
// src/components/ar/useArScripts.js
// ============================================================================
//  Loads A-Frame + AR.js scripts ONCE, in correct order.
//  Resolves only when the custom elements (<a-scene>, <a-marker>) are actually
//  registered with the browser — not just when the script tag has a `load` event.
//
//  This avoids the very common bug where AR.js seems "loaded" but rendering
//  silently breaks because customElements weren't ready yet.
// ============================================================================

import { useEffect, useState } from 'react';
import { AFRAME_CDN, ARJS_CDN } from './arConfig';

// Module-level cache: ensures scripts are only injected once even across
// multiple <ARScene> mounts.
let scriptsLoadingPromise = null;

const injectScript = (src, attrs = {}) =>
  new Promise((resolve, reject) => {
    // If already in DOM, resolve immediately
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') return resolve();
      existing.addEventListener('load',  () => resolve(), { once: true });
      existing.addEventListener('error', (e) => reject(e), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = false; // preserve order — AR.js depends on A-Frame
    Object.entries(attrs).forEach(([k, v]) => (s[k] = v));
    s.addEventListener('load', () => {
      s.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    s.addEventListener('error', (e) => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.head.appendChild(s);
  });

// Wait until A-Frame elements and AR.js global are registered. Different
// AR.js builds expose the scene integration as a system, not a component.
const waitForAframeRegistry = (timeout = 10000) =>
  new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const aframeReady =
        !!(window.AFRAME && customElements.get('a-scene') && customElements.get('a-marker'));
      const arjsReady =
        !!(window.ARjs || window.AFRAME?.systems?.arjs || window.AFRAME?.components?.arjs);
      if (aframeReady && arjsReady) return resolve();
      if (Date.now() - start > timeout) {
        return reject(new Error('AR runtime did not initialize in time.'));
      }
      requestAnimationFrame(check);
    };
    check();
  });

const loadAll = async () => {
  await injectScript(AFRAME_CDN);
  await injectScript(ARJS_CDN);
  await waitForAframeRegistry();
};

/**
 * Returns { ready, error }. ready becomes true once A-Frame + AR.js are
 * fully registered and safe to use.
 */
export const useArScripts = () => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!scriptsLoadingPromise) {
      scriptsLoadingPromise = loadAll();
    }
    scriptsLoadingPromise
      .then(() => { if (!cancelled) setReady(true); })
      .catch((err) => {
        if (!cancelled) setError(err);
        // Reset cache so retries are possible
        scriptsLoadingPromise = null;
      });
    return () => { cancelled = true; };
  }, []);

  return { ready, error };
};
