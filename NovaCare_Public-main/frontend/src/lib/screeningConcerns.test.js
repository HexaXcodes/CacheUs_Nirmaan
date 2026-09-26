import { describe, it, expect } from 'vitest'
import { buildReportedConcerns, reportedConcernMessages, SYMPTOM_BASELINES } from './screeningConcerns'

describe('buildReportedConcerns', () => {
  it('treats a missing answer as "not reported", never as the negative/baseline answer', () => {
    const rows = buildReportedConcerns({}) // nothing answered
    expect(rows).toHaveLength(Object.keys(SYMPTOM_BASELINES).length)
    rows.forEach(r => {
      expect(r.notReported).toBe(true)
      expect(r.reported).toBe(false)
      expect(r.message).toBeNull()
    })
  })

  it('does not crash on partial answers and only flags concerns for answered, non-baseline fields', () => {
    const answers = { urination: '>9', headache: 'no' } // urination flagged, headache baseline, rest unanswered
    const rows = buildReportedConcerns(answers)
    const urination = rows.find(r => r.id === 'urination')
    const headache = rows.find(r => r.id === 'headache')
    const dizziness = rows.find(r => r.id === 'dizziness')

    expect(urination.reported).toBe(true)
    expect(urination.notReported).toBe(false)
    expect(urination.message).toMatch(/frequent urination|urinating/i)

    expect(headache.reported).toBe(false)
    expect(headache.notReported).toBe(false) // explicitly answered "no"

    expect(dizziness.notReported).toBe(true)
    expect(dizziness.reported).toBe(false)
  })

  it('flags an explicit negative answer as reported=false but notReported=false (distinct states)', () => {
    const rows = buildReportedConcerns({ wounds: 'no' })
    const wounds = rows.find(r => r.id === 'wounds')
    expect(wounds.notReported).toBe(false)
    expect(wounds.reported).toBe(false)
  })

  it('never invents a diagnosis, severity score, or risk category in message text', () => {
    const answers = { neck_patches: 'yes', urination: '>9', breathlessness: 'yes' }
    const messages = reportedConcernMessages(answers).map(c => c.message).join(' ')
    // Cautious wording only; must not assert the patient HAS a disease.
    expect(messages).not.toMatch(/patient has diabetes/i)
    expect(messages).not.toMatch(/patient has hypertension/i)
    expect(messages).not.toMatch(/diagnosed with/i)
    expect(messages).toMatch(/may warrant|consider|assessment|nonspecific/i)
  })

  it('only ever reads questionnaire answers — the function signature accepts no measurement/PPG argument', () => {
    // buildReportedConcerns takes `answers` (with a default), and nothing else;
    // passing measurement-shaped data as a second argument must have zero effect
    // on the output, proving the concerns logic cannot be influenced by
    // heart-rate/BP/replay values.
    const answers = { headache: 'yes' }
    const withoutMeasurement = buildReportedConcerns(answers)
    const withMeasurementIgnored = buildReportedConcerns(answers, {
      analysis: { heart_rate_bpm: 180, experimental_bp: { systolic: 200, diastolic: 120 } },
    })
    expect(withMeasurementIgnored).toEqual(withoutMeasurement)
  })
})
