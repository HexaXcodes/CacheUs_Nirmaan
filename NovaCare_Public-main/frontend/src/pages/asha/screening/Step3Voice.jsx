import { useState } from 'react'
import { useToast } from '../../../context/ToastContext'
import { useT } from '../../../i18n/useT'
import { useLang } from '../../../context/LanguageContext'
import { analyzeVoice } from '../../../api/ai'
import { submitVoice } from '../../../api/sessions'
import AudioRecorder from '../../../components/media/AudioRecorder'
import Button from '../../../components/ui/Button'
import Spinner from '../../../components/ui/Spinner'

const READING_PASSAGE = {
  en: `Today I woke up feeling a little tired. I had a simple breakfast of rice and dal. Then I walked to the market to buy vegetables. The weather outside was warm and sunny. My legs felt heavy after the walk. I drank some water and rested for a while. In the evening, my family sat together and talked. I felt happy being with them. I hope I feel better tomorrow. Good health is very important to me and my family.`,
  hi: `आज मैं थोड़ा थका हुआ उठा। मैंने चावल और दाल का सादा नाश्ता किया। फिर मैं सब्जी लेने बाजार गया। बाहर मौसम गर्म और धूप वाला था। चलने के बाद मेरे पैर भारी लगे। मैंने पानी पिया और थोड़ी देर आराम किया। शाम को मेरा परिवार एक साथ बैठा और बातें कीं। उनके साथ रहकर मुझे खुशी हुई। मुझे उम्मीद है कि कल मैं बेहतर महसूस करूंगा। मेरे और मेरे परिवार के लिए अच्छा स्वास्थ्य बहुत जरूरी है।`,
  kn: `ಇಂದು ನಾನು ಸ್ವಲ್ಪ ದಣಿದ ಭಾವನೆಯಿಂದ ಎದ್ದೆ. ನಾನು ಅನ್ನ ಮತ್ತು ಬೇಳೆ ತಿಂದೆ. ನಂತರ ತರಕಾರಿ ತರಲು ಮಾರುಕಟ್ಟೆಗೆ ನಡೆದೆ. ಹೊರಗೆ ಬಿಸಿಲು ಮತ್ತು ಬೆಚ್ಚಗಿತ್ತು. ನಡೆದ ನಂತರ ಕಾಲುಗಳು ಭಾರವಾದವು. ನೀರು ಕುಡಿದು ಸ್ವಲ್ಪ ಹೊತ್ತು ವಿಶ್ರಾಂತಿ ತೆಗೆದುಕೊಂಡೆ. ಸಂಜೆ ನನ್ನ ಕುಟುಂಬ ಒಟ್ಟಿಗೆ ಕುಳಿತು ಮಾತನಾಡಿದರು. ಅವರೊಂದಿಗೆ ಇರುವುದು ಸಂತೋಷ ಕೊಟ್ಟಿತು. ನಾಳೆ ಚೆನ್ನಾಗಿರುತ್ತೇನೆ ಎಂದು ಆಶಿಸುತ್ತೇನೆ. ಒಳ್ಳೆಯ ಆರೋಗ್ಯ ನನಗೆ ಮತ್ತು ನನ್ನ ಕುಟುಂಬಕ್ಕೆ ಬಹಳ ಮುಖ್ಯ.`,
  ta: `இன்று நான் சிறிது சோர்வாக எழுந்தேன். சாதம் மற்றும் பருப்பு சாப்பிட்டேன். பிறகு காய்கறி வாங்க கடைக்கு நடந்தேன். வெளியே வெயில் அதிகமாக இருந்தது. நடந்த பிறகு கால்கள் கனமாக இருந்தன. தண்ணீர் குடித்து சிறிது நேரம் ஓய்வு எடுத்தேன். மாலையில் என் குடும்பத்தினர் ஒன்றாக அமர்ந்து பேசினோம். அவர்களுடன் இருப்பது மகிழ்ச்சியாக இருந்தது. நாளை நலமாக இருப்பேன் என நம்புகிறேன். நல்ல உடல்நலம் எனக்கும் என் குடும்பத்திற்கும் மிகவும் முக்கியம்.`,
  te: `ఈరోజు నేను కొంచెం అలసటగా లేచాను. అన్నం మరియు పప్పు తిన్నాను. తర్వాత కూరగాయలు కొనడానికి మార్కెట్‌కు నడిచాను. బయట వేడిగా మరియు ఎండగా ఉంది. నడిచిన తర్వాత కాళ్ళు భారంగా అనిపించాయి. నీళ్ళు తాగి కొంత సేపు విశ్రాంతి తీసుకున్నాను. సాయంత్రం నా కుటుంబం కలిసి కూర్చుని మాట్లాడారు. వారితో ఉండటం సంతోషంగా అనిపించింది. రేపు బాగుంటానని ఆశిస్తున్నాను. మంచి ఆరోగ్యం నాకు మరియు నా కుటుంబానికి చాలా ముఖ్యమైనది.`,
}

// Extract the most useful error message from an axios error response.
function extractError(err, fallback) {
  return (
    err.response?.data?.error ||
    err.response?.data?.detail ||
    err.message ||
    fallback
  )
}

const riskColor = (lvl) => {
  const l = (lvl || '').toLowerCase()
  if (l === 'high') return 'text-red-600'
  if (l === 'medium' || l === 'moderate') return 'text-amber-600'
  return 'text-green-600'
}

export default function Step3Voice({ sessionId, onNext }) {
  const { toast } = useToast()
  const t = useT()
  const { lang } = useLang()

  const [blob, setBlob] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [analysisError, setAnalysisError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleAnalyze = async () => {
    if (!blob) { toast(t('voice_no_recording'), 'warning'); return }
    setAnalyzing(true)
    setAnalysisError(null)
    try {
      const aiRes = await analyzeVoice(blob)
      setResult(aiRes.data)
      toast(t('voice_success'), 'success')
    } catch (err) {
      const msg = extractError(err, t('voice_fail'))
      setAnalysisError(msg)
      toast(msg, 'error')
    } finally {
      setAnalyzing(false)
    }
  }

  // Detect fallback response: service couldn't decode audio (e.g. no ffmpeg),
  // returned neutral defaults. Treat as no-signal (submit 0) so it doesn't
  // add phantom stress contribution to the composite score.
  const isFallback = result &&
    result.confidence_score != null && result.confidence_score <= 0.4 &&
    (!result.top_features || result.top_features.length === 0)

  const handleNext = async () => {
    setSubmitting(true)
    try {
      if (result) {
        await submitVoice(sessionId, {
          voice_score: isFallback ? 0 : (result.stress_score ?? 0),
        })
      }
      onNext({ voiceResult: result })
    } catch (err) {
      toast(extractError(err, t('voice_save_fail')), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-hud-ink">{t('voice_title')}</h2>
        <p className="text-hud-ink3 text-sm mt-1">{t('voice_subtitle')}</p>
      </div>

      <div className="bg-hud-surface border border-hud-cyan/30 rounded-none p-4 space-y-2">
        <p className="text-[10px] font-mono text-hud-cyan uppercase tracking-widest font-bold">
          Ask the patient to read this aloud:
        </p>
        <p className="text-hud-ink text-sm leading-relaxed">
          {READING_PASSAGE[lang] || READING_PASSAGE.en}
        </p>
      </div>

      <AudioRecorder onResult={setBlob} disabled={analyzing} />

      {blob && !result && !analyzing && (
        <Button onClick={handleAnalyze} variant="primary" size="lg" className="w-full">
          {t('voice_analyze_btn')}
        </Button>
      )}

      {analyzing && (
        <div className="flex flex-col items-center gap-3 py-6">
          <Spinner size="lg" />
          <p className="text-hud-ink2 font-medium">{t('voice_analyzing')}</p>
          <p className="text-hud-ink3 text-sm">{t('voice_analyzing_sub')}</p>
        </div>
      )}

      {analysisError && !analyzing && (
        <div className="bg-red-50 border border-red-200 rounded-none p-3 text-sm text-red-700 space-y-2">
          <p className="font-semibold">⚠ Analysis error</p>
          <p>{analysisError}</p>
          <Button onClick={handleAnalyze} variant="outline" size="sm" disabled={!blob}>
            Retry
          </Button>
        </div>
      )}

      {result && isFallback && (
        <div className="bg-amber-50 border border-amber-300 rounded-none p-4 text-sm text-amber-800 space-y-1">
          <p className="font-bold">Voice analysis unavailable</p>
          <p className="text-xs">
            The server could not decode the audio (ffmpeg not installed).
            This step will be skipped — it will not affect your screening result.
          </p>
          <p className="text-xs font-mono text-amber-600 mt-1">
            Fix: run <strong>conda install -c conda-forge ffmpeg</strong> on the AI service machine and restart.
          </p>
        </div>
      )}

      {result && !isFallback && (
        <div className="bg-hud-bg rounded-none p-5 space-y-4 border border-hud-line2/40">
          <h3 className="font-bold text-gray-800">{t('voice_result_title')}</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-hud-surface rounded-none p-4 border">
              <p className="text-xs text-hud-ink3 mb-1">{t('voice_stress_label')}</p>
              <p className="text-2xl font-black text-nova">
                {result.stress_score != null
                  ? (Math.round(result.stress_score * 100) / 100).toFixed(2)
                  : '—'}
              </p>
            </div>
            <div className="bg-hud-surface rounded-none p-4 border">
              <p className="text-xs text-hud-ink3 mb-1">{t('voice_risk_label')}</p>
              <p className={`text-2xl font-black uppercase ${riskColor(result.risk_level)}`}>
                {result.risk_level || '—'}
              </p>
            </div>
          </div>

          {result.confidence_score != null && (
            <div className="flex items-center gap-2 text-sm text-hud-ink3">
              <span>{t('voice_confidence_label')}:</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-nova rounded-full"
                  style={{ width: `${Math.round(result.confidence_score * 100)}%` }}
                />
              </div>
              <span className="font-semibold text-hud-ink2">
                {Math.round(result.confidence_score * 100)}%
              </span>
            </div>
          )}

          {result.explanation && (
            <div className="bg-blue-50 border border-blue-100 rounded-none p-3 text-sm text-blue-800">
              <p className="font-semibold mb-1">{t('voice_explanation_label')}</p>
              <p>{result.explanation}</p>
            </div>
          )}

          {result.top_features?.length > 0 && (
            <div className="text-xs text-hud-ink3 space-y-1">
              <p className="font-semibold text-hud-ink2">Key signals detected:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {result.top_features.slice(0, 4).map((f, i) => (
                  <li key={i}>{typeof f === 'string' ? f : JSON.stringify(f)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={() => onNext({ voiceResult: null })}
          variant="ghost"
          className="flex-1"
          disabled={analyzing || submitting}
        >
          {t('voice_skip')}
        </Button>
        <Button
          onClick={handleNext}
          variant="primary"
          className="flex-2"
          loading={submitting}
          disabled={analyzing}
        >
          {result ? t('voice_save_continue') : t('voice_continue_without')} →
        </Button>
      </div>
    </div>
  )
}
