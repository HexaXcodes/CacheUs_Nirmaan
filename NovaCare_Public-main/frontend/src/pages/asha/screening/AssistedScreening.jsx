import {useLang} from '../../../context/LanguageContext'
import {useCopy,QUESTION_COPY,OPTION_COPY} from '../../../i18n/nirmaan'
import {useState} from 'react'
import {QUESTIONS} from './Step0Intake'
import FingerSensorDemo from './FingerSensorDemo'
import client from '../../../api/client'

export default function AssistedScreening({patientId,onExit}){
 const t=useCopy(),{lang}=useLang()
 const [answers,setAnswers]=useState({}),[index,setIndex]=useState(0),[intake,setIntake]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const q=QUESTIONS[index],complete=QUESTIONS.every(q=>answers[q.id]!==undefined)
 async function submit(){
  if(!complete||busy)return
  setBusy(true);setError('')
  try{const {data}=await client.post('/measurements/screening/intake',{patient_id:patientId,answers});setIntake(data)}
  catch(e){setError(e.response?.data?.error||'Could not save answers. Please retry.')}
  finally{setBusy(false)}
 }
 if(intake)return <div className="nc-stack"><p className="nc-pill">{t('10 answers saved · Next: finger PPG')}</p><FingerSensorDemo patientId={patientId} screeningId={intake.id} onExit={onExit}/></div>
 return <section className="nc-card nc-stack nc-screening-panel">
  <span className="nc-eyebrow">1 · {t('Questionnaire')} → 2 · {t('Finger PPG')}</span>
  <h2>{t('Health screening')}</h2>
  <p>{t('Reported symptoms and habits—not a diagnosis.')}</p>
  <div className="nc-screening-steps" role="img" aria-label={t('Question {n} of {total}',{n:index+1,total:QUESTIONS.length})}>
   {QUESTIONS.map((qq,qi)=><span key={qq.id} className={'nc-screening-step' + (answers[qq.id]!==undefined?' is-answered':'') + (qi===index?' is-current':'')} />)}
  </div>
  <span className="nc-screening-count">{t('Question {n} of {total}',{n:index+1,total:QUESTIONS.length})}</span>
  <fieldset disabled={busy} className="nc-question-fieldset">
   <legend>{QUESTION_COPY[lang]?.[index]||q.label}</legend>
   <div className="nc-answer-grid">
    {q.options.map((o,oi)=><label key={o.value} className="nc-answer-card"><input type="radio" name={q.id} checked={answers[q.id]===o.value} onChange={()=>setAnswers(a=>({...a,[q.id]:o.value}))}/> <span>{OPTION_COPY[lang]?.[index]?.[oi]||o.label}</span></label>)}
   </div>
  </fieldset>
  {error&&<p role="alert" className="nc-alert">{error}</p>}
  <div className="nc-actions">
   <button className="nc-secondary" disabled={busy||index===0} onClick={()=>setIndex(i=>i-1)}>{t('Back')}</button>
   {index<9?<button className="nc-primary" disabled={busy||answers[q.id]===undefined} onClick={()=>setIndex(i=>i+1)}>{t('Next →')}</button>:<button className="nc-primary" disabled={busy||!complete} onClick={submit}>{busy?t('Saving…'):t('Save answers & start finger PPG →')}</button>}
  </div>
 </section>
}

