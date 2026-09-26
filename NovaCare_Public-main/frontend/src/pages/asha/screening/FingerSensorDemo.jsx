import { useState } from 'react'
import { useCopy } from '../../../i18n/nirmaan'
import UnoPpgReplay from '../../../components/ppg/UnoPpgReplay'
import { Reading } from '../../patient/Measurements'

/**
 * ASHA-only finger-trigger PPG demo screen. Deliberately skips the
 * camera/AR-guided flow used by patient self-measurement (see
 * pages/patient/ARMeasurement.jsx) — this screen goes straight from the
 * saved questionnaire to the Uno finger sensor demo. patient_id and
 * screeningId are threaded through unchanged.
 */
export default function FingerSensorDemo({ patientId, screeningId, onExit }) {
  const t = useCopy()
  const [result, setResult] = useState(null)
  return (
    <section className="nc-card nc-stack nc-screening-panel">
      <span className="nc-eyebrow">2 · {t('Finger PPG')}</span>
      <h2>{t('Finger sensor demo')}</h2>
      {!result && <UnoPpgReplay patientId={patientId} screeningId={screeningId} onResult={setResult} />}
      {result && (
        <section aria-live="polite" className="nc-stack">
          <p className="inline-block self-start rounded-full border border-hud-line/70 px-2 py-px font-mono text-[10px] uppercase tracking-wide text-hud-ink3">
            {t('Demo replay — not live patient data.')}
          </p>
          <span className="nc-eyebrow">{result.status === 'rejected' ? t('Measurement rejected') : t('Reading saved')}</span>
          <Reading row={result} />
          <div className="nc-actions">
            <button className="nc-secondary" onClick={() => setResult(null)}>{t('Try another reading')}</button>
            <button className="nc-primary" onClick={onExit}>{t('Done →')}</button>
          </div>
        </section>
      )}
    </section>
  )
}
