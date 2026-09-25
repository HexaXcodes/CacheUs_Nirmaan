# NovaCare frontend integration

Adapted the supplied Stitch export into the existing React/Vite app. The reference HTML is not executed and its sample patients, diagnostic statuses, device connections and unsupported capabilities are not treated as live features.

## Main routes
- `/`: landing page; `/login`: role selection.
- Existing `/login/patient`, `/login/asha`, `/login/doctor`: original authenticated APIs.
- `/patient`: overview from the measurement API, not legacy last_glucose.
- `/patient/check`: BP/glucose selection.
- `/patient/check/bp` and `/patient/check/glucose`: one full-screen AR workflow. Reading entry and save/retry happen in its final step.
- PPG is an experimental device option within BP; `/patient/check/ppg` remains a direct link into that same component.
- `/patient/measurements` redirects to check selection. The alternate glucose-at-login form was removed so all new entry uses the same flow.
- `/patient/trends` and `/patient/history`: history and distinct chronological series.
- ASHA: authorized ID lookup, registration and the same AR flow for the selected patient.
- Doctor: authorized ID lookup with read-only history/trends.

## SIH reuse
`components/ar/ARAnchor.jsx` is adapted from the existing SIH ARAnchor renderer (box/ring, leader line and instruction callout). `components/ar/procedures.json` reuses the BP and glucose step order and English/Hindi/Kannada instructions from the SIH backend workflows.json. Other workflows were not imported.

The Nirmaan flow uses manual step confirmation. It does not import SIH MediaPipe/model perception, object detection, automatic verification or mock correctness judgments. Overlays are explicitly visual guides and can be repositioned by tapping. Camera frames remain local. Camera-free mode uses exactly the same steps and final entry form. Read-aloud uses available browser voices; other languages fall back to English where translation is missing.

## Deliberate limits
- No searchable patient-list endpoint was found; staff open records by ID. The measurements API enforces village/district access. No fake patient fallback is used in the new staff portals.
- The legacy medication screen generated a hardcoded prescription. The new page states medication persistence/import is not connected. No prescriptions were deleted from storage.
- Language preference is persisted, but full translation coverage is not claimed.
- No Bluetooth pairing, live sensor streaming or clinical BP validation was added.
- Legacy screens remain on secondary routes; legacy ASHA screening is at `/asha/legacy-screening/:patientId`.

## Verification
Production build succeeds; existing large-bundle warning remains. Backend tests pass when run from Backend (90 collected in this checkout, rather than the 106 reported earlier). No backend implementation was modified.

Browser checks against the running local backend: patient OTP sign-in; reference BP and glucose save/history; experimental fixture label; rejection without HR/BP; HR-only result; service unavailable without fabricated result. After AR consolidation, the glucose procedure was completed and saved in its final panel, then PPG rejection and outage/retry were checked inside the same AR flow. Mobile AR checked at 390px, with no horizontal document overflow.

Use only designated local test patients for verification. This session created test readings on a development patient with device names prefixed UI-test; they are not clinical readings.

ASHA and doctor development sign-in and portal rendering were also verified in the browser. Existing ASHA registration fields render with the shared shell. Staff patient lookup uses the existing authorization checks; cross-role patient access was not exhaustively retested.

### AR tracking and ASHA scope correction (2026-09-23)
- BP camera guidance now uses the SIH pretrained MediaPipe PoseLandmarker; glucose uses HandLandmarker. Both run locally, with GPU-to-CPU fallback, explicit loading/search/error states and retry. Model/WASM assets currently load from the same public CDNs used by SIH, so initial loading requires network access.
- Overlay coordinates account for object-fit cover cropping. BP arm steps require visible shoulder, elbow and wrist; glucose draws the detected hand/fingers. Missing/cropped targets do not retain a fake detected box. Steps remain manually confirmed; landmark tracking does not verify cuff fit, sharps use or device readings. PPG remains sensor/SQI-driven.
- ASHA login returns village/district scope. Registration prefills it and rejects cross-village creation or dedup reassignment. Existing out-of-scope patients remain denied; no account assignments were changed. Sign in again to refresh the stored profile fields.
- Verification: frontend build passed (existing large-chunk warning); 4 geometry tests passed; 93 backend tests passed. Live browser confirmed BP body detection and arm-search state, glucose model load/search state, no console errors. Positive glucose hand tracking still needs a live hand-in-frame check. Live API confirmed scope fields and cross-village registration rejection.
- Doctor heatmap uses actual screening aggregates, with an explicit empty/error state instead of silently showing invented village counts. These are legacy screening tiers, not hypertension/diabetes prevalence.
