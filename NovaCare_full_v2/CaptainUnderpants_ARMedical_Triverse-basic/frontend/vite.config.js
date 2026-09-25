import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    headers: {
      // AR.js uses eval() and loads its artoolkit WASM via a data: URI (base64
      // embedded in aframe-ar.js). Both 'wasm-unsafe-eval' and data: in
      // connect-src are required — without them artoolkit silently falls back
      // to a JS path that cannot detect custom .patt markers.
      //
      // MediaPipe's @mediapipe/tasks-vision (landmarkTasks.js) loads its WASM
      // runtime from https://cdn.jsdelivr.net as a <script> tag, which falls
      // under script-src specifically — default-src's broader 'https:' does
      // NOT apply once script-src is explicitly declared (CSP directives
      // don't inherit from default-src once listed). Without this, pose/face/
      // hand landmarkers silently never load: getPoseLandmarker() never
      // resolves, RealPerceptionService._detect() always returns pose: null,
      // and every real-perception BP/eye-drops/nasal-spray step gets stuck on
      // "MOVE INTO VIEW" — confirmed live via console CSP errors, not assumed.
      'Content-Security-Policy':
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' http: https: data: blob: ws: wss:; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net data: blob:; img-src * data: blob:; media-src * blob: data:; connect-src * data: blob:; worker-src blob: data: https://cdn.jsdelivr.net 'self';"
    }
  },
  preview: {
    host: true,
    port: 5173
  }
});