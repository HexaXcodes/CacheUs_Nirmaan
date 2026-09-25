/**
 * Adaptive Symptom Question Bank
 *
 * Each question has:
 *   id          – unique key
 *   text        – English prompt (ASHA reads this aloud to patient)
 *   type        – 'yn' | 'scale3' | 'choice'
 *   options     – for choice type: array of { label, value }
 *   weight      – contribution to symptom_score (0-1 scale, normalized later)
 *   tags        – which patient groups this question is relevant for
 *   always      – if true, always show regardless of profile
 *
 * Symptom score formula:
 *   raw = Σ (answer_value * question.weight)
 *   normalized = raw / max_possible_raw  → 0.0–1.0
 *
 * "answer_value" for:
 *   yn:      yes=1, no=0
 *   scale3:  never=0, sometimes=0.5, often=1
 *   choice:  each option carries its own value
 */

export const QUESTION_BANK = [

  // ── ALWAYS ASKED (core symptoms) ──────────────────────────────────────────
  {
    id: 'fatigue',
    text: 'Does the patient feel unusually tired or weak most days?',
    type: 'scale3',
    options: [
      { label: 'Rarely / Never', value: 0 },
      { label: 'Sometimes',      value: 0.5 },
      { label: 'Often / Always', value: 1 },
    ],
    weight: 1.2,
    always: true,
    tags: [],
  },
  {
    id: 'thirst',
    text: 'Is the patient frequently very thirsty even after drinking water?',
    type: 'yn',
    weight: 1.4,
    always: true,
    tags: [],
  },
  {
    id: 'frequent_urination',
    text: 'Does the patient urinate much more than usual, especially at night?',
    type: 'yn',
    weight: 1.3,
    always: true,
    tags: [],
  },
  {
    id: 'blurred_vision',
    text: 'Has the patient noticed blurred or worsening vision recently?',
    type: 'yn',
    weight: 1.2,
    always: true,
    tags: [],
  },
  {
    id: 'slow_healing',
    text: 'Do cuts or wounds on the patient heal slowly (more than 2 weeks)?',
    type: 'yn',
    weight: 1.3,
    always: true,
    tags: [],
  },

  // ── FARMER / PHYSICAL WORKER ─────────────────────────────────────────────
  {
    id: 'heat_fatigue',
    text: 'Does the patient feel exhausted much faster than before during outdoor work in heat?',
    type: 'yn',
    weight: 1.0,
    tags: ['farmer', 'physical_worker'],
  },
  {
    id: 'water_intake',
    text: 'How much water does the patient drink during a typical workday?',
    type: 'choice',
    options: [
      { label: 'Less than 1 litre', value: 1   },
      { label: '1–2 litres',        value: 0.5 },
      { label: 'More than 2 litres', value: 0  },
    ],
    weight: 0.8,
    tags: ['farmer', 'physical_worker'],
  },
  {
    id: 'muscle_cramps',
    text: 'Does the patient get muscle cramps or leg pain during or after work?',
    type: 'yn',
    weight: 0.9,
    tags: ['farmer', 'physical_worker'],
  },

  // ── ELDERLY (age >= 55) ───────────────────────────────────────────────────
  {
    id: 'dizziness',
    text: 'Does the patient feel dizzy or lightheaded when standing up quickly?',
    type: 'yn',
    weight: 1.1,
    tags: ['elderly'],
  },
  {
    id: 'falls',
    text: 'Has the patient had any falls or near-falls in the past 3 months?',
    type: 'yn',
    weight: 1.0,
    tags: ['elderly'],
  },
  {
    id: 'memory',
    text: 'Has the family noticed forgetfulness or confusion in the patient recently?',
    type: 'scale3',
    options: [
      { label: 'Not at all', value: 0 },
      { label: 'Occasionally', value: 0.5 },
      { label: 'Frequently', value: 1 },
    ],
    weight: 0.7,
    tags: ['elderly'],
  },
  {
    id: 'appetite_loss',
    text: 'Has the patient\'s appetite decreased noticeably in the last month?',
    type: 'yn',
    weight: 0.8,
    tags: ['elderly'],
  },

  // ── OVERWEIGHT / HIGH WAIST (waist_cm >= 85 female, >= 90 male) ──────────
  {
    id: 'sleep_quality',
    text: 'Does the patient snore loudly or wake up feeling unrefreshed?',
    type: 'yn',
    weight: 0.9,
    tags: ['overweight'],
  },
  {
    id: 'activity_level',
    text: 'How active is the patient on a typical day?',
    type: 'choice',
    options: [
      { label: 'Mostly sitting / no exercise', value: 1   },
      { label: 'Light walking only',            value: 0.5 },
      { label: 'Moderate activity daily',       value: 0  },
    ],
    weight: 1.0,
    tags: ['overweight'],
  },
  {
    id: 'breathlessness',
    text: 'Does the patient get short of breath climbing stairs or walking uphill?',
    type: 'yn',
    weight: 1.0,
    tags: ['overweight'],
  },

  // ── KNOWN HYPERTENSIVE (family or self-reported BP issues) ───────────────
  {
    id: 'headache_frequency',
    text: 'How often does the patient get headaches, especially in the morning?',
    type: 'scale3',
    options: [
      { label: 'Rarely', value: 0 },
      { label: 'Weekly', value: 0.5 },
      { label: 'Daily',  value: 1 },
    ],
    weight: 1.1,
    tags: ['hypertensive', 'family_bp'],
  },
  {
    id: 'bp_medication',
    text: 'Is the patient currently taking blood pressure medication?',
    type: 'yn',
    weight: 0.5, // taking medication is positive adherence
    tags: ['hypertensive'],
    invert: true, // yes = lower risk signal
  },
  {
    id: 'chest_tightness',
    text: 'Does the patient feel tightness or discomfort in the chest at rest?',
    type: 'yn',
    weight: 1.5,
    tags: ['hypertensive', 'family_bp', 'elderly'],
  },
  {
    id: 'palpitations',
    text: 'Does the patient notice irregular heartbeats or a pounding in the chest?',
    type: 'yn',
    weight: 1.2,
    tags: ['hypertensive', 'family_bp'],
  },

  // ── FAMILY HISTORY OF DIABETES ────────────────────────────────────────────
  {
    id: 'sweet_craving',
    text: 'Does the patient have strong cravings for sweet or starchy food?',
    type: 'yn',
    weight: 0.7,
    tags: ['family_diabetes'],
  },
  {
    id: 'tingling',
    text: 'Does the patient feel tingling, numbness, or burning in hands or feet?',
    type: 'yn',
    weight: 1.3,
    tags: ['family_diabetes', 'elderly'],
  },

  // ── POST-OCCUPATION-TRANSITION (e.g., farmer → sedentary) ────────────────
  {
    id: 'diet_change',
    text: 'Has the patient\'s diet changed significantly in the past year (more processed/street food)?',
    type: 'yn',
    weight: 0.9,
    tags: ['occupation_transition'],
  },
  {
    id: 'weight_gain',
    text: 'Has the patient gained noticeable weight in the past year without trying?',
    type: 'yn',
    weight: 1.0,
    tags: ['occupation_transition', 'overweight'],
  },

  // ── MEDICATION ADHERENCE (known condition) ────────────────────────────────
  {
    id: 'medication_missed',
    text: 'In the past week, did the patient miss any prescribed medications?',
    type: 'choice',
    options: [
      { label: 'No, took all doses',      value: 0   },
      { label: 'Missed 1–2 doses',        value: 0.5 },
      { label: 'Missed most / all doses', value: 1   },
    ],
    weight: 1.1,
    tags: ['known_condition'],
  },

  // ── FEMALE-SPECIFIC ────────────────────────────────────────────────────────
  {
    id: 'gestational_history',
    text: 'Did the patient have diabetes or high blood pressure during any pregnancy?',
    type: 'yn',
    weight: 1.2,
    tags: ['female'],
  },

]

// ── Adaptive selection engine ─────────────────────────────────────────────
/**
 * selectQuestions(patient) → array of question objects
 *
 * patient = {
 *   age, sex, waist_cm, family_history_flag, occupation_transition_flag,
 *   preferred_lang, last_tier, last_risk_score
 * }
 */
export function selectQuestions(patient = {}) {
  const {
    age = 0,
    sex = '',
    waist_cm = 0,
    family_history_flag = false,
    occupation_transition_flag = false,
    last_tier = null,
  } = patient

  // Derive tags
  const activeTags = new Set()

  if (age >= 55)                          activeTags.add('elderly')
  if (age >= 35 && age < 55)              activeTags.add('middle_aged')

  const isOverweight =
    (sex === 'female' && waist_cm >= 85) ||
    (sex !== 'female' && waist_cm >= 90)
  if (isOverweight)                       activeTags.add('overweight')

  if (family_history_flag)                activeTags.add('family_diabetes')
  if (occupation_transition_flag)         activeTags.add('occupation_transition')

  if (last_tier === 'AMBER' || last_tier === 'RED') activeTags.add('known_condition')
  if (last_tier === 'RED')                activeTags.add('hypertensive')

  // Infer occupation from missing data (heuristic for rural ASHA context)
  // In future: add `occupation` field to patient profile
  activeTags.add('farmer') // default rural assumption; override if available

  if (sex === 'female')                   activeTags.add('female')

  // Select: always-asked + tag-matched (deduplicated)
  const selected = QUESTION_BANK.filter(q =>
    q.always || q.tags.some(t => activeTags.has(t))
  )

  // Cap at 10 questions for ASHA workflow (respects their time)
  return selected.slice(0, 10)
}

/**
 * computeSymptomScore(answers, questions) → float 0.0–1.0
 *
 * answers = { question_id: answer_value }
 */
export function computeSymptomScore(answers = {}, questions = []) {
  let raw = 0
  let maxRaw = 0

  questions.forEach(q => {
    const val = answers[q.id]
    if (val === undefined || val === null) return
    const numVal = Number(val)
    const contribution = q.invert ? (1 - numVal) : numVal
    raw    += contribution * q.weight
    maxRaw += q.weight
  })

  if (maxRaw === 0) return 0
  return Math.min(raw / maxRaw, 1.0)
}
