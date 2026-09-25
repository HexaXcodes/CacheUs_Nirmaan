import {useCopy} from '../../i18n/nirmaan'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { saveMeasurement, measurementHistory, measurementTrends } from '../../api/measurements'
import Button from '../../components/ui/Button'
import TrendChart from '../../components/TrendChart'

const fixturesEnabled = import.meta.env.DEV && import.meta.env.VITE_PPG_FIXTURES === 'true'

const inputClass = 'w-full bg-[#0f1a24] border border-hud-dim text-hud-text font-mono text-xs px-3 py-2 focus:outline-none focus:border-hud-cyan transition-all placeholder:text-hud-dim rounded-none'
const selectClass = 'w-full bg-[#0f1a24] border border-hud-dim text-hud-cyan font-mono text-xs px-3 py-2 focus:outline-none focus:border-hud-cyan cursor-pointer rounded-none'
const labelClass = 'block text-[10px] text-hud-ink3 uppercase tracking-widest mb-1'

const KIND_LABEL = { bp_reference: 'Reference BP', glucose: 'Glucose', ppg: 'PPG analysis' }

function StatusBadge({ status }) { const t=useCopy()
  const styles = {
    accepted: 'border-tier-green text-tier-green bg-tier-green/10',
    recorded: 'border-hud-cyan text-hud-cyan bg-hud-cyan/10',
    rejected: 'border-tier-red text-tier-red bg-tier-red/10',
  }
  return <span className={`inline-block border font-mono text-[9px] font-black px-2 py-0.5 tracking-widest uppercase ${styles[status] || styles.recorded}`}>
    {t(status)}
  </span>
}

export function Reading({ row }) { const t=useCopy()
  const a = row.analysis
  const isSimulated = row.mock || row.metadata?.synthetic || row.metadata?.source === 'dataset_simulator'
  return (
    <div className="bg-[#101c27] border border-hud-line/60 p-4 relative">
      <span className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-hud-cyan/70" />
      <span className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-hud-cyan/70" />

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <span className="font-mono text-xs font-black text-hud-ink uppercase tracking-widest">
            {t(KIND_LABEL[row.kind] || row.kind)}
          </span>
          <p className="text-[10px] text-hud-ink3 font-mono mt-0.5">
            {new Date(row.recorded_at).toLocaleString()} · {{manual_reference:'Reference device',dataset_simulator:'Simulator',physical_sensor:'Physical sensor'}[row.metadata?.source] || row.metadata?.source} · {row.metadata?.device_id}
          </p>
        </div>
        {a && <StatusBadge status={row.status} />}
      </div>

      {isSimulated && (
        <p className="mt-2 text-[10px] font-mono font-bold uppercase tracking-wider text-tier-amber bg-tier-amber/10 border border-tier-amber/30 px-2 py-1 inline-block">
          {t('Simulated data')}{row.mock ? ' — mock UI result' : ''} · {row.metadata?.description}
        </p>
      )}

      {row.kind === 'bp_reference' && (
        <p className="mt-3 font-mono text-lg font-black text-hud-ink">{row.systolic}/{row.diastolic} <span className="text-xs text-hud-ink3 font-normal">mmHg</span></p>
      )}
      {row.kind === 'glucose' && (
        <p className="mt-3 font-mono text-lg font-black text-hud-ink">{row.value} <span className="text-xs text-hud-ink3 font-normal">{row.unit} · {row.context}</span></p>
      )}

      {a && (
        <div className="mt-3 space-y-2 font-mono text-xs">
          <p className="text-hud-ink2">
            {t('Signal quality')}: <span className="text-hud-ink font-bold">{Math.round(a.quality_score * 100)}%</span> · {row.status}
          </p>
          {a.retry_reason && (
            <p role="alert" className="text-tier-red bg-tier-red/10 border border-tier-red/30 px-2 py-1.5">
              {a.retry_reason}. Retry when ready.
            </p>
          )}
          {row.status !== 'rejected' && a.heart_rate_bpm != null && (
            <p className="text-hud-ink">{t('Heart rate')}: <span className="font-black">{a.heart_rate_bpm}</span> bpm</p>
          )}
          {row.status !== 'rejected' && a.experimental_bp ? (
            <p className="text-tier-amber bg-tier-amber/10 border border-tier-amber/30 px-2 py-1.5 font-bold uppercase tracking-wide">
              Experimental BP Estimate: {a.experimental_bp.systolic}/{a.experimental_bp.diastolic} mmHg
            </p>
          ) : (
            <p className="text-hud-ink3">{t('BP estimation unavailable.')}</p>
          )}
          <p className="nc-caption">{t('Experimental · Use a cuff for reference BP.')}</p>
          <details className="nc-more"><summary>{t('Analysis details')}</summary><p>{a.model} · {a.model_version}</p></details>
        </div>
      )}
    </div>
  )
}

export default function Measurements({initialKind='bp/reference', view='history', patientIdOverride, onSaved, screeningId}) {
  const { user } = useAuth()
  const patientId = patientIdOverride || user?.patient_id
  const [kind, setKind] = useState(initialKind)
  useEffect(() => { setKind(initialKind); setResult(null) }, [initialKind])
  const [fixture, setFixture] = useState('hr_only')
  const [waveform, setWaveform] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState({ items: [], has_more: false })
  const [trends, setTrends] = useState({ series: [] })
  const [offset, setOffset] = useState(0)
  const [filter, setFilter] = useState('all')
  const visible = row => filter === 'all' || row.kind === filter
  const [loading, setLoading] = useState(false)
  async function refresh(page = offset) {
    setLoading(true); setError('')
    try {
      const [h, t] = await Promise.all([measurementHistory(patientId, page), measurementTrends(patientId)])
      setHistory(h.data); setTrends(t.data)
    } catch (e) { setError(e.response?.data?.error || 'Unable to load measurements') }
    finally { setLoading(false) }
  }
  useEffect(() => { if (patientId && view !== 'capture') refresh(offset) }, [patientId, offset])
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setResult(null)
    const form = new FormData(event.currentTarget)
    let body = { patient_id: patientId, recorded_at: new Date().toISOString(), metadata: {
      source: 'manual_reference', device_id: form.get('device') || 'reference-device',
      description: kind === 'glucose' ? 'Commercial glucometer; manually entered' : 'Commercial upper-arm cuff; manually entered', synthetic: false } }
    try {
      if (kind === 'bp/ppg') {
        if (fixturesEnabled && fixture !== 'real') {
          body = { ...body, contract_version: '1', fixture, sampling_rate_hz: 100, sample_unit: 'normalized',
            samples: Array.from({ length: 1000 }, (_, i) => Math.sin(2 * Math.PI * 1.2 * i / 100)),
            metadata: { source: 'dataset_simulator', device_id: 'browser-fixture', description: 'Synthetic UI fixture; not PulseDB', synthetic: true } }
        } else {
          if (!waveform) throw new Error('Load a stored waveform JSON first')
          body = { ...waveform, patient_id: patientId, recorded_at: body.recorded_at, fixture: null,
            metadata: { ...waveform.metadata, source: 'dataset_simulator' } }
        }
      } else if (kind === 'glucose') body = { ...body, value: Number(form.get('value')), unit: form.get('unit'), context: form.get('context') }
      else body = { ...body, systolic: Number(form.get('systolic')), diastolic: Number(form.get('diastolic')), unit: 'mmHg' }
      if(screeningId)body.metadata.screening_id=screeningId
      const response = await saveMeasurement(kind, body)
      setResult(response.data); setOffset(0); if (onSaved) onSaved(response.data); else await refresh(0)
    } catch (e) { setError(e.response?.data?.error || e.message || 'Measurement failed; retry') }
    finally { setBusy(false) }
  }
  return (
    <main className="px-4 py-6 max-w-5xl mx-auto space-y-5">
      {view !== 'capture' && <div>
        <h1 className="text-xl font-bold text-hud-ink flex items-center gap-2 uppercase tracking-widest">
          {view === 'history' ? 'History & trends' : kind === 'glucose' ? 'Blood glucose check' : kind === 'bp/ppg' ? 'Experimental PPG check' : 'Blood pressure check'}
        </h1>
        <p className="text-hud-ink3 text-xs mt-1 uppercase tracking-wider">
          Awareness, recording and guidance only — no diagnosis
        </p>
      </div>}

      {view !== 'capture' && <div className="bg-hud-cyan/5 border border-hud-cyan/20 p-3 text-[10px] text-hud-muted tracking-wide leading-relaxed font-mono">
        Use a commercial upper-arm cuff or glucometer for reference readings. Follow your device
        instructions. For PPG, keep the sensor and hand still; retry if signal quality is rejected.
        The camera does not measure glucose or validate finger pressure.
      </div>}

      {view !== 'history' && <form onSubmit={submit} className="bg-[#101c27] border border-hud-line/80 p-5 relative">
        <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-hud-cyan" />
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-hud-cyan" />
        <h2 className="text-[10px] text-hud-cyan font-black tracking-widest uppercase mb-4 select-none">
          Record your measurement
        </h2>

        <fieldset disabled={busy} className="space-y-4">
          {view !== 'capture' && <label className="block">
            <span className={labelClass}>Check</span>
            <select className={selectClass} value={kind} onChange={e => { setKind(e.target.value); setResult(null) }}>
              <option value="bp/reference">Reference BP</option>
              <option value="glucose">Glucose</option>
              <option value="bp/ppg">PPG / simulator</option>
            </select>
          </label>}

          {kind !== 'bp/ppg' && (
            <label className="block">
              <span className={labelClass}>Device name</span>
              <input className={inputClass} name="device" required maxLength={128} placeholder={kind === 'glucose' ? 'e.g. glucometer' : 'e.g. upper-arm cuff'} />
            </label>
          )}

          {kind === 'bp/reference' && (
            <div className="grid grid-cols-2 gap-3">
              {['systolic', 'diastolic'].map(name => (
                <label className="block" key={name}>
                  <span className={labelClass}>{name} (mmHg)</span>
                  <input className={inputClass} name={name} type="number" min="1" max={name === 'systolic' ? 400 : 300} step="any" required />
                </label>
              ))}
            </div>
          )}

          {kind === 'glucose' && (
            <div className="space-y-3">
              <label className="block">
                <span className={labelClass}>Glucose</span>
                <input className={inputClass} name="value" type="number" min="0.1" max="2000" step="any" required />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelClass}>Unit</span>
                  <select name="unit" className={selectClass}><option>mg/dL</option><option>mmol/L</option></select>
                </label>
                <label className="block">
                  <span className={labelClass}>Context</span>
                  <select name="context" className={selectClass}>
                    <option value="unspecified">Unspecified</option>
                    <option value="fasting">Fasting</option>
                    <option value="post_meal">Post-meal</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {kind === 'bp/ppg' && (
            <div className="space-y-3">
              <details className="nc-more"><summary>Research limitations</summary><p>Public-dataset models may not generalize to MAX30102. Validation and calibration are still required.</p></details>
              {fixturesEnabled && (
                <label className="block">
                  <span className={labelClass}>Development fixture</span>
                  <select className={selectClass} value={fixture} onChange={e => setFixture(e.target.value)}>
                    {['good', 'poor', 'hr_only', 'unavailable', 'experimental', 'real'].map(x => <option key={x}>{x}</option>)}
                  </select>
                </label>
              )}
              {(!fixturesEnabled || fixture === 'real') && (
                <label className="block">
                  <span className={labelClass}>Stored waveform JSON (simulated ingestion)</span>
                  <input
                    type="file"
                    accept=".json"
                    className="w-full text-[10px] font-mono text-hud-muted file:mr-3 file:py-1.5 file:px-3 file:border file:border-hud-dim file:bg-[#0f1a24] file:text-hud-cyan file:font-mono file:text-[10px] file:uppercase file:tracking-wider"
                    onChange={async e => {
                      setWaveform(null)
                      try { const file = e.target.files[0]; if (!file) return; if (file.size > 262144) throw new Error('File exceeds 256 KiB'); setWaveform(JSON.parse(await file.text())); setError('') }
                      catch (err) { setError(err.message) }
                    }}
                  />
                </label>
              )}
            </div>
          )}

          <Button type="submit" variant="primary" size="md" loading={busy} disabled={!patientId} className="w-full">
            {busy ? 'Analyzing / saving…' : kind === 'bp/ppg' ? 'Start / retry measurement' : 'Save reading'}
          </Button>
        </fieldset>
      </form>}

      {busy && <p role="status" className="font-mono text-xs text-hud-cyan uppercase tracking-widest animate-pulse">Request in progress. Waiting for the backend result…</p>}
      {error && <p role="alert" className="font-mono text-xs text-tier-red bg-tier-red/10 border border-tier-red/30 px-3 py-2">{error}</p>}

      {result && (
        <section aria-live="polite" className="space-y-2">
          <h2 className="text-[10px] text-hud-cyan font-black tracking-widest uppercase select-none">Saved measurement</h2>
          <Reading row={result} />
        </section>
      )}

      {view !== 'capture' && <><section className="space-y-3">
        <label className="block"><span className={labelClass}>Filter history & trends</span><select className={selectClass} value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All measurement types</option><option value="bp_reference">Reference BP</option><option value="glucose">Blood glucose</option><option value="ppg">Experimental PPG</option></select></label><p className="nc-caption">History filters apply to the current page. Trends cover the latest 200 readings.</p>
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] text-hud-cyan font-black tracking-widest uppercase select-none">Measurement history</h2>
          <button
            className="border border-hud-dim text-hud-muted font-mono text-[10px] px-3 py-1.5 hover:border-hud-cyan hover:text-hud-cyan transition-all uppercase tracking-wider disabled:opacity-40"
            disabled={loading || busy}
            onClick={() => refresh()}
          >
            Refresh history
          </button>
        </div>
        {loading ? (
          <p role="status" className="font-mono text-xs text-hud-ink3 uppercase tracking-widest">Loading…</p>
        ) : history.items.length ? (
          <div className="space-y-3">
            {history.items.filter(visible).map(row => <Reading key={row.id} row={row} />)}
            {!history.items.some(visible) && <p>No matching readings on this page. Try another page or filter.</p>}
          </div>
        ) : (
          <p className="font-mono text-xs text-hud-ink3 uppercase tracking-widest">No measurements yet.</p>
        )}
        <div className="flex gap-2">
          <button
            className="border border-hud-dim text-hud-muted font-mono text-[10px] px-3 py-1.5 hover:border-hud-cyan hover:text-hud-cyan transition-all uppercase tracking-wider disabled:opacity-40"
            disabled={offset === 0 || loading}
            onClick={() => setOffset(Math.max(0, offset - 20))}
          >
            Previous
          </button>
          <button
            className="border border-hud-dim text-hud-muted font-mono text-[10px] px-3 py-1.5 hover:border-hud-cyan hover:text-hud-cyan transition-all uppercase tracking-wider disabled:opacity-40"
            disabled={!history.has_more || loading}
            onClick={() => setOffset(offset + 20)}
          >
            Next
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[10px] text-hud-cyan font-black tracking-widest uppercase select-none">
          Trends · Latest 200 readings
        </h2>
        <p className="text-[10px] text-hud-ink3 font-mono uppercase tracking-wide leading-relaxed">
          Series stay separate by reference/PPG, source, simulation, glucose unit and context. Rejected signals are excluded.
        </p>
        {trends.truncated && <p className="text-[10px] text-tier-amber font-mono uppercase tracking-wide">Older readings omitted; see paginated history.</p>}
        {!trends.series.length && <p className="text-xs text-hud-ink3 font-mono uppercase tracking-widest">No accepted measurements to compare.</p>}
        {trends.series.filter(s => s.points.some(visible)).map(s => (
          <details open key={s.key} className="bg-[#101c27] border border-hud-line/60 p-3 group">
            <summary className="cursor-pointer font-mono text-[10px] text-hud-cyan uppercase tracking-wider select-none">
              {KIND_LABEL[s.points[0]?.kind]} · {s.points[0]?.context || (s.points[0]?.mock ? 'Simulated data — mock' : s.points[0]?.metadata?.synthetic ? 'Simulated data — synthetic' : s.points[0]?.metadata?.source === 'dataset_simulator' ? 'Dataset simulator' : 'Reference device')} · {s.points[0]?.unit || 'PPG'} <span className="text-hud-ink3">({s.points.length})</span>
            </summary>
            <div className="mt-3 space-y-3">
              <TrendChart series={s}/><details><summary>View recorded values</summary>{s.points.map(row => <Reading key={row.id} row={row} />)}</details>
            </div>
          </details>
        ))}
      </section></>}
    </main>
  )
}


