/**
 * Reported-concerns explainer for the ASHA 10-question intake
 * (see frontend/src/pages/asha/screening/Step0Intake.jsx for the
 * authoritative question text/options, and
 * Backend/app/services/screening_priority.py for the baseline values
 * used to decide what counts as "reported" vs a non-concerning baseline).
 *
 * IMPORTANT — this module must only ever read questionnaire ANSWERS.
 * It must never accept or read a measurement/PPG/heart-rate value. That
 * is enforced by the function signature below (it takes `answers` only)
 * and is asserted by screeningConcerns.test.js.
 *
 * Nothing here computes a diagnosis, a disease probability, a severity
 * score, or a validated clinical risk category. Messages use cautious
 * wording ("may warrant assessment for...") and explicitly note that
 * these ten questions are nonspecific screening prompts, not diagnostic
 * criteria.
 *
 * Clinical framing sources relied on for the cautious language below
 * (documented here rather than invented at review time):
 *  - Polyuria (frequent urination) and slow/non-healing wounds are
 *    listed as reasons to consider diabetes screening by WHO's
 *    "Classification of diabetes mellitus" (2019):
 *    https://www.who.int/publications/i/item/classification-of-diabetes-mellitus
 *    — they are nonspecific on their own and require further
 *    assessment, not a diagnosis.
 *  - Dark, velvety skin patches on the neck/armpits (acanthosis
 *    nigricans, when clinically examined and confirmed) are described
 *    as a recognised cutaneous sign associated with insulin resistance
 *    and diabetes by NCBI/StatPearls, "Acanthosis Nigricans":
 *    https://www.ncbi.nlm.nih.gov/sites/books/NBK431057/
 *    IMPORTANT: this questionnaire only captures a patient's own
 *    self-report of a symptom in plain language ("dark patches on my
 *    neck") — it is not a clinical skin exam, and a self-report must
 *    never be treated or worded as a confirmed diagnosis of acanthosis
 *    nigricans. The copy below is written to reflect that.
 *  - Headache, dizziness on standing, and breathlessness/chest
 *    tightness on exertion are nonspecific symptoms that standard
 *    hypertension screening guidance, e.g. the WHO HEARTS technical
 *    package for CVD management in primary health care:
 *    https://www.who.int/publications/i/item/9789240001367
 *    lists as reasons to check blood pressure with a proper cuff
 *    device — they do not themselves indicate hypertension.
 * No numeric thresholds (e.g. "normal BP is X/Y") are asserted anywhere
 * in this module; only the presence of a reported concern is described.
 */

// Baseline ("nothing to flag") answer for each question id — mirrors
// Backend/app/services/screening_priority.py SYMPTOM_BASELINES so the
// doctor UI and the backend review-ordering never disagree about what
// counts as a reported concern. `water` and `salt` are lifestyle/habit
// questions and are intentionally excluded from concern-flagging here,
// matching the backend policy (only listed keys are inspected).
export const SYMPTOM_BASELINES = {
  urination: '4-6',
  headache: 'no',
  dizziness: 'no',
  fatigue: 'rarely',
  vision: 'no',
  wounds: 'no',
  neck_patches: 'no',
  breathlessness: 'no',
}

// Cautious, sourced explanation text per question id. Never names a
// disease as confirmed; always "may warrant assessment for...".
const CONCERN_COPY = {
  urination: 'Patient reports urinating more than the reference range on this questionnaire — this is nonspecific, but frequent urination is a reason clinical guidance suggests considering further assessment for diabetes. Clarify duration and consider follow-up.',
  headache: 'Patient reports frequent headaches — a nonspecific symptom; standard blood-pressure screening guidance treats frequent headache as a reason to check BP with a cuff device, not as evidence of high blood pressure by itself.',
  dizziness: 'Patient reports dizziness on standing quickly (postural dizziness) — nonspecific, but worth a cuff BP check and asking about fainting or falls.',
  fatigue: 'Patient reports persistent tiredness without a clear physical cause — nonspecific; consider it alongside other findings rather than in isolation.',
  vision: 'Patient reports blurred or hazy vision — nonspecific; if persistent, an eye check and diabetes risk assessment may be warranted.',
  wounds: 'Patient reports slow-healing cuts or wounds — a nonspecific but recognised prompt to consider diabetes screening; clarify how long healing is taking.',
  neck_patches: 'Patient self-reports dark, velvety skin patches on the neck or armpits — a self-reported symptom, not a clinical exam finding or a diagnosis of acanthosis nigricans. If confirmed on examination, such patches are a recognised sign associated with insulin resistance and may warrant diabetes risk assessment.',
  breathlessness: 'Patient reports breathlessness or chest tightness during light activity — nonspecific; a cuff BP check and further assessment of exertional symptoms is reasonable.',
}

/**
 * buildReportedConcerns(answers) → array of {
 *   id, reported: boolean, notReported: boolean, answerValue, message
 * }
 *
 * `answers` is the raw ScreeningAnswers object as saved by the ASHA
 * intake (see Backend/app/schemas/measurement.py ScreeningAnswers).
 * A field that is absent/undefined is "not reported" and is NEVER
 * treated as a negative/baseline answer — it produces no concern and
 * is called out separately so a doctor can tell the difference between
 * "patient said no" and "this was never asked/answered".
 */
export function buildReportedConcerns(answers = {}) {
  return Object.entries(SYMPTOM_BASELINES).map(([id, baseline]) => {
    const value = answers[id]
    const notReported = value === undefined || value === null
    const reported = !notReported && value !== baseline
    return {
      id,
      notReported,
      reported,
      answerValue: notReported ? null : value,
      message: reported ? CONCERN_COPY[id] : null,
    }
  })
}

/** Convenience: just the flagged-for-review subset, in question order. */
export function reportedConcernMessages(answers = {}) {
  return buildReportedConcerns(answers).filter(c => c.reported)
}
