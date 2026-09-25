import { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useT } from '../../i18n/useT'
import { getPatientHistory } from '../../api/patients'
import Skeleton from '../../components/ui/Skeleton'

import insightActions from '../../assets/insight-actions.png'
import insightDiet from '../../assets/insight-diet.png'
import insightTrends from '../../assets/insight-trends.png'
import insightFaq from '../../assets/insight-faq.png'
import insightBalance from '../../assets/insight-balance.png'

// ── Helpers ──────────────────────────────────────────────────────
function tierBadgeColor(tier) {
  if (!tier) return 'text-gray-400'
  const u = tier.toUpperCase()
  if (u === 'RED') return 'text-red-500'
  if (u === 'AMBER') return 'text-amber-500'
  return 'text-green-500'
}

// Build data-driven, layman-friendly story slides from real session data
function buildStoryDecks(latest, t) {
  const tier   = latest?.tier?.toUpperCase() || 'GREEN'
  const score  = latest?.composite_score != null ? Math.round(latest.composite_score) : null
  const hr     = latest?.rppg_detail?.hr_bpm != null ? Math.round(latest.rppg_detail.hr_bpm) : null
  const rmssd  = latest?.rppg_detail?.rmssd != null ? Math.round(latest.rppg_detail.rmssd) : null
  const hrvFlag = latest?.rppg_detail?.hrv_flag ?? false
  const voice  = latest?.voice_score != null ? Math.round(latest.voice_score * 100) : null
  const idrs   = latest?.idrs_score != null ? latest.idrs_score : null

  // Tier-aware action messages
  const tierMsg = {
    RED:   'Your last screening shows HIGH diabetes risk. Please see a doctor soon.',
    AMBER: 'Your risk is MODERATE. Small daily changes can bring it down — see the tips below.',
    GREEN: 'Great news — your risk score is LOW. Keep up your healthy habits!',
  }[tier] || 'Your health data is up to date.'

  const hrMsg = hr != null
    ? (hr < 60
        ? `Your heart rate was ${hr} bpm — slightly slow. Stay hydrated and avoid sudden exertion.`
        : hr > 100
        ? `Your heart rate was ${hr} bpm — a bit fast. Rest, breathe slowly, and check with your ASHA worker.`
        : `Your heart rate was ${hr} bpm — right in the healthy range (60–100 bpm). That's a good sign!`)
    : 'No heart rate data yet. Complete a fingertip pulse scan during your next screening.'

  const hrvMsg = rmssd != null
    ? (hrvFlag
        ? `Your heart rate variability (RMSSD ${rmssd} ms) is low. This can be caused by stress, poor sleep, or dehydration. Try to rest more.`
        : `Your heart rate variability (RMSSD ${rmssd} ms) looks healthy! This means your heart is adapting well to activity and rest.`)
    : 'HRV data not available from the last scan.'

  const voiceMsg = voice != null
    ? (voice >= 70
        ? `Your voice scan detected stress markers (score ${voice}/100). Try slow breathing exercises — inhale 4 seconds, exhale 6 seconds.`
        : voice >= 40
        ? `Voice stress score was ${voice}/100 — moderate. Good hydration and rest help reduce vocal stress.`
        : `Voice stress score was ${voice}/100 — low. Your voice patterns suggest you are managing stress well.`)
    : 'No voice scan data yet. A 30-second voice recording helps detect early stress patterns.'

  const idrsMsg = idrs != null
    ? (idrs >= 60
        ? `Your IDRS score is ${idrs}/100 — HIGH. This score combines age, waist size, activity, and family history. Please act on the dietary advice.`
        : idrs >= 30
        ? `Your IDRS score is ${idrs}/100 — MODERATE. Cutting down on refined carbohydrates and increasing daily walks can reduce this.`
        : `Your IDRS score is ${idrs}/100 — LOW. Your lifestyle markers look good. Keep maintaining regular physical activity.`)
    : 'IDRS questionnaire data not available. Ask your ASHA worker to complete the next screening.'

  const scoreMsg = score != null
    ? `Your composite health score is ${score}/100. ${score >= 70 ? 'This means elevated risk — please follow up with your doctor.' : score >= 40 ? 'This is a moderate score. Focus on diet and activity this week.' : 'This is a good score. Keep monitoring regularly.'}`
    : 'Composite score will appear after your first full screening session.'

  return [
    {
      id: 'daily-actions',
      title: t('deck_actions_title'),
      indicator: 'ACTN',
      thumbnail: insightActions,
      slides: [
        {
          id: 'da-1',
          visual: 'from-[#FFF7ED] via-[#FED7AA] to-[#FDBA74]',
          heading: 'Your Risk Today',
          bodyText: tierMsg,
          interaction: null,
        },
        {
          id: 'da-2',
          visual: 'from-[#FED7AA] via-[#FDBA74] to-[#F97316]',
          heading: 'Morning Medication',
          bodyText: tier === 'RED' || tier === 'AMBER'
            ? 'Have you taken your prescribed medications today? Skipping doses can raise blood sugar levels quickly.'
            : 'Stay consistent with any supplements your doctor has recommended. Prevention is easier than treatment.',
          interaction: { type: 'split-button', label: 'RESPOND' },
        },
      ],
    },
    {
      id: 'local-diet',
      title: t('deck_diet_title'),
      indicator: 'DIET',
      thumbnail: insightDiet,
      slides: [
        {
          id: 'ld-1',
          visual: 'from-[#FDF2F8] via-[#FBCFE8] to-[#F9A8D4]',
          heading: 'Smarter Carb Choices',
          bodyText: idrs != null && idrs >= 30
            ? `Your IDRS score (${idrs}) suggests high carb intake may be a factor. Try swapping white rice for Ragi Mudde or jowar roti — these release sugar more slowly and keep you full longer.`
            : 'Choose whole grains like Ragi, Jowar, or Bajra instead of refined rice or maida. They have more fibre and keep blood sugar stable throughout the day.',
          interaction: null,
        },
        {
          id: 'ld-2',
          visual: 'from-[#FBCFE8] via-[#F9A8D4] to-[#EC4899]',
          heading: 'Hydration & Blood Sugar',
          bodyText: 'Drinking 2–3 litres of water daily helps your kidneys flush excess sugar. Avoid sugary drinks and packaged juices — they spike blood sugar within minutes. Plain water or buttermilk are ideal.',
          interaction: null,
        },
      ],
    },
    {
      id: 'telemetry-trends',
      title: t('deck_trends_title'),
      indicator: 'TRND',
      thumbnail: insightTrends,
      slides: [
        {
          id: 'tt-1',
          visual: 'from-[#F0F9FF] via-[#BAE6FD] to-[#7DD3FC]',
          heading: 'Your Heart Rate',
          bodyText: hrMsg,
          interaction: null,
        },
        {
          id: 'tt-2',
          visual: 'from-[#BAE6FD] via-[#7DD3FC] to-[#38BDF8]',
          heading: 'Heart Rate Variability',
          bodyText: hrvMsg,
          interaction: null,
        },
        {
          id: 'tt-3',
          visual: 'from-[#E0F2FE] via-[#BAE6FD] to-[#38BDF8]',
          heading: 'Overall Health Score',
          bodyText: scoreMsg,
          interaction: null,
        },
      ],
    },
    {
      id: 'symptom-qa',
      title: t('deck_symptoms_title'),
      indicator: 'Q&A',
      thumbnail: insightFaq,
      slides: [
        {
          id: 'sq-1',
          visual: 'from-[#F5F3FF] via-[#DDD6FE] to-[#C7D2FE]',
          heading: 'Voice Stress Scan',
          bodyText: voiceMsg,
          interaction: null,
        },
        {
          id: 'sq-2',
          visual: 'from-[#DDD6FE] via-[#C7D2FE] to-[#A5B4FC]',
          heading: 'Feeling Dizzy or Tired?',
          bodyText: 'Dizziness after meals can be a sign of blood sugar spikes. Fatigue in the afternoon often points to poor carbohydrate balance. Record symptoms when they occur and share with your ASHA worker.',
          interaction: { type: 'split-button', label: 'RESPOND' },
        },
      ],
    },
    {
      id: 'lifestyle-balance',
      title: t('deck_lifestyle_title'),
      indicator: 'BALN',
      thumbnail: insightBalance,
      slides: [
        {
          id: 'lb-1',
          visual: 'from-[#F0FDF4] via-[#BBF7D0] to-[#86EFAC]',
          heading: 'IDRS Score Explained',
          bodyText: idrsMsg,
          interaction: null,
        },
        {
          id: 'lb-2',
          visual: 'from-[#BBF7D0] via-[#86EFAC] to-[#4ADE80]',
          heading: 'Sleep & Heart Health',
          bodyText: 'Poor sleep raises cortisol (stress hormone) which increases blood sugar. Aim for 7–8 hours of uninterrupted sleep. Avoid screens 30 minutes before bed. Consistent sleep times help regulate insulin sensitivity.',
          interaction: null,
        },
      ],
    },
  ]
}

// ── PreviewGrid ───────────────────────────────────────────────────
function PreviewGrid({ storyDecks, onSelectDeck }) {
  return (
    <div className="flex gap-6 overflow-x-auto pb-4 pt-1 px-1 scrollbar-thin snap-x snap-mandatory scroll-smooth w-full">
      {storyDecks.map(deck => (
        <div
          key={deck.id}
          onClick={() => onSelectDeck(deck)}
          className="nc-glass bg-[#FFFFFF]/80 border border-hud-line/80 relative min-h-[220px] min-w-[280px] md:min-w-[300px] flex-1 max-w-[340px] rounded-none cursor-pointer overflow-hidden group hover:border-hud-cyan transition-all duration-300 shadow-hud flex flex-col justify-end p-5 nc-tile snap-start shrink-0"
        >
          <div
            style={{ backgroundImage: `url(${deck.thumbnail})` }}
            className="absolute inset-0 bg-cover bg-center opacity-75 z-0 transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent z-10" />
          <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-hud-cyan/40 group-hover:border-hud-cyan" />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-hud-cyan/40 group-hover:border-hud-cyan" />
          <div className="relative z-20 space-y-1 select-none pointer-events-none">
            <span className="mono text-[8.5px] bg-hud-cyan/15 text-hud-cyan border border-hud-cyan/35 px-2 py-0.5 tracking-widest font-black uppercase">
              {deck.indicator}
            </span>
            <h3 className="font-mono text-sm font-black text-hud-ink uppercase tracking-widest pt-2 group-hover:text-hud-cyanB transition-colors">
              {deck.title}
            </h3>
            <p className="mono text-[9px] text-hud-muted tracking-widest pt-1">
              &gt; {deck.slides.length} SLIDES DETECTED
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── StoryModal ────────────────────────────────────────────────────
function StoryModal({ activeDeck, onClose }) {
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const slides = activeDeck.slides
  const currentSlide = slides[currentSlideIdx]
  const totalSlides = slides.length
  const slideDuration = 6000 // 6 seconds per slide (longer for reading)

  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(() => setElapsedTime(prev => prev + 50), 50)
    return () => clearInterval(timer)
  }, [isPaused])

  useEffect(() => {
    if (elapsedTime >= slideDuration) {
      if (currentSlideIdx < totalSlides - 1) {
        setCurrentSlideIdx(idx => idx + 1)
        setElapsedTime(0)
      } else {
        onClose()
      }
    }
  }, [elapsedTime, currentSlideIdx, totalSlides, onClose, slideDuration])

  const nextSlide = () => {
    if (currentSlideIdx < totalSlides - 1) { setCurrentSlideIdx(i => i + 1); setElapsedTime(0) }
    else onClose()
  }
  const prevSlide = () => {
    if (currentSlideIdx > 0) { setCurrentSlideIdx(i => i - 1); setElapsedTime(0) }
    else setElapsedTime(0)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex justify-center items-center backdrop-blur-md p-4 animate-fade select-none">
      <div className="w-full max-w-md h-full max-h-[850px] relative overflow-hidden nc-glass bg-white border border-hud-line flex flex-col justify-between rounded-lg shadow-2xl">
        <div className={`absolute inset-0 bg-gradient-to-b ${currentSlide.visual} opacity-95 z-0`} />
        <div className="absolute inset-0 bg-black/[0.04] z-0" />

        {/* Progress bars */}
        <div className="absolute top-4 left-4 right-4 z-30 flex gap-1.5">
          {slides.map((_, idx) => {
            const w = idx < currentSlideIdx ? 100 : idx === currentSlideIdx ? (elapsedTime / slideDuration) * 100 : 0
            return (
              <div key={idx} className="flex-1 h-1 bg-slate-900/15 overflow-hidden rounded-none">
                <div style={{ width: `${w}%` }} className="h-full bg-slate-900 transition-all duration-[50ms] ease-linear" />
              </div>
            )
          })}
        </div>

        {/* Header */}
        <div className="relative z-30 flex justify-between items-center pt-8 px-5">
          <div className="flex items-center gap-2.5">
            <span className="mono text-[8px] bg-slate-900/10 text-slate-900 border border-slate-900/25 px-1.5 tracking-widest font-black uppercase">
              {activeDeck.indicator}
            </span>
            <span className="mono text-xs text-slate-900 font-bold tracking-wider">{activeDeck.title}</span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 border border-slate-800/40 hover:border-slate-900 text-slate-700 hover:text-slate-900 flex items-center justify-center font-bold text-xs rounded-none bg-white/40 backdrop-blur-xs transition-all"
          >✕</button>
        </div>

        {/* Body — click zones */}
        <div className="relative flex-1 flex flex-col justify-center items-center px-8 text-center select-none z-10">
          <div onClick={prevSlide} onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)}
            onMouseLeave={() => setIsPaused(false)} onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)}
            className="absolute left-0 top-0 bottom-0 w-[30%] z-20 cursor-pointer" />
          <div onClick={nextSlide} onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)}
            onMouseLeave={() => setIsPaused(false)} onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)}
            className="absolute right-0 top-0 bottom-0 w-[70%] z-20 cursor-pointer" />

          <div className="space-y-4 relative z-10 pointer-events-none px-2 max-w-sm">
            <h2 className="font-mono text-2xl font-black text-slate-900 uppercase tracking-wider leading-tight">
              {currentSlide.heading}
            </h2>
            {/* Body text uses normal case and longer line height for readability */}
            <p className="font-sans text-sm text-slate-700 leading-relaxed tracking-normal normal-case">
              {currentSlide.bodyText}
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="relative z-30 p-6 flex flex-col items-center justify-center">
          {currentSlide.interaction ? (
            <div onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)} className="w-full flex justify-center gap-2">
              {currentSlide.interaction.type === 'button' ? (
                <button onClick={nextSlide}
                  className="nc-cta w-full py-4 text-center font-mono text-sm font-black tracking-widest uppercase bg-hud-cyan text-[#000814] border border-hud-cyanB hover:shadow-glow transition-all rounded-none">
                  {currentSlide.interaction.label}
                </button>
              ) : currentSlide.interaction.type === 'split-button' ? (
                <div className="flex gap-3 w-full">
                  <button onClick={nextSlide}
                    className="nc-cta flex-1 py-3.5 text-center font-mono text-xs font-black tracking-widest uppercase bg-hud-cyan text-[#000814] border border-hud-cyanB hover:shadow-glow transition-all rounded-none">
                    YES
                  </button>
                  <button onClick={nextSlide}
                    className="flex-1 py-3.5 text-center font-mono text-xs font-black tracking-widest uppercase border border-tier-red text-tier-red bg-tier-red/5 hover:bg-tier-red/15 transition-all rounded-none">
                    NO
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <span className="mono text-[8px] text-slate-500 tracking-widest uppercase select-none pointer-events-none">
              TAP SIDES OR HOLD TO PAUSE
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Primary PatientDashboard ──────────────────────────────────────
export default function PatientDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const t = useT()

  const outletContext = useOutletContext()
  const patient = outletContext?.patient
  const layoutLoading = outletContext?.loading

  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [activeDeck, setActiveDeck] = useState(null)

  const patientId = user?.patient_id
  const patientName = patient?.name || user?.name || 'PRIYA S.'

  useEffect(() => {
    if (!patientId) { setHistoryLoading(false); return }
    getPatientHistory(patientId)
      .then(res => setHistory(res.data?.sessions || res.data || []))
      .catch(() => toast('Failed to load health history', 'error'))
      .finally(() => setHistoryLoading(false))
  }, [patientId])

  const latest = history[0]
  const lastDate = latest?.created_at
    ? new Date(latest.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const tier = latest?.tier?.toUpperCase()

  // Live vitals from last rPPG scan (or placeholder)
  const liveHr  = latest?.rppg_detail?.hr_bpm ?? 72
  const liveO2  = 98  // not yet from sensor; placeholder
  const liveGlu = patient?.last_glucose ?? 142

  const vitals = [
    {
      label: 'HR',
      value: Math.round(liveHr),
      unit: 'bpm',
      status: liveHr > 100 ? 'HI' : liveHr < 55 ? 'LO' : 'OK',
      color: liveHr > 100 || liveHr < 55
        ? 'text-tier-amber border-tier-amber/25 bg-tier-amber/5'
        : 'text-[#15803D] border-[#15803D]/25 bg-[#15803D]/5',
      tip: liveHr > 100 ? 'Resting heart rate above 100 — try slow breathing'
        : liveHr < 55 ? 'Heart rate below 55 — stay hydrated'
        : 'Resting heart rate is healthy (60–100 bpm)',
    },
    {
      label: 'GLU',
      value: liveGlu,
      unit: 'mg/dL',
      status: liveGlu > 125 ? 'HI' : liveGlu < 70 ? 'LO' : 'OK',
      color: liveGlu > 125 || liveGlu < 70
        ? 'text-tier-amber border-tier-amber/25 bg-tier-amber/5'
        : 'text-[#15803D] border-[#15803D]/25 bg-[#15803D]/5',
      tip: liveGlu > 125 ? 'Fasting blood sugar above 125 — reduce refined carbs'
        : liveGlu < 70 ? 'Blood sugar is low — eat a small snack'
        : 'Blood sugar is in the normal fasting range (<126 mg/dL)',
    },
    {
      label: 'O₂',
      value: liveO2,
      unit: '%',
      status: liveO2 < 94 ? 'LO' : 'OK',
      color: liveO2 < 94
        ? 'text-tier-red border-tier-red/25 bg-tier-red/5'
        : 'text-[#15803D] border-[#15803D]/25 bg-[#15803D]/5',
      tip: liveO2 < 94 ? 'SpO₂ below 94% — seek medical attention'
        : 'Blood oxygen level is normal (≥94%)',
    },
  ]

  const ecgPath =
    'M 0,80 L 40,80 Q 48,70 56,80 L 66,80 L 70,92 L 78,20 L 86,140 L 94,80 Q 108,65 122,80 L 180,80 L 220,80 Q 228,70 236,80 L 246,80 L 250,92 L 258,20 L 266,140 L 274,80 Q 288,65 302,80 L 360,80'

  const storyDecks = buildStoryDecks(latest, t)

  return (
    <div className="px-4 py-6 space-y-6 max-w-5xl mx-auto relative">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ecg-draw-animation { 0%{stroke-dashoffset:1000} 100%{stroke-dashoffset:0} }
        .ecg-foreground-path { stroke-dasharray:1000; stroke-dashoffset:1000; animation:ecg-draw-animation 3s linear infinite; }
        @keyframes pulse-sync { 0%,100%{opacity:.4;box-shadow:0 0 4px rgba(16,240,160,.4)} 50%{opacity:1;box-shadow:0 0 12px rgba(16,240,160,1)} }
        .pulse-sync-glow { animation:pulse-sync 1.8s ease-in-out infinite; }
      `}} />

      {/* Status header */}
      <div className="flex flex-col space-y-3 relative">
        <div className="flex justify-between items-center text-[10px] tracking-widest font-bold">
          <span className="mono text-hud-cyan select-none">&lt; PTNT-01 :: AUTHENTICATED</span>
          <div className="flex items-center gap-2 select-none">
            <span className="mono text-[#15803D]">SYNC ACTIVE</span>
            <span className="w-1.5 h-1.5 bg-[#15803D] shadow-[0_0_8px_#15803D] rounded-none animate-blink" />
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-hud-line/80 p-5 relative select-none">
          <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-hud-cyan/40" />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-hud-cyan/40" />
          <span className="font-mono text-[9px] text-hud-ink3 tracking-widest uppercase block mb-1">NODE ACCESS SYSTEM</span>
          <h2 className="font-sans text-xs text-hud-muted tracking-wider uppercase font-bold leading-none">Patient Portal</h2>
          {layoutLoading
            ? <Skeleton className="h-9 w-48 mt-2.5 bg-hud-surface2" />
            : <h1 className="font-mono text-3xl font-black text-hud-ink tracking-wider mt-2.5 uppercase text-glow">{patientName}</h1>}
          <p className="text-[10px] text-hud-ink3 mt-2 font-mono tracking-widest leading-none">
            {lastDate ? t('dash_last_screened', lastDate.toUpperCase()) : t('dash_no_screening').toUpperCase()}
          </p>
          {/* Risk tier badge */}
          {tier && (
            <span className={`mt-2 inline-block mono text-[9px] font-black border px-2 py-0.5 tracking-widest ${
              tier === 'RED' ? 'border-red-500/40 text-red-400 bg-red-500/5'
              : tier === 'AMBER' ? 'border-amber-500/40 text-amber-400 bg-amber-500/5'
              : 'border-green-500/40 text-green-400 bg-green-500/5'
            }`}>
              RISK: {tier}
            </span>
          )}
        </div>
      </div>

      {/* Live Vitals Panel */}
      <div className="nc-glass nc-tile bg-[#FFFFFF]/85 border-2 border-hud-cyan/80 p-5 relative overflow-hidden shadow-hud-lg rounded-none group select-none">
        <span className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-hud-cyan" />
        <span className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-hud-cyan" />
        <span className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-hud-cyan" />
        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-hud-cyan" />
        <div className="absolute inset-0 bg-[#2563EB]/5 pointer-events-none" />

        <div className="flex justify-between items-center border-b border-hud-line/75 pb-3.5 relative z-10">
          <span className="font-mono text-[10px] text-hud-cyan font-black tracking-widest">{t('dash_live_vitals')}</span>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-tier-red shadow-[0_0_6px_#B91C1C] rounded-none animate-ping" />
            <span className="font-mono text-[9px] text-hud-ink3 font-bold tracking-widest">{t('dash_streaming')}</span>
          </div>
        </div>

        {/* ECG oscilloscope */}
        <div className="relative h-40 bg-[#F5F9FF]/95 border border-hud-line/60 my-4 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.04)_1px,transparent_1px)] bg-[size:16px_16px]" />
          <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-hud-cyan/15" />
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-hud-cyan/15" />
          <div className="absolute top-3 right-3 bg-[#F5F9FF]/90 border border-hud-cyan px-2.5 py-1 flex items-center gap-1.5 z-20">
            <span className="w-1.5 h-1.5 bg-[#15803D] shadow-[0_0_6px_#15803D] rounded-none animate-pulse" />
            <span className="mono text-[10px] text-hud-cyan font-black leading-none">
              HR <span className="text-hud-ink text-xs font-black">{Math.round(liveHr)}</span> bpm
            </span>
          </div>
          <svg viewBox="0 0 366 160" width="100%" height="100%" preserveAspectRatio="none" className="absolute inset-0 z-10">
            <defs>
              <linearGradient id="ecg-glow-gradient" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.1" />
                <stop offset="50%" stopColor="#153E75" stopOpacity="1" />
                <stop offset="100%" stopColor="#2563EB" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <path d={ecgPath} fill="none" stroke="#DCE6F2" strokeWidth="1.5" strokeDasharray="4 6" className="opacity-45" />
            <path d={ecgPath} fill="none" stroke="url(#ecg-glow-gradient)" strokeWidth="2.5"
              className="ecg-foreground-path" style={{ filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.85))' }} />
            <circle r="4" fill="#153E75" style={{ filter: 'drop-shadow(0 0 8px #153E75)' }}>
              <animateMotion dur="3s" repeatCount="indefinite" path={ecgPath} />
            </circle>
          </svg>
        </div>

        {/* Metrics footer with layman tooltips */}
        <div className="grid grid-cols-3 gap-3 pt-3.5 border-t border-dashed border-hud-line/60 relative z-10">
          {vitals.map(metric => (
            <div key={metric.label} className="border border-hud-line/45 bg-[#F5F9FF]/85 p-2.5 relative group/metric cursor-help" title={metric.tip}>
              <div className="flex justify-between items-center leading-none">
                <span className="mono text-[9px] text-hud-ink3 uppercase font-bold">{metric.label}</span>
                <span className={`mono text-[7px] border font-bold px-1 uppercase ${metric.color}`}>{metric.status}</span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1">
                <span className="mono text-sm font-black text-hud-ink tracking-wider">{metric.value}</span>
                <span className="mono text-[8px] text-hud-ink3 uppercase">{metric.unit}</span>
              </div>
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-0 mb-1 hidden group-hover/metric:block z-50 bg-[#FFFFFF] border border-hud-cyan/40 text-[9px] text-hud-ink3 p-2 w-48 leading-relaxed pointer-events-none shadow-hud">
                {metric.tip}
              </div>
            </div>
          ))}
        </div>

        {/* Last scan note */}
        {latest && (
          <p className="mt-3 text-[9px] text-hud-ink3 font-mono tracking-wider">
            ↑ Values from last screening session · {lastDate}
          </p>
        )}
      </div>

      {/* Story Decks */}
      <div className="space-y-3.5 relative z-10">
        <div className="flex items-center gap-3 px-1 select-none">
          <span className="mono text-hud-cyan text-[10px]">[01]</span>
          <h2 className="mono font-bold text-hud-ink text-[10px] tracking-widest uppercase">
            {t('dash_insights_header')}
          </h2>
          <div className="flex-1 h-[1px] bg-hud-line/50" />
        </div>
        <PreviewGrid storyDecks={storyDecks} onSelectDeck={(deck) => {
          setActiveDeck(deck)
          toast(`Opening ${deck.title}…`, 'info')
        }} />
      </div>

      {activeDeck && (
        <StoryModal activeDeck={activeDeck} onClose={() => {
          setActiveDeck(null)
          toast('Story closed', 'info')
        }} />
      )}
    </div>
  )
}
