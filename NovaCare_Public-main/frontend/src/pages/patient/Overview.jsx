import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {useAuth} from '../../context/AuthContext'
import {measurementTrends} from '../../api/measurements'
import {useCarePlan} from './ConditionGuide'
import {useCopy} from '../../i18n/nirmaan'
import DailyCare from '../../components/DailyCare'
import RuralHealthStories from '../../components/RuralHealthStories'
export default function Overview(){
 const {user}=useAuth(),t=useCopy(),plan=useCarePlan(user.patient_id),[rows,setRows]=useState([]),[error,setError]=useState('')
 useEffect(()=>{let active=true;measurementTrends(user.patient_id).then(({data})=>{if(active)setRows(data.series.flatMap(s=>s.points).sort((a,b)=>new Date(b.recorded_at)-new Date(a.recorded_at)))}).catch(()=>{if(active)setError('Records could not be loaded.')});return()=>{active=false}},[user.patient_id])
 return <div className="nc-stack">
 <section className="nc-welcome"><div><span className="nc-eyebrow">{t('Records, first')}</span><h1>{t('Your records')}</h1></div><Link className="nc-primary" to="/patient/history">{t('View history →')}</Link></section>
 {error&&<p role="alert" className="nc-alert">{error}</p>}
 <div className="nc-grid">
  {[['Blood pressure','bp_reference','hypertension','bp'],['Blood glucose','glucose','diabetes','glucose']].map(([title,kind,condition,path])=>{
   const row=rows.find(r=>r.kind===kind&&!r.mock&&!r.metadata?.synthetic&&r.metadata?.source==='manual_reference')
   const enabled=plan.conditions.includes(condition)
   return <article className="nc-card" key={kind}>
    <div className="nc-section-heading"><h2>{t(title)}</h2>{row&&<span className="nc-chip nc-chip-ppg-ready">{t('Reference')}</span>}</div>
    <div className="nc-value">{row?(kind==='glucose'?row.value:row.systolic+'/'+row.diastolic):'—'} <small>{kind==='glucose'?(row?.unit||'mg/dL'):'mmHg'}</small></div>
    {row&&<p>{new Date(row.recorded_at).toLocaleString()}</p>}
    {enabled?<Link className="nc-primary" to={'/patient/check/'+path}>{t('Open AR guide →')}</Link>:!plan.loading&&!plan.error&&<p className="nc-caption">{t('Your doctor must record the relevant condition first.')}</p>}
   </article>
  })}
 </div>
 {plan.loading?<p role="status">{t('Loading doctor instructions…')}</p>:plan.error?<p role="alert" className="nc-alert">{plan.error}</p>:null}
 <RuralHealthStories/>
 {!plan.loading&&!plan.error&&plan.conditions.length>0&&<DailyCare conditions={plan.conditions}/>}
</div>
}
