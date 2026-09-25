import {useCopy} from '../../i18n/nirmaan'
import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {useAuth} from '../../context/AuthContext'
import client from '../../api/client'
import ARMeasurement from './ARMeasurement'
export function useCarePlan(patientId){
 const [state,setState]=useState({loading:true,conditions:[],error:''})
 useEffect(()=>{let active=true;setState({loading:true,conditions:[],error:''});client.get('/measurements/screening/care-plan/'+encodeURIComponent(patientId)).then(({data})=>{if(active)setState({...data,loading:false,error:''})}).catch(()=>{if(active)setState({loading:false,conditions:[],error:'Unable to load doctor instructions.'})});return()=>{active=false}},[patientId])
 return state
}
export default function ConditionGuide({kind}){
 const t=useCopy(),{user}=useAuth(),plan=useCarePlan(user.patient_id)
 if(plan.loading)return <p role="status">{t('Loading doctor instructions…')}</p>
 if(plan.error)return <p role="alert">{plan.error}</p>
 if(!plan.conditions.includes(kind==='glucose'?'diabetes':'hypertension'))return <section className="nc-card"><h2>{t('Guidance not enabled')}</h2><p>{t('Your doctor must record the relevant condition first.')}</p><Link to="/patient/history">View your records →</Link></section>
 return <ARMeasurement initialKind={kind} lockKind/>
}

