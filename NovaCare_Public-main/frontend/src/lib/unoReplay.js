// Pure, framework-free helpers for the Arduino Uno finger-triggered PPG dataset replay.
// Kept separate from the React component so the parsing/state-machine logic is
// easy to unit test without Web Serial or React Testing Library.

/**
 * Split a running text buffer into complete lines, tolerating serial chunks
 * that split mid-line (Web Serial delivers arbitrary byte chunks, not lines).
 * @param {string} buffer leftover text from the previous call
 * @param {string} chunk newly received text
 * @returns {{lines:string[], remainder:string}}
 */
export function splitSerialLines(buffer, chunk) {
  const combined = buffer + chunk
  const parts = combined.split(/\r\n|\r|\n/)
  const remainder = parts.pop() ?? ''
  const lines = parts.map(l => l.trim()).filter(Boolean)
  return { lines, remainder }
}

/**
 * Parse one trimmed serial line from the Uno firmware into a typed event.
 * Unknown lines return null and must be ignored, not throw.
 */
export function parseSerialLine(line) {
  if (line === 'READY') return { type: 'READY' }
  if (line === 'EVENT:FINGER_OUT') return { type: 'FINGER_OUT' }
  if (line === 'EVENT:FINGER_IN') return { type: 'FINGER_IN' }
  const light = /^LIGHT:(-?\d+)$/.exec(line)
  if (light) return { type: 'LIGHT', value: Number(light[1]) }
  return null
}

export const REPLAY_PHASE = {
  DISARMED: 'disarmed',
  WAITING_FOR_OUT: 'waiting_for_out',
  READY_FOR_IN: 'ready_for_in',
  REPLAYING: 'replaying',
}

export function initialReplayState() {
  return { phase: REPLAY_PHASE.DISARMED, cycles: 0 }
}

/**
 * Reducer for the finger-triggered replay arming state machine.
 * Actions: ARM, DISARM, FINGER_OUT, FINGER_IN, REPLAY_DONE, CANCEL (board reset,
 * disconnect, serial silence, page exit, or a new FINGER_OUT mid-replay).
 *
 * Guarantees enforced here (see spec items 4/5/8/9):
 * - A replay only starts from READY_FOR_IN (i.e. after a confirmed FINGER_OUT
 *   while armed) — never on the very first FINGER_IN with no preceding OUT.
 * - Exactly one replay fires per FINGER_IN; duplicate/rapid FINGER_IN events in
 *   REPLAYING or DISARMED are ignored.
 * - After a replay, the state returns to WAITING_FOR_OUT (if still armed) so a
 *   fresh removal/insertion cycle is required before the next replay.
 */
export function reduceReplay(state, action) {
  const s = state || initialReplayState()
  switch (action.type) {
    case 'ARM':
      return { ...s, phase: REPLAY_PHASE.WAITING_FOR_OUT }
    case 'DISARM':
    case 'CANCEL':
      return { ...s, phase: REPLAY_PHASE.DISARMED }
    case 'FINGER_OUT':
      if (s.phase === REPLAY_PHASE.DISARMED) return s
      return { ...s, phase: REPLAY_PHASE.READY_FOR_IN }
    case 'FINGER_IN':
      if (s.phase !== REPLAY_PHASE.READY_FOR_IN) return s // duplicate or not armed: ignore
      return { ...s, phase: REPLAY_PHASE.REPLAYING, cycles: s.cycles + 1 }
    case 'REPLAY_DONE':
      if (s.phase !== REPLAY_PHASE.REPLAYING) return s
      return { ...s, phase: REPLAY_PHASE.WAITING_FOR_OUT }
    default:
      return s
  }
}

export const SUBMIT_STATUS = { IDLE: 'idle', PENDING: 'pending', SUBMITTED: 'submitted' }

/**
 * Build the exact measurement payload for a dataset replay submission.
 * - Strips `_reference` (must never reach the backend/ML).
 * - Forces provenance fields per spec: source=dataset_simulator, synthetic flag
 *   preserved from the dataset file (documents "this is not a live sensor
 *   reading"), patient/recorded_at/screening_id set from the live session.
 * - Never sets source to physical_sensor, even though a real Uno triggered it.
 */
export function buildReplayPayload({ segment, patientId, screeningId, recordedAt, deviceId }) {
  if (!segment) throw new Error('No dataset segment selected')
  if (!patientId) throw new Error('No patient selected')
  const { _reference, metadata = {}, ...rest } = segment
  const originalDescription = metadata.description || 'Prerecorded PPG dataset segment'
  return {
    ...rest,
    patient_id: patientId,
    recorded_at: recordedAt || new Date().toISOString(),
    fixture: null,
    metadata: {
      ...metadata,
      source: 'dataset_simulator',
      synthetic: true,
      device_id: deviceId || metadata.device_id || 'uno-finger-trigger-replay',
      description: `Dataset replay — not measured from the current finger. Original segment: ${originalDescription}`.slice(0, 200),
      screening_id: screeningId || metadata.screening_id || null,
    },
  }
}

/** Duration in seconds a replay should run for, from the dataset contract. */
export function replayDurationSeconds(segment) {
  if (!segment?.samples?.length || !segment?.sampling_rate_hz) return 0
  return segment.samples.length / segment.sampling_rate_hz
}

/**
 * Pick one manifest entry uniformly at random. Pure and side-effect free so it is
 * trivially testable: pass `rng` (defaults to Math.random) to control the draw in
 * tests. Never biases toward any "desirable" outcome — every entry is equally likely.
 */
export function pickRandomSegment(entries, rng = Math.random) {
  if (!Array.isArray(entries) || entries.length === 0) return null
  const idx = Math.floor(rng() * entries.length)
  return entries[Math.min(entries.length - 1, Math.max(0, idx))]
}

/**
 * True when a fetched dataset segment file is well-formed enough to replay:
 * a non-empty numeric sample array and a positive sampling rate.
 */
export function isValidSegment(data) {
  return !!data
    && Array.isArray(data.samples) && data.samples.length > 0
    && typeof data.sampling_rate_hz === 'number' && data.sampling_rate_hz > 0
}

/** Number of samples that should be revealed on a scrolling waveform view
 * `elapsedSeconds` into a replay of `segment`, without ever exceeding the
 * segment's own sample count. */
export function revealedSampleCount(segment, elapsedSeconds) {
  const total = segment?.samples?.length || 0
  const rate = segment?.sampling_rate_hz || 0
  if (!total || !rate || elapsedSeconds <= 0) return 0
  return Math.min(total, Math.floor(elapsedSeconds * rate))
}
