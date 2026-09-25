import {useCopy} from '../../i18n/nirmaan'
import {useState} from 'react'
import {useCarePlan} from '../patient/ConditionGuide'
import client from '../../api/client'
export default function CarePlanEditor({patientId}){
 const t=useCopy();const plan=useCarePlan(patientId),[draft,setDraft]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 const values=draft||plan.conditions
 async function save(){setBusy(true);setMessage('');try{await client.post('/measurements/screening/care-plan/'+encodeURIComponent(patientId),{conditions:values});setMessage('Condition record saved. Relevant patient AR guidance enabled.')}catch{setMessage('Save failed. Please retry.')}finally{setBusy(false)}}
 return <section className="nc-card nc-stack">
  <h2>{t('Clinician-recorded conditions')}</h2>
  <p>{t('Record an established diagnosis; NovaCare does not infer one.')}</p>
  {plan.error&&<p role="alert">{plan.error}</p>}
  <div className="nc-condition-toggles">
   {['hypertension','diabetes'].map(c=><label key={c} className="nc-condition-toggle"><input type="checkbox" disabled={busy||plan.loading||!!plan.error} checked={values.includes(c)} onChange={e=>setDraft(e.target.checked?[...values,c]:values.filter(v=>v!==c))}/> <span>{t(c==='hypertension'?'Hypertension · cuff BP guide':'Diabetes · glucometer guide')}</span></label>)}
  </div>
  <button className="nc-primary" disabled={busy||plan.loading||!!plan.error} onClick={save}>{t('Save condition record')}</button>
  {message&&<p role="status">{t(message)}</p>}
 </section>
}

