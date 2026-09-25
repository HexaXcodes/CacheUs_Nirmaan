import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import Navbar from '../../../components/layout/Navbar'
import Step0Intake from './Step0Intake'
import Step1Session from './Step1Session'
import Step2IDRS from './Step2IDRS'
import Step3Voice from './Step3Voice'
import Step4RPPG from './Step4RPPG'
import Step5Result from './Step5Result'
import Step6Report from './Step6Report'

const STEPS = ['INTAKE', 'SESSION', 'IDRS', 'VOICE', 'RPPG', 'RESULTS', 'REPORT']

function NCProgress({ step, total }) {
  return (
    <div className="px-4 py-3 bg-hud-bg border-b border-hud-line2/60">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs text-hud-cyan tracking-widest uppercase">
          STEP {String(step + 1).padStart(2, '0')} / {String(total).padStart(2, '0')} — {STEPS[step]}
        </span>
        <span className="font-mono text-xs text-hud-ink3">{Math.round(((step + 1) / total) * 100)}%</span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="flex-1 h-1.5 transition-all duration-300"
            style={{
              background: i <= step ? '#2563EB' : '#DCE6F2',
              boxShadow: i <= step ? '0 0 8px #2563EB' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default function ScreeningWizard() {
  const { patientId } = useParams()
  const [searchParams] = useSearchParams()
  const qPatientId = searchParams.get('patient_id')
  const effectivePatientId = patientId || qPatientId

  const [currentStep, setCurrentStep] = useState(0)
  const [sessionId, setSessionId] = useState(null)
  const [resolvedPatientId, setResolvedPatientId] = useState(effectivePatientId)
  const [wizardData, setWizardData] = useState({})

  const handleNext = (data = {}) => {
    setWizardData(prev => ({ ...prev, ...data }))
    if (data.sessionId) setSessionId(data.sessionId)
    if (data.patient?.patient_id) setResolvedPatientId(data.patient.patient_id)
    setCurrentStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  return (
    <div className="min-h-screen bg-hud-bg hud-grid">
      <Navbar />
      <div className="max-w-xl mx-auto">
        {/* Progress bar */}
        <NCProgress step={currentStep} total={STEPS.length} />

        {/* Header strip */}
        <div className="border-b border-hud-line2/40 bg-hud-surface px-4 py-2 flex items-center justify-between">
          <span className="font-mono text-xs text-hud-ink3 tracking-widest uppercase">
            AW // DIABETES SCREENING PROTOCOL
          </span>
          <div className="flex items-center gap-2">
            <span className="status-dot bg-tier-green" />
            <span className="font-mono text-xs text-tier-green">LIVE</span>
          </div>
        </div>

        {/* Step content */}
        <div className="hud-panel m-4 p-6 relative">
          <span className="hud-bracket-tr" />
          <span className="hud-bracket-bl" />

          {currentStep === 0 && <Step0Intake onNext={handleNext} />}
          {currentStep === 1 && <Step1Session patientId={effectivePatientId} onNext={handleNext} />}
          {currentStep === 2 && sessionId && (
            <Step2IDRS
              sessionId={sessionId}
              patient={wizardData.intakePatient || wizardData.patient}
              intakeFlags={wizardData.intakeFlags}
              onNext={handleNext}
            />
          )}
          {currentStep === 3 && sessionId && <Step3Voice sessionId={sessionId} onNext={handleNext} />}
          {currentStep === 4 && sessionId && <Step4RPPG sessionId={sessionId} onNext={handleNext} />}
          {currentStep === 5 && sessionId && <Step5Result sessionId={sessionId} onNext={handleNext} />}
          {currentStep === 6 && sessionId && <Step6Report sessionId={sessionId} patientId={resolvedPatientId} />}

          {currentStep > 1 && !sessionId && (
            <div className="text-center py-10 space-y-4">
              <p className="font-mono text-sm text-hud-ink3 uppercase tracking-widest">No active session</p>
              <button onClick={() => setCurrentStep(1)}
                className="font-mono text-xs text-hud-cyan hover:text-hud-cyanB uppercase tracking-widest">
                &lt; BACK TO SESSION SETUP
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
