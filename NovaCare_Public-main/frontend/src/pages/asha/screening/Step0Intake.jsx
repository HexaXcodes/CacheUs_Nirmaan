/**
 * Pre-screening intake — 10 symptom-based questions covering
 * prediabetes and hypertension risk markers.
 *
 * Each option is color-coded: green = healthy, yellow = borderline, red = concern.
 * Outputs via onNext: intakeAnswers, intakeFlags, intakeRiskScore
 */
import { useState } from 'react'
import Button from '../../../components/ui/Button'

// ── Color config ──────────────────────────────────────────────────────────────
const COLORS = {
  green:  { bg: 'bg-green-50',  border: 'border-green-400',  text: 'text-green-700',  dot: 'bg-green-500'  },
  yellow: { bg: 'bg-amber-50',  border: 'border-amber-400',  text: 'text-amber-700',  dot: 'bg-amber-400'  },
  red:    { bg: 'bg-red-50',    border: 'border-red-400',    text: 'text-red-700',    dot: 'bg-red-500'    },
}

const UNSELECTED = 'border-hud-line2/50 bg-hud-surface text-hud-ink2 hover:border-nova/60 hover:bg-nova/5'
const SELECTED_NEUTRAL = 'border-nova bg-nova/10 text-nova font-semibold'

// ── Questions ─────────────────────────────────────────────────────────────────
// Each option has: value, label, color (green/yellow/red), score (0=ok, 1=borderline, 2=concern)

export const QUESTIONS = [
  {
    id: 'water',
    label: 'How much water does the patient drink per day?',
    category: 'prediabetes',
    options: [
      { value: '>2L',   label: '> 2 litres',  color: 'green',  score: 0, sub: 'Well hydrated' },
      { value: '1-2L',  label: '1 – 2 litres', color: 'yellow', score: 1, sub: 'Borderline' },
      { value: '<1L',   label: '< 1 litre',   color: 'red',    score: 2, sub: 'Low — may indicate dehydration or excessive loss' },
    ],
  },
  {
    id: 'urination',
    label: 'How many times does the patient urinate per day?',
    category: 'prediabetes',
    options: [
      { value: '4-6',  label: '4 – 6 times',  color: 'green',  score: 0, sub: 'Normal range' },
      { value: '7-9',  label: '7 – 9 times',  color: 'yellow', score: 1, sub: 'Slightly elevated' },
      { value: '>9',   label: 'More than 9',  color: 'red',    score: 2, sub: 'Frequent — key sign of high blood sugar' },
    ],
  },
  {
    id: 'headache',
    label: 'Does the patient get frequent headaches?',
    category: 'hypertension',
    options: [
      { value: 'no',        label: 'No',              color: 'green',  score: 0 },
      { value: 'sometimes', label: 'Sometimes',        color: 'yellow', score: 1 },
      { value: 'yes',       label: 'Yes, often',       color: 'red',    score: 2, sub: 'Common in high blood pressure' },
    ],
  },
  {
    id: 'dizziness',
    label: 'Does the patient feel dizzy when standing up quickly?',
    category: 'hypertension',
    options: [
      { value: 'no',  label: 'No',        color: 'green',  score: 0 },
      { value: 'yes', label: 'Yes',        color: 'red',    score: 2, sub: 'Postural dizziness — linked to BP changes' },
    ],
  },
  {
    id: 'fatigue',
    label: 'How often does the patient feel unusually tired without physical reason?',
    category: 'prediabetes',
    options: [
      { value: 'rarely',    label: 'Rarely or never',   color: 'green',  score: 0 },
      { value: 'sometimes', label: 'A few times a week', color: 'yellow', score: 1 },
      { value: 'daily',     label: 'Daily',              color: 'red',    score: 2, sub: 'Persistent fatigue — early diabetes/BP sign' },
    ],
  },
  {
    id: 'vision',
    label: 'Does the patient notice blurred or hazy vision?',
    category: 'prediabetes',
    options: [
      { value: 'no',         label: 'No',             color: 'green',  score: 0 },
      { value: 'occasional', label: 'Occasionally',    color: 'yellow', score: 1 },
      { value: 'often',      label: 'Often',           color: 'red',    score: 2, sub: 'Blurred vision is an early diabetes warning' },
    ],
  },
  {
    id: 'salt',
    label: 'How much extra salt does the patient add to food?',
    category: 'hypertension',
    options: [
      { value: 'none',     label: 'None or very little', color: 'green',  score: 0 },
      { value: 'moderate', label: 'Moderate',             color: 'yellow', score: 1 },
      { value: 'heavy',    label: 'A lot',                color: 'red',    score: 2, sub: 'Excess salt directly raises blood pressure' },
    ],
  },
  {
    id: 'wounds',
    label: 'Do cuts or wounds take longer than usual to heal?',
    category: 'prediabetes',
    options: [
      { value: 'no',  label: 'No — heals normally', color: 'green', score: 0 },
      { value: 'yes', label: 'Yes — slow healing',  color: 'red',   score: 2, sub: 'Slow wound healing is a classic diabetes marker' },
    ],
  },
  {
    id: 'neck_patches',
    label: 'Any dark, velvety skin patches on the neck or armpits?',
    category: 'prediabetes',
    options: [
      { value: 'no',  label: 'No',  color: 'green', score: 0 },
      { value: 'yes', label: 'Yes', color: 'red',   score: 2, sub: 'Acanthosis nigricans — strong prediabetes indicator' },
    ],
  },
  {
    id: 'breathlessness',
    label: 'Does the patient feel chest tightness or breathlessness during light activity (e.g. climbing stairs)?',
    category: 'hypertension',
    options: [
      { value: 'no',        label: 'No',          color: 'green',  score: 0 },
      { value: 'sometimes', label: 'Sometimes',    color: 'yellow', score: 1 },
      { value: 'yes',       label: 'Yes, often',   color: 'red',    score: 2, sub: 'May indicate elevated blood pressure or heart strain' },
    ],
  },
]

// ── Risk summary ──────────────────────────────────────────────────────────────

function computeRisk(answers) {
  let total = 0
  let max = 0
  QUESTIONS.forEach(q => {
    const opt = q.options.find(o => o.value === answers[q.id])
    if (opt) total += opt.score
    max += Math.max(...q.options.map(o => o.score))
  })
  const pct = max > 0 ? Math.round((total / max) * 100) : 0
  return { total, max, pct }
}

function RiskMeter({ answers }) {
  const answeredCount = QUESTIONS.filter(q => answers[q.id] !== undefined).length
  if (answeredCount < 3) return null

  const { pct } = computeRisk(answers)
  const { label, barColor, textColor } =
    pct >= 60 ? { label: 'High Concern', barColor: 'bg-red-500',   textColor: 'text-red-600'   } :
    pct >= 30 ? { label: 'Moderate',     barColor: 'bg-amber-400', textColor: 'text-amber-700' } :
                { label: 'Low Concern',  barColor: 'bg-green-500', textColor: 'text-green-700' }

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-semibold">
        <span className="text-hud-ink3">Symptom Risk Meter</span>
        <span className={textColor}>{label} ({pct}%)</span>
      </div>
      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Step0Intake({ onNext }) {
  const [answers, setAnswers] = useState({})
  const [current, setCurrent] = useState(0)

  const q = QUESTIONS[current]
  const allAnswered = QUESTIONS.every(q => answers[q.id] !== undefined)
  const answeredCount = QUESTIONS.filter(q => answers[q.id] !== undefined).length

  const selectOption = (id, value) => {
    setAnswers(prev => ({ ...prev, [id]: value }))
    setTimeout(() => {
      if (current < QUESTIONS.length - 1) setCurrent(c => c + 1)
    }, 220)
  }

  const handleSubmit = () => {
    const { pct } = computeRisk(answers)
    const flags = {
      prediabetes_risk: ['water', 'urination', 'fatigue', 'vision', 'wounds', 'neck_patches']
        .filter(id => answers[id] && QUESTIONS.find(q => q.id === id)?.options.find(o => o.value === answers[id])?.score > 0).length,
      hypertension_risk: ['headache', 'dizziness', 'salt', 'breathlessness']
        .filter(id => answers[id] && QUESTIONS.find(q => q.id === id)?.options.find(o => o.value === answers[id])?.score > 0).length,
      symptom_score_pct: pct,
    }
    onNext({ intakeAnswers: answers, intakeFlags: flags })
  }

  const currentOpt = q ? answers[q.id] : null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-hud-ink">Pre-Screening Assessment</h2>
        <p className="text-hud-ink3 text-sm mt-1">
          10 symptom questions for prediabetes and hypertension risk. Answer honestly — no right or wrong.
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 flex-wrap items-center">
        {QUESTIONS.map((qItem, i) => {
          const ans = answers[qItem.id]
          const opt = ans ? qItem.options.find(o => o.value === ans) : null
          const dotColor = !opt ? 'bg-hud-bg border-hud-line2/40 text-hud-ink3' :
            opt.color === 'green'  ? 'bg-green-500 border-green-500 text-white' :
            opt.color === 'yellow' ? 'bg-amber-400 border-amber-400 text-white' :
                                     'bg-red-500 border-red-500 text-white'
          return (
            <button key={i} onClick={() => setCurrent(i)}
              className={`w-6 h-6 rounded-full text-[10px] font-bold border transition-all
                ${i === current ? 'ring-2 ring-nova ring-offset-1' : ''}
                ${dotColor}`}>
              {i + 1}
            </button>
          )
        })}
        <span className="ml-auto text-[10px] text-hud-ink3 font-mono">{answeredCount}/{QUESTIONS.length}</span>
      </div>

      {/* Risk meter */}
      <RiskMeter answers={answers} />

      {/* Category tag */}
      <div className="flex items-center gap-2">
        <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded-none border uppercase
          ${q?.category === 'prediabetes'
            ? 'text-orange-600 border-orange-300 bg-orange-50'
            : 'text-blue-600 border-blue-300 bg-blue-50'
          }`}>
          {q?.category === 'prediabetes' ? 'Prediabetes' : 'Hypertension'}
        </span>
        <span className="font-mono text-[10px] text-hud-ink3">Q{current + 1} of {QUESTIONS.length}</span>
      </div>

      {/* Question card */}
      <div className="bg-hud-bg border border-hud-line2/40 rounded-none p-5 space-y-4 min-h-[200px]">
        <h3 className="text-base font-bold text-hud-ink leading-snug">{q?.label}</h3>

        <div className="space-y-2.5">
          {q?.options.map(opt => {
            const isSelected = currentOpt === opt.value
            const c = COLORS[opt.color]
            return (
              <button
                key={opt.value}
                onClick={() => selectOption(q.id, opt.value)}
                className={`w-full text-left px-4 py-3 border-2 rounded-none transition-all flex items-start gap-3
                  ${isSelected ? `${c.bg} ${c.border} ${c.text} font-semibold` : UNSELECTED}`}
              >
                {/* Color dot */}
                <span className={`mt-0.5 w-3 h-3 rounded-full shrink-0 ${isSelected ? c.dot : 'bg-gray-300'}`} />
                <span className="flex-1">
                  <span className="text-sm font-semibold block">{opt.label}</span>
                  {opt.sub && <span className={`text-[11px] block mt-0.5 ${isSelected ? c.text : 'text-hud-ink3'}`}>{opt.sub}</span>}
                </span>
                {/* Color label badge */}
                {isSelected && (
                  <span className={`text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-none border ${c.border} ${c.text} ${c.bg} shrink-0`}>
                    {opt.color === 'green' ? 'GOOD' : opt.color === 'yellow' ? 'WATCH' : 'RISK'}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button onClick={() => setCurrent(c => Math.max(0, c - 1))} variant="ghost" disabled={current === 0} className="px-5">
          ← Back
        </Button>

        {current < QUESTIONS.length - 1 ? (
          <Button onClick={() => setCurrent(c => c + 1)} variant="outline" disabled={!currentOpt} className="flex-1">
            Next →
          </Button>
        ) : (
          <Button onClick={handleSubmit} variant="primary" size="lg" disabled={!allAnswered} className="flex-1">
            Start Screening →
          </Button>
        )}
      </div>

      {/* Answered summary strip */}
      {answeredCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {QUESTIONS.map(qItem => {
            const ans = answers[qItem.id]
            if (!ans) return null
            const opt = qItem.options.find(o => o.value === ans)
            if (!opt) return null
            const c = COLORS[opt.color]
            return (
              <button key={qItem.id} onClick={() => setCurrent(QUESTIONS.findIndex(q => q.id === qItem.id))}
                className={`text-[10px] px-2 py-0.5 border rounded-full ${c.bg} ${c.border} ${c.text} font-semibold`}>
                Q{QUESTIONS.findIndex(q => q.id === qItem.id) + 1}: {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
