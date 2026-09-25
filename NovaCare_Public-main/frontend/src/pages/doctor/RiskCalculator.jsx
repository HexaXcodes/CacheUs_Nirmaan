import { useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { useLang } from '../../context/LanguageContext'
import client from '../../api/client'
import Navbar from '../../components/layout/Navbar'
import RiskCard from '../../components/ui/RiskCard'
import Button from '../../components/ui/Button'
import FormSelect from '../../components/forms/FormSelect'

const LANG_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
]

export default function RiskCalculator() {
  const { toast } = useToast()
  const { lang } = useLang()

  const [form, setForm] = useState({
    idrs_score: 30,
    voice_score: 0.5,
    rppg_hrv_flag: false,
    waist_cm: 85,
    family_history: false,
    occupation_transition: false,
    lang: lang,
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const handleCompute = async () => {
    setLoading(true)
    try {
      const res = await client.post('/risk/compute', {
        idrs_score: form.idrs_score,
        voice_score: form.voice_score,
        rppg_hrv_flag: form.rppg_hrv_flag,
        waist_cm: form.waist_cm,
        family_history: form.family_history,
        occupation_transition: form.occupation_transition,
        lang: form.lang,
      })
      setResult(res.data)
      toast('Risk computed!', 'success')
    } catch (err) {
      toast(err.response?.data?.detail || 'Risk computation failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const Toggle = ({ field, label }) => (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm font-medium text-hud-ink2">{label}</span>
      <button
        type="button"
        onClick={() => set(field, !form[field])}
        className={`relative w-12 h-6 rounded-full transition-colors ${form[field] ? 'bg-nova' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-hud-surface rounded-full shadow transition-transform ${form[field] ? 'translate-x-6' : ''}`} />
      </button>
    </div>
  )

  const SliderRow = ({ field, label, min, max, step = 1, unit = '' }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-semibold text-hud-ink2">{label}</label>
        <span className="text-nova font-bold">
          {typeof form[field] === 'number' ? (step < 1 ? form[field].toFixed(2) : Math.round(form[field])) : form[field]}
          {unit && <span className="text-hud-ink3 font-normal text-xs ml-0.5">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={form[field]}
        onChange={e => set(field, step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
        className="w-full accent-nova"
      />
      <div className="flex justify-between text-xs text-hud-ink3">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-hud-bg">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-hud-ink"> Risk Calculator</h1>
          <p className="text-hud-ink3 text-sm mt-1">Compute diabetes risk from individual factors</p>
        </div>

        <div className="bg-hud-surface rounded-none shadow-none p-6 space-y-6">
          {/* Sliders */}
          <div className="space-y-5">
            <SliderRow field="idrs_score" label="IDRS Score" min={0} max={100} unit="/100" />
            <SliderRow field="voice_score" label="Voice Stress Score" min={0} max={1} step={0.01} />
            <SliderRow field="waist_cm" label="Waist Circumference" min={50} max={150} unit="cm" />
          </div>

          {/* Toggles */}
          <div className="border-t border-gray-100 pt-4 divide-y divide-gray-100">
            <Toggle field="rppg_hrv_flag" label="Elevated HRV Flag (rPPG)" />
            <Toggle field="family_history" label="Family History of Diabetes" />
            <Toggle field="occupation_transition" label="Occupation Transition (sedentary shift)" />
          </div>

          {/* Language */}
          <FormSelect
            label="Report Language"
            options={LANG_OPTIONS}
            value={form.lang}
            onChange={e => set('lang', e.target.value)}
          />

          <Button
            onClick={handleCompute}
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full"
          >
            Compute Risk
          </Button>
        </div>

        {/* Result */}
        {result && (
          <div className="space-y-4">
            <RiskCard
              tier={result.risk_tier || result.tier}
              score={result.risk_score || result.score}
              headline={result.headline}
              explanation={result.explanation || result.summary}
              action={result.action || result.recommendation}
            />

            {/* Component breakdown table */}
            {result.components && (
              <div className="bg-hud-surface rounded-none shadow-none overflow-hidden">
                <div className="px-5 py-4 border-b">
                  <h3 className="font-bold text-gray-800">Score Breakdown</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-hud-bg text-left">
                      <th className="px-5 py-3 font-semibold text-hud-ink2 text-xs uppercase">Factor</th>
                      <th className="px-5 py-3 font-semibold text-hud-ink2 text-xs uppercase text-right">Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.entries(result.components).map(([key, val]) => {
                      const numVal = typeof val === 'number' ? val : 0
                      return (
                        <tr key={key}>
                          <td className="px-5 py-3 text-hud-ink2 capitalize">{key.replace(/_/g, ' ')}</td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 h-2 bg-hud-bg2 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-nova rounded-full"
                                  style={{ width: `${Math.min(100, Math.abs(numVal) * 100)}%` }}
                                />
                              </div>
                              <span className="font-semibold text-hud-ink2 w-12 text-right">
                                {typeof val === 'number' ? val.toFixed(2) : val}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
