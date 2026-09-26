import { describe, it, expect } from 'vitest'
import {
  splitSerialLines, parseSerialLine, reduceReplay, initialReplayState,
  REPLAY_PHASE, buildReplayPayload, replayDurationSeconds,
  pickRandomSegment, isValidSegment, revealedSampleCount,
} from './unoReplay'

describe('splitSerialLines', () => {
  it('parses complete lines and keeps a trailing partial line as remainder', () => {
    const { lines, remainder } = splitSerialLines('', 'READY\r\nLIGHT:743\r\nEVENT:FIN')
    expect(lines).toEqual(['READY', 'LIGHT:743'])
    expect(remainder).toBe('EVENT:FIN')
  })

  it('reassembles a line split across two chunks', () => {
    const first = splitSerialLines('', 'EVENT:FING')
    expect(first.lines).toEqual([])
    const second = splitSerialLines(first.remainder, 'ER_OUT\r\nLIGHT:190\r\n')
    expect(second.lines).toEqual(['EVENT:FINGER_OUT', 'LIGHT:190'])
    expect(second.remainder).toBe('')
  })

  it('ignores blank lines', () => {
    const { lines } = splitSerialLines('', '\r\n\r\nEVENT:FINGER_IN\r\n\r\n')
    expect(lines).toEqual(['EVENT:FINGER_IN'])
  })
})

describe('parseSerialLine', () => {
  it('parses known event lines', () => {
    expect(parseSerialLine('READY')).toEqual({ type: 'READY' })
    expect(parseSerialLine('EVENT:FINGER_OUT')).toEqual({ type: 'FINGER_OUT' })
    expect(parseSerialLine('EVENT:FINGER_IN')).toEqual({ type: 'FINGER_IN' })
    expect(parseSerialLine('LIGHT:743')).toEqual({ type: 'LIGHT', value: 743 })
  })

  it('returns null for garbage/unknown lines instead of throwing', () => {
    expect(parseSerialLine('garbled!!')).toBeNull()
    expect(parseSerialLine('')).toBeNull()
    expect(parseSerialLine('LIGHT:abc')).toBeNull()
  })
})

describe('reduceReplay state machine', () => {
  it('requires ARM then a confirmed FINGER_OUT before a replay can start', () => {
    let s = initialReplayState()
    s = reduceReplay(s, { type: 'FINGER_IN' }) // ignored: not armed
    expect(s.phase).toBe(REPLAY_PHASE.DISARMED)
    s = reduceReplay(s, { type: 'ARM' })
    expect(s.phase).toBe(REPLAY_PHASE.WAITING_FOR_OUT)
    s = reduceReplay(s, { type: 'FINGER_IN' }) // still ignored: no OUT confirmed yet
    expect(s.phase).toBe(REPLAY_PHASE.WAITING_FOR_OUT)
    s = reduceReplay(s, { type: 'FINGER_OUT' })
    expect(s.phase).toBe(REPLAY_PHASE.READY_FOR_IN)
    s = reduceReplay(s, { type: 'FINGER_IN' })
    expect(s.phase).toBe(REPLAY_PHASE.REPLAYING)
    expect(s.cycles).toBe(1)
  })

  it('ignores duplicate FINGER_IN while already replaying (exactly one replay per insertion)', () => {
    let s = { phase: REPLAY_PHASE.REPLAYING, cycles: 1 }
    s = reduceReplay(s, { type: 'FINGER_IN' })
    expect(s.phase).toBe(REPLAY_PHASE.REPLAYING)
    expect(s.cycles).toBe(1)
  })

  it('requires a fresh removal/insertion cycle after a completed replay', () => {
    let s = { phase: REPLAY_PHASE.REPLAYING, cycles: 1 }
    s = reduceReplay(s, { type: 'REPLAY_DONE' })
    expect(s.phase).toBe(REPLAY_PHASE.WAITING_FOR_OUT)
    s = reduceReplay(s, { type: 'FINGER_IN' }) // no fresh OUT yet: ignored
    expect(s.phase).toBe(REPLAY_PHASE.WAITING_FOR_OUT)
  })

  it('CANCEL disarms from any phase (board reset, disconnect, silence, page exit)', () => {
    for (const phase of Object.values(REPLAY_PHASE)) {
      const s = reduceReplay({ phase, cycles: 0 }, { type: 'CANCEL' })
      expect(s.phase).toBe(REPLAY_PHASE.DISARMED)
    }
  })

  it('a new FINGER_OUT while replaying does not itself cancel (cancellation is driven by the caller)', () => {
    // The reducer only tracks arm phase; UnoPpgReplay.jsx calls cancelPendingReplay()
    // and clears the pending setTimeout when a new FINGER_OUT arrives mid-replay.
    const s = reduceReplay({ phase: REPLAY_PHASE.REPLAYING, cycles: 1 }, { type: 'FINGER_OUT' })
    expect(s.phase).toBe(REPLAY_PHASE.READY_FOR_IN)
  })
})

describe('buildReplayPayload', () => {
  const segment = {
    contract_version: '1',
    samples: [0.1, 0.2, 0.3],
    sampling_rate_hz: 125,
    sample_unit: 'normalized',
    metadata: { source: 'dataset_simulator', synthetic: true, device_id: 'bidmc-subject-01', description: 'BIDMC subject 01, segment 1.' },
    _reference: { ground_truth_hr_bpm: 91.3, dataset: 'BIDMC PPG and Respiration Dataset v1.0.0' },
  }

  it('strips _reference and never forwards it to the backend/ML', () => {
    const payload = buildReplayPayload({ segment, patientId: 'p1', screeningId: 's1' })
    expect(payload._reference).toBeUndefined()
  })

  it('sets correct provenance: dataset_simulator, synthetic, screening link, and never physical_sensor', () => {
    const payload = buildReplayPayload({ segment, patientId: 'p1', screeningId: 's1' })
    expect(payload.patient_id).toBe('p1')
    expect(payload.metadata.source).toBe('dataset_simulator')
    expect(payload.metadata.source).not.toBe('physical_sensor')
    expect(payload.metadata.synthetic).toBe(true)
    expect(payload.metadata.screening_id).toBe('s1')
    expect(payload.metadata.description).toMatch(/Dataset replay — not measured from the current finger/)
    expect(payload.metadata.description).toMatch(/BIDMC subject 01/)
  })

  it('throws without a segment or patient', () => {
    expect(() => buildReplayPayload({ segment: null, patientId: 'p1' })).toThrow()
    expect(() => buildReplayPayload({ segment, patientId: '' })).toThrow()
  })
})

describe('replayDurationSeconds', () => {
  it('derives duration from samples.length / sampling_rate_hz', () => {
    expect(replayDurationSeconds({ samples: new Array(1250), sampling_rate_hz: 125 })).toBe(10)
  })
  it('returns 0 for missing data instead of throwing', () => {
    expect(replayDurationSeconds(null)).toBe(0)
    expect(replayDurationSeconds({ samples: [] })).toBe(0)
  })
})

describe('pickRandomSegment (automatic dataset selection)', () => {
  const entries = Array.from({ length: 15 }, (_, i) => ({ file: `seg_${i}.json` }))

  it('varies across attempts when the underlying draw varies', () => {
    const picks = new Set()
    // Simulate 15 independent "attempts" with different rng draws (as real
    // Math.random calls would produce across separate Arm clicks).
    for (let i = 0; i < 15; i++) picks.add(pickRandomSegment(entries, () => i / 15).file)
    expect(picks.size).toBeGreaterThan(1)
  })

  it('is a pure function of its rng draw — repeating the same draw yields the same pick (frozen once made)', () => {
    const rng = () => 0.42
    const first = pickRandomSegment(entries, rng)
    const second = pickRandomSegment(entries, rng)
    expect(first).toBe(second) // same entry object each time given the same draw
  })

  it('picks uniformly (no bias toward any entry / outcome)', () => {
    expect(pickRandomSegment(entries, () => 0)).toBe(entries[0])
    expect(pickRandomSegment(entries, () => 0.999999)).toBe(entries[14])
  })

  it('returns null for an empty or missing list instead of throwing', () => {
    expect(pickRandomSegment([])).toBeNull()
    expect(pickRandomSegment(null)).toBeNull()
  })
})

describe('isValidSegment', () => {
  it('accepts a well-formed segment', () => {
    expect(isValidSegment({ samples: [0.1, 0.2], sampling_rate_hz: 125 })).toBe(true)
  })
  it('rejects empty samples, missing/zero sampling rate, or missing data', () => {
    expect(isValidSegment({ samples: [], sampling_rate_hz: 125 })).toBe(false)
    expect(isValidSegment({ samples: [0.1], sampling_rate_hz: 0 })).toBe(false)
    expect(isValidSegment({ samples: [0.1] })).toBe(false)
    expect(isValidSegment(null)).toBe(false)
  })
})

describe('revealedSampleCount (animated waveform pacing)', () => {
  const segment = { samples: new Array(1250), sampling_rate_hz: 125 }

  it('reveals samples paced at the real sampling rate', () => {
    expect(revealedSampleCount(segment, 1)).toBe(125)
    expect(revealedSampleCount(segment, 5)).toBe(625)
  })

  it('never exceeds the total sample count, even past the real replay duration', () => {
    expect(revealedSampleCount(segment, 999)).toBe(1250)
  })

  it('returns 0 before playback starts', () => {
    expect(revealedSampleCount(segment, 0)).toBe(0)
    expect(revealedSampleCount(segment, -1)).toBe(0)
  })
})

describe('exact waveform/submission consistency', () => {
  it('whatever is displayed is a prefix of the exact same array object sent to the backend', () => {
    const segment = {
      contract_version: '1',
      samples: [0.1, 0.2, 0.3, 0.4, 0.5],
      sampling_rate_hz: 125,
      sample_unit: 'normalized',
      metadata: { source: 'dataset_simulator', synthetic: true, device_id: 'bidmc-subject-01', description: 'seg' },
    }
    const revealCount = revealedSampleCount(segment, 0.016) // ~2 samples in at 125Hz
    const displayed = segment.samples.slice(0, revealCount)
    const payload = buildReplayPayload({ segment, patientId: 'p1', screeningId: 's1' })
    // The full array actually submitted must be the very same array the UI is
    // progressively revealing a prefix of — not a re-sampled/truncated copy.
    expect(payload.samples).toBe(segment.samples)
    expect(payload.samples.slice(0, displayed.length)).toEqual(displayed)
  })
})

describe('cancellation mid-replay', () => {
  it('CANCEL from REPLAYING returns to DISARMED so no submission can follow', () => {
    let s = { phase: REPLAY_PHASE.REPLAYING, cycles: 1 }
    s = reduceReplay(s, { type: 'CANCEL' })
    expect(s.phase).toBe(REPLAY_PHASE.DISARMED)
    // A subsequent FINGER_IN must be ignored until a fresh ARM + FINGER_OUT cycle.
    s = reduceReplay(s, { type: 'FINGER_IN' })
    expect(s.phase).toBe(REPLAY_PHASE.DISARMED)
  })
})
