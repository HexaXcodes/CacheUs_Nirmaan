import {useCopy,QUESTION_COPY,OPTION_COPY} from '../../i18n/nirmaan'
import {useLang} from '../../context/LanguageContext'
import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import PortalShell from '../../components/layout/PortalShell'
import client from '../../api/client'
import {Reading} from '../patient/Measurements'
import {QUESTIONS} from '../asha/screening/Step0Intake'
export default function ReviewQueue(){
 const t=useCopy(),{lang}=useLang()
 const [rows,setRows]=useState([]),[offset,setOffset]=useState(0),[more,setMore]=useState(false),[busy,setBusy]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0)
 useEffect(()=>{let active=true;setBusy(true);setError('');client.get('/measurements/screening/queue',{params:{offset}}).then(({data})=>{if(active){setRows(data.items);setMore(data.has_more)}}).catch(()=>{if(active)setError('Unable to load review queue.')}).finally(()=>{if(active)setBusy(false)});return()=>{active=false}},[offset,retry])
 return <PortalShell><div className="nc-stack">
  <div><h1>{t('ASHA review queue')}</h1><p className="nc-caption">{t('More reported symptom concerns first, then oldest. This is review ordering—not a diagnosis or validated urgency score.')}</p></div>
  {error&&<p role="alert" className="nc-alert">{error} <button onClick={()=>setRetry(n=>n+1)}>{t('Retry')}</button></p>}
  {busy?<p role="status">{t('Loading…')}</p>:!error&&rows.length===0?<p>{t('No screening records yet.')}</p>:!error&&<div className="nc-stack">{rows.map(r=>
   <article className="nc-card nc-stack nc-queue-card" key={r.id}>
    <div className="nc-section-heading">
     <h2>{r.patient_name||r.patient_id}</h2>
     <span className="nc-caption">{new Date(r.created_at).toLocaleString()}</span>
    </div>
    <div className="nc-chip-row">
     <span className="nc-chip nc-chip-count">{r.priority.concern_count} {t('reported concerns')}</span>
     {r.ppg?<span className="nc-chip nc-chip-ppg-ready">{t('Finger PPG available')}</span>:<span className="nc-chip nc-chip-ppg-pending">{t('Finger PPG pending')}</span>}
    </div>
    <Link className="nc-primary" to={'/doctor/patients/'+encodeURIComponent(r.patient_id)}>{t('Review patient →')}</Link>
    <details><summary>{t('Questionnaire answers')}</summary>{QUESTIONS.map((q,qi)=><p key={q.id}><strong>{QUESTION_COPY[lang]?.[qi]||q.label}</strong><br/>{OPTION_COPY[lang]?.[qi]?.[q.options.findIndex(o=>o.value===r.answers[q.id])]||q.options.find(o=>o.value===r.answers[q.id])?.label||'Not answered'}</p>)}</details>
    {r.ppg&&<Reading row={r.ppg}/>}
   </article>
  )}</div>}
  <div className="nc-actions"><button className="nc-secondary" disabled={busy||offset===0} onClick={()=>setOffset(n=>Math.max(0,n-30))}>{t('Previous')}</button><button className="nc-secondary" disabled={busy||!more} onClick={()=>setOffset(n=>n+30)}>{t('Next')}</button></div>
 </div></PortalShell>
}

